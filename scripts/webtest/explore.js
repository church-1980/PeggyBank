// First look: does the app actually START in a browser, and is the database alive?
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8099/';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 6000));   // let the DB spin up

  const info = await page.evaluate(() => ({
    crossOriginIsolated: window.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    title: document.title,
    bodyTextLength: document.body.innerText.length,
    firstText: document.body.innerText.slice(0, 400),
    testIds: Array.from(document.querySelectorAll('[data-testid]')).map(e => e.getAttribute('data-testid')).slice(0, 40),
  }));

  console.log('crossOriginIsolated :', info.crossOriginIsolated);
  console.log('SharedArrayBuffer   :', info.sharedArrayBuffer);
  console.log('document.title      :', info.title);
  console.log('rendered text length:', info.bodyTextLength);
  console.log('--- first text on screen ---');
  console.log(info.firstText);
  console.log('--- testIDs found (' + info.testIds.length + ') ---');
  console.log(info.testIds.join(', '));
  console.log('--- console errors (' + errors.length + ') ---');
  errors.slice(0, 12).forEach(e => console.log('  ' + e.slice(0, 200)));

  await browser.close();
})();
