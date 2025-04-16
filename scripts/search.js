// 搜索功能实现
class Search {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchEngineIcon = document.getElementById('searchEngineIcon');
        this.searchEngineDropdown = document.querySelector('.search-engine-dropdown');
        this.searchEngineOptions = document.querySelectorAll('.search-engine-option');
        this.currentEngine = 'default';
        this.useDefaultEngine = true;  // 添加默认搜索引擎标志
        // 添加默认搜索图标的 SVG - 更美观的设计
        this.defaultSearchIcon = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                <path d="M20 20L16.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="11" cy="11" r="3" fill="currentColor" opacity="0.2"/>
            </svg>
        `;
        this.searchEngines = {
            default: {
                icon: this.defaultSearchIcon,
                searchUrl: ''  // 空字符串表示使用 Chrome 搜索 API
            },
            google: {
                icon: 'assets/icons/google.png',
                searchUrl: 'https://www.google.com/search?q='
            },
            baidu: {
                icon: 'assets/icons/baidu.png',
                searchUrl: 'https://www.baidu.com/s?wd='
            },
            bing: {
                icon: 'assets/icons/bing.png',
                searchUrl: 'https://cn.bing.com/search?q='
            },
            duckduckgo: {
                icon: 'assets/icons/duckduckgo.png',
                searchUrl: 'https://duckduckgo.com/?q='
            },
            yahoo: {
                icon: 'assets/icons/yahoo.png',
                searchUrl: 'https://search.yahoo.com/search?p='
            },
            yandex: {
                icon: 'assets/icons/yandex.png',
                searchUrl: 'https://yandex.com/search/?text='
            }
        };
        this.searchContainer = document.querySelector('.search-container');
        
        this.init();
    }

    init() {
        // 初始化搜索引擎图标
        this.loadSavedEngine();
        
        // 绑定事件监听
        this.searchInput.addEventListener('keydown', (e) => this.handleSearch(e));
        
        // 绑定搜索引擎切换事件
        this.searchEngineOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const engine = option.dataset.engine;
                this.setSearchEngine(engine);
                this.toggleDropdown(false);
                e.stopPropagation(); // 防止冒泡到document
            });
        });

        // 点击图标显示/隐藏下拉框
        this.searchEngineIcon.addEventListener('click', (e) => {
            this.toggleDropdown();
            e.stopPropagation(); // 防止冒泡到document
        });

        // 点击其他地方关闭下拉框
        document.addEventListener('click', () => {
            this.toggleDropdown(false);
        });

        // 防止点击下拉框本身时关闭
        this.searchEngineDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 添加搜索容器点击事件
        this.searchContainer.addEventListener('click', (e) => {
            // 如果点击的不是搜索引擎图标或下拉菜单
            if (!e.target.closest('.search-engine-wrapper')) {
                this.searchInput.focus();
            }
        });

        // 优化搜索框聚焦效果
        this.searchInput.addEventListener('focus', () => {
            this.searchContainer.classList.add('focused');
        });

        this.searchInput.addEventListener('blur', () => {
            this.searchContainer.classList.remove('focused');
        });
    }

    async loadSavedEngine() {
        // 从存储中加载保存的搜索引擎设置
        const settings = await chrome.storage.sync.get({ 
            preferredSearchEngine: 'default',
            useDefaultEngine: true
        });
        this.useDefaultEngine = settings.useDefaultEngine;
        this.setSearchEngine(settings.preferredSearchEngine);
    }

    setSearchEngine(engine) {
        if (this.searchEngines[engine]) {
            this.currentEngine = engine;
            this.useDefaultEngine = (engine === 'default');
            
            // 更新图标
            if (engine === 'default') {
                // 对于默认搜索引擎，直接插入 SVG
                this.searchEngineIcon.innerHTML = this.defaultSearchIcon;
            } else {
                // 对于其他搜索引擎，使用图片
                this.searchEngineIcon.innerHTML = `<img src="${this.searchEngines[engine].icon}" alt="${engine.charAt(0).toUpperCase() + engine.slice(1)}">`;
            }
            
            // 更新选中状态
            this.searchEngineOptions.forEach(option => {
                if (option.dataset.engine === engine) {
                    option.dataset.selected = "true";
                } else {
                    delete option.dataset.selected;
                }
            });
            
            // 保存设置
            chrome.storage.sync.set({ 
                preferredSearchEngine: engine,
                useDefaultEngine: this.useDefaultEngine
            });
        }
    }

    async handleSearch(e) {
        if (e.key === 'Enter') {
            const query = this.searchInput.value.trim();
            if (query) {
                if (this.useDefaultEngine) {
                    // 使用 Chrome 搜索 API
                    try {
                        await chrome.search.query({
                            text: query,
                            disposition: 'CURRENT_TAB'
                        });
                    } catch (error) {
                        console.error('搜索失败:', error);
                        // 出错时使用备选搜索方式
                        const searchUrl = this.searchEngines.google.searchUrl + encodeURIComponent(query);
                        window.location.href = searchUrl;
                    }
                } else {
                    // 使用选定的搜索引擎
                    const searchUrl = this.searchEngines[this.currentEngine].searchUrl + encodeURIComponent(query);
                    window.location.href = searchUrl;
                }
            }
        }
    }

    toggleDropdown(force) {
        if (typeof force === 'boolean') {
            this.searchEngineDropdown.classList.toggle('show', force);
        } else {
            this.searchEngineDropdown.classList.toggle('show');
        }
        
        // 如果下拉菜单显示，则计算并设置位置
        if (this.searchEngineDropdown.classList.contains('show')) {
            const searchContainerRect = this.searchContainer.getBoundingClientRect();
            const layoutContainer = document.querySelector('.layout-container');
            const layoutRect = layoutContainer.getBoundingClientRect();
            
            // 计算相对于布局容器的位置
            const relativeLeft = searchContainerRect.left - layoutRect.left - 87;
            
            // 设置下拉菜单的位置和宽度
            this.searchEngineDropdown.style.position = 'absolute';
            this.searchEngineDropdown.style.width = `${searchContainerRect.width}px`;
            this.searchEngineDropdown.style.left = `${relativeLeft}px`;
            this.searchEngineDropdown.style.top = `${searchContainerRect.height - 4}px`;
            
            // 确保下拉菜单在视口内
            const dropdownRect = this.searchEngineDropdown.getBoundingClientRect();
            if (dropdownRect.right > window.innerWidth) {
                const overflow = dropdownRect.right - window.innerWidth;
                this.searchEngineDropdown.style.left = `${relativeLeft - overflow - 16}px`;
            }
        }
    }
}

// 初始化搜索功能
window.search = new Search(); 