import { html, css } from './common/lit.js';
import MindmapBaseElement from './common/MindmapBaseElement.js';
import './mindmap-view.js';
import './mindmap-menu.js';
import './mindmap-minimap.js';
import './mindmap-search.js';

import ComponentAPI from './common/ComponentAPI.js';
import { debounce } from './common/Utils.js';
import { T, LangManager } from './common/LangManager.js';

/**
 * @class MindmapMain
 * @extends {MindmapBaseElement}
 * @description
 * 这是整个思维导图应用的顶层主组件。
 * 它负责组装、布局和协调所有子组件（如视图、菜单、小地图等），
 * 并管理全局状态和事件流。
 */
export default class MindmapMain extends MindmapBaseElement {
    /**
     * @property {CSSResult}
     * @description 组件的静态样式，定义了主容器的布局以及各个子组件的绝对定位。
     */
    static styles = css`
        button {
            -webkit-appearance: none;
            appearance: none;
            outline: none;
            padding: 0;
            margin: 0;
            border: none;
            cursor: pointer;
        }
        :host {
            display: block;
            width: 100%;
            height: 100%;
            position: relative;
        }
        mindmap-menu {
            position: absolute;
            top: 15px;
            left: 15px;
            z-index: 20;
        }
        mindmap-search {
            position: absolute;
            top: 11px;
            right: 11px;
            z-index: 10;
        }

        message-overlay {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            gap: 15px;
        }
        message-overlay ~ * {
            pointer-events: none;
        }
        message-overlay > div {
            color: var(--message-overlay-font-color);
        }
        message-overlay button {
            padding: 10px 14px;
            font-size: 15px;
            border-radius: 6px;
            border: 1px solid var(--message-overlay-buttom-border-color);
            font-weight: 500;
            color: var(--message-overlay-buttom-font-color);
            background-color: var(--message-overlay-buttom-bg-color);
            transition: background-color 0.3s;
        }
        message-overlay button:hover {
            background-color: var(--message-overlay-buttom-hover-bg-color);
        }
    `;

    /**
     * @property {object}
     * @description LitElement 的响应式属性声明。
     */
    static properties = {
        // MiniMap
        isMinimapHidden: { state: true },
        // 搜索框
        isSearchHidden: { state: true },
        // 菜单
        isMenuhHidden: { state: true },
        // 默认语言
        defaultLang: { state: true },
        // 默认连接线样式
        defaultCurveStyle: { state: true },
        // 默认主题
        defaultTheme: { state: true },
        // 菜单项状态集合
        menuItemsStatus: { type: Object },
    };

    /**
     * @constructor
     * @description 初始化组件的所有状态属性的默认值。
     */
    constructor() {
        super();
        // 对核心视图组件 <mindmap-view> 的引用
        this.mindmapView = null;
        // 小地图组件
        this.minimap = null;
        // 语言包源目录
        this.langSource = null;
        // 定义菜单数据
        this.getMenuItems = null;
        // 消息提示页
        this.messageContent = null;
        // 默认语言
        this.defaultLang = 'zhs';

        // this.currentMinimapState 用来记录原始数据，用来做临时隐藏时恢复设置状态
        this.currentMinimapState = this.isMinimapHidden = false;
        this.isMinimapGlobalDrag = true;
        this.isMenuhHidden = false;
        this.isSearchHidden = true;
        this.curveStyle = 'cubic_smooth_s';
        // system light dark
        this.theme = 'system';
    }
    updateSetting() {}
    initSettings() {}
    /**
     * @method initLangManager
     * @description 初始化语言管理器，设置默认语言和语言文件源。
     */
    initLangManager() {
        LangManager.init({ keyLang: 'en', defaultLang: this.defaultLang, source: this.langSource });
    }

    /**
     * @method firstUpdated
     * @description LitElement 的生命周期方法，在组件第一次渲染到 DOM 后调用。
     * 主要用于获取对子组件的引用和设置事件监听器。
     */
    firstUpdated() {
        this.mindmapView = this.shadowRoot.querySelector('mindmap-view');
        this.minimap = this.shadowRoot.querySelector('mindmap-minimap');

        this.setupEventListeners();
        this.initLangManager();

        this.mindmapView.handleThemeChange(this.theme);

        // 菜单项目状态管理
        this.menuItemsStatus = {
            // 迷你地图
            minimap: {
                isEnabled: () => !this.isMinimapHidden,
            },
            minimapGlobalDrag: {
                isDisabled: () => false,
                isEnabled: () => this.minimap.isGlobalDrag,
                isHidden: () => this.isMinimapHidden,
            },
            // 连接线样式
            curveStyle: {
                isEnabled: (item) => {
                    return this.mindmapView.currentCurveType === item.detail.curveType;
                },
            },
            // 语言
            lang: {
                isEnabled: (item) => {
                    return LangManager.currentLang === item.detail.lang;
                },
            },
            // 主题
            theme: {
                isEnabled: (item) => {
                    return this.mindmapView.currentTheme === item.detail.theme;
                },
            },
            // 撤销
            undo: {
                isDisabled: () => !this.mindmapView.nodeEdit.nodeHistory.canUndo(),
            },
            // 重做
            redo: {
                isDisabled: () => !this.mindmapView.nodeEdit.nodeHistory.canRedo(),
            },
            // 复制
            copy: {
                isDisabled: () => {
                    if (!!!this.mindmapView.selectedNodeId) return true;
                },
            },
            // 剪切
            cut: {
                isDisabled: () => {
                    if (!!!this.mindmapView.selectedNodeId) return true;
                    if (this.mindmapView.selectedNodeId === 'root') return true;
                },
            },
            // 粘贴
            paste: {
                isDisabled: () => {
                    if (!!!this.mindmapView.selectedNodeId) return true;
                    return !!!this.mindmapView.nodeEdit.clipboard?.data;
                },
            },
        };

        ComponentAPI.watch(this, 'minimap:isGlobalDrag', (msg) => {
            if (msg.type === 'value') {
                this.isMinimapGlobalDrag = msg.value;
            }
        });

        // 初始化设置
        this.initSettings();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        ComponentAPI.unwatch(this, 'minimap:isGlobalDrag');
    }

    /**
     * @method setupEventListeners
     * @description 集中设置所有事件监听器。这包括来自子组件的自定义事件和全局 window 事件，
     * 将用户或组件的意图连接到具体的执行逻辑。
     */
    setupEventListeners() {
        // --- 视图控制事件 ---
        this.addEventListener('mindmap-zoom-in', () => this.mindmapView.viewportManager.zoomIn());
        this.addEventListener('mindmap-zoom-out', () => this.mindmapView.viewportManager.zoomOut());
        this.addEventListener('mindmap-reset-view', () =>
            this.mindmapView.viewportManager.resetView()
        );
        this.addEventListener('mindmap-center-view', () =>
            this.mindmapView.viewportManager.centerViewportOnNode('root')
        );
        this.addEventListener('mindmap-set-view', (e) =>
            this.mindmapView.viewportManager.setView(e.detail)
        );

        // --- 剪贴板事件 转发给mindmapView ---
        this.addEventListener(
            'copy-node',
            (event) => (event.stopPropagation(), this.mindmapView.dispatch('copy-node'))
        );
        this.addEventListener(
            'cut-node',
            (event) => (event.stopPropagation(), this.mindmapView.dispatch('cut-node'))
        );
        this.addEventListener(
            'paste-node',
            (event) => (event.stopPropagation(), this.mindmapView.dispatch('paste-node'))
        );
        // --- 历史记录事件 转发给mindmapView ---
        this.addEventListener(
            'undo',
            (event) => (event.stopPropagation(), this.mindmapView.dispatch('undo'))
        );
        this.addEventListener(
            'redo',
            (event) => (event.stopPropagation(), this.mindmapView.dispatch('redo'))
        );

        // --- 功能事件 ---
        this.addEventListener('mindmap-change-curve', (e) => {
            this.mindmapView.currentCurveType = e.detail.curveType;
            this.updateSetting('curveStyle', e.detail.curveType);
        });
        this.addEventListener('mindmap-export-file', () =>
            this.mindmapView.importExport.exportMindMapFile()
        );
        this.addEventListener('mindmap-import-file', () =>
            this.mindmapView.importExport.importMindMapFile()
        );
        this.addEventListener('mindmap-export-image', () =>
            this.mindmapView.importExport.exportMindMapAsImage()
        );
        this.addEventListener('mindmap-export-svg', () =>
            this.mindmapView.importExport.exportMindMapAsSvg()
        );
        this.addEventListener('toggle-theme', (e) => {
            this.mindmapView.handleThemeChange(e.detail.theme);
            this.updateSetting('theme', e.detail.theme);
        });
        this.addEventListener('change-lang', (e) => {
            LangManager.setLang(e.detail.lang);
            this.updateSetting('lang', e.detail.lang);
        });

        // --- UI切换事件 ---
        this.addEventListener(
            'toggle-minimap',
            () => (
                (this.currentMinimapState = this.isMinimapHidden = !this.isMinimapHidden),
                this.updateSetting('isMinimapHidden', this.currentMinimapState)
            )
        );
        this.addEventListener('mindmap-toggle-drag-mode', () => {
            if (this?.minimap) {
                this.minimap.isGlobalDrag = !this.minimap.isGlobalDrag;
                this.updateSetting('isMinimapGlobalDrag', !this.minimap.isGlobalDrag);
            }
        });
        this.addEventListener('toggle-search', () => (this.isSearchHidden = !this.isSearchHidden));

        // 监听来自导图视图的导图就绪事件
        this.addEventListener('mindmap-ready', () => {
            if (this?.minimap) {
                this.minimap.requestUpdate();
            }
        });
        this.addEventListener('node-focus', () => {
            if (this?.minimap) {
                this.minimap.requestUpdate();
            }
        });
        //  ViewportManager 派发的 'viewport-changed' 事件
        this.addEventListener('viewport-changed', () => {
            if (this?.minimap) {
                this.minimap.requestUpdate();
            }
        });

        // --- 全局键盘事件 ---
        window.addEventListener('keydown', this.handleKeyDown.bind(this));

        // 导入错误格式的mind时处理
        this.addEventListener('file-read-error', this.handleMindmapFileReadError.bind(this));

        // 监听画布节点是否编辑
        this.addEventListener('mindmap-node-change', this.notifyDataChange);

        // this.addEventListener('start-edit-node-text', e => {
        //     console.log('开始编辑节点', e.detail.node.id);
        //     this.isMenuhHidden = true;
        //     this.isMinimapHidden = true;
        // });
        // this.addEventListener('end-edit-node-text', e => {
        //     console.log('结束编辑节点', e.detail.node.id);
        //     this.isMenuhHidden = false;
        //     this.isMinimapHidden = false;
        // });
        window.visualViewport.addEventListener('resize', () => {
            const height = window.visualViewport.height;
            // console.log(`可视窗口大小: 宽度=${width}px, 高度=${height}px`);
            if (height < 300) {
                this.isMenuhHidden = true;
                this.isMinimapHidden = true;
            } else if (height >= 300) {
                this.isMenuhHidden = false;
                this.isMinimapHidden = this.currentMinimapState;
            }
        });

        // 展开所有节点
        this.addEventListener('expand-all-node', () => this.mindmapView.nodeEdit.expand());
        // 收缩所有节点
        this.addEventListener('collapse-all-node', () => this.mindmapView.nodeEdit.collapse());
    }

    // 文件导入成功后
    handleMindmapFileReadSuccess() {
        this.isMenuhHidden = false;
        this.isMinimapHidden = false;
        this.messageContent = null;
        this.mindmapView.isRootNodeModified = true;
        this.requestUpdate();
        window.removeEventListener('keydown', this.handlerBlockEvents, true);
        this.removeEventListener('file-read-success', this.handleMindmapFileReadSuccess);
    }
    // 文件导入失败
    async handleMindmapFileReadError() {
        if (this.messageContent) return;
        this.mindmapView.clearMindmap();
        this.isMenuhHidden = true;
        this.isMinimapHidden = true;
        // 暂时阻止所有键盘事件
        this.handlerBlockEvents = (e) => (e.stopImmediatePropagation(), e.preventDefault());
        window.addEventListener('keydown', this.handlerBlockEvents, true);
        // 开始监听文件成功导入的事件
        this.handleMindmapFileReadSuccess = this.handleMindmapFileReadSuccess.bind(this);
        this.addEventListener('file-read-success', this.handleMindmapFileReadSuccess);

        this.messageContent = await this.getMessageContent();
        this.requestUpdate();
    }
    async getMessageContent() {
        return html`
            <div>${T('Invalid File Content')}</div>
            <button type="button" @click=${() => this.mindmapView.importExport.importMindMapFile()}>
                ${T('Select File Again')}
            </button>
        `;
    }

    /**
     * @method handleKeyDown
     * @description 处理全局键盘按下事件，实现各种快捷键功能。
     * @param {KeyboardEvent} e
     */
    handleKeyDown(e) {
        // 如果正在编辑文本或右键菜单已打开，则禁用大多数快捷键。
        if (this.mindmapView.isContextMenuOpen || this.mindmapView.isTextEditing) return;

        const isCommand = e.metaKey || e.ctrlKey;

        // 搜索 (Cmd/Ctrl + F)
        if (isCommand && e.key === 'f') {
            e.preventDefault();
            this.isSearchHidden = false;
            return;
        }

        // 快速缩放 (Cmd/Ctrl + 1/2)
        if (isCommand && e.key === '1') {
            e.preventDefault();
            this.mindmapView.viewportManager.setScale(1);
            return;
        }
        if (isCommand && e.key === '2') {
            e.preventDefault();
            this.mindmapView.viewportManager.setScale(2);
            return;
        }
    }
    /**
     * getPureDataText
     * @description 将节点数据（包含视图/临时字段）简化为仅包含语义内容的 JSON 文本（id/text/children），
     *              用于高效比较内容是否真正变化，从而避免因视图状态触发不必要的保存/同步。
     * @param {object} nodeData 完整的节点数据
     * @returns {string} JSON 序列化的纯数据文本
     */
    // - getPureDataText 的目的是把复杂的完整数据（如节点位置、渲染缓存、临时字段）
    //   简化为“内容本身”的表示（id、text、children），用于判断文档内容是否真正改变。
    // - 这样可以避免把视图的元数据（pan/zoom/渲染状态等）当成内容变更，从而减少不必要的保存/同步。
    getPureDataText(nodeData) {
        if (!nodeData) return '{}';

        function transform(node) {
            const newNode = {
                id: node.id,
                text: node.text,
            };
            if (node.children && node.children.length > 0) {
                newNode.children = node.children.map(transform);
            } else {
                newNode.children = [];
            }
            return newNode;
        }

        const transformedData = transform(nodeData);
        return JSON.stringify(transformedData, null, 2);
    }
    // 用于“脏检查”（dirty checking）的变量，记录最后一次同步的纯数据状态。
    lastKnownPureDataText = '';
    // 用于避免消息回显（echo cancellation）的变量，记录最后一次接收到的文件内容。
    lastKnownFileContentText = '';
    notifyDataChange = debounce(() => {
        const newPureDataText = this.getPureDataText(this.mindmapView.mindMapData);

        // 只有当核心数据确实发生变化时才通知
        if (newPureDataText !== this.lastKnownPureDataText) {
            this.lastKnownPureDataText = newPureDataText;

            const newFileContent = this.mindmapView.importExport.getSavableData();
            const newFileContentText = JSON.stringify(newFileContent, null, 2);
            // 更新 this.lastKnownFileContentText 以防止自己触发的回显。
            this.lastKnownFileContentText = newFileContentText;

            this.triggerUpdate(newFileContentText);
        }
    }, 300);
    async triggerUpdate(data) {}
    /**
     * @method render
     * @description LitElement 的 render 方法，负责渲染组件的 DOM 结构。
     * @returns {TemplateResult}
     */
    render() {
        return html`
            ${this.messageContent &&
            html`<message-overlay>${this.messageContent}</message-overlay>`}

            <mindmap-view></mindmap-view>
            <mindmap-menu
                .items=${this.getMenuItems(T)}
                .itemsStatus=${this.menuItemsStatus}
                ?hidden=${this.isMenuhHidden}
            ></mindmap-menu>
            <mindmap-search
                .mindmapView=${this.mindmapView}
                ?hidden=${this.isSearchHidden}
            ></mindmap-search>
            <mindmap-minimap
                .mindmapView=${this.mindmapView}
                ?hidden=${this.isMinimapHidden}
            ></mindmap-minimap>
        `;
    }
}
