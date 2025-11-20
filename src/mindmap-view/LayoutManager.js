/**
 * @class LayoutManager
 * @description 管理思维导图节点的自动布局。
 */
export default class LayoutManager {
    /**
     * @param {MindmapView} mindmapView - 对主思维导图视图组件的引用。
     */
    constructor(mindmapView) {
        this.mindmapView = mindmapView;
    }

    /**
     * @method autoLayout
     * @description 自动将思维导图的节点排列成分层的树状布局。
     * 它使用一个两遍算法：
     * 1. 第一遍（自下而上）：计算每个子树的总高度。
     * 2. 第二遍（自上而下）：为每个节点分配实际的 x 和 y 坐标。
     * @param {object} rootNode - 要布局的思维导图树的根节点。
     */
    autoLayout(rootNode) {
        const verticalMargin = 60, horizontalMargin = 150;
        let y_pos = {}; // 用于存储每个子树计算高度的映射。

        /**
         * @function firstPass
         * @description 执行布局算法第一遍的递归函数。
         * 它从下到上遍历树，计算每个节点及其子节点所需的垂直空间。
         * @param {object} node - 遍历中的当前节点。
         * @returns {number} 以当前节点为根的子树的总高度。
         */
        const firstPass = (node) => {
            let childrenHeight = 0;
            if (!node.children || node.children.length === 0 || node._collapsed) {
                childrenHeight = node.height;
            } else {
                node.children.forEach(child => { childrenHeight += firstPass(child); });
                childrenHeight += (node.children.length - 1) * verticalMargin;
            }
            y_pos[node.id] = childrenHeight;
            return childrenHeight;
        };

        /**
         * @function secondPass
         * @description 执行布局算法第二遍的递归函数。
         * 它从上到下遍历树，为每个节点分配最终的 x 和 y 坐标。
         * @param {object} node - 遍历中的当前节点。
         * @param {number} x - 要分配给当前节点的 x 坐标。
         * @param {number} y - 要分配给当前节点的 y 坐标。
         */
        const secondPass = (node, x, y) => {
            node.x = x; node.y = y;
            if (!node.children || node.children.length === 0 || node._collapsed) return;
            const totalHeight = y_pos[node.id];
            let startY = y - totalHeight / 2;
            node.children.forEach(child => {
                const childHeight = y_pos[child.id];
                const childY = startY + childHeight / 2;
                const childX = x + node.width / 2 + horizontalMargin + child.width / 2;
                secondPass(child, childX, childY);
                startY += childHeight + verticalMargin;
            });
        };
        
        firstPass(rootNode);
        secondPass(rootNode, rootNode.x, rootNode.y);
    }
}