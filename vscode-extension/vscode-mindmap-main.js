import { html } from './src/common/lit.js';
import MindmapMain from './src/MindmapMain.js';
import './src/mindmap-search.js';
import './src/mindmap-view.js';

import { T, LangManager } from './src/common/LangManager.js';
import getMenuItems from './vscodeMenuItems.js';

/**
 * vscode-mindmap-main.js — webview（页面端）主组件
 *
 * 这个文件是运行在 VS Code Webview 中的前端逻辑：
 * - 扩展 UI（渲染、事件）和数据模型的桥梁
 * - 管理与扩展之间的双向消息（postMessage）
 * - 在方案 C（centralized execution）中，页面负责捕获带修饰键的请求
 *   并把请求发送给扩展（type: 'command-request'），扩展验证/处理后会
 *   回发 type: 'command-execute' 给页面以实际执行命令。这保证了命令
 *   的单一路径执行，从而避免重复触发问题。
 *
 * 重要注意事项：
 * - 页面在捕获阶段（capture）拦截快捷键并阻止冒泡，以避免 InteractionManager
 *   本地也去执行相同命令（centralized flow：request -> extension -> execute）。
 * - 当页面需要将数据保存到磁盘时，仍然通过 'edit' 消息发送完整内容给扩展。
 */

customElements.define(
    'vscode-mindmap-main',
    class extends MindmapMain {
        /**
         * 构造函数，在创建类实例时被调用。
         */
        constructor() {
            super();
            this._langSourceSetPromise = new Promise((resolve) => {
                this._resolveLangSourceSet = resolve;
            });

            /**
             * VS Code API 的实例，用于 Webview 和扩展之间的通信。
             * `acquireVsCodeApi` 是一个在 VS Code Webview 环境中由官方提供的全局函数。
             * @type {object}
             */
            this.vscode = acquireVsCodeApi();

            this.getMenuItems = getMenuItems;
        }

        /**
         * 异步获取单个 VS Code 设置
         * @param {string} key
         * @returns {Promise<any>}
         */
        async getVscodeSetting(key) {
            return new Promise((resolve) => {
                const listener = (event) => {
                    const message = event.data;
                    if (message.type === 'setting-value' && message.key === key) {
                        window.removeEventListener('message', listener);
                        resolve(message.value);
                    }
                };
                window.addEventListener('message', listener);
                // 请求设置
                this.vscode.postMessage({ type: 'getSetting', key });
            });
        }

        /**
         * 初始化设置
         */
        async initSettings() {
            // 异步获取各项设置
            const [isMinimapHidden, curveStyle, theme, lang] = await Promise.all([
                this.getVscodeSetting('isMinimapHidden').catch(() => this.currentMinimapState),
                this.getVscodeSetting('curveStyle').catch(() => this.curveStyle),
                this.getVscodeSetting('theme').catch(() => this.theme),
                this.getVscodeSetting('lang').catch(() => LangManager.currentLang),
            ]);

            // 应用设置到组件状态
            this.currentMinimapState = this.isMinimapHidden = isMinimapHidden;
            this.mindmapView.currentCurveType = curveStyle;
            this.mindmapView.handleThemeChange(theme);

            await LangManager.whenInitialized;
            LangManager.setLang(lang);
        }

        /**
         * 更新单个设置
         * @param {string} key
         * @param {any} value
         */
        updateSetting(key, value) {
            if (!this.vscode) return;
            this.vscode.postMessage({ type: 'setSetting', key, value });
        }

        _setLangSource(uri) {
            this.langSource = uri.endsWith('/') ? uri.slice(0, -1) : uri;
            this._resolveLangSourceSet();
        }

        async _awaitLangSourceSet() {
            return this._langSourceSetPromise;
        }

        async initLangManager() {
            await this.setupVscodeCommunication();
            await this._awaitLangSourceSet();
            super.initLangManager();
        }

        /**
         * firstUpdated
         * @description LitElement 生命周期钩子：组件首次完成渲染并更新后调用。
         * 这里用于执行一次性的初始化工作：
         * - 调用父类的 firstUpdated 以确保基础行为正常
         * - 为 VS Code webview 初始化通信链路（如果可用）
         * - 绑定导出事件
         *
         * 注意：该方法不返回值，任何异步初始化应在内部处理（例如在 setupVscodeCommunication 中使用 await）。
         */
        async firstUpdated() {
            super.firstUpdated();

            // 监听自定义事件，用于导出思维导图为 SVG 或 PNG 格式。
            this.addEventListener('mindmap-export-svg', () => this.exportSVG());
            this.addEventListener('mindmap-export-image', () => this.exportPNG());
        }

        async getMessageContent() {
            await LangManager.whenInitialized;
            return html` <div>${T('Invalid File Content')}</div> `;
        }

        /**
         * exportSVG
         * @description 将当前思维导图导出为 SVG 文本，并通过 VS Code API（postMessage）发送到扩展端。
         * @returns {void}
         *
         * 实现细节：调用内部的 importExport._buildMindMapAsSvg() 构建 SVG 字符串，
         * 若成功则发送消息：{ type: 'export-svg', content: svgString }
         */
        exportSVG() {
            const svgString = this.mindmapView.importExport._buildMindMapAsSvg();
            if (svgString) {
                this.vscode.postMessage({
                    type: 'export-svg',
                    content: svgString,
                });
            }
        }

        /**
         * exportPNG
         * @description 将当前思维导图渲染为 PNG，并把结果以 data URL 的形式发回扩展处理写入磁盘。
         * @returns {Promise<void>}
         *
         * 实现细节：通过 importExport._createMindMapImageBlob() 获取图像 Blob，
         * 使用 FileReader 将其转换为 data URL，并发送消息：{ type: 'export-png', content: dataUrl }
         */
        async exportPNG() {
            const blob = await this.mindmapView.importExport._createMindMapImageBlob();
            if (blob) {
                const reader = new FileReader();
                reader.onload = () => {
                    this.vscode.postMessage({
                        type: 'export-png',
                        // reader.result 将是一个形如 "data:image/png;base64,..." 的 Data URL 字符串。
                        content: reader.result,
                    });
                };
                reader.readAsDataURL(blob);
            }
        }

        /**
         * setupVscodeCommunication
         * @description 初始化并建立页面（webview）与扩展之间的消息通道和同步逻辑。
         *
         * 主要职责：
         * - 接收并应用来自扩展的更新（type: 'update'），处理回显与初始化逻辑
         * - 捕获页面内的内容变更并通过防抖后的 `edit` 消息发送给扩展
         * - 在 capture 阶段拦截带修饰键的快捷键与剪贴板事件，发出 'command-request'，由扩展回发 'command-execute'
         * - 处理扩展下发的命令（'undo'/'redo'/'command-execute'）并在本地执行
         *
         * @returns {Promise<void>}
         */
        // 用于区分“新建文件”和“外部文件被清空”的标志
        _isInitialUpdate = true;
        async setupVscodeCommunication() {
            // Ensure the component has finished its first update and the child view is available.
            if (!this.mindmapView) {
                await this.updateComplete;
                this.mindmapView = this.shadowRoot.querySelector(this.getViewSelector());
            }

            if (!this.mindmapView) {
                console.error(
                    'The `vscode-mindmap-view` element was not found in `vscode-mindmap-main`'
                );
                return;
            }

            // 导图发生实质性编辑时触发
            this.addEventListener('mindmap-node-change', this.notifyDataChange);

            // 修复竞争条件：在监听事件前，用视图的初始状态初始化“已知状态”
            this.lastKnownPureDataText = this.getPureDataText(this.mindmapView.mindMapData);
            this.lastKnownFileContentText = JSON.stringify(
                this.mindmapView.importExport.getSavableData(),
                null,
                2
            );

            // 拦截带修饰键的快捷键（capture phase），并把命令请求发给扩展，由扩展统一下发执行，避免重复执行
            window.addEventListener(
                'keydown',
                (e) => {
                    if (!this.mindmapView || this.mindmapView.isTextEditing) return;

                    // 如果事件来源于可编辑元素（输入框、textarea、或 contentEditable），让其自行处理。
                    const origin = (e.composedPath && e.composedPath()[0]) || e.target;
                    if (
                        origin &&
                        (origin.tagName === 'INPUT' ||
                            origin.tagName === 'TEXTAREA' ||
                            origin.isContentEditable)
                    )
                        return;

                    const isUndoNode = e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey;
                    const isRedoNode =
                        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
                        (e.key === 'y' && (e.ctrlKey || e.metaKey));
                    const isCopyNode = e.key === 'c' && (e.ctrlKey || e.metaKey);
                    const isCutNode = e.key === 'x' && (e.ctrlKey || e.metaKey);
                    const isPasteNode = e.key === 'v' && (e.ctrlKey || e.metaKey);

                    if (isUndoNode || isRedoNode || isCopyNode || isCutNode || isPasteNode) {
                        e.preventDefault();
                        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                        else e.stopPropagation();

                        const cmd = isUndoNode
                            ? 'undo'
                            : isRedoNode
                            ? 'redo'
                            : isCopyNode
                            ? 'copy'
                            : isCutNode
                            ? 'cut'
                            : 'paste';

                        this.vscode.postMessage({ type: 'command-request', command: cmd });
                    }
                },
                true
            );

            // 也在剪贴板事件的 capture 阶段拦截（以防某些环境会直接触发 copy/cut/paste 事件）
            window.addEventListener(
                'copy',
                (e) => {
                    const origin = (e.composedPath && e.composedPath()[0]) || e.target;
                    if (
                        origin &&
                        (origin.tagName === 'INPUT' ||
                            origin.tagName === 'TEXTAREA' ||
                            origin.isContentEditable)
                    ) {
                        return;
                    }

                    e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    else e.stopPropagation();
                    this.vscode.postMessage({ type: 'command-request', command: 'copy' });
                },
                true
            );
            window.addEventListener(
                'cut',
                (e) => {
                    const origin = (e.composedPath && e.composedPath()[0]) || e.target;
                    if (
                        origin &&
                        (origin.tagName === 'INPUT' ||
                            origin.tagName === 'TEXTAREA' ||
                            origin.isContentEditable)
                    )
                        return;

                    e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    else e.stopPropagation();
                    this.vscode.postMessage({ type: 'command-request', command: 'cut' });
                },
                true
            );
            window.addEventListener(
                'paste',
                (e) => {
                    const origin = (e.composedPath && e.composedPath()[0]) || e.target;
                    if (
                        origin &&
                        (origin.tagName === 'INPUT' ||
                            origin.tagName === 'TEXTAREA' ||
                            origin.isContentEditable)
                    )
                        return;

                    e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    else e.stopPropagation();
                    this.vscode.postMessage({ type: 'command-request', command: 'paste' });
                },
                true
            );

            // 说明：剪贴板事件在不同平台或 webview 的实现中可能具有特殊语义。
            // 在这里我们统一在 capture 阶段拦截并发出 command-request，扩展收到后会统一回发 command-execute。

            // 监听从 VS Code 扩展发送过来的消息。
            // 事件数据位于 event.data，按照约定的消息类型进行分发处理。
            window.addEventListener('message', async (event) => {
                const message = event.data;
                switch (message.type) {
                    case 'set-lang-source':
                        this._setLangSource(message.uri);
                        return;
                    case 'update': {
                        const incomingText = message.text;

                        // 忽略回显
                        if (incomingText === this.lastKnownFileContentText) {
                            return;
                        }

                        this.mindmapView.nodeEdit.nodeHistory.clear();

                        if (this._isInitialUpdate) {
                            this._isInitialUpdate = false;
                            if (!incomingText || !incomingText.trim()) {
                                // 场景A: 新建文件。发送 'init' 来同步后台内存，但不会标记为脏文件。
                                await LangManager.whenInitialized;
                                this.mindmapView.mindMapData.text = T('Central Topic');
                                const initialContent =
                                    this.mindmapView.importExport.getSavableData();
                                const initialContentText = JSON.stringify(initialContent, null, 2);

                                this.lastKnownPureDataText = this.getPureDataText(
                                    this.mindmapView.mindMapData
                                );
                                this.lastKnownFileContentText = initialContentText;

                                this.vscode.postMessage({
                                    type: 'init',
                                    text: initialContentText,
                                });

                                this.mindmapView.nodeEdit.nodeHistory.addState({
                                    data: this.mindmapView.mindMapData,
                                    selectedNodeId: this.mindmapView.selectedNodeId,
                                });
                                this.mindmapView.updateMindmap();
                                return;
                            }
                            this.mindmapView.isRootNodeModified = true;
                        } else {
                            if (!incomingText || !incomingText.trim()) {
                                // 场景B: 已有文件被外部清空。只更新视图，不回发消息。
                                // console.log('场景B: 已有文件被外部清空。只更新视图，不回发消息。');

                                await LangManager.whenInitialized;
                                this.mindmapView.mindMapData.text = T('Central Topic');
                                this.mindmapView.isRootNodeModified = false;

                                this.lastKnownPureDataText = this.getPureDataText(
                                    this.mindmapView.mindMapData
                                );
                                this.lastKnownFileContentText = ''; // File is now empty

                                // this.mindmapView.nodeEdit.nodeHistory.addState({
                                //     data: this.mindmapView.mindMapData,
                                //     selectedNodeId: 'root',
                                // });
                                this.mindmapView.viewportManager.centerViewportOnNode('root');
                                this.mindmapView.updateMindmap();
                                return;
                            }
                        }

                        this.lastKnownFileContentText = incomingText;
                        let fileContent;
                        try {
                            fileContent = JSON.parse(incomingText);
                        } catch (e) {
                            // 打开文件时发生错误时触发
                            this.dispatchEvent(new Event('file-read-error'));
                            return;
                        }

                        this.lastKnownPureDataText = this.getPureDataText(fileContent.data);
                        this.mindmapView.mindMapData =
                            fileContent.data || this.dispatchEvent(new Event('file-read-error'));

                        if (fileContent.metadata && fileContent.metadata.view) {
                            this.mindmapView.viewportManager.setView(fileContent.metadata.view);
                        } else {
                            this.mindmapView.viewportManager.centerViewportOnNode('root');
                        }
                        this.mindmapView.updateMindmap();
                        break;
                    }
                    case 'command-execute': {
                        switch (message.command) {
                            case 'undo':
                                this.mindmapView.nodeEdit.undoNode();
                                this.mindmapView.updateMindmap();
                                this.notifyDataChange.flush();
                                break;
                            case 'redo':
                                this.mindmapView.nodeEdit.redoNode();
                                this.mindmapView.updateMindmap();
                                this.notifyDataChange.flush();
                                break;
                            case 'copy':
                                this.mindmapView.nodeEdit.copyNode();
                                break;
                            case 'cut':
                                this.mindmapView.nodeEdit.cutNode();
                                break;
                            case 'paste':
                                this.mindmapView.nodeEdit.pasteNode();
                                break;
                        }
                        break;
                    }
                }
            });

            this.vscode.postMessage({ type: 'ready' });
        }
        triggerUpdate(data) {
            this.vscode.postMessage({
                type: 'edit',
                text: data,
            });
        }
    }
);
