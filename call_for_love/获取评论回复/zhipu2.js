// getChatGLMContent.js
const puppeteer = require('puppeteer');
const url = 'https://chatglm.cn/share/QFiIdhJM';

async function getChatGLMContent(url) {
  let browser;
  try {
    console.log('正在启动浏览器...');
    browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`正在导航到页面: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    console.log('等待 AI 回复容器加载...');
    // 【关键】等待我们已知的 ChatGLM AI 回复容器出现
    await page.waitForSelector('div.answer', { timeout: 30000 });
    console.log('✅ AI 回复容器已加载。');
    
    console.log('开始通过精确选择器提取最终答案...');
    const messages = await page.evaluate(() => {
        const cleanedMessages = [];
        // 选择所有 AI 回复的容器
        const answerContainers = document.querySelectorAll('div.answer');

        answerContainers.forEach(container => {
            // 【核心逻辑】使用 :not() 伪类选择器，精确选择只包含最终答案的容器
            // 这个选择器的含义是：选择一个 class 包含 'answer-content-wrap' 但不包含 'text-thinking-content' 的 div
            const finalAnswerElement = container.querySelector('div.answer-content-wrap:not(.text-thinking-content)');
            
            // 如果找到了这个元素，就提取它的文本
            if (finalAnswerElement) {
                const finalText = finalAnswerElement.innerText.trim();
                if (finalText) {
                    cleanedMessages.push(finalText);
                }
            }
        });

        return cleanedMessages;
    });

    if (messages.length === 0) {
        console.log('\n--- 警告：成功执行，但未提取到任何有效消息。 ---\n');
    } else {
        console.log('\n--- 成功提取并清理后的对话内容 ---\n');
        messages.forEach((message, index) => {
          console.log(`[消息 ${index + 1}]:`);
          console.log(message);
          console.log('-------------------------');
        });
    }

    return messages;

  } catch (error) {
    console.error('抓取过程中发生错误:', error.message);
  } finally {
    if (browser) {
      console.log('\n正在关闭浏览器...');
      await browser.close();
    }
  }
}

getChatGLMContent(url);