/**
 * @class ImportExport
 * @description 处理以各种格式导入和导出思维导图数据。
 * 这个类封装了所有与文件导入导出相关的功能，
 * 包括导出为 .mind (JSON) 文件、图片 (PNG) 和可交互的 SVG。
 */
export default class ImportExport {
    /**
     * @param {MindmapView} mindmapView - 对主思维导图视图组件的引用。
     * @constructor
     */
    constructor(mindmapView) {
        this.mindmapView = mindmapView;
    }

    /**
     * @method getSavableData
     * @description 准备用于保存的思维导图数据。
     * 此方法会清理掉临时的、运行时才需要的属性（比如 `_collapsed`），
     * 以确保保存的数据是纯净的节点数据。
     * @param {boolean} [recordPan=false] - 是否在元数据中记录视图的平移位置 (panX, panY)。
     * @returns {object} 包含思维导图数据和元数据的可保存对象。
     */
    getSavableData(recordPan = false) {
        // 深拷贝当前的思维导图数据，以避免修改原始数据
        const dataToSave = JSON.parse(JSON.stringify(this.mindmapView.mindMapData));
        
        // 使用栈遍历所有节点，移除不需要保存的临时属性
        const stack = [dataToSave];
        while (stack.length > 0) {
            const node = stack.pop();
            if (!node) continue;
            // _collapsed 是一个运行时状态，表示节点是否折叠，不需要保存
            delete node._collapsed;
            // 节点的布局信息为运行时计算值，不应写入文件
            delete node.x;
            delete node.y;
            delete node.width;
            delete node.height;
            
            // 如果有子节点，将它们也加入栈中继续处理
            if (node.children) {
                stack.push(...node.children);
            }
        }

        // 拷贝当前的视图状态
        const viewStateToSave = { ...this.mindmapView.viewState };
        // svgWidth/svgHeight 是运行时由 DOM 决定的属性，不应保存在文件中
        delete viewStateToSave.svgWidth;
        delete viewStateToSave.svgHeight;
        // 如果不记录平移信息，则从视图状态中删除 panX 和 panY
        if (!recordPan) {
            delete viewStateToSave.panX;
            delete viewStateToSave.panY;
        }

        // 返回最终的可保存对象，包含数据和元数据
        return {
            data: dataToSave,
            metadata: {
                view: viewStateToSave,
            },
        };
    }

    /**
     * @method exportMindMapFile
     * @description 将思维导图导出为 `.mind` 文件。
     * `.mind` 文件本质上是一个包含了思维导图数据和元数据的 JSON 文件。
     * @param {object} [options] - 导出选项。
     * @param {boolean} [options.recordPan=false] - 是否记录画布的平移位置。
     */
    exportMindMapFile({ recordPan = false } = {}) {
        // 获取处理过的、可用于导出的原始 JSON 字符串
        const mindMapJson = this.getMindMapRawData(recordPan);
        // 创建一个 Blob 对象
        const blob = new Blob([mindMapJson], { type: 'application/json' });
        // 创建一个指向该 Blob 的 URL
        const url = URL.createObjectURL(blob);
        // 创建一个 <a> 标签用于下载
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.mind'; // 设置下载文件的名称
        document.body.appendChild(a);
        a.click(); // 模拟点击下载
        document.body.removeChild(a); // 下载后移除 <a> 标签
        URL.revokeObjectURL(url); // 释放 URL 对象
    }

    /**
     * @method importMindMapFile
     * @description 弹出一个文件选择框，用于导入 `.mind` 文件。
     */
    importMindMapFile() {
        // 创建一个 <input type="file"> 元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mind'; // 只接受 .mind 文件
        // 当用户选择文件后触发
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            // 文件读取成功后触发
            reader.onload = (event) => {
                // 清空历史记录
                this.mindmapView.nodeEdit.nodeHistory.clear();
                // 获取文件内容的字符串
                const fileContentStr = event.target.result;
                // 加载原始数据
                this.loadRawData(fileContentStr);
            };
            // 以文本形式读取文件
            reader.readAsText(file);
        };
        // 模拟点击以打开文件选择框
        input.click();
    }

    /**
     * @method getMindMapRawData
     * @description 获取思维导图的原始 JSON 字符串数据。
     * @param {object} [options] - 选项。
     * @param {boolean} [options.recordPan=false] - 是否记录平移位置。
     * @returns {string} 思维导图数据的 JSON 字符串。
     */
    getMindMapRawData({ recordPan = false } = {}) {
        return JSON.stringify(this.getSavableData(recordPan));
    }

    /**
     * @method loadRawData
     * @description 加载原始的思维导图数据（字符串格式）并更新视图。
     * @param {string} rawData - 包含思维导图数据的 JSON 字符串。
     */
    loadRawData(rawData) {
        let fileContent;
        // 如果数据为空或只包含空白，则创建一个新的空白思维导图
        if (!rawData || rawData.trim() === '') {
            this.mindmapView.newMindmap();
            return;
        } else {
            // 尝试解析 JSON 数据
            try {
                fileContent = JSON.parse(rawData);
            } catch (error) {
                // 如果解析失败，则派发一个文件读取错误事件
                this.mindmapView.dispatchEvent(
                    new CustomEvent('file-read-error', {
                        bubbles: true,
                        composed: true,
                    })
                );
                return;
            }
        }
        // 派发文件读取成功事件
        this.mindmapView.dispatchEvent(
            new CustomEvent('file-read-success', {
                bubbles: true,
                composed: true,
            })
        );

        // 检查文件是否包含元数据
        const hasMetadata = fileContent.data && fileContent.metadata;
        const viewState = hasMetadata ? fileContent.metadata.view : null;

        // 设置思维导图数据
        this.mindmapView.mindMapData = hasMetadata ? fileContent.data : fileContent;

        // 如果根节点的坐标无效，则将其设置到画布中心
        if (isNaN(this.mindmapView.mindMapData.x) || isNaN(this.mindmapView.mindMapData.y)) {
            this.mindmapView.mindMapData.x = this.mindmapView.svg.clientWidth / 2;
            this.mindmapView.mindMapData.y = this.mindmapView.svg.clientHeight / 2;
        }

        // 如果有视图状态，则应用它
        if (viewState) {
            this.mindmapView.viewportManager.setView(viewState);
        }

        // 更新思维导图视图
        this.mindmapView.updateMindmap();

        // 如果没有视图状态，或者视图状态中缺少平移信息，则将视图居中到根节点
        if (!viewState || viewState.panX === undefined || viewState.panY === undefined) {
            this.mindmapView.viewportManager.centerViewportOnNode('root');
        }

        // 派发节点变化事件
        this.mindmapView.dispatchMindmapNodeChange();
    }

    /**
     * @method _createMindMapImageBlob
     * @description 创建当前思维导图视图的 PNG 图像 Blob。
     * 这个方法会临时展开所有节点，计算整个导图的边界，
     * 然后将 SVG 内容渲染到一个 Canvas 上，最终转换为 PNG Blob。
     * @returns {Promise<Blob|null>} 一个解析为图像 Blob 的 Promise，如果发生错误则为 null。
     * @private
     */
    async _createMindMapImageBlob() {
        // 保存当前状态，以便在导出后恢复
        const selectedId = this.mindmapView.selectedNodeId;
        this.mindmapView.selectedNodeId = null; // 导出时不显示选中状态

        // 记录并展开所有节点
        const collapsedStates = new Map();
        this.mindmapView.traverse(this.mindmapView.mindMapData, (node) => {
            if (node.id) {
                collapsedStates.set(node.id, node._collapsed);
            }
            node._collapsed = false;
        });

        // 更新思维导图以应用展开的状态
        this.mindmapView.updateMindmap();
        await this.mindmapView.requestUpdate();

        try {
            const svgElement = this.mindmapView.svg;

            // 计算完整内容的边界
            const bbox = this.mindmapView.viewportManager.calculateFullContentBounds(
                this.mindmapView.mindMapData,
                true
            );
            if (bbox.width === 0 || bbox.height === 0) {
                return null; // 如果没有内容，则不导出
            }
            const padding = 50; // 设置导图周围的内边距

            // 计算导出尺寸
            const exportWidth = bbox.width + 2 * padding;
            const exportHeight = bbox.height + 2 * padding;

            // 为了更高分辨率的图片，设置一个乘数
            const resolutionMultiplier = 3;
            const finalCanvasWidth = exportWidth * resolutionMultiplier;
            const finalCanvasHeight = exportHeight * resolutionMultiplier;

            // 创建一个临时的 SVG 元素用于导出
            const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            tempSvg.setAttribute('width', exportWidth);
            tempSvg.setAttribute('height', exportHeight);
            tempSvg.setAttribute(
                'viewBox',
                `${bbox.x - padding} ${bbox.y - padding} ${exportWidth} ${exportHeight}`
            );
            tempSvg.style.backgroundColor = getComputedStyle(svgElement).backgroundColor;

            // 克隆主 SVG 内容
            const gClone = this.mindmapView.g.cloneNode(true);

            // 移除折叠/展开按钮
            gClone.querySelectorAll('.toggle-circle').forEach((circle) => circle.remove());

            // 将样式内联到克隆的元素中，以确保在 SVG 中正确显示
            const selectors = ['.node-rect', '.node-text', '.link', '.collapse-button-text'];
            selectors.forEach((selector) => {
                const originalElements = this.mindmapView.g.querySelectorAll(selector);
                const clonedElements = gClone.querySelectorAll(selector);
                if (originalElements.length !== clonedElements.length) {
                    return;
                }
                originalElements.forEach((originalEl, i) => {
                    const clonedEl = clonedElements[i];
                    const computedStyle = getComputedStyle(originalEl);
                    const styleProperties = [
                        'fill', 'stroke', 'stroke-width', 'font-size', 'font-family',
                        'text-anchor', 'dominant-baseline', 'opacity', 'rx', 'ry',
                    ];
                    let styleString = '';
                    for (const prop of styleProperties) {
                        styleString += `${prop}: ${computedStyle.getPropertyValue(prop)}; `;
                    }
                    clonedEl.setAttribute('style', styleString);
                });
            });

            gClone.removeAttribute('transform');
            tempSvg.appendChild(gClone);

            // 将 SVG 序列化为字符串
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(tempSvg);
            svgString = '<?xml version="1.0" standalone="no"?>' + svgString;

            // 使用 Canvas 将 SVG 转换为 PNG
            const blob = await new Promise((resolve, reject) => {
                const canvas = document.createElement('canvas');
                canvas.width = finalCanvasWidth;
                canvas.height = finalCanvasHeight;
                const ctx = canvas.getContext('2d');

                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, finalCanvasWidth, finalCanvasHeight);
                    canvas.toBlob((b) => {
                        if (b) resolve(b);
                        else reject(new Error('Canvas to Blob conversion failed.'));
                    }, 'image/png');
                };
                img.onerror = (err) => {
                    console.error('Error loading SVG into image:', err);
                    reject(err);
                };
                // 将 SVG 字符串作为数据 URL 传递给 Image 对象
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            });
            return blob;
        } finally {
            // 恢复原始状态
            this.mindmapView.selectedNodeId = selectedId;
            this.mindmapView.traverse(this.mindmapView.mindMapData, (node) => {
                if (node.id && collapsedStates.has(node.id)) {
                    node._collapsed = collapsedStates.get(node.id);
                }
            });
            this.mindmapView.updateMindmap();
        }
    }

    /**
     * @method exportMindMapAsImage
     * @description 将思维导图导出为 PNG 图像文件。
     */
    async exportMindMapAsImage() {
        try {
            const blob = await this._createMindMapImageBlob();
            if (blob) {
                // 创建下载链接并模拟点击
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mindmap.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed', error);
        }
    }

    /**
     * @method _buildMindMapAsSvg
     * @description 构建一个包含交互功能的思维导图 SVG。
     * 这个 SVG 文件内嵌了 JavaScript，允许用户在 SVG 查看器中折叠和展开节点。
     * @returns {string} 完整的 SVG 内容字符串。
     * @private
     */
    _buildMindMapAsSvg() {
        // 准备数据：深拷贝并展开所有节点
        const exportData = JSON.parse(JSON.stringify(this.mindmapView.mindMapData));
        const allNodes = [];
        const expandAllAndCollect = (node) => {
            node._collapsed = false;
            allNodes.push(node);
            if (node.children) {
                node.children.forEach(expandAllAndCollect);
            }
        };
        expandAllAndCollect(exportData);

        // 重新计算布局
        const traverseAndMeasure = (node) => {
            const textMetrics = this.mindmapView.renderer.measureText(node.text || ' ');
            node.width = textMetrics.width + 2 * this.mindmapView.NODE_PADDING_X;
            node.height = textMetrics.height + 2 * this.mindmapView.NODE_PADDING_Y;
            if (node.children) node.children.forEach(traverseAndMeasure);
        };
        traverseAndMeasure(exportData);
        exportData.x = this.mindmapView.mindMapData.x;
        exportData.y = this.mindmapView.mindMapData.y;
        this.mindmapView.layoutManager.autoLayout(exportData);

        // 计算 SVG 尺寸和 viewBox
        const bbox = this.mindmapView.viewportManager.calculateFullContentBounds(exportData, true);
        const padding = 50;
        const exportWidth = bbox.width + 2 * padding;
        const exportHeight = bbox.height + 2 * padding;
        const viewBox = `${bbox.x - padding} ${bbox.y - padding} ${exportWidth} ${exportHeight}`;

        // 获取所有需要的样式
        const styles = {
            node: this._getStyle('.node'),
            nodeRect: this._getStyle('.node-rect'),
            nodeRectRoot: this._getStyle('g[data-id="root"] .node-rect'),
            nodeText: this._getStyle('.node-text'),
            link: this._getStyle('.link'),
            toggleCircle: this._getStyle('.toggle-circle'),
            toggleCircleFillCollapsed: '#aaa',
            toggleCircleFill: '#f0f0f0',
            backgroundColor: getComputedStyle(this.mindmapView.svg).backgroundColor,
        };

        // 生成 SVG 的节点和链接部分
        let linksSvg = '';
        let nodesSvg = '';
        const escapeXml = (unsafe) => {
            if (typeof unsafe !== 'string') return '';
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case "'": return '&apos;';
                    case '"': return '&quot;';
                }
                return c;
            });
        };
        const escapeAttr = (unsafe) => {
            if (typeof unsafe !== 'string') return '';
            return unsafe.replace(/"/g, '&quot;');
        };

        const generateSvgStructure = (node) => {
            if (node.children && !node._collapsed) {
                node.children.forEach((child) => {
                    linksSvg += this._generateLinkPath(node, child, styles.link, escapeAttr);
                    generateSvgStructure(child);
                });
            }
            nodesSvg += this._generateNodeGroup(node, styles, escapeXml, escapeAttr);
        };

        generateSvgStructure(exportData);

        // 内嵌的 JavaScript 脚本，用于实现交互
        const scriptContent = `
            let mindMapData = ${JSON.stringify(exportData)};
            const curveType = '${this.mindmapView.currentCurveType}';
            const styles = ${JSON.stringify(styles)};

            function findNode(id, node = mindMapData) {
                if (node.id === id) return node;
                if (node.children) {
                    for (const child of node.children) {
                        const found = findNode(id, child);
                        if (found) return found;
                    }
                }
                return null;
            }

            function autoLayout(rootNode) {
                const verticalMargin = 60, horizontalMargin = 150;
                let y_pos = {};
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

            function generateLinkPath(source, target, style) {
                const sourceX = source.x + source.width / 2;
                const sourceY = source.y;
                const targetX = target.x - target.width / 2;
                const targetY = target.y;
                let d;
                switch (curveType) {
                    case 'straight': d = 'M' + sourceX + ',' + sourceY + ' L' + targetX + ',' + targetY; break;
                    case 'quadratic_mid_y_offset':
                        const midX_qmy = (sourceX + targetX) / 2;
                        let controlY_qmy = (sourceY + targetY) / 2 + (targetY > sourceY ? 30 : -30);
                        d = 'M' + sourceX + ',' + sourceY + ' Q' + midX_qmy + ',' + controlY_qmy + ' ' + targetX + ',' + targetY; break;
                    case 'cubic_original_horizontal':
                        const c_offset = 60;
                        d = 'M' + sourceX + ',' + sourceY + ' C' + (sourceX + c_offset) + ',' + sourceY + ' ' + (targetX - c_offset) + ',' + targetY + ' ' + targetX + ',' + targetY; break;
                    default:
                        const hbf = 0.4, vbf = 0.5;
                        const midX = (sourceX + targetX) / 2, midY = (sourceY + targetY) / 2;
                        const c1x = sourceX + (targetX - sourceX) * hbf, c1y = sourceY + (midY - sourceY) * vbf;
                        const c2x = targetX - (targetX - sourceX) * hbf, c2y = targetY - (targetY - midY) * vbf;
                        d = 'M' + sourceX + ',' + sourceY + ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + targetX + ',' + targetY; break;
                }
                return '<path class="link" data-source="' + source.id + '" data-target="' + target.id + '" d="' + d + '" style="' + style.replace(/"/g, '&quot;') + '" />';
            }

            function redraw() {
                autoLayout(mindMapData);
                const allNodes = [];
                const linkContainer = document.getElementById('links');
                linkContainer.innerHTML = '';

                function traverse(node) {
                    allNodes.push(node);
                    const nodeGroup = document.querySelector('g[data-id="' + node.id + '"]');
                    if (nodeGroup) {
                        nodeGroup.setAttribute('transform', 'translate(' + node.x + ', ' + node.y + ')');
                        const toggleCircle = nodeGroup.querySelector('.toggle-circle');
                        if (toggleCircle) {
                             toggleCircle.setAttribute('fill', node._collapsed ? styles.toggleCircleFillCollapsed : styles.toggleCircleFill);
                        }
                    }

                    if (node.children && !node._collapsed) {
                        node.children.forEach(child => {
                            linkContainer.innerHTML += generateLinkPath(node, child, styles.link);
                            traverse(child);
                        });
                    }
                }
                traverse(mindMapData);
                
                const allNodeElements = document.querySelectorAll('.node');
                const visibleNodeIds = new Set(allNodes.map(n => n.id));
                allNodeElements.forEach(el => {
                    const nodeId = el.dataset.id;
                    const shouldBeVisible = visibleNodeIds.has(nodeId);
                    el.style.display = shouldBeVisible ? '' : 'none';
                });
            }

            function toggleNode(nodeId) {
                const node = findNode(nodeId);
                if (node && node.children && node.children.length > 0) {
                    node._collapsed = !node._collapsed;
                    redraw();
                }
            }
        `;

        // 返回最终的 SVG 字符串
        return `<?xml version="1.0" standalone="no"?>
<svg width="${exportWidth}" height="${exportHeight}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" style="${escapeAttr(
            `background-color: ${styles.backgroundColor}`
        )}">
    <style>
        .node { transition: opacity 0.2s ease-in-out; }
        .node-text { user-select: none; text-anchor: middle; dominant-baseline: central; }
        .link { fill: none; }
        .toggle-circle { cursor: pointer; }
    </style>
    <g id="links">${linksSvg}</g>
    <g id="nodes">${nodesSvg}</g>
    <script type="text/javascript">
<![CDATA[
${scriptContent}
]]>
    </script>
</svg>`;
    }

    /**
     * @method exportMindMapAsSvg
     * @description 将思维导图导出为可交互的 SVG 文件。
     */
    exportMindMapAsSvg() {
        const finalSvg = this._buildMindMapAsSvg();
        const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * @method _getStyle
     * @description 获取指定 CSS 选择器的计算样式。
     * @param {string} selector - CSS 选择器。
     * @returns {string} 计算后的样式字符串。
     * @private
     */
    _getStyle(selector) {
        const elem = this.mindmapView.shadowRoot.querySelector(selector);
        if (!elem) return '';
        const computed = getComputedStyle(elem);
        const styleProperties = [
            'fill', 'stroke', 'stroke-width', 'font-size', 'font-family',
            'text-anchor', 'dominant-baseline', 'opacity', 'rx', 'ry',
        ];
        return styleProperties
            .map((prop) => `${prop}:${computed.getPropertyValue(prop)}`)
            .join(';');
    }

    /**
     * @method _generateLinkPath
     * @description 为两个节点之间的链接生成 SVG 路径数据。
     * @param {object} source - 源节点。
     * @param {object} target - 目标节点。
     * @param {string} style - 路径的样式字符串。
     * @param {function} escapeAttr - 用于转义属性的函数。
     * @returns {string} SVG 路径元素的字符串。
     * @private
     */
    _generateLinkPath(source, target, style, escapeAttr) {
        const sourceX = source.x + source.width / 2;
        const sourceY = source.y;
        const targetX = target.x - target.width / 2;
        const targetY = target.y;
        let d;
        // 根据当前的曲线类型生成不同的路径
        switch (this.mindmapView.currentCurveType) {
            case 'straight':
                d = `M${sourceX},${sourceY} L${targetX},${targetY}`;
                break;
            case 'quadratic_mid_y_offset':
                const midX_qmy = (sourceX + targetX) / 2;
                let controlY_qmy = (sourceY + targetY) / 2 + (targetY > sourceY ? 30 : -30);
                d = `M${sourceX},${sourceY} Q${midX_qmy},${controlY_qmy} ${targetX},${targetY}`;
                break;
            case 'cubic_original_horizontal':
                const c_offset = 60;
                d = `M${sourceX},${sourceY} C${sourceX + c_offset},${sourceY} ${
                    targetX - c_offset
                },${targetY} ${targetX},${targetY}`;
                break;
            default:
                const hbf = 0.4,
                    vbf = 0.5;
                const midX = (sourceX + targetX) / 2,
                    midY = (sourceY + targetY) / 2;
                const c1x = sourceX + (targetX - sourceX) * hbf,
                    c1y = sourceY + (midY - sourceY) * vbf;
                const c2x = targetX - (targetX - sourceX) * hbf,
                    c2y = targetY - (targetY - midY) * vbf;
                d = `M${sourceX},${sourceY} C${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
                break;
        }
        return `<path class="link" data-source="${source.id}" data-target="${
            target.id
        }" d="${d}" style="${escapeAttr(style)}" />`;
    }

    /**
     * @method _generateNodeGroup
     * @description 为单个节点生成 SVG 组元素。
     * @param {object} node - 节点数据。
     * @param {object} styles - 样式集合。
     * @param {function} escapeXml - 用于转义 XML 内容的函数。
     * @param {function} escapeAttr - 用于转义属性的函数。
     * @returns {string} SVG 组元素的字符串。
     * @private
     */
    _generateNodeGroup(node, styles, escapeXml, escapeAttr) {
        const isRoot = node.id === 'root';
        const rectStyle = isRoot ? `${styles.nodeRect};${styles.nodeRectRoot}` : styles.nodeRect;

        let toggleCircleSvg = '';
        // 如果节点有子节点，则添加一个折叠/展开按钮
        if (node.children && node.children.length > 0) {
            toggleCircleSvg = `<circle class="toggle-circle" cx="${
                node.width / 2
            }" cy="0" r="8" style="${escapeAttr(styles.toggleCircle)}" fill="${
                node._collapsed ? styles.toggleCircleFillCollapsed : styles.toggleCircleFill
            }" onclick="toggleNode('${node.id}')" />`;
        }

        return `
            <g class="node" data-id="${node.id}" transform="translate(${node.x}, ${
            node.y
        })" style="${escapeAttr(styles.node)}">
                <rect class="node-rect" x="${-node.width / 2}" y="${-node.height / 2}" width="${
            node.width
        }" height="${node.height}" style="${escapeAttr(rectStyle)}"></rect>
                <text class="node-text" style="${escapeAttr(styles.nodeText)}">${escapeXml(
            node.text
        )}</text>
                ${toggleCircleSvg}
            </g>
        `;
    }
}