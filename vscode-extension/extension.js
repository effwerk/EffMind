import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/*
 * 这是自定义编辑器的扩展端实现，核心职责包括：
 * 1) 文档抽象（MindmapDocument）：负责读取、保存、备份、还原自定义文档数据。
 *    - 该类封装了对 vscode.workspace.fs 的访问并向外暴露事件（onDidChangeContent）
 *      以便与 webview 做数据同步。
 *
 * 2) 编辑器提供者（MindMapEditorProvider）：负责注册自定义编辑器、创建/恢复面板
 *    并建立与 webview 的双向通信（postMessage）。resolveCustomEditor 是关键方法，
 *    它负责把文档内容传入 webview，监听 webview 的消息，并在必要时触发 vscode 的保存/变更事件。
 *
 * 3) 消息契约（webview <-> extension）：
 *    - webview 发给 extension 的常见消息：
 *        'ready'           : webview 初始化完成，扩展应下发当前文档（update）
 *        'init' / 'edit'   : webview 主动发送初始或编辑后的文档文本，扩展将持久化（document.update）
 *        'command-request' : webview 请求扩展作为中间人来统一下发并执行命令（undo/redo/copy/cut/paste）
 *        'export-*'        : 导出请求（svg/png）等
 *    - extension 发给 webview 的常见消息：
 *        'update'          : 扩展下发磁盘/内存中的文档数据到 webview
 *        'command-execute' : 扩展下发需要页面执行的命令（中央化执行路径）
 *
 * 设计动机与注意点：
 * - 在 VS Code 内，快捷键可能既触发 webview 内部的键盘监听，也由扩展代理并转发给 webview，
 *   导致相同操作被执行两次。为避免重复，采用中央化执行（central authority）模式：
 *   webview 发出 'command-request'，扩展可以执行预处理/保存/权限校验，然后回发
 *   'command-execute' 给同一个 panel，页面在收到该消息时才真正执行命令。
 * - 回显/循环问题：扩展在接收到 webview 的 'edit' 后会更新 document，并触发 document.onDidChangeContent
 *   回调，扩展会把最新内容通过 'update' 下发回 webview。页面需要通过比较或其他方法
 *   忽略这种回显以避免循环（页面端有相应的 lastKnownFileContentText 检查）。
 * - 错误处理：扩展在解析 JSON 或写文件时需要捕获异常并向用户展示错误信息（见 handleExport 与 try/catch）。
 */

class MindmapDocument extends vscode.Disposable {
    /**
     * 构造 MindmapDocument
     * @param {vscode.Uri} uri - 文档的 URI
     * @param {Uint8Array} initialContent - 文档的初始二进制内容
     *
     * 说明：这个类封装了文档的内存表示和事件（onDidChangeContent），
     * 提供读写与备份接口，供 CustomEditorProvider 使用。
     */
    constructor(uri, initialContent) {
        super(() => this._onDidDispose.fire());
        this._uri = uri;
        this._documentData = initialContent;
        this._onDidDispose = new vscode.EventEmitter();
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChange = new vscode.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeContent = new vscode.EventEmitter();
        this.onDidChangeContent = this._onDidChangeContent.event;
    }

    /**
     * 静态构造器：创建并初始化 MindmapDocument 实例
     * @param {vscode.Uri} uri - 文档 URI
     * @param {string|undefined} backupId - 可选的备份 ID（当编辑器恢复自备份时提供）
     * @returns {Promise<MindmapDocument>}
     *
     * 行为：如果提供了 backupId，会优先从 backupId 对应的 URI 读取数据；否则读取传入的 uri。
     * 可能抛出：vscode.workspace.fs.readFile 的错误（需在调用方处理）。
     */
    static async create(uri, backupId) {
        const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
        const fileData = await MindmapDocument.readFile(dataFile);
        return new MindmapDocument(uri, fileData);
    }

    /**
     * 从磁盘读取文件内容
     * @param {vscode.Uri} uri
     * @returns {Promise<Uint8Array>} 文件二进制数据
     *
     * 说明：对 untitled 类型的 URI 返回空字节数组，避免后续处理出现空引用错误。
     */
    static async readFile(uri) {
        if (uri.scheme === 'untitled') {
            return new Uint8Array();
        }
        return vscode.workspace.fs.readFile(uri);
    }

    /**
     * @returns {vscode.Uri} 文档 URI
     */
    get uri() {
        return this._uri;
    }

    /**
     * @returns {Uint8Array} 当前内存中的文档二进制表示
     */
    get documentData() {
        return this._documentData;
    }

    /**
     * 手动触发 onDidChange 事件，表示文档的某些非内容元数据发生了变化（例如视图状态）
     * 无返回值。
     */
    fireDidChange() {
        this._onDidChange.fire();
    }

    /**
     * 更新文档的内存内容并触发 onDidChangeContent
     * @param {Uint8Array} content - 新的文档二进制内容
     *
     * 行为：更新内部状态并触发事件，供 CustomEditorProvider 的订阅者（如 changeDocumentSubscription）响应。
     */
    update(content) {
        this._documentData = content;
        this._onDidChangeContent.fire(content);
    }

    // 说明：
    // - update(content) 会更新内存中的文档数据并触发 onDidChangeContent 事件，
    //   由上层（MindMapEditorProvider.resolveCustomEditor 的 changeDocumentSubscription）来接收并
    //   将修改下发给 webview（updateWebview）。
    // - 该类把文件读写抽象出来，统一集中对 vscode.workspace.fs 的调用，方便错误处理与测试。

    /**
     * 保存当前文档到原路径
     * @param {vscode.CancellationToken} cancellation
     * @returns {Promise<void>}
     */
    async save(cancellation) {
        await this.saveAs(this.uri, cancellation);
    }

    /**
     * 将当前文档写入到指定 URI
     * @param {vscode.Uri} targetResource - 目标写入路径
     * @param {vscode.CancellationToken} cancellation
     * @returns {Promise<void>}
     *
     * 可能抛出：vscode.workspace.fs.writeFile 的错误，应由调用上下文处理并向用户报告。
     */
    async saveAs(targetResource, cancellation) {
        const fileData = this._documentData;
        if (cancellation.isCancellationRequested) {
            return;
        }
        await vscode.workspace.fs.writeFile(targetResource, fileData);
    }

    /**
     * 从磁盘还原文档到内存。触发 onDidChangeContent 以通知订阅者更新。
     * @param {vscode.CancellationToken} _cancellation
     * @returns {Promise<void>}
     */
    async revert(_cancellation) {
        const diskContent = await MindmapDocument.readFile(this.uri);
        this._documentData = diskContent;
        this._onDidChangeContent.fire(diskContent);
    }

    /**
     * 备份文档到指定目标（供 VS Code 使用备份恢复机制）
     * @param {vscode.Uri} destination
     * @param {vscode.CancellationToken} cancellation
     * @returns {Promise<{id: string, delete: function}>}
     */
    async backup(destination, cancellation) {
        await this.saveAs(destination, cancellation);
        return {
            id: destination.toString(),
            delete: async () => {
                try {
                    await vscode.workspace.fs.delete(destination);
                } catch {
                    // noop
                }
            },
        };
    }
}

class MindMapEditorProvider {
    static currentPanel = undefined;

    /**
     * 构造 MindMapEditorProvider
     * @param {vscode.ExtensionContext} context
     *
     * 说明：provider 会持有 extension context，用于解析资源路径并注册 disposables。
     */
    constructor(context) {
        this.context = context;
        this.lastSavedContent = null;
    }

    /**
     * 注册自定义编辑器提供者到 VS Code
     * @param {vscode.ExtensionContext} context
     * @returns {vscode.Disposable} 注册的 Disposable
     *
     * 说明：调用 register 会把 provider 注册为 CustomEditorProvider，使得 VS Code 能够
     * 在打开对应 viewType 的文件时调用 provider 的 resolveCustomEditor 等方法。
     */
    static register(context) {
        const provider = new MindMapEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(
            MindMapEditorProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsTransferableObjects: true,
            }
        );
    }

    /**
     * viewType 字符串，用于注册 Custom Editor（必须与 package.json 中的 contribution 相对应）
     */
    static viewType = 'mindmap.mindEditor';

    /**
     * 打开/创建自定义文档实例
     * @param {vscode.Uri} uri
     * @param {Object} openContext - 包含 backupId 等信息
     * @param {vscode.CancellationToken} _token
     * @returns {Promise<MindmapDocument>}
     */
    async openCustomDocument(uri, openContext, _token) {
        const document = await MindmapDocument.create(uri, openContext.backupId);
        return document;
    }

    /**
     * resolveCustomEditor
     * @param {MindmapDocument} document - 打开的文档实例
     * @param {vscode.WebviewPanel} webviewPanel - 要渲染的 webview 面板
     * @param {vscode.CancellationToken} _token
     *
     * 说明：
     * - 该方法负责为 webviewPanel 注入 HTML/脚本资源，并建立完整的双向消息通道。
     * - 关注点包括：
     *    1) 监听 webviewPanel 生命周期（激活/销毁）以维护 currentPanel 状态
     *    2) 将磁盘/内存文档下发到 webview（update）
     *    3) 订阅 document 的 onDidChangeContent 以便把外部变更下发给 webview
     *    4) 处理 webview 发来的 init/edit/command-request/export 等消息
     */
    async resolveCustomEditor(document, webviewPanel, _token) {
        // --- Panel State Management for undo/redo ---
        // 当面板的视图状态发生变化（例如用户切换到或离开此 panel）时触发。
        // 这里把 active 的 panel 保存到静态字段 currentPanel，以便全局命令能够找到
        // 当前活动的 webviewPanel 并向其发送消息。
        webviewPanel.onDidChangeViewState((e) => {
            if (e.webviewPanel.active) {
                MindMapEditorProvider.currentPanel = webviewPanel;
            } else if (MindMapEditorProvider.currentPanel === webviewPanel) {
                MindMapEditorProvider.currentPanel = undefined;
            }
        });

        const disposables = [];

        // 面板销毁时的回调：如果销毁的是当前记录的 panel，则清理 currentPanel；
        // 同时清理 document.onDidChangeContent 的订阅，避免内存泄漏。
        webviewPanel.onDidDispose(() => {
            if (MindMapEditorProvider.currentPanel === webviewPanel) {
                MindMapEditorProvider.currentPanel = undefined;
            }
            disposables.forEach((d) => d.dispose());
        });

        if (webviewPanel.active) {
            MindMapEditorProvider.currentPanel = webviewPanel;
        }

        const webview = webviewPanel.webview;

        // --- Path and URI Setup for Portability (Debug vs. Packaged) ---

        // Use the official extensionMode to determine if running in production (packaged) or development (debug).
        const isProduction = this.context.extensionMode === vscode.ExtensionMode.Production;

        // Define root URIs for the extension and the 'src' folder based on the environment.
        const extensionRootUri = this.context.extensionUri;
        const srcRootUri = vscode.Uri.joinPath(
            this.context.extensionUri,
            isProduction ? 'src' : './src'
        );

        // --- Webview Setup ---
        webviewPanel.webview.options = {
            enableScripts: true,
            // Grant access to the extension's root and the 'src' directory.
            localResourceRoots: [extensionRootUri, srcRootUri],
        };

        const indexPath = path.join(this.context.extensionPath, 'index.html');
        let html = fs.readFileSync(indexPath, 'utf-8');

        // Replace path prefixes in the HTML with the correct, absolute webview URIs.
        // This is the most robust way to handle paths for both development and packaged extensions.
        html = html.replace(/(href|src)="(\.\.?\/[^\"]*)"/g, (match, attr, p1) => {
            let resourceUri;

            // Determine the base URI based on the path prefix.
            if (p1.startsWith('./src/')) {
                const resourcePath = p1.substring('./src/'.length);
                resourceUri = vscode.Uri.joinPath(srcRootUri, resourcePath);
            } else {
                // Handles './' paths
                const resourcePath = p1.substring('./'.length);
                resourceUri = vscode.Uri.joinPath(extensionRootUri, resourcePath);
            }

            return `${attr}="${webview.asWebviewUri(resourceUri)}"`;
        });

        webviewPanel.webview.html = html;

        // --- Message Handling ---
        /**
         * 将当前扩展端的 document 内容下发给 webview（type='update')。
         * 这是一个内部 helper，用于把内存/磁盘上的文档推送到页面。
         * 无返回值。
         */
        function updateWebview() {
            webview.postMessage({
                type: 'update',
                text: new TextDecoder().decode(document.documentData),
            });
        }

        // 说明：
        // - updateWebview 将当前扩展/磁盘中的文档内容主动下发到 webview（type: 'update'）。
        // - 注意：当 webview 本身触发编辑并把编辑结果发送回扩展（type: 'edit'），
        //   扩展会更新 document 并触发 document.onDidChangeContent；为了避免扩展再次
        //   把数据以 'update' 发回 webview（形成回显循环），使用 isUpdatingFromWebview 标志
        //   来区分是来自 webview 的更新（忽略回显）还是外部（磁盘/其他来源）的变更。

        let isUpdatingFromWebview = false;
        disposables.push(
            document.onDidChangeContent(() => {
                // 只有在不是由 webview 主动导致的 document 更新时才把最新内容下发给 webview，
                // 以避免回显循环（webview -> extension -> webview）。
                if (!isUpdatingFromWebview) {
                    updateWebview();
                }
            })
        );

        // --- File System Watcher for External Changes ---
        if (document.uri.scheme === 'file') {
            const watcher = vscode.workspace.createFileSystemWatcher(
                document.uri.fsPath,
                true,
                false,
                true
            );
            disposables.push(watcher);

            disposables.push(
                watcher.onDidChange(async (uri) => {
                    if (uri.fsPath !== document.uri.fsPath) {
                        return;
                    }

                    const diskContent = await MindmapDocument.readFile(uri);

                    // Check if the change comes from our own save operation by comparing with the last saved content snapshot.
                    if (
                        this.lastSavedContent &&
                        Buffer.compare(diskContent, this.lastSavedContent) === 0
                    ) {
                        this.lastSavedContent = null; // Reset snapshot after consuming
                        return;
                    }

                    // If it's not a self-save, check if the content on disk is different from what's currently in memory.
                    if (Buffer.compare(diskContent, document.documentData) === 0) {
                        return; // No actual change compared to what's in memory.
                    }

                    const choice = await vscode.window.showInformationMessage(
                        '文件已被外部修改。是否要重新加载？(您的未保存的更改将丢失)',
                        { modal: true },
                        '重新加载',
                        '忽略'
                    );

                    if (choice === '重新加载') {
                        await this.revertCustomDocument(
                            document,
                            new vscode.CancellationTokenSource().token
                        );
                    }
                })
            );
        }

        /**
         * webview.onDidReceiveMessage
         * 处理来自页面的所有消息。常见类型：
         * - 'ready'          : 页面准备好，扩展应下发当前文档
         * - 'command-request': 页面请求扩展作为中间人来统一下发并执行命令
         * - 'init' / 'edit'  : 页面发送新的文档内容（init 为初始化，edit 为编辑提交）
         * - 'export-svg'/'export-png': 页面请求扩展保存导出内容
         */
        webview.onDidReceiveMessage(async (e) => {
            switch (e.type) {
                case 'ready': {
                    // The 'langs' folder is inside the 'src' directory.
                    const langsSourceUri = webview.asWebviewUri(
                        vscode.Uri.joinPath(srcRootUri, 'langs')
                    );
                    webview.postMessage({
                        type: 'set-lang-source',
                        uri: langsSourceUri.toString(),
                    });
                    updateWebview();
                    return;
                }
                case 'command-request':
                    // webview 向扩展请求“统一执行”某个命令。
                    // 扩展可在这里插入保存钩子、授权检查、日志记录或其他需要在中间执行的逻辑。
                    // 一旦扩展决定允许执行，就向同一 panel 回发 'command-execute'，由页面在收到后真正执行。
                    if (webviewPanel && webviewPanel.webview) {
                        webviewPanel.webview.postMessage({
                            type: 'command-execute',
                            command: e.command,
                        });
                    }
                    return;
                case 'init': {
                    // 'init' 表示 webview 初始化时发送的内容（或首次创建的内容），
                    // 扩展接收后需要把内容更新到 document 中。
                    // 使用 isUpdatingFromWebview 标志可以告知后续 document.onDidChangeContent 事件
                    // 这是由 webview 发起的更新，从而避免扩展将相同内容再发回给 webview（回显）。
                    isUpdatingFromWebview = true;
                    try {
                        const newContent = new TextEncoder().encode(e.text);
                        document.update(newContent);
                    } finally {
                        isUpdatingFromWebview = false;
                    }
                    return;
                }
                case 'edit': {
                    // 'edit' 是 webview 在用户交互或自动保存时发送的最新可保存数据，扩展需要
                    // 更新 document 并通知 VS Code（触发 _onDidChangeCustomDocument），以便
                    // VS Code 知道文档内容已改变（会影响保存按钮、回退栈等）。
                    // 同样使用 isUpdatingFromWebview 来避免循环回显。
                    isUpdatingFromWebview = true;
                    try {
                        const newContent = new TextEncoder().encode(e.text);
                        document.update(newContent);

                        this._onDidChangeCustomDocument.fire({
                            document,
                            label: 'Edit',
                        });
                    } finally {
                        isUpdatingFromWebview = false;
                    }
                    return;
                }
                case 'export-svg':
                    this.handleExport(e.content, 'svg', document.uri);
                    return;
                case 'export-png':
                    this.handleExport(e.content, 'png', document.uri);
                    return;
                case 'setSetting':
                    await this.context.globalState.update(e.key, e.value);
                    return;
                case 'getSetting':
                    webview.postMessage({
                        type: 'setting-value',
                        key: e.key,
                        value: this.context.globalState.get(e.key, 'defaultValue'),
                    });
                    return;
            }
        });
    }

    /**
     * EventEmitter: 当自定义文档内容发生变化时触发。
     *
     * 语义：该事件用于向 VS Code 报告自定义文档的“内容层面”变化（editable content changed），
     * 通常在 webview 发送 'edit' 并且扩展将新的内容写入内存（document.update）之后触发。
     *
     * 负载（event payload）：{
     *   document: MindmapDocument, // 发生变化的文档实例
     *   label: string              // 可选的人类可读标签（例如 'Edit'），用于 UI/undo stack 等
     * }
     *
     * 注意：这是 MindMapEditorProvider 对外的通知通道，VS Code 会监听此事件来维护保存/撤销栈。
     */
    _onDidChangeCustomDocument = new vscode.EventEmitter();

    /**
     * onDidChangeCustomDocument: 公开的只读事件句柄，订阅者可监听文档内容变更。
     *
     * 说明：对外暴露 EventEmitter.event，以便将事件注册到 vscode 的变更/保存流程中，
     * 使用方式示例：context.subscriptions.push(provider.onDidChangeCustomDocument(listener))
     */
    onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    /**
     * 保存文档（由 VS Code 调用）
     * @param {MindmapDocument} document
     * @param {vscode.CancellationToken} cancellation
     * @returns {Promise<void>}
     */
    async saveCustomDocument(document, cancellation) {
        this.lastSavedContent = document.documentData;
        await document.save(cancellation);
    }

    /**
     * 另存为（由 VS Code 调用）
     * @param {MindmapDocument} document
     * @param {vscode.Uri} destination
     * @param {vscode.CancellationToken} cancellation
     * @returns {Promise<void>}
     */
    async saveCustomDocumentAs(document, destination, cancellation) {
        this.lastSavedContent = document.documentData;
        await document.saveAs(destination, cancellation);
    }

    /**
     * 还原文档到磁盘上的最新内容
     * @param {MindmapDocument} document
     * @param {vscode.CancellationToken} cancellation
     * @returns {Promise<void>}
     */
    revertCustomDocument(document, cancellation) {
        return document.revert(cancellation);
    }

    /**
     * 备份文档（供 VS Code 备份/恢复机制使用）
     * @param {MindmapDocument} document
     * @param {Object} context - 包含 destination 字段
     * @param {vscode.CancellationToken} cancellation
     * @returns {Promise<{id: string, delete: function}>}
     */
    backupCustomDocument(document, context, cancellation) {
        return document.backup(context.destination, cancellation);
    }

    /**
     * 将导出的内容写入用户选择的文件路径
     * @param {string} content - 对于 svg 为文本，对于 png 为 dataURL
     * @param {string} format - 'svg' | 'png'
     * @param {vscode.Uri} documentUri - 源文档 URI，仅用于建议文件名
     * @returns {Promise<void>}
     *
     * 说明：该方法显示保存对话框，用户选择路径后执行写入操作并给出成功/失败提示。
     */
    async handleExport(content, format, documentUri) {
        const defaultFileName = path.basename(documentUri.fsPath, '.mind') + '.' + format;
        const defaultUri = vscode.Uri.joinPath(documentUri, '..', defaultFileName);

        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            filters: {
                Images: [format],
            },
        });

        if (uri) {
            try {
                let buffer;
                if (format === 'png') {
                    const base64Data = content.split(',')[1];
                    buffer = Buffer.from(base64Data, 'base64');
                } else {
                    buffer = Buffer.from(content, 'utf8');
                }
                await vscode.workspace.fs.writeFile(uri, buffer);
                vscode.window.showInformationMessage(`Successfully exported to ${uri.fsPath}`);
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to export file: ${err.message}`);
            }
        }
    }
}

/**
 * activate
 * @param {vscode.ExtensionContext} context
 *
 * 在扩展激活时调用：
 * - 注册 MindMap 自定义编辑器提供者
 * - 注册特定于 mindmap 的命令，由 package.json 中的快捷键绑定触发
 */
export function activate(context) {
    context.subscriptions.push(MindMapEditorProvider.register(context));

    const commands = ['undo', 'redo', 'copy', 'paste', 'cut'];
    commands.forEach((command) => {
        context.subscriptions.push(
            vscode.commands.registerCommand(`effmind.${command}`, () => {
                if (MindMapEditorProvider.currentPanel) {
                    MindMapEditorProvider.currentPanel.webview.postMessage({
                        type: 'command-execute',
                        command: command,
                    });
                }
            })
        );
    });
}

/**
 * deactivate
 *
 * 扩展停用时调用（通常不需要手动实现清理逻辑，因为我们把 Disposable 注册到了 context.subscriptions）。
 */
export function deactivate() {}
