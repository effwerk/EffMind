import{html as u,css as g}from"./common/lit.js";import m from"./common/MindmapBaseElement.js";import v from"./mindmap-view/ImportExport.js";import f from"./mindmap-view/NodeEdit.js";import M from"./mindmap-view/Renderer.js";import w from"./mindmap-view/LayoutManager.js";import y from"./mindmap-view/ViewportManager.js";import x from"./mindmap-view/InteractionManager.js";import"./mindmap-context-menu.js";import"./node-quick-menu.js";import{T as E,ReactiveT as h}from"./common/LangManager.js";import{debounce as N,LongPressEvent as S}from"./common/Utils.js";import{getContextMenuItems as D}from"./contextMenuItems.js";class c extends m{static styles=g`
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
    `;static properties={mindMapData:{state:!0},selectedNodeId:{state:!0},currentCurveType:{state:!0},highlightedNodeIds:{state:!0},isContextMenuOpen:{state:!0},contextMenuItems:{state:!0},isTouch:{state:!0},isRootNodeModified:{state:!0},currentTheme:{state:!0}};constructor(){super(),this.NODE_PADDING_X=15,this.NODE_PADDING_Y=10,this.mindMapData={id:"root",text:"",children:[]},this.viewState={scale:1,panX:0,panY:0,minScale:.2,maxScale:3,svgWidth:0,svgHeight:0},this.selectedNodeId=null,this.currentCurveType="cubic_smooth_s",this.interactionState={},this.isSpacePressed=!1,this.isTextEditing=!1,this.isContextMenuOpen=!1,this.themeMediaQuery=null,this._boundApplySystemTheme=this._applySystemTheme.bind(this),this._nodeToFocus=null,this._nodeToPan=null,this.highlightedNodeIds=new Set,this.searchTerm="",this.importExport=new v(this),this.nodeEdit=new f(this),this.renderer=new M(this),this.layoutManager=new w(this),this.viewportManager=new y(this),this.interactionManager=new x(this),this.contextMenuItems=[],this.contextMenuElement=null,this._boundHandlePointerDownOutside=this._handlePointerDownOutside.bind(this),this._boundHandleResize=this.handleResize.bind(this),this.longPressManager=new S({duration:700,threshold:10}),this._longPressOccurred=!1,this._activePointers=new Map,this.isTouch=!1,this.isRootNodeModified=!1}_setupCoreTouchEventListeners(){const t=this.svg;if(!t)return;const n=(i,d,o,s)=>{this._activePointers.set(i,{x:d,y:o,pointerType:s})},e=i=>{this._activePointers.delete(i)};t.addEventListener("pointerdown",i=>{this.isTouch=i.pointerType==="touch",this.isTouch&&n(i.pointerId,i.clientX,i.clientY,i.pointerType)},{capture:!0}),this.longPressManager.bind(this,i=>{if(i.pointerType!=="touch"||this.isContextMenuOpen||this.isTextEditing||this._activePointers.size>1||this.interactionState.pinch)return;this._longPressOccurred=!0;const d=this.shadowRoot.elementFromPoint(i.clientX,i.clientY),o=d?d.closest(".node"):null,s=o?o.dataset.id:null;this.dispatch("mindmap-context-menu",{x:i.clientX,y:i.clientY,nodeId:s})}),document.addEventListener("click",i=>{this._longPressOccurred&&(i.preventDefault(),i.stopPropagation(),this._longPressOccurred=!1)},{capture:!0}),t.addEventListener("pointerup",i=>{i.pointerType==="touch"&&e(i.pointerId),this.interactionState.pinch&&this._activePointers.size<2&&(this.interactionState.pinch=!1)},{capture:!0}),t.addEventListener("pointercancel",i=>{i.pointerType==="touch"&&e(i.pointerId),this.interactionState.pinch&&this._activePointers.size<2&&(this.interactionState.pinch=!1)},{capture:!0}),t.addEventListener("pointerdown",i=>{this.isTextEditing&&(this.g.querySelector(".node-foreign-object")||(this.isTextEditing=!1))},{capture:!0}),t.addEventListener("pointermove",i=>{if(i.pointerType==="touch"){if(this._activePointers.has(i.pointerId)&&n(i.pointerId,i.clientX,i.clientY,i.pointerType),!this.interactionState.pinch&&this._activePointers.size>=2){this.interactionState.pinch=!0,this.interactionState.panning=!1,delete this.interactionState.startX,delete this.interactionState.startY,this.interactionState.dragging=!1,this.interactionState.draggedNodeId=null;const d=Array.from(this._activePointers.values()).slice(0,2),o=d[0],s=d[1];let a=Math.hypot(s.x-o.x,s.y-o.y);(!isFinite(a)||a<1e-4)&&(a=1e-4),this.interactionState.pinchStartDistance=a,this.interactionState.pinchStartScale=this.viewState.scale,this.interactionState.pinchCenter={x:(o.x+s.x)/2,y:(o.y+s.y)/2},this.interactionState.pinchStartPan={x:this.viewState.panX,y:this.viewState.panY}}if(this.interactionState.pinch&&this._activePointers.size>=2){i.preventDefault();const d=Array.from(this._activePointers.values()).slice(0,2),o=d[0],s=d[1],a=Math.hypot(s.x-o.x,s.y-o.y),r={x:(o.x+s.x)/2,y:(o.y+s.y)/2};this.viewportManager.handlePinch(this.interactionState.pinchStartDistance,a,this.interactionState.pinchStartScale,this.interactionState.pinchStartPan,this.interactionState.pinchCenter,r)}}})}async firstUpdated(){this.svg=this.shadowRoot.getElementById("MindmapSVG"),this.mindMapData.text=await h("Central Topic",t=>{this.mindMapData.text=t,this.updateMindmap()},()=>this.isRootNodeModified),this.g=document.createElementNS("http://www.w3.org/2000/svg","g"),this.svg.appendChild(this.g),this.mindMapData.x=this.svg.clientWidth/2,this.mindMapData.y=this.svg.clientHeight/2,this.viewportManager.updateView(),this.contextMenuElement=this.shadowRoot.querySelector("mindmap-context-menu"),this.interactionManager.setupEventListeners(),this._setupCoreTouchEventListeners(),this.addEventListener("mindmap-context-menu",this.handleContextMenu.bind(this)),this.addEventListener("viewport-changed",this.handleViewportChanged.bind(this)),window.addEventListener("resize",this._boundHandleResize),this.setupEventListeners(),this.updateMindmap(),this.dispatch("mindmap-ready")}async updated(t){if((t.has("mindMapData")||t.has("selectedNodeId")||t.has("currentCurveType")||t.has("highlightedNodeIds"))&&this.renderer.render(),this._nodeToFocus){const n=this._nodeToFocus;this._nodeToFocus=null,await this.updateComplete,this.viewportManager.centerViewportOnNode(n);const e=this.nodeEdit.findNode(n),i=this.g.querySelector(`.node[data-id="${n}"]`);e&&i&&this.nodeEdit.editNodeText(e,i)}else if(this._nodeToPan){const n=this._nodeToPan;this._nodeToPan=null,await this.updateComplete,this.viewportManager.centerViewportOnNode(n)}}setupEventListeners(){const t=this.nodeEdit,n=t.nodeTextManager;this.addEventListener("delete-node",e=>(e.stopPropagation(),this.nodeEdit.deleteSelectedNode(),this.dispatchMindmapNodeChange())),this.addEventListener("add-child-node",e=>(e.stopPropagation(),this.nodeEdit.addNode(),this.dispatchMindmapNodeChange())),this.addEventListener("add-sibling-node",e=>(e.stopPropagation(),this.nodeEdit.addSibling(),this.dispatchMindmapNodeChange())),this.addEventListener("copy-node",e=>(e.stopPropagation(),t.copyNode(),this.dispatchMindmapNodeChange())),this.addEventListener("cut-node",e=>(e.stopPropagation(),t.cutNode(),this.dispatchMindmapNodeChange())),this.addEventListener("paste-node",e=>(e.stopPropagation(),t.pasteNode(),this.dispatchMindmapNodeChange())),this.addEventListener("undo",e=>(e.stopPropagation(),t.undoNode(),this.dispatchMindmapNodeChange(),console.log("redoredoredo"))),this.addEventListener("redo",e=>(e.stopPropagation(),t.redoNode(),this.dispatchMindmapNodeChange(),console.log("redoredoredo"))),this.addEventListener("copy-text",e=>(e.stopPropagation(),n.copy(t.activeInput))),this.addEventListener("cut-text",e=>(e.stopPropagation(),n.cut(t.activeInput),this.dispatchMindmapNodeChange())),this.addEventListener("paste-text",e=>(e.stopPropagation(),n.paste(t.activeInput),this.dispatchMindmapNodeChange())),this.addEventListener("undo-text",e=>(e.stopPropagation(),n.undo(t.activeInput),this.dispatchMindmapNodeChange())),this.addEventListener("redo-text",e=>(e.stopPropagation(),n.redo(t.activeInput),this.dispatchMindmapNodeChange())),window.addEventListener("keydown",this.handleKeyDown.bind(this)),this.addEventListener("input",e=>{e.composedPath()[0].classList.contains("node-text-div")&&this.dispatchMindmapNodeChange()})}dispatchMindmapNodeChange=N(()=>this.dispatch("mindmap-node-change",{mindMapData:this.mindMapData}),300);handleKeyDown(t){const n=t.metaKey||t.ctrlKey,e=n&&t.key==="z"&&!t.shiftKey,i=n&&t.key==="z"&&t.shiftKey||n&&t.key==="y";if(e||i){t.preventDefault(),e&&this.nodeEdit.undoNode(),i&&this.nodeEdit.redoNode(),this.dispatchMindmapNodeChange();return}if(n&&["c","x","v"].includes(t.key)){t.preventDefault(),t.key==="c"&&this.nodeEdit.copyNode(),t.key==="x"&&(this.nodeEdit.cutNode(),this.dispatchMindmapNodeChange()),t.key==="v"&&(this.nodeEdit.pasteNode(),this.dispatchMindmapNodeChange());return}if(t.key===" "){if(this.selectedNodeId&&!this.isTextEditing&&!t.ctrlKey&&!t.metaKey&&!t.altKey){const s=this.nodeEdit.findNode(this.selectedNodeId),a=this.g.querySelector(`.node[data-id="${this.selectedNodeId}"]`);if(s&&a){t.preventDefault(),t.stopPropagation(),this.nodeEdit.editNodeText(s,a);return}}this.isSpacePressed=!0,t.preventDefault();return}if(!this.selectedNodeId){t.key.startsWith("Arrow")&&(t.preventDefault(),this.selectedNodeId="root",this._nodeToPan="root",this.requestUpdate());return}const d=this.nodeEdit.findNode(this.selectedNodeId);if(!d)return;let o=!1;switch(t.key){case"Tab":t.preventDefault(),this.nodeEdit.addNode(),this.dispatchMindmapNodeChange();break;case"Enter":t.preventDefault(),this.nodeEdit.addSibling(),this.dispatchMindmapNodeChange();break;case"Delete":case"Backspace":t.preventDefault(),this.nodeEdit.deleteSelectedNode(),this.dispatchMindmapNodeChange();break;case"ArrowUp":case"ArrowDown":{t.preventDefault();const s=this.nodeEdit.findParent(this.selectedNodeId);if(s){const a=s.children.findIndex(r=>r.id===this.selectedNodeId);t.key==="ArrowUp"&&a>0?(this.selectedNodeId=s.children[a-1].id,o=!0):t.key==="ArrowDown"&&a<s.children.length-1&&(this.selectedNodeId=s.children[a+1].id,o=!0)}break}case"ArrowLeft":{t.preventDefault();const s=this.nodeEdit.findParent(this.selectedNodeId);s&&(this.selectedNodeId=s.id,o=!0);break}case"ArrowRight":{t.preventDefault(),d.children?.length>0&&!d._collapsed&&(this.selectedNodeId=d.children[0].id,o=!0);break}}o&&(this._nodeToPan=this.selectedNodeId,this.requestUpdate())}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("resize",this._boundHandleResize),this.longPressManager.unbindAll()}_applySystemTheme(){const t=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",t?"dark":"light")}handleThemeChange(t){this.themeMediaQuery&&(this.themeMediaQuery.removeEventListener("change",this._boundApplySystemTheme),this.themeMediaQuery=null),t==="system"?(this.themeMediaQuery=window.matchMedia("(prefers-color-scheme: dark)"),this.themeMediaQuery.addEventListener("change",this._boundApplySystemTheme),this._applySystemTheme()):document.documentElement.setAttribute("data-theme",t),this.currentTheme=t}async handleContextMenu(t){t.preventDefault(),t.stopImmediatePropagation();const{x:n,y:e,nodeId:i}=t.detail,d=i?"node":"canvas";let o=!1,s=!1,a=!1;if(this.isTextEditing&&this.nodeEdit.activeInput){const r=this.nodeEdit.nodeTextManager.getHistoryState(this.nodeEdit.activeInput);o=r.canUndo,s=r.canRedo,a=await this.nodeEdit.nodeTextManager.canPaste()}else o=this.nodeEdit.nodeHistory.canUndo(),s=this.nodeEdit.nodeHistory.canRedo(),a=!!this.nodeEdit.clipboard?.data;this.contextMenuItems=D(E,d,i,this.isTextEditing,o,s,a),this.contextMenuElement.open(n,e),this.isContextMenuOpen=!0,window.addEventListener("pointerdown",this._boundHandlePointerDownOutside,{capture:!0})}_handlePointerDownOutside(t){this.contextMenuElement&&!t.composedPath().includes(this.contextMenuElement)&&this.contextMenuElement.close()}handleViewportChanged(){this.isContextMenuOpen&&this.contextMenuElement.close()}handleContextMenuClosed(){this.isContextMenuOpen=!1,window.removeEventListener("pointerdown",this._boundHandlePointerDownOutside,{capture:!0})}handleResize(){if(this.mindMapData===null)return;const t=this.viewState.panX,n=this.viewState.panY,e=this.viewState.scale,i=this.viewState.svgWidth,d=this.viewState.svgHeight;this.viewportManager.updateView();const o=this.viewState.svgWidth,s=this.viewState.svgHeight,a=(i/2-t)/e,r=(d/2-n)/e,p=o/2-a*e,l=s/2-r*e;this.viewportManager.setView({panX:p,panY:l}),this.updateMindmap()}updateMindmap(){if(!this.mindMapData){console.warn("updateMindmap called with null or undefined mindMapData. Aborting update.");return}const t=n=>{if(n.text&&n.text.trim()){const e=this.renderer.measureText(n.text,n);n.width=e.width+2*this.NODE_PADDING_X,n.height=e.height+2*this.NODE_PADDING_Y}else{const e=this.renderer.measureText("M",n);n.height=e.height+2*this.NODE_PADDING_Y,n.width=n.height}n.children&&n.children.forEach(t)};t(this.mindMapData),this.layoutManager.autoLayout(this.mindMapData),this._updateHighlight(),this.mindMapData=JSON.parse(JSON.stringify(this.mindMapData)),this.nodeEdit.nodeHistory.addState({data:this.mindMapData,selectedNodeId:this.selectedNodeId})}getMindMapRawData(t=!1){return JSON.stringify(this.importExport.getSavableData(t))}clearMindmap(){for(;this.g.firstChild;)this.g.removeChild(this.g.firstChild);this.mindMapData=null,this.selectedNodeId=null,this.highlightedNodeIds=new Set,this.nodeEdit.nodeHistory.clear(),this.isRootNodeModified=!1,this.viewState.panX=0,this.viewState.panY=0}async newMindmap(){this.clearMindmap(),this.mindMapData={id:"root",text:await h("Central Topic",t=>{this.mindMapData.text=t,this.updateMindmap()},()=>this.isRootNodeModified),children:[]},this.mindMapData.x=this.svg.clientWidth/2,this.mindMapData.y=this.svg.clientHeight/2,this.updateMindmap(),this.viewportManager.centerViewportOnNode("root"),this.dispatchMindmapNodeChange()}traverse(t,n){t&&(n(t),t.children&&t.children.forEach(e=>this.traverse(e,n)))}_updateHighlight(){if(!this.searchTerm){this.highlightedNodeIds.size>0&&(this.highlightedNodeIds=new Set);return}const t=new Set,n=this.searchTerm.trim().toLowerCase();if(n){const e=i=>{i.text&&i.text.toLowerCase().includes(n)&&t.add(i.id),i.children&&i.children.forEach(e)};e(this.mindMapData)}this.highlightedNodeIds=t}highlightNodesByText(t){this.searchTerm=t,this._updateHighlight(),this.renderer.render()}render(){return u`
            <svg id="MindmapSVG"></svg>
            <mindmap-context-menu
                .menuItems=${this.contextMenuItems}
                @context-menu-closed=${this.handleContextMenuClosed}
            ></mindmap-context-menu>
            <node-quick-menu
                .selectedNodeId=${this.selectedNodeId}
                ?hidden=${!this.isTouch}
            ></node-quick-menu>
        `}}customElements.define("mindmap-view",c);export{c as default};
