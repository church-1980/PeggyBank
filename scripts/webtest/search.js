/**
 * Can a person actually find an old transaction?
 * The unit tests prove the SQL. This proves the box is reachable, the results
 * render, and tapping one opens the real record.
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
    await addExpense(page, 195.65, 'Groceries');

    await clickText(page, 'More'); await wait(1400);
    await clickText(page, 'What Happened'); await wait(2200);
    const onActivity = (await screenText(page)).toLowerCase().includes('what happened');
    check(onActivity, 'reached What Happened');

    // The search affordance replaced the header spacer.
    const opened = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('[aria-label="Search your money"],[role="button"]'))
        .find(n => (n.getAttribute('aria-label') || '') === 'Search your money');
      if (!el) return false; el.click(); return true;
    });
    await wait(1800);
    check(opened, 'the search affordance exists in the header');

    const onSearch = await screenText(page);
    check(/Search your money/i.test(onSearch), 'the search screen opens');
    check(/Look for anything/i.test(onSearch), 'it explains what can be searched before typing');

    await typeInto(page, 0, '11.60'); await wait(2000);
    const found = await screenText(page);
    check(/result/i.test(found), 'searching an amount returns results', (found.match(/\d+ results?/) || [''])[0]);
    check(found.includes('11.60') || found.includes('$11.60'), 'the matching amount is shown');

    // Tapping must open the authoritative record, not a copy.
    await clickText(page, '11.60'); await wait(2200);
    const opened2 = await screenText(page);
    check(/Edit Expense|Amount|Save/i.test(opened2), 'tapping a result opens the real record', opened2.slice(0, 30).replace(/\n/g, ' '));

    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 150));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const p = results.filter(Boolean).length;
  console.log(p + ' / ' + results.length + ' search runtime checks passed');
  process.exit(p === results.length ? 0 : 1);
})();
