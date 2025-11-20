import{html as D,css as I,svg as v}from"./common/lit.js";import k from"./common/MindmapBaseElement.js";import M from"./common/ComponentAPI.js";import{preventDoubleTapZoom as E}from"./common/Utils.js";class P extends k{static styles=I`
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
    `;static properties={mindmapView:{type:Object},isGlobalDrag:{type:Boolean},_transformInfo:{state:!0},hidden:{type:Boolean}};constructor(){super(),this._isDragging=!1,this._transformInfo={scale:1,offsetX:0,offsetY:0},this.isGlobalDrag=!0,this.mindmapView=null,this.pointerDownStartX=0,this.pointerDownStartY=0,this.boundDragMove=this.handleDragMove.bind(this),this.boundDragEnd=this.handleDragEnd.bind(this),M.on(this,"minimap:isGlobalDrag",()=>this.isGlobalDrag,["isGlobalDrag"])}firstUpdated(){super.firstUpdated(),E(this)}disconnectedCallback(){super.disconnectedCallback(),M.cleanup(this),window.removeEventListener("pointermove",this.boundDragMove),window.removeEventListener("pointerup",this.boundDragEnd)}updated(t){super.updated(t),t.has("hidden")&&!this.hidden&&this.requestUpdate()}render(){if(!this.mindmapView||!this.mindmapView.mindMapData||!this.mindmapView.viewState||!this.mindmapView.viewportManager)return D`<svg id="minimap-svg"></svg>`;const t=this.mindmapView.viewportManager.calculateFullContentBounds();if(t.width===0)return D`<svg id="minimap-svg"></svg>`;const e=this.clientWidth,o=this.clientHeight,h=this.mindmapView.mindMapData.id==="root"&&(!this.mindmapView.mindMapData.children||this.mindmapView.mindMapData.children.length===0);let n=t;if(h){const c=t.width*3,w=t.height*3;n={width:c,height:w,x:t.x-(c-t.width)/2,y:t.y-(w-t.height)/2}}const s=Math.min(e/n.width,o/n.height)*.9,r=(e-n.width*s)/2-n.x*s,d=(o-n.height*s)/2-n.y*s;this._transformInfo={scale:s,offsetX:r,offsetY:d};const m=[],p=[],l=i=>{m.push(i),i.children&&!i._collapsed&&i.children.forEach(c=>{p.push({source:i,target:c}),l(c)})};l(this.mindmapView.mindMapData);const{viewState:a}=this.mindmapView,g=a.svgWidth/a.scale,b=a.svgHeight/a.scale,f=-a.panX/a.scale,u=-a.panY/a.scale;return D`
            <svg
                id="minimap-svg"
                @pointerdown=${this.handleMinimapPointerDown}
                @pointerup=${this.handleMinimapPointerUp}
                @pointerleave=${this.handlePointerLeaveMinimap}
            >
                ${v`
                    <g id="minimap-g" transform="translate(${r}, ${d}) scale(${s})">
                        ${p.map(i=>v`<path class="minimap-link" d="M${i.source.x},${i.source.y} L${i.target.x},${i.target.y}"></path>`)}
                        ${m.map(i=>{if(a.svgWidth>0&&a.svgHeight>0&&this.mindmapView.interactionState&&i.id===this.mindmapView.interactionState.draggedNodeId){const w=i.x-i.width/2,V=i.x+i.width/2,$=i.y-i.height/2,S=i.y+i.height/2,X=f,Y=f+g,y=u,x=u+b;if(!(w<Y&&V>X&&$<x&&S>y))return v``}return v`
                            <rect
                                data-id=${i.id}
                                class="minimap-node ${i.id==="root"?"root":""} ${i.id===this.mindmapView.selectedNodeId?"selected":""} ${this.mindmapView.highlightedNodeIds.has(i.id)?"highlight":""}"
                                x=${i.x-i.width/2}
                                y=${i.y-i.height/2}
                                width=${i.width}
                                height=${i.height}
                            ></rect>
                        `})}
                        <rect
                            class="minimap-viewport"
                            x=${f}
                            y=${u}
                            width=${g}
                            height=${b}
                            @pointerdown=${this.handleDragStart}
                        ></rect>
                    </g>
                `}
            </svg>
        `}handleDragStart(t){if(t.button!==0)return;t.stopPropagation(),this._isDragging=!0;const e=this.shadowRoot.querySelector(".minimap-viewport");e.style.cursor="grabbing";const o=e.getBoundingClientRect();this.dragOffsetX=t.clientX-o.left,this.dragOffsetY=t.clientY-o.top,this.isGlobalDrag&&e.setPointerCapture(t.pointerId),window.addEventListener("pointermove",this.boundDragMove),window.addEventListener("pointerup",this.boundDragEnd,{once:!0})}handleDragMove(t){if(!this._isDragging||!this.mindmapView.viewState)return;t.preventDefault();const{scale:e,offsetX:o,offsetY:h}=this._transformInfo,n=this.shadowRoot.getElementById("minimap-svg").getBoundingClientRect(),s=t.clientX-n.left,r=t.clientY-n.top,d=(s-this.dragOffsetX-o)/e,m=(r-this.dragOffsetY-h)/e,p=-d*this.mindmapView.viewState.scale,l=-m*this.mindmapView.viewState.scale;this.mindmapView.viewportManager.setView({panX:p,panY:l})}handleDragEnd(t){if(!this._isDragging)return;const e=this.shadowRoot.querySelector(".minimap-viewport");this.isGlobalDrag&&e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),this._isDragging=!1,e.style.cursor="grab",window.removeEventListener("pointermove",this.boundDragMove)}handlePointerLeaveMinimap(t){this._isDragging&&!this.isGlobalDrag&&this.handleDragEnd(t)}handleMinimapPointerDown(t){t.button===0&&(this.pointerDownStartX=t.clientX,this.pointerDownStartY=t.clientY)}handleMinimapPointerUp(t){const e=Math.abs(t.clientX-this.pointerDownStartX),o=Math.abs(t.clientY-this.pointerDownStartY);if(this._isDragging||e>5||o>5){this.handleDragEnd(t);return}if(!this.mindmapView.viewState)return;const h=this.shadowRoot.getElementById("minimap-svg").getBoundingClientRect(),n=t.clientX-h.left,s=t.clientY-h.top,{scale:r,offsetX:d,offsetY:m}=this._transformInfo,p=(n-d)/r,l=(s-m)/r,a=this.mindmapView.viewState.svgWidth/2-p*this.mindmapView.viewState.scale,g=this.mindmapView.viewState.svgHeight/2-l*this.mindmapView.viewState.scale;this.mindmapView.viewportManager.setView({panX:a,panY:g})}}customElements.define("mindmap-minimap",P);
