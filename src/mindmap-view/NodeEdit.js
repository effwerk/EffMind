import NodeHistory from './NodeHistory.js';
import NodeTextManager from '../common/NodeTextManager.js';

import { debounce } from '../common/Utils.js';

/**
 * @class NodeEdit
 * @description 负责思维导图节点的编辑操作，包括添加、删除、修改、剪切、复制、粘贴节点，以及管理节点的历史记录和文本编辑状态。
 */
export default class NodeEdit {
    /**
     * @constructor
     * @param {MindmapView} mindmapView - MindmapView 实例的引用，用于访问和修改思维导图的视图和数据。
     */
    constructor(mindmapView) {
        this.mindmapView = mindmapView;
        this.nodeTextManager = new NodeTextManager({ allowRepeatPaste: false, maxHistory: 50 });
        this.nodeHistory = new NodeHistory();
        this.activeInput = null;
        this.finishEditingCallback = null;
    }

    /**
     * @method findNode
     * @description 在思维导图数据中查找指定 ID 的节点。
     * @param {string} id - 要查找的节点的 ID。
     * @param {object} [node=this.mindmapView.mindMapData] - 当前搜索的起始节点，默认为根节点。
     * @returns {object|null} 找到的节点对象，如果未找到则返回 null。
     */
    findNode(id, node = this.mindmapView.mindMapData) {
        if (node.id === id) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = this.findNode(id, child);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * @method findParent
     * @description 在思维导图数据中查找指定子节点的父节点。
     * @param {string} childId - 要查找其父节点的子节点 ID。
     * @param {object} [node=this.mindmapView.mindMapData] - 当前搜索的起始节点，默认为根节点。
     * @returns {object|null} 找到的父节点对象，如果未找到则返回 null。
     */
    findParent(childId, node = this.mindmapView.mindMapData) {
        if (!node.children) return null;
        for (const child of node.children) {
            if (child.id === childId) return node;
            const found = this.findParent(childId, child);
            if (found) return found;
        }
        return null;
    }

    /**
     * @method isDescendant
     * @description 判断一个节点是否是另一个节点的后代。
     * @param {string} childId - 潜在的子节点 ID。
     * @param {string} parentId - 潜在的父节点 ID。
     * @returns {boolean} 如果 childId 是 parentId 的后代，则返回 true，否则返回 false。
     */
    isDescendant(childId, parentId) {
        const parentNode = this.findNode(parentId);
        if (!parentNode || !parentNode.children) return false;
        return !!this.findNode(childId, parentNode);
    }

    /**
     * @method toggleNodeCollapse
     * @description 切换节点的折叠/展开状态。
     * @param {string} nodeId - 要切换状态的节点 ID。
     */
    toggleNodeCollapse(nodeId) {
        const node = this.findNode(nodeId);
        if (node) {
            node._collapsed = !node._collapsed;
            // if (!node._collapsed && node.children) {
            //     const expandAll = (n) => {
            //         n._collapsed = false;
            //         if (n.children) n.children.forEach(expandAll);
            //     };
            //     node.children.forEach(expandAll);
            // }
            this.mindmapView.updateMindmap();
        }
    }

    _traverseAllNodes(node, action, depth = 0) {
        if (!node) return;
        action(node, depth);
        if (node.children) {
            node.children.forEach((child) => this._traverseAllNodes(child, action, depth + 1));
        }
    }

    /**
     * @method expand
     * @description 展开所有节点，或展开到指定层级。
     * @param {number} [toDepth=0] 要展开到的层级。如果为0或未提供，则展开所有节点。
     */
    expand(toDepth = 0) {
        const root = this.mindmapView.mindMapData;
        this._traverseAllNodes(root, (node, depth) => {
            if (node.children && node.children.length > 0) {
                if (toDepth <= 0) {
                    node._collapsed = false; // expand all
                } else {
                    // expandAll(1) 展开到第1级, 所以折叠条件是 depth > 1
                    node._collapsed = depth >= toDepth;
                }
            }
        });
        root._collapsed = false;
        this.mindmapView.updateMindmap();
    }

    /**
     * @method collapse
     * @description 收起所有节点
     * @param {number} [retainDepth=0] 需要保留的层级，默认全部折叠
     */
    collapse(retainDepth = 0) {
        const root = this.mindmapView.mindMapData;
        this._traverseAllNodes(root, (node, depth) => {
            // 需要保留的层级
            if (depth < retainDepth) {
                node._collapsed = false;
            } else {
                // 如果节点有子节点，则折叠它
                if (node.children && node.children.length > 0) {
                    node._collapsed = true;
                }
            }
        });
        this.mindmapView.updateMindmap();
    }

    /**
     * @method getCollapsedStates
     * @description 获取所有节点的收缩状态。
     * @returns {object} 一个包含所有节点收缩状态的对象，键是节点ID，值是布尔值（true表示收缩）。
     */
    getCollapsedStates() {
        const collapsedStates = {};
        const root = this.mindmapView.mindMapData;
        this._traverseAllNodes(root, (node) => {
            if (node.id) {
                collapsedStates[node.id] = !!node._collapsed;
            }
        });
        return collapsedStates;
    }

    /**
     * @method setCollapsedStates
     * @description 根据提供的状态对象设置节点的收缩状态。
     * @param {object} collapsedStates - 一个包含节点收缩状态的对象，键是节点ID，值是布尔值。
     */
    setCollapsedStates(collapsedStates) {
        if (!collapsedStates) return;

        const root = this.mindmapView.mindMapData;
        this._traverseAllNodes(root, (node) => {
            if (node.id && collapsedStates.hasOwnProperty(node.id)) {
                node._collapsed = collapsedStates[node.id];
            }
        });

        this.mindmapView.updateMindmap();
    }

    /**
     * @method reparentDraggedNode
     * @description 重新父化拖动的节点，将其从旧父节点移动到新父节点。
     */
    reparentDraggedNode() {
        if (this.mindmapView.interactionState.potentialParentId) {
            const oldParent = this.findParent(this.mindmapView.interactionState.draggedNodeId);
            const newParent = this.findNode(this.mindmapView.interactionState.potentialParentId);
            const draggedNode = this.findNode(this.mindmapView.interactionState.draggedNodeId);
            if (oldParent && newParent && oldParent.id !== newParent.id) {
                oldParent.children = oldParent.children.filter(
                    (c) => c.id !== this.mindmapView.interactionState.draggedNodeId
                );
                if (!newParent.children) newParent.children = [];
                newParent.children.push(draggedNode);
                this.mindmapView.updateMindmap();
                this.mindmapView.dispatchMindmapNodeChange();
            }
        }
    }

    /**
     * @method addNode
     * @description 在当前选定节点下添加一个新的子节点。
     */
    addNode() {
        if (!this.mindmapView.selectedNodeId) return;
        const selectedNode = this.findNode(this.mindmapView.selectedNodeId);
        if (!selectedNode) return;
        const newNode = { id: `node-${Date.now()}`, text: '', children: [] };
        if (!selectedNode.children) selectedNode.children = [];
        selectedNode.children.push(newNode);
        this.mindmapView.selectedNodeId = newNode.id;
        this.mindmapView._nodeToFocus = this.mindmapView.selectedNodeId;

        this.mindmapView.isRootNodeModified = true;
        this.mindmapView.updateMindmap();
    }

    /**
     * @method addSibling
     * @description 在当前选定节点旁边添加一个新的兄弟节点。
     */
    addSibling() {
        if (!this.mindmapView.selectedNodeId || this.mindmapView.selectedNodeId === 'root') return;
        const parent = this.findParent(this.mindmapView.selectedNodeId);
        if (parent) {
            const newSibling = { id: `node-${Date.now()}`, text: '', children: [] };
            const selectedNodeIndex = parent.children.findIndex(
                (c) => c.id === this.mindmapView.selectedNodeId
            );
            parent.children.splice(
                selectedNodeIndex !== -1 ? selectedNodeIndex + 1 : parent.children.length,
                0,
                newSibling
            );
            this.mindmapView.selectedNodeId = newSibling.id;
            this.mindmapView._nodeToFocus = this.mindmapView.selectedNodeId;
            this.mindmapView.updateMindmap();
        }
    }

    /**
     * @method deleteSelectedNode
     * @description 删除当前选定的节点。
     */
    deleteSelectedNode() {
        if (
            !this.mindmapView.selectedNodeId ||
            this.mindmapView.selectedNodeId === 'root' ||
            this.mindmapView.isTextEditing
        )
            return;
        const parent = this.findParent(this.mindmapView.selectedNodeId);
        if (parent) {
            const index = parent.children.findIndex(
                (c) => c.id === this.mindmapView.selectedNodeId
            );
            parent.children.splice(index, 1);
            this.mindmapView.selectedNodeId =
                parent.children.length > 0
                    ? parent.children[Math.min(index, parent.children.length - 1)].id
                    : parent.id;
            this.mindmapView._nodeToPan = this.mindmapView.selectedNodeId;
            this.mindmapView.updateMindmap();
        }
        this.mindmapView.interactionState = {};
        window.removeEventListener(
            'pointermove',
            this.mindmapView.interactionManager._boundHandlePointerMove
        );
        window.removeEventListener(
            'pointerup',
            this.mindmapView.interactionManager._boundHandlePointerUp
        );
        window.removeEventListener(
            'pointercancel',
            this.mindmapView.interactionManager._boundHandlePointerCancel
        );
    }

    /**
     * @method undoNode
     * @description 撤销上一次对思维导图的修改。
     */
    undoNode() {
        const restoredState = this.nodeHistory.undo();
        if (restoredState) {
            this.mindmapView.mindMapData = restoredState.data;
            this.mindmapView.selectedNodeId = restoredState.selectedNodeId;
            if (this.mindmapView.selectedNodeId)
                this.mindmapView._nodeToPan = this.mindmapView.selectedNodeId;
        }
    }

    /**
     * @method redoNode
     * @description 重做上一次撤销的思维导图修改。
     */
    redoNode() {
        const restoredState = this.nodeHistory.redo();
        if (restoredState) {
            this.mindmapView.mindMapData = restoredState.data;
            this.mindmapView.selectedNodeId = restoredState.selectedNodeId;
            if (this.mindmapView.selectedNodeId)
                this.mindmapView._nodeToPan = this.mindmapView.selectedNodeId;
        }
    }

    /**
     * @method copyNode
     * @description 复制当前选定的节点到剪贴板。
     */
    copyNode() {
        if (this.mindmapView.selectedNodeId) {
            const nodeToCopy = this.findNode(this.mindmapView.selectedNodeId);
            if (nodeToCopy)
                this.clipboard = {
                    type: 'copy',
                    data: JSON.parse(JSON.stringify(nodeToCopy)),
                };
        }
    }

    /**
     * @method cutNode
     * @description 剪切当前选定的节点到剪贴板。
     */
    cutNode() {
        if (this.mindmapView.selectedNodeId && this.mindmapView.selectedNodeId !== 'root') {
            const nodeToCut = this.findNode(this.mindmapView.selectedNodeId);
            if (nodeToCut) {
                const parent = this.findParent(this.mindmapView.selectedNodeId);
                if (parent) {
                    this.clipboard = {
                        type: 'cut',
                        data: JSON.parse(JSON.stringify(nodeToCut)),
                        parentId: parent.id,
                    };
                    const index = parent.children.findIndex(
                        (c) => c.id === this.mindmapView.selectedNodeId
                    );
                    parent.children.splice(index, 1);
                    let nextSelectedId = parent.id;
                    if (parent.children.length > 0)
                        nextSelectedId =
                            parent.children[
                                index < parent.children.length ? index : parent.children.length - 1
                            ].id;
                    this.mindmapView.selectedNodeId = nextSelectedId;
                    this.mindmapView.updateMindmap();
                    this.mindmapView._nodeToPan = this.mindmapView.selectedNodeId;
                }
            }
        }
    }

    /**
     * @method pasteNode
     * @description 将剪贴板中的节点粘贴到当前选定节点下。
     */
    pasteNode() {
        if (this.clipboard && this.mindmapView.selectedNodeId) {
            const parentNode = this.findNode(this.mindmapView.selectedNodeId);
            if (parentNode) {
                const newNode = JSON.parse(JSON.stringify(this.clipboard.data));
                const assignNewIds = (node) => {
                    node.id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
                    if (node.children) node.children.forEach(assignNewIds);
                };
                assignNewIds(newNode);
                if (!parentNode.children) parentNode.children = [];
                parentNode.children.push(newNode);
                if (this.clipboard.type === 'cut') this.clipboard = null;
                this.mindmapView.selectedNodeId = newNode.id;
                this.mindmapView.isRootNodeModified = true;
                this.mindmapView.updateMindmap();
                this.mindmapView._nodeToPan = this.mindmapView.selectedNodeId;
            }
        }
    }

    /**
     * @method finishEditing
     * @description 完成当前节点的文本编辑。
     * @param {boolean} [shouldUpdate=true] - 是否在完成编辑后更新思维导图。
     */
    finishEditing(shouldUpdate = true) {
        if (this.finishEditingCallback) {
            const callback = this.finishEditingCallback; // 1. 先把回调函数存起来
            this.finishEditingCallback = null; // 2. 立刻清除引用，防止二次进入
            callback(shouldUpdate); // 3. 最后再执行存起来的回调
        }
    }

    /**
     * @method editNodeText
     * @description 启用节点的文本编辑模式。
     * @param {object} node - 要编辑的节点对象。
     * @param {HTMLElement} nodeElement - 节点对应的 DOM 元素。
     */
    editNodeText(node, nodeElement) {
        if (this.finishEditingCallback) this.finishEditing(false);

        this.mindmapView.isTextEditing = true;
        const textElement = nodeElement.querySelector('.node-text');
        const rect = nodeElement.querySelector('.node-rect');
        if (!textElement || !rect) {
            this.mindmapView.isTextEditing = false;
            return;
        }

        textElement.style.display = 'none';

        const foreignObject = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'foreignObject'
        );
        foreignObject.setAttribute('x', -node.width / 2);
        foreignObject.setAttribute('y', -node.height / 2);
        foreignObject.setAttribute('width', node.width);
        foreignObject.setAttribute('height', node.height);
        foreignObject.classList.add('node-foreign-object');

        const input = document.createElement('input');
        input.id = `input-${node.id}`;
        input.className = 'node-text-div';
        input.value = node.text;
        input.style.whiteSpace = 'nowrap';
        const computedStyle = window.getComputedStyle(textElement);
        input.style.fontWeight = computedStyle.fontWeight;
        input.style.fontSize = computedStyle.fontSize;

        foreignObject.appendChild(input);
        nodeElement.appendChild(foreignObject);

        // 软键盘打开时，如果试图被推高，this.mindmapView.svg.y = 负数
        if (!this.inputRectTracker) {
            this.inputRectTracker = new ElementRectTracker(this.mindmapView.svg, 150);
        }
        // 保存原始坐标用于编辑结束后恢复
        const originalPan = this.mindmapView.viewportManager.getPanForNode(
            this.mindmapView.selectedNodeId
        );
        input.hasNodeMoved = false;
        input.addEventListener(
            'focus',
            () => {
                if (originalPan) {
                    this.inputRectTracker.start(() => {
                        const inputBoundingClientRect = input.getBoundingClientRect();
                        if (inputBoundingClientRect.y < 20) {
                            input.hasNodeMoved = true;
                            // 让input进入可视区域
                            this.mindmapView.viewportManager.panViewportToNode(
                                this.mindmapView.selectedNodeId,
                                originalPan.x, // x轴居中
                                Math.abs(this.mindmapView.svg.getBoundingClientRect().y) / 2
                            );
                        }
                    });
                }
                this.mindmapView.dispatch('start-edit-node-text', { node });
            },
            { once: true }
        );
        input.addEventListener(
            'blur',
            () => {
                if (originalPan && input.hasNodeMoved) {
                    // 恢复原来的位置
                    this.mindmapView.viewportManager.panViewportToNode(
                        this.mindmapView.selectedNodeId,
                        originalPan.x,
                        originalPan.y
                    );
                }
                this.inputRectTracker.stop();
                this.finishEditing(true);
                this.mindmapView.dispatch('end-edit-node-text', { node });
            },
            { once: true }
        );

        input.focus();
        input.select();
        this.activeInput = input;

        const handleInput = () => {
            const textContent = input.value;
            node.text = textContent.trim();
            const textMetrics = this.mindmapView.renderer.measureText(textContent || 'M', node);
            const newWidth = textMetrics.width + 2 * this.mindmapView.NODE_PADDING_X;
            const newHeight = textMetrics.height + 2 * this.mindmapView.NODE_PADDING_Y;
            node.width = textContent.trim() ? newWidth : newHeight;
            node.height = newHeight;

            rect.setAttribute('width', node.width);
            rect.setAttribute('height', node.height);
            rect.setAttribute('x', -node.width / 2);
            rect.setAttribute('y', -node.height / 2);

            foreignObject.setAttribute('width', node.width);
            foreignObject.setAttribute('height', node.height);
            foreignObject.setAttribute('x', -node.width / 2);
            foreignObject.setAttribute('y', -node.height / 2);

            const toggleCircle = nodeElement.querySelector('.toggle-circle');
            if (toggleCircle) toggleCircle.setAttribute('cx', node.width / 2);

            if (this.mindmapView.searchTerm) {
                const isMatch = textContent
                    .toLowerCase()
                    .includes(this.mindmapView.searchTerm.toLowerCase());
                nodeElement.classList.toggle('highlight', isMatch);
                const minimapNode = this.mindmapView.minimap?.shadowRoot.querySelector(
                    `.minimap-node[data-id="${node.id}"]`
                );
                if (minimapNode) minimapNode.classList.toggle('highlight', isMatch);
            }

            this.mindmapView.layoutManager.autoLayout(this.mindmapView.mindMapData);
            this.mindmapView.renderer.updateNodePositions();
            this.mindmapView.renderer.removeLinks();
            this.mindmapView.renderer.renderLinks();
        };

        input.addEventListener('input', handleInput);

        this.finishEditingCallback = (shouldUpdate = true) => {
            if (foreignObject.parentNode) {
                node.text = input.value.trim();
                input.removeEventListener('input', handleInput);
                this.nodeTextManager.unbind(input);
                nodeElement.removeChild(foreignObject);
                textElement.style.display = '';
                if (shouldUpdate) {
                    this.mindmapView.isRootNodeModified = true;
                    this.mindmapView.updateMindmap();
                }
            }
            this.mindmapView.isTextEditing = false;
            this.activeInput = null;
        };

        input.addEventListener('keydown', (e) => {
            if (
                e.key === ' ' ||
                e.key === 'Delete' ||
                e.key === 'Backspace' ||
                e.key.startsWith('Arrow')
            ) {
                e.stopPropagation();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.finishEditing(true);
            } else if (e.key === 'Escape') {
                e.stopPropagation();
                this.finishEditing(true);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                this.finishEditing(false);
                this.mindmapView.dispatch('add-child-node');
            }
        });

        this.nodeTextManager.bind(input);
        handleInput();
    }
}

// 用来监听input是否因为软键盘打开而被推到不可见的位置
class ElementRectTracker {
    /**
     * @param {HTMLElement} element 要监听的元素
     * @param {number} debounceWait - 延迟执行时间（毫秒）
     */
    constructor(element, options = {}) {
        if (!element) throw new Error('Element must be provided');
        this.element = element;
        this.rafId = null;
        this.prevRect = null;
        this.debounceWait = options.debounceWait || 100;

        this.debouncedCallback = null;
    }

    /**
     * 开始监听元素位置变化
     * @param {Function} callback 位置变化时触发的回调，参数为 rect 对象
     * @param {number} debounceWait - 延迟执行时间（毫秒）覆盖默认值
     */
    start(callback, debounceWait = null) {
        if (this.rafId) return; // 防重复调用
        if (typeof callback !== 'function') throw new Error('Callback must be a function');

        this.debouncedCallback = debounce(callback, debounceWait || this.debounceWait);

        const check = () => {
            const rect = this.element.getBoundingClientRect();

            // 如果位置变化，触发回调
            if (
                !this.prevRect ||
                rect.top !== this.prevRect.top ||
                rect.bottom !== this.prevRect.bottom
            ) {
                this.debouncedCallback(rect);
                this.prevRect = { top: rect.top, bottom: rect.bottom };
            }

            this.rafId = requestAnimationFrame(check);
        };

        this.rafId = requestAnimationFrame(check);
    }

    /**
     * 停止监听
     */
    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
            if (this.debouncedCallback?.cancel) this.debouncedCallback.cancel();
        }
    }
}
