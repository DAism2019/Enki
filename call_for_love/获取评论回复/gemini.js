// gemini_clean_scraper.js (兼容旧版 Puppeteer)
import puppeteer from "puppeteer";

const URL = "https://gemini.google.com/share/8dcb233223fa";

async function scrapeGeminiShare(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  console.log("访问页面:", url);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // 替代 page.waitForTimeout
  await new Promise(r => setTimeout(r, 5000));

  const result = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return [];

    const raw = Array.from(main.querySelectorAll("p, div, span"))
      .map(el => el.innerText?.trim())
      .filter(t => t && t.length > 0 && !/^\s*$/.test(t));

    const seen = new Set();
    const cleaned = [];
    for (const t of raw) {
      const normalized = t.replace(/\s+/g, " ").trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        cleaned.push(normalized);
      }
    }

    const merged = [];
    for (const t of cleaned) {
      if (
        merged.length > 0 &&
        merged[merged.length - 1].length < 40 &&
        t.length < 40
      ) {
        merged[merged.length - 1] += " " + t;
      } else {
        merged.push(t);
      }
    }

    return merged;
  });

  await browser.close();

  const markdown = result.map(t => `- ${t}`).join("\n");
  return markdown;
}

scrapeGeminiShare(URL)
  .then(text => {
    console.log("\n==== ✅ 清理后对话内容 ====\n");
    console.log(text);
  })
  .catch(err => console.error("❌ 出错:", err));
