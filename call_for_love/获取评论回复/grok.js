// getGrokContent_stealth.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// 使用 stealth 插件
puppeteer.use(StealthPlugin());

const url = 'https://grok.com/share/c2hhcmQtNQ%3D%3D_2b7de36e-167e-4201-b68c-8f8ff24d1fea';

async function getGrokContent(url) {
  let browser;
  try {
    console.log('正在启动“隐身”浏览器...');
    browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`正在导航到页面: ${url}`);
    // 等待网络空闲，并增加超时时间
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
    console.log('✅ 页面导航完成。');

    // 等待一个明确的对话内容容器出现，而不是等待文本长度
    console.log('等待对话内容加载...');
    // 我们需要先猜测一个可能的选择器，如果失败再调整
    await page.waitForSelector('div[class*="message"]', { timeout: 30000 });
    console.log('✅ 对话内容已加载。');
    
    console.log('开始提取对话内容...');
    const messages = await page.evaluate(() => {
        const cleanedMessages = [];
        // 尝试找到所有消息容器
        const messageElements = document.querySelectorAll('div[class*="message"]');
        
        messageElements.forEach(element => {
            const text = element.innerText.trim();
            if (text && text.length > 10) {
                cleanedMessages.push(text);
            }
        });

        return cleanedMessages;
    });

    if (messages.length === 0) {
        console.log('\n--- 警告：成功绕过验证，但未提取到任何有效消息。可能需要调整选择器。 ---\n');
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
    if (error.message.includes('TimeoutError')) {
        console.error('提示：等待内容超时。可能网站更新了结构，或者反爬虫策略再次升级。');
    }
  } finally {
    if (browser) {
      console.log('\n正在关闭浏览器...');
      await browser.close();
    }
  }
}

getGrokContent(url);