/**
 * Translator 类负责加载和处理单个语言包源。
 */
class Translator {
    /**
     * @param {string | null} source - 语言包文件的目录路径 (URL)。
     */
    constructor(source) {
        this.source = source; // 语言包目录，例如 "/langs"
        this.translations = {}; // 存储加载的翻译文本，例如 { "Hello": "你好" }
    }

    /**
     * 异步加载指定语言的翻译文件。
     * @param {string} lang - 语言代码，例如 "zh"。
     */
    async load(lang) {
        if (!this.source) return; // 如果没有设置源路径，则不执行任何操作
        try {
            const response = await fetch(`${this.source}/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.translations = await response.json();
        } catch (e) {
            // 如果加载失败（例如文件不存在），则清空翻译并发出警告
            this.translations = {};
            console.warn(`[LangManager] failed to load ${lang}.json from ${this.source}`, e);
        }
    }

    /**
     * 翻译函数，根据给定的 key 查找翻译文本，并支持变量替换。
     * @param {string} key - 要翻译的文本 key。
     * @param {Object.<string, string>} [params={}] - 用于替换模板字符串中变量的参数对象。
     * @returns {string} 翻译后的字符串。
     */
    T(key, params = {}) {
        // 如果 LangManager 尚未初始化，则返回空字符串以防止内容抖动。
        if (!LangManager._isInitialized) {
            return '';
        }

        const str = this.translations[key] ?? key;

        // “奇偶规则”实现:
        // 1. `@@` 被视为一个转义，输出一个`@`。
        // 2. `@{...}` 被视为一个变量。
        // 通过全局匹配这两个模式，可以自然地实现奇偶规则。
        const regex = /(@@)|@\{([^{}]+)\}/g;

        return str.replace(regex, (match, isAtAt, paramName) => {
            // 匹配到 "@@" (转义符)
            if (isAtAt) {
                return '@';
            }

            // 匹配到 @{...} (变量)
            if (paramName !== undefined) {
                if (params.hasOwnProperty(paramName)) {
                    return params[paramName];
                }
                return match; // 在参数中找不到变量，返回原文 e.g. "@{unfound_var}"
            }

            // 不应到达这里，但作为保险
            return match;
        });
    }
}

/**
 * LangManager 是一个单例，用于管理整个应用的国际化（i18n）。
 * 它负责初始化、切换语言、管理多个翻译源以及通知组件更新。
 */
export const LangManager = new (class extends EventTarget {
    constructor() {
        super();
        this.keyLang = 'en'; // 键的语言
        this.defaultLang = 'en'; // 默认语言
        this.currentLang = 'en'; // 当前语言
        this.subscribers = new Set(); // 存储订阅了语言变更的组件（使用 WeakRef）
        this._isInitialized = false; // 确保 init 方法只被调用一次
        this.whenInitialized = null; // 用于防止 init 被并发调用

        this.translators = new Map(); // 存储所有通过 setSource 创建的翻译器实例
        // 创建一个初始的全局翻译器。在 init 调用前，它不包含任何翻译源。
        this.globalTranslator = new Translator(null);
    }

    /**
     * 初始化 LangManager。应在应用启动时通过 await 调用一次。
     * @param {object} [options] - 初始化选项。
     * @param {string} [options.keyLang="en"] - 国际化 key 所使用的语言。
     * @param {string} [options.defaultLang] - 应用启动时默认显示的语言，如果未设置，则使用 keyLang。
     * @param {string | null} [options.source=null] - 全局翻译文件的目录路径。
     */
    async init({ keyLang = 'en', defaultLang, source = null } = {}) {
        if (this.whenInitialized) return this.whenInitialized;

        const logic = async () => {
            if (this._isInitialized) return;

            this.keyLang = keyLang;
            this.defaultLang = defaultLang || keyLang;
            this.currentLang = this.defaultLang;

            if (source) {
                this.globalTranslator.source = source;
                this.translators.set(source, this.globalTranslator);
            }

            if (this.currentLang !== this.keyLang) {
                await this._loadAll(this.currentLang);
            }

            document.documentElement.lang = this.currentLang;
            this._isInitialized = true;
            this.notify();
        };

        this.whenInitialized = logic();
        return this.whenInitialized;
    }

    /**
     * 根据路径获取或创建一个 Translator 实例，并将其缓存。
     * 此方法保持同步，供 setSource 使用。
     * @param {string} path - 语言包文件的目录路径。
     * @returns {Translator} Translator 实例。
     * @private
     */
    _getOrCreateTranslator(path) {
        if (!this.translators.has(path)) {
            const translator = new Translator(path);
            this.translators.set(path, translator);
            // 如果当前已设置了非 key 的语言，则为这个新的翻译器也加载相应的语言包
            if (this.currentLang !== this.keyLang) {
                // 异步加载，并在加载完成后通知所有组件更新。这可能导致局部闪烁，但不会阻塞 setSource。
                translator.load(this.currentLang).then(() => {
                    this.notify();
                });
            }
        }
        return this.translators.get(path);
    }

    /**
     * 为某个组件或模块设置一个独立的翻译源，并返回其专属的翻译函数。
     * @param {string} path - 该组件专属的语言包目录路径。
     * @returns {function(string, Object.<string, string>): string} 一个绑定到新翻译器的 T 函数。
     */
    setSource(path) {
        const translator = this._getOrCreateTranslator(path);
        // 返回绑定了该 translator 实例的 T 函数，确保 `this` 指向正确
        return translator.T.bind(translator);
    }

    /**
     * 加载所有已注册的翻译器的指定语言包。
     * @param {string} lang - 要加载的语言代码。
     * @private
     */
    async _loadAll(lang) {
        // 使用 Set 来确保每个 translator (即使是全局的) 只被加载一次
        const allTranslators = [this.globalTranslator, ...this.translators.values()];
        const uniqueTranslators = [...new Set(allTranslators)];
        await Promise.all(uniqueTranslators.map((t) => t.load(lang)));
    }

    /**
     * 订阅语言变更事件。被订阅的组件会在语言切换时收到通知。
     * @param {object} component - 要订阅的组件实例，通常是一个 LitElement。
     */
    subscribe(component) {
        // 使用 WeakRef 来避免内存泄漏。如果组件被垃圾回收，WeakRef 不会阻止它。
        this.subscribers.add(new WeakRef(component));

        // 如果在订阅时，初始化已经完成，则立即通知该组件更新。
        // 这可以防止组件错过在它被创建之前就已经发出的初始通知。
        if (this._isInitialized) {
            component.requestUpdate && component.requestUpdate();
        }
    }

    /**
     * 取消订阅。
     * @param {object} component - 要取消订阅的组件实例。
     */
    unsubscribe(component) {
        for (const ref of this.subscribers) {
            if (ref.deref() === component) {
                this.subscribers.delete(ref);
                break;
            }
        }
    }

    /**
     * 通知所有订阅者语言已发生变更。
     * 通常会调用组件的 `requestUpdate` 方法来触发重新渲染。
     */
    notify() {
        this.subscribers.forEach((ref) => {
            const component = ref.deref();
            if (component) {
                // 如果组件仍然存在，则调用其 requestUpdate 方法
                component.requestUpdate && component.requestUpdate();
            } else {
                // 如果组件已被垃圾回收，则从订阅者集合中移除
                this.subscribers.delete(ref);
            }
        });
    }

    /**
     * 设置当前应用的语言。
     * @param {string} lang - 要切换到的语言代码。
     */
    async setLang(lang) {
        this.currentLang = lang;
        if (lang === this.keyLang) {
            // 如果切换回 key 的语言，则清空所有翻译器的翻译数据
            const allTranslators = [this.globalTranslator, ...this.translators.values()];
            const uniqueTranslators = [...new Set(allTranslators)];
            uniqueTranslators.forEach((t) => (t.translations = {}));
        } else {
            // 否则，加载目标语言的语言包
            await this._loadAll(lang);
        }

        this.notify();
        this.dispatchEvent(new CustomEvent('change', { detail: { lang: this.currentLang } }));
    }
})();

/**
 * 导出的全局翻译函数 T。
 * 这是一个动态代理函数，它总是调用 `LangManager.globalTranslator` 上最新的 `T` 方法。
 * 这种设计解决了在 `init` 之后 `globalTranslator` 被替换导致外部 `T` 函数失效的问题。
 * @param {string} key - 要翻译的文本 key。
 * @param {Object.<string, string>} [params] - 用于替换模板字符串中变量的参数对象。
 * @returns {string} 翻译后的字符串。
 */
export const T = (key, params) => LangManager.globalTranslator.T(key, params);

/**
 * ReactiveT
 * ==================================================
 * 一个轻量级的“可响应翻译文本”工具。
 * 它基于 LangManager/T 函数实现：
 *  - 自动响应语言包更新
 *  - 支持占位符参数
 *  - 可选停止条件，自动取消监听，无需手动 destroy
 *
 * @param {string} key - 翻译的 key（T 函数第一个参数）。
 * @param {Object|Function} [optionsOrCallback] - 占位符对象（可选）或回调函数。
 * @param {Function} [maybeCallback] - 当 optionsOrCallback 为占位符对象时，变化回调函数 (newVal) => {}。
 * @param {Function} [maybeStopCondition] - 可选停止条件，返回 true 时停止热更新。
 *
 * @returns {string} currentValue - 当前翻译文本，直接可用。
 *
 * @example
 * // 最基本用法
 * const title = ReactiveT('Central Topic', newVal => {
 *     mindMapData.text = newVal;
 *     updateMindmap();
 * });
 * // title 直接就是当前翻译文本
 *
 * @example
 * // 使用占位符
 * const greeting = ReactiveT(
 *     'Hello, @{name}!',
 *     { name: 'Jia' },        // 占位符
 *     newVal => console.log(newVal), // 每次语言变化触发
 *     () => mindMapData.rootModified // 可选停止条件
 * );
 * console.log(greeting); // "Hello, Jia!"
 *
 * @example
 * // 当 stopCondition 返回 true 时，热更新停止
 * ReactiveT(
 *     'Central Topic',
 *     newVal => updateMindmap(newVal),
 *     () => mindMapData.rootModified
 * );
 * // 无需手动 destroy
 */
export async function ReactiveT(key, optionsOrCallback, maybeCallback, maybeStopCondition) {
    let options = {};
    let onChange;
    let stopCondition;
    // 等待初始化完成
    await LangManager.whenInitialized;

    // 判断传入参数类型
    if (typeof optionsOrCallback === 'function') {
        // 只有 key + 回调 + 停止条件 的情况
        onChange = optionsOrCallback;
        stopCondition = maybeCallback; // 如果存在，作为停止条件
    } else {
        // key + options + callback + stopCondition
        options = optionsOrCallback || {};
        onChange = maybeCallback;
        stopCondition = maybeStopCondition;
    }

    // 获取当前翻译文本
    let currentValue = T(key, options);

    // 监听语言变化
    const listener = () => {
        // 如果停止条件满足，直接返回
        if (stopCondition?.()) return;

        // 更新 currentValue
        currentValue = T(key, options);

        // 执行回调
        onChange?.(currentValue);
    };

    // 注册语言变化事件
    LangManager.addEventListener('change', listener);

    // 直接返回当前文本值
    return currentValue;
}
