// Walk the app and report what each step actually shows.
const { open, wait, clickText, screenText, inputs, URL } = require('./lib');
(async () => {
  const { browser, page } = await open();
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(5000);
  console.log('--- 1. landing ---');
  console.log((await screenText(page)).slice(0, 200));

  console.log('\n--- 2. after Skip intro ---');
  console.log('clicked:', await clickText(page, 'Skip intro'));
  await wait(3000);
  console.log((await screenText(page)).slice(0, 500));

  console.log('\n--- inputs on screen ---');
  console.log(JSON.stringify(await inputs(page)));
  console.log('\n--- console errors:', page.errors.length, '---');
  page.errors.slice(0, 5).forEach(e => console.log('  ' + e.slice(0, 160)));
  await browser.close();
})();
