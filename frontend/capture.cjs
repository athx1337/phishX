const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/');
  await new Promise(r => setTimeout(r, 4500)); // wait for typing anim
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
