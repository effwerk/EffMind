class _{constructor(e){this.mindmapView=e}getSavableData(e=!1){const i=JSON.parse(JSON.stringify(this.mindmapView.mindMapData)),o=[i];for(;o.length>0;){const t=o.pop();t&&(delete t._collapsed,delete t.x,delete t.y,delete t.width,delete t.height,t.children&&o.push(...t.children))}const n={...this.mindmapView.viewState};return delete n.svgWidth,delete n.svgHeight,e||(delete n.panX,delete n.panY),{data:i,metadata:{view:n}}}exportMindMapFile({recordPan:e=!1}={}){const i=this.getMindMapRawData(e),o=new Blob([i],{type:"application/json"}),n=URL.createObjectURL(o),t=document.createElement("a");t.href=n,t.download="mindmap.mind",document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(n)}importMindMapFile(){const e=document.createElement("input");e.type="file",e.accept=".mind",e.onchange=i=>{const o=i.target.files[0];if(!o)return;const n=new FileReader;n.onload=t=>{this.mindmapView.nodeEdit.nodeHistory.clear();const r=t.target.result;this.loadRawData(r)},n.readAsText(o)},e.click()}getMindMapRawData({recordPan:e=!1}={}){return JSON.stringify(this.getSavableData(e))}loadRawData(e){let i;if(!e||e.trim()===""){this.mindmapView.newMindmap();return}else try{i=JSON.parse(e)}catch{this.mindmapView.dispatchEvent(new CustomEvent("file-read-error",{bubbles:!0,composed:!0}));return}this.mindmapView.dispatchEvent(new CustomEvent("file-read-success",{bubbles:!0,composed:!0}));const n=i.data&&i.metadata?i.metadata.view:null,t={scale:1,minScale:.2,maxScale:3},r=n?{scale:n.scale??t.scale,minScale:n.minScale??t.minScale,maxScale:n.maxScale??t.maxScale,panX:n.panX,panY:n.panY}:null;if(this.mindmapView.mindMapData=i&&i.data?i.data:i,(isNaN(this.mindmapView.mindMapData.x)||isNaN(this.mindmapView.mindMapData.y))&&(this.mindmapView.mindMapData.x=this.mindmapView.svg.clientWidth/2,this.mindmapView.mindMapData.y=this.mindmapView.svg.clientHeight/2),n)this.mindmapView.viewportManager.setView(r);else{const s={scale:t.scale,minScale:t.minScale,maxScale:t.maxScale};this.mindmapView.viewportManager.setView(s)}this.mindmapView.updateMindmap(),(!r||r.panX===void 0||r.panY===void 0)&&this.mindmapView.viewportManager.centerViewportOnNode("root"),this.mindmapView.dispatchMindmapNodeChange()}async _createMindMapImageBlob(){const e=this.mindmapView.selectedNodeId;this.mindmapView.selectedNodeId=null;const i=new Map;this.mindmapView.traverse(this.mindmapView.mindMapData,o=>{o.id&&i.set(o.id,o._collapsed),o._collapsed=!1}),this.mindmapView.updateMindmap(),await this.mindmapView.requestUpdate();try{const o=this.mindmapView.svg,n=this.mindmapView.viewportManager.calculateFullContentBounds(this.mindmapView.mindMapData,!0);if(n.width===0||n.height===0)return null;const t=50,r=n.width+2*t,s=n.height+2*t,l=3,h=r*l,g=s*l,c=document.createElementNS("http://www.w3.org/2000/svg","svg");c.setAttribute("width",r),c.setAttribute("height",s),c.setAttribute("viewBox",`${n.x-t} ${n.y-t} ${r} ${s}`),c.style.backgroundColor=getComputedStyle(o).backgroundColor;const m=this.mindmapView.g.cloneNode(!0);m.querySelectorAll(".toggle-circle").forEach(a=>a.remove()),[".node-rect",".node-text",".link",".collapse-button-text"].forEach(a=>{const d=this.mindmapView.g.querySelectorAll(a),p=m.querySelectorAll(a);d.length===p.length&&d.forEach((x,y)=>{const w=p[y],S=getComputedStyle(x),C=["fill","stroke","stroke-width","font-size","font-family","text-anchor","dominant-baseline","opacity","rx","ry"];let $="";for(const M of C)$+=`${M}: ${S.getPropertyValue(M)}; `;w.setAttribute("style",$)})}),m.removeAttribute("transform"),c.appendChild(m);let f=new XMLSerializer().serializeToString(c);return f='<?xml version="1.0" standalone="no"?>'+f,await new Promise((a,d)=>{const p=document.createElement("canvas");p.width=h,p.height=g;const x=p.getContext("2d"),y=new Image;y.onload=()=>{x.drawImage(y,0,0,h,g),p.toBlob(w=>{w?a(w):d(new Error("Canvas to Blob conversion failed."))},"image/png")},y.onerror=w=>{console.error("Error loading SVG into image:",w),d(w)},y.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(f)})}finally{this.mindmapView.selectedNodeId=e,this.mindmapView.traverse(this.mindmapView.mindMapData,o=>{o.id&&i.has(o.id)&&(o._collapsed=i.get(o.id))}),this.mindmapView.updateMindmap()}}async exportMindMapAsImage(){try{const e=await this._createMindMapImageBlob();if(e){const i=URL.createObjectURL(e),o=document.createElement("a");o.href=i,o.download="mindmap.png",document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(i)}}catch(e){console.error("Export failed",e)}}_buildMindMapAsSvg(){const e=JSON.parse(JSON.stringify(this.mindmapView.mindMapData)),i=[],o=a=>{a._collapsed=!1,i.push(a),a.children&&a.children.forEach(o)};o(e);const n=a=>{const d=this.mindmapView.renderer.measureText(a.text||" ");a.width=d.width+2*this.mindmapView.NODE_PADDING_X,a.height=d.height+2*this.mindmapView.NODE_PADDING_Y,a.children&&a.children.forEach(n)};n(e),e.x=this.mindmapView.mindMapData.x,e.y=this.mindmapView.mindMapData.y,this.mindmapView.layoutManager.autoLayout(e);const t=this.mindmapView.viewportManager.calculateFullContentBounds(e,!0),r=50,s=t.width+2*r,l=t.height+2*r,h=`${t.x-r} ${t.y-r} ${s} ${l}`,g={node:this._getStyle(".node"),nodeRect:this._getStyle(".node-rect"),nodeRectRoot:this._getStyle('g[data-id="root"] .node-rect'),nodeText:this._getStyle(".node-text"),link:this._getStyle(".link"),toggleCircle:this._getStyle(".toggle-circle"),toggleCircleFillCollapsed:"#aaa",toggleCircleFill:"#f0f0f0",backgroundColor:getComputedStyle(this.mindmapView.svg).backgroundColor};let c="",m="";const v=a=>typeof a!="string"?"":a.replace(/[<>&'"]/g,d=>{switch(d){case"<":return"&lt;";case">":return"&gt;";case"&":return"&amp;";case"'":return"&apos;";case'"':return"&quot;"}return d}),u=a=>typeof a!="string"?"":a.replace(/"/g,"&quot;"),f=a=>{a.children&&!a._collapsed&&a.children.forEach(d=>{c+=this._generateLinkPath(a,d,g.link,u),f(d)}),m+=this._generateNodeGroup(a,g,v,u)};f(e);const b=`
            let mindMapData = ${JSON.stringify(e)};
            const curveType = '${this.mindmapView.currentCurveType}';
            const styles = ${JSON.stringify(g)};

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
<svg width="${s}" height="${l}" viewBox="${h}" xmlns="http://www.w3.org/2000/svg" style="${u(`background-color: ${g.backgroundColor}`)}">
    <style>
        .node { transition: opacity 0.2s ease-in-out; }
        .node-text { user-select: none; text-anchor: middle; dominant-baseline: central; }
        .link { fill: none; }
        .toggle-circle { cursor: pointer; }
    </style>
    <g id="links">${c}</g>
    <g id="nodes">${m}</g>
    <script type="text/javascript">
<![CDATA[
${b}
]]>
    <\/script>
</svg>`}exportMindMapAsSvg(){const e=this._buildMindMapAsSvg(),i=new Blob([e],{type:"image/svg+xml;charset=utf-8"}),o=URL.createObjectURL(i),n=document.createElement("a");n.href=o,n.download="mindmap.svg",document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(o)}_getStyle(e){const i=this.mindmapView.shadowRoot.querySelector(e);if(!i)return"";const o=getComputedStyle(i);return["fill","stroke","stroke-width","font-size","font-family","text-anchor","dominant-baseline","opacity","rx","ry"].map(t=>`${t}:${o.getPropertyValue(t)}`).join(";")}_generateLinkPath(e,i,o,n){const t=e.x+e.width/2,r=e.y,s=i.x-i.width/2,l=i.y;let h;switch(this.mindmapView.currentCurveType){case"straight":h=`M${t},${r} L${s},${l}`;break;case"quadratic_mid_y_offset":const g=(t+s)/2;let c=(r+l)/2+(l>r?30:-30);h=`M${t},${r} Q${g},${c} ${s},${l}`;break;case"cubic_original_horizontal":const m=60;h=`M${t},${r} C${t+m},${r} ${s-m},${l} ${s},${l}`;break;default:const v=.4,u=.5,f=(t+s)/2,b=(r+l)/2,a=t+(s-t)*v,d=r+(b-r)*u,p=s-(s-t)*v,x=l-(l-b)*u;h=`M${t},${r} C${a},${d} ${p},${x} ${s},${l}`;break}return`<path class="link" data-source="${e.id}" data-target="${i.id}" d="${h}" style="${n(o)}" />`}_generateNodeGroup(e,i,o,n){const r=e.id==="root"?`${i.nodeRect};${i.nodeRectRoot}`:i.nodeRect;let s="";return e.children&&e.children.length>0&&(s=`<circle class="toggle-circle" cx="${e.width/2}" cy="0" r="8" style="${n(i.toggleCircle)}" fill="${e._collapsed?i.toggleCircleFillCollapsed:i.toggleCircleFill}" onclick="toggleNode('${e.id}')" />`),`
            <g class="node" data-id="${e.id}" transform="translate(${e.x}, ${e.y})" style="${n(i.node)}">
                <rect class="node-rect" x="${-e.width/2}" y="${-e.height/2}" width="${e.width}" height="${e.height}" style="${n(r)}"></rect>
                <text class="node-text" style="${n(i.nodeText)}">${o(e.text)}</text>
                ${s}
            </g>
        `}}export{_ as default};
