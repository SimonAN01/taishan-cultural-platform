// End-to-end UI writes in an isolated anonymous browser session, with real API responses.
import assert from 'node:assert/strict';import{mkdirSync,writeFileSync,readFileSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/',out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-records-live';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1211,height:810},reducedMotion:'reduce'}),page=await context.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);let nav=0;
async function go(hash){await page.goto(base+'?records-live='+nav+++'#'+hash,{waitUntil:'domcontentloaded'});await page.waitForSelector('.culture-body[data-loading=false]');}
try{
 const visit=page.waitForResponse(r=>r.url().endsWith('/api/journey/visit')&&r.request().method()==='POST'&&r.status()===200);
 await go('spot?id=hongmen');await visit;await page.waitForSelector('.spot-favorite:not([disabled])');await page.locator('.spot-favorite').click();await page.waitForSelector('.ref-feedback[data-feedback=saved]');await page.locator('.ref-feedback-close').click();
 await go('trail');await page.locator('[data-handbook-tab=favorites]').click();await page.waitForSelector('.ui-saved-card');assert.match(await page.locator('.ui-saved-card').innerText(),/红门/);await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-handbook-tab=favorites]').click();await page.waitForSelector('.ui-saved-card');assert.match(await page.locator('.ui-saved-card').innerText(),/红门/);await page.screenshot({path:out+'/favorite-after-reload.png'});checks.push('景点访问和收藏由真实接口保存，刷新手札仍可读取');
 const chapters=JSON.parse(readFileSync(new URL('../taishan/data/catalog.json',import.meta.url))).story.chapters;
 for(const chapter of chapters){
  await go('study?id='+chapter.id);await page.waitForSelector('.study-answer');
  const visitSaved=page.waitForResponse(r=>r.url().endsWith('/api/journey/visit')&&r.request().method()==='POST'&&r.request().postDataJSON().spot_id===chapter.spot_id&&r.status()===200);
  await page.locator(`.culture-columns [data-spot=${chapter.spot_id}]`).click();await visitSaved;await page.locator('.study-return').click();await page.waitForSelector('.study-answer button:not([disabled])');
  await page.locator(`.study-answer [name=choice][value="${chapter.correct_index}"]`).check();await page.locator('.study-answer button').click();await page.waitForFunction(()=>document.querySelector('.study-answer button')?.textContent.includes('已完成'));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.study-answer button')?.textContent.includes('已完成'));assert.equal(await page.locator('.study-answer button').isDisabled(),true);
 }
 await page.screenshot({path:out+'/all-five-chapters-after-reload.png'});checks.push('五章逐一阅读景点、返回章节、作答并经真实服务器核验，刷新均保留完成状态');
 await go('scenes');await page.locator('[data-open-scene=daimiao]').click();await page.waitForSelector('.scene-mark:not([disabled])');await page.locator('.scene-mark').click();await page.waitForFunction(()=>document.querySelector('.scene-mark')?.textContent.includes('已记录'));
 await go('scenes');await page.waitForFunction(()=>document.querySelector('[data-open-scene=daimiao] [data-scene-count]')?.textContent.startsWith('1 /'));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-open-scene=daimiao] [data-scene-count]')?.textContent.startsWith('1 /'));await page.screenshot({path:out+'/scene-progress-after-reload.png'});checks.push('场景阅读通过界面保存，目录进度刷新后仍为 1/3');
 const other=await browser.newContext();const otherReply=await other.request.get(new URL('/api/journey',base).href);const journey=await otherReply.json();assert.deepEqual(journey.visited,[]);assert.deepEqual(journey.favorites,[]);assert.deepEqual(journey.story_progress.completed,[]);await other.close();checks.push('另一个匿名浏览器会话不读取本次验收记录');assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,fixtures:false,scope:'A newly created anonymous QA session, separate from the user browser; no providers or save responses are mocked.'},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
