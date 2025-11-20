/**
 * NodeTextManager
 * ==================================================
 * 用于管理多个输入框节点的文本操作（复制、剪切、粘贴、撤销、重做）以及逻辑剪贴板。
 *
 * @param {Object} [options={}] - 可选配置项。
 * @param {boolean} [options.allowRepeatPaste=false]
 *   是否允许剪切后的内容可以被多次粘贴。
 *   - `true`：剪切内容可多次粘贴（类似复制）。
 *   - `false`（默认）：剪切内容在首次粘贴后清空。
 * @param {number} [options.maxHistory=50]
 *   每个输入框的最大历史记录条数，用于撤销/重做操作。
 *
 * 使用示例：
 * ```js
 * const manager = new NodeTextManager({
 *   allowRepeatPaste: true,
 *   maxHistory: 100
 * });
 * ```
 */

export default class NodeTextManager {

    /** 静态逻辑剪贴板（所有实例共享） */
    static memoryClipboard = { text: null, lastActionWasCut: false };

    /**
     * 构造函数
     * @param {Object} [options={}] - 可选配置项。
     * @param {boolean} [options.allowRepeatPaste=false]
     *   是否允许剪切后的内容可以被多次粘贴。
     *   - `true`：剪切内容可多次粘贴（类似复制）。
     *   - `false`（默认）：剪切内容在首次粘贴后清空。
     * @param {number} [options.maxHistory=50]
     *   每个输入框的最大历史记录条数，用于撤销/重做操作。
     */
    constructor(options = {}) {
        const defaults = {
            allowRepeatPaste: false,
            maxHistory: 50
        };
        this.options = { ...defaults, ...options };

        /**
         * 存储每个绑定节点的状态
         * Map<HTMLElement, {history: string[], redoStack: string[], isComposing: boolean, listeners: Object}>
         */
        this.nodes = new Map();
    }

    /**
     * 绑定输入框，使其受 NodeTextManager 管理
     * @param {HTMLInputElement|HTMLTextAreaElement} input
     */
    bind(input) {
        if (!input || this.nodes.has(input)) return;

        const state = {
            history: [input.value],
            redoStack: [],
            isComposing: false,
            listeners: {}
        };

        this.nodes.set(input, state);

        // --- 输入事件（普通输入） ---
        const onInput = () => {
            if (!state.isComposing) this._pushHistory(input);
        };

        // --- 拼音输入支持 ---
        const onCompositionStart = () => { state.isComposing = true; };
        const onCompositionEnd = () => {
            state.isComposing = false;
            this._pushHistory(input);
        };

        // --- 快捷键处理 ---
        const onKeyDown = e => this._handleKeydown(e, input);

        // 绑定事件
        input.addEventListener('input', onInput);
        input.addEventListener('compositionstart', onCompositionStart);
        input.addEventListener('compositionend', onCompositionEnd);
        input.addEventListener('keydown', onKeyDown);

        // 保存事件引用以便解绑
        state.listeners = { onInput, onCompositionStart, onCompositionEnd, onKeyDown };
    }

    /**
     * 解除绑定，释放事件监听和内存引用
     * @param {HTMLInputElement|HTMLTextAreaElement} input
     */
    unbind(input) {
        const state = this.nodes.get(input);
        if (!state) return;

        const { onInput, onCompositionStart, onCompositionEnd, onKeyDown } = state.listeners;
        input.removeEventListener('input', onInput);
        input.removeEventListener('compositionstart', onCompositionStart);
        input.removeEventListener('compositionend', onCompositionEnd);
        input.removeEventListener('keydown', onKeyDown);

        this.nodes.delete(input);
    }

    /**
     * 处理快捷键操作
     */
    _handleKeydown(e, input) {
        const meta = e.ctrlKey || e.metaKey;
        if (!meta) return;
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                e.stopPropagation();
                e.shiftKey ? this.redo(input) : this.undo(input);
                break;
            case 'y':
                e.preventDefault();
                e.stopPropagation();
                this.redo(input);
                break;
            case 'c':
                e.preventDefault();
                e.stopPropagation();
                this.copy(input);
                break;
            case 'x':
                e.preventDefault();
                e.stopPropagation();
                this.cut(input);
                break;
            case 'v':
                e.preventDefault();
                e.stopPropagation();
                this.paste(input);
                break;
            case 'a':
                e.preventDefault();
                e.stopPropagation();
                input.select();
                break;
        }
    }

    /**
     * 将输入框当前值加入历史记录
     * @param {HTMLInputElement|HTMLTextAreaElement} input
     */
    _pushHistory(input) {
        const state = this.nodes.get(input);
        if (!state) return;

        const val = input.value;
        const last = state.history[state.history.length - 1];

        if (val !== last) {
            state.history.push(val);
            state.redoStack = [];

            // 超出最大历史记录，删除最旧的一条
            if (state.history.length > this.options.maxHistory) {
                state.history.shift();
            }
        }
    }

    /**
     * 撤销操作
     */
    undo(input) {
        const state = this.nodes.get(input);
        if (!state || state.history.length <= 1) return;

        const current = state.history.pop();
        state.redoStack.push(current);
        input.value = state.history[state.history.length - 1] || '';
        this._dispatchClipboardEvent();
        this._dispatchInputEvent(input);
    }

    /**
     * 重做操作
     */
    redo(input) {
        const state = this.nodes.get(input);
        if (!state || !state.redoStack.length) return;

        const redoValue = state.redoStack.pop();
        state.history.push(redoValue);
        input.value = redoValue;
        this._dispatchClipboardEvent();
        this._dispatchInputEvent(input);
    }

    /**
     * 复制选中文本到剪贴板
     */
    async copy(input) {
        const selected = input.value.substring(input.selectionStart, input.selectionEnd);
        NodeTextManager.memoryClipboard.text = selected;
        NodeTextManager.memoryClipboard.lastActionWasCut = false;

        try {
            await navigator.clipboard.writeText(selected);
        } catch (err) {
            // console.warn('系统剪贴板不可用，使用逻辑剪贴板。', err);
        }

        this._dispatchClipboardEvent();
    }

    /**
     * 剪切选中文本
     */
    async cut(input) {
        const selected = input.value.substring(input.selectionStart, input.selectionEnd);
        NodeTextManager.memoryClipboard.text = selected;
        NodeTextManager.memoryClipboard.lastActionWasCut = true;

        try {
            await navigator.clipboard.writeText(selected);
        } catch (err) {
            // console.warn('剪切时系统剪贴板写入失败，使用逻辑剪贴板。', err);
        }

        input.setRangeText('', input.selectionStart, input.selectionEnd, 'start');
        this._pushHistory(input);
        this._dispatchClipboardEvent();
        this._dispatchInputEvent(input);
    }

    /**
     * 粘贴逻辑剪贴板或系统剪贴板内容
     */
    async paste(input) {
        let textToPaste = null;

        try {
            // 优先使用系统剪贴板
            textToPaste = await navigator.clipboard.readText();
        } catch (err) {
            // 如果系统剪贴板失败，则使用逻辑剪贴板
            textToPaste = NodeTextManager.memoryClipboard.text;
        }

        // 如果回退到逻辑剪贴板，也再次检查一下
        if (textToPaste === null) {
            textToPaste = NodeTextManager.memoryClipboard.text;
        }

        // 如果没有任何内容可粘贴，则直接返回
        if (textToPaste === null) {
            return;
        }

        // 执行粘贴
        input.setRangeText(textToPaste, input.selectionStart, input.selectionEnd, 'end');
        this._pushHistory(input);

        // 如果是剪切操作且不允许重复粘贴，则在粘贴后清空剪贴板
        if (NodeTextManager.memoryClipboard.lastActionWasCut && !this.options.allowRepeatPaste) {
            NodeTextManager.memoryClipboard.text = null;
            NodeTextManager.memoryClipboard.lastActionWasCut = false; // 重置状态
        }

        this._dispatchClipboardEvent();
        this._dispatchInputEvent(input);
    }

    /**
     * 获取指定输入框的撤销/重做状态。
     * @param {HTMLInputElement|HTMLTextAreaElement} input
     * @returns {{canUndo: boolean, canRedo: boolean}}
     */
    getHistoryState(input) {
        const state = this.nodes.get(input);
        if (!state) return { canUndo: false, canRedo: false };
        return {
            canUndo: state.history.length > 1,
            canRedo: state.redoStack.length > 0
        };
    }

    /**
     * 判断当前是否可以执行粘贴操作。
     * @returns {boolean} 如果可以粘贴则为 true，否则为 false。
     */
    async canPaste() {
        try {
            const systemClipboardText = await navigator.clipboard.readText();
            if (systemClipboardText) {
                return true;
            }
        } catch (err) {
            // 无法访问系统剪贴板是正常情况，继续检查逻辑剪贴板
        }

        // 检查逻辑剪贴板是否有内容（不为 null）
        return NodeTextManager.memoryClipboard.text !== null;
    }


    /**
     * 派发剪贴板状态事件
     */
    _dispatchClipboardEvent() {
        const event = new CustomEvent('clipboardchange', {
            detail: {
                memoryText: NodeTextManager.memoryClipboard.text,
                lastActionWasCut: NodeTextManager.memoryClipboard.lastActionWasCut
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 派发输入事件，用于通知外部代码输入值已更改
     */
    _dispatchInputEvent(input) {
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    }
}