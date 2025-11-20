import { LitElement } from './lit.js';
import { LangManager } from './LangManager.js';

/**
 * @extends {LitElement}
 * @class MindmapBaseElement
 * @description 所有思维导图元素的基础类，提供通用功能。
 * 它扩展了 LitElement，这是一个用于创建快速、轻量级 Web 组件的基类。
 */
export default class MindmapBaseElement extends LitElement {
    /**
     * 用于分派自定义事件的简化方法。
     * 这是一个方便的方法，以简化自定义事件的创建和分派。
     * @param {string} eventName - 要分派的自定义事件的名称。
     * @param {object} detail - 要与事件一起传递的数据。默认为空对象。
     * @param {boolean} bubbles - 一个布尔值，指示事件是否通过 DOM 冒泡。默认为 true。
     * @param {boolean} composed - 一个布尔值，指示事件是否可以穿过影子 DOM 边界。默认为 true。
     */
    dispatch(eventName, detail = {}, bubbles = true, composed = true) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles,
            composed,
        });
        this.dispatchEvent(event);
    }
    connectedCallback() {
        super.connectedCallback();
        LangManager.subscribe(this);
    }

    disconnectedCallback() {
        LangManager.unsubscribe(this);
        super.disconnectedCallback();
    }
}