import{html as d,css as t}from"./common/lit.js";import o from"./common/MindmapBaseElement.js";import"./common/LangManager.js";import{preventDoubleTapZoom as n}from"./common/Utils.js";class i extends o{static styles=t`
        [hidden],
        :host([hidden]) {
            display: none;
        }
        :host {
            display: flex;
            position: fixed;
            right: 20px;
            top: 20px;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
            pointer-events: auto;
        }
        button {
            padding: 14px 16px;
            border-radius: 6px;
            border: none;
            background: var(--node-rect-fill, #fff);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
            color: var(--node-text-color, #222);
            cursor: pointer;
        }
        button:active {
            transform: translateY(1px);
        }
    `;static properties={selectedNodeId:{type:String}};constructor(){super(),this.selectedNodeId=null}get items(){return[{icon:"deleteNode",event:"delete-node",hidden:()=>this.selectedNodeId==="root"||this.selectedNodeId===null},{icon:"addChildNode",event:"add-child-node",hidden:()=>this.selectedNodeId===null},{icon:"addSiblingNode",event:"add-sibling-node",hidden:()=>this.selectedNodeId==="root"||this.selectedNodeId===null}]}firstUpdated(){super.firstUpdated(),n(this)}render(){return d`
            ${this.items.map(e=>d`
                    <button
                        .hidden=${e.hidden&&e.hidden()}
                        @click=${()=>this.dispatch(e.event)}
                    >
                        <svg-icon use=${e.icon}></svg-icon>
                    </button>
                `)}
        `}updated(e){e.has("selectedNodeId")&&this.requestUpdate()}}customElements.define("node-quick-menu",i);
