/**
 * Does the donut actually render in a real browser, with real data?
 * The standard web audit never reaches Monthly Breakdown, and an SVG chart is
 * exactly the kind of thing that passes in Jest and is blank on a device.
 */
const path = require('path');
const { spawn } = require('child_process');
const { open, wait, clickText, screenText, typeInto } = require(path.join(process.cwd(), 'scripts/webtest/lib.js'));

const results = [];
const check = (ok, name, detail) => { results.push({ ok, name }); console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   [' + detail + ']' : '')); };

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

    // Three categories, so the ring has something to say.
    await addExpense(page, 195.65, 'Groceries');
    await addExpense(page, 117.27, 'Restaurant');
    await addExpense(page, 78.18,  'Gas');

    await clickText(page, 'More'); await wait(1500);
    await clickText(page, 'Monthly Breakdown'); await wait(3000);

    const view = await page.evaluate(() => {
      const text = document.body.innerText;
      const svgs = Array.from(document.querySelectorAll('svg'));
      const donut = svgs.find(s => s.querySelectorAll('circle').length >= 2);
      const circles = donut ? Array.from(donut.querySelectorAll('circle')) : [];
      const r = donut ? donut.getBoundingClientRect() : null;
      const money = (text.match(/\$[\d,]+\.\d{2}/g) || []);
      return {
        onScreen: /Where your money went/i.test(text),
        hasDonut: !!donut,
        strokes: circles.filter(c => (c.getAttribute('stroke') || 'none') !== 'none').length,
        dashed: circles.filter(c => (c.getAttribute('stroke-dasharray') || '').length > 0).length,
        w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0,
        noSideScroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
        labels: ['Groceries', 'Restaurant', 'Gas'].filter(l => text.includes(l)),
        percents: (text.match(/\b\d{1,3}%/g) || []),
        money,
        card: (text.match(/Where your money went[\s\S]{0,260}/) || [''])[0],
      };
    });

    check(view.onScreen,  'Monthly Breakdown shows "Where your money went"');
    check(view.hasDonut,  'a donut SVG is rendered');
    check(view.strokes >= 3, 'it has coloured segments', view.strokes + ' stroked circles');
    check(view.dashed >= 1,  'segments are arcs, not full rings', view.dashed + ' dashed');
    check(view.w > 120 && view.h > 120, 'the donut has real size', view.w + 'x' + view.h);
    check(view.labels.length === 3, 'every slice is also named in words', view.labels.join(', '));
    check(view.percents.length >= 3, 'percentages are shown', view.percents.join(' '));
    check(view.money.includes('$391.10'), 'the centre shows the real total out', view.money.slice(0, 6).join(' '));
    check(view.noSideScroll, 'the page does not scroll sideways on a 430px phone');
    check(page.errors.length === 0, 'no errors in the browser console', page.errors.slice(0, 2).join(' | '));
    console.log('\n--- what the card actually says ---\n' + view.card + '\n');
  } catch (e) {
    check(false, 'ran to completion', String(e.message).slice(0, 160));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const passed = results.filter(r => r.ok).length;
  console.log(passed + ' / ' + results.length + ' donut runtime checks passed');
  process.exit(passed === results.length ? 0 : 1);
})();
