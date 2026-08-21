const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => {
    console.log('=== PAGE ERROR ===');
    console.log(e.message);
    console.log('--- stack ---');
    console.log((e.stack || '').split('\n').slice(0, 14).join('\n'));
  });
  await page.goto('http://localhost:8099/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
