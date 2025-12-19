// popup.js - 更新版：适配本地LM Studio服务
document.addEventListener('DOMContentLoaded', async () => {
    // 获取DOM元素
    const toggleExtension = document.getElementById('toggleExtension');
    const toggleAutoTranslate = document.getElementById('toggleAutoTranslate');
    const delaySlider = document.getElementById('delaySlider');
    const delayValue = document.getElementById('delayValue');
    const extensionStatus = document.getElementById('extensionStatus');
    const serverStatus = document.getElementById('serverStatus');
    const versionInfo = document.getElementById('versionInfo');
    const testTranslationBtn = document.getElementById('testTranslation');
    const lastUpdate = document.getElementById('lastUpdate');

    // 1. 从后台获取当前设置
    async function loadSettings() {
        try {
            // 这里模拟从storage或background获取状态，您可以根据实际插件结构调整
            const storage = await chrome.storage.local.get([
                'extensionEnabled', 
                'autoTranslate', 
                'translationDelay',
                'extensionVersion'
            ]);
            
            toggleExtension.checked = storage.extensionEnabled !== false; // 默认true
            toggleAutoTranslate.checked = storage.autoTranslate !== false; // 默认true
            
            if (storage.translationDelay) {
                delaySlider.value = storage.translationDelay;
                delayValue.textContent = `${storage.translationDelay}ms`;
            }
            
            versionInfo.textContent = storage.extensionVersion || '2.0.0'; // 更新版本号
            extensionStatus.textContent = toggleExtension.checked ? '运行中' : '已禁用';
            extensionStatus.className = toggleExtension.checked ? 'status-value online' : 'status-value offline';
            
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    // 2. 检测LM Studio服务器状态
    async function checkLMStudioStatus() {
        try {
            const response = await fetch('http://localhost:1234/v1/models', {
                method: 'GET',
                // 可设置一个较短的超时，避免检测阻塞界面
                signal: AbortSignal.timeout(3000) 
            });
            if (response.ok) {
                const data = await response.json();
                const modelLoaded = data.data && data.data.some(m => m.id.includes('translator'));
                serverStatus.textContent = modelLoaded ? '在线 (模型已加载)' : '在线 (等待模型)';
                serverStatus.className = 'status-value online';
            } else {
                serverStatus.textContent = '服务异常';
                serverStatus.className = 'status-value offline';
            }
        } catch (error) {
            serverStatus.textContent = '离线';
            serverStatus.className = 'status-value offline';
            console.log('LM Studio服务未运行或无法访问:', error.message);
        }
        lastUpdate.textContent = `最后检测: ${new Date().toLocaleTimeString()}`;
    }

    // 3. 事件监听
    toggleExtension.addEventListener('change', async () => {
        const enabled = toggleExtension.checked;
        await chrome.storage.local.set({ extensionEnabled: enabled });
        extensionStatus.textContent = enabled ? '运行中' : '已禁用';
        extensionStatus.className = enabled ? 'status-value online' : 'status-value offline';
        
        // 可以通知content脚本
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'EXTENSION_TOGGLE',
                    enabled: enabled
                }).catch(err => console.log("页面未注入或未刷新:", err));
            }
        });
    });

    toggleAutoTranslate.addEventListener('change', async () => {
        await chrome.storage.local.set({
            autoTranslate: toggleAutoTranslate.checked
        });
    });

    delaySlider.addEventListener('input', () => {
        const value = delaySlider.value;
        delayValue.textContent = `${value}ms`;
    });

    delaySlider.addEventListener('change', async () => {
        const delay = parseInt(delaySlider.value);
        await chrome.storage.local.set({ translationDelay: delay });
        
        // 通知content.js更新延迟设置
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_DELAY',
                    data: { delay: delay }
                }).catch(() => { /* content.js可能未注入，正常 */ });
            }
        });
    });

    // 4. 【关键】更新测试翻译功能，使用LM Studio API
    testTranslationBtn.addEventListener('click', async () => {
        // 使用与您content.js中完全一致的请求格式
        const testRequestBody = {
            model: 'Llama3.1-8b-translator',
            messages: [
                {
                    role: "system",
                    content: "你是一个专业的翻译助手，请将用户的输入准确翻译成目标语言。仅输出翻译结果。"
                },
                {
                    role: "user",
                    content: "请将以下内容翻译成英文：\n\n\"这是一个测试，用于验证翻译插件功能是否正常。\""
                }
            ],
            stream: false,
            temperature: 0.1,
            max_tokens: 512
        };

        try {
            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testRequestBody)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            const translatedText = result.choices?.[0]?.message?.content;
            
            if (translatedText) {
                alert(`✅ AI翻译功能正常\n原文: 这是一个测试，用于验证翻译插件功能是否正常。\n译文: ${translatedText.trim()}`);
            } else {
                alert('❌ 翻译测试失败: API返回格式异常');
            }
        } catch (error) {
            alert(`❌ 无法连接到本地AI服务 (LM Studio)\n请确认：\n1. LM Studio已启动并加载模型\n2. 本地服务器端口为1234\n3. 错误详情: ${error.message}`);
        }
    });

    // 5. 初始化
    await loadSettings();
    await checkLMStudioStatus();
    
    // 每15秒检查一次服务状态（避免过于频繁）
    setInterval(checkLMStudioStatus, 15000);
});