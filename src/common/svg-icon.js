import { LitElement, html, css } from './lit.js';
import { LRUCache } from './LRUCache.js';

/**
 * ================================================================
 * <svg-icon> —— 通用 SVG 图标组件
 * ================================================================
 *
 * 🔍 设计目标
 * ----------------------------------------------------------------
 * 1. 提供一个高性能、通用的 SVG 图标加载器。
 * 2. 仅使用 Lit.js 核心功能（无 unsafeSVG、无第三方依赖）。
 * 3. 使用 LRUCache 实现缓存管理，避免内存溢出。
 * 4. 保证图标内容可控、安全、可复用。
 *
 * 🧩 典型使用场景
 * ----------------------------------------------------------------
 * - 思维导图节点操作图标；
 * - 编辑器工具栏图标；
 * - 通用 UI 图标系统；
 * - 任何 Web 应用中需要动态加载 SVG 的场合。
 *
 * 📘 使用示例
 * ----------------------------------------------------------------
 * ```html
 * <!-- 在 HTML 中使用 -->
 * <style>
 *    svg-icon {
 *        color: #fff;
 *    }
 * </style>
 * <svg-icon use="addChildNode" size="24"></svg-icon>
 * <svg-icon use="deleteNode"></svg-icon>
 *
 * <!-- 在 JavaScript 中动态创建 -->
 * const icon = document.createElement('svg-icon');
 * icon.use = 'editNode';
 * icon.size = 28;
 * document.body.appendChild(icon);
 *
 * // 清空缓存
 * SvgIcon.clearCache();
 * ```
 *
 * 💾 性能特性
 * ----------------------------------------------------------------
 * - LRU 缓存上限：150 个图标（可在内部配置中调整）
 * - 超出上限时，自动移除最久未使用的图标；
 * - 图标加载成功后被解析为 DocumentFragment 模板；
 * - 复用克隆节点渲染（避免重复解析字符串）。
 */

// -------------------------------------------
// 1️⃣ 全局 LRU 缓存（限制缓存上限防止内存过大）
// -------------------------------------------
const svgCache = new LRUCache(150);
const currentDir = new URL('.', import.meta.url).href;

/**
 * SvgIcon
 * ==================================================
 * 通用 SVG 图标组件类定义
 */
export class SvgIcon extends LitElement {
    // ------------------------------------------------
    // 属性定义
    // ------------------------------------------------
    static properties = {
        /**
         * 图标名称（不含 `.svg` 后缀）
         * 对应路径：`/icons/{use}.svg`
         * 示例：use="deleteNode" → /icons/deleteNode.svg
         */
        use: { type: String },

        /**
         * 图标显示大小（单位：px）
         * 默认为 20px，可通过属性或 CSS 变量覆盖。
         */
        size: { type: Number },
    };

    // ------------------------------------------------
    // 样式定义
    // ------------------------------------------------
    static styles = css`
    :host {
        display: inline-flex;
        width: 20px;
        height: 20px;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        user-select: none;
        cursor: inherit;
    }
    svg {
        display: block;
        /* width: var(--svg-icon-width, 20px);
        height: var(--svg-icon-height, 20px); */
        width: 100%;
        height: 100%;
        fill: currentColor;
        pointer-events: none;
    }
  `;

    // ------------------------------------------------
    // 构造函数
    // ------------------------------------------------
    constructor() {
        super();
        /** @type {number} 图标默认尺寸 */
        this.size = 20;
    }

    // ------------------------------------------------
    // 生命周期：属性更新前钩子
    // ------------------------------------------------
    // willUpdate(changed) {
    //     // 若 size 变化，则更新 CSS 变量
    //     if (changed.has('size')) {
    //         this.style.setProperty('--icon-size', `${this.size}px`);
    //     }
    // }

    // ------------------------------------------------
    // 生命周期：属性更新后钩子
    // ------------------------------------------------
    async updated(changed) {
        // 当 use 发生变化时重新加载图标
        if (changed.has('use')) {
            await this._renderIcon();
        }
    }

    // ------------------------------------------------
    // 核心方法：加载并渲染 SVG 图标
    // ------------------------------------------------
    /**
     * 加载并渲染 SVG 图标内容。
     *
     * 流程：
     * 1️⃣ 若 use 为空 → 直接返回；
     * 2️⃣ 从缓存中获取已解析模板；
     * 3️⃣ 若缓存无此图标，则发起 fetch 请求；
     * 4️⃣ 提取 <svg> 片段并转换为 DocumentFragment；
     * 5️⃣ 存入 LRU 缓存；
     * 6️⃣ 克隆节点插入 shadowRoot 渲染。
     *
     * @private
     * @returns {Promise<void>}
     */
    async _renderIcon() {
        if (!this.use) return;

        // 1️⃣ 读取缓存
        let svgTemplate = svgCache.get(this.use);

        // 2️⃣ 若缓存中不存在，则发起网络请求加载
        if (!svgTemplate) {
            const url = `${currentDir}icons/${this.use}.svg`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const svgText = await response.text();

                // 提取出 <svg> 标签内容，防止加载到额外内容
                const safeSvg = svgText.match(/<svg[\s\S]*<\/svg>/)?.[0] ?? '';

                // 转换为可复用的模板节点（DocumentFragment）
                const template = document.createElement('template');
                template.innerHTML = safeSvg.trim();

                svgTemplate = template.content.cloneNode(true);

                // 存入缓存
                svgCache.set(this.use, svgTemplate);
            } catch (err) {
                console.warn(`[svg-icon] Failed to load icon: ${url}`, err);
                return;
            }
        }

        // 3️⃣ 渲染克隆节点（避免直接复用模板导致 DOM 共享）
        const root = this.shadowRoot;
        root.innerHTML = ''; // 清空旧内容
        root.appendChild(svgTemplate.cloneNode(true)); // 插入克隆节点
    }

    // ------------------------------------------------
    // 渲染函数（提供 slot 兼容性）
    // ------------------------------------------------
    render() {
        // 虽然主渲染逻辑在 _renderIcon() 中，
        // 仍提供 slot 以支持手动嵌入或备用内容。
        return html`<slot></slot>`;
    }

    // ------------------------------------------------
    // 静态方法：清空缓存
    // ------------------------------------------------
    /**
     * 清空图标缓存（用于手动内存管理）
     * 典型场景：
     * - 用户退出系统；
     * - 主题切换后图标需重新加载；
     * - 内存紧张时主动释放缓存。
     */
    static clearCache() {
        svgCache.clear();
        console.info('[svg-icon] cache cleared');
    }

    // ------------------------------------------------
    // 可选扩展接口：查看缓存状态
    // ------------------------------------------------
    /**
     * 获取当前缓存状态（只读）
     * @returns {Object} 缓存信息
     */
    static getCacheInfo() {
        return {
            size: svgCache.size,
            limit: svgCache.limit,
            keys: Array.from(svgCache.keys()),
        };
    }
}

// 注册自定义元素
customElements.define('svg-icon', SvgIcon);
