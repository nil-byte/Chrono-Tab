// 背景图片管理类
class BackgroundManager {
    constructor() {
        this.currentSource = 'none';
        this.apiKeys = {
            unsplash: '',
            pixabay: '',
            pexels: ''
        };
        
        // 初始化DOM元素
        this.sourceSelect = document.getElementById('bgImageSource');
        this.apiInputs = {
            unsplash: document.querySelector('#unsplashApiKey .api-input'),
            pixabay: document.querySelector('#pixabayApiKey .api-input'),
            pexels: document.querySelector('#pexelsApiKey .api-input')
        };
        
        // 添加防抖定时器
        this.refreshDebounceTimer = null;
        this.DEBOUNCE_DELAY = 800; // 800ms 的防抖延迟
        
        // 添加缓存相关属性
        this.lastImageUrl = null;
        this.forceRefresh = false;
        
        // 添加消息监听
        this.initMessageListener();
        
        // 初始化刷新按钮显示状态
        this.initRefreshButtonVisibility();
        
        // 添加本地背景图片路径
        this.localBackgroundPath = 'assets/backgrounds/Background1.png';
        
        // 初始化时添加一个标志，表示是否已经加载过设置
        this.settingsLoaded = false;
        
        this.init();
    }
    
    async init() {  
        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeAfterDOMLoad();
            });
        } else {
            this.initializeAfterDOMLoad();
        }
    }
    
    async initializeAfterDOMLoad() {
        // 初始化刷新按钮
        this.refreshBtn = document.getElementById('refreshBgBtn');
        this.isRefreshing = false;
        
        // 加载保存的设置
        await this.loadSettings();
        
        // 初始化自动刷新
        const settings = await chrome.storage.sync.get({ autoRefreshInterval: 'never' });
        this.updateAutoRefresh(settings.autoRefreshInterval);
        
        // 绑定事件
        this.sourceSelect.addEventListener('change', () => this.handleSourceChange());
        
        // 绑定API Key保存按钮事件
        document.querySelectorAll('.api-save-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const source = e.target.closest('.api-key-item').id.replace('ApiKey', '');
                this.saveApiKey(source);
            });
        });
        
        // 初始化刷新按钮
        this.initRefreshButton();
        
        // 初始加载背景图片时，先尝试从storage获取缓存的图片
        const cached = await chrome.storage.local.get(['lastBackgroundImage', 'backgroundSource']);
        
        // 如果有保存的背景源设置，使用保存的设置
        if (cached.backgroundSource) {
            this.currentSource = cached.backgroundSource;
            this.sourceSelect.value = this.currentSource;
        }
        
        if (cached.lastBackgroundImage) {
            this.lastImageUrl = cached.lastBackgroundImage;
        }
        
        // 标记设置已加载
        this.settingsLoaded = true;
        
        // 加载背景图片
        await this.loadBackgroundImage();
    }
    
    async loadSettings() {
        const settings = await chrome.storage.sync.get({
            backgroundSource: 'none',
            unsplashApiKey: '',
            pixabayApiKey: '',
            pexelsApiKey: ''
        });
        
        this.currentSource = settings.backgroundSource;
        
        // 分别加载每个API key
        this.apiKeys = {
            unsplash: settings.unsplashApiKey || '',
            pixabay: settings.pixabayApiKey || '',
            pexels: settings.pexelsApiKey || ''
        };
        
        // 更新UI
        this.sourceSelect.value = this.currentSource;
        Object.keys(this.apiKeys).forEach(source => {
            if (this.apiInputs[source]) {
                this.apiInputs[source].value = this.apiKeys[source] ? '•'.repeat(12) : '';
                if (this.apiKeys[source]) {
                    this.apiInputs[source].dataset.value = this.apiKeys[source];
                } else {
                    delete this.apiInputs[source].dataset.value;
                }
            }
        });
        
        return settings;
    }
    
    async saveSettings() {
        // 分别保存每个API key
        const settings = {
            backgroundSource: this.currentSource,
            unsplashApiKey: this.apiKeys.unsplash,
            pixabayApiKey: this.apiKeys.pixabay,
            pexelsApiKey: this.apiKeys.pexels
        };
        
        await chrome.storage.sync.set(settings);
        // 同时保存背景源设置到local storage
        await chrome.storage.local.set({ backgroundSource: this.currentSource });
    }
    
    async handleSourceChange() {
        this.currentSource = this.sourceSelect.value;
        await this.saveSettings();
        
        // 如果切换到本地图片，强制关闭刷新按钮
        if (this.currentSource === 'none') {
            await chrome.storage.sync.set({ showRefreshBtn: false });
            // 更新设置面板中的开关状态
            const refreshBtnToggle = document.getElementById('showRefreshBtn');
            if (refreshBtnToggle) {
                refreshBtnToggle.checked = false;
                refreshBtnToggle.disabled = true;
            }
        } else {
            // 切换到其他源时，启用刷新按钮设置
            const refreshBtnToggle = document.getElementById('showRefreshBtn');
            if (refreshBtnToggle) {
                refreshBtnToggle.disabled = false;
            }
        }
        
        // 更新刷新按钮可见性
        this.updateRefreshButtonVisibility();
        
        // 清除缓存的图片URL
        this.lastImageUrl = null;
        // 清除本地存储的背景图片
        await chrome.storage.local.remove('lastBackgroundImage');
        // 设置强制刷新标志
        this.forceRefresh = true;
        
        // 加载新的背景图片（包括本地图片）
        await this.loadBackgroundImage();
    }
    
    async saveApiKey(source) {
        const input = this.apiInputs[source];
        if (input) {
            this.apiKeys[source] = input.value;
            await this.saveSettings();
            // 如果当前选中的是这个源，重新加载图片
            if (this.currentSource === source) {
                await this.loadBackgroundImage();
            }
        }
    }
    
    async loadBackgroundImage() {
        try {
            // 如果设置还没加载完成，等待设置加载
            if (!this.settingsLoaded) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 如果当前源设置为none，使用本地背景图片
            if (this.currentSource === 'none') {
                this.lastImageUrl = chrome.runtime.getURL(this.localBackgroundPath);
                this.applyBackgroundImage(this.lastImageUrl);
                return;
            }
            
            // 如果不是强制刷新且有缓存的图片URL，直接使用缓存的URL
            if (!this.forceRefresh && this.lastImageUrl) {
                this.applyBackgroundImage(this.lastImageUrl);
                return;
            }
            
            const imageUrl = await this.fetchImageUrl();
            if (imageUrl) {
                // 预加载图片
                await this.preloadImage(imageUrl);
                
                this.lastImageUrl = imageUrl;
                // 保存到storage以便其他标签页使用
                chrome.storage.local.set({ lastBackgroundImage: imageUrl });
                // 应用背景图片
                this.applyBackgroundImage(imageUrl);
            }
            
            // 重置强制刷新标志
            this.forceRefresh = false;
        } catch (error) {
            this.handleApiError(error);
        }
    }
    
    // 应用背景图片
    async applyBackgroundImage(imageUrl) {
        try {
            const img = new Image();            
            // 创建加载图片的Promise
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => {
                    reject(new Error('图片加载失败'));
                };
                img.src = imageUrl;
                // 10秒超时
                setTimeout(() => reject(new Error('图片加载超时')), 10000);
            });

            // 获取当前的遮罩透明度
            const opacity = await this.getOverlayOpacity();
            const overlayOpacity = opacity / 100;
            
            // 应用背景图片
            document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, ${overlayOpacity}), rgba(0, 0, 0, ${overlayOpacity})), url(${imageUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
            
        } catch (error) {
            this.showErrorNotification('背景图片加载失败，请稍后重试');
        }
    }
    
    async getOverlayOpacity() {
        const settings = await chrome.storage.sync.get({ overlayOpacity: 50 });
        return settings.overlayOpacity;
    }
    
    async updateOverlayOpacity(opacity) {
        if (!this.lastImageUrl) return;
        
        const overlayOpacity = opacity / 100;
        document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, ${overlayOpacity}), rgba(0, 0, 0, ${overlayOpacity})), url(${this.lastImageUrl})`;
    }
    
    removeBackgroundImage() {
        document.body.style.backgroundImage = '';
    }
    
    async fetchImageUrl() {
        const settings = await this.loadSettings();
        const source = settings.backgroundSource;

        try {
            switch (source) {
                case 'unsplash':
                    if (!settings.unsplashApiKey) {
                        // 直接返回本地图片，并显示友好提示
                        this.showErrorNotification('请在设置中添加 Unsplash API Key');
                        return chrome.runtime.getURL(this.localBackgroundPath);
                    }
                    return await this.fetchUnsplashImage(settings.unsplashApiKey);
                
                case 'pixabay':
                    if (!settings.pixabayApiKey) {
                        this.showErrorNotification('请在设置中添加 Pixabay API Key');
                        return chrome.runtime.getURL(this.localBackgroundPath);
                    }
                    return await this.fetchPixabayImage(settings.pixabayApiKey);
                
                case 'pexels':
                    if (!settings.pexelsApiKey) {
                        this.showErrorNotification('请在设置中添加 Pexels API Key');
                        return chrome.runtime.getURL(this.localBackgroundPath);
                    }
                    return await this.fetchPexelsImage(settings.pexelsApiKey);
                
                case 'none':
                default:
                    // 使用本地默认背景图片
                    return chrome.runtime.getURL(this.localBackgroundPath);
            }
        } catch (error) {
            // 出错时使用本地默认背景，并显示友好提示
            this.showErrorNotification('获取在线图片失败，已切换至本地图片');
            return chrome.runtime.getURL(this.localBackgroundPath);
        }
    }
    
    async fetchUnsplashImage(apiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            // 扩展 Unsplash API 参数
            const params = new URLSearchParams({
                orientation: 'landscape',  // 横向图片
                content_filter: 'high',    // 高质量内容
                // 扩展查询主题，包含更多适合做背景的类型
                query: 'nature,landscape,city,mountain,ocean,forest,space,galaxy', 
                featured: 'true',          // 精选图片
                w: '2560',                 // 适合高分屏的宽度
                fit: 'max',                // 保持图片质量
            });

            const response = await fetch(`https://api.unsplash.com/photos/random?${params}`, {
                headers: {
                    'Authorization': `Client-ID ${apiKey}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('API Key 无效');
                } else if (response.status === 429) {
                    throw new Error('已达到 API 调用限制');
                }
                throw new Error(`API 请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            // 优先使用原始尺寸图片
            return data.urls.full || data.urls.regular;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            throw error;
        }
    }
    
    async fetchPixabayImage(apiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            // 扩展 Pixabay API 参数
            const params = new URLSearchParams({
                key: apiKey,
                orientation: 'horizontal',    // 横向图片
                per_page: '200',             // 增加选择范围
                min_width: '1920',           // 最小宽度要求
                image_type: 'photo',         // 只要照片
                safesearch: 'true',          // 安全内容
                editors_choice: 'true',      // 编辑精选
                // 扩展类别，包含更多适合做背景的类型
                category: 'nature,backgrounds,buildings,places,travel,science,computer,abstract,textures,architecture,landscapes,space',
                order: 'popular',           // 按受欢迎程度排序
            });

            const response = await fetch(`https://pixabay.com/api/?${params}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('API Key 无效');
                } else if (response.status === 429) {
                    throw new Error('已达到 API 调用限制');
                }
                throw new Error(`API 请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.hits.length === 0) {
                throw new Error('未找到符合条件的图片');
            }

            // 随机选择一张图片，优先选择高分辨率版本
            const randomImage = data.hits[Math.floor(Math.random() * data.hits.length)];
            // 优先使用大图，如果没有则回退到普通尺寸
            return randomImage.largeImageURL || randomImage.webformatURL;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            throw error;
        }
    }
    
    async fetchPexelsImage(apiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            // 扩展 Pexels API 参数
            const params = new URLSearchParams({
                per_page: '80',
                orientation: 'landscape',    // 横向图片
                size: 'large',             // 大尺寸图片
                // 扩展查询主题，包含更多适合做背景的类型
                query: 'nature landscape architecture cityscape mountain ocean forest galaxy space wallpaper background'
            });

            const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
                headers: {
                    'Authorization': apiKey
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('API Key 无效');
                } else if (response.status === 429) {
                    throw new Error('已达到 API 调用限制');
                }
                throw new Error(`API 请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.photos.length === 0) {
                throw new Error('未找到符合条件的图片');
            }

            // 随机选择一张图片，使用最佳尺寸
            const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
            // 优先使用较大尺寸但不是最大尺寸的图片，以平衡质量和加载速度
            return randomPhoto.src.large2x || randomPhoto.src.large || randomPhoto.src.original;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            throw error;
        }
    }
    
    initRefreshButton() {
        if (!this.refreshBtn) return;
        
        this.refreshBtn.addEventListener('click', async () => {
            // 如果正在刷新，直接返回
            if (this.isRefreshing) return;
            
            // 清除之前的定时器
            if (this.refreshDebounceTimer) {
                clearTimeout(this.refreshDebounceTimer);
            }
            
            // 添加刷新动画
            this.refreshBtn.classList.add('refreshing');
            this.isRefreshing = true;
            
            // 设置强制刷新标志
            this.forceRefresh = true;
            
            // 使用防抖延迟执行刷新操作
            this.refreshDebounceTimer = setTimeout(async () => {
                try {
                    await this.loadBackgroundImage();
                } catch (error) {
                    console.error('Failed to refresh background:', error);
                } finally {
                    // 移除刷新动画并重置状态
                    setTimeout(() => {
                        this.refreshBtn.classList.remove('refreshing');
                        this.isRefreshing = false;
                    }, 500);
                }
                
                // 清除定时器
                this.refreshDebounceTimer = null;
            }, this.DEBOUNCE_DELAY);
        });
        
        // 根据背景源显示/隐藏刷新按钮
        this.updateRefreshButtonVisibility();
    }
    
    updateRefreshButtonVisibility() {
        if (this.refreshBtn) {
            // 如果是本地图片源，强制隐藏刷新按钮
            if (this.currentSource === 'none') {
                this.refreshBtn.style.display = 'none';
            } else {
                // 否则根据设置显示/隐藏
                chrome.storage.sync.get({ showRefreshBtn: true }, (settings) => {
                    this.refreshBtn.style.display = settings.showRefreshBtn ? 'flex' : 'none';
                });
            }
        }
    }
    
    initMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'refreshBackground') {
                this.forceRefresh = true;
                this.loadBackgroundImage();
            }
            return true;
        });
    }
    
    updateAutoRefresh(interval) {
        chrome.runtime.sendMessage({
            type: 'updateAutoRefresh',
            interval: interval
        }).catch(() => {
            // 静默处理错误，下次加载时会重试
        });
    }

    async initRefreshButtonVisibility() {
        // 从storage加载按钮显示设置
        const settings = await chrome.storage.sync.get({
            showRefreshBtn: true
        });
        
        // 如果是本地图片源，强制隐藏刷新按钮
        if (this.currentSource === 'none') {
            if (this.refreshBtn) {
                this.refreshBtn.style.display = 'none';
            }
            // 禁用设置面板中的开关
            const refreshBtnToggle = document.getElementById('showRefreshBtn');
            if (refreshBtnToggle) {
                refreshBtnToggle.checked = false;
                refreshBtnToggle.disabled = true;
            }
        } else {
            // 应用设置
            if (this.refreshBtn) {
                this.refreshBtn.style.display = settings.showRefreshBtn ? 'flex' : 'none';
            }
        }
    }

    handleApiError(error) {
        // 发送错误信息到background worker进行记录
        chrome.runtime.sendMessage({
            type: 'logError',
            error: {
                message: error.message,
                context: 'BackgroundManager',
                timestamp: new Date().toISOString()
            }
        }).catch(() => {
            // 静默处理发送错误
        });
        
        // 显示用户友好的错误提示
        if (error.message.includes('请先设置') || 
            error.message.includes('API Key 无效') ||
            error.message.includes('API 调用限制')) {
            this.showErrorNotification(error.message);
        } else {
            this.showErrorNotification('背景图片加载失败，请稍后重试');
        }
        
        if (this.lastImageUrl) {
            return;
        }
        
        document.body.style.backgroundColor = '#1a1a1a';
    }

    showErrorNotification(message) {
        // 创建或更新通知元素
        let notification = document.getElementById('bgErrorNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'bgErrorNotification';
            notification.style.cssText = `
                position: fixed;
                bottom: 800px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 1000;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(8px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            `;
            document.body.appendChild(notification);
        }

        // 显示消息
        notification.textContent = message;
        notification.style.opacity = '1';

        // 3秒后淡出
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = url;
            
            // 10秒后超时
            setTimeout(() => reject(new Error('图片加载超时')), 10000);
        });
    }
}

// 初始化背景图片管理器
window.backgroundManager = new BackgroundManager(); 