// getChatContent_ultimate_robust.js
const puppeteer = require('puppeteer');
const url = 'https://chat.z.ai/s/edc839d7-c59b-404e-afef-1683e29e2d8c'; 

async function getChatContent(url) {
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
    await page.waitForSelector('div.chat-assistant', { timeout: 30000 });
    console.log('✅ AI 回复容器已加载。');
    
    console.log('开始使用健壮的向上遍历方法提取内容...');
    const messages = await page.evaluate(() => {
        const cleanedMessages = [];
        const assistantContainers = document.querySelectorAll('div.chat-assistant');

        assistantContainers.forEach(container => {
            const clonedContainer = container.cloneNode(true);
            
            // 【核心逻辑】使用关键词数组进行更健壮的检查
            const titleElement = clonedContainer.querySelector('div[class*="truncate"]');
            let thoughtProcessContainer = null;

            if (titleElement) {
                let parent = titleElement.parentElement;
                // 定义可能的开头和结尾关键词
                const startKeywords = ['拆解用户请求', '拆解用户的请求', '思考过程'];
                const endKeywords = ['审阅和完善', '回顾与完善', '最后的建议', '通读整个回答'];

                while (parent && parent !== clonedContainer) {
                    const text = parent.innerText;
                    // 检查是否包含任何一个开头关键词和任何一个结尾关键词
                    const hasStart = startKeywords.some(keyword => text.includes(keyword));
                    const hasEnd = endKeywords.some(keyword => text.includes(keyword));
                    
                    if (hasStart && hasEnd) {
                        thoughtProcessContainer = parent;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
            
            if (thoughtProcessContainer) {
                thoughtProcessContainer.remove();
            }
            
            const finalText = clonedContainer.innerText.trim();
            if (finalText) {
                cleanedMessages.push(finalText);
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

getChatContent(url);