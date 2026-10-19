// Native text and reachable controls on the gallery, museum, learning and recap pages.
import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/',out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-reading-display';mkdirSync(out,{recursive:true});
const catalog=await(await fetch(new URL('/api/catalog',base),{signal:AbortSignal.timeout(20000)})).json();
const browser=await chromium.launch({headless:true,channel:'chrome'}),checks=[],errors=[];
try{
 for(const[width,height]of[[309,767],[508,752],[532,752],[1024,600],[1211,810],[1900,900]].filter(([w])=>!process.env.UI_WIDTH||Number(process.env.UI_WIDTH)===w)){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce'});let visited=[];
  await context.route('**/api/catalog',r=>r.fulfill({json:catalog}));await context.route('**/api/journey',r=>r.fulfill({json:{visited,favorites:[],confirmed_predictions:[],total_spots:catalog.spots.length,story_progress:{completed:[],next_chapter:catalog.story.chapters[0].id,total:catalog.story.chapters.length}}}));await context.route('**/api/journey/visit',r=>r.fulfill({json:{saved:true}}));
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));let navigation=0;
  async function go(hash){await page.goto(base+'?display-check='+navigation+++'#'+hash,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>document.querySelector('.culture-body')?.dataset.loading==='false');await page.evaluate(()=>document.fonts.ready);}
  async function screenshot(name){await page.screenshot({path:`${out}/${width}-${name}.png`,timeout:20000});}
  async function noOverflow(){assert.equal(await page.locator('.culture-body').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'page content overflow '+width);}
  async function native(selector){assert.equal(await page.locator(selector).isVisible(),true);assert.equal(await page.locator(selector).evaluate(e=>{const s=getComputedStyle(e);return s.clipPath==='none'&&s.opacity==='1'&&s.color!=='rgba(0, 0, 0, 0)'}),true,selector+' remains real visible text');}
  await go('gallery');await native('.ui-gallery-hero h1');assert.equal(await page.locator('.native-gallery-caption').count(),5);assert.equal(await page.locator('.ui-gallery-filters [aria-pressed=true]').count(),1);
  assert.equal(await page.locator('.ref-gallery-go').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom;}),true,'gallery action stays inside its card');
  await screenshot('gallery');await noOverflow();
  await page.locator('[data-gallery-filter=建筑]').click();assert.equal(await page.locator('.ui-gallery-filters [aria-pressed=true]').count(),1);await page.locator('[data-gallery-item]').first().click();await page.waitForSelector('.ui-image-viewer[open]');await page.locator('[data-viewer-zoom]').click();await page.getByRole('button',{name:'关闭大图',exact:true}).click();
  await go('museum');await native('.ref-museum-tabs [aria-selected=true]');await native('.ref-museum-content h2');await page.waitForSelector('.ref-museum-main');await screenshot('museum');await noOverflow();
  await page.locator('[data-museum-mode=text]').click();assert.equal(await page.locator('.ref-museum-tabs [aria-selected=true]').count(),1);await page.locator('[data-museum-thumb="2"]').click();assert.equal(await page.locator('[data-museum-thumb][aria-pressed=true]').count(),1);assert.equal(await page.locator('[data-museum-thumb="2"]').getAttribute('aria-pressed'),'true');await page.locator('[data-museum-zoom=in]').click();assert.equal(await page.locator('.ref-museum-zoom output').innerText(),'160%');
  await go('study');await native('.native-study h1');await native('.native-study-quiz legend');await screenshot('study');await noOverflow();
  await page.locator('[name=intro-choice][value="0"]').check();await page.locator('.ref-study-explain').click();assert.match(await page.locator('.native-study-answer p').innerText(),/再想一想/);await page.locator('[name=intro-choice][value="1"]').check();await page.locator('.ref-study-explain').click();assert.match(await page.locator('.native-study-answer p').innerText(),/结合历史资料/);
  await page.locator('.ref-study-next').click();await page.waitForFunction(()=>location.hash==='#study?id=poetry'&&document.querySelector('.study-chapters [data-chapter=poetry][aria-current=step]'));await noOverflow();
  await go('review');await native('.native-review h1');await page.waitForFunction(()=>document.querySelector('.native-review-count')?.textContent==='已完成0处文化探索');assert.equal(await page.locator('[data-review-stamp].is-earned').count(),0);await screenshot('review-empty');await noOverflow();
  visited=['hongmen','zhongtian','nantian'].map(spot_id=>({spot_id}));await go('review');await page.waitForFunction(()=>document.querySelector('.native-review-count')?.textContent==='已完成3处文化探索');assert.equal(await page.locator('[data-review-stamp].is-earned').count(),3);await screenshot('review-earned');
  await page.locator('.native-review [data-read-page=trail]').click();await page.waitForSelector('.ui-handbook-hero');
  checks.push({width,height,dpr:2,nativeHeadings:true,galleryFilterAndViewer:true,museumTabsZoomAndSelection:true,learningRadioAndNextChapter:true,realRecapCounts:true,noHorizontalOverflow:true});writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,fixtureNote:'Session progress uses controlled responses. No real records are written.'},null,2));
  await context.close();console.log('Verified reading display',width,height);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
