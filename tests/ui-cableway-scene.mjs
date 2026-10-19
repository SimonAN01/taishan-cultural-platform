// Real WebGL, sampled throughout the journey and at both view limits.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/';
const out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-cableway-scene';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
const checks=[],errors=[];
try{
 for(const [width,height] of [[320,568],[309,767],[390,844],[508,752],[1024,600],[1211,810],[1900,1080]].filter(([w])=>!process.env.UI_WIDTH||w===Number(process.env.UI_WIDTH))){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#cableway',{waitUntil:'domcontentloaded'});
  await page.locator('.native-cableway.is-ready').waitFor({timeout:120000});await page.evaluate(()=>document.fonts.ready);
  const canvas=page.locator('#cableway-model canvas'),range=page.locator('.native-cable-track input');
  const progress=async()=>Number(await page.locator('.native-cableway').getAttribute('data-progress'));
  async function seek(value){await range.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);}
  async function snap(name){await page.screenshot({path:`${out}/${width}-${name}.png`});}
  assert.match(await page.locator('.cableway-backdrop').evaluate(e=>getComputedStyle(e).backgroundImage),/cableway-cloud-valley-v1/);
  for(const value of [0,25,56,75,100]){await seek(value);assert.ok(Math.abs(await progress()-value/100)<.001);await snap('progress-'+value);}
  await seek(56);assert.match(await page.locator('#cableway-ride').innerText(),/继续乘坐/);
  const reset=await canvas.screenshot();
  for(let i=0;i<12;i++)await page.locator('[data-cable-direction=left]').click();await snap('left-limit');
  assert.equal(reset.equals(await canvas.screenshot()),false);
  for(let i=0;i<24;i++)await page.locator('[data-cable-direction=right]').click();await snap('right-limit');
  await page.locator('#cableway-reset').click();
  await page.locator('[data-cable-direction=left]').click();const before=await progress();
  await page.keyboard.press('ArrowUp');assert.ok(await progress()>before+.039,'arrows work after a direction button has focus');
  await range.focus();const inputBefore=await progress();await page.keyboard.press('ArrowRight');assert.ok(Math.abs(await progress()-inputBefore-.001)<.0002,'range retains native keyboard control');
  if(width<768){
   const geometry=await page.locator('.native-cableway').evaluate(scene=>{
    const buttons=[...scene.querySelectorAll('[data-cable-direction],#cableway-ride,#cableway-reset,.ref-cableway-mute')];
    const hud=scene.querySelector('.cableway-hud').getBoundingClientRect(),mute=scene.querySelector('.ref-cableway-mute').getBoundingClientRect();
    return {touchTargets:buttons.every(e=>{const r=e.getBoundingClientRect();return r.height>=43.9&&r.left>=0&&r.right<=innerWidth;}),soundAboveHud:mute.bottom<=hud.top};
   });assert.deepEqual(geometry,{touchTargets:true,soundAboveHud:true});
  }
  checks.push({width,height,progressSamples:[0,25,56,75,100],bothViewLimits:true,continuousLandscape:true,keyboardAfterButtonFocus:true,nativeRangeKeys:true});
  await context.close();console.log('Verified scene views',width,height);
 }
 // A real failed scenic-asset request must show recovery, not a ready scene.
 const context=await browser.newContext({viewport:{width:1211,height:810},reducedMotion:'reduce'});
 await context.route('**/design-assets/cableway-cloud-valley-v1.webp',r=>r.abort());
 const page=await context.newPage();await page.goto(base+'#cableway',{waitUntil:'domcontentloaded'});
 await page.locator('.native-cableway.is-error').waitFor();assert.equal(await page.locator('#cableway-ride').isDisabled(),true);
 await context.unroute('**/design-assets/cableway-cloud-valley-v1.webp');await page.locator('[data-cable-retry]').click();
 await page.locator('.native-cableway.is-ready').waitFor({timeout:120000});await context.close();
 assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,landscapeFailureRetry:true,scope:'Actual WebGL and UI events. Screenshots cover five journey positions and both bounded camera limits; scenic painting is a single background, not mountain geometry.'},null,2));
}finally{await browser.close();}
