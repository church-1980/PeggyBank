/**
 * Does choosing a language actually change the screens?
 *
 * The picker and the dictionaries were proven separately. This proves the
 * thing that matters: pick Français, and the app is in French.
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

    await clickText(page, 'More'); await wait(1500);
    const english = await screenText(page);
    check(/Spending/.test(english) && /Savings Goals/.test(english), 'More is in English to start');

    await clickText(page, 'Settings'); await wait(1600);
    await clickText(page, 'Language'); await wait(1600);
    await clickText(page, 'Français'); await wait(1800);
    const back = async () => {
      await page.evaluate(() => {
        const el = document.querySelector('[aria-label="Go back"]');
        if (el) el.click();
      });
      await wait(1400);
    };
    await back();   // Language -> Settings
    await back();   // Settings -> More

    const more = await screenText(page);
    check(/Dépenses/.test(more), 'More is now in French', (more.match(/Dépenses|Revenus|Plus/g) || []).join(' '));
    check(/Revenus/.test(more), 'every tile translated, not just the title');
    check(!/Savings Goals|Recurring bills/.test(more), 'no English left behind on the screen');

    await clickText(page, 'Bilan du mois'); await wait(2200);
    const breakdown = await screenText(page);
    check(/Sorties d/.test(breakdown) || /Argent restant/.test(breakdown), 'Monthly Breakdown is in French',
      (breakdown.match(/[A-ZÀ-Ü][a-zà-ü' ]{4,24}/g) || []).slice(0, 3).join(' | '));
    check(!/Money out|Money left over/.test(breakdown), 'no English left on the breakdown');

    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 150));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const p = results.filter(Boolean).length;
  console.log(p + ' / ' + results.length + ' screen-language checks passed');
  process.exit(p === results.length ? 0 : 1);
})();
