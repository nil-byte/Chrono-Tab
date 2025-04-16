// 时钟功能实现
class Clock {
    constructor() {
        this.clockElement = document.getElementById('clock');
        this.dateElement = document.getElementById('date');
        
        // 从本地存储获取时间和日期格式设置
        const savedTimeFormat = localStorage.getItem('clockFormat');
        const savedDateFormat = localStorage.getItem('dateFormat');
        this.is24Hour = savedTimeFormat ? savedTimeFormat === '24' : true;
        this.isChineseDate = savedDateFormat ? savedDateFormat === 'zh' : false;
        
        // 将clock实例添加到window对象
        window.clock = this;
        this.init();
    }

    init() {
        // 初始化时钟显示
        this.updateTime();
        // 每秒更新一次
        setInterval(() => this.updateTime(), 1000);
        // 添加点击切换12/24小时制
        this.clockElement.addEventListener('click', () => this.toggleTimeFormat());
        // 添加点击切换日期格式
        this.dateElement.addEventListener('click', () => this.toggleDateFormat());
    }

    updateTime() {
        const now = new Date();
        
        // 更新时钟
        let hours = now.getHours();
        if (!this.is24Hour) {
            hours = hours % 12 || 12;
        }
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.clockElement.textContent = `${hours}:${minutes}`;
        
        // 更新日期
        const options = { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        };
        
        // 根据语言选择显示日期
        if (this.isChineseDate) {
            // 中文日期格式
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
            
            const weekday = weekdays[now.getDay()];
            const month = months[now.getMonth()];
            const day = now.getDate();
            
            this.dateElement.textContent = `${month}${day}日 ${weekday}`;
        } else {
            // 英文日期格式
            const dateStr = now.toLocaleDateString('en-US', options);
            this.dateElement.textContent = dateStr;
        }
    }

    toggleTimeFormat() {
        this.is24Hour = !this.is24Hour;
        // 保存设置到本地存储
        localStorage.setItem('clockFormat', this.is24Hour ? '24' : '12');
        this.updateTime();
        
        // 同步更新设置面板
        const timeFormatToggle = document.getElementById('timeFormatToggle');
        if (timeFormatToggle) {
            timeFormatToggle.checked = this.is24Hour;
        }
    }

    toggleDateFormat() {
        this.isChineseDate = !this.isChineseDate;
        // 保存设置到本地存储
        localStorage.setItem('dateFormat', this.isChineseDate ? 'zh' : 'en');
        this.updateTime();
        
        // 添加切换动画效果
        this.dateElement.classList.add('date-switch');
        setTimeout(() => {
            this.dateElement.classList.remove('date-switch');
        }, 300);
    }
}

// 等待DOM加载完成后初始化时钟
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Clock();
    });
} else {
    new Clock();
} 