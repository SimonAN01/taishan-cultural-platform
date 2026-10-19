// Guard the two reported regressions: stitched bitmap backgrounds and detached guide labels.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/';
const out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-map-art';mkdirSync(out,{recursive:true});
const catalog=await(await fetch(new URL('/api/catalog',base),{signal:AbortSignal.timeout(15000)})).json();
const browser=await chromium.launch({headless:true,channel:'chrome'}),checks=[],errors=[];
try{
 for(const[width,height]of[[309,767],[508,676],[532,752],[1211,810],[1900,900]].filter(([w])=>!process.env.UI_WIDTH||w===Number(process.env.UI_WIDTH))){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce'});
  await context.route('**/api/catalog',r=>r.fulfill({json:catalog}));
  await context.route('**/api/journey',r=>r.fulfill({json:{visited:[],favorites:[],scene_progress:[],learning:{},stamps:[]}}));
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?ui=map-art-v2#map',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForSelector('.welcome-scene[hidden]',{state:'attached'});
  await page.waitForFunction(()=>{const im=document.querySelector('.map-fallback');return im?.complete&&im.naturalWidth>0;});
  await page.evaluate(()=>document.fonts.ready);
  const image=await page.locator('.map-fallback').evaluate(e=>({src:e.currentSrc,css:getComputedStyle(e).content,width:e.naturalWidth,height:e.naturalHeight}));
  assert.ok(image.src.endsWith(width<768?'map-art-mobile-v2.webp':'map-art-desktop-v2.webp'));
  assert.equal(image.css,'normal');
  assert.equal(await page.locator('.guide-orb').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.lastElementChild.getBoundingClientRect();return getComputedStyle(e.lastElementChild).position==='static'&&b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom;}),true,'guide label stays inside its button');
  assert.equal(await page.locator('.ref-map-hud-guide').isVisible(),false);
  for(const zoom of[100,113,160]){
   if(zoom!==100)await page.locator('.map-scroll').dispatchEvent('wheel',{deltaY:-Math.log(zoom/(zoom===113?100:113))/.0015,ctrlKey:true});
   await page.waitForFunction(z=>document.querySelector('.panorama-controls output').textContent===z+'%',zoom);
   const covered=await page.locator('.map-scroll').evaluate(e=>{const v=e.getBoundingClientRect(),s=e.querySelector('.map-stage').getBoundingClientRect();return s.left<=v.left+1&&s.top<=v.top+1&&s.right>=v.right-1&&s.bottom>=v.bottom-1;});
   assert.equal(covered,true);
   await page.screenshot({path:`${out}/${width}-${zoom}.png`,timeout:15000});
  }
  await page.getByRole('button',{name:'复位地图',exact:true}).click();
  await page.locator('.panorama-search input').fill('红门');
  await page.getByRole('button',{name:'定位红门',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.panorama-controls output').textContent==='160%');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  checks.push({width,height,art:image.src.split('/').pop(),zoom:[100,113,160],guideLabelContained:true,searchLocates:true});
  await context.close();console.log('Verified map artwork',width,height);
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
