const Storage = {
    /**
     * 设置数据到 localStorage
     * @param {string} key - 存储的键
     * @param {any} value - 存储的值（会自动 JSON 序列化）
     * @param {number} [expire] - 可选过期时间，单位毫秒，不传则永久保存
     *
     * 使用示例：
     * Storage.set('user', { name: 'Jia', age: 28 }); // 永久保存
     * Storage.set('token', 'abc123', 5 * 60 * 1000); // 5 分钟后过期
     */
    set(key, value, expire) {
        try {
            const item = {
                value,
                expire: expire ? Date.now() + expire : null,
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (err) {
            console.error('Storage set error:', err);
        }
    },

    /**
     * 从 localStorage 获取数据
     * @param {string} key - 存储的键
     * @param {any} defaultValue - 值不存在时返回的默认值
     * @returns {any | null} - 返回值，如果不存在或过期返回 null
     *
     * 使用示例：
     * const user = Storage.get('user');
     * console.log(user); // { name: 'Jia', age: 28 } 或 null
     */
    get(key, defaultValue = null) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return defaultValue;

            const item = JSON.parse(itemStr);

            // 判断是否过期
            if (item.expire && Date.now() > item.expire) {
                localStorage.removeItem(key); // 过期自动删除
                return null;
            }

            return item.value;
        } catch (err) {
            console.error('Storage get error:', err);
            return null;
        }
    },

    /**
     * 删除指定数据
     * @param {string} key - 要删除的键
     *
     * 使用示例：
     * Storage.remove('user');
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.error('Storage remove error:', err);
        }
    },

    /**
     * 清空 localStorage
     *
     * 使用示例：
     * Storage.clear();
     */
    clear() {
        try {
            localStorage.clear();
        } catch (err) {
            console.error('Storage clear error:', err);
        }
    },
};

export default Storage;
