/**
 * WEB RUNTIME PERSISTENCE TEST (audit section 21).
 *
 * This is the test that decides whether "the web build succeeded" means
 * anything. It drives real Chrome against the real exported build and answers
 * the only question that matters on web:
 *
 *     If someone types their money in and closes the tab, is it still there?
 *
 * On web PeggyBank's database is SQLite compiled to WebAssembly, persisted
 * through the browser rather than a file. That is the part most likely to be
 * silently broken, and no unit test can see it: jest runs against a native
 * mock, and a bundle that compiles proves only that the JavaScript parses.
 *
 * Nothing here touches the real app on anyone's phone. The browser profile is
 * temporary and the data lives under localhost.
 */
const { open, wait, clickText, screenText, hasText, typeInto, URL } = require('./lib');

const AMOUNT = '137.42';
const results = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   [' + detail + ']' : ''));
}

(async () => {
  const { browser, page } = await open();

  // ---- 1. does it start at all ----
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(5000);
  const iso = await page.evaluate(() => ({
    isolated: window.crossOriginIsolated,
    sab: typeof SharedArrayBuffer !== 'undefined',
  }));
  check('page is cross-origin isolated (WASM SQLite needs it)', iso.isolated);
  check('SharedArrayBuffer is available', iso.sab);
  check('app renders something', (await screenText(page)).length > 20);

  await clickText(page, 'Skip intro');
  await wait(2500);
  check('reaches the dashboard', await hasText(page, 'Safe to Spend'));

  // ---- 2. write ----
  await clickText(page, 'Add Expense');
  await wait(2000);
  await typeInto(page, 0, AMOUNT);
  await clickText(page, 'Groceries');
  await wait(400);
  await clickText(page, 'Save');
  await wait(3500);
  check('saving an expense returns to the app', !(await screenText(page)).includes('Add Expense\n$'));

  // ---- 3. read back in the same session ----
  await clickText(page, 'More'); await wait(1500);
  await clickText(page, 'Spending'); await wait(2500);
  const seenBefore = await hasText(page, AMOUNT, 6000);
  check('the expense is listed after saving', seenBefore, seenBefore ? '' : 'never appeared');

  // ---- 4. THE ONE THAT MATTERS: survive a reload ----
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await wait(6000);
  let text = await screenText(page);
  if (text.includes('Skip intro')) { await clickText(page, 'Skip intro'); await wait(2500); }
  await clickText(page, 'More'); await wait(1500);
  await clickText(page, 'Spending'); await wait(3000);
  const survived = await hasText(page, AMOUNT, 8000);
  check('THE EXPENSE SURVIVES A PAGE RELOAD', survived,
    survived ? 'written to disk, not just memory' : 'DATA LOST — the browser database is not persisting');

  // ---- 5. survive a completely new tab (closes and reopens) ----
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 430, height: 900 });
  await page.close();
  await page2.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(6000);
  if ((await page2.evaluate(() => document.body.innerText)).includes('Skip intro')) {
    await clickText(page2, 'Skip intro'); await wait(2500);
  }
  await clickText(page2, 'More'); await wait(1500);
  await clickText(page2, 'Spending'); await wait(3000);
  const newTab = await hasText(page2, AMOUNT, 8000);
  check('and survives closing the tab and opening a new one', newTab);

  // ---- 6. delete, and make the deletion stick ----
  await clickText(page2, AMOUNT); await wait(1500);
  const deleted = await clickText(page2, 'Delete');
  await wait(2500);
  if (deleted) {
    await page2.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await wait(6000);
    if ((await page2.evaluate(() => document.body.innerText)).includes('Skip intro')) {
      await clickText(page2, 'Skip intro'); await wait(2500);
    }
    await clickText(page2, 'More'); await wait(1500);
    await clickText(page2, 'Spending'); await wait(3000);
    const stillGone = !(await hasText(page2, AMOUNT, 4000));
    check('a deletion also survives a reload', stillGone);
  } else {
    check('a deletion also survives a reload', false, 'could not find a Delete control');
  }

  // ---- 7. the browser console has to be clean ----
  const real = page.errors.concat(page2.errors || []).filter(e => !/favicon|manifest\.json/i.test(e));
  check('no errors in the browser console', real.length === 0, real.slice(0, 2).join(' | ').slice(0, 160));

  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log('');
  console.log(results.length - failed.length + ' / ' + results.length + ' web runtime checks passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('web runtime test crashed: ' + e.message); process.exit(1); });
