const { open, wait, clickText, screenText, inputs, URL } = require('./lib');
(async () => {
  const { browser, page } = await open();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(5000);
  await clickText(page, 'Skip intro'); await wait(2500);
  console.log('clicked Add Expense:', await clickText(page, 'Add Expense'));
  await wait(2500);
  console.log('--- screen ---');
  console.log((await screenText(page)).slice(0, 600));
  console.log('--- inputs ---');
  console.log(JSON.stringify(await inputs(page), null, 1));
  console.log('--- errors:', page.errors.length);
  page.errors.slice(0, 4).forEach(e => console.log('  ' + e.slice(0, 150)));
  await browser.close();
})();
