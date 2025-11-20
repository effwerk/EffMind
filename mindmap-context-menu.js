import{html as i,css as d}from"./common/lit.js";import p from"./common/MindmapBaseElement.js";import"./common/svg-icon.js";import{preventDoubleTapZoom as c}from"./common/Utils.js";class a extends p{static styles=d`
        :host {
            display: block;
            position: fixed;
            z-index: 1000;
            background-color: var(--context-menu-bg, #fff);
            border: 1px solid var(--context-menu-border);
            border-radius: 4px;
            box-shadow: var(--context-menu-shadow);
            padding: 5px 0;
            min-width: 150px;
            font-size: 14px;
        }

        /* REFACTOR: 使用 hidden 属性来控制显示和隐藏 */
        :host([hidden]) {
            display: none;
        }

        ul {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        li {
            padding: 8px 15px;
            cursor: pointer;
            color: var(--context-menu-text);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        li:hover {
            background-color: var(--context-menu-hover-bg);
            color: var(--context-menu-hover-text);
        }

        li.disabled {
            color: var(--context-menu-shortcut-text);
            cursor: default;
            opacity: 0.6;
        }

        li.disabled:hover {
            background-color: transparent;
            color: var(--context-menu-shortcut-text);
        }

        li.separator {
            border-top: 1px solid var(--context-menu-separator);
            margin: 5px 0;
            padding: 0;
        }

        .shortcut {
            margin-left: auto;
            color: var(--context-menu-shortcut-text);
            font-size: 0.8em;
        }

        svg-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
    `;static properties={menuItems:{type:Array}};constructor(){super(),this.menuItems=[],this.hidden=!0}connectedCallback(){super.connectedCallback(),c(this)}open(e,t){this.hidden=!1,this.updateComplete.then(()=>{this._positionMenu(e,t)})}close(){this.hidden||(this.hidden=!0,this.dispatch("context-menu-closed"))}_handleMenuItemClick(e){e.disabled||(this.dispatch(e.event),this.close())}_positionMenu(e,t){this.updateComplete.then(()=>{const o=this.getBoundingClientRect(),n=window.innerWidth,l=window.innerHeight;let r=e,s=t;e+o.width>n&&(r=e-o.width),r<0&&(r=0),t+o.height>l&&(s=t-o.height),s<0&&(s=0),this.style.left=`${r}px`,this.style.top=`${s}px`})}render(){let e=null;return i`
            <ul @contextmenu=${t=>t.preventDefault()}>
                ${this.menuItems.map(t=>{if(t.hidden)return"";if(t.separator)return i`<li class="separator"></li>`;const o=e!==null&&t.group&&t.group!==e;return e=t.group,i`
                        ${o?i`<li class="separator"></li>`:""}
                        <li
                            class=${t.disabled?"disabled":""}
                            @pointerdown=${n=>{t.disabled||n.preventDefault()}}
                            @pointerup=${n=>{t.disabled?n.stopPropagation():this._handleMenuItemClick(t,n)}}
                        >
                            ${t.icon?i`<svg-icon use=${t.icon}></svg-icon>`:""}
                            <span>${t.label}</span>
                            ${t.shortcut?i`<span class="shortcut">${t.shortcut}</span>`:""}
                        </li>
                    `})}
            </ul>
        `}}customElements.define("mindmap-context-menu",a);export{a as default};
