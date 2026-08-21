/** Shared helpers for driving the real web app in Chrome. */
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.env.WEB_URL || 'http://localhost:8099/';

async function open({ headless = 'new' } = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=430,900'],
    defaultViewport: { width: 430, height: 900 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.errors = errors;
  return { browser, page };
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/** React Native Web renders plain divs, so elements are found by their text. */
async function clickText(page, text, { exact = false, timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const clicked = await page.evaluate((t, ex) => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,a,input'));
      const hits = nodes.filter(n => {
        const own = Array.from(n.childNodes).filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim();
        return ex ? own === t : own.includes(t);
      });
      if (!hits.length) return false;
      // innermost match, then walk up to something clickable
      let el = hits[hits.length - 1];
      for (let i = 0; i < 6 && el; i++) {
        const s = getComputedStyle(el);
        if (el.getAttribute('role') === 'button' || el.tagName === 'BUTTON' || s.cursor === 'pointer') break;
        el = el.parentElement;
      }
      (el || hits[hits.length - 1]).click();
      return true;
    }, text, exact);
    if (clicked) { await wait(600); return true; }
    await wait(250);
  }
  return false;
}

async function screenText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function hasText(page, text, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await screenText(page)).includes(text)) return true;
    await wait(250);
  }
  return false;
}

/** Type into the nth <input> on screen. */
async function typeInto(page, index, value) {
  const ok = await page.evaluate(i => {
    const els = Array.from(document.querySelectorAll('input,textarea'));
    if (!els[i]) return false;
    els[i].focus();
    return true;
  }, index);
  if (!ok) return false;
  await page.keyboard.type(value, { delay: 30 });
  return true;
}

async function inputs(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('input,textarea')).map(e => ({
      placeholder: e.placeholder || '', value: e.value || '', type: e.type || '',
    }))
  );
}

module.exports = { open, wait, clickText, screenText, hasText, typeInto, inputs, URL };
