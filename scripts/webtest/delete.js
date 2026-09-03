const path=require('path');const {spawn}=require('child_process');
const {open,wait,clickText,screenText,typeInto}=require(path.join(process.cwd(),'scripts/webtest/lib.js'));
let pass=0,fail=0;
const check=(ok,label,extra)=>{ok?pass++:fail++;console.log((ok?'  PASS  ':'  FAIL  ')+label+(extra&&!ok?'   ['+String(extra).replace(/\n/g,' ').slice(0,90)+']':''));};
const scrollDown=async(page)=>page.evaluate(()=>{for(const el of document.querySelectorAll('*')){if(el.scrollHeight>el.clientHeight+50)el.scrollTop=el.scrollHeight;}});
(async()=>{
  const server=spawn(process.execPath,[path.join(process.cwd(),'scripts/webtest/serve.js')],{stdio:'ignore'});
  await wait(1500);
  const {browser,page}=await open();
  const errs=[];page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await page.goto('http://localhost:8099/',{waitUntil:'networkidle2',timeout:60000});
  await wait(3500);
  if((await screenText(page)).includes('Skip intro')){await clickText(page,'Skip intro');await wait(2500);}

  await clickText(page,'Expense',{exact:true}); await wait(1600);
  await typeInto(page,0,'49.52'); await wait(300);
  await clickText(page,'Restaurant'); await wait(300);
  const inputs=await page.$$('input');
  if(inputs[1]) { await inputs[1].click(); await page.keyboard.type('alamy'); }
  await clickText(page,'Save'); await wait(2200);

  let t=await screenText(page);
  check(/49\.52/.test(t),'the expense reaches Home',t);

  await clickText(page,'More'); await wait(1500);
  await clickText(page,'What Happened'); await wait(2200);
  check((await screenText(page)).includes('alamy'),'What Happened shows it');
  await clickText(page,'alamy'); await wait(2200);

  // The reported situation: clear the amount, try to Update, get nowhere.
  await typeInto(page,0,''); await wait(500);
  await scrollDown(page); await wait(600);
  t=await screenText(page);
  check(t.includes('Delete expense'),'Delete expense is on the record screen',t);

  await clickText(page,'Delete expense'); await wait(1200);
  t=await screenText(page);
  check(/Delete this expense\?/.test(t),'the confirmation is VISIBLE',t);
  check(/49\.52/.test(t),'and names the money even with the box cleared',t);
  check(/Keep/.test(t),'offers a way out',t);

  await page.screenshot({path:process.argv[3]});
  await clickText(page,'Delete'); await wait(2500);
  t=await screenText(page);
  check(!/alamy/i.test(t),'gone from where we returned to',t);

  await clickText(page,'Home'); await wait(2400);
  t=await screenText(page);
  check(!/alamy/i.test(t)&&!/49\.52/.test(t),'gone from Home and no longer counted',t);

  await page.reload({waitUntil:'networkidle2'}); await wait(3800);
  t=await screenText(page);
  check(!/alamy/i.test(t)&&!/49\.52/.test(t),'STILL gone after a reload — really deleted',t);

  await clickText(page,'More'); await wait(1500);
  await clickText(page,'Monthly Breakdown'); await wait(2400);
  t=await screenText(page);
  check(!/49\.52/.test(t),'gone from Monthly Breakdown',t);

  check(errs.length===0,'no errors in the browser console',errs.join(' | '));
  await page.screenshot({path:process.argv[2]});
  console.log('\n'+pass+' / '+(pass+fail)+' delete runtime checks passed');
  await browser.close(); server.kill();
  process.exit(fail?1:0);
})();
