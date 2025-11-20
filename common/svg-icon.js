import{LitElement as c,html as a,css as l}from"./lit.js";import{LRUCache as h}from"./LRUCache.js";const t=new h(150),u=new URL(".",import.meta.url).href;class d extends c{static properties={use:{type:String},size:{type:Number}};static styles=l`
    :host {
        display: inline-flex;
        width: 20px;
        height: 20px;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        user-select: none;
        cursor: inherit;
    }
    svg {
        display: block;
        /* width: var(--svg-icon-width, 20px);
        height: var(--svg-icon-height, 20px); */
        width: 100%;
        height: 100%;
        fill: currentColor;
        pointer-events: none;
    }
  `;constructor(){super(),this.size=20}async updated(e){e.has("use")&&await this._renderIcon()}async _renderIcon(){if(!this.use)return;let e=t.get(this.use);if(!e){const i=`${u}icons/${this.use}.svg`;try{const s=await fetch(i);if(!s.ok)throw new Error(`HTTP ${s.status}`);const o=(await s.text()).match(/<svg[\s\S]*<\/svg>/)?.[0]??"",r=document.createElement("template");r.innerHTML=o.trim(),e=r.content.cloneNode(!0),t.set(this.use,e)}catch(s){console.warn(`[svg-icon] Failed to load icon: ${i}`,s);return}}const n=this.shadowRoot;n.innerHTML="",n.appendChild(e.cloneNode(!0))}render(){return a`<slot></slot>`}static clearCache(){t.clear(),console.info("[svg-icon] cache cleared")}static getCacheInfo(){return{size:t.size,limit:t.limit,keys:Array.from(t.keys())}}}customElements.define("svg-icon",d);export{d as SvgIcon};
