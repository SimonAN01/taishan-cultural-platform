// Reproduce canvas gutters and long-answer overlap with controlled API responses.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/';
const out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-layout-resilience';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),checks=[],errors=[];
const catalog=await(await fetch(new URL('/api/catalog',base))).json();
for(const[width,height]of[[309,767],[532,752],[1024,600],[1920,1080]].filter(([w])=>!process.env.UI_WIDTH||w===Number(process.env.UI_WIDTH))){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('taishan-experience',JSON.stringify({autoSpeak:false,captions:true,volume:.8})));
 await context.route('**/api/catalog',r=>r.fulfill({json:catalog}));
 await context.route('**/api/agent/history',r=>r.fulfill({json:Array.from({length:12},(_,i)=>({role:'user',text:`第${i+1}个历史问题：红门的山门题字与文化故事有哪些？`}))}));
 await context.route('**/api/agent/chat',r=>r.fulfill({json:{answer:'红门是经典徒步游览线的入口。沿着石阶向北，可以留意山门题字、古树和建筑细节。'.repeat(20),sources:[],mode:'rag_llm'}}));
 console.log('Checking viewport',width,height);const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#map',{waitUntil:'domcontentloaded'});await page.waitForSelector('.welcome-scene[hidden]',{state:'attached'});
 const viewport=page.locator('.home .map-scroll');
 async function covered(){await page.waitForTimeout(100);assert.equal(await viewport.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.map-stage').getBoundingClientRect();return b.left<=a.left+.6&&b.top<=a.top+.6&&b.right>=a.right-.6&&b.bottom>=a.bottom-.6;}),true,'map must cover viewport at '+width);}
 await covered();console.log('Map loaded',width);await viewport.dispatchEvent('wheel',{deltaY:400,deltaX:0,ctrlKey:false});await covered();assert.equal(await page.locator('.panorama-controls output').innerText(),'100%');
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'放大地图',exact:true}).click();await covered();
 const box=await viewport.boundingBox();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.9,box.y+box.height*.95,{steps:8});await page.mouse.up();await covered();
 await viewport.focus();for(let i=0;i<10;i++)await page.keyboard.press('-');await covered();assert.equal(await page.locator('.panorama-controls output').innerText(),'100%');
 await page.getByRole('button',{name:'复位地图',exact:true}).click();await covered();await page.screenshot({timeout:20000,path:`${out}/${width}-map.png`});
 console.log('Map gestures checked',width);await page.goto(base+'#agent?id=hongmen',{waitUntil:'domcontentloaded'});await page.waitForSelector('.guide-scene.is-open');
 await page.locator('#guide-input').fill('红门的文化故事是什么？');await page.locator('.guide-form button[type=submit]').click();await page.waitForSelector('.guide-scene[data-request-state=ready]');
 const geometry=await page.evaluate(()=>{const scene=document.querySelector('.guide-scene'),header=scene.querySelector('.guide-conversation>header').getBoundingClientRect(),scroll=scene.querySelector('.guide-scroll').getBoundingClientRect(),form=scene.querySelector('.guide-form').getBoundingClientRect(),user=scene.querySelector('.guide-user-message').getBoundingClientRect(),answer=scene.querySelector('.guide-answer').getBoundingClientRect();return{headerBeforeChat:header.bottom<=scroll.top,chatBeforeForm:scroll.bottom<=form.top,userBeforeAnswer:user.bottom<=answer.top,scrolls:scene.querySelector('.guide-scroll').scrollHeight>scroll.height};});
 assert.deepEqual(geometry,{headerBeforeChat:true,chatBeforeForm:true,userBeforeAnswer:true,scrolls:true});
 await page.screenshot({timeout:20000,path:`${out}/${width}-long-answer.png`});await page.locator('.guide-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({timeout:20000,path:`${out}/${width}-chat-bottom.png`});
 checks.push({width,height,mapCoversAfterWheelDragZoom:true,ordinaryWheelDoesNotZoom:true,longAnswerNoOverlap:true});await context.close();
}
assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,fixtureNote:'Long replies and history use explicit browser fixtures.'},null,2));console.log(JSON.stringify({checks,errors},null,2));await browser.close();
