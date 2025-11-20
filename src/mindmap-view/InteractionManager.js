/**
 * @class InteractionManager
 * @description 管理思维导图的所有用户交互，包括鼠标、触摸和键盘事件。
 *              支持单节点拖动、拖动排序、拖动成为子节点、画布平移、节点选择和双击编辑。
 */
export default class InteractionManager {
    /**
     * @param {MindmapView} mindmapView - 主思维导图视图组件引用
     */
    constructor(mindmapView) {
        this.mindmapView = mindmapView;

        // 绑定事件处理函数，保证添加和移除事件监听器时引用一致
        this._boundHandlePointerMove = this._handlePointerMove.bind(this);
        this._boundHandlePointerUp = this._handlePointerUp.bind(this);
        this._boundHandlePointerCancel = this._handlePointerCancel.bind(this);
    }

    /**
     * @method setupEventListeners
     * @description 在 SVG 画布和窗口上设置所有必要事件监听器
     */
    setupEventListeners() {
        this.activePointers = new Map(); // 用于多点触控手势
        this.lastTap = 0;

        // 使用 pointer 事件统一处理鼠标和触摸
        this.mindmapView.svg.addEventListener('pointerdown', this._handlePointerDown.bind(this));
        this.mindmapView.svg.addEventListener('dblclick', this._handleDblClick.bind(this));
        this.mindmapView.svg.addEventListener('wheel', this._handleWheel.bind(this));
        this.mindmapView.svg.addEventListener('contextmenu', this._handleContextMenu.bind(this));
    }

    /**
     * @method _handlePointerDown
     * @description 处理 pointerdown 事件
     * @param {PointerEvent} e
     * @private
     */
    _handlePointerDown(e) {
        if (this.mindmapView.isTextEditing) return;

        // 全局监听器，用于拖动和多点手势
        window.addEventListener('pointermove', this._boundHandlePointerMove);
        window.addEventListener('pointerup', this._boundHandlePointerUp);
        window.addEventListener('pointercancel', this._boundHandlePointerCancel);

        this.activePointers.set(e.pointerId, {
            x: e.clientX,
            y: e.clientY,
            pointerType: e.pointerType,
        });

        // 捕获原始目标
        const state = this.mindmapView.interactionState;
        state.captureTarget = e.target;
        try {
            e.target.setPointerCapture(e.pointerId);
        } catch (_) {}

        // 双击检测（触摸设备）
        if (e.pointerType === 'touch') {
            const now = Date.now();
            if (now - this.lastTap < 300) {
                this._handleDblClick(e);
                this.lastTap = 0;
                return;
            }
            this.lastTap = now;
        }

        // 如果是第二个手指按下，则初始化捏合手势
        if (this.activePointers.size === 2) {
            // 如果已经通过单指开始平移或拖动，则忽略第二个手指，以防止意外切换手势。
            if (state.panning || state.draggedNodeId) {
                return;
            }
            state.panning = false; // 停止平移
            state.draggedNodeId = null; // 停止节点拖动
            state.pinch = {};
            const pointers = Array.from(this.activePointers.values());
            state.pinch.startDist = Math.hypot(
                pointers[0].x - pointers[1].x,
                pointers[0].y - pointers[1].y
            );
            state.pinch.startScale = this.mindmapView.viewState.scale;
            state.pinch.startPan = {
                x: this.mindmapView.viewState.panX,
                y: this.mindmapView.viewState.panY,
            };
            state.pinch.startCenter = {
                x: (pointers[0].x + pointers[1].x) / 2,
                y: (pointers[0].y + pointers[1].y) / 2,
            };
            return;
        }

        // 单指操作：鼠标或单点触摸
        const targetNodeElement = e.target.closest('.node');

        // 记录初始位置，用于平移和点击检测
        state.startX = state.initialStartX = e.clientX;
        state.startY = state.initialStartY = e.clientY;

        this.mindmapView.viewportManager.stopAnimation(); // 在任何拖动或平移开始时停止动画

        if (targetNodeElement) {
            const targetId = targetNodeElement.dataset.id;
            if (e.target.closest('.toggle-circle')) {
                // 点击折叠/展开按钮
                this.mindmapView.nodeEdit.toggleNodeCollapse(targetId);
            } else {
                // 准备拖动节点
                state.draggedNodeId = targetId;
                state.originalMindMapData = JSON.parse(
                    JSON.stringify(this.mindmapView.mindMapData)
                );
            }
        } else {
            // 点击空白区域：准备平移
            state.previousSelectedNodeId = this.mindmapView.selectedNodeId;
            state.panning = true;
            this.mindmapView.svg.style.cursor = 'grabbing';
        }
    }

    /**
     * @method _handlePointerMove
     * @description 处理 pointermove 事件，管理平移、拖动节点、拖动排序和潜在父节点逻辑
     * @param {PointerEvent} e
     * @private
     */
    _handlePointerMove(e) {
        if (!this.activePointers.has(e.pointerId)) return;

        const state = this.mindmapView.interactionState;
        this.activePointers.set(e.pointerId, {
            x: e.clientX,
            y: e.clientY,
            pointerType: e.pointerType,
        });

        // 处理捏合手势
        if (this.activePointers.size === 2 && state.pinch && state.pinch.startCenter) {
            const pointers = Array.from(this.activePointers.values());
            const currentDist = Math.hypot(
                pointers[0].x - pointers[1].x,
                pointers[0].y - pointers[1].y
            );
            const currentCenter = {
                x: (pointers[0].x + pointers[1].x) / 2,
                y: (pointers[0].y + pointers[1].y) / 2,
            };

            this.mindmapView.viewportManager.handlePinch(
                state.pinch.startDist,
                currentDist,
                state.pinch.startScale,
                state.pinch.startPan,
                state.pinch.startCenter,
                currentCenter
            );
            return;
        }

        // 单指操作
        const dx = e.clientX - (state.startX || e.clientX);
        const dy = e.clientY - (state.startY || e.clientY);

        // 平移画布
        if (state.panning) {
            this.mindmapView.viewState.panX += dx;
            this.mindmapView.viewState.panY += dy;
            this.mindmapView.viewportManager.updateView();
            state.startX = e.clientX;
            state.startY = e.clientY;
            return;
        }

        const draggedId = state.draggedNodeId;
        if (!draggedId) return;

        // 开始拖动节点
        if (!state.dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            state.dragging = true;
            const node = this.mindmapView.nodeEdit.findNode(draggedId);
            if (!node) return;
            state.offsetX =
                (e.clientX - this.mindmapView.viewState.panX) / this.mindmapView.viewState.scale -
                node.x;
            state.offsetY =
                (e.clientY - this.mindmapView.viewState.panY) / this.mindmapView.viewState.scale -
                node.y;
        }
        if (!state.dragging) return;

        const draggedNode = this.mindmapView.nodeEdit.findNode(draggedId);
        if (!draggedNode) return;

        // 检测潜在父节点
        const draggedElem = this.mindmapView.g.querySelector(`.node[data-id="${draggedId}"]`);
        if (draggedElem) draggedElem.style.display = 'none';
        const elementUnder = this.mindmapView.shadowRoot.elementFromPoint(e.clientX, e.clientY);
        if (draggedElem) draggedElem.style.display = '';

        const targetNodeElem = elementUnder?.closest('.node') || null;
        state.potentialParentId = null;

        if (targetNodeElem) {
            const targetId = targetNodeElem.dataset.id;
            if (
                targetId !== draggedId &&
                !this.mindmapView.nodeEdit.isDescendant(targetId, draggedId)
            ) {
                state.potentialParentId = targetId;
            }
        }

        // 拖动节点位置（潜在父节点存在，直接自由移动）
        if (state.potentialParentId) {
            draggedNode.x =
                (e.clientX - this.mindmapView.viewState.panX) / this.mindmapView.viewState.scale -
                state.offsetX;
            draggedNode.y =
                (e.clientY - this.mindmapView.viewState.panY) / this.mindmapView.viewState.scale -
                state.offsetY;
            this.mindmapView.renderer.render();
            this.mindmapView.minimap?.requestUpdate();
            state.reorder = false;
            return;
        }

        // 节点兄弟排序逻辑
        const parent = this.mindmapView.nodeEdit.findParent(draggedId);
        if (parent && parent.children.length > 1) {
            const clientY = e.clientY;
            const oldIndex = parent.children.findIndex((c) => c.id === draggedId);

            const otherSiblings = parent.children
                .filter((c) => c.id !== draggedId)
                .map((child) => {
                    const elem = this.mindmapView.g.querySelector(`.node[data-id="${child.id}"]`);
                    if (!elem) return null;
                    const rect = elem.getBoundingClientRect();
                    return { id: child.id, y: rect.top + rect.height / 2 };
                })
                .filter(Boolean);

            let insertionIndex = otherSiblings.findIndex((s) => clientY < s.y);
            if (insertionIndex === -1) insertionIndex = otherSiblings.length;

            const targetSiblingId =
                insertionIndex < otherSiblings.length ? otherSiblings[insertionIndex].id : null;
            let targetIndex = targetSiblingId
                ? parent.children.findIndex((c) => c.id === targetSiblingId)
                : parent.children.length;

            if (oldIndex < targetIndex) targetIndex--;
            if (targetIndex !== oldIndex) {
                state.reorder = true;
                const node = parent.children.splice(oldIndex, 1)[0];
                parent.children.splice(targetIndex, 0, node);
                this.mindmapView.updateMindmap();
                this.mindmapView.dispatchMindmapNodeChange();
            } else {
                state.reorder = false;
            }
        }

        // 自由拖动（父节点未确定或未重排）
        if (!state.reorder) {
            draggedNode.x =
                (e.clientX - this.mindmapView.viewState.panX) / this.mindmapView.viewState.scale -
                state.offsetX;
            draggedNode.y =
                (e.clientY - this.mindmapView.viewState.panY) / this.mindmapView.viewState.scale -
                state.offsetY;
            this.mindmapView.renderer.render();
            this.mindmapView.minimap?.requestUpdate();
        }
    }

    /**
     * @method _handlePointerUp
     * @description 处理 pointerup 事件，完成拖动、平移或点击操作
     * @param {PointerEvent} e
     * @private
     */
    _handlePointerUp(e) {
        if (!this.activePointers.has(e.pointerId)) return;
        this.activePointers.delete(e.pointerId);

        const state = this.mindmapView.interactionState;
        const captureTarget = state.captureTarget;
        if (captureTarget)
            try {
                captureTarget.releasePointerCapture(e.pointerId);
            } catch (_) {}

        // 当最后一个手指抬起时，才处理点击/拖动结束逻辑
        if (this.activePointers.size === 0) {
            const dx = e.clientX - (state.initialStartX || e.clientX);
            const dy = e.clientY - (state.initialStartY || e.clientY);
            const isClick = Math.abs(dx) < 5 && Math.abs(dy) < 5;

            const draggedId = state.draggedNodeId;
            if (state.dragging && draggedId) {
                // 拖动释放：重新父节点归属或兄弟排序
                this.mindmapView.nodeEdit.reparentDraggedNode();
                this.mindmapView.updateMindmap();
            } else if (isClick && !state.pinch) {
                // 只有在非捏合手势下才处理点击
                const realTarget = e.composedPath()[0] || e.target;
                this.mindmapView.selectedNodeId = realTarget.closest('.node')?.dataset.id || null;
                this.mindmapView.dispatch('node-focus');
            } else if (state.panning) {
                // 平移结束：恢复之前选中节点
                if (state.previousSelectedNodeId) {
                    this.mindmapView.selectedNodeId = state.previousSelectedNodeId;
                }
            }

            this.mindmapView.svg.style.cursor = 'default';
            this.mindmapView.interactionState = {};
            window.removeEventListener('pointermove', this._boundHandlePointerMove);
            window.removeEventListener('pointerup', this._boundHandlePointerUp);
            window.removeEventListener('pointercancel', this._boundHandlePointerCancel);
        } else if (this.activePointers.size < 2) {
            state.pinch = null; // 清除捏合状态
        }
    }

    /**
     * @method _handlePointerCancel
     * @description 处理 pointercancel 事件
     * @param {PointerEvent} e
     * @private
     */
    _handlePointerCancel(e) {
        if (!this.activePointers.has(e.pointerId)) return;
        this.activePointers.delete(e.pointerId);

        const state = this.mindmapView.interactionState;
        const captureTarget = state.captureTarget;
        if (captureTarget)
            try {
                captureTarget.releasePointerCapture(e.pointerId);
            } catch (_) {}

        if (this.activePointers.size < 2) state.pinch = null;
        if (this.activePointers.size === 0) {
            // 如果是拖动过程中取消，则恢复到原始数据
            if (state.dragging && state.originalMindMapData) {
                this.mindmapView.mindMapData = state.originalMindMapData;
                this.mindmapView.updateMindmap();
            }
            this.mindmapView.interactionState = {};
            this.mindmapView.svg.style.cursor = 'default';
            window.removeEventListener('pointermove', this._boundHandlePointerMove);
            window.removeEventListener('pointerup', this._boundHandlePointerUp);
            window.removeEventListener('pointercancel', this._boundHandlePointerCancel);
        }
    }

    /**
     * @method _handleDblClick
     * @description 双击节点进入文本编辑
     * @param {MouseEvent} e
     * @private
     */
    _handleDblClick(e) {
        const activeInput = this.mindmapView.nodeEdit.activeInput;
        if (activeInput && activeInput.contains(e.target)) return;
        if (activeInput) activeInput.blur();

        const targetNode = e.target.closest('.node');
        if (targetNode) {
            Promise.resolve().then(() => {
                this.mindmapView.nodeEdit.editNodeText(
                    this.mindmapView.nodeEdit.findNode(targetNode.dataset.id),
                    targetNode
                );
            });
        }
    }

    /**
     * @method _handleWheel
     * @description 滚轮缩放（Ctrl/Cmd）或平移
     * @param {WheelEvent} e
     * @private
     */
    _handleWheel(e) {
        e.preventDefault();
        const { viewState, viewportManager, svg } = this.mindmapView;
        if (e.ctrlKey || e.metaKey) {
            const zoomIntensity = 0.1;
            const wheel = e.deltaY < 0 ? 1 : -1;
            const zoomFactor = Math.exp(wheel * zoomIntensity);
            const newScale = viewState.scale * zoomFactor;
            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            viewportManager.zoomAtPoint(newScale, mouseX, mouseY);
        } else {
            viewportManager.stopAnimation();
            viewState.panX -= e.deltaX;
            viewState.panY -= e.deltaY;
            viewportManager.updateView();
        }
    }

    /**
     * @method _handleContextMenu
     * @description 右键菜单
     * @param {PointerEvent} e
     * @private
     */
    _handleContextMenu(e) {
        if (this.mindmapView.interactionState.pinch) return;
        if (this.mindmapView.isTextEditing && e.pointerType === 'touch') return;
        e.preventDefault();
        const nodeId = e.target.closest('.node')?.dataset.id || null;
        this.mindmapView.dispatch('mindmap-context-menu', {
            x: e.clientX,
            y: e.clientY,
            nodeId,
        });
    }
}
