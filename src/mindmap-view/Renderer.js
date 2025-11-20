/**
 * @class Renderer
 * @description 负责将思维导图节点和链接渲染到 SVG 画布上。
 */
export default class Renderer {
    /**
     * @param {MindmapView} mindmapView - 对主思维导图视图组件的引用。
     */
    constructor(mindmapView) {
        this.mindmapView = mindmapView;
    }

    /**
     * @property {SVGGElement} g - 用于渲染思维导图的主 SVG 组元素的 getter。
     */
    get g() {
        return this.mindmapView.g;
    }

    /**
     * @method render
     * @description 执行思维导图的完全重新渲染，清除画布并绘制所有链接和节点。
     */
    render() {
        if (!this.g || !this.mindmapView.mindMapData) return;
        this.g.innerHTML = '';
        this.renderLinks();
        this._renderNodes();
        // this.mindmapView.viewportManager.updateView();
    }

    /**
     * @method removeLinks
     * @description 从 SVG 中删除所有链接元素。
     */
    removeLinks() {
        this.g.querySelectorAll('.link').forEach(l => l.remove());
    }

    /**
     * @method renderLinks
     * @description 渲染节点之间的链接（曲线）。
     */
    renderLinks() {
        const links = [];
        const traverseForLinks = (node) => {
            if (node.children && !node._collapsed) {
                node.children.forEach(child => {
                    // 在拖动并有潜在父节点时，不渲染到旧父节点的链接
                    if (!(child.id === this.mindmapView.interactionState.draggedNodeId && this.mindmapView.interactionState.potentialParentId)) {
                        links.push({ source: node, target: child });
                    }
                    traverseForLinks(child);
                });
            }
        };
        traverseForLinks(this.mindmapView.mindMapData);

        links.forEach(link => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'link');
            const sourceX = link.source.x + link.source.width / 2;
            const sourceY = link.source.y;
            const targetX = link.target.x - link.target.width / 2;
            const targetY = link.target.y;

            let d;
            // 根据当前曲线类型生成路径数据
            switch (this.mindmapView.currentCurveType) {
                case 'straight': d = `M${sourceX},${sourceY} L${targetX},${targetY}`; break;
                case 'quadratic_mid_y_offset':
                    const midX_qmy = (sourceX + targetX) / 2;
                    let controlY_qmy = (sourceY + targetY) / 2 + (targetY > sourceY ? 30 : -30);
                    d = `M${sourceX},${sourceY} Q${midX_qmy},${controlY_qmy} ${targetX},${targetY}`; break;
                case 'cubic_original_horizontal':
                    const c_offset = 60;
                    d = `M${sourceX},${sourceY} C${sourceX + c_offset},${sourceY} ${targetX - c_offset},${targetY} ${targetX},${targetY}`; break;
                default: // 'cubic_smooth_s'
                    const hbf = 0.4, vbf = 0.5;
                    const midX = (sourceX + targetX) / 2, midY = (sourceY + targetY) / 2;
                    const c1x = sourceX + (targetX - sourceX) * hbf, c1y = sourceY + (midY - sourceY) * vbf;
                    const c2x = targetX - (targetX - sourceX) * hbf, c2y = targetY - (targetY - midY) * vbf;
                    d = `M${sourceX},${sourceY} C${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`; break;
            }
            path.setAttribute('d', d);
            this.g.insertBefore(path, this.g.firstChild); // 将链接插入到节点下方
        });
    }

    /**
     * @method _renderNodes
     * @description 渲染思维导图中的所有节点。它处理被拖动节点的特殊情况。
     * @private
     */
    _renderNodes() {
        const nodesToRender = [];
        let draggedNodeToRender = null;
        const traverse = (node) => {
            // 如果节点正在被拖动，则单独处理，以便它最后渲染（在最上面）
            if (this.mindmapView.interactionState.dragging && node.id === this.mindmapView.interactionState.draggedNodeId) {
                draggedNodeToRender = node;
            } else {
                nodesToRender.push(node);
            }
            if (node.children && !node._collapsed) {
                node.children.forEach(traverse);
            }
        };
        traverse(this.mindmapView.mindMapData);
        nodesToRender.forEach(node => this._appendNodeToG(node));
        if (draggedNodeToRender) {
            this._appendNodeToG(draggedNodeToRender);
        }
    }

    /**
     * @method _appendNodeToG
     * @description 为单个节点创建并附加 SVG 元素（组、矩形、文本、切换圆圈）到主 SVG 组。
     * @param {object} node - 要渲染的节点数据。
     * @private
     */
    _appendNodeToG(node) {
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('class', 'node');
        // 在拖动时为潜在父节点添加悬停效果
        if (this.mindmapView.interactionState.dragging && node.id === this.mindmapView.interactionState.draggedNodeId && this.mindmapView.interactionState.potentialParentId) {
            nodeGroup.classList.add('potential-parent-hover');
        }
        // 为搜索结果添加高亮
        if (this.mindmapView.highlightedNodeIds.has(node.id)) {
            nodeGroup.classList.add('highlight');
        }
        nodeGroup.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        nodeGroup.dataset.id = node.id;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', node.width);
        rect.setAttribute('height', node.height);
        rect.setAttribute('x', -node.width / 2);
        rect.setAttribute('y', -node.height / 2);
        rect.setAttribute('class', 'node-rect');
        if (node.id === this.mindmapView.selectedNodeId) rect.classList.add('selected');
        if (node.id === this.mindmapView.interactionState.potentialParentId) rect.classList.add('drop-target');

        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('class', 'node-text');
        textElement.textContent = node.text;

        nodeGroup.appendChild(rect);
        nodeGroup.appendChild(textElement);

        // 如果有子节点，则添加折叠/展开切换器
        if (node.children && node.children.length > 0) {
            const toggleCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            toggleCircle.setAttribute('cx', node.width / 2);
            toggleCircle.setAttribute('cy', 0);
            toggleCircle.setAttribute('r', 8);
            toggleCircle.classList.add('toggle-circle');
            toggleCircle.setAttribute('fill', node._collapsed ? '#aaa' : '#f0f0f0');
            toggleCircle.setAttribute('stroke', '#999');
            nodeGroup.appendChild(toggleCircle);
        }
        this.g.appendChild(nodeGroup);
    }

    /**
     * @method updateNodePositions
     * @description 通过更改其 'transform' 属性来高效地更新所有节点的位置，而无需完全重新渲染。
     */
    updateNodePositions() {
        const traverse = (node) => {
            const nodeElement = this.g.querySelector(`.node[data-id="${node.id}"]`);
            if (nodeElement) {
                nodeElement.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            }
            if (node.children && !node._collapsed) {
                node.children.forEach(traverse);
            }
        };
        traverse(this.mindmapView.mindMapData);
    }

    /**
     * @method measureText
     * @description 使用节点的样式测量给定文本字符串的宽度和高度。
     * 这是通过将一个 div 临时添加到 DOM 中来完成的。
     * @param {string} text - 要测量的文本。
     * @param {object} node - 节点数据，用于确定样式（例如，根节点）。
     * @returns {{width: number, height: number}} 测量的文本宽度和高度。
     */
    measureText(text, node) {
        const tempDiv = document.createElement('div');

        const hostStyle = getComputedStyle(this.mindmapView.svg);
        tempDiv.style.fontFamily = hostStyle.getPropertyValue('--node-text-font-family').trim();
        tempDiv.style.lineHeight = '1.3';

        const isRoot = node && node.id === 'root';
        tempDiv.style.fontSize = hostStyle.getPropertyValue(isRoot ? '--node-root-font-size' : '--node-font-size').trim();
        tempDiv.style.fontWeight = hostStyle.getPropertyValue(isRoot ? '--node-root-font-weight' : '--node-font-weight').trim();

        tempDiv.style.position = 'absolute';
        tempDiv.style.top = '-9999px';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = 'auto';
        tempDiv.style.whiteSpace = 'nowrap';

        tempDiv.textContent = text || ' ';

        this.mindmapView.shadowRoot.appendChild(tempDiv);

        const rect = tempDiv.getBoundingClientRect();

        this.mindmapView.shadowRoot.removeChild(tempDiv);

        return { width: rect.width, height: rect.height };
    }
}