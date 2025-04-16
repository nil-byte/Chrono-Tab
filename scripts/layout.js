class LayoutManager {
    constructor() {
        this.layoutContainer = document.querySelector('.layout-container');
        this.searchContainer = document.getElementById('searchContainer');
        this.searchToggleBtn = document.getElementById('searchToggleBtn');
        this.searchInput = document.getElementById('searchInput');
        this.isSearchActive = false;

        this.init();
    }

    init() {
        // 绑定搜索按钮点击事件
        this.searchToggleBtn.addEventListener('click', () => this.toggleSearch());

        // 绑定快捷键
        document.addEventListener('keydown', (e) => {
            // 按下 / 键显示搜索框
            if (e.key === '/' && !this.isSearchActive) {
                e.preventDefault();
                this.toggleSearch();
            }
            // 按下 Esc 键隐藏搜索框
            else if (e.key === 'Escape' && this.isSearchActive) {
                this.toggleSearch(false);
            }
        });

        // 从 localStorage 恢复状态
        const savedState = localStorage.getItem('searchActive') === 'true';
        if (savedState) {
            this.toggleSearch(true, false); // 不保存状态，避免循环
        }

        // 初始化按钮显示状态
        this.initButtonVisibility();
    }

    async initButtonVisibility() {
        // 从storage加载按钮显示设置
        const settings = await chrome.storage.sync.get({
            showSearchBtn: true
        });
        
        // 应用设置
        if (this.searchToggleBtn) {
            this.searchToggleBtn.style.display = settings.showSearchBtn ? 'flex' : 'none';
        }
    }

    toggleSearch(force, save = true) {
        this.isSearchActive = typeof force === 'boolean' ? force : !this.isSearchActive;
        
        this.layoutContainer.classList.toggle('search-active', this.isSearchActive);
        this.searchContainer.classList.toggle('show', this.isSearchActive);

        if (this.isSearchActive) {
            // 显示搜索框时自动聚焦
            setTimeout(() => this.searchInput.focus(), 300);
        }

        if (save) {
            localStorage.setItem('searchActive', this.isSearchActive);
        }
    }
}

// 初始化布局管理器
window.layoutManager = new LayoutManager(); 