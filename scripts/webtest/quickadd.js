/**
 * Quick Add sits above the history, and every tile opens what it names.
 *
 * Two of the four used to promise an action and deliver a list, which is the
 * kind of thing that is obvious once seen and invisible until then.
 */
const path = require('path');
const { spawn } = require('child_process');
const { open, wait, clickText, screenText } = require(path.join(process.cwd(), 'scripts/webtest/lib.js'));
const results = [];
const check = (ok, name, d) => { results.push(ok); console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (d ? '   [' + d + ']' : '')); };

(async () => {
  const server = spawn(process.execPath, [path.join(process.cwd(), 'scripts/webtest/serve.js')], { stdio: 'ignore' });
  await wait(1500);
  let browser, page;
  try {
    ({ browser, page } = await open());
    await page.goto('http://localhost:8099/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(3500);
    if ((await screenText(page)).includes('Skip intro')) { await clickText(page, 'Skip intro'); await wait(2500); }

    // The history only appears once there IS history, so the order check needs
    // something to order against.
    await clickText(page, 'Expense', { exact: true }); await wait(1600);
    await page.evaluate(() => {
      const el = document.querySelector('input');
      if (el) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, '12.34');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(500);
    await clickText(page, 'Groceries'); await wait(400);
    await clickText(page, 'Save'); await wait(2500);

    const home = await screenText(page);
    check(/Expense/.test(home) && /Income/.test(home) && /Bill/.test(home) && /Goal/.test(home),
      'all four actions are on Home');

    // Order: the actions must come BEFORE the history.
    const iQuick = home.indexOf('Expense');
    const iHistory = home.indexOf('What happened');
    check(iQuick > -1 && iHistory > -1 && iQuick < iHistory,
      'actions come before the history', 'actions@' + iQuick + ' history@' + iHistory);

    // Bill must open the FORM, not the list.
    await clickText(page, 'Bill', { exact: true }); await wait(2200);
    const bill = await screenText(page);
    check(/How is this paid?/.test(bill), 'Bill opens the add form, not the Bills list',
      bill.slice(0, 40).replace(/\n/g, ' '));

    await page.goto('http://localhost:8099/', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(3000);
    await clickText(page, 'Goal', { exact: true }); await wait(2200);
    const goal = await screenText(page);
    check(/New Savings Goal/.test(goal), 'Goal opens the add form, not the Goals list',
      goal.slice(0, 40).replace(/\n/g, ' '));

    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 150));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const p = results.filter(Boolean).length;
  console.log(p + ' / ' + results.length + ' quick-add checks passed');
  process.exit(p === results.length ? 0 : 1);
})();
