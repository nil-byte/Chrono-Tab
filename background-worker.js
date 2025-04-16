// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
    // 初始化时清除所有已存在的定时器
    chrome.alarms.clearAll();
    
    // 首次安装时打开欢迎页面
    if (details.reason === 'install') {
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html'),
            active: true
        }, function(tab) {
            // 确保新标签页成为活动标签页
            chrome.tabs.update(tab.id, { active: true });
        });
    }
});

// 监听定时器触发事件
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith('refreshBackground_')) {
        try {
            // 获取当前设置
            const settings = await chrome.storage.sync.get({
                backgroundSource: 'none'
            });
            
            // 如果是本地图片源，不需要刷新
            if (settings.backgroundSource === 'none') {
                return;
            }
            
            // 通知所有新标签页更新背景
            const tabs = await chrome.tabs.query({ url: "chrome://newtab/" });
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'refreshBackground' });
                } catch (error) {
                    console.log(`Failed to send refresh message to tab ${tab.id}: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('Failed to refresh background:', error);
        }
    }
});

// 添加错误日志处理
let errorLogs = [];
const MAX_ERROR_LOGS = 100;

// 添加错误日志处理监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === 'logError') {
            // 确保错误对象格式正确
            const errorData = typeof message.error === 'string' 
                ? { message: message.error } 
                : message.error || { message: '未知错误' };
                
            logError(errorData, sender);
            sendResponse({ success: true });
        }
        else if (message.type === 'updateAutoRefresh') {
            handleAutoRefreshUpdate(message.interval);
            sendResponse({ success: true });
        }
    } catch (err) {
        console.error('消息处理错误:', err instanceof Error ? err.message : String(err));
        sendResponse({ success: false, error: String(err) });
    }
    return true;
});

// 错误日志处理函数
function logError(error, sender = null) {
    // 处理不同类型的错误输入
    if (!error) {
        error = { message: '未知错误' };
    } else if (typeof error === 'string') {
        error = { message: error };
    }
    
    // 忽略API Key相关的错误，因为这些错误会在UI中显示
    if (error.message && (
        error.message.includes('API Key') ||
        error.message.includes('获取在线图片失败')
    )) {
        return;
    }

    const logEntry = {
        timestamp: new Date().toISOString(),
        error: error.message || '未知错误',
        context: error.context || 'BackgroundWorker'
    };
    
    // 添加额外的错误详情（如果有）
    if (error.details) {
        logEntry.details = error.details;
    }
    
    // 只在有 sender 时添加 tab 相关信息
    if (sender && sender.tab) {
        logEntry.tabId = sender.tab.id;
        logEntry.url = sender.tab.url;
    }
    
    errorLogs.unshift(logEntry);
    
    // 保持日志数量在限制范围内
    if (errorLogs.length > MAX_ERROR_LOGS) {
        errorLogs = errorLogs.slice(0, MAX_ERROR_LOGS);
    }
    
    // 打印错误日志，确保对象能够正确序列化
    console.error('[Chrome Extension Error]', JSON.stringify(logEntry, null, 2));
}

// 处理自动刷新设置更新
async function handleAutoRefreshUpdate(interval) {
    try {
        // 先清除所有现有的定时器
        await chrome.alarms.clearAll();
        
        // 如果设置为never或者使用本地图片，不创建新的定时器
        if (interval === 'never') {
            return;
        }
        
        // 获取当前背景源设置
        const settings = await chrome.storage.sync.get({
            backgroundSource: 'none'
        });
        
        // 如果使用本地图片，不创建定时器
        if (settings.backgroundSource === 'none') {
            return;
        }
        
        // 设置定时器间隔
        let periodInMinutes;
        switch (interval) {
            case '60':
                periodInMinutes = 60;
                break;
            case '120':
                periodInMinutes = 120;
                break;
            case 'daily':
                periodInMinutes = 24 * 60;
                break;
            default:
                return;
        }
        
        // 创建新的定时器
        await chrome.alarms.create(`refreshBackground_${Date.now()}`, {
            periodInMinutes: periodInMinutes
        });
    } catch (error) {
        // 确保错误对象格式正确
        const errorObj = {
            message: '更新定时器设置失败',
            context: 'AlarmManager',
            details: error instanceof Error ? error.message : String(error)
        };
        logError(errorObj);
    }
} 