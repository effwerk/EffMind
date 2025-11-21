const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

// 🧩 需要缓存的核心资源
const CORE_ASSETS = [];

// 向所有客户端广播消息（页面）
async function broadcastMessage(msg) {
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clientsList) {
        client.postMessage(msg);
    }
}

// 安装阶段（预缓存资源）
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${CACHE_VERSION}...`);
    broadcastMessage({ type: 'SW_UPDATE_STATUS', stage: 'installing', progress: 0 });

    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(async (cache) => {
                let completed = 0;
                const total = CORE_ASSETS.length;

                for (const url of CORE_ASSETS) {
                    try {
                        const res = await fetch(url);
                        await cache.put(url, res.clone());
                        completed++;
                        const progress = Math.round((completed / total) * 100);
                        console.log(`[SW] Caching ${url} (${progress}%)`);
                        broadcastMessage({
                            type: 'SW_UPDATE_STATUS',
                            stage: 'installing',
                            progress,
                            current: url,
                        });
                    } catch (err) {
                        console.warn(`[SW] Failed to cache ${url}`, err);
                    }
                }
            })
            .then(() => {
                console.log('[SW] Install complete');
                broadcastMessage({ type: 'SW_UPDATE_STATUS', stage: 'installed', progress: 100 });
            })
    );

    self.skipWaiting();
});

// 激活阶段（清理旧缓存）
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${CACHE_VERSION}...`);
    broadcastMessage({ type: 'SW_UPDATE_STATUS', stage: 'activating' });

    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            for (const key of keys) {
                if (key !== CACHE_NAME) {
                    console.log(`[SW] Deleting old cache: ${key}`);
                    await caches.delete(key);
                }
            }
            await self.clients.claim();
            console.log('[SW] Activation complete');
            broadcastMessage({ type: 'SW_UPDATE_STATUS', stage: 'activated' });
        })()
    );
});

// Fetch 拦截逻辑
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        (async () => {
            try {
                const networkResponse = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            } catch {
                const cached = await caches.match(event.request);
                return cached || Response.error();
            }
        })()
    );
});

// 手动更新触发
self.addEventListener('message', async (event) => {
    if (event.data === 'SKIP_WAITING') {
        console.log('[SW] Forcing update...');
        broadcastMessage({ type: 'SW_UPDATE_STATUS', stage: 'skipping_waiting' });
        await self.skipWaiting();
    }
});