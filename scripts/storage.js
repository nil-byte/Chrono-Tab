// 存储功能实现
class Storage {
    constructor() {
        this.defaultSettings = {
            is24Hour: true,
            isChineseDate: false,
            preferredSearchEngine: 'default', 
            useDefaultEngine: true,
            autoRefreshInterval: 'never',
            overlayOpacity: 50,  // 添加默认遮罩透明度
            showSearchBtn: true,  // 添加搜索按钮显示设置
            showRefreshBtn: true,  // 添加刷新按钮显示设置
            // 背景设置
            backgroundSource: 'none',  // 默认使用本地图片
            unsplashApiKey: '',        // Unsplash API密钥
            pixabayApiKey: '',         // Pixabay API密钥
            pexelsApiKey: '',          // Pexels API密钥
        };
        
        // 将storage实例添加到window对象
        window.storage = this;
        this.init();
    }

    async init() {
        // 加载用户设置
        const settings = await this.loadSettings();
        // 等待DOM加载完成后再应用设置
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.applySettings(settings);
            });
        } else {
            this.applySettings(settings);
        }
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(this.defaultSettings, (settings) => {
                resolve(settings);
            });
        });
    }

    async saveSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(settings, () => {
                resolve();
            });
        });
    }

    applySettings(settings) {
        // 应用24小时制设置
        if (window.clock && typeof window.clock.updateTime === 'function') {
            window.clock.is24Hour = settings.is24Hour;
            window.clock.updateTime();
        }

        // 应用搜索引擎设置
        if (window.search && typeof window.search.setSearchEngine === 'function') {
            window.search.setSearchEngine(settings.preferredSearchEngine);
        }
    }
}

// 初始化存储功能
new Storage(); 