import{html as o,css as m,classMap as b}from"./common/lit.js";import g from"./common/MindmapBaseElement.js";import"./common/svg-icon.js";import{preventDoubleTapZoom as v}from"./common/Utils.js";class x extends g{static styles=m`
        :host {
            position: relative;
            display: inline-block;
            font-size: 14px;
            color: var(--menu-font-color);
        }

        :host([hidden]) {
            display: none !important;
        }
        ::-webkit-scrollbar {
            display: none;
        }

        button {
            all: unset;
            cursor: pointer;
            box-sizing: border-box;
        }

        .main-menu-button {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 34px;
            height: 34px;
            border-radius: 6px;
            background-color: var(--menu-button-bg-color);
        }
        .main-menu-button:hover,
        :host(.open) .main-menu-button {
            background-color: var(--menu-bg-color);
            transition: background-color 0.3s;
        }
        .main-menu-button svg-icon {
            color: var(--menu-button-icon-color);
            width: 30px;
            height: 30px;
        }

        .menu-container {
            position: absolute;
            z-index: 1;
            margin-top: 2px;
            border-radius: 6px;
            background-color: var(--menu-bg-color);
            border: 1px solid var(--menu-border-color);
            box-shadow: var(--menu-box-shadow);
            padding: 4px;
        }

        .menu-item-wrapper {
            position: relative;
        }

        .menu-item {
            display: flex;
            gap: 5px;
            align-items: center;
            padding: 10px 14px;
            border-radius: 4px;
            text-decoration: none;
            color: var(--menu-item-text-color);
            white-space: nowrap;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        /* .menu-item.has-submenu::after {
            content: '▶';
            font-size: 10px;
            margin-left: auto;
            padding-left: 10px;
        } */
        .menu-item.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
        .menu-item-wrapper:hover > .menu-item:not(.disabled) {
            background-color: var(--menu-item-hover-bg-color);
        }
        .menu-item.enabled {
            font-weight: 700;
        }
        .menu-item.enabled::before {
            content: '●';
            position: absolute;
            left: 4px;
            font-size: 6px;
        }

        .menu-item .shortcut {
            margin-left: auto;
            padding-left: 15px;
            color: #555555;
            font-size: 13px;
        }
        .menu-item svg-icon {
            width: 16px;
            height: 16px;
        }
        .menu-item svg-icon.submenu-arrow {
            display: none;
            margin-left: auto;
            padding-left: 10px;
        }
        .menu-item.has-submenu {
            padding-right: 0;
        }
        .menu-item.has-submenu svg-icon.submenu-arrow {
            display: block;
        }

        .submenu-container {
            position: absolute;
            left: calc(100% - 1px);
            top: -5px;
            z-index: 2;
            border-radius: 6px;
            background-color: var(--menu-bg-color);
            border: 1px solid var(--menu-border-color);
            box-shadow: var(--menu-box-shadow);
            overscroll-behavior: contain;
            padding: 4px;
        }

        .separator {
            height: 1px;
            background-color: var(--menu-border-color);
            margin: 4px 0;
        }

        .menu-container > .separator:first-child,
        .submenu-container > .separator:first-child {
            display: none;
        }

        .separator + .separator {
            display: none;
        }
    `;static properties={items:{type:Array},_hoverPath:{state:!0},_isOpen:{state:!0},itemsStatus:{type:Object},isMindmapGlobalDrag:{state:!0}};constructor(){super(),this.items=[],this._hoverPath=[],this._isOpen=!1,this._handleDocumentClick=this._handleDocumentClick.bind(this)}connectedCallback(){super.connectedCallback(),v(this),document.addEventListener("click",this._handleDocumentClick)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this._handleDocumentClick)}_handleDocumentClick(n){this._isOpen&&!this.shadowRoot.contains(n.target)&&this._closeAllMenus()}_toggleMainMenu(n){n.stopPropagation(),this._isOpen=!this._isOpen,this._hoverPath=[],this.classList.toggle("open",this._isOpen)}_closeAllMenus(){this._isOpen=!1,this._hoverPath=[],this.classList.remove("open")}_handleItemClick(n,s){n.stopPropagation(),s.event&&(this.dispatch(s.event,s.detail||{}),this._closeAllMenus())}_handleItemMouseEnter(n){this._hoverPath=n}_handleMenuMouseLeave(){this._hoverPath=[]}_renderMenuItems(n,s){return n?n.map((e,c)=>{if(e.separator||e.group)return o`<div class="separator"></div>`;const i=[...s,c],a=e.items&&e.items.length>0,d=a&&this._hoverPath.length>=i.length&&i.every((r,h)=>r===this._hoverPath[h]),t=this.itemsStatus?.[e.statusKey],l=typeof t?.isEnabled=="function"&&t.isEnabled(e),p={"menu-item":!0,"has-submenu":a,disabled:typeof t?.isDisabled=="function"&&t.isDisabled(e),enabled:l&&!Array.isArray(e.label)};let u=e.label;return Array.isArray(e.label)&&(u=l?e.label[0]:e.label[1]),o`
                <div
                    class="menu-item-wrapper"
                    @mouseenter=${()=>this._handleItemMouseEnter(i)}
                    ?hidden=${typeof t?.isHidden=="function"&&t.isHidden(e)}
                >
                    <div
                        class=${b(p)}
                        @click=${r=>this._handleItemClick(r,e)}
                    >
                        ${e.icon?o`<svg-icon use=${e.icon}></svg-icon>`:""}
                        <span>${u}</span>
                        ${e.shortcut?o`<span class="shortcut">${e.shortcut}</span>`:""}

                        <svg-icon use="arrowRight" class="submenu-arrow"></svg-icon>
                    </div>
                    ${a?o`
                              <div class="submenu-container" ?hidden=${!d}>
                                  ${this._renderMenuItems(e.items,i)}
                              </div>
                          `:""}
                </div>
            `}):""}render(){return o`
            <button class="main-menu-button" @click=${this._toggleMainMenu}>
                <svg-icon use="menu"></svg-icon>
            </button>
            <div
                class="menu-container"
                ?hidden=${!this._isOpen}
                @mouseleave=${this._handleMenuMouseLeave}
            >
                ${this._renderMenuItems(this.items,[])}
            </div>
        `}}customElements.define("mindmap-menu",x);
