import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/',out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-reading-refinement';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']}),checks=[],errors=[];
try{
 for(const[width,height]of[[320,568],[390,844],[1024,600],[1211,810]]){
  const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'#history');await p.locator('.culture-body[data-loading=false]').waitFor();await p.evaluate(()=>document.fonts.ready);
  const article=p.locator('#era-content .culture-card');assert.equal(await article.evaluate(e=>e.scrollHeight<=e.clientHeight+1),true,'history uses natural height');
  await p.locator('.native-history-more').evaluate(e=>e.open=true);assert.equal(await article.evaluate(e=>e.scrollHeight<=e.clientHeight+1),true,'expanded text is not clipped');
  assert.equal(await p.locator('.ref-history-actions').evaluate(e=>getComputedStyle(e).position),'static');
  await p.screenshot({path:`${out}/${width}-history.png`,fullPage:true});await p.locator('.ref-history-next').click();
  const title=await p.locator('#era-content h2').innerText(),hash=new URL(p.url()).hash;assert.match(hash,/id=han/);
  await p.reload();await p.locator('.culture-body[data-loading=false]').waitFor();assert.equal(await p.locator('#era-content h2').innerText(),title);
  await p.locator('[data-era="唐宋"]').click();assert.match(await p.locator('.native-history-position').innerText(),/第 1/);
  await p.locator('[data-era="秦汉"]').click();assert.match(await p.locator('.native-history-position').innerText(),/第 1/);
  await p.goto(base+'#map');await p.locator('.panorama-movement summary').click();
  assert.equal(await p.locator('.panorama-movement').evaluate(e=>{const r=e.getBoundingClientRect();return [...document.querySelectorAll('.ui-map-goal,.panorama-search,.panorama-controls,.home .ui-bottom-nav')].filter(n=>getComputedStyle(n).display!=='none').every(n=>{const b=n.getBoundingClientRect();return r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom;});}),true,'movement does not cover goal, search, zoom or navigation');
  if(width<768)assert.equal(await p.locator('[data-map-direction]').evaluateAll(items=>items.every(e=>e.getBoundingClientRect().height>=44)),true);
  await p.screenshot({path:`${out}/${width}-map-buttons.png`});
  await p.locator('.panorama-movement summary').click();await p.locator('.panorama-search input').fill('天街');await p.locator('.ref-search-name').click();await p.locator('.ref-search-detail .culture-primary').click();await p.locator('#visit-enter').click();await p.locator('.native-street-walk[data-state=ready]').waitFor();
  const position=async()=>(await p.locator('.native-street-walk').getAttribute('data-position')).split(',').map(Number);
  await p.locator('[data-street-action=forward]').click();let before=await position();await p.keyboard.press('ArrowUp');assert.ok((await position())[1]<before[1]-.3);
  before=await position();await p.keyboard.press('Control+ArrowRight');assert.deepEqual(await position(),before,'modifier shortcuts do not turn street camera');
  await p.locator('[data-street-action=exit]').click();await p.locator('#visit-enter').click();await p.locator('.native-street-walk[data-state=ready]').waitFor();
  before=await position();await p.keyboard.press('ArrowUp');const moved=before[1]-(await position())[1];assert.ok(moved>.3&&moved<.6,'reopening does not duplicate listeners');
  await p.goto(base+'#scene?id=daimiao');await p.locator('.scene-stage.is-space').waitFor();const canvas=p.locator('.scene-space canvas');
  await p.locator('.space-left').click();const beforePixels=await canvas.screenshot();await p.keyboard.press('ArrowRight');assert.equal(beforePixels.equals(await canvas.screenshot()),false,'space keys work after a button click');
  await p.locator('.space-reset').click();const pixels=await canvas.screenshot();await p.keyboard.press('Control+ArrowRight');assert.equal(pixels.equals(await canvas.screenshot()),true,'modifier shortcuts leave camera alone');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  checks.push({width,height,historyNaturalFlow:true,historyEntryRestored:true,mapPadClearsControls:true,streetKeyboardAfterButton:true,spatialKeyboardAfterButton:true,modifierKeysPreserved:true});
  await c.close();console.log('Verified reading and focus',width,height);
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,scope:'Real catalog and rendering; no audio providers are invoked.'},null,2));
}finally{await browser.close();}
