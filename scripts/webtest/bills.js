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

    await clickText(page, 'More'); await wait(1500);
    await clickText(page, 'Bills & Subscriptions'); await wait(2500);
    const onBills = (await screenText(page)).includes('Subscriptions');
    check(onBills, 'reached the Bills screen');

    // Two '+ Add' links exist and clickText takes the last, which is the
    // SUBSCRIPTIONS one. Open the form and pick Bill explicitly.
    await clickText(page, '+ Add'); await wait(1800);
    await clickText(page, 'Bill', { exact: true }); await wait(900);
    const text = await screenText(page);
    check(text.includes('How is this paid?'), 'the payment-method question is shown');
    check(text.includes('I pay it'), 'the "I pay it" choice renders');
    check(text.includes('Auto-pay'), 'the "Auto-pay" choice renders');
    check(text.includes("You'll mark it paid"), 'each choice explains itself in plain English');

    // Choosing Auto-pay must reveal the opt-out, and only then.
    const beforeOptOut = (await screenText(page)).includes('assume it went through');
    check(!beforeOptOut, 'the opt-out is hidden until auto-pay is chosen');
    await clickText(page, 'Auto-pay'); await wait(900);
    const afterOptOut = (await screenText(page)).includes('assume it went through');
    check(afterOptOut, 'choosing auto-pay reveals the opt-out');

    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 150));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const p = results.filter(Boolean).length;
  console.log(p + ' / ' + results.length + ' bills runtime checks passed');
  process.exit(p === results.length ? 0 : 1);
})();
