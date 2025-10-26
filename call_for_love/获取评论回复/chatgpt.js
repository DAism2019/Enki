// getChatGPTContent_final.js
const puppeteer = require('puppeteer');
const url = 'https://chatgpt.com/share/68fcee60-a778-800f-9e97-cfa1ee7d2628';

async function getChatGPTContent(url) {
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    console.log('✅ 页面 DOM 已加载。');

    console.log('等待 20 秒，让页面充分渲染...');
    await new Promise(resolve => setTimeout(resolve, 20000));

    console.log('开始提取所有对话内容...');
    const messages = await page.evaluate(() => {
        const extractedMessages = [];

        // 【关键修复】直接查找所有用户消息和AI回复，而不是在回合容器里找
        const userMessages = document.querySelectorAll('div[class*="user-message-bubble-color"]');
        const aiResponses = document.querySelectorAll('div[class*="agent-turn"]');

        // 将所有找到的元素合并到一个数组中
        const allMessageElements = [...userMessages, ...aiResponses];

        // 按元素在页面中的位置进行排序
        allMessageElements.sort((a, b) => {
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            // 比较它们顶部的位置
            if (aRect.top !== bRect.top) {
                return aRect.top - bRect.top;
            }
            // 如果顶部相同，比较左边的位置
            return aRect.left - bRect.left;
        });

        // 遍历排序后的元素并提取文本
        allMessageElements.forEach(element => {
            const text = element.innerText.trim();
            if (text.length < 20) return; // 过滤太短的文本

            if (element.className.includes('user-message')) {
                extractedMessages.push({ role: 'user', text });
            } else if (element.className.includes('agent-turn')) {
                extractedMessages.push({ role: 'assistant', text });
            }
        });

        return extractedMessages;
    });

    if (messages.length === 0) {
        console.log('\n--- 警告：成功执行，但未提取到任何有效消息。 ---\n');
    } else {
        console.log('\n--- 成功提取所有对话内容 ---\n');
        messages.forEach((message, index) => {
          console.log(`[消息 ${index + 1}] (${message.role}):`);
          console.log(message.text);
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

getChatGPTContent(url);