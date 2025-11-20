
import { html, css } from './common/lit.js';
import MindmapBaseElement from './common/MindmapBaseElement.js';
import NodeTextManager from './common/NodeTextManager.js';
import { T } from './common/LangManager.js';
import './common/svg-icon.js';
/**
 * @class MindmapSearch
 * @extends {MindmapBaseElement}
 * @description 一个提供搜索输入框以在思维导图中高亮节点的组件。
 */
class MindmapSearch extends MindmapBaseElement {
    /**
     * @property {CSSResult} styles - 组件的样式。
     */
    static styles = css`
        :host {
            display: flex;
            align-items: center;
            gap: 6px;
            background-color: var(--search-bg-color);
            padding: 6px;
            border-radius: 6px;
        }
        :host([hidden]) {
            display: none;
        }
        input,
        button {
            -webkit-appearance: none;
            appearance: none;
            outline: none;
            padding: 0;
            margin: 0;
        }
        input {
            width: 200px;
            border-radius: 3px;
            padding: 6px 8px;
            font-family: inherit;
            border: 1px solid var(--search-input-border-color);
            transition: border-color 0.3s;
        }
        input:focus {
            border-color: var(--search-input-border-focus-color);
        }
        input::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            width: 0;
            margin: 0;
            padding: 0;
        }
        button {
            color: var(--search-close-button-color);
            border: none;
            padding: 2px;
            background-color: var(--search-close-bg-color);
            border-radius: 3px;
            transition: color 0.3s, background-color 0.3s;
            cursor: pointer;
        }
        button:hover {
            color: var(--search-close-button-hover-color);
            background-color: var(--search-close-bg-hover-color);
        }
    `;

    /**
     * @property {object} properties - 组件的属性。
     */
    static properties = {
        /**
         * @property {MindmapView} mindmapView - 对主思维导图视图组件的引用。
         */
        mindmapView: { type: Object },
        /**
         * @property {boolean} hidden - 控制搜索框的可见性。
         */
        hidden: { type: Boolean },
    };

    constructor() {
        super();
        this.mindmapView = null;
        this.hidden = true;
        /**
         * @property {NodeTextManager} nodeTextManager - 用于处理文本输入的 NodeTextManager 实例。
         */
        this.nodeTextManager = new NodeTextManager();
    }

    /**
     * @method firstUpdated
     * @description 在组件的模板第一次渲染后调用。
     * 将 NodeTextManager 绑定到搜索输入框。
     */
    firstUpdated() {
        this.input = this.shadowRoot.querySelector('input');
        if (this.input) {
            this.nodeTextManager.bind(this.input);
        }
    }

    /**
     * @method focus
     * @description 将焦点设置到搜索输入框。
     */
    focus() {
        this.input.focus();
    }

    /**
     * @method disconnectedCallback
     * @description 当元素从 DOM 中移除时调用。
     * 从搜索输入框解绑 NodeTextManager。
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.input) {
            this.nodeTextManager.unbind(input);
        }
    }

    /**
     * @method handleSearchInput
     * @description 处理搜索字段的输入事件。
     * 调用思维导图视图以根据搜索词高亮显示节点。
     * @param {InputEvent} e - 输入事件。
     */
    handleSearchInput(e) {
        if (this.mindmapView) {
            this.mindmapView.highlightNodesByText(e.target.value);
        }
    }

    /**
     * @method _handleKeydown
     * @description 处理搜索输入框的 keydown 事件。
     * 阻止某些按键事件传播到主思维导图视图。
     * @param {KeyboardEvent} e - keydown 事件。
     */
    _handleKeydown(e) {
        if (e.key === 'Enter') {
            this.handleSearchInput(e);
        }

        // 当按下空格、删除、退格或方向键时，阻止事件冒泡
        // 这样可以防止触发全局的键盘快捷键（如编辑节点、移动节点等）
        if (e.key === ' ' || e.key === 'Delete' || e.key === 'Backspace' || e.key.startsWith('Arrow')) {
            e.stopPropagation();
        }
    }

    /**
     * @method updated
     * @description 在组件的 DOM 更新后调用。
     * 当组件变为可见时，自动聚焦到输入框。
     * @param {Map} changedProperties - 已更改属性的映射。
     */
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('hidden')) {
            if (this.hidden && this.mindmapView?.highlightNodesByText) {
                this.mindmapView.highlightNodesByText('');
                return;
            }
            // 如果 hidden 属性从 true 变为 false，则聚焦输入框
            this.focus();
        }
    }

    /**
     * @method render
     * @description 渲染组件的 HTML。
     * @returns {TemplateResult} HTML 模板。
     */
    render() {
        return html`
            <input
                type="search"
                name="keywords"
                placeholder=${T('Enter keywords...')}
                enterkeyhint="search"
                autocomplete="off"
                @input=${this.handleSearchInput}
                @keydown=${this._handleKeydown}
            />
            <button type="button" @click=${() => this.dispatch('toggle-search')}>
                <svg-icon use="close"></svg-icon>
            </button>
        `;
    }
}

customElements.define('mindmap-search', MindmapSearch);
