/**
 * Tapping a slice must show what the slice was made of, and each row must
 * open the real record. A total nobody can open is a dead end.
 */
const path = require('path');
const { spawn } = require('child_process');
const { open, wait, clickText, screenText, typeInto } = require(path.join(process.cwd(), 'scripts/webtest/lib.js'));
const results = [];
const check = (ok, name, d) => { results.push(ok); console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (d ? '   [' + d + ']' : '')); };

async function addExpense(page, amount, categoryLabel) {
  await clickText(page, 'Add Expense'); await wait(1500);
  await typeInto(page, 0, String(amount)); await wait(400);
  await clickText(page, categoryLabel);  await wait(400);
  await clickText(page, 'Save');         await wait(2000);
}

(async () => {
  const server = spawn(process.execPath, [path.join(process.cwd(), 'scripts/webtest/serve.js')], { stdio: 'ignore' });
  await wait(1500);
  let browser, page;
  try {
    ({ browser, page } = await open());
    await page.goto('http://localhost:8099/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(3500);
    if ((await screenText(page)).includes('Skip intro')) { await clickText(page, 'Skip intro'); await wait(2500); }

    await addExpense(page, 11.60, 'Restaurant');
    await addExpense(page, 42.50, 'Restaurant');
    await addExpense(page, 195.65, 'Groceries');

    await clickText(page, 'More'); await wait(1400);
    await clickText(page, 'Monthly Breakdown'); await wait(2500);
    check(/Where your money went/i.test(await screenText(page)), 'reached the breakdown');

    // Tap the Restaurant slice in the legend.
    const tapped = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('[role="button"]'))
        .find(n => (n.getAttribute('aria-label') || '').startsWith('Restaurant'));
      if (!el) return false; el.click(); return true;
    });
    await wait(1800);
    check(tapped, 'the legend row is tappable');

    const sheet = await screenText(page);
    check(/54\.10|11\.60/.test(sheet), 'the sheet shows the transactions behind it',
      (sheet.match(/\$[\d.,]+/g) || []).slice(0, 4).join(' '));

    await clickText(page, '11.60'); await wait(2200);
    check(/Edit Expense|Amount/i.test(await screenText(page)), 'tapping a row opens the real record');

    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 150));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const p = results.filter(Boolean).length;
  console.log(p + ' / ' + results.length + ' drill-down runtime checks passed');
  process.exit(p === results.length ? 0 : 1);
})();
