// 设置面板功能实现
class Settings {
    constructor() {
        this.panel = document.getElementById('settingsPanel');
        this.closeBtn = document.getElementById('closeSettings');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.searchEngineRadios = document.getElementsByName('searchEngine');
        this.autoRefreshSelect = document.getElementById('autoRefreshInterval');
        this.overlaySlider = document.getElementById('overlayOpacity');
        this.sliderValue = this.overlaySlider.parentElement.querySelector('.slider-value');
        this.showSearchBtnToggle = document.getElementById('showSearchBtn');
        this.showRefreshBtnToggle = document.getElementById('showRefreshBtn');
        
        // 将settings实例添加到window对象
        window.settings = this;
        this.init();
        
        // 添加光晕跟随效果
        this.initLightOrbEffect();
        
        // 绑定API输入框事件
        this.initApiInputs();
        
        // 添加背景源变更监听
        this.bgSourceSelect = document.getElementById('bgImageSource');
        this.bgSourceSelect.addEventListener('change', () => this.handleBgSourceChange());
    }

    async init() {
        try {
            // 绑定设置面板开关事件
            this.settingsBtn.addEventListener('click', () => this.openPanel());
            this.closeBtn.addEventListener('click', () => this.closePanel());
            
            this.searchEngineRadios.forEach(radio => {
                radio.addEventListener('change', () => this.handleSearchEngineChange());
            });

            // 绑定自动刷新间隔选择事件
            this.autoRefreshSelect.addEventListener('change', () => this.handleAutoRefreshChange());

            // 绑定遮罩透明度滑动条事件
            this.overlaySlider.addEventListener('input', () => this.handleOverlayChange());

            // 绑定按钮显示设置事件
            this.showSearchBtnToggle.addEventListener('change', () => this.handleButtonVisibilityChange());
            this.showRefreshBtnToggle.addEventListener('change', () => this.handleButtonVisibilityChange());

            // 加载保存的设置
            await this.loadSettings();
            
            // 点击面板外关闭
            document.addEventListener('click', (e) => {
                if (this.panel.classList.contains('active') && 
                    !this.panel.contains(e.target) && 
                    !this.settingsBtn.contains(e.target)) {
                    this.closePanel();
                }
            });
        } catch (error) {
            console.error('Settings initialization error:', error);
        }
    }

    openPanel() {
        this.panel.classList.add('active');
    }

    closePanel() {
        this.panel.classList.remove('active');
    }

    async loadSettings() {
        if (!window.storage) {
            console.error('Storage not initialized');
            return;
        }
        const settings = await window.storage.loadSettings();
        
        // 获取当前背景源
        const isLocalBg = this.bgSourceSelect.value === 'none';
        
        // 如果是本地图片源，禁用刷新按钮设置
        if (isLocalBg) {
            settings.showRefreshBtn = false;
            if (this.showRefreshBtnToggle) {
                this.showRefreshBtnToggle.checked = false;
                this.showRefreshBtnToggle.disabled = true;
            }
        } else {
            // 启用刷新按钮设置
            if (this.showRefreshBtnToggle) {
                this.showRefreshBtnToggle.disabled = false;
            }
        }
        
        this.applySettings(settings);
    }

    applySettings(settings) {
        // 设置搜索引擎
        if (settings.preferredSearchEngine) {
            this.searchEngineRadios.forEach(radio => {
                radio.checked = radio.value === settings.preferredSearchEngine;
            });
        }
        
        // 设置自动刷新间隔
        if (settings.autoRefreshInterval) {
            this.autoRefreshSelect.value = settings.autoRefreshInterval;
        }
        
        // 设置遮罩透明度
        if (settings.overlayOpacity) {
            this.overlaySlider.value = settings.overlayOpacity;
            this.updateOverlayOpacity(settings.overlayOpacity);
        } else {
            // 默认值为50
            this.updateOverlayOpacity(50);
        }

        // 应用按钮显示设置
        if (typeof settings.showSearchBtn !== 'undefined') {
            this.showSearchBtnToggle.checked = settings.showSearchBtn;
            this.updateButtonVisibility('search', settings.showSearchBtn);
        }
        
        // 修改刷新按钮设置应用逻辑
        if (typeof settings.showRefreshBtn !== 'undefined') {
            const isLocalBg = this.bgSourceSelect.value === 'none';
            if (isLocalBg) {
                this.showRefreshBtnToggle.checked = false;
                this.showRefreshBtnToggle.disabled = true;
                this.updateButtonVisibility('refresh', false);
            } else {
                this.showRefreshBtnToggle.checked = settings.showRefreshBtn;
                this.showRefreshBtnToggle.disabled = false;
                this.updateButtonVisibility('refresh', settings.showRefreshBtn);
            }
        }
    }

    handleSearchEngineChange() {
        const preferredSearchEngine = document.querySelector('input[name="searchEngine"]:checked').value;
        window.storage.saveSettings({ preferredSearchEngine });
        window.search.currentEngine = preferredSearchEngine;
        window.search.updateSearchEngineIcon();
    }

    handleAutoRefreshChange() {
        const interval = this.autoRefreshSelect.value;
        window.storage.saveSettings({ autoRefreshInterval: interval });
        // 通知背景管理器更新自动刷新设置
        if (window.backgroundManager) {
            window.backgroundManager.updateAutoRefresh(interval);
        }
    }

    handleOverlayChange() {
        const opacity = this.overlaySlider.value;
        this.updateOverlayOpacity(opacity);
        window.storage.saveSettings({ overlayOpacity: opacity });
    }

    updateOverlayOpacity(opacity) {
        // 更新滑块值显示
        this.sliderValue.textContent = `${opacity}%`;
        
        // 更新背景遮罩透明度
        if (window.backgroundManager) {
            window.backgroundManager.updateOverlayOpacity(opacity);
        }
    }

    initLightOrbEffect() {
        const lightOrb = document.querySelector('.light-orb');
        let isMoving = false;
        let rafId = null;
        
        const moveOrb = (e) => {
            if (!isMoving) {
                isMoving = true;
                rafId = requestAnimationFrame(() => {
                    const x = e.clientX;
                    const y = e.clientY;
                    lightOrb.style.left = `${x}px`;
                    lightOrb.style.top = `${y}px`;
                    isMoving = false;
                });
            }
        };
        
        // 添加节流的鼠标移动监听
        document.addEventListener('mousemove', moveOrb, { passive: true });
        
        // 清理函数
        return () => {
            document.removeEventListener('mousemove', moveOrb);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }

    initApiInputs() {
        const apiInputs = document.querySelectorAll('.api-input');
        const toggleButtons = document.querySelectorAll('.api-toggle-visibility');

        apiInputs.forEach(input => {
            const apiType = input.dataset.api;
            chrome.storage.sync.get(`${apiType}ApiKey`).then(result => {
                const savedKey = result[`${apiType}ApiKey`];
                if (savedKey) {
                    input.dataset.value = savedKey;
                    input.value = '•'.repeat(12);
                } else {
                    input.value = '';
                    delete input.dataset.value;
                }
            }).catch(() => {
                // 静默处理错误，使用空值
                input.value = '';
                delete input.dataset.value;
            });

            // 失焦时保存
            input.addEventListener('blur', async () => {
                const value = input.value.trim();
                const apiType = input.dataset.api;
                
                // 处理清空的情况
                if (value === '') {
                    await chrome.storage.sync.remove(`${apiType}ApiKey`);
                    delete input.dataset.value;
                    input.value = '';
                    this.showSaveFeedback(input, '已清除');
                    
                    // 通知背景管理器更新API key
                    if (window.backgroundManager) {
                        window.backgroundManager.apiKeys[apiType] = '';
                        await window.backgroundManager.saveSettings();
                    }
                    return;
                }
                
                // 如果值没有变化且不是密码点，则不保存
                if (value === input.dataset.value && value !== '•'.repeat(12)) {
                    return;
                }
                
                // 保存新值
                if (value && value !== '•'.repeat(12)) {
                    await chrome.storage.sync.set({ [`${apiType}ApiKey`]: value });
                    input.dataset.value = value;
                    
                    // 通知背景管理器更新API key
                    if (window.backgroundManager) {
                        window.backgroundManager.apiKeys[apiType] = value;
                        await window.backgroundManager.saveSettings();
                    }
                    
                    // 如果是密码模式，显示密码点
                    if (input.type === 'password') {
                        input.value = '•'.repeat(12);
                    }
                    this.showSaveFeedback(input);
                }
            });

            // 按下回车时保存
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });

        // 为每个切换按钮添加点击事件
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = button.parentElement.querySelector('.api-input');
                
                if (input.type === 'password') {
                    // 切换到文本模式
                    input.type = 'text';
                    // 如果有存储的值，显示真实值，否则保持为空
                    input.value = input.dataset.value || '';
                } else {
                    // 切换到密码模式
                    input.type = 'password';
                    // 如果有值，显示密码点，否则保持为空
                    input.value = input.dataset.value ? '•'.repeat(12) : '';
                }
            });
        });
    }

    showSaveFeedback(input, message = '已保存') {
        const container = input.parentElement;
        let feedback = container.querySelector('.save-feedback');
        
        if (!feedback) {
            feedback = document.createElement('span');
            feedback.className = 'save-feedback';
            container.appendChild(feedback);
        }

        feedback.textContent = message;
        feedback.classList.remove('show');
        // 触发重排以重新开始动画
        void feedback.offsetWidth;
        feedback.classList.add('show');
    }

    handleButtonVisibilityChange() {
        const showSearchBtn = this.showSearchBtnToggle.checked;
        const showRefreshBtn = this.showRefreshBtnToggle.checked;
        
        // 获取当前背景源
        const isLocalBg = this.bgSourceSelect.value === 'none';
        
        // 如果是本地图片源，强制关闭刷新按钮
        const finalShowRefreshBtn = isLocalBg ? false : showRefreshBtn;
        
        // 如果是本地图片源，确保开关保持禁用状态
        if (isLocalBg) {
            this.showRefreshBtnToggle.checked = false;
            this.showRefreshBtnToggle.disabled = true;
        }
        
        // 保存设置
        window.storage.saveSettings({
            showSearchBtn,
            showRefreshBtn: finalShowRefreshBtn,
        });
        
        // 更新按钮显示状态
        this.updateButtonVisibility('search', showSearchBtn);
        this.updateButtonVisibility('refresh', finalShowRefreshBtn);
    }

    updateButtonVisibility(buttonType, show) {
        let element;
        switch (buttonType) {
            case 'search':
                element = document.getElementById('searchToggleBtn');
                break;
            case 'refresh':
                element = document.getElementById('refreshBgBtn');
                break;
        }
                
        if (element) {
            element.style.display = show ? 'flex' : 'none';
        }
    }

    // 添加背景源变更处理函数
    handleBgSourceChange() {
        const isLocalBg = this.bgSourceSelect.value === 'none';
        
        // 更新刷新按钮开关状态
        if (this.showRefreshBtnToggle) {
            if (isLocalBg) {
                // 本地图片模式下强制关闭和禁用
                this.showRefreshBtnToggle.checked = false;
                this.showRefreshBtnToggle.disabled = true;
                this.updateButtonVisibility('refresh', false);
                // 保存设置
                window.storage.saveSettings({
                    showRefreshBtn: false
                });
            } else {
                // 切换到其他源时，恢复之前保存的设置
                chrome.storage.sync.get({ showRefreshBtn: true }, (settings) => {
                    this.showRefreshBtnToggle.disabled = false;
                    this.showRefreshBtnToggle.checked = settings.showRefreshBtn;
                    this.updateButtonVisibility('refresh', settings.showRefreshBtn);
                });
            }
        }
    }
}

// 等待DOM加载完成后初始化设置
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Settings();
    });
} else {
    new Settings();
} 