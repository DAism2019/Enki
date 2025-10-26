// getDoubaoContent.js
const puppeteer = require('puppeteer');
const url = 'https://www.doubao.com/thread/we338170a5a11a4b8';

async function getDoubaoContent(url) {
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

    console.log('等待对话列表容器加载...');
    // 【关键】等待我们已知的豆包对话列表容器出现，使用部分类名匹配更稳定
    await page.waitForSelector('div[class*="message-list-root"]', { timeout: 30000 });
    console.log('✅ 对话列表容器已加载。');
    
    console.log('开始提取所有对话内容...');
    const messages = await page.evaluate(() => {
        const cleanedMessages = [];
        // 使用部分类名匹配找到消息列表容器
        const messageListContainer = document.querySelector('div[class*="message-list-root"]');
        
        if (messageListContainer) {
            // 遍历容器的直接子元素，这些子元素就是每一条独立的消息
            const messageElements = messageListContainer.children;
            
            for (const element of messageElements) {
                const text = element.innerText.trim();
                // 过滤掉空的或太短的元素（比如只包含图标的元素）
                if (text && text.length > 5) {
                    cleanedMessages.push(text);
                }
            }
        }

        return cleanedMessages;
    });

    if (messages.length === 0) {
        console.log('\n--- 警告：成功执行，但未提取到任何有效消息。 ---\n');
    } else {
        console.log('\n--- 成功提取所有对话内容 ---\n');
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

getDoubaoContent(url);