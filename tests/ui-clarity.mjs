// Device-resolution text and source-art proportions must survive wide phone panes.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/';
const out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-ui-clarity';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),checks=[],errors=[];
const catalog=await(await fetch(new URL('/api/catalog',base))).json();
for(const [width,height] of [[309,767],[532,752],[1211,810],[1900,900]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce'});
 await context.route('**/api/catalog',r=>r.fulfill({json:catalog}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.evaluate(()=>document.fonts.check('40px MountainBrush','一山千年泰山')),true);
 for(const selector of ['#welcome-title','#welcome-enter','#welcome-continue']){
  const element=page.locator(selector);assert.equal(await element.isVisible(),true);
  assert.equal(await element.evaluate(e=>getComputedStyle(e).color.endsWith(', 0)')),false);
 }
 if(width<768){assert.equal(await page.locator('.welcome-cover').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.left<=0&&r.right>=innerWidth&&r.top<=0&&r.bottom>=innerHeight&&s.backgroundSize==='cover'&&s.maskImage==='none'}),true);}
 await page.screenshot({path:`${out}/${width}-welcome.png`});
 await page.locator('#welcome-title').screenshot({path:`${out}/${width}-heading.png`});
 await page.locator('#welcome-enter').click();await page.waitForSelector('.welcome-scene[hidden]',{state:'attached'});
 if(width<768){
  const ratio=await page.locator('.map-stage').evaluate(e=>{const r=e.getBoundingClientRect();return r.width/r.height;});assert.ok(Math.abs(ratio-309/645)<.015);
  for(const item of await page.locator('.home .ui-bottom-nav button').all())assert.equal(await item.locator('span').evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.locator('.home .ui-bottom-nav').screenshot({path:`${out}/${width}-navigation.png`});
 }
 await page.goto(base+'#read',{waitUntil:'domcontentloaded'});await page.waitForSelector('.native-read-copy');
 assert.equal(await page.locator('.native-read-copy').count(),5);
 for(const element of await page.locator('.native-read-copy').all())assert.equal(await element.evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await page.goto(base+'#history',{waitUntil:'domcontentloaded'});await page.waitForSelector('.ref-history-heading h1');
 assert.equal(await page.locator('#culture-title').count(),1);
 assert.equal(await page.locator('.ref-history-heading h1').evaluate(e=>getComputedStyle(e).clipPath),'none');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 checks.push({width,height,dpr:2,fontLoaded:true,nativeText:true,sourceAspectAndFullCanvas:true});await context.close();
}
assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));await browser.close();
