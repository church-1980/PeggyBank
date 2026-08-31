/**
 * Does the Calendar show WORDS, and does it understand time?
 *
 * The old grid drew coloured dots and never read bill_payments, so a past
 * month showed every bill as still owed. This walks backwards and forwards
 * and reads what the cells actually say.
 */
const path = require('path');
const { spawn } = require('child_process');
const { open, wait, clickText, screenText, typeInto } = require(path.join(process.cwd(), 'scripts/webtest/lib.js'));
const results = [];
const check = (ok, name, d) => { results.push(ok); console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (d ? '   [' + d + ']' : '')); };

const back = async (page, wait_) => {
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Go back"]');
    if (el) el.click();
  });
  await wait_(1200);
};

(async () => {
  const server = spawn(process.execPath, [path.join(process.cwd(), 'scripts/webtest/serve.js')], { stdio: 'ignore' });
  await wait(1500);
  let browser, page;
  try {
    ({ browser, page } = await open());
    await page.goto('http://localhost:8099/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(3500);
    if ((await screenText(page)).includes('Skip intro')) { await clickText(page, 'Skip intro'); await wait(2500); }

    // A bill, so the calendar has something recurring to project.
    await clickText(page, 'Bill', { exact: true }); await wait(1800);
    await typeInto(page, 0, 'Hydro'); await wait(300);
    await typeInto(page, 1, '84'); await wait(300);
    await clickText(page, 'Save'); await wait(2200);

    await clickText(page, 'More'); await wait(1400);
    await clickText(page, 'Calendar'); await wait(2500);
    const now = await screenText(page);
    check(/Hydro/.test(now), 'the current month names the bill in the grid',
      (now.match(/Hydro/g) || []).length + ' mentions');
    check(/Due|Auto/.test(now), 'and says what state it is in');

    // Backwards: a plan must project into months no row mentions.
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('[role="button"]'))
          .find(n => /previous/i.test(n.getAttribute('aria-label') || ''));
        if (el) el.click();
      });
      await wait(900);
    }
    const past = await screenText(page);
    check(/Hydro/.test(past), 'three months back still shows the recurring bill');

    // Forwards.
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('[role="button"]'))
          .find(n => /next/i.test(n.getAttribute('aria-label') || ''));
        if (el) el.click();
      });
      await wait(900);
    }
    const future = await screenText(page);
    check(/Hydro/.test(future), 'three months forward projects it too');

    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 150));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const p = results.filter(Boolean).length;
  console.log(p + ' / ' + results.length + ' calendar runtime checks passed');
  process.exit(p === results.length ? 0 : 1);
})();
