import { html, css } from './common/lit.js';
import MindmapBaseElement from './common/MindmapBaseElement.js';
import './common/svg-icon.js';
import { preventDoubleTapZoom } from './common/Utils.js';
/**
 * @class MindmapContextMenu
 * @extends {MindmapBaseElement}
 * @description 一个“哑”的右键菜单UI组件，其显示/隐藏完全由父组件通过 open() 和 close() 方法控制。
 */
export default class MindmapContextMenu extends MindmapBaseElement {
    static styles = css`
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
    `;

    static properties = {
        menuItems: { type: Array },
    };

    constructor() {
        super();
        this.menuItems = [];
        // REFACTOR: 默认隐藏
        this.hidden = true;
    }

    connectedCallback() {
        super.connectedCallback();
        preventDoubleTapZoom(this);
    }

    /**
     * @REFACTOR: 新增 open 方法，由父组件调用以显示和定位菜单。
     * @param {number} x - 屏幕 x 坐标
     * @param {number} y - 屏幕 y 坐标
     */
    open(x, y) {
        this.hidden = false;
        this.updateComplete.then(() => {
            this._positionMenu(x, y);
        });
    }

    /**
     * @REFACTOR: 新增 close 方法，由父组件调用以隐藏菜单。
     */
    close() {
        if (!this.hidden) {
            this.hidden = true;
            // 派发一个关闭事件，父组件可以用来做一些清理工作。
            this.dispatch('context-menu-closed');
        }
    }

    /**
     * @REFACTOR: 移除了 firstUpdated, disconnectedCallback, _handleClickOutside 等方法。
     * 组件不再自己管理自己的关闭逻辑，完全由父组件控制。
     */

    _handleMenuItemClick(item) {
        // event.stopPropagation();
        if (item.disabled) return;

        // this.dispatch('context-menu-action', { actionId: item.actionId });

        this.dispatch(item.event);
        // 点击后立即关闭菜单
        this.close();
    }

    _positionMenu(x, y) {
        this.updateComplete.then(() => {
            const menuRect = this.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let finalX = x;
            let finalY = y;

            if (x + menuRect.width > viewportWidth) {
                finalX = x - menuRect.width;
            }
            if (finalX < 0) {
                finalX = 0;
            }

            if (y + menuRect.height > viewportHeight) {
                finalY = y - menuRect.height;
            }
            if (finalY < 0) {
                finalY = 0;
            }

            this.style.left = `${finalX}px`;
            this.style.top = `${finalY}px`;
        });
    }

    render() {
        let lastGroup = null;
        return html`
            <ul @contextmenu=${(e) => e.preventDefault()}>
                ${this.menuItems.map((item) => {
                    if (item.hidden) {
                        return '';
                    }
                    if (item.separator) {
                        return html`<li class="separator"></li>`;
                    }
                    const showSeparator =
                        lastGroup !== null && item.group && item.group !== lastGroup;
                    lastGroup = item.group;
                    return html`
                        ${showSeparator ? html`<li class="separator"></li>` : ''}
                        <li
                            class=${item.disabled ? 'disabled' : ''}
                            @pointerdown=${(e) => {
                                // 使用 pointerdown 替代 mousedown，并阻止默认行为。
                                // 这可以防止在点击菜单项时，菜单因为失去焦点而意外关闭。
                                if (!item.disabled) e.preventDefault();
                            }}
                            @pointerup=${(e) => {
                                // 使用 pointerup 替代 click 事件。
                                // 这解决了在 iOS PWA 环境下，第一次点击菜单项无响应（需要点击两次）的问题。
                                // pointerup 是一个更底层的事件，不像 click 事件那样容易在 PWA 中被“吞掉”。
                                if (item.disabled) {
                                    e.stopPropagation();
                                } else {
                                    this._handleMenuItemClick(item, e);
                                }
                            }}
                        >
                            ${item.icon ? html`<svg-icon use=${item.icon}></svg-icon>` : ''}
                            <span>${item.label}</span>
                            ${item.shortcut
                                ? html`<span class="shortcut">${item.shortcut}</span>`
                                : ''}
                        </li>
                    `;
                })}
            </ul>
        `;
    }
}

customElements.define('mindmap-context-menu', MindmapContextMenu);