import { html, css, classMap } from './common/lit.js';
import MindmapBaseElement from './common/MindmapBaseElement.js';
import './common/svg-icon.js';
import { preventDoubleTapZoom } from './common/Utils.js';

class MindmapMenu extends MindmapBaseElement {
    static styles = css`
        :host {
            position: relative;
            display: inline-block;
            font-size: 14px;
            color: var(--menu-font-color);
        }
        [hidden] {
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
    `;

    static properties = {
        items: { type: Array },
        _hoverPath: { state: true },
        _isOpen: { state: true },

        itemsStatus: { type: Object },

        isMindmapGlobalDrag: { state: true },
    };

    constructor() {
        super();
        this.items = [];
        this._hoverPath = [];
        this._isOpen = false;
        this._handleDocumentClick = this._handleDocumentClick.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        preventDoubleTapZoom(this);
        document.addEventListener('click', this._handleDocumentClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this._handleDocumentClick);
    }

    _handleDocumentClick(event) {
        if (this._isOpen && !this.shadowRoot.contains(event.target)) {
            this._closeAllMenus();
        }
    }

    _toggleMainMenu(event) {
        event.stopPropagation();
        this._isOpen = !this._isOpen;
        this._hoverPath = [];
        this.classList.toggle('open', this._isOpen);
    }

    _closeAllMenus() {
        this._isOpen = false;
        this._hoverPath = [];
        this.classList.remove('open');
    }

    _handleItemClick(event, item) {
        event.stopPropagation();
        if (item.event) {
            this.dispatch(item.event, item.detail || {});
            this._closeAllMenus();
        }
    }

    _handleItemMouseEnter(path) {
        this._hoverPath = path;
    }

    _handleMenuMouseLeave() {
        this._hoverPath = [];
    }

    _renderMenuItems(items, parentPath) {
        if (!items) return '';

        return items.map((item, index) => {
            if (item.separator || item.group) {
                return html`<div class="separator"></div>`;
            }

            const currentPath = [...parentPath, index];
            const hasSubmenu = item.items && item.items.length > 0;

            const isSubmenuOpen =
                hasSubmenu &&
                this._hoverPath.length >= currentPath.length &&
                currentPath.every((val, i) => val === this._hoverPath[i]);
            const status = this.itemsStatus?.[item.statusKey];

            const isEnabled = typeof status?.isEnabled === 'function' && status.isEnabled(item);

            const itemClasses = {
                'menu-item': true,
                'has-submenu': hasSubmenu,
                'disabled': typeof status?.isDisabled === 'function' && status.isDisabled(item),
                'enabled': isEnabled && !Array.isArray(item.label),
            };

            let label = item.label;
            if (Array.isArray(item.label)) {
                label = isEnabled ? item.label[0] : item.label[1];
            }

            return html`
                <div
                    class="menu-item-wrapper"
                    @mouseenter=${() => this._handleItemMouseEnter(currentPath)}
                    ?hidden=${typeof status?.isHidden === 'function' && status.isHidden(item)}
                >
                    <div
                        class=${classMap(itemClasses)}
                        @click=${(e) => this._handleItemClick(e, item)}
                    >
                        ${item.icon ? html`<svg-icon use=${item.icon}></svg-icon>` : ''}
                        <span>${label}</span>
                        ${item.shortcut ? html`<span class="shortcut">${item.shortcut}</span>` : ''}

                        <svg-icon use="arrowRight" class="submenu-arrow"></svg-icon>
                    </div>
                    ${hasSubmenu
                        ? html`
                              <div class="submenu-container" ?hidden=${!isSubmenuOpen}>
                                  ${this._renderMenuItems(item.items, currentPath)}
                              </div>
                          `
                        : ''}
                </div>
            `;
        });
    }

    render() {
        return html`
            <button class="main-menu-button" @click=${this._toggleMainMenu}>
                <svg-icon use="menu"></svg-icon>
            </button>
            <div
                class="menu-container"
                ?hidden=${!this._isOpen}
                @mouseleave=${this._handleMenuMouseLeave}
            >
                ${this._renderMenuItems(this.items, [])}
            </div>
        `;
    }
}

customElements.define('mindmap-menu', MindmapMenu);
