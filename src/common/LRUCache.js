/**
 * LRUCache
 * ==================================================
 * 一个轻量的 LRU（Least Recently Used）缓存实现。
 *
 * 用途：
 * - 用于缓存可复用的资源（如 SVG 模板、图片、配置项等）
 * - 控制内存上限，自动清理最久未使用的数据，防止内存无限增长
 *
 * 特性：
 * - FIFO + LRU 结合，性能 O(1)
 * - 可配置缓存上限
 * - 浏览器原生 Map 实现，无第三方依赖
 *
 * 使用用例：
 * --------------------------------------------------
 * ```js
 * import { LRUCache } from './core/LRUCache.js';
 *
 * // 创建缓存实例，最多保留 3 项
 * const cache = new LRUCache(3);
 *
 * cache.set('A', 1);
 * cache.set('B', 2);
 * cache.set('C', 3);
 *
 * console.log(cache.get('A')); // => 1 （刷新 A 的使用时间）
 *
 * cache.set('D', 4); // 超出上限，自动移除最久未使用的 'B'
 *
 * console.log(cache.size); // => 3
 * console.log(cache.get('B')); // => null
 *
 * // 清空缓存
 * cache.clear();
 * ```
 * --------------------------------------------------
 */

export class LRUCache {
    /**
     * @param {number} limit - 最大缓存项数（默认 100）
     */
    constructor(limit = 100) {
        this.limit = limit; // 缓存上限
        this.map = new Map(); // 存储数据的核心结构
    }

    /**
     * 获取缓存项。
     * @param {string} key - 缓存键名
     * @returns {*} 缓存值或 null
     */
    get(key) {
        if (!this.map.has(key)) return null;
        const value = this.map.get(key);
        // 删除旧位置并重新插入（刷新“使用时间”）
        this.map.delete(key);
        this.map.set(key, value);
        return value;
    }

    /**
     * 写入缓存项。
     * 若缓存超出上限，会删除最久未使用的一项。
     *
     * @param {string} key - 缓存键名
     * @param {*} value - 要缓存的值
     */
    set(key, value) {
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, value);
        if (this.map.size > this.limit) {
            const oldestKey = this.map.keys().next().value;
            this.map.delete(oldestKey);
        }
    }

    /** 删除指定键。 */
    delete(key) {
        this.map.delete(key);
    }

    /** 清空所有缓存。 */
    clear() {
        this.map.clear();
    }

    /** 当前缓存大小 */
    get size() {
        return this.map.size;
    }
}
