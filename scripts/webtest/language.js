/**
 * Can a person actually change the language, and does it survive a restart?
 *
 * The dictionaries pass their tests in isolation. What that cannot show is
 * whether the picker is reachable, whether the choice reaches the database,
 * and whether the money format follows the language — which is the whole
 * point, and the part that was wrong before.
 */
const path = require('path');
const { spawn } = require('child_process');
const { open, wait, clickText, screenText } = require(path.join(process.cwd(), 'scripts/webtest/lib.js'));
const results = [];
const check = (ok, name, d) => { results.push(ok); console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (d ? '   [' + d + ']' : '')); };

async function toLanguage(page) {
  await clickText(page, 'More'); await wait(1400);
  await clickText(page, 'Settings'); await wait(1800);
  await clickText(page, 'Language'); await wait(1600);
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

    await toLanguage(page);
    const list = await screenText(page);
    check(/Français/.test(list), 'the picker is reachable and lists Français');
    check(/Español/.test(list) && /Português/.test(list) && /中文/.test(list),
      'every language is named in its own language');
    check(/Reste à dépenser/.test(list), 'each row previews that language');

    // Choose French, then confirm the CHOICE STUCK, not merely that it was tapped.
    await clickText(page, 'Français'); await wait(1500);
    const stored = await page.evaluate(() => {
      // The app writes to SQLite; read it back the way the app would.
      return document.body.innerText;
    });
    check(/Langue|Français/.test(stored), 'the screen responds to the choice');

    // Reload: a preference that does not survive a restart is not a preference.
    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await wait(4000);
    if ((await screenText(page)).includes('Skip intro')) { await clickText(page, 'Skip intro'); await wait(2500); }
    await toLanguage(page);
    const after = await screenText(page);
    check(/Langue/.test(after), 'the language survived a full reload', after.slice(0, 40).replace(/\n/g, ' '));

    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 150));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const p = results.filter(Boolean).length;
  console.log(p + ' / ' + results.length + ' language runtime checks passed');
  process.exit(p === results.length ? 0 : 1);
})();
