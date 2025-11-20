import './mindmap-main.js';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        const reg = await navigator.serviceWorker.register('./common/ServiceWorker.js');
        console.log('[SW] Registered:', reg.scope);

        // === 监听更新阶段 ===
        reg.onupdatefound = () => {
            const newWorker = reg.installing;
            console.log('[SW] New version found, preparing update...');
            newWorker.onstatechange = () => {
                console.log(`[SW] Worker state: ${newWorker.state}`);
            };
        };

        // === 监听来自 SW 的进度事件 ===
        navigator.serviceWorker.addEventListener('message', (event) => {
            const msg = event.data;
            if (msg?.type === 'SW_UPDATE_STATUS') {
                const { stage, progress, current } = msg;
                console.log(`[SW] Stage: ${stage} ${progress ? progress + '%' : ''}`);
                if (stage === 'installing') {
                    // 在界面显示进度条
                    // const el = document.querySelector('#swProgress');
                    // if (el) el.textContent = `正在更新缓存... ${progress}%`;
                }
            }
        });

        // 新版本激活时自动刷新
        // navigator.serviceWorker.addEventListener('controllerchange', () => {
        //     console.log('[SW] Controller changed → reloading...');
        //     window.location.reload();
        // });
    });
}
