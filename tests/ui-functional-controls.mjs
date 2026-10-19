import assert from 'node:assert/strict';
import{mkdirSync,writeFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/',out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-functional-controls';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']}),checks=[],errors=[];
try{
for(const[width,height]of[[309,767],[508,752],[1024,600],[1211,810],[1900,900]].filter(([w])=>!process.env.UI_WIDTH||Number(process.env.UI_WIDTH)===w)){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 await context.addInitScript(()=>{const Native=window.AudioContext;window.qaAudioContexts=[];if(Native)window.AudioContext=class extends Native{constructor(...args){super(...args);window.qaAudioContexts.push(this);}};});
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));let nav=0;
 async function go(hash){await page.goto(base+'?functional='+nav+++'#'+hash,{waitUntil:'domcontentloaded'});}
 async function snap(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/${width}-${name}.png`});}
 await go('cableway');await page.waitForSelector('.native-cableway.is-ready',{timeout:120000});
 const scene=page.locator('.native-cableway'),canvas=page.locator('#cableway-model canvas'),progress=async()=>Number(await scene.getAttribute('data-progress'));
 assert.equal(await canvas.isVisible(),true);await canvas.focus();await page.keyboard.press('ArrowUp');assert.ok(await progress()>=.039);
 await page.locator('[data-cable-direction=back]').click();assert.ok(await progress()<.001);
 await canvas.focus();await page.keyboard.press('ArrowLeft');const rotated=await canvas.screenshot();await page.locator('#cableway-reset').click();await page.waitForTimeout(200);const reset=await canvas.screenshot();assert.equal(rotated.equals(reset),false,'rotating changes actual WebGL pixels');
 await page.locator('#cableway-ride').click();await page.waitForTimeout(650);await page.locator('#cableway-ride').click();const paused=await progress();assert.ok(paused>0);await page.waitForTimeout(400);assert.equal(await progress(),paused,'pause retains the actual journey position');
 await page.locator('#cableway-ride').click();await page.waitForTimeout(500);await page.locator('#cableway-ride').click();assert.ok(await progress()>paused,'resume continues instead of restarting');
 await page.locator('.native-cable-track input').focus();await page.keyboard.press('End');assert.equal(await progress(),1);assert.match(await page.locator('#cableway-ride').innerText(),/重新乘坐/);
 await page.locator('.ref-cableway-mute').click();assert.equal(await page.locator('.ref-cableway-mute').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>window.qaAudioContexts.some(c=>c.state==='running')),true,'real WebAudio is running');
 await page.locator('.ref-cableway-mute').click();assert.equal(await page.evaluate(()=>window.qaAudioContexts.every(c=>c.state!=='running')),true);
 await page.locator('.native-cable-track input').focus();await page.keyboard.press('Home');await snap('cableway');
 await page.locator('[data-ui-action=cable-return]').click();await page.waitForSelector('.cableway-scene:not(.is-open)',{state:'attached'});
 await page.locator('.landmark[data-place=hongmen]').click();await page.waitForSelector('.visit-scene.is-open[data-place=hongmen]');await page.locator('.ref-visit-hotspots [data-ui-action=visit-observe]').click();
 await page.waitForSelector('.native-hongmen-observation:not([hidden])');assert.equal(await page.locator('.ref-visit-hud').evaluate(e=>getComputedStyle(e).display),'none');
 assert.match(await page.locator('.visit-visual').evaluate(e=>getComputedStyle(e,'::before').backgroundImage),/visit-hongmen-art-(desktop|mobile)-v2/);
 const geometry=await page.locator('.native-hongmen-observation').evaluate(e=>{const panel=e.getBoundingClientRect(),hud=document.querySelector('.ref-visit-hotspots').getBoundingClientRect();return{aboveHud:panel.bottom<=hud.top+1,inside:panel.left>=0&&panel.right<=innerWidth&&panel.top>=document.querySelector('.ref-visit-header').getBoundingClientRect().bottom};});assert.equal(geometry.aboveHud&&geometry.inside,true,JSON.stringify({width,geometry}));await snap('gate-observation');
 await page.locator('[data-ui-action=visit-observation-close]').click();assert.equal(await page.locator('.native-hongmen-observation').isVisible(),false);await page.locator('.ref-visit-hotspots [data-ui-action=visit-return]').click();
 await page.locator('.landmark[data-place=tianjie]').click();await page.waitForSelector('.visit-scene.is-open[data-place=tianjie]');await page.locator('#visit-enter').click();await page.waitForSelector('.native-street-walk[data-state=ready]');
 const walk=page.locator('.native-street-walk'),position=async()=>(await walk.getAttribute('data-position')).split(',').map(Number),start=await position();
 const walkCanvas=page.locator('.native-street-canvas canvas');await walkCanvas.focus();await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.keyboard.up('ArrowUp');assert.ok((await position())[1]<start[1]);
 await page.locator('[data-street-action=back]').click();assert.ok((await position())[1]>start[1]-1);
 await page.locator('[data-street-action=left]').click();assert.ok((await position())[2]>.2);await page.locator('[data-street-action=reset]').click();assert.deepEqual(await position(),start);
 await page.locator('[data-street-action=forward]').click();await page.locator('[data-street-action=forward]').click();await snap('street-walking');
 await page.locator('[data-street-action=exit]').click();assert.equal(await walkCanvas.count(),0);await page.locator('#visit-back').click();
 const map=page.locator('.home .map-scroll');await page.getByRole('button',{name:'放大地图',exact:true}).click();const stage=page.locator('.map-stage'),mapPosition=await stage.getAttribute('style');await map.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);assert.notEqual(await stage.getAttribute('style'),mapPosition);
 await page.locator('.panorama-movement summary').click();await page.locator('[data-map-direction=ArrowRight]').click();assert.equal(await page.locator('.panorama-movement').evaluate(e=>{const r=e.getBoundingClientRect();return [...document.querySelectorAll('.panorama-toolbar,.panorama-search,.home .ui-bottom-nav')].filter(n=>getComputedStyle(n).display!=='none').every(n=>{const b=n.getBoundingClientRect();return r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom;});}),true,'direction pad must not cover search, zoom or navigation');await snap('map-buttons');
 await go('scenes');await page.waitForSelector('.native-scene-card');await page.waitForFunction(()=>[...document.querySelectorAll('.native-scene-card-art')].every(e=>e.complete&&e.naturalWidth>0));assert.equal(await page.locator('.native-scene-card').count(),3);assert.equal(await page.locator('.native-scene-card-title').evaluateAll(items=>items.every(e=>getComputedStyle(e).position==='static')),true);assert.equal(await page.locator('.native-scene-card-art').evaluateAll(items=>items.every(e=>e.src.includes('scene-card-art-')&&e.complete&&e.naturalWidth>0)),true);await snap('scene-directory');
 await go('museum');await page.waitForSelector('.ref-museum-main');const original=await page.locator('.ref-museum-main').getAttribute('src');if(width<768){await page.locator('.ref-museum-mobile-title summary').click();await page.locator('.ref-museum-mobile-title [data-museum-place=daguan]').click();}else await page.locator('.ref-museum-nav [data-museum-place=daguan]').click();assert.match(await page.locator('.ref-museum-content h2').innerText(),/纪泰山铭/);assert.notEqual(await page.locator('.ref-museum-main').getAttribute('src'),original);await page.locator('[data-museum-mode=text]').click();assert.equal(await page.locator('[data-museum-panel=text]').isVisible(),true);assert.equal(await page.locator('[data-museum-panel=original]').isVisible(),false);await snap('museum-selection');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 checks.push({width,height,realWebGLVisible:true,pauseResumeAndSeek:true,realAudioStartedAndStopped:true,keyboardAndTouchCommands:true,gateSinglePaintingAndPanel:true,streetPositionChanges:true,sceneTitlesHaveNoBitmapUnderlay:true,museumSwitchesRecordAndPhoto:true});writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,note:'Real WebGL and WebAudio; no fake 3D, clock, audio, or progress responses. Each browser context has its own anonymous session.'},null,2));await context.close();console.log('Verified actual controls',width,height);
}
// Actual failed model request must disable controls and offer a working retry.
const failedContext=await browser.newContext({viewport:{width:1211,height:810},reducedMotion:'reduce'});
await failedContext.route('**/models/cable-car-optimized.glb',r=>r.abort());
const failedPage=await failedContext.newPage();await failedPage.goto(base+'#cableway',{waitUntil:'domcontentloaded'});await failedPage.waitForSelector('.native-cableway.is-error');assert.equal(await failedPage.locator('#cableway-ride').isDisabled(),true);await failedPage.screenshot({path:out+'/model-load-error.png'});
await failedContext.unroute('**/models/cable-car-optimized.glb');await failedPage.locator('[data-cable-retry]').click();await failedPage.waitForSelector('.native-cableway.is-ready',{timeout:120000});assert.equal(await failedPage.locator('#cableway-ride').isEnabled(),true);await failedContext.close();
writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,loadFailureRetry:true,note:'Real WebGL, WebAudio and anonymous backend sessions; no simulated 3D, clock or audio results.'},null,2));
assert.deepEqual(errors,[]);
}finally{await browser.close();}
