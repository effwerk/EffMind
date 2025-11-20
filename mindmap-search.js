import{html as t,css as o}from"./common/lit.js";import n from"./common/MindmapBaseElement.js";import r from"./common/NodeTextManager.js";import{T as i}from"./common/LangManager.js";import"./common/svg-icon.js";class a extends n{static styles=o`
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
    `;static properties={mindmapView:{type:Object},hidden:{type:Boolean}};constructor(){super(),this.mindmapView=null,this.hidden=!0,this.nodeTextManager=new r}firstUpdated(){this.input=this.shadowRoot.querySelector("input"),this.input&&this.nodeTextManager.bind(this.input)}focus(){this.input.focus()}disconnectedCallback(){super.disconnectedCallback(),this.input&&this.nodeTextManager.unbind(input)}handleSearchInput(e){this.mindmapView&&this.mindmapView.highlightNodesByText(e.target.value)}_handleKeydown(e){e.key==="Enter"&&this.handleSearchInput(e),(e.key===" "||e.key==="Delete"||e.key==="Backspace"||e.key.startsWith("Arrow"))&&e.stopPropagation()}updated(e){if(super.updated(e),e.has("hidden")){if(this.hidden&&this.mindmapView?.highlightNodesByText){this.mindmapView.highlightNodesByText("");return}this.focus()}}render(){return t`
            <input
                type="search"
                name="keywords"
                placeholder=${i("Enter keywords...")}
                enterkeyhint="search"
                autocomplete="off"
                @input=${this.handleSearchInput}
                @keydown=${this._handleKeydown}
            />
            <button type="button" @click=${()=>this.dispatch("toggle-search")}>
                <svg-icon use="close"></svg-icon>
            </button>
        `}}customElements.define("mindmap-search",a);
