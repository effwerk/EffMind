import { html, css, svg } from './common/lit.js';
import MindmapBaseElement from './common/MindmapBaseElement.js';
import ComponentAPI from './common/ComponentAPI.js';
import { preventDoubleTapZoom } from './common/Utils.js';

class MindmapMinimap extends MindmapBaseElement {
    static styles = css`
        :host {
            position: absolute;
            bottom: 15px;
            left: 15px;
            width: 200px;
            height: 150px;
            border: 1px solid var(--minimap-border-color);
            border-radius: 8px;
            background-color: var(--minimap-bg-color);
            box-shadow: var(--minimap-shadow);
            z-index: 20;
            overflow: hidden;
            touch-action: none;
            display: block;
        }
        :host([hidden]) {
            display: none;
        }
        #minimap-svg {
            width: 100%;
            height: 100%;
        }
        .minimap-node {
            fill: var(--minimap-node-fill);
            stroke: var(--minimap-node-stroke);
            stroke-width: 0.5;
        }
        .minimap-node.root {
            fill: var(--minimap-node-root-fill);
        }
        .minimap-node.selected {
            fill: var(--minimap-node-selected-fill);
            stroke: var(--minimap-node-selected-stroke);
        }
        .minimap-node.highlight {
            fill: var(--minimap-node-highlight-fill);
        }
        .minimap-link {
            fill: none;
            stroke: var(--minimap-link-stroke);
            stroke-width: 0.5;
        }
        .minimap-viewport {
            fill: var(--minimap-viewport-fill);
            stroke: var(--minimap-viewport-stroke);
            stroke-width: 1;
            cursor: grab;
        }
        .minimap-viewport:active {
            cursor: grabbing;
        }
    `;

    static properties = {
        // 对主思维导图视图组件的引用
        mindmapView: { type: Object },
        // 如果为 true，则在小地图中拖动视口可以超出小地图边界
        isGlobalDrag: { type: Boolean },
        // 存储用于渲染小地图的缩放和偏移信息
        _transformInfo: { state: true },
        hidden: { type: Boolean },
    };

    constructor() {
        super();
        this._isDragging = false;
        this._transformInfo = { scale: 1, offsetX: 0, offsetY: 0 };

        this.isGlobalDrag = true;
        this.mindmapView = null;
        this.pointerDownStartX = 0;
        this.pointerDownStartY = 0;

        this.boundDragMove = this.handleDragMove.bind(this);
        this.boundDragEnd = this.handleDragEnd.bind(this);

        // 添加组件API
        // ComponentAPI.on(this, 'minimap:isGlobalDrag', () => this.isGlobalDrag);
        // ComponentAPI.observeProperty(this, 'minimap:isGlobalDrag', ['isGlobalDrag']);
        ComponentAPI.on(this, 'minimap:isGlobalDrag', () => this.isGlobalDrag, ['isGlobalDrag']);
    }

    firstUpdated() {
        super.firstUpdated();
        preventDoubleTapZoom(this);
    }

    /**
     * @method disconnectedCallback
     * @description LitElement 生命周期方法。当元素从 DOM 中移除时调用。
     * 清理事件监听器。
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // 清理组件API
        ComponentAPI.cleanup(this);
        window.removeEventListener('pointermove', this.boundDragMove);
        window.removeEventListener('pointerup', this.boundDragEnd);
    }

    updated(changedProps) {
        super.updated(changedProps);
        if (changedProps.has('hidden') && !this.hidden) {
            this.requestUpdate();
        }
    }

    /**
     * @method render
     * @description 渲染小地图 SVG。
     * @returns {TemplateResult} 小地图的 HTML 模板。
     */
    render() {
        if (
            !this.mindmapView ||
            !this.mindmapView.mindMapData ||
            !this.mindmapView.viewState ||
            !this.mindmapView.viewportManager
        ) {
            return html`<svg id="minimap-svg"></svg>`;
        }

        const contentBounds = this.mindmapView.viewportManager.calculateFullContentBounds();
        if (contentBounds.width === 0) {
            return html`<svg id="minimap-svg"></svg>`;
        }

        const minimapWidth = this.clientWidth;
        const minimapHeight = this.clientHeight;

        // 如果是初始的根节点，则放大内容以获得更好的可见性
        const isInitialRoot =
            this.mindmapView.mindMapData.id === 'root' &&
            (!this.mindmapView.mindMapData.children ||
                this.mindmapView.mindMapData.children.length === 0);
        let finalContentBounds = contentBounds;
        if (isInitialRoot) {
            const zoomFactor = 3;
            const newWidth = contentBounds.width * zoomFactor;
            const newHeight = contentBounds.height * zoomFactor;
            finalContentBounds = {
                width: newWidth,
                height: newHeight,
                x: contentBounds.x - (newWidth - contentBounds.width) / 2,
                y: contentBounds.y - (newHeight - contentBounds.height) / 2,
            };
        }

        // 计算缩放和平移以使内容在小地图中居中
        const scale =
            Math.min(
                minimapWidth / finalContentBounds.width,
                minimapHeight / finalContentBounds.height
            ) * 0.9;
        const offsetX =
            (minimapWidth - finalContentBounds.width * scale) / 2 - finalContentBounds.x * scale;
        const offsetY =
            (minimapHeight - finalContentBounds.height * scale) / 2 - finalContentBounds.y * scale;
        this._transformInfo = { scale, offsetX, offsetY };

        // 遍历思维导图数据以获取所有节点和链接
        const allNodes = [];
        const allLinks = [];
        const traverse = (node) => {
            allNodes.push(node);
            if (node.children && !node._collapsed) {
                node.children.forEach((child) => {
                    allLinks.push({ source: node, target: child });
                    traverse(child);
                });
            }
        };
        traverse(this.mindmapView.mindMapData);

        // 计算主视图的视口矩形
        const { viewState } = this.mindmapView;
        const viewportWidth = viewState.svgWidth / viewState.scale;
        const viewportHeight = viewState.svgHeight / viewState.scale;
        const viewportX = -viewState.panX / viewState.scale;
        const viewportY = -viewState.panY / viewState.scale;

        return html`
            <svg
                id="minimap-svg"
                @pointerdown=${this.handleMinimapPointerDown}
                @pointerup=${this.handleMinimapPointerUp}
                @pointerleave=${this.handlePointerLeaveMinimap}
            >
                ${svg`
                    <g id="minimap-g" transform="translate(${offsetX}, ${offsetY}) scale(${scale})">
                        ${allLinks.map(
                            (link) =>
                                svg`<path class="minimap-link" d="M${link.source.x},${link.source.y} L${link.target.x},${link.target.y}"></path>`
                        )}
                        ${allNodes.map((node) => {
                            // 仅当画布尺寸有效时才执行拖动节点的可见性检查
                            if (viewState.svgWidth > 0 && viewState.svgHeight > 0) {
                                const isDraggedNode =
                                    this.mindmapView.interactionState &&
                                    node.id === this.mindmapView.interactionState.draggedNodeId;

                                if (isDraggedNode) {
                                    const nodeLeft = node.x - node.width / 2;
                                    const nodeRight = node.x + node.width / 2;
                                    const nodeTop = node.y - node.height / 2;
                                    const nodeBottom = node.y + node.height / 2;

                                    const viewLeft = viewportX;
                                    const viewRight = viewportX + viewportWidth;
                                    const viewTop = viewportY;
                                    const viewBottom = viewportY + viewportHeight;

                                    const isIntersecting =
                                        nodeLeft < viewRight &&
                                        nodeRight > viewLeft &&
                                        nodeTop < viewBottom &&
                                        nodeBottom > viewTop;

                                    if (!isIntersecting) {
                                        return svg``; // 如果被拖动且在视口外，则不渲染
                                    }
                                }
                            }

                            return svg`
                            <rect
                                data-id=${node.id}
                                class="minimap-node ${node.id === 'root' ? 'root' : ''} ${
                                node.id === this.mindmapView.selectedNodeId ? 'selected' : ''
                            } ${
                                this.mindmapView.highlightedNodeIds.has(node.id) ? 'highlight' : ''
                            }"
                                x=${node.x - node.width / 2}
                                y=${node.y - node.height / 2}
                                width=${node.width}
                                height=${node.height}
                            ></rect>
                        `;
                        })}
                        <rect
                            class="minimap-viewport"
                            x=${viewportX}
                            y=${viewportY}
                            width=${viewportWidth}
                            height=${viewportHeight}
                            @pointerdown=${this.handleDragStart}
                        ></rect>
                    </g>
                `}
            </svg>
        `;
    }

    /**
     * @method handleDragStart
     * @description 启动视口矩形的拖动。
     * @param {PointerEvent} e - 指针按下事件。
     */
    handleDragStart(e) {
        if (e.button !== 0) return;
        e.stopPropagation();
        this._isDragging = true;
        const viewportRect = this.shadowRoot.querySelector('.minimap-viewport');
        viewportRect.style.cursor = 'grabbing';
        const rect = viewportRect.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        if (this.isGlobalDrag) {
            viewportRect.setPointerCapture(e.pointerId);
        }
        window.addEventListener('pointermove', this.boundDragMove);
        window.addEventListener('pointerup', this.boundDragEnd, { once: true });
    }

    /**
     * @method handleDragMove
     * @description 在拖动过程中处理视口矩形的移动。
     * @param {PointerEvent} e - 指针移动事件。
     */
    handleDragMove(e) {
        if (!this._isDragging || !this.mindmapView.viewState) return;
        e.preventDefault();
        const { scale, offsetX, offsetY } = this._transformInfo;
        const minimapSvgRect = this.shadowRoot
            .getElementById('minimap-svg')
            .getBoundingClientRect();
        const currentMinimapMouseX = e.clientX - minimapSvgRect.left;
        const currentMinimapMouseY = e.clientY - minimapSvgRect.top;

        const newViewportXInMinimapContent =
            (currentMinimapMouseX - this.dragOffsetX - offsetX) / scale;
        const newViewportYInMinimapContent =
            (currentMinimapMouseY - this.dragOffsetY - offsetY) / scale;

        const newPanX = -newViewportXInMinimapContent * this.mindmapView.viewState.scale;
        const newPanY = -newViewportYInMinimapContent * this.mindmapView.viewState.scale;

        this.mindmapView.viewportManager.setView({ panX: newPanX, panY: newPanY });
    }

    /**
     * @method handleDragEnd
     * @description 结束视口矩形的拖动。
     * @param {PointerEvent} e - 指针抬起事件。
     */
    handleDragEnd(e) {
        if (!this._isDragging) return;
        const viewportRect = this.shadowRoot.querySelector('.minimap-viewport');
        if (this.isGlobalDrag && viewportRect.hasPointerCapture(e.pointerId)) {
            viewportRect.releasePointerCapture(e.pointerId);
        }
        this._isDragging = false;
        viewportRect.style.cursor = 'grab';
        window.removeEventListener('pointermove', this.boundDragMove);
    }

    /**
     * @method handlePointerLeaveMinimap
     * @description 处理指针离开小地图区域的事件。
     * @param {PointerEvent} e - 指针离开事件。
     */
    handlePointerLeaveMinimap(e) {
        if (this._isDragging && !this.isGlobalDrag) {
            this.handleDragEnd(e);
        }
    }

    /**
     * @method handleMinimapPointerDown
     * @description 记录小地图上指针按下事件的起始位置。
     * @param {PointerEvent} e - 指针按下事件。
     */
    handleMinimapPointerDown(e) {
        if (e.button !== 0) return;
        this.pointerDownStartX = e.clientX;
        this.pointerDownStartY = e.clientY;
    }

    /**
     * @method handleMinimapPointerUp
     * @description 处理小地图上的指针抬起事件。
     * 如果是单击（而不是拖动），则将主视图平移到单击的位置。
     * @param {PointerEvent} e - 指针抬起事件。
     */
    handleMinimapPointerUp(e) {
        const dx = Math.abs(e.clientX - this.pointerDownStartX);
        const dy = Math.abs(e.clientY - this.pointerDownStartY);
        if (this._isDragging || dx > 5 || dy > 5) {
            this.handleDragEnd(e);
            return;
        }
        if (!this.mindmapView.viewState) return;

        const minimapSvgRect = this.shadowRoot
            .getElementById('minimap-svg')
            .getBoundingClientRect();
        const clickX = e.clientX - minimapSvgRect.left;
        const clickY = e.clientY - minimapSvgRect.top;
        const { scale, offsetX, offsetY } = this._transformInfo;
        const contentX = (clickX - offsetX) / scale;
        const contentY = (clickY - offsetY) / scale;

        const newPanX =
            this.mindmapView.viewState.svgWidth / 2 - contentX * this.mindmapView.viewState.scale;
        const newPanY =
            this.mindmapView.viewState.svgHeight / 2 - contentY * this.mindmapView.viewState.scale;

        this.mindmapView.viewportManager.setView({ panX: newPanX, panY: newPanY });
    }
}

customElements.define('mindmap-minimap', MindmapMinimap);
