// getKimiContent.js
const puppeteer = require('puppeteer');
const url = 'https://www.kimi.com/share/d3ue3u6f5ku58cd1jo40';

async function getKimiContent(url) {
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
    // 【关键】等待我们已知的 Kimi 对话列表容器出现
    await page.waitForSelector('div.share-content-list', { timeout: 30000 });
    console.log('✅ 对话列表容器已加载。');
    
    console.log('开始提取所有对话内容...');
    const messages = await page.evaluate(() => {
        const cleanedMessages = [];
        // 在对话列表容器中，选择所有包含消息内容的 div
        const messageElements = document.querySelectorAll('div.share-content-list div.segment-content');
        
        messageElements.forEach(element => {
            const text = element.innerText.trim();
            if (text) {
                cleanedMessages.push(text);
            }
        });

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

getKimiContent(url);