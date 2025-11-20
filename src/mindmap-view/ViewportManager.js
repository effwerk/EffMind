/**
 * @class ViewportManager
 * @description 管理思维导图视口（pan/zoom/动画），提供平移、缩放和节点居中等操作。
 */
export default class ViewportManager {
    /**
     * @param {MindmapView} mindmapView - 主思维导图视图引用。
     */
    constructor(mindmapView) {
        this.mindmapView = mindmapView;
        this.isAnimating = false;

        this.animationFrameId = null;

        /** @property {Object} targetState - 动画目标状态，用于平滑过渡 */
        this.targetState = {
            scale: this.mindmapView.viewState.scale,
            panX: this.mindmapView.viewState.panX,
            panY: this.mindmapView.viewState.panY,
        };
    }

    /**
     * @method stopAnimation
     * @description 停止所有正在进行的平滑动画。
     */
    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isAnimating = false;
    }

    /**
     * @method updateView
     * @description 根据 viewState 更新 SVG transform 属性并派发 'viewport-changed' 事件。
     */
    updateView() {
        if (!this.mindmapView.g) return;
        if (this.mindmapView.g.style.willChange !== 'transform') {
            this.mindmapView.g.style.willChange = 'transform';
        }
        this.mindmapView.viewState.svgWidth = this.mindmapView.svg.clientWidth;
        this.mindmapView.viewState.svgHeight = this.mindmapView.svg.clientHeight;
        this.mindmapView.g.setAttribute(
            'transform',
            `translate(${this.mindmapView.viewState.panX}, ${this.mindmapView.viewState.panY}) scale(${this.mindmapView.viewState.scale})`
        );
        this.mindmapView.dispatch('viewport-changed');
    }

    /**
     * @method setView
     * @description 直接设置视口状态（panX/panY/scale），不平滑。
     * @param {Object} newView - 新视口状态
     * @param {number} [newView.panX] - 水平平移
     * @param {number} [newView.panY] - 垂直平移
     * @param {number} [newView.scale] - 缩放比例
     */
    setView(newView) {
        this.mindmapView.viewState.panX = newView.panX ?? this.mindmapView.viewState.panX;
        this.mindmapView.viewState.panY = newView.panY ?? this.mindmapView.viewState.panY;
        this.mindmapView.viewState.scale = newView.scale ?? this.mindmapView.viewState.scale;
        this.updateView();
    }

    /**
     * @method smoothlyUpdateView
     * @description 平滑更新视口到 targetState。
     * @param {number} [lerpFactor=0.5] - 每帧插值系数
     */
    smoothlyUpdateView(lerpFactor = 0.5) {
        this.stopAnimation(); // 开始新的动画前，先停止旧的
        this.isAnimating = true;

        const animate = () => {
            const currentState = this.mindmapView.viewState;
            const { scale, panX, panY } = currentState;
            const { scale: targetScale, panX: targetPanX, panY: targetPanY } = this.targetState;

            const newScale = scale + (targetScale - scale) * lerpFactor;
            const newPanX = panX + (targetPanX - panX) * lerpFactor;
            const newPanY = panY + (targetPanY - panY) * lerpFactor;

            this.setView({ panX: newPanX, panY: newPanY, scale: newScale });

            const distance = Math.hypot(
                targetScale - newScale,
                targetPanX - newPanX,
                targetPanY - newPanY
            );

            if (distance > 0.01) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.setView(this.targetState);
                this.isAnimating = false;
                this.animationFrameId = null;
            }
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * @method panToNode
     * @description 平移视口以将指定节点居中（使用 visualViewport 适配虚拟键盘）。
     * @param {string} nodeId - 节点 ID
     */
    centerViewportOnNode(nodeId) {
        this.panViewportToNode(nodeId, 0, 0);
    }

    /**
     * @method panToNodeWithOffset
     * @description 将节点平移到画布中心并应用数值偏移。
     * @param {string} nodeId
     * @param {number} [offsetX=0]
     * @param {number} [offsetY=0]
     */
    panToNodeWithOffset(nodeId, offsetX = 0, offsetY = 0) {
        const node = this.mindmapView.nodeEdit.findNode(nodeId);
        if (!node) return;
        this.targetState.panX =
            this.mindmapView.svg.clientWidth / 2 -
            node.x * this.mindmapView.viewState.scale +
            offsetX;
        this.targetState.panY =
            this.mindmapView.svg.clientHeight / 2 -
            node.y * this.mindmapView.viewState.scale +
            offsetY;
        this.smoothlyUpdateView(0.2);
    }

    /**
     * @method panViewportToNode
     * @description 将视口平移到指定节点，使节点居中，可加偏移
     * @param {string} nodeId - 节点 ID
     * @param {number} [offsetX=0] - 水平偏移量（像素）
     * @param {number} [offsetY=0] - 垂直偏移量（像素）
     * @param {number} [lerpFactor=0.2] - 每帧插值系数
     */
    panViewportToNode(nodeId, offsetX = 0, offsetY = 0, lerpFactor = 0.2) {
        const node = this.mindmapView.nodeEdit.findNode(nodeId);
        if (!node) return;

        const { clientWidth: svgWidth, clientHeight: svgHeight } = this.mindmapView.svg;
        const scale = this.mindmapView.viewState.scale;

        // 计算将节点移动到画布中心的偏移
        const panX = svgWidth / 2 - node.x * scale + offsetX;
        const panY = svgHeight / 2 - node.y * scale + offsetY;

        this.targetState.panX = panX;
        this.targetState.panY = panY;

        this.smoothlyUpdateView(lerpFactor);
    }

    /**
     * @method getPanForNode
     * @description 获取节点当前平移值与画布中心对齐时平移值的差值
     * @param {string} nodeId - 节点 ID
     * @returns {{x:number, y:number}|null}
     */
    getPanForNode(nodeId) {
        const node = this.mindmapView.nodeEdit.findNode(nodeId);
        if (!node) return null;

        const { clientWidth: svgWidth, clientHeight: svgHeight } = this.mindmapView.svg;
        const { scale, panX, panY } = this.mindmapView.viewState;

        const centeringPanX = svgWidth / 2 - node.x * scale;
        const centeringPanY = svgHeight / 2 - node.y * scale;

        return {
            x: panX - centeringPanX,
            y: panY - centeringPanY,
        };
    }

    /**
     * @method calculateFullContentBounds
     * @description 计算整张思维导图内容的边界。
     * @param {Object} [data] - 起始节点
     * @param {boolean} [forceTraverseAll=false] - 是否忽略折叠状态
     * @returns {{x:number,y:number,width:number,height:number}}
     */
    calculateFullContentBounds(data, forceTraverseAll = false) {
        data = data || this.mindmapView.mindMapData;
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        const traverse = (node) => {
            if (!node || node.width === undefined) return;
            const nodeMinX = node.x - node.width / 2,
                nodeMaxX = node.x + node.width / 2;
            const nodeMinY = node.y - node.height / 2,
                nodeMaxY = node.y + node.height / 2;
            minX = Math.min(minX, nodeMinX);
            maxX = Math.max(maxX, nodeMaxX);
            minY = Math.min(minY, nodeMinY);
            maxY = Math.max(maxY, nodeMaxY);
            if (node.children && (forceTraverseAll || !node._collapsed)) {
                node.children.forEach(traverse);
            }
        };
        traverse(data);

        return minX === Infinity
            ? { x: 0, y: 0, width: 0, height: 0 }
            : { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    /**
     * @method setScale
     * @description 缩放视口，并保持缩放中心在画布中心。
     * @param {number} newScale
     */
    setScale(newScale) {
        const { scale, panX, panY, maxScale, minScale } = this.mindmapView.viewState;
        const clampedNewScale = Math.max(minScale, Math.min(maxScale, newScale));

        if (clampedNewScale === scale) return;

        const zoomFactor = clampedNewScale / scale;
        const { clientWidth, clientHeight } = this.mindmapView.svg;

        this.targetState.panX = panX * zoomFactor + (clientWidth / 2) * (1 - zoomFactor);
        this.targetState.panY = panY * zoomFactor + (clientHeight / 2) * (1 - zoomFactor);
        this.targetState.scale = clampedNewScale;

        this.smoothlyUpdateView();
    }

    /** 缩放放大 */
    zoomIn() {
        this.setScale(this.mindmapView.viewState.scale * 1.25);
    }

    /** 缩放缩小 */
    zoomOut() {
        this.setScale(this.mindmapView.viewState.scale / 1.25);
    }

    /** 重置缩放到 1 */
    resetView() {
        this.setScale(1);
    }

    /**
     * @method handlePinch
     * @description 处理多指捏合缩放手势。
     * @param {number} startDist - 开始距离
     * @param {number} currentDist - 当前距离
     * @param {number} startScale - 初始缩放
     * @param {Object} startPan - 初始平移 {x, y}
     * @param {Object} startCenter - 初始手势中心 {x, y}
     * @param {Object} currentCenter - 当前手势中心 {x, y}
     */
    handlePinch(startDist, currentDist, startScale, startPan, startCenter, currentCenter) {
        const { maxScale, minScale } = this.mindmapView.viewState;
        const svgRect = this.mindmapView.svg.getBoundingClientRect();

        const scaleFactor = currentDist / startDist;
        const newScale = startScale * scaleFactor;
        const clampedNewScale = Math.min(maxScale, Math.max(minScale, newScale));

        const anchorX = startCenter.x - svgRect.left;
        const anchorY = startCenter.y - svgRect.top;

        const zoomRatio = clampedNewScale / startScale;
        const panXFromZoom = anchorX - (anchorX - startPan.x) * zoomRatio;
        const panYFromZoom = anchorY - (anchorY - startPan.y) * zoomRatio;

        const panDeltaX = currentCenter.x - startCenter.x;
        const panDeltaY = currentCenter.y - startCenter.y;

        this.targetState.panX = panXFromZoom + panDeltaX;
        this.targetState.panY = panYFromZoom + panDeltaY;
        this.targetState.scale = clampedNewScale;

        this.smoothlyUpdateView();
    }

    /**
     * @method zoomAtPoint
     * @description 以指定画布点为锚点进行缩放。
     * @param {number} newScale
     * @param {number} anchorX
     * @param {number} anchorY
     */
    zoomAtPoint(newScale, anchorX, anchorY) {
        const { scale, panX, panY, maxScale, minScale } = this.mindmapView.viewState;
        const clampedNewScale = Math.max(minScale, Math.min(maxScale, newScale));
        if (Math.abs(clampedNewScale - scale) < 0.00001) return;

        const zoom = clampedNewScale / scale;
        this.targetState.panX = anchorX - (anchorX - panX) * zoom;
        this.targetState.panY = anchorY - (anchorY - panY) * zoom;
        this.targetState.scale = clampedNewScale;

        this.smoothlyUpdateView();
    }

    /**
     * @method getNodeBoundingClientRect
     * @description 获取节点原始的BoundingClientRect
     * @param {string} nodeId - 节点 ID
     * @returns DOMRect
     */
    getNodeBoundingClientRect(nodeId) {
        const node = this.mindmapView.svg.querySelector(`g[data-id="${nodeId}"]`);
        if (!node) return null;
        return node.getBoundingClientRect();
    }
}
