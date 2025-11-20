import{html as s,css as o}from"./common/lit.js";import p from"./common/MindmapBaseElement.js";import"./mindmap-view.js";import"./mindmap-menu.js";import"./mindmap-minimap.js";import"./mindmap-search.js";import m from"./common/ComponentAPI.js";import{debounce as h}from"./common/Utils.js";import{T as d,LangManager as r}from"./common/LangManager.js";class l extends p{static styles=o`
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
    `;static properties={isMinimapHidden:{state:!0},isSearchHidden:{state:!0},isMenuhHidden:{state:!0},defaultLang:{state:!0},defaultCurveStyle:{state:!0},defaultTheme:{state:!0},menuItemsStatus:{type:Object}};constructor(){super(),this.mindmapView=null,this.minimap=null,this.langSource=null,this.getMenuItems=null,this.messageContent=null,this.defaultLang="zhs",this.currentMinimapState=this.isMinimapHidden=!1,this.isMinimapGlobalDrag=!0,this.isMenuhHidden=!1,this.isSearchHidden=!0,this.curveStyle="cubic_smooth_s",this.theme="system"}updateSetting(){}initSettings(){}initLangManager(){r.init({keyLang:"en",defaultLang:this.defaultLang,source:this.langSource})}firstUpdated(){this.mindmapView=this.shadowRoot.querySelector("mindmap-view"),this.minimap=this.shadowRoot.querySelector("mindmap-minimap"),this.setupEventListeners(),this.initLangManager(),this.mindmapView.handleThemeChange(this.theme),this.menuItemsStatus={minimap:{isEnabled:()=>!this.isMinimapHidden},minimapGlobalDrag:{isDisabled:()=>!1,isEnabled:()=>this.minimap.isGlobalDrag,isHidden:()=>this.isMinimapHidden},curveStyle:{isEnabled:e=>this.mindmapView.currentCurveType===e.detail.curveType},lang:{isEnabled:e=>r.currentLang===e.detail.lang},theme:{isEnabled:e=>this.mindmapView.currentTheme===e.detail.theme},undo:{isDisabled:()=>!this.mindmapView.nodeEdit.nodeHistory.canUndo()},redo:{isDisabled:()=>!this.mindmapView.nodeEdit.nodeHistory.canRedo()},copy:{isDisabled:()=>{if(!this.mindmapView.selectedNodeId)return!0}},cut:{isDisabled:()=>{if(!this.mindmapView.selectedNodeId||this.mindmapView.selectedNodeId==="root")return!0}},paste:{isDisabled:()=>this.mindmapView.selectedNodeId?!this.mindmapView.nodeEdit.clipboard?.data:!0}},m.watch(this,"minimap:isGlobalDrag",e=>{e.type==="value"&&(this.isMinimapGlobalDrag=e.value)}),this.initSettings()}disconnectedCallback(){super.disconnectedCallback(),m.unwatch(this,"minimap:isGlobalDrag")}setupEventListeners(){this.addEventListener("mindmap-zoom-in",()=>this.mindmapView.viewportManager.zoomIn()),this.addEventListener("mindmap-zoom-out",()=>this.mindmapView.viewportManager.zoomOut()),this.addEventListener("mindmap-reset-view",()=>this.mindmapView.viewportManager.resetView()),this.addEventListener("mindmap-center-view",()=>this.mindmapView.viewportManager.centerViewportOnNode("root")),this.addEventListener("mindmap-set-view",e=>this.mindmapView.viewportManager.setView(e.detail)),this.addEventListener("copy-node",e=>(e.stopPropagation(),this.mindmapView.dispatch("copy-node"))),this.addEventListener("cut-node",e=>(e.stopPropagation(),this.mindmapView.dispatch("cut-node"))),this.addEventListener("paste-node",e=>(e.stopPropagation(),this.mindmapView.dispatch("paste-node"))),this.addEventListener("undo",e=>(e.stopPropagation(),this.mindmapView.dispatch("undo"))),this.addEventListener("redo",e=>(e.stopPropagation(),this.mindmapView.dispatch("redo"))),this.addEventListener("mindmap-change-curve",e=>{this.mindmapView.currentCurveType=e.detail.curveType,this.updateSetting("curveStyle",e.detail.curveType)}),this.addEventListener("mindmap-export-file",()=>this.mindmapView.importExport.exportMindMapFile()),this.addEventListener("mindmap-import-file",()=>this.mindmapView.importExport.importMindMapFile()),this.addEventListener("mindmap-export-image",()=>this.mindmapView.importExport.exportMindMapAsImage()),this.addEventListener("mindmap-export-svg",()=>this.mindmapView.importExport.exportMindMapAsSvg()),this.addEventListener("toggle-theme",e=>{this.mindmapView.handleThemeChange(e.detail.theme),this.updateSetting("theme",e.detail.theme)}),this.addEventListener("change-lang",e=>{r.setLang(e.detail.lang),this.updateSetting("lang",e.detail.lang)}),this.addEventListener("toggle-minimap",()=>(this.currentMinimapState=this.isMinimapHidden=!this.isMinimapHidden,this.updateSetting("isMinimapHidden",this.currentMinimapState))),this.addEventListener("mindmap-toggle-drag-mode",()=>{this?.minimap&&(this.minimap.isGlobalDrag=!this.minimap.isGlobalDrag,this.updateSetting("isMinimapGlobalDrag",!this.minimap.isGlobalDrag))}),this.addEventListener("toggle-search",()=>this.isSearchHidden=!this.isSearchHidden),this.addEventListener("mindmap-ready",()=>{this?.minimap&&this.minimap.requestUpdate()}),this.addEventListener("node-focus",()=>{this?.minimap&&this.minimap.requestUpdate()}),this.addEventListener("viewport-changed",()=>{this?.minimap&&this.minimap.requestUpdate()}),window.addEventListener("keydown",this.handleKeyDown.bind(this)),this.addEventListener("file-read-error",this.handleMindmapFileReadError.bind(this)),this.addEventListener("mindmap-node-change",this.notifyDataChange),window.visualViewport.addEventListener("resize",()=>{const e=window.visualViewport.height;e<300?(this.isMenuhHidden=!0,this.isMinimapHidden=!0):e>=300&&(this.isMenuhHidden=!1,this.isMinimapHidden=this.currentMinimapState)}),this.addEventListener("expand-all-node",()=>this.mindmapView.nodeEdit.expand()),this.addEventListener("collapse-all-node",()=>this.mindmapView.nodeEdit.collapse())}handleMindmapFileReadSuccess(){this.isMenuhHidden=!1,this.isMinimapHidden=!1,this.messageContent=null,this.mindmapView.isRootNodeModified=!0,this.requestUpdate(),window.removeEventListener("keydown",this.handlerBlockEvents,!0),this.removeEventListener("file-read-success",this.handleMindmapFileReadSuccess)}async handleMindmapFileReadError(){this.messageContent||(this.mindmapView.clearMindmap(),this.isMenuhHidden=!0,this.isMinimapHidden=!0,this.handlerBlockEvents=e=>(e.stopImmediatePropagation(),e.preventDefault()),window.addEventListener("keydown",this.handlerBlockEvents,!0),this.handleMindmapFileReadSuccess=this.handleMindmapFileReadSuccess.bind(this),this.addEventListener("file-read-success",this.handleMindmapFileReadSuccess),this.messageContent=await this.getMessageContent(),this.requestUpdate())}async getMessageContent(){return s`
            <div>${d("Invalid File Content")}</div>
            <button type="button" @click=${()=>this.mindmapView.importExport.importMindMapFile()}>
                ${d("Select File Again")}
            </button>
        `}handleKeyDown(e){if(this.mindmapView.isContextMenuOpen||this.mindmapView.isTextEditing)return;const i=e.metaKey||e.ctrlKey;if(i&&e.key==="f"){e.preventDefault(),this.isSearchHidden=!1;return}if(i&&e.key==="1"){e.preventDefault(),this.mindmapView.viewportManager.setScale(1);return}if(i&&e.key==="2"){e.preventDefault(),this.mindmapView.viewportManager.setScale(2);return}}getPureDataText(e){if(!e)return"{}";function i(t){const a={id:t.id,text:t.text};return t.children&&t.children.length>0?a.children=t.children.map(i):a.children=[],a}const n=i(e);return JSON.stringify(n,null,2)}lastKnownPureDataText="";lastKnownFileContentText="";notifyDataChange=h(()=>{const e=this.getPureDataText(this.mindmapView.mindMapData);if(e!==this.lastKnownPureDataText){this.lastKnownPureDataText=e;const i=this.mindmapView.importExport.getSavableData(),n=JSON.stringify(i,null,2);this.lastKnownFileContentText=n,this.triggerUpdate(n)}},300);async triggerUpdate(e){}render(){return s`
            ${this.messageContent&&s`<message-overlay>${this.messageContent}</message-overlay>`}

            <mindmap-view></mindmap-view>
            <mindmap-menu
                .items=${this.getMenuItems(d)}
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
        `}}export{l as default};
