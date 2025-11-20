import MindmapMain from './MindmapMain.js';
import Storage from './common/Storage.js';
import getMenuItems from './menuItems.js';
import { LangManager } from './common/LangManager.js';
import { debounce } from './common/Utils.js';

const updateLocalData = debounce((data) => {
    console.log('更新数据');
    Storage.set('MindmapData', data);
}, 500);

customElements.define(
    'mindmap-main',
    class extends MindmapMain {
        constructor() {
            super();
            this.langSource = new URL('./langs', import.meta.url).pathname;
            this.getMenuItems = getMenuItems;
        }
        triggerUpdate() {
            updateLocalData(this.mindmapView.getMindMapRawData());
        }
        updateSetting(key, value) {
            Storage.set(key, value);
        }
        async initSettings() {
            const isMinimapHidden = Storage.get('isMinimapHidden', this.isMinimapHidden);
            const curveStyle = Storage.get('curveStyle', this.curveStyle);
            const theme = Storage.get('theme') || this.theme;
            const lang = Storage.get('lang', LangManager.currentLang);

            this.currentMinimapState = this.isMinimapHidden = isMinimapHidden;
            this.mindmapView.currentCurveType = curveStyle;
            this.mindmapView.handleThemeChange(theme)

            await LangManager.whenInitialized;
            LangManager.setLang(lang);
        }
        setupEventListeners() {
            super.setupEventListeners();
            document.addEventListener(
                'mindmap-ready',
                () => {
                    // 加载本地数据
                    const localMindmapData = Storage.get('MindmapData');
                    if (localMindmapData) {
                        this.mindmapView.importExport.loadRawData(localMindmapData);
                        // 标记根节点已经被修改过，切换语言时不更新
                        this.mindmapView.isRootNodeModified = true;
                        // 导入成功后清除历史记录
                        this.mindmapView.nodeEdit.nodeHistory.clear();
                    }
                },
                { once: true }
            );

            //
            this.addEventListener('new-mindmap', () => this.mindmapView.newMindmap());
        }
    }
);
