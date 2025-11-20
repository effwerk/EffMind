class ComponentAPI {
    // host -> Set<{api, handler: wrapper, origHandler}>
    #listeners = new WeakMap();
    // apiName -> Set<wrapper>
    #apiIndex = new Map();
    // apiName -> Set<listener>
    #watchers = new Map();
    // host -> Map<apiName, Set<listener>>
    #watchListeners = new WeakMap();
    // apiName -> [{params, resolve, reject, timer}]
    #queue = {};
    #debug = false;
    // host -> [{apiName, wrapper}]
    #cleanupMap = new WeakMap();
    // FinalizationRegistry 用于在 host 被 GC 时自动清理索引（若环境支持）
    #finalizer = (typeof FinalizationRegistry !== 'undefined') ? new FinalizationRegistry((heldList) => {
        try {
            for (const meta of heldList) {
                const { apiName, wrapper } = meta;
                const idx = this.#apiIndex.get(apiName);
                if (idx) {
                    idx.delete(wrapper);
                    if (idx.size === 0) this.#apiIndex.delete(apiName);
                }
            }
        } catch (e) {
            // 忽略 finalizer 中的错误
        }
    }) : null;

    constructor({ debug = false } = {}) {
        this.#debug = debug;
    }

    /**
     * 注册 handler，并可选择性地观察属性变化。
     * @param {object} host - 调用组件实例（通常是 HTMLElement 实例），用于在 disconnected 时清理。
     * @param {string} apiName - API 名称标识符。
     * @param {function} handler - 接收一个 detail 对象并返回结果（可以是同步或异步）。
     * @param {string[]=} propertiesToObserve - 可选，一个属性名称数组。如果提供，当这些属性变化时，新值会自动发布到此 apiName 频道。
     */
    on(host, apiName, handler, propertiesToObserve) {
        // 避免重复注册：如果同宿主上已有相同原始 handler，会先尝试移除
        this.off(host, apiName, handler);

        const wrapper = async (detail) => {
            try {
                if (this.#debug) console.log(`[ComponentAPI] ${apiName} called`, detail);
                const result = await handler(detail);
                if (detail?.callback) detail.callback(result);
                // 通知所有 watcher 一个新的值已产生
                try {
                    this._notifyWatchers(apiName, { type: 'value', value: result });
                } catch (e) {
                    // ignore
                }
            } catch (err) {
                console.error(`[ComponentAPI] ${apiName} handler error:`, err);
            }
        };

        // 保存 handler（同时保存原始 handler 便于按函数注销）
        let list = this.#listeners.get(host);
        if (!list) {
            list = new Set();
            this.#listeners.set(host, list);

            // 在宿主断开连接时自动 cleanup
            const origDisconnect = host.disconnectedCallback?.bind(host);
            host.disconnectedCallback = () => {
                this.cleanup(host);
                origDisconnect?.();
            };
        }
        list.add({ api: apiName, handler: wrapper, origHandler: handler });

        // 注册 cleanup 列表并交给 FinalizationRegistry 管理（如果可用）
        try {
            let arr = this.#cleanupMap.get(host);
            if (!arr) {
                arr = [];
                this.#cleanupMap.set(host, arr);
                if (this.#finalizer) this.#finalizer.register(host, arr, host);
            }
            arr.push({ apiName, wrapper });
        } catch (e) {
            // 旧环境或意外情况忽略
        }

        // 在可枚举索引中登记此 wrapper，以便 call() 时快速查找
        let idx = this.#apiIndex.get(apiName);
        if (!idx) {
            idx = new Set();
            this.#apiIndex.set(apiName, idx);
        }
        idx.add(wrapper);

        // 通知 watcher handler 已注册
        this._notifyWatchers(apiName, { type: 'registered' });

        // flush 挂起队列（如果有早期发起的调用）
        const queue = this.#queue[apiName];
        if (queue?.length) {
            for (const item of queue) {
                clearTimeout(item.timer);
                wrapper({ ...item.params, callback: item.resolve });
            }
            this.#queue[apiName] = [];
        }

        // 如果提供了 propertiesToObserve，则复用 observeProperty 的逻辑
        if (propertiesToObserve && Array.isArray(propertiesToObserve) && propertiesToObserve.length > 0) {
            this.observeProperty(host, apiName, propertiesToObserve);
        }
    }

    /**
     * 观察宿主对象的属性，当属性值变化时，自动将新值发布到指定的 apiName 频道。
     * @param {object} host - 宿主对象实例。
     * @param {string} apiName - 要发布到的 API 频道名称。
     * @param {string[]} properties - 要观察的宿主对象上的属性名称数组。
     */
    observeProperty(host, apiName, properties) {
        if (!Array.isArray(properties)) {
            console.error('[ComponentAPI] observeProperty expects an array of property names.');
            return;
        }

        const componentApiInstance = this;

        for (const prop of properties) {
            try {
                const symbolKey = Symbol.for(`ComponentAPI:prop:${apiName}:${prop}`);
                // 避免重复包装同一宿主同一属性
                if (host[symbolKey]) continue;

                // 保存当前值（优先通过现有描述符读取）
                let current;
                try {
                    const desc = Object.getOwnPropertyDescriptor(host, prop) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(host), prop);
                    if (desc && desc.get) current = desc.get.call(host);
                    else current = host[prop];
                } catch (e) {
                    current = host[prop];
                }
                let internalKey = `__componentapi_${prop}`;
                host[internalKey] = current;

                Object.defineProperty(host, prop, {
                    configurable: true,
                    enumerable: true,
                    get() { return this[internalKey]; },
                    set(v) {
                        const old = this[internalKey];
                        this[internalKey] = v;
                        // 仅在值变更时发布
                        try {
                            if (old !== v) {
                                // publish synchronously 使用闭包捕获的 ComponentAPI 实例
                                componentApiInstance.publish(apiName, v);
                            }
                        } catch (e) {
                            // swallow
                        }
                    }
                });
                // 标记已包装
                host[symbolKey] = true;
            } catch (e) {
                // 安全容错
                console.error(`[ComponentAPI] Failed to observe property "${prop}" on host.`, e);
            }
        }
    }

    /**
     * 注销 handler。若提供 handler 参数，则只移除匹配的原始 handler，否则移除宿主上该 apiName 的所有 handler。
     * @param {object} host
     * @param {string} apiName
     * @param {function=} handler - 可选，原始 handler 函数
     */
    off(host, apiName, handler) {
        const list = this.#listeners.get(host);
        if (!list) return;
        for (const item of [...list]) {
            if (item.api === apiName && (!handler || item.origHandler === handler)) {
                // 从监听集合和索引中移除
                list.delete(item);
                const idx = this.#apiIndex.get(apiName);
                if (idx) {
                    idx.delete(item.handler);
                    if (idx.size === 0) this.#apiIndex.delete(apiName);
                }
                // 通知 watcher handler 已注销（注意：可能还有其他 handler 存在）
                this._notifyWatchers(apiName, { type: 'unregistered' });
            }
        }
    }

    // 清理 host 的所有 handler
    cleanup(host) {
        const list = this.#listeners.get(host);
        if (!list) return;
        // 同步从索引中移除
        for (const item of [...list]) {
            const idx = this.#apiIndex.get(item.api);
            if (idx) {
                idx.delete(item.handler);
                if (idx.size === 0) this.#apiIndex.delete(item.api);
            }
        }
        list.clear();
        this.#listeners.delete(host);
        // 取消 finalizer 注册并移除 cleanupMap 记录
        try {
            const arr = this.#cleanupMap.get(host);
            if (arr) {
                if (this.#finalizer) this.#finalizer.unregister(host);
                this.#cleanupMap.delete(host);
            }
        } catch (e) {
            // 忽略环境不支持的情况
        }
        // 通知 watcher 宿主已清理（unregistered）
        // 注意：仅作为 hint，具体是否还有其他 handler 需要上层判断
        try { this._notifyWatchers(null, { type: 'cleanup', host }); } catch (e) { }
    }

    /**
     * 订阅 apiName 的更新与生命周期事件。
     * @param {object} host - 调用组件实例，用于 unwatch(host) 时清理。
     * @param {string} apiName - API 名称标识符。
     * @param {function} listener - 会收到形如 {type: 'registered'|'unregistered'|'value', value?} 的对象。
     */
    watch(host, apiName, listener) {
        // 登记 host -> apiName -> listener 关系，用于 unwatch(host)
        let hostMap = this.#watchListeners.get(host);
        if (!hostMap) {
            hostMap = new Map();
            this.#watchListeners.set(host, hostMap);
        }
        let hostListenerSet = hostMap.get(apiName);
        if (!hostListenerSet) {
            hostListenerSet = new Set();
            hostMap.set(apiName, hostListenerSet);
        }
        hostListenerSet.add(listener);

        // 登记 apiName -> listener 全局索引，用于 publish
        let globalListenerSet = this.#watchers.get(apiName);
        if (!globalListenerSet) {
            globalListenerSet = new Set();
            this.#watchers.set(apiName, globalListenerSet);
        }
        globalListenerSet.add(listener);

        // 如果此时已有 handler 注册，立即发起一次 call 以触发当前值的通知
        // 这样使用方在注册 watch 后可以立刻收到当前状态
        try {
            const idx = this.#apiIndex.get(apiName);
            if (idx && idx.size > 0) {
                this.call(apiName).catch(() => { });
            }
        } catch (e) {
            // 忽略任何在尝试同步触发时的异常
        }
    }

    /**
     * 注销 watch 监听。
     * @param {object} host - 调用组件实例。
     * @param {string=} apiName - 可选，要注销的 API 名称。如果省略，则注销该 host 上的所有 watch。
     */
    unwatch(host, apiName) {
        const hostMap = this.#watchListeners.get(host);
        if (!hostMap) return;

        const unwatchApi = (name) => {
            const hostListenerSet = hostMap.get(name);
            if (!hostListenerSet) return;

            const globalListenerSet = this.#watchers.get(name);
            if (globalListenerSet) {
                for (const listener of hostListenerSet) {
                    globalListenerSet.delete(listener);
                }
            }
            hostMap.delete(name);
        };

        if (apiName) {
            unwatchApi(apiName);
        } else {
            // 注销所有
            for (const name of hostMap.keys()) {
                unwatchApi(name);
            }
            this.#watchListeners.delete(host);
        }
    }

    /**
     * 手动发布值到 watchers（provider 可在内部状态变化时调用）。
     */
    publish(apiName, payload) {
        this._notifyWatchers(apiName, { type: 'value', value: payload });
    }

    _notifyWatchers(apiName, message) {
        if (apiName) {
            const set = this.#watchers.get(apiName);
            if (!set) return;
            for (const l of [...set]) {
                try { l(message); } catch (e) { console.error('watcher error', e); }
            }
        } else {
            // broadcast to all watchers if apiName is null
            for (const [k, set] of this.#watchers.entries()) {
                for (const l of [...set]) {
                    try { l(message); } catch (e) { console.error('watcher error', e); }
                }
            }
        }
    }

    // 调用 API
    call(apiName, params = {}, timeout = 5000) {
        return new Promise((resolve, reject) => {
            // 如果已有注册的 handler，立即派发（取任意一个 handler）
            const idx = this.#apiIndex.get(apiName);
            if (idx && idx.size > 0) {
                // 取第一个 handler 执行并等待它通过 callback(resolve) 返回结果
                const [firstHandler] = idx;
                const timer = setTimeout(() => {
                    reject(new Error(`[ComponentAPI] ${apiName} call timed out after ${timeout}ms`));
                }, timeout);

                try {
                    // 调用时传入 callback
                    firstHandler({
                        ...params, callback: (res) => {
                            clearTimeout(timer);
                            resolve(res);
                        }
                    });
                } catch (err) {
                    clearTimeout(timer);
                    reject(err);
                }
                return;
            }

            if (!this.#queue[apiName]) this.#queue[apiName] = [];

            const timer = setTimeout(() => {
                const index = this.#queue[apiName].findIndex(q => q.resolve === resolve);
                if (index >= 0) {
                    this.#queue[apiName].splice(index, 1);
                    reject(new Error(`[ComponentAPI] ${apiName} call timed out after ${timeout}ms`));
                }
            }, timeout);

            this.#queue[apiName].push({ params, resolve, reject, timer });
            // ✅ 如无 handler，继续驻留队列，等待 handler 注册时 flush
        });
    }

    setDebug(debug = true) {
        this.#debug = debug;
    }
}

export default new ComponentAPI({ debug: false });