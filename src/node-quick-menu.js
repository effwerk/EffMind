import { html, css } from './common/lit.js';
import MindmapBaseElement from './common/MindmapBaseElement.js';
import { T } from './common/LangManager.js';
import { preventDoubleTapZoom } from './common/Utils.js';

class NodeQuickMenu extends MindmapBaseElement {
    static styles = css`
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
    `;

    static properties = {
        selectedNodeId: { type: String },
    };

    constructor() {
        super();
        this.selectedNodeId = null;
    }

    get items() {
        return [
            {
                icon: 'deleteNode',
                event: 'delete-node',
                hidden: () => this.selectedNodeId === 'root' || this.selectedNodeId === null,
            },
            {
                icon: 'addChildNode',
                event: 'add-child-node',
                hidden: () => this.selectedNodeId === null,
            },
            {
                icon: 'addSiblingNode',
                event: 'add-sibling-node',
                hidden: () => this.selectedNodeId === 'root' || this.selectedNodeId === null,
            },
        ];
    }
    firstUpdated() {
        super.firstUpdated();
        preventDoubleTapZoom(this);
    }
    render() {
        return html`
            ${this.items.map(
                (item) => html`
                    <button
                        .hidden=${item.hidden && item.hidden()}
                        @click=${() => this.dispatch(item.event)}
                    >
                        <svg-icon use=${item.icon}></svg-icon>
                    </button>
                `
            )}
        `;
    }

    updated(changedProperties) {
        if (changedProperties.has('selectedNodeId')) {
            // 当 selectedNodeId 改变时，强制重新渲染以更新按钮的显示状态
            this.requestUpdate();
        }
    }
}

customElements.define('node-quick-menu', NodeQuickMenu);
