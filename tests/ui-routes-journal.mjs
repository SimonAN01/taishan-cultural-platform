// Reported regressions: raster captions, duplicate selection, and journal copy covering old text.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/';
const out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-routes-journal';mkdirSync(out,{recursive:true});
const catalog=await(await fetch(new URL('/api/catalog',base),{signal:AbortSignal.timeout(15000)})).json();
const browser=await chromium.launch({headless:true,channel:'chrome'}),checks=[],errors=[];
try{
 for(const[width,height]of[[309,767],[508,752],[532,752],[1024,600],[1211,810],[1900,900]].filter(([w])=>!process.env.UI_WIDTH||Number(process.env.UI_WIDTH)===w)){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce'});
  let visited=[{spot_id:'daimiao'}];
  await context.route('**/api/catalog',r=>r.fulfill({json:catalog}));
  await context.route('**/api/journey',r=>r.fulfill({json:{visited,favorites:[],confirmed_predictions:[],total_spots:catalog.spots.length,story_progress:{completed:[],next_chapter:catalog.story.chapters[0].id,total:catalog.story.chapters.length}}}));
  await context.route('**/api/journey/visit',r=>r.fulfill({json:{saved:true}}));
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  let navigation=0;
  async function go(hash){await page.goto(base+'?ui=routes-journal-v2&check='+navigation+++'#'+hash,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForSelector('.culture-body #culture-title');await page.waitForFunction(()=>document.querySelector('.culture-body').dataset.loading==='false');await page.evaluate(()=>document.fonts.ready);}
  async function snap(name){await page.screenshot({path:`${out}/${width}-${name}.png`,timeout:15000});}
  await go('routes?id=hongmen');await page.waitForSelector('.native-route-card img');
  assert.equal(await page.locator('#culture-title').count(),1);
  assert.equal(await page.locator('[data-route-card]').count(),4);
  assert.equal(await page.locator('[data-route-card][aria-pressed=true]').count(),1);
  assert.equal(await page.locator('#culture-title').evaluate(e=>getComputedStyle(e).clipPath==='none'&&getComputedStyle(e).opacity==='1'),true);
  await page.waitForFunction(()=>[...document.querySelectorAll('.native-route-card img')].every(e=>e.complete&&e.naturalWidth>0));
  const cards=await page.locator('.native-route-card').evaluateAll(items=>items.map(e=>{const card=e.getBoundingClientRect(),text=e.querySelector('strong').getBoundingClientRect(),arrow=e.querySelector('i').getBoundingClientRect();return{textFits:text.right<=arrow.left-3,textInside:text.top>=card.top&&text.bottom<=card.bottom};}));
  assert.ok(cards.every(c=>c.textFits&&c.textInside),JSON.stringify({width,cards}));await snap('routes');
  for(const id of['dongyu','taohua','tianwai','hongmen']){await page.locator(`[data-route-card=${id}]`).click();assert.equal(await page.locator('[data-route-card][aria-pressed=true]').count(),1);assert.equal(await page.locator('[data-route-card][aria-pressed=true]').getAttribute('data-route-card'),id);}
  await page.locator('[data-route-card=tianwai]').click();await page.locator('[data-ref-route-real]').click();await page.waitForSelector('.native-route-real');
  assert.equal(await page.locator('[data-variant=cable]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.culture-stops [data-spot=shibapan]').count(),0);
  await page.locator('[data-variant=walk]').click();assert.equal(await page.locator('.culture-stops [data-spot=shibapan]').count(),1);await snap('route-real');
  await page.locator('[data-route-digital]').click();await page.locator('[data-ref-route-start]').click();await page.waitForSelector('.home.has-route');
  await go('trail');await page.waitForSelector('.ui-last-visit');
  assert.match(await page.locator('.ui-last-visit h2').innerText(),/岱庙/);
  const hero=await page.locator('.ui-handbook-hero').evaluate(e=>{const copy=e.firstElementChild,card=e.querySelector('.ui-last-visit'),h=card.querySelector('h2'),p=card.querySelector('p'),b=card.querySelector('button'),r=[h,p,b].map(el=>el.getBoundingClientRect());return{art:getComputedStyle(e).backgroundImage,textVisible:getComputedStyle(copy).opacity==='1',flow:r[0].bottom<=r[1].top+1&&r[1].bottom<=r[2].top+1,buttonVisible:getComputedStyle(b).color!=='rgba(0, 0, 0, 0)',inside:r[2].bottom<=card.getBoundingClientRect().bottom};});
  assert.ok(hero.art.includes(width<768?'handbook-art-mobile-v2':'handbook-art-desktop-v2'));assert.equal(hero.textVisible&&hero.flow&&hero.buttonVisible&&hero.inside,true,JSON.stringify(hero));
  await page.waitForFunction(()=>document.querySelector('.ui-last-visit img').complete&&document.querySelector('.ui-last-visit img').naturalWidth>0);await snap('journal');
  for(const tab of['favorites','stamps','learning','footprints']){await page.locator(`[data-handbook-tab=${tab}]`).click();assert.equal(await page.locator('[data-handbook-tab][aria-selected=true]').count(),1);if(tab==='favorites'){assert.equal(await page.locator('.native-journal-empty h3').isVisible(),true);await page.locator('.native-journal-empty').scrollIntoViewIfNeeded();await snap('journal-empty');}}
  visited=[];await go('trail');await page.waitForSelector('.ui-last-visit');assert.match(await page.locator('.ui-last-visit h2').innerText(),/从红门/);assert.equal(await page.locator('.ui-last-visit button').getAttribute('data-spot'),'hongmen');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.querySelector('.culture-body').scrollWidth>document.querySelector('.culture-body').clientWidth+1),false);
  checks.push({width,height,dpr:2,nativeCaptions:true,oneSelectedRoute:true,transportVariants:true,routeStarts:true,journalFlow:true,journalEmptyAndTabs:true});
  await context.close();console.log('Verified routes and journal',width,height);
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,fixtureNote:'Journey records use browser fixtures; no real user records are written.'},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
