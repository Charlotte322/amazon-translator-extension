// background.js - Chrome扩展后台服务工人 (Service Worker)
// 此文件处理扩展的生命周期、事件监听和跨上下文通信

console.log('🚀 亚马逊翻译助手后台服务已启动');

// 1. 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('扩展安装事件:', details.reason);
    
    if (details.reason === 'install') {
        // 首次安装时的初始化操作
        console.log('🎉 亚马逊翻译助手扩展首次安装成功！');
        
        // 可以在这里设置默认配置
        chrome.storage.local.set({
            extensionEnabled: true,
            autoTranslate: true,
            translationDelay: 600,
            lastUpdate: new Date().toISOString()
        }, () => {
            console.log('默认配置已初始化');
        });
        
        // 可选：安装后打开教程或配置页面
        // chrome.tabs.create({
        //     url: chrome.runtime.getURL('welcome.html')
        // });
        
    } else if (details.reason === 'update') {
        // 扩展更新时的处理
        console.log(`🔄 扩展已从版本 ${details.previousVersion} 更新到当前版本`);
    }
});

// 2. 监听扩展图标点击事件（打开弹出页面）
chrome.action.onClicked.addListener((tab) => {
    // 注意：如果manifest.json中配置了default_popup，这个事件不会触发
    // 这里提供备用方案：当没有popup时，可以通过点击图标执行某些操作
    console.log('扩展图标被点击，当前标签页:', tab.id);
    
    // 示例：向内容脚本发送消息
    chrome.tabs.sendMessage(tab.id, {
        type: 'EXTENSION_ICON_CLICKED',
        data: { timestamp: Date.now() }
    }).catch(err => {
        // 如果内容脚本未注入或未准备好，忽略错误
        console.log('内容脚本可能未就绪，这是正常情况:', err.message);
    });
});

// 3. 消息监听 - 用于与content script和popup页面通信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('后台收到消息:', message.type, '来自:', sender.tab?.url);
    
    switch (message.type) {
        case 'GET_EXTENSION_STATUS':
            // 处理获取扩展状态的请求
            chrome.storage.local.get(['extensionEnabled', 'autoTranslate'], (result) => {
                sendResponse({
                    success: true,
                    enabled: result.extensionEnabled !== false, // 默认true
                    autoTranslate: result.autoTranslate !== false,
                    version: chrome.runtime.getManifest().version
                });
            });
            return true; // 表示将异步发送响应
        
        case 'TOGGLE_EXTENSION':
            // 处理启用/禁用扩展的请求
            const newState = message.data.enabled;
            chrome.storage.local.set({ extensionEnabled: newState }, () => {
                sendResponse({ success: true, enabled: newState });
                
                // 通知所有标签页状态变化
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        if (tab.id) {
                            chrome.tabs.sendMessage(tab.id, {
                                type: 'EXTENSION_STATE_CHANGED',
                                data: { enabled: newState }
                            }).catch(() => {
                                // 忽略发送失败的错误（页面可能没有内容脚本）
                            });
                        }
                    });
                });
            });
            return true;
        
        case 'TRANSLATION_COMPLETE':
            // 记录翻译统计（可选）
            console.log('翻译完成:', {
                textLength: message.data.originalText?.length,
                targetLanguage: message.data.targetLanguage,
                tabId: sender.tab?.id
            });
            sendResponse({ success: true });
            break;
            
        case 'TRANSLATION_ERROR':
            // 记录翻译错误
            console.warn('翻译错误:', message.data.error);
            
            // 这里可以添加错误统计或上报逻辑
            chrome.storage.local.get(['errorCount'], (result) => {
                const count = (result.errorCount || 0) + 1;
                chrome.storage.local.set({ 
                    errorCount: count,
                    lastError: {
                        message: message.data.error,
                        timestamp: Date.now(),
                        url: sender.tab?.url
                    }
                });
            });
            sendResponse({ success: false });
            break;
            
        case 'OPEN_OPTIONS_PAGE':
            // 打开选项页面
            chrome.runtime.openOptionsPage();
            sendResponse({ success: true });
            break;
            
        default:
            console.log('未知消息类型:', message.type);
            sendResponse({ success: false, error: '未知消息类型' });
    }
});

// 4. 标签页更新监听 - 当用户导航到亚马逊消息页面时
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 检查是否是完全加载的亚马逊消息页面
    if (changeInfo.status === 'complete' && tab.url) {
        const isAmazonMessagePage = /amazon\.(com|co\.uk|de)\/.*(message|messaging|contact)/i.test(tab.url);
        
        if (isAmazonMessagePage) {
            console.log('检测到亚马逊消息页面:', tab.url);
            
            // 可以在这里向内容脚本发送初始化消息
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                    type: 'PAGE_LOADED',
                    data: { url: tab.url }
                }).catch(err => {
                    // 内容脚本可能还未注入，这是正常的
                    console.log('内容脚本尚未注入，稍后会重试');
                });
            }, 1000);
        }
    }
});

// 5. 存储管理函数（确保这些函数在前面已定义）
function getStorageData(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
    });
}

function setStorageData(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
    });
}

// 6. 定期清理旧的存储数据（安全版）
async function cleanupOldData() {
    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        // 使用await替代.then()，更清晰
        const data = await getStorageData(['translationHistory', 'errorLogs']);
        
        if (data.translationHistory && Array.isArray(data.translationHistory)) {
            const filteredHistory = data.translationHistory.filter(
                item => item && item.timestamp > thirtyDaysAgo
            );
            
            if (filteredHistory.length !== data.translationHistory.length) {
                await setStorageData({ translationHistory: filteredHistory });
                console.log(`清理了 ${data.translationHistory.length - filteredHistory.length} 条历史记录`);
            }
        }
        
        // 同样清理错误日志
        if (data.errorLogs && Array.isArray(data.errorLogs)) {
            const filteredErrorLogs = data.errorLogs.filter(
                item => item && item.timestamp > thirtyDaysAgo
            );
            
            if (filteredErrorLogs.length !== data.errorLogs.length) {
                await setStorageData({ errorLogs: filteredErrorLogs });
                console.log(`清理了 ${data.errorLogs.length - filteredErrorLogs.length} 条错误日志`);
            }
        }
    } catch (error) {
        console.error('清理数据时出错:', error);
    }
}

if (typeof self !== 'undefined') {
    // 在Service Worker环境中，self是可用的
    self.backgroundAPI = {
        getStorageData,
        setStorageData,
        logEvent: (eventName, data) => {
            console.log(`事件: ${eventName}`, data);
            // 记录事件到存储（可选）
            const eventLog = {
                event: eventName,
                data: data,
                timestamp: Date.now()
            };
            
            // 获取现有日志并添加新记录
            getStorageData(['eventLogs']).then((result) => {
                const logs = result.eventLogs || [];
                logs.push(eventLog);
                // 只保留最近100条日志
                const recentLogs = logs.slice(-100);
                setStorageData({ eventLogs: recentLogs });
            });
        }
    };
}

console.log('✅ 亚马逊翻译助手后台服务初始化完成');