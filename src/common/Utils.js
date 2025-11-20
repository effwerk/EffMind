/**
 * 防抖函数（Debounce）
 * @param {Function} fn - 需要防抖执行的函数
 * @param {number} [wait=300] - 延迟执行时间（毫秒）
 * @param {boolean} [immediate=false] - 是否在第一次触发时立即执行
 * @returns {Function} 包装后的函数，附带 cancel() 方法
 *
 * const onInput = debounce((value) => {
 *   console.log('搜索：', value);
 *   // 比如发起请求：
 *   // fetch(`/api/search?q=${encodeURIComponent(value)}`);
 * }, 500);
 *
 * document.querySelector('input').addEventListener('input', (e) => {
 *   onInput(e.target.value);
 * });
 *
 * // 可随时取消防抖执行：
 * // onInput.cancel();
 *
 */
export function debounce(fn, wait = 300, immediate = false) {
    let timer = null;

    const debounced = function (...args) {
        const context = this;

        // 如果存在定时器，清除旧的等待任务
        if (timer) clearTimeout(timer);

        if (immediate) {
            // 立即执行模式：第一次触发立即执行，之后 wait 时间内不再触发
            const callNow = !timer;
            timer = setTimeout(() => (timer = null), wait);
            if (callNow) fn.apply(context, args);
        } else {
            // 普通模式：等待用户停止操作 wait 毫秒后再执行
            timer = setTimeout(() => {
                fn.apply(context, args);
                timer = null;
            }, wait);
        }
    };

    /**
     * 取消等待中的执行
     * 示例：
     *   const search = debounce(fn, 500);
     *   search.cancel(); // 手动取消等待中的任务
     */
    debounced.cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    return debounced;
}

/**
 * 节流函数（Throttle）
 * @param {Function} fn - 需要节流执行的函数
 * @param {number} [wait=200] - 最小执行间隔（毫秒）
 * @param {boolean} [trailing=true] - 是否允许最后一次延后执行
 * @returns {Function} 包装后的节流函数
 *
 * const onScroll = throttle(() => {
 *   console.log('滚动触发');
 * }, 200);
 *
 * window.addEventListener('scroll', onScroll);
 *
 * // 节流可用于按钮防连点：
 * // const handleClick = throttle(() => console.log('点击一次'), 1000);
 * // button.addEventListener('click', handleClick);
 *
 */
export function throttle(fn, wait = 200, trailing = true) {
    let last = 0;
    let timer = null;

    return function (...args) {
        const context = this;
        const now = Date.now();
        const remaining = wait - (now - last);

        // 若已超过间隔时间，立即执行
        if (remaining <= 0) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            last = now;
            fn.apply(context, args);
        }
        // 否则若允许 trailing 且尚未设置定时器，则延迟执行
        else if (trailing && !timer) {
            timer = setTimeout(() => {
                last = Date.now();
                timer = null;
                fn.apply(context, args);
            }, remaining);
        }
    };
}

/**
 * LongPressEvent 类
 * ---------------------------------
 * - Pointer Events（触屏 / 鼠标 / 触控笔）
 * - 微小移动容差，防止轻微抖动导致长按失败
 * - 与单击、双击共存，不破坏 click / dblclick
 * - 双击第二次按下时自动忽略长按触发
 * - 提供 cancel() 方法，用于解决手势冲突（例如，在 pinch-to-zoom 开始时取消长按）
 */
/* --------------------------------------------
使用示例（注释形式）
--------------------------------------------

import { LongPressEvent } from './LongPressEvent.js';

// 创建实例
const longPressManager = new LongPressEvent({
    duration: 600,          // 长按触发时间：600ms
    threshold: 12,          // 允许微小移动：12px
    doubleClickDelay: 250   // 双击间隔：250ms（第二次点击不会触发长按）
});

// 获取目标元素
const btn = document.getElementById("myButton");

// 绑定长按事件
const unbind = longPressManager.bind(btn, (e) => {
    console.log("🔥 长按触发！", e.type);
});

// 在其他手势（如缩放）开始时，可以强制取消长按，避免冲突
// mindmapView.on('pinchstart', () => longPressManager.cancel());

// 单击 / 双击事件仍可正常使用
btn.addEventListener("click", () => console.log("✅ 单击"));
btn.addEventListener("dblclick", () => console.log("✅ 双击"));

// 可选：稍后手动解绑
setTimeout(() => {
    unbind();
    console.log("🧹 已解绑长按事件");
}, 5000);

--------------------------------------------
结果说明：
--------------------------------------------
✅ 单击事件 —— 正常触发
✅ 双击事件 —— 正常触发（第二次不会误触长按）
✅ 长按事件 —— 按住超过 600ms 且未移动超出 12px 即触发
--------------------------------------------
*/
export class LongPressEvent {
    /**
     * 构造函数：初始化长按事件管理器
     * @param {Object} options - 配置选项
     * @param {number} [options.duration=500] - 长按被识别所需的时间（毫秒）。
     * @param {number} [options.threshold=10] - 手指/鼠标在按下后可以移动的最大距离（像素），超过此距离则取消长按。
     * @param {number} [options.doubleClickDelay=250] - 用于区分单击和双击的时间窗口（毫秒）。在此时间内开始的第二次点击不会触发长按。
     */
    constructor({ duration = 500, threshold = 10, doubleClickDelay = 250 } = {}) {
        this.duration = duration; // 长按时长
        this.threshold = threshold; // 移动阈值
        this.doubleClickDelay = doubleClickDelay; // 双击延迟
        this.bindings = new Map(); // 存储所有绑定的元素及其解绑函数
        this.activeTimer = null; // 当前激活的计时器ID，用于在需要时取消长按
    }

    /**
     * 强制取消任何正在等待中的长按计时器。
     * 这是一个关键方法，用于解决手势冲突。例如，当检测到双指缩放（pinch）手势开始时，
     * 应立即调用此方法，以防止缩放操作被错误地识别为长按。
     */
    cancel() {
        if (this.activeTimer) {
            clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
    }

    /**
     * 为指定元素绑定长按事件。
     * @param {HTMLElement} el - 需要绑定长按事件的DOM元素。
     * @param {Function} onLongPress - 长按事件触发时执行的回调函数。
     * @returns {Function} - 返回一个函数，调用该函数可以解绑此事件。
     */
    bind(el, onLongPress) {
        let startX = 0, // 按下时的初始X坐标
            startY = 0; // 按下时的初始Y坐标
        let lastClickTime = 0; // 上次点击（抬起）的时间戳

        // `pointerdown` 事件处理函数
        const start = (e) => {
            // 开始新的长按检测前，先取消任何可能存在的旧计时器
            this.cancel();

            // 检查是否在双击时间窗口内，如果是，则不启动长按计时，以避免双击时误触
            const now = Date.now();
            if (now - lastClickTime < this.doubleClickDelay) {
                return;
            }

            // 记录按下的初始位置
            startX = e.clientX;
            startY = e.clientY;

            // 设置一个计时器，如果在指定时长内没有被取消，则触发长按事件
            this.activeTimer = setTimeout(() => {
                onLongPress?.(e); // 执行长按回调
                this.activeTimer = null; // 清理计时器ID
            }, this.duration);
        };

        // `pointermove` 事件处理函数
        const move = (e) => {
            // 如果没有激活的计时器（即长按已触发或已取消），则无需处理移动
            if (!this.activeTimer) return;

            // 计算当前位置与初始位置的距离
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

            // 如果移动距离超过阈值，则取消长按
            if (distance > this.threshold) {
                this.cancel();
            }
        };

        // `pointerup` 和 `pointercancel` 事件处理函数
        const end = () => {
            // 手指/鼠标抬起或事件被取消时，取消等待中的长按
            this.cancel();
            // 记录本次抬起的时间，用于双击检测
            lastClickTime = Date.now();
        };

        // 绑定事件监听器
        el.addEventListener('pointerdown', start);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);

        // 创建并返回解绑函数
        const unbind = () => {
            el.removeEventListener('pointerdown', start);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', end);
            el.removeEventListener('pointercancel', end);
            this.cancel(); // 确保解绑时也清理计时器
            this.bindings.delete(el); // 从绑定映射中移除
        };

        this.bindings.set(el, unbind); // 存储解绑函数
        return unbind;
    }

    /**
     * 解绑指定元素的的长按事件。
     * @param {HTMLElement} el - 要解绑的DOM元素。
     */
    unbind(el) {
        const fn = this.bindings.get(el);
        if (fn) fn();
    }

    /**
     * 解绑所有通过此实例绑定的长按事件。
     */
    unbindAll() {
        this.cancel(); // 确保没有正在运行的计时器
        for (const fn of this.bindings.values()) {
            fn(); // 调用每个元素的解绑函数
        }
        this.bindings.clear(); // 清空绑定映射
    }
}


// 阻止ios上，在元素上双击放大
export function preventDoubleTapZoom(elem) {
    let lastTouchTime = 0;

    elem.addEventListener(
        'touchstart',
        (e) => {
            const now = Date.now();
            const delta = now - lastTouchTime;

            if (delta > 0 && delta < 300) {
                // 300ms 内连续触摸视为双击
                e.preventDefault(); // 阻止浏览器双击放大
                e.stopPropagation();
                return;
            }

            lastTouchTime = now;
        },
        { passive: false }
    ); // passive: false 必须，否则 preventDefault 无效
}
