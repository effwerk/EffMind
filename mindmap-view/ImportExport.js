class S{constructor(e){this.mindmapView=e}getSavableData(e=!1){const i=JSON.parse(JSON.stringify(this.mindmapView.mindMapData)),n=[i];for(;n.length>0;){const t=n.pop();t&&(delete t._collapsed,delete t.x,delete t.y,delete t.width,delete t.height,t.children&&n.push(...t.children))}const o={...this.mindmapView.viewState};return delete o.svgWidth,delete o.svgHeight,e||(delete o.panX,delete o.panY),{data:i,metadata:{view:o}}}exportMindMapFile({recordPan:e=!1}={}){const i=this.getMindMapRawData(e),n=new Blob([i],{type:"application/json"}),o=URL.createObjectURL(n),t=document.createElement("a");t.href=o,t.download="mindmap.mind",document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(o)}importMindMapFile(){const e=document.createElement("input");e.type="file",e.accept=".mind",e.onchange=i=>{const n=i.target.files[0];if(!n)return;const o=new FileReader;o.onload=t=>{this.mindmapView.nodeEdit.nodeHistory.clear();const r=t.target.result;this.loadRawData(r)},o.readAsText(n)},e.click()}getMindMapRawData({recordPan:e=!1}={}){return JSON.stringify(this.getSavableData(e))}loadRawData(e){let i;if(!e||e.trim()===""){this.mindmapView.newMindmap();return}else try{i=JSON.parse(e)}catch{this.mindmapView.dispatchEvent(new CustomEvent("file-read-error",{bubbles:!0,composed:!0}));return}this.mindmapView.dispatchEvent(new CustomEvent("file-read-success",{bubbles:!0,composed:!0}));const n=i.data&&i.metadata,o=n?i.metadata.view:null;this.mindmapView.mindMapData=n?i.data:i,(isNaN(this.mindmapView.mindMapData.x)||isNaN(this.mindmapView.mindMapData.y))&&(this.mindmapView.mindMapData.x=this.mindmapView.svg.clientWidth/2,this.mindmapView.mindMapData.y=this.mindmapView.svg.clientHeight/2),o&&this.mindmapView.viewportManager.setView(o),this.mindmapView.updateMindmap(),(!o||o.panX===void 0||o.panY===void 0)&&this.mindmapView.viewportManager.centerViewportOnNode("root"),this.mindmapView.dispatchMindmapNodeChange()}async _createMindMapImageBlob(){const e=this.mindmapView.selectedNodeId;this.mindmapView.selectedNodeId=null;const i=new Map;this.mindmapView.traverse(this.mindmapView.mindMapData,n=>{n.id&&i.set(n.id,n._collapsed),n._collapsed=!1}),this.mindmapView.updateMindmap(),await this.mindmapView.requestUpdate();try{const n=this.mindmapView.svg,o=this.mindmapView.viewportManager.calculateFullContentBounds(this.mindmapView.mindMapData,!0);if(o.width===0||o.height===0)return null;const t=50,r=o.width+2*t,s=o.height+2*t,d=3,h=r*d,m=s*d,c=document.createElementNS("http://www.w3.org/2000/svg","svg");c.setAttribute("width",r),c.setAttribute("height",s),c.setAttribute("viewBox",`${o.x-t} ${o.y-t} ${r} ${s}`),c.style.backgroundColor=getComputedStyle(n).backgroundColor;const g=this.mindmapView.g.cloneNode(!0);g.querySelectorAll(".toggle-circle").forEach(a=>a.remove()),[".node-rect",".node-text",".link",".collapse-button-text"].forEach(a=>{const l=this.mindmapView.g.querySelectorAll(a),p=g.querySelectorAll(a);l.length===p.length&&l.forEach(($,w)=>{const y=p[w],C=getComputedStyle($),_=["fill","stroke","stroke-width","font-size","font-family","text-anchor","dominant-baseline","opacity","rx","ry"];let x="";for(const M of _)x+=`${M}: ${C.getPropertyValue(M)}; `;y.setAttribute("style",x)})}),g.removeAttribute("transform"),c.appendChild(g);let f=new XMLSerializer().serializeToString(c);return f='<?xml version="1.0" standalone="no"?>'+f,await new Promise((a,l)=>{const p=document.createElement("canvas");p.width=h,p.height=m;const $=p.getContext("2d"),w=new Image;w.onload=()=>{$.drawImage(w,0,0,h,m),p.toBlob(y=>{y?a(y):l(new Error("Canvas to Blob conversion failed."))},"image/png")},w.onerror=y=>{console.error("Error loading SVG into image:",y),l(y)},w.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(f)})}finally{this.mindmapView.selectedNodeId=e,this.mindmapView.traverse(this.mindmapView.mindMapData,n=>{n.id&&i.has(n.id)&&(n._collapsed=i.get(n.id))}),this.mindmapView.updateMindmap()}}async exportMindMapAsImage(){try{const e=await this._createMindMapImageBlob();if(e){const i=URL.createObjectURL(e),n=document.createElement("a");n.href=i,n.download="mindmap.png",document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(i)}}catch(e){console.error("Export failed",e)}}_buildMindMapAsSvg(){const e=JSON.parse(JSON.stringify(this.mindmapView.mindMapData)),i=[],n=a=>{a._collapsed=!1,i.push(a),a.children&&a.children.forEach(n)};n(e);const o=a=>{const l=this.mindmapView.renderer.measureText(a.text||" ");a.width=l.width+2*this.mindmapView.NODE_PADDING_X,a.height=l.height+2*this.mindmapView.NODE_PADDING_Y,a.children&&a.children.forEach(o)};o(e),e.x=this.mindmapView.mindMapData.x,e.y=this.mindmapView.mindMapData.y,this.mindmapView.layoutManager.autoLayout(e);const t=this.mindmapView.viewportManager.calculateFullContentBounds(e,!0),r=50,s=t.width+2*r,d=t.height+2*r,h=`${t.x-r} ${t.y-r} ${s} ${d}`,m={node:this._getStyle(".node"),nodeRect:this._getStyle(".node-rect"),nodeRectRoot:this._getStyle('g[data-id="root"] .node-rect'),nodeText:this._getStyle(".node-text"),link:this._getStyle(".link"),toggleCircle:this._getStyle(".toggle-circle"),toggleCircleFillCollapsed:"#aaa",toggleCircleFill:"#f0f0f0",backgroundColor:getComputedStyle(this.mindmapView.svg).backgroundColor};let c="",g="";const v=a=>typeof a!="string"?"":a.replace(/[<>&'"]/g,l=>{switch(l){case"<":return"&lt;";case">":return"&gt;";case"&":return"&amp;";case"'":return"&apos;";case'"':return"&quot;"}return l}),u=a=>typeof a!="string"?"":a.replace(/"/g,"&quot;"),f=a=>{a.children&&!a._collapsed&&a.children.forEach(l=>{c+=this._generateLinkPath(a,l,m.link,u),f(l)}),g+=this._generateNodeGroup(a,m,v,u)};f(e);const b=`
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
    <g id="links">${c}</g>
    <g id="nodes">${g}</g>
    <script type="text/javascript">
<![CDATA[
${b}
]]>
    <\/script>
</svg>`}exportMindMapAsSvg(){const e=this._buildMindMapAsSvg(),i=new Blob([e],{type:"image/svg+xml;charset=utf-8"}),n=URL.createObjectURL(i),o=document.createElement("a");o.href=n,o.download="mindmap.svg",document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(n)}_getStyle(e){const i=this.mindmapView.shadowRoot.querySelector(e);if(!i)return"";const n=getComputedStyle(i);return["fill","stroke","stroke-width","font-size","font-family","text-anchor","dominant-baseline","opacity","rx","ry"].map(t=>`${t}:${n.getPropertyValue(t)}`).join(";")}_generateLinkPath(e,i,n,o){const t=e.x+e.width/2,r=e.y,s=i.x-i.width/2,d=i.y;let h;switch(this.mindmapView.currentCurveType){case"straight":h=`M${t},${r} L${s},${d}`;break;case"quadratic_mid_y_offset":const m=(t+s)/2;let c=(r+d)/2+(d>r?30:-30);h=`M${t},${r} Q${m},${c} ${s},${d}`;break;case"cubic_original_horizontal":const g=60;h=`M${t},${r} C${t+g},${r} ${s-g},${d} ${s},${d}`;break;default:const v=.4,u=.5,f=(t+s)/2,b=(r+d)/2,a=t+(s-t)*v,l=r+(b-r)*u,p=s-(s-t)*v,$=d-(d-b)*u;h=`M${t},${r} C${a},${l} ${p},${$} ${s},${d}`;break}return`<path class="link" data-source="${e.id}" data-target="${i.id}" d="${h}" style="${o(n)}" />`}_generateNodeGroup(e,i,n,o){const r=e.id==="root"?`${i.nodeRect};${i.nodeRectRoot}`:i.nodeRect;let s="";return e.children&&e.children.length>0&&(s=`<circle class="toggle-circle" cx="${e.width/2}" cy="0" r="8" style="${o(i.toggleCircle)}" fill="${e._collapsed?i.toggleCircleFillCollapsed:i.toggleCircleFill}" onclick="toggleNode('${e.id}')" />`),`
            <g class="node" data-id="${e.id}" transform="translate(${e.x}, ${e.y})" style="${o(i.node)}">
                <rect class="node-rect" x="${-e.width/2}" y="${-e.height/2}" width="${e.width}" height="${e.height}" style="${o(r)}"></rect>
                <text class="node-text" style="${o(i.nodeText)}">${n(e.text)}</text>
                ${s}
            </g>
        `}}export{S as default};
