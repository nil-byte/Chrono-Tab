document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // 将已安装标志保存到存储中
            chrome.storage.sync.set({ 'installed': true }, function() {
                // 跳转到新标签页
                chrome.tabs.create({ url: 'newtab.html' });
            });
        });
    }
}); 