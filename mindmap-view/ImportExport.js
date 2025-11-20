class S{constructor(e){this.mindmapView=e}getSavableData(e=!1){const t=JSON.parse(JSON.stringify(this.mindmapView.mindMapData)),i=[t];for(;i.length>0;){const o=i.pop();o&&(delete o._collapsed,o.children&&i.push(...o.children))}const n={...this.mindmapView.viewState};return e||(delete n.panX,delete n.panY),{data:t,metadata:{view:n}}}exportMindMapFile({recordPan:e=!1}={}){const t=this.getMindMapRawData(e),i=new Blob([t],{type:"application/json"}),n=URL.createObjectURL(i),o=document.createElement("a");o.href=n,o.download="mindmap.mind",document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(n)}importMindMapFile(){const e=document.createElement("input");e.type="file",e.accept=".mind",e.onchange=t=>{const i=t.target.files[0];if(!i)return;const n=new FileReader;n.onload=o=>{this.mindmapView.nodeEdit.nodeHistory.clear();const r=o.target.result;this.loadRawData(r)},n.readAsText(i)},e.click()}getMindMapRawData({recordPan:e=!1}={}){return JSON.stringify(this.getSavableData(e))}loadRawData(e){let t;if(!e||e.trim()===""){this.mindmapView.newMindmap();return}else try{t=JSON.parse(e)}catch{this.mindmapView.dispatchEvent(new CustomEvent("file-read-error",{bubbles:!0,composed:!0}));return}this.mindmapView.dispatchEvent(new CustomEvent("file-read-success",{bubbles:!0,composed:!0}));const i=t.data&&t.metadata,n=i?t.metadata.view:null;this.mindmapView.mindMapData=i?t.data:t,(isNaN(this.mindmapView.mindMapData.x)||isNaN(this.mindmapView.mindMapData.y))&&(this.mindmapView.mindMapData.x=this.mindmapView.svg.clientWidth/2,this.mindmapView.mindMapData.y=this.mindmapView.svg.clientHeight/2),n&&this.mindmapView.viewportManager.setView(n),this.mindmapView.updateMindmap(),(!n||n.panX===void 0||n.panY===void 0)&&this.mindmapView.viewportManager.centerViewportOnNode("root"),this.mindmapView.dispatchMindmapNodeChange()}async _createMindMapImageBlob(){const e=this.mindmapView.selectedNodeId;this.mindmapView.selectedNodeId=null;const t=new Map;this.mindmapView.traverse(this.mindmapView.mindMapData,i=>{i.id&&t.set(i.id,i._collapsed),i._collapsed=!1}),this.mindmapView.updateMindmap(),await this.mindmapView.requestUpdate();try{const i=this.mindmapView.svg,n=this.mindmapView.viewportManager.calculateFullContentBounds(this.mindmapView.mindMapData,!0);if(n.width===0||n.height===0)return null;const o=50,r=n.width+2*o,s=n.height+2*o,d=3,h=r*d,m=s*d,l=document.createElementNS("http://www.w3.org/2000/svg","svg");l.setAttribute("width",r),l.setAttribute("height",s),l.setAttribute("viewBox",`${n.x-o} ${n.y-o} ${r} ${s}`),l.style.backgroundColor=getComputedStyle(i).backgroundColor;const g=this.mindmapView.g.cloneNode(!0);g.querySelectorAll(".toggle-circle").forEach(a=>a.remove()),[".node-rect",".node-text",".link",".collapse-button-text"].forEach(a=>{const c=this.mindmapView.g.querySelectorAll(a),p=g.querySelectorAll(a);c.length===p.length&&c.forEach(($,w)=>{const y=p[w],C=getComputedStyle($),_=["fill","stroke","stroke-width","font-size","font-family","text-anchor","dominant-baseline","opacity","rx","ry"];let x="";for(const M of _)x+=`${M}: ${C.getPropertyValue(M)}; `;y.setAttribute("style",x)})}),g.removeAttribute("transform"),l.appendChild(g);let f=new XMLSerializer().serializeToString(l);return f='<?xml version="1.0" standalone="no"?>'+f,await new Promise((a,c)=>{const p=document.createElement("canvas");p.width=h,p.height=m;const $=p.getContext("2d"),w=new Image;w.onload=()=>{$.drawImage(w,0,0,h,m),p.toBlob(y=>{y?a(y):c(new Error("Canvas to Blob conversion failed."))},"image/png")},w.onerror=y=>{console.error("Error loading SVG into image:",y),c(y)},w.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(f)})}finally{this.mindmapView.selectedNodeId=e,this.mindmapView.traverse(this.mindmapView.mindMapData,i=>{i.id&&t.has(i.id)&&(i._collapsed=t.get(i.id))}),this.mindmapView.updateMindmap()}}async exportMindMapAsImage(){try{const e=await this._createMindMapImageBlob();if(e){const t=URL.createObjectURL(e),i=document.createElement("a");i.href=t,i.download="mindmap.png",document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(t)}}catch(e){console.error("Export failed",e)}}_buildMindMapAsSvg(){const e=JSON.parse(JSON.stringify(this.mindmapView.mindMapData)),t=[],i=a=>{a._collapsed=!1,t.push(a),a.children&&a.children.forEach(i)};i(e);const n=a=>{const c=this.mindmapView.renderer.measureText(a.text||" ");a.width=c.width+2*this.mindmapView.NODE_PADDING_X,a.height=c.height+2*this.mindmapView.NODE_PADDING_Y,a.children&&a.children.forEach(n)};n(e),e.x=this.mindmapView.mindMapData.x,e.y=this.mindmapView.mindMapData.y,this.mindmapView.layoutManager.autoLayout(e);const o=this.mindmapView.viewportManager.calculateFullContentBounds(e,!0),r=50,s=o.width+2*r,d=o.height+2*r,h=`${o.x-r} ${o.y-r} ${s} ${d}`,m={node:this._getStyle(".node"),nodeRect:this._getStyle(".node-rect"),nodeRectRoot:this._getStyle('g[data-id="root"] .node-rect'),nodeText:this._getStyle(".node-text"),link:this._getStyle(".link"),toggleCircle:this._getStyle(".toggle-circle"),toggleCircleFillCollapsed:"#aaa",toggleCircleFill:"#f0f0f0",backgroundColor:getComputedStyle(this.mindmapView.svg).backgroundColor};let l="",g="";const b=a=>typeof a!="string"?"":a.replace(/[<>&'"]/g,c=>{switch(c){case"<":return"&lt;";case">":return"&gt;";case"&":return"&amp;";case"'":return"&apos;";case'"':return"&quot;"}return c}),u=a=>typeof a!="string"?"":a.replace(/"/g,"&quot;"),f=a=>{a.children&&!a._collapsed&&a.children.forEach(c=>{l+=this._generateLinkPath(a,c,m.link,u),f(c)}),g+=this._generateNodeGroup(a,m,b,u)};f(e);const v=`
            let mindMapData = ${JSON.stringify(e)};
            const curveType = '${this.mindmapView.currentCurveType}';
            const styles = ${JSON.stringify(m)};

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
        `;return`<?xml version="1.0" standalone="no"?>
<svg width="${s}" height="${d}" viewBox="${h}" xmlns="http://www.w3.org/2000/svg" style="${u(`background-color: ${m.backgroundColor}`)}">
    <style>
        .node { transition: opacity 0.2s ease-in-out; }
        .node-text { user-select: none; text-anchor: middle; dominant-baseline: central; }
        .link { fill: none; }
        .toggle-circle { cursor: pointer; }
    </style>
    <g id="links">${l}</g>
    <g id="nodes">${g}</g>
    <script type="text/javascript">
<![CDATA[
${v}
]]>
    <\/script>
</svg>`}exportMindMapAsSvg(){const e=this._buildMindMapAsSvg(),t=new Blob([e],{type:"image/svg+xml;charset=utf-8"}),i=URL.createObjectURL(t),n=document.createElement("a");n.href=i,n.download="mindmap.svg",document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(i)}_getStyle(e){const t=this.mindmapView.shadowRoot.querySelector(e);if(!t)return"";const i=getComputedStyle(t);return["fill","stroke","stroke-width","font-size","font-family","text-anchor","dominant-baseline","opacity","rx","ry"].map(o=>`${o}:${i.getPropertyValue(o)}`).join(";")}_generateLinkPath(e,t,i,n){const o=e.x+e.width/2,r=e.y,s=t.x-t.width/2,d=t.y;let h;switch(this.mindmapView.currentCurveType){case"straight":h=`M${o},${r} L${s},${d}`;break;case"quadratic_mid_y_offset":const m=(o+s)/2;let l=(r+d)/2+(d>r?30:-30);h=`M${o},${r} Q${m},${l} ${s},${d}`;break;case"cubic_original_horizontal":const g=60;h=`M${o},${r} C${o+g},${r} ${s-g},${d} ${s},${d}`;break;default:const b=.4,u=.5,f=(o+s)/2,v=(r+d)/2,a=o+(s-o)*b,c=r+(v-r)*u,p=s-(s-o)*b,$=d-(d-v)*u;h=`M${o},${r} C${a},${c} ${p},${$} ${s},${d}`;break}return`<path class="link" data-source="${e.id}" data-target="${t.id}" d="${h}" style="${n(i)}" />`}_generateNodeGroup(e,t,i,n){const r=e.id==="root"?`${t.nodeRect};${t.nodeRectRoot}`:t.nodeRect;let s="";return e.children&&e.children.length>0&&(s=`<circle class="toggle-circle" cx="${e.width/2}" cy="0" r="8" style="${n(t.toggleCircle)}" fill="${e._collapsed?t.toggleCircleFillCollapsed:t.toggleCircleFill}" onclick="toggleNode('${e.id}')" />`),`
            <g class="node" data-id="${e.id}" transform="translate(${e.x}, ${e.y})" style="${n(t.node)}">
                <rect class="node-rect" x="${-e.width/2}" y="${-e.height/2}" width="${e.width}" height="${e.height}" style="${n(r)}"></rect>
                <text class="node-text" style="${n(t.nodeText)}">${i(e.text)}</text>
                ${s}
            </g>
        `}}export{S as default};
