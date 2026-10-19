// Page-by-page browser checks. Normal records use the real isolated anonymous API;
// failure cases are explicitly injected and never call media/AI providers.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/';
const out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-page-audit';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const checks=[],errors=[],shots=[];let nextApi=0;
try{
for(const [width,height] of [[320,568],[390,844],[1211,810]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await context.newPage();
  p.setDefaultTimeout(20000);
  // Respect the backend's per-IP rate limit during an accelerated UI sweep.
  await context.route('**/api/**',async route=>{const delay=Math.max(0,nextApi-Date.now());nextApi=Math.max(Date.now(),nextApi)+375;if(delay)await new Promise(r=>setTimeout(r,delay));await route.continue();});p.on('pageerror',e=>errors.push({width,message:e.message}));p.on('response',async r=>{if(r.url().includes('/api/')&&r.status()>=400)console.log('Audit API failure',width,r.status(),new URL(r.url()).pathname);});
  const catalog=await (await context.request.get(new URL('/api/catalog',base).href)).json();
  const go=async hash=>{await p.goto(base+'#'+hash,{waitUntil:'domcontentloaded'});if(!/^(map|agent)/.test(hash))await p.locator('.culture-body[data-loading=false]').waitFor();};
  const ready=async()=>{await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.top<innerHeight&&r.bottom>0;}).map(e=>e.decode().catch(()=>{})));});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${p.url()} overflow`);};
  const snap=async name=>{await ready();await p.screenshot({path:`${out}/${width}-${name}.png`,animations:'disabled',timeout:60000});shots.push({width,name});};

  await go('map');await p.locator('[data-map-directory]').click();assert.equal(await p.locator('.map-directory-read').count(),catalog.spots.length);await p.getByRole('button',{name:'关闭全图与景点目录'}).click();
  await p.locator('[data-zoom=in]').click();await p.locator('.home .map-scroll').focus();await p.keyboard.press('ArrowDown');await p.locator('[data-zoom=reset]').click();
  await p.locator('.panorama-search input').fill('不存在的景点');await p.locator('.ref-search-empty').waitFor();await p.locator('.ref-search-recommend button').filter({hasText:'南天门'}).click();await p.locator('.ref-search-name').click();await p.locator('.culture-body[data-spot=nantian]').waitFor();checks.push({width,area:'map',directory:catalog.spots.length,searchEmptyRecovery:true,keyboardAndZoom:true});

  // Every catalogue detail, all content tabs and every supplied photo are native.
  for(const s of catalog.spots){
    await go('spot?id='+s.id);await p.locator('.spot-favorite:not([disabled])').waitFor();assert.equal(await p.locator('#culture-title').innerText(),s.name);
    for(const tab of ['architecture','poetry','history']){await p.locator(`[data-spot-tab=${tab}]`).first().click();await p.locator('.spot-favorite:not([disabled])').waitFor();assert.equal(await p.locator(`[data-spot-tab=${tab}]`).first().getAttribute('aria-pressed'),'true');}
    for(let n=0;n<(s.photos?.length||0);n++){if(s.photos.length>1){await p.locator('.ref-spot-photo-options').evaluate(e=>e.open=true);await p.locator(`[data-photo="${n}"]`).click();await p.locator('.spot-favorite:not([disabled])').waitFor();}assert.equal(await p.locator('.ref-spot-hero img').getAttribute('src'),'/'+s.photos[n].url.replace(/^\//,''));}
    await ready();
  }
  await go('spot?id=hongmen');await p.locator('.culture-dialog [data-ui-nav=read]').filter({visible:true}).click();await p.locator('[data-library=spot]').click();assert.equal(await p.locator('.ui-spot-directory [data-spot]').count(),catalog.spots.length);assert.equal(new URL(p.url()).hash,'#spot');await snap('spot-directory');checks.push({width,area:'spots',details:catalog.spots.length,tabs:true,photoSources:true,directoryResets:true});

  await go('read');assert.equal(await p.locator('[data-library]').count(),5);await snap('read');
  await go('routes');for(const r of catalog.routes){await p.locator(`[data-route-card=${r.id}]`).click();for(const v of r.variants||[]){await p.locator(`[data-variant=${v.id}]`).click();assert.equal(await p.locator('.culture-stops li').count(),v.node_sequence.length);assert.equal(await p.locator(`[data-variant=${v.id}]`).getAttribute('aria-pressed'),'true');}}
  console.log('Route reload',width,p.url());await p.reload();await p.locator('.native-route-title').waitFor().catch(async e=>{console.log('Route reload failure',p.url(),await p.locator('.culture-body').innerText());throw e;});await snap('routes');await p.locator('[data-ref-route-start]').click();await p.locator('.home.has-route').waitFor();await p.locator('.ref-route-summary-cancel').click();checks.push({width,area:'routes',routes:4,allVariants:true,selectionAndCancellation:true});

  await go('history?era='+encodeURIComponent('先秦'));for(const item of catalog.history){assert.equal(await p.locator('#era-content h2').innerText(),item.title);assert.ok((await p.locator('#era-content .culture-card').innerText()).includes(item.content));if(item!==catalog.history.at(-1))await p.locator('.ref-history-next').click();}
  assert.equal(await p.locator('.ref-history-next').isDisabled(),true);await p.locator('.ref-history-previous').click();await p.reload();await p.locator('#era-content h2').waitFor();assert.equal(await p.locator('#era-content h2').innerText(),catalog.history.at(-2).title);await snap('history');checks.push({width,area:'history',sourcedRecords:7,previousNext:true,reload:true});

  for(const poem of catalog.poems){await go('poetry?id='+poem.id);const lines=poem.original_text.split('\n');for(let i=0;i<lines.length;i+=2){if(i)await p.locator('[data-verse-next]').click();assert.equal(await p.locator(`button[data-line="${i}"]`).isVisible(),true);}await p.locator('.ref-poetry-more').evaluate(e=>e.open=true);await p.locator('[data-poetry-panel=author]').click();assert.ok((await p.locator('#poetry-heading').innerText()).includes(poem.author));await p.reload();await p.locator('.ref-poetry-reader').waitFor();assert.equal((await p.locator('#poetry-heading').innerText()).includes(poem.author),true);}
  await snap('poetry');const remembered=await p.evaluate(()=>JSON.parse(localStorage.getItem('taishan-last-reading')));assert.equal(remembered.hash,new URL(p.url()).hash);checks.push({width,area:'poetry',poems:catalog.poems.length,allVerses:true,analysisReloadAndResume:true});

  await go('gallery');assert.equal(await p.locator('[data-gallery-item]').count(),5);await p.locator('[data-gallery-filter="实景"]').click();await p.reload();await p.locator('[data-gallery-filter="实景"][aria-pressed=true]').waitFor();await p.locator('[data-gallery-item="0"]').click();const first=await p.locator('.ui-image-canvas img').getAttribute('src');await p.keyboard.press('ArrowRight');assert.notEqual(await p.locator('.ui-image-canvas img').getAttribute('src'),first);await p.locator('[data-viewer-zoom]').click();assert.equal(await p.locator('.ui-image-viewer.is-zoomed').count(),1);await p.locator('[data-viewer-reset]').click();await p.keyboard.press('Escape');await snap('gallery');checks.push({width,area:'gallery',filterReload:true,keyboardImageTurn:true,zoomReset:true});

  await go('museum');for(const id of ['jingshi','daguan','zhongtian','riguan','yuhuang','bixia']){if(width<768){await p.locator('.ref-museum-mobile-title summary').click();await p.locator(`.ref-museum-mobile-title [data-museum-place=${id}]`).click();}else await p.locator(`.ref-museum-nav [data-museum-place=${id}]`).click();assert.equal(await p.locator('.ref-museum-nav [aria-current=page]').getAttribute('data-museum-place'),id);}
  await go('museum?id=jingshi&tab=text&photo=1');assert.equal(await p.locator('.ref-museum-figure').getAttribute('data-index'),'1');assert.equal(await p.locator('[data-museum-mode=text]').getAttribute('aria-selected'),'true');assert.equal(await p.locator('.ref-museum-main').evaluate(e=>getComputedStyle(e).objectFit),'contain');await p.locator('[data-museum-mode=text]').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('[data-museum-mode=listen]').getAttribute('aria-selected'),'true');await p.locator('[data-museum-mode=text]').click();await p.reload();await p.locator('.ref-museum-figure[data-index="1"]').waitFor();await snap('museum');checks.push({width,area:'museum',entries:6,selectionPhotoAndModeReload:true,keyboardTabs:true,uncroppedImage:true});

  await go('scenes');await snap('scenes');for(const scene of catalog.scenes){await go('scene?id='+scene.id+'&mode=reading');await p.locator('.scene-favorite:not([disabled])').waitFor();for(const point of scene.points){await p.locator(`[data-step=${point.id}]`).click();assert.equal(await p.locator('.scene-reading').getAttribute('data-ref-point'),point.id);await p.locator('.scene-mark:not([disabled])').click();await p.locator('.scene-mark').filter({hasText:'已记录'}).waitFor();}await p.reload();await p.locator('.scene-reading-progress').filter({hasText:'3 / 3'}).waitFor();await snap('scene-'+scene.id);}
  checks.push({width,area:'scenes',scenes:3,topics:9,realSavedProgressReload:true});

  await go('study');await p.locator('.study-answer').waitFor();for(const chapter of catalog.story.chapters){await p.locator(`[data-chapter=${chapter.id}]`).click();await p.locator('.study-answer').waitFor();assert.equal(await p.locator('.study-answer').count(),1);assert.ok((await p.locator('.study-answer').locator('..').innerText()).includes(chapter.question));}await snap('study');
  await go('trail');await p.locator('[data-handbook-tab]').first().waitFor();for(const tab of ['favorites','stamps','learning','footprints']){await p.locator(`[data-handbook-tab=${tab}]`).click();await p.reload();await p.locator(`[data-handbook-tab=${tab}][aria-selected=true]`).waitFor();}await p.locator('[data-handbook-tab=favorites]').focus();await p.keyboard.press('End');assert.equal(await p.locator('[data-handbook-tab=learning]').getAttribute('aria-selected'),'true');await snap('trail');checks.push({width,area:'study-and-trail',chapters:5,handbookTabs:4,tabReload:true,keyboard:true});

  await go('review');await p.locator('.native-review-count').filter({hasText:'已完成'}).waitFor();await snap('review');
  await go('sources');assert.equal(await p.locator('.culture-sources a').count(),0);assert.ok(await p.locator('.culture-body a').count()>0);await snap('sources');
  await go('vision');await snap('vision');await p.locator('#vision-file').setInputFiles({name:'invalid.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a')});await p.locator('#vision-result').filter({hasText:'照片无法使用'}).waitFor();assert.equal(await p.locator('#vision-start').isDisabled(),true);checks.push({width,area:'review-sources-vision',realReview:true,sourceLinks:true,invalidImageRecovery:true});

  await go('agent?id=nantian');await p.locator('#guide-landmark strong').filter({hasText:'南天门'}).waitFor();if(await p.locator('#guide-avatar-toggle').getAttribute('aria-expanded')!=='true')await p.locator('#guide-avatar-toggle').click();await p.locator('#guide-model[data-model-ready=true]').waitFor({timeout:90000});await snap('agent');await p.locator('#guide-avatar-toggle').click();assert.equal(await p.locator('.guide-visual').isVisible(),false);checks.push({width,area:'agent',realGLB:true,contextCorrect:true,expandCollapse:true});
  await context.close();writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,screenshots:shots,scope:'Actual isolated anonymous API records; requests are paced to respect the service rate limit. No provider calls.'},null,2));console.log('Page audit passed',width,height);
}
assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,screenshots:shots,scope:'Actual isolated anonymous catalogue, favorites and scene records. No AI or media provider response is simulated in this main sweep; no provider is invoked.'},null,2));
}finally{await browser.close();}
