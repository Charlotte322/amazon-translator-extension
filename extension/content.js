// content.js - 修复输入框识别问题
(function() {
    'use strict';
    
    // ============ 配置区域 ============
    const PROXY_SERVER_URL = 'http://localhost:3000/translate';
    const CONFIG = {
        translateMessages: true,    // 是否翻译对话消息
        translateInput: true,       // 是否翻译输入框
        autoDetectInput: true,      // 是否自动检测输入框文本语言
        messageTranslationPosition: 'below', // 'below' 或 'inline'
        translationDelay: 600       // 输入防抖延迟
    };
    
    // ============ 状态变量 ============
    let currentTextarea = null;
    let translationDisplay = null;
    let observer = null;
    let debounceTimer = null;
    let staticTranslatedElements = new Set();
    
    // ============ 核心工具函数 ============
    function debounce(func, delay) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    function createTranslationDisplay() {
        const display = document.createElement('div');
        display.id = 'amazon-translator-display';
        display.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 300px;
            padding: 15px;
            background-color: #f0f9ff;
            border: 2px solid #0366d6;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333;
            max-height: 200px;
            overflow-y: auto;
            display: none;
        `;
        document.body.appendChild(display);
        return display;
    }
    
    // ============ 双向翻译核心 ============
    async function translateText(text, from = 'auto', to = null) {
        if (!text || text.trim().length === 0) {
            hideTranslation();
            return null;
        }
        
        let detectedFrom = from;
        let detectedTo = to;
        
        if (from === 'auto' && CONFIG.autoDetectInput) {
            const isChinese = /[\u4e00-\u9fa5]/.test(text);
            const isEnglish = /[A-Za-z]/.test(text);
            
            if (isChinese && !isEnglish) {
                detectedFrom = 'zh';
                detectedTo = 'en';
            } else if (isEnglish && !isChinese) {
                detectedFrom = 'en';
                detectedTo = 'zh';
            } else {
                detectedFrom = 'auto';
                detectedTo = to || 'en';
            }
        }
        
        if (!detectedTo) {
            detectedTo = detectedFrom === 'zh' ? 'en' : 'zh';
        }
        
        try {
            const response = await fetch(PROXY_SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text,
                    from: detectedFrom,
                    to: detectedTo
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            
            if (result.error_msg) {
                console.error('翻译API错误:', result.error_msg);
                return null;
            }
            
            return {
                original: text,
                translated: result.translatedText || result.dst,
                from: result.from || detectedFrom,
                to: result.to || detectedTo
            };
        } catch (error) {
            console.error('翻译请求失败:', error);
            return null;
        }
    }
    
    // ============ 对话消息翻译模块 ============
    function setupMessageTranslator() {
        if (!CONFIG.translateMessages) return;
        
        console.log('🔍 启动消息翻译监控...');
        
        const messageObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            if (node.classList && node.classList.contains('smartcs-message')) {
                                processMessageElement(node);
                            } else if (node.querySelectorAll) {
                                const messages = node.querySelectorAll('.smartcs-message');
                                messages.forEach(processMessageElement);
                            }
                        }
                    });
                }
            });
        });
        
        let container = document.querySelector('.smartcs-conversation') || 
                       document.querySelector('[class*="conversation"]') || 
                       document.body;
        
        messageObserver.observe(container, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            const existingMessages = document.querySelectorAll('.smartcs-message');
            console.log(`处理 ${existingMessages.length} 个已有消息`);
            existingMessages.forEach(processMessageElement);
        }, 1500);
    }
    
    async function processMessageElement(element) {
        if (element.hasAttribute('data-translated')) return;
        
        const pElement = element.querySelector('p');
        const text = (pElement?.textContent || element.textContent || "").trim();
        
        if (!text || text.length < 2) return;
        
        const hasEnglish = /[A-Za-z]/.test(text);
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);
        
        if (hasEnglish && !hasChinese) {
            console.log('翻译英文消息:', text.substring(0, 50));
            try {
                const translation = await translateText(text, 'en', 'zh');
                if (translation?.translated) {
                    const translationDiv = document.createElement('div');
                    translationDiv.className = 'message-translation';
                    translationDiv.style.cssText = 'font-size:12px; color:#666; margin-top:4px; padding-left:10px; border-left:2px solid #ddd;';
                    translationDiv.textContent = `翻译：${translation.translated}`;
                    
                    if (pElement && pElement.parentNode) {
                        pElement.parentNode.insertBefore(translationDiv, pElement.nextSibling);
                    } else {
                        element.appendChild(translationDiv);
                    }
                    
                    element.setAttribute('data-translated', 'true');
                }
            } catch (error) {
                console.error('翻译失败:', error);
            }
        }
    }
    
    // ============ 输入框翻译模块 - 修复版本 ============
    function findChatInputElement() {
        // 1. 首先查找特定的textarea.textarea-input（根据你提供的HTML）
        const exactSelector = 'textarea.textarea-input';
        let element = document.querySelector(exactSelector);
        
        if (element) {
            console.log(`✅ 找到输入框: ${exactSelector}`, element);
            return element;
        }
        
        console.log(`❌ 未找到 ${exactSelector}，尝试其他选择器...`);
        
        // 2. 尝试其他可能的选择器
        const fallbackSelectors = [
            'textarea[placeholder*="4000 characters"]',
            'textarea[placeholder*="limit your text"]',
            'textarea[placeholder*="4000"]',
            'textarea[placeholder*="limit"]',
            'textarea[aria-label*="message"]',
            'textarea[data-aid*="Message"]',
            'textarea.message-input',
            'textarea.chat-input'
        ];
        
        for (let selector of fallbackSelectors) {
            element = document.querySelector(selector);
            if (element) {
                console.log(`⚠️ 使用备选选择器找到输入框: ${selector}`);
                return element;
            }
        }
        
        // 3. 如果还没找到，查找所有textarea并筛选
        const allTextareas = document.querySelectorAll('textarea');
        console.log(`页面上共有 ${allTextareas.length} 个textarea`);
        
        for (let textarea of allTextareas) {
            // 筛选条件：可见、有一定大小、有placeholder
            if (textarea.offsetHeight > 30 && 
                textarea.offsetWidth > 100 &&
                textarea.placeholder) {
                console.log('通过特征找到可能的输入框:', {
                    placeholder: textarea.placeholder.substring(0, 50),
                    className: textarea.className,
                    size: `${textarea.offsetWidth}x${textarea.offsetHeight}`
                });
                return textarea;
            }
        }
        
        // 4. 最后尝试任何可见的textarea
        for (let textarea of allTextareas) {
            if (textarea.offsetHeight > 0 && textarea.offsetWidth > 0) {
                console.log('找到可见的textarea作为备选:', textarea);
                return textarea;
            }
        }
        
        console.log('❌ 未找到任何输入框');
        return null;
    }
    
    async function handleInput(event) {
        const text = event.target.value.trim();
        console.log('输入框内容:', text);
        
        if (text.length > 0 && CONFIG.translateInput) {
            try {
                const result = await translateText(text, 'auto');
                if (result) {
                    console.log('输入翻译结果:', result.translated);
                    showTranslation(result.translated);
                }
            } catch (error) {
                console.error('输入翻译失败:', error);
            }
        } else {
            hideTranslation();
        }
    }
    
    function setupInputListener(textarea) {
        if (!textarea || textarea === currentTextarea) return;
        
        // 移除旧监听器
        if (currentTextarea) {
            currentTextarea.removeEventListener('input', handleInput);
            currentTextarea.removeEventListener('blur', hideTranslation);
            currentTextarea.style.borderLeft = '';
            currentTextarea.style.paddingLeft = '';
        }
        
        currentTextarea = textarea;
        
        // 添加新监听器
        const debouncedHandler = debounce(handleInput, CONFIG.translationDelay);
        textarea.addEventListener('input', debouncedHandler);
        textarea.addEventListener('blur', hideTranslation);
        
        // 添加视觉提示
        textarea.style.borderLeft = '3px solid #0366d6';
        textarea.style.paddingLeft = '8px';
        textarea.style.transition = 'border-color 0.3s';
        
        console.log('🎯 已启用双向输入翻译监听', textarea);
        
        // 立即显示一个提示
        setTimeout(() => {
            showTranslation('输入框翻译已启用！输入文字即可实时翻译。', false);
        }, 500);
    }
    
    function setupInputTranslator() {
        if (!CONFIG.translateInput) return;
        
        console.log('🔍 启动输入框翻译监控...');
        
        // 初始查找输入框
        const textarea = findChatInputElement();
        if (textarea) {
            setupInputListener(textarea);
        } else {
            console.log('⚠️ 初始未找到输入框，将通过观察器继续查找');
        }
        
        // 监听动态加载的输入框
        const inputObserver = new MutationObserver((mutations) => {
            console.log('DOM变化检测到，检查是否有新输入框...');
            const newTextarea = findChatInputElement();
            if (newTextarea && newTextarea !== currentTextarea) {
                console.log('检测到新输入框，重新绑定');
                setupInputListener(newTextarea);
            }
        });
        
        inputObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 安全轮询 - 多次尝试查找输入框
        let retryCount = 0;
        const maxRetries = 20; // 增加到20次
        const pollInterval = setInterval(() => {
            console.log(`第${retryCount + 1}次尝试查找输入框...`);
            
            if (!currentTextarea) {
                const textarea = findChatInputElement();
                if (textarea) {
                    setupInputListener(textarea);
                    console.log('✅ 通过安全轮询找到输入框');
                    clearInterval(pollInterval);
                } else if (retryCount++ > maxRetries) {
                    console.log('达到最大重试次数，未找到输入框');
                    clearInterval(pollInterval);
                    
                    // 最后尝试一次
                    setTimeout(() => {
                        const finalTextarea = findChatInputElement();
                        if (finalTextarea) {
                            setupInputListener(finalTextarea);
                        }
                    }, 2000);
                }
            } else {
                console.log('✅ 输入框已找到，停止轮询');
                clearInterval(pollInterval);
            }
        }, 1000);
    }
    
    // ============ 翻译结果显示 ============
    function showTranslation(text, isError = false) {
        if (!translationDisplay) translationDisplay = createTranslationDisplay();
        
        if (translationDisplay.textContent === text) return;
        
        translationDisplay.textContent = text;
        translationDisplay.style.backgroundColor = isError ? '#ffe6e6' : '#f0f9ff';
        translationDisplay.style.borderColor = isError ? '#d63636' : '#0366d6';
        translationDisplay.style.display = 'block';
        
        setTimeout(hideTranslation, 10000);
    }
    
    function hideTranslation() {
        if (translationDisplay) {
            translationDisplay.style.display = 'none';
        }
    }
    
    // ============ 静态内容翻译模块 ============
    function setupStaticContentTranslator() {
        if (!CONFIG.translateMessages) return;
        
        console.log('🔍 启动静态内容翻译监控...');
        
        const staticSelectors = [
            'li.smartcs-buttons-button',
            'div.item-title',
            'span.seller-info-text'
        ];
        
        staticTranslatedElements = new Set();
        
        function translateStatic() {
            console.log('开始静态内容翻译扫描...');
            let translatedCount = 0;
            
            staticSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                
                elements.forEach(element => {
                    if (staticTranslatedElements.has(element) || 
                        element.querySelector('.static-translation') || 
                        element.getAttribute('data-static-translated')) {
                        return;
                    }
                    
                    let text = element.textContent.trim();
                    if (!text) return;
                    
                    // 清理文本，移除可能已存在的翻译
                    const translationMatch = text.match(/^(.*?)\s*\([^)]+\)$/);
                    if (translationMatch) {
                        text = translationMatch[1].trim();
                    }
                    
                    const hasEnglish = /[A-Za-z]/.test(text);
                    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
                    
                    if (hasEnglish && !hasChinese) {
                        console.log(`识别到静态英文内容: ${text.substring(0, 50)}`);
                        
                        translateText(text, 'en', 'zh').then(translation => {
                            if (translation?.translated) {
                                // 再次检查，防止重复
                                if (element.querySelector('.static-translation')) return;
                                
                                const translationSpan = document.createElement('span');
                                translationSpan.className = 'static-translation';
                                translationSpan.style.cssText = 'color:#666; font-size:0.9em; margin-left: 5px;';
                                translationSpan.textContent = `(${translation.translated})`;
                                
                                if (element.lastChild && element.lastChild.nodeType === 3) {
                                    element.insertBefore(translationSpan, element.lastChild.nextSibling);
                                } else {
                                    element.appendChild(translationSpan);
                                }
                                
                                element.setAttribute('data-static-translated', 'true');
                                staticTranslatedElements.add(element);
                                translatedCount++;
                            }
                        });
                    }
                });
            });
            
            console.log(`本次扫描翻译了 ${translatedCount} 个静态元素`);
        }
        
        // 延迟执行，确保DOM加载完成
        setTimeout(translateStatic, 2000);
        
        // 监听新内容
        let staticObserverTimeout = null;
        const staticObserver = new MutationObserver(() => {
            if (staticObserverTimeout) clearTimeout(staticObserverTimeout);
            staticObserverTimeout = setTimeout(translateStatic, 1000);
        });
        
        staticObserver.observe(document.body, { 
            childList: true, 
            subtree: true
        });
    }
    
   // ============ 主初始化函数 - 调整顺序 ============
function startWatching() {
    console.log('🚀 启动增强翻译助手 (调整后顺序)...');
    
    // 1. 设置对话消息翻译
    setupMessageTranslator();
    console.log('✅ 消息翻译模块已启动');
    
    // 2. 设置静态内容翻译
    setupStaticContentTranslator();
    console.log('✅ 静态内容翻译模块已启动');
    
    // 3. (最后) 设置输入框翻译，因其动态加载最晚
    setTimeout(() => {
        setupInputTranslator();
    }, 3000); // 延迟3秒启动，给页面更多加载时间
    console.log('⏳ 输入框翻译模块将在延迟后启动...');
}

// ============ 输入框翻译模块 - 增强版 ============
function setupInputTranslator() {
    if (!CONFIG.translateInput) return;
    
    console.log('🔍 [延迟启动] 开始积极查找输入框...');
    
    let found = false;
    const maxAttempts = 30; // 最大尝试次数增加
    const interval = 500;   // 尝试间隔缩短为500ms
    let attempts = 0;
    
    // 积极的轮询查找
    const pollForInput = setInterval(() => {
        attempts++;
        const textarea = findChatInputElement(); // 使用你的查找函数
        
        if (textarea) {
            console.log(`✅ (尝试 ${attempts}/${maxAttempts}) 成功找到输入框:`, textarea);
            setupInputListener(textarea);
            found = true;
            clearInterval(pollForInput);
            
            // 可选：显示成功提示
            showTranslation('输入框已找到，双向翻译功能已激活！', false);
            
        } else if (attempts >= maxAttempts) {
            console.warn(`⚠️ 经过 ${maxAttempts} 次尝试仍未找到输入框，停止查找。`);
            clearInterval(pollForInput);
            showTranslation('未检测到输入框，请刷新页面或确保在客服对话框页面。', true);
        } else {
            console.log(`⏳ (尝试 ${attempts}/${maxAttempts}) 未找到输入框，继续...`);
        }
    }, interval);
    
    // 同时保留MutationObserver监听后续动态变化
    const inputObserver = new MutationObserver(() => {
        const newTextarea = findChatInputElement();
        if (newTextarea && newTextarea !== currentTextarea) {
            console.log('🔄 检测到动态新输入框，重新绑定。');
            setupInputListener(newTextarea);
        }
    });
    inputObserver.observe(document.body, { childList: true, subtree: true });
}
    
// ============ 启动 ============
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(startWatching, 1500); // 页面加载完成后延迟启动
    });
} else {
    setTimeout(startWatching, 1000); // 页面已加载，直接启动
}
    
    // ============ 暴露调试函数到全局 ============
    window.AmazonTranslator = {
        translateText: translateText,
        findMessages: function() {
            return document.querySelectorAll('.smartcs-message');
        },
        findInput: findChatInputElement,
        processAllMessages: async function() {
            const messages = document.querySelectorAll('.smartcs-message');
            console.log('找到消息:', messages.length);
            for (let msg of messages) {
                await processMessageElement(msg);
            }
        },
        setupInputListener: function(element) {
            if (element && element.tagName === 'TEXTAREA') {
                setupInputListener(element);
                return true;
            }
            return false;
        },
        showTranslation: showTranslation,
        hideTranslation: hideTranslation,
        config: CONFIG,
        test: async function() {
            console.log('=== Amazon翻译助手测试 ===');
            console.log('1. 查找消息:', this.findMessages().length);
            
            const input = this.findInput();
            console.log('2. 查找输入框:', input);
            
            console.log('3. 测试翻译...');
            const result = await this.translateText("你好，测试消息", 'zh', 'en');
            console.log('翻译结果:', result);
            
            if (result) {
                this.showTranslation(result.translated);
            }
            
            // 手动测试输入框
            if (input) {
                console.log('4. 手动测试输入框翻译...');
                input.value = "Hello, this is a test message";
                input.dispatchEvent(new Event('input'));
            }
        }
    };
    
    window.debugTranslator = window.AmazonTranslator;
    
    console.log('✅ Amazon翻译助手已加载完成！使用 window.AmazonTranslator.test() 进行测试');
    
})();