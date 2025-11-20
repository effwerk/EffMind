// 导入 LitElement 的核心功能，用于构建 Web Components
import { html, css } from './common/lit.js';
// 导入所有思维导图组件的基础类
import MindmapBaseElement from './common/MindmapBaseElement.js';
// 导入处理导入导出功能的模块
import ImportExport from './mindmap-view/ImportExport.js';
// 导入处理节点编辑功能的模块
import NodeEdit from './mindmap-view/NodeEdit.js';
// 导入渲染器模块，负责将数据渲染成 SVG
import Renderer from './mindmap-view/Renderer.js';
// 导入布局管理器，负责计算节点位置
import LayoutManager from './mindmap-view/LayoutManager.js';
// 导入视口管理器，负责处理缩放和平移
import ViewportManager from './mindmap-view/ViewportManager.js';
// 导入交互管理器，负责处理用户输入事件
import InteractionManager from './mindmap-view/InteractionManager.js';
// 导入自定义的右键菜单组件
import './mindmap-context-menu.js';
// 导入自定义的节点快捷菜单组件
import './node-quick-menu.js';
// 导入国际化（i18n）相关的函数
import { T, ReactiveT } from './common/LangManager.js';
// 导入防抖函数和长按事件类，用于性能优化和触摸交互
import { debounce, LongPressEvent } from './common/Utils.js';

// 导入一个函数，该函数根据当前上下文生成右键菜单项
import { getContextMenuItems } from './contextMenuItems.js';

/**
 * @class MindmapView
 * @extends {MindmapBaseElement}
 * @description
 * 思维导图的主视图组件，是整个应用的核心。
 * 它作为总协调器，管理和整合所有子模块（如渲染、布局、交互、数据管理等），
 * 形成一个完整的思维导图功能。
 */
export default class MindmapView extends MindmapBaseElement {
    /**
     * @property {CSSResult} styles
     * @description
     * 定义组件的静态 CSS 样式。
     * 这些样式控制着思维导图的整体外观，包括节点、链接、文本、高亮效果等。
     * 使用 CSS 变量来实现主题化（浅色/深色模式）。
     */
    static styles = css`
        /* :host 选择器用于设置组件根元素（宿主元素）的样式 */
        :host {
            display: block;
            width: 100%;
            height: 100%;
            position: relative;
        }
        /* 当组件在导出为图片时，隐藏节点的折叠/展开按钮 */
        :host(.exporting) .toggle-circle {
            display: none;
        }
        /* 主 SVG 画布的样式 */
        #MindmapSVG {
            width: 100%;
            height: 100%;
            display: block;
            background-color: var(--mindmap-bg-color);
            /* touch-action: none; 用于禁用浏览器默认的触摸行为（如滚动），以便自定义平移和缩放 */
            touch-action: none;
        }
        /* 节点的通用样式 */
        .node {
            cursor: pointer;
            transition: opacity 0.2s ease-in-out;
            font-size: var(--node-font-size);
            font-weight: var(--node-font-weight);
        }
        /* 根节点的特定字体样式 */
        g[data-id='root'] {
            font-size: var(--node-root-font-size);
            font-weight: var(--node-root-font-weight);
        }
        /* 根节点编辑框的字体样式 */
        g[data-id='root'] .node-text-div {
            font-size: var(--node-root-font-size);
            line-height: normal;
        }
        /* 拖拽时，作为潜在父节点的节点的悬停效果 */
        .node.potential-parent-hover {
            opacity: 0.7;
        }
        /* 根节点的背景填充颜色 */
        g[data-id='root'] .node-rect {
            fill: var(--node-root-fill);
        }
        /* 节点矩形的通用样式 */
        .node-rect {
            stroke: var(--node-rect-stroke);
            stroke-width: var(--node-stroke-width);
            fill: var(--node-rect-fill);
            rx: var(--node-border-radius); /* 圆角 */
            ry: var(--node-border-radius);
        }
        /* 选中节点的矩形边框样式 */
        .node-rect.selected {
            stroke: var(--node-selected-stroke);
            stroke-width: 2.5;
        }
        /* 搜索高亮节点的矩形样式 */
        .node.highlight .node-rect {
            fill: var(--node-highlight-fill);
            stroke: var(--node-highlight-stroke-color);
        }
        /* 选中且高亮的节点的矩形样式 */
        .node.highlight .node-rect.selected {
            stroke: var(--node-highlight-selected-stroke-color);
        }
        /* 节点文本的样式 */
        .node-text {
            user-select: none; /* 禁止选中文本 */
            text-anchor: middle; /* 水平居中 */
            dominant-baseline: central; /* 垂直居中 */
            fill: var(--node-text-color);
        }
        /* 高亮节点的文本颜色 */
        .node.highlight .node-text {
            fill: var(--node-highlight-text-color);
        }
        /* 高亮节点的文本编辑框颜色 */
        .node.highlight .node-text-div {
            color: var(--node-highlight-text-color);
        }
        /* 节点之间连接线的样式 */
        .link {
            fill: none;
            stroke: var(--link-stroke);
            stroke-width: var(--link-stroke-width);
        }
        /* 用于包裹文本编辑框的 foreignObject 的样式 */
        .node-foreign-object {
            overflow: visible;
        }
        /* 节点文本编辑框（一个 div）的样式 */
        .node-text-div {
            width: 100%;
            height: 100%;
            padding: var(--node-text-padding);
            box-sizing: border-box;
            background-color: transparent;
            border: none;
            outline: none;
            color: var(--node-text-color);
            text-align: center;
            font-size: var(--node-font-size);
            font-family: var(--node-text-font-family);
            line-height: 1.3;
        }
        /* 折叠/展开按钮的样式 */
        .toggle-circle {
            cursor: pointer;
        }
        /* 拖拽时，作为放置目标的节点的边框样式 */
        .node-rect.drop-target {
            stroke: var(--drop-target-stroke);
            stroke-width: 3px;
        }
        /* 禁止在 SVG 中选择文本 */
        svg text {
            -webkit-user-select: none;
            user-select: none;
        }
    `;

    /**
     * @property {object} properties
     * @description
     * LitElement 的响应式属性声明。
     * 当这些属性的值发生变化时，LitElement 会自动触发组件的重新渲染。
     * `state: true` 表示这是一个内部状态，不会作为 HTML attribute 反射。
     */
    static properties = {
        /** @type {object} 思维导图的完整数据结构。 */
        mindMapData: { state: true },
        /** @type {string|null} 当前选中的节点的 ID。 */
        selectedNodeId: { state: true },
        /** @type {string} 节点之间连接线的曲线样式。 */
        currentCurveType: { state: true },
        /** @type {Set<string>} 因搜索等操作而需要高亮的节点 ID 集合。 */
        highlightedNodeIds: { state: true },
        /** @type {boolean} 右键菜单是否打开。 */
        isContextMenuOpen: { state: true },
        /** @type {Array} 当前右键菜单的菜单项。 */
        contextMenuItems: { state: true },
        /** @type {boolean} 当前交互是否来自触摸设备。 */
        isTouch: { state: true },
        /** @type {boolean} 根节点是否被用户修改过，用于判断是否需要保存。 */
        isRootNodeModified: { state: true },
        // 当前主题
        currentTheme: { state: true },
    };

    /**
     * @constructor
     * @description
     * 组件的构造函数。
     * 在这里初始化所有的状态属性、常量和管理器实例。
     * 这是组件生命周期的第一步。
     */
    constructor() {
        super();
        // 定义节点文本周围的内边距
        this.NODE_PADDING_X = 15;
        this.NODE_PADDING_Y = 10;
        // 初始化一个空的思维导图数据结构
        this.mindMapData = { id: 'root', text: '', children: [] };
        // 初始化视口状态（缩放和平移）
        this.viewState = {
            scale: 1,
            panX: 0,
            panY: 0,
            minScale: 0.2,
            maxScale: 3,
            svgWidth: 0,
            svgHeight: 0,
        };
        this.selectedNodeId = null;
        this.currentCurveType = 'cubic_smooth_s'; // 默认连接线样式
        // 初始化用户交互相关的状态
        this.interactionState = {};
        this.isSpacePressed = false;
        this.isTextEditing = false;
        this.isContextMenuOpen = false;
        // 初始化主题管理相关的状态
        this.themeMediaQuery = null;
        this._boundApplySystemTheme = this._applySystemTheme.bind(this);

        // 用于在更新后聚焦或平移到特定节点的临时状态
        this._nodeToFocus = null;
        this._nodeToPan = null;
        // 初始化搜索高亮相关的状态
        this.highlightedNodeIds = new Set();
        this.searchTerm = '';

        // 实例化所有管理器模块，并将当前组件实例 `this` 传入
        this.importExport = new ImportExport(this);
        this.nodeEdit = new NodeEdit(this);
        this.renderer = new Renderer(this);
        this.layoutManager = new LayoutManager(this);
        this.viewportManager = new ViewportManager(this);
        this.interactionManager = new InteractionManager(this);

        // 初始化右键菜单相关的状态和绑定
        this.contextMenuItems = [];
        this.contextMenuElement = null;
        this._boundHandlePointerDownOutside = this._handlePointerDownOutside.bind(this);
        this._boundHandleResize = this.handleResize.bind(this);

        // --- 触摸交互相关的状态初始化 ---
        this.longPressManager = new LongPressEvent({ duration: 700, threshold: 10 });
        this._longPressOccurred = false; // 是否已发生长按
        this._activePointers = new Map(); // 存储活跃的触摸点

        this.isTouch = false;
        this.isRootNodeModified = false;
    }

    /**
     * @method _setupCoreTouchEventListeners
     * @description
     * 设置核心的触摸事件监听器。
     * 这个方法专门处理触摸屏上的复杂交互，如多点触控（捏合缩放）和长按触发右键菜单。
     * 这些监听器直接附加到 SVG 画布上，以提供最底层的交互支持。
     */
    _setupCoreTouchEventListeners() {
        const svg = this.svg;
        if (!svg) return;

        // --- 活跃指针管理 ---
        // 更新或添加一个触摸点到 _activePointers 映射中
        const updatePointer = (pid, x, y, type) => {
            this._activePointers.set(pid, { x, y, pointerType: type });
        };
        // 从 _activePointers 映射中移除一个触摸点
        const removePointer = (pid) => {
            this._activePointers.delete(pid);
        };

        // 在捕获阶段监听 pointerdown，以便尽早记录触摸点信息
        svg.addEventListener(
            'pointerdown',
            (e) => {
                this.isTouch = e.pointerType === 'touch';
                if (!this.isTouch) return;
                updatePointer(e.pointerId, e.clientX, e.clientY, e.pointerType);
            },
            { capture: true }
        );

        // --- 使用 LongPressEvent 工具处理长按事件 ---
        this.longPressManager.bind(this, (e) => {
            // 前置条件判断
            if (e.pointerType !== 'touch' || this.isContextMenuOpen || this.isTextEditing) return;
            if (this._activePointers.size > 1 || this.interactionState.pinch) return;

            this._longPressOccurred = true; // 标记已发生长按

            // 确定长按的目标节点，并派发上下文菜单事件
            const targetElement = this.shadowRoot.elementFromPoint(e.clientX, e.clientY);
            const targetNodeElement = targetElement ? targetElement.closest('.node') : null;
            const nodeId = targetNodeElement ? targetNodeElement.dataset.id : null;

            this.dispatch('mindmap-context-menu', {
                x: e.clientX,
                y: e.clientY,
                nodeId: nodeId,
            });
        });

        // 阻止长按后的点击事件 (这个逻辑需要保留)
        document.addEventListener(
            'click',
            (e) => {
                if (this._longPressOccurred) {
                    e.preventDefault();
                    e.stopPropagation();
                    this._longPressOccurred = false;
                }
            },
            { capture: true }
        );

        svg.addEventListener(
            'pointerup',
            (e) => {
                if (e.pointerType === 'touch') removePointer(e.pointerId);
                // 如果捏合结束，重置捏合状态
                if (this.interactionState.pinch && this._activePointers.size < 2) {
                    this.interactionState.pinch = false;
                }
            },
            { capture: true }
        );
        svg.addEventListener(
            'pointercancel',
            (e) => {
                if (e.pointerType === 'touch') removePointer(e.pointerId);
                if (this.interactionState.pinch && this._activePointers.size < 2) {
                    this.interactionState.pinch = false;
                }
            },
            { capture: true }
        );

        // 在 pointerdown 的捕获阶段同步文本编辑状态，防止状态不一致
        svg.addEventListener(
            'pointerdown',
            (e) => {
                if (this.isTextEditing) {
                    const anyEditBox = !!this.g.querySelector('.node-foreign-object');
                    if (!anyEditBox) {
                        this.isTextEditing = false;
                    }
                }
            },
            { capture: true }
        );

        // --- 捏合缩放逻辑 ---
        svg.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'touch') return;
            if (this._activePointers.has(e.pointerId)) {
                updatePointer(e.pointerId, e.clientX, e.clientY, e.pointerType);
            }

            // 当检测到两个或更多触摸点时，启动捏合状态
            if (!this.interactionState.pinch && this._activePointers.size >= 2) {
                this.interactionState.pinch = true;
                this.interactionState.panning = false; // 停止平移
                delete this.interactionState.startX;
                delete this.interactionState.startY;
                this.interactionState.dragging = false; // 停止拖拽
                this.interactionState.draggedNodeId = null;

                // 记录捏合开始时的状态
                const pointsInit = Array.from(this._activePointers.values()).slice(0, 2);
                const ip1 = pointsInit[0],
                    ip2 = pointsInit[1];
                let initDist = Math.hypot(ip2.x - ip1.x, ip2.y - ip1.y);
                if (!isFinite(initDist) || initDist < 0.0001) initDist = 0.0001;
                this.interactionState.pinchStartDistance = initDist;
                this.interactionState.pinchStartScale = this.viewState.scale;
                this.interactionState.pinchCenter = { x: (ip1.x + ip2.x) / 2, y: (ip1.y + ip2.y) / 2 };
                this.interactionState.pinchStartPan = { x: this.viewState.panX, y: this.viewState.panY };
            }

            // 如果正在捏合，则处理捏合移动
            if (this.interactionState.pinch && this._activePointers.size >= 2) {
                e.preventDefault();
                const pts = Array.from(this._activePointers.values()).slice(0, 2);
                const p1 = pts[0],
                    p2 = pts[1];
                const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const currentCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

                // 调用视口管理器的 handlePinch 方法来计算新的缩放和平移
                this.viewportManager.handlePinch(
                    this.interactionState.pinchStartDistance,
                    currentDist,
                    this.interactionState.pinchStartScale,
                    this.interactionState.pinchStartPan,
                    this.interactionState.pinchCenter,
                    currentCenter
                );
            }
        });
    }

    /**
     * @method firstUpdated
     * @description
     * LitElement 的生命周期方法，在组件第一次渲染到 DOM 后调用。
     * 这是执行一次性设置的理想位置，例如获取对子元素的引用、设置事件监听器和初始化数据。
     */
    async firstUpdated() {
        // 获取对 SVG 元素的引用
        this.svg = this.shadowRoot.getElementById('MindmapSVG');

        // 使用 ReactiveT 初始化根节点文本，使其能够响应语言变化
        this.mindMapData.text = await ReactiveT(
            'Central Topic',
            (value) => {
                this.mindMapData.text = value;
                this.updateMindmap();
            },
            () => this.isRootNodeModified // 当用户修改过根节点后，停止自动更新
        );

        // 创建用于承载所有节点和链接的 SVG <g> 元素
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.g);

        // 将根节点初始位置设置在画布中心
        this.mindMapData.x = this.svg.clientWidth / 2;
        this.mindMapData.y = this.svg.clientHeight / 2;

        // 初始化视口
        this.viewportManager.updateView();

        // 获取对右键菜单组件的引用
        this.contextMenuElement = this.shadowRoot.querySelector('mindmap-context-menu');

        // 设置所有交互事件监听器
        this.interactionManager.setupEventListeners();
        this._setupCoreTouchEventListeners(); // 设置核心触摸事件监听器

        // 监听自定义的上下文菜单事件
        this.addEventListener('mindmap-context-menu', this.handleContextMenu.bind(this));

        // 监听视口变化事件
        this.addEventListener('viewport-changed', this.handleViewportChanged.bind(this));
        // 监听窗口大小变化事件
        window.addEventListener('resize', this._boundHandleResize);

        // 设置其他事件监听器
        this.setupEventListeners();

        // 初始渲染思维导图
        this.updateMindmap();
        // 初始化主题 => 在MindmapMain中初始化
        // this.handleThemeChange('system');
        // 派发 'mindmap-ready' 事件，通知父组件思维导图已准备就绪
        this.dispatch('mindmap-ready');
    }

    /**
     * @method updated
     * @description
     * LitElement 的生命周期方法，在组件的 DOM 更新后调用。
     * 用于执行依赖于更新后 DOM 的操作。
     * @param {Map} changedProperties - 一个包含已更改属性及其旧值的 Map。
     */
    async updated(changedProperties) {
        // 如果思维导图数据或相关状态发生变化，则重新渲染
        if (
            changedProperties.has('mindMapData') ||
            changedProperties.has('selectedNodeId') ||
            changedProperties.has('currentCurveType') ||
            changedProperties.has('highlightedNodeIds')
        ) {
            this.renderer.render();
        }

        // 如果有待聚焦的节点，则平移到该节点并进入编辑模式
        if (this._nodeToFocus) {
            const nodeId = this._nodeToFocus;
            this._nodeToFocus = null;
            await this.updateComplete; // 等待渲染完成
            this.viewportManager.centerViewportOnNode(nodeId);
            const node = this.nodeEdit.findNode(nodeId);
            const nodeElement = this.g.querySelector(`.node[data-id="${nodeId}"]`);
            if (node && nodeElement) {
                this.nodeEdit.editNodeText(node, nodeElement);
            }
        }
        // 如果有待平移的节点，则仅平移到该节点
        else if (this._nodeToPan) {
            const nodeId = this._nodeToPan;
            this._nodeToPan = null;
            await this.updateComplete; // 等待渲染完成
            this.viewportManager.centerViewportOnNode(nodeId);
        }
    }

    /**
     * @method setupEventListeners
     * @description
     * 集中设置所有应用级别的事件监听器。
     * 这些监听器处理来自菜单、快捷键等的用户操作，并将其委托给相应的管理器处理。
     */
    setupEventListeners() {
        const nodeEdit = this.nodeEdit;
        const textManager = nodeEdit.nodeTextManager;

        // --- 节点操作事件 ---
        this.addEventListener('delete-node', (event) => (
            event.stopPropagation(), this.nodeEdit.deleteSelectedNode(), this.dispatchMindmapNodeChange()
        ));
        this.addEventListener('add-child-node', (event) => (
            event.stopPropagation(), this.nodeEdit.addNode(), this.dispatchMindmapNodeChange()
        ));
        this.addEventListener('add-sibling-node', (event) => (
            event.stopPropagation(), this.nodeEdit.addSibling(), this.dispatchMindmapNodeChange()
        ));

        // --- 剪贴板事件 ---
        this.addEventListener('copy-node', (event) => (
            event.stopPropagation(), nodeEdit.copyNode(), this.dispatchMindmapNodeChange()
        ));
        this.addEventListener('cut-node', (event) => (
            event.stopPropagation(), nodeEdit.cutNode(), this.dispatchMindmapNodeChange()
        ));
        this.addEventListener('paste-node', (event) => (
            event.stopPropagation(), nodeEdit.pasteNode(), this.dispatchMindmapNodeChange()
        ));

        // --- 历史记录事件 ---
        this.addEventListener('undo', (event) => (
            event.stopPropagation(), nodeEdit.undoNode(), this.dispatchMindmapNodeChange(), console.log('redoredoredo')
        ));
        this.addEventListener('redo', (event) => (
            event.stopPropagation(), nodeEdit.redoNode(), this.dispatchMindmapNodeChange(), console.log('redoredoredo')
        ));

        // --- 文本编辑事件 ---
        this.addEventListener('copy-text', (event) => (
            event.stopPropagation(), textManager.copy(nodeEdit.activeInput)
        ));
        this.addEventListener('cut-text', (event) => (
            event.stopPropagation(),
            textManager.cut(nodeEdit.activeInput),
            this.dispatchMindmapNodeChange()
        ));
        this.addEventListener('paste-text', (event) => (
            event.stopPropagation(),
            textManager.paste(nodeEdit.activeInput),
            this.dispatchMindmapNodeChange()
        ));
        this.addEventListener('undo-text', (event) => (
            event.stopPropagation(),
            textManager.undo(nodeEdit.activeInput),
            this.dispatchMindmapNodeChange()
        ));
        this.addEventListener('redo-text', (event) => (
            event.stopPropagation(),
            textManager.redo(nodeEdit.activeInput),
            this.dispatchMindmapNodeChange()
        ));

        // --- 全局键盘事件 ---
        window.addEventListener('keydown', this.handleKeyDown.bind(this));

        // 监听节点文本编辑框的 input 事件，以触发数据变更通知
        this.addEventListener('input', (e) => {
            if (e.composedPath()[0].classList.contains('node-text-div')) {
                this.dispatchMindmapNodeChange();
            }
        });
    }

    /**
     * @method dispatchMindmapNodeChange
     * @description
     * 使用防抖（debounce）来派发 'mindmap-node-change' 事件。
     * 这可以防止在用户快速输入或操作时频繁触发事件，从而提高性能。
     * 该事件通知父组件思维导图数据已发生变化。
     */
    dispatchMindmapNodeChange = debounce(
        () =>
            this.dispatch('mindmap-node-change', {
                mindMapData: this.mindMapData,
            }),
        300
    );

    /**
     * @method handleKeyDown
     * @description
     * 处理全局键盘快捷键。
     * @param {KeyboardEvent} e - 键盘事件对象。
     */
    handleKeyDown(e) {
        const isCommand = e.metaKey || e.ctrlKey;
        // 撤销/重做
        const isUndo = isCommand && e.key === 'z' && !e.shiftKey;
        const isRedo = (isCommand && e.key === 'z' && e.shiftKey) || (isCommand && e.key === 'y');
        if (isUndo || isRedo) {
            e.preventDefault();
            if (isUndo) this.nodeEdit.undoNode();
            if (isRedo) this.nodeEdit.redoNode();
            this.dispatchMindmapNodeChange();
            return;
        }

        // 剪贴板操作
        if (isCommand && ['c', 'x', 'v'].includes(e.key)) {
            e.preventDefault();
            if (e.key === 'c') this.nodeEdit.copyNode();
            if (e.key === 'x') this.nodeEdit.cutNode(), this.dispatchMindmapNodeChange();
            if (e.key === 'v') this.nodeEdit.pasteNode(), this.dispatchMindmapNodeChange();
            return;
        }

        // 按空格键进入编辑模式
        if (e.key === ' ') {
            if (
                this.selectedNodeId &&
                !this.isTextEditing &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
            ) {
                const node = this.nodeEdit.findNode(this.selectedNodeId);
                const nodeElement = this.g.querySelector(`.node[data-id="${this.selectedNodeId}"]`);
                if (node && nodeElement) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.nodeEdit.editNodeText(node, nodeElement);
                    return;
                }
            }
            this.isSpacePressed = true;
            e.preventDefault();
            return;
        }

        // 如果没有选中节点，按方向键默认选中根节点
        if (!this.selectedNodeId) {
            if (e.key.startsWith('Arrow')) {
                e.preventDefault();
                this.selectedNodeId = 'root';
                this._nodeToPan = 'root';
                this.requestUpdate();
            }
            return;
        }

        // --- 节点导航和操作 ---
        const selectedNode = this.nodeEdit.findNode(this.selectedNodeId);
        if (!selectedNode) return;

        let needsCentering = false;
        switch (e.key) {
            // Tab: 添加子节点
            case 'Tab':
                e.preventDefault();
                this.nodeEdit.addNode();
                this.dispatchMindmapNodeChange();
                break;
            // Enter: 添加兄弟节点
            case 'Enter':
                e.preventDefault();
                this.nodeEdit.addSibling();
                this.dispatchMindmapNodeChange();
                break;
            // Delete/Backspace: 删除节点
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.nodeEdit.deleteSelectedNode();
                this.dispatchMindmapNodeChange();
                break;
            // 方向键导航
            case 'ArrowUp':
            case 'ArrowDown': {
                e.preventDefault();
                const parent = this.nodeEdit.findParent(this.selectedNodeId);
                if (parent) {
                    const index = parent.children.findIndex((c) => c.id === this.selectedNodeId);
                    if (e.key === 'ArrowUp' && index > 0) {
                        this.selectedNodeId = parent.children[index - 1].id;
                        needsCentering = true;
                    } else if (e.key === 'ArrowDown' && index < parent.children.length - 1) {
                        this.selectedNodeId = parent.children[index + 1].id;
                        needsCentering = true;
                    }
                }
                break;
            }
            case 'ArrowLeft': {
                e.preventDefault();
                const parent = this.nodeEdit.findParent(this.selectedNodeId);
                if (parent) {
                    this.selectedNodeId = parent.id;
                    needsCentering = true;
                }
                break;
            }
            case 'ArrowRight': {
                e.preventDefault();
                if (selectedNode.children?.length > 0 && !selectedNode._collapsed) {
                    this.selectedNodeId = selectedNode.children[0].id;
                    needsCentering = true;
                }
                break;
            }
        }
        // 如果通过导航键切换了选中节点，则将视图平移到新节点上
        if (needsCentering) {
            this._nodeToPan = this.selectedNodeId;
            this.requestUpdate();
        }
    }

    /**
     * @method disconnectedCallback
     * @description
     * LitElement 的生命周期方法，当组件从 DOM 中移除时调用。
     * 用于清理事件监听器，防止内存泄漏。
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this._boundHandleResize);
        this.longPressManager.unbindAll();
    }

    /**
     * @method _applySystemTheme
     * @description
     * 应用系统的配色方案（深色或浅色）。
     * 它检查 `prefers-color-scheme` 媒体查询，并相应地设置 `<html>` 元素上的 `data-theme` 属性。
     */
    _applySystemTheme() {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    /**
     * @method handleThemeChange
     * @description
     * 处理主题切换的逻辑。
     * @param {string} theme - 新的主题名称 ('system', 'light', 或 'dark')。
     */
    handleThemeChange(theme) {
        // 如果之前在监听系统主题变化，先移除监听器
        if (this.themeMediaQuery) {
            this.themeMediaQuery.removeEventListener('change', this._boundApplySystemTheme);
            this.themeMediaQuery = null;
        }

        if (theme === 'system') {
            // 如果是系统主题，则添加监听器以自动响应系统变化
            this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.themeMediaQuery.addEventListener('change', this._boundApplySystemTheme);
            this._applySystemTheme(); // 立即应用一次
        } else {
            // 否则，直接设置指定的主题
            document.documentElement.setAttribute('data-theme', theme);
        }
        this.currentTheme = theme;
    }

    /**
     * @method handleContextMenu
     * @description
     * 处理 'mindmap-context-menu' 事件，负责打开右键菜单。
     * @param {CustomEvent} e - 包含菜单位置 {x, y} 和目标节点 ID {nodeId} 的事件对象。
     */
    async handleContextMenu(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const { x, y, nodeId } = e.detail;

        // 1. 判断上下文（节点、画布、文本编辑），并获取相应的状态（如能否撤销/粘贴）
        const contextMenuType = nodeId ? 'node' : 'canvas';
        let canUndo = false,
            canRedo = false,
            canPaste = false;
        if (this.isTextEditing && this.nodeEdit.activeInput) {
            const historyState = this.nodeEdit.nodeTextManager.getHistoryState(
                this.nodeEdit.activeInput
            );
            canUndo = historyState.canUndo;
            canRedo = historyState.canRedo;
            canPaste = await this.nodeEdit.nodeTextManager.canPaste();
        } else {
            canUndo = this.nodeEdit.nodeHistory.canUndo();
            canRedo = this.nodeEdit.nodeHistory.canRedo();
            canPaste = !!this.nodeEdit.clipboard?.data;
        }

        // 2. 根据上下文，从工厂函数获取菜单项列表
        this.contextMenuItems = getContextMenuItems(
            T,
            contextMenuType,
            nodeId,
            this.isTextEditing,
            canUndo,
            canRedo,
            canPaste
        );

        // 3. 调用右键菜单组件的 open 方法来显示菜单
        this.contextMenuElement.open(x, y);
        this.isContextMenuOpen = true;

        // 4. 添加一个临时的全局监听器，用于处理“点击外部关闭菜单”
        window.addEventListener('pointerdown', this._boundHandlePointerDownOutside, {
            capture: true,
        });
    }

    /**
     * @method _handlePointerDownOutside
     * @description
     * 当右键菜单打开时，作为 window 的 pointerdown 事件监听器。
     * 检查点击是否发生在菜单外部，如果是，则关闭菜单。
     * @param {PointerEvent} e
     */
    _handlePointerDownOutside(e) {
        if (this.contextMenuElement && !e.composedPath().includes(this.contextMenuElement)) {
            this.contextMenuElement.close();
        }
    }

    /**
     * @method handleViewportChanged
     * @description
     * 监听由 ViewportManager 派发的 'viewport-changed' 事件。
     * 当画布平移或缩放时，关闭右键菜单并刷新小地图。
     */
    handleViewportChanged() {
        if (this.isContextMenuOpen) {
            this.contextMenuElement.close();
        }
    }

    /**
     * @method handleContextMenuClosed
     * @description
     * 监听由右键菜单组件派发的 'context-menu-closed' 事件，用于清理状态。
     */
    handleContextMenuClosed() {
        this.isContextMenuOpen = false;
        window.removeEventListener('pointerdown', this._boundHandlePointerDownOutside, {
            capture: true,
        });
    }

    /**
     * @method handleResize
     * @description
     * 处理窗口大小变化事件。
     * 重新计算节点布局并更新视口，以保持画布内容居中。
     */
    handleResize() {
        if (this.mindMapData === null) return;
        const oldPanX = this.viewState.panX;
        const oldPanY = this.viewState.panY;
        const oldScale = this.viewState.scale;
        const oldSvgWidth = this.viewState.svgWidth;
        const oldSvgHeight = this.viewState.svgHeight;

        // 更新视口尺寸
        this.viewportManager.updateView();

        const newSvgWidth = this.viewState.svgWidth;
        const newSvgHeight = this.viewState.svgHeight;

        // 计算内容中心点在缩放前的坐标
        const centerX_content = (oldSvgWidth / 2 - oldPanX) / oldScale;
        const centerY_content = (oldSvgHeight / 2 - oldPanY) / oldScale;

        // 计算新的平移值，以保持内容中心点在屏幕上的位置不变
        const newPanX = newSvgWidth / 2 - centerX_content * oldScale;
        const newPanY = newSvgHeight / 2 - centerY_content * oldScale;

        // 应用新的平移值
        this.viewportManager.setView({ panX: newPanX, panY: newPanY });

        // 重新计算布局并渲染
        this.updateMindmap();
    }

    /**
     * @method updateMindmap
     * @description
     * 思维导图的主更新流程。这是一个核心方法，协调了多个步骤：
     * 1. 测量每个节点的文本大小以确定其尺寸。
     * 2. 使用布局管理器计算所有节点的位置。
     * 3. 更新搜索高亮状态。
     * 4. 将新的思维导图状态保存到历史记录中，以支持撤销/重做。
     * 5. 触发组件的重新渲染。
     */
    updateMindmap() {
        if (!this.mindMapData) {
            console.warn(
                'updateMindmap called with null or undefined mindMapData. Aborting update.'
            );
            return;
        }

        // 遍历并测量所有节点
        const traverseAndMeasure = (node) => {
            if (node.text && node.text.trim()) {
                const textMetrics = this.renderer.measureText(node.text, node);
                node.width = textMetrics.width + 2 * this.NODE_PADDING_X;
                node.height = textMetrics.height + 2 * this.NODE_PADDING_Y;
            } else {
                // 对于空文本节点，给一个默认大小
                const textMetrics = this.renderer.measureText('M', node);
                node.height = textMetrics.height + 2 * this.NODE_PADDING_Y;
                node.width = node.height;
            }

            if (node.children) node.children.forEach(traverseAndMeasure);
        };
        traverseAndMeasure(this.mindMapData);

        // 自动布局
        this.layoutManager.autoLayout(this.mindMapData);
        // 更新高亮
        this._updateHighlight();
        // 深拷贝数据以确保状态不可变，然后保存到历史记录
        this.mindMapData = JSON.parse(JSON.stringify(this.mindMapData));
        this.nodeEdit.nodeHistory.addState({
            data: this.mindMapData,
            selectedNodeId: this.selectedNodeId,
        });
    }

    /**
     * @method getMindMapRawData
     * @description
     * 获取可保存的思维导图原始数据（JSON 字符串格式）。
     * @param {boolean} [recordPan=false] - 是否在元数据中记录平移位置。
     * @returns {string}
     */
    getMindMapRawData(recordPan = false) {
        return JSON.stringify(this.importExport.getSavableData(recordPan));
    }

    /**
     * @method clearMindmap
     * @description
     * 清空 SVG 画布和所有相关状态，重置思维导图。
     * 供外部调用（例如，从主组件）。
     */
    clearMindmap() {
        while (this.g.firstChild) {
            this.g.removeChild(this.g.firstChild);
        }
        this.mindMapData = null;
        this.selectedNodeId = null;
        this.highlightedNodeIds = new Set();
        this.nodeEdit.nodeHistory.clear();
        this.isRootNodeModified = false;
        this.viewState.panX = 0;
        this.viewState.panY = 0;
    }

    /**
     * @method newMindmap
     * @description
     * 创建一个新的、空的思维导图。
     * 供外部调用。
     */
    async newMindmap() {
        this.clearMindmap();

        // 重置为初始数据结构
        this.mindMapData = {
            id: 'root',
            text: await ReactiveT(
                'Central Topic',
                (value) => {
                    this.mindMapData.text = value;
                    this.updateMindmap();
                },
                () => this.isRootNodeModified
            ),
            children: [],
        };
        this.mindMapData.x = this.svg.clientWidth / 2;
        this.mindMapData.y = this.svg.clientHeight / 2;

        this.updateMindmap();
        this.viewportManager.centerViewportOnNode('root');
        this.dispatchMindmapNodeChange();
    }

    /**
     * @method traverse
     * @description
     * 一个通用的树遍历工具函数。
     * @param {object} node - 开始遍历的节点。
     * @param {function} callback - 对每个节点执行的回调函数。
     */
    traverse(node, callback) {
        if (!node) return;
        callback(node);
        if (node.children) {
            node.children.forEach((child) => this.traverse(child, callback));
        }
    }

    /**
     * @method _updateHighlight
     * @description
     * 根据当前的搜索词（`this.searchTerm`）更新需要高亮的节点 ID 集合。
     */
    _updateHighlight() {
        if (!this.searchTerm) {
            if (this.highlightedNodeIds.size > 0) {
                this.highlightedNodeIds = new Set();
            }
            return;
        }

        const newHighlightedNodeIds = new Set();
        const searchText = this.searchTerm.trim().toLowerCase();

        if (searchText) {
            const traverse = (node) => {
                if (node.text && node.text.toLowerCase().includes(searchText)) {
                    newHighlightedNodeIds.add(node.id);
                }
                if (node.children) {
                    node.children.forEach(traverse);
                }
            };
            traverse(this.mindMapData);
        }

        this.highlightedNodeIds = newHighlightedNodeIds;
    }

    /**
     * @method highlightNodesByText
     * @description
     * 设置搜索词并触发高亮更新。
     * 供外部（如搜索组件）调用。
     * @param {string} text - 搜索的文本。
     */
    highlightNodesByText(text) {
        this.searchTerm = text;
        this._updateHighlight();
        this.renderer.render();
    }

    /**
     * @method render
     * @description
     * LitElement 的 render 方法，负责渲染组件的 DOM 结构。
     * @returns {TemplateResult}
     */
    render() {
        return html`
            <svg id="MindmapSVG"></svg>
            <mindmap-context-menu
                .menuItems=${this.contextMenuItems}
                @context-menu-closed=${this.handleContextMenuClosed}
            ></mindmap-context-menu>
            <node-quick-menu
                .selectedNodeId=${this.selectedNodeId}
                ?hidden=${!this.isTouch}
            ></node-quick-menu>
        `;
    }
}

// 注册自定义元素，使其可以在 HTML 中使用 <mindmap-view> 标签
customElements.define('mindmap-view', MindmapView);
