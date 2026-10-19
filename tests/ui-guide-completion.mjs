import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/',out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-guide-completion';mkdirSync(out,{recursive:true});
const catalog=await(await fetch(new URL('/api/catalog',base))).json();assert.ok(catalog.spots);
const b=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}),checks=[],errors=[];
try{for(const [width,height]of[[320,568],[390,844],[1024,600],[1211,810]]){
 const c=await b.newContext({viewport:{width,height},permissions:['camera'],reducedMotion:'reduce'});
 await c.addInitScript(()=>{
  localStorage.setItem('taishan-experience',JSON.stringify({autoSpeak:false,captions:true,volume:.8}));
  window.SpeechRecognition=class{constructor(){window.testRecognition=this;}start(){queueMicrotask(()=>this.onstart?.());}stop(){this.onend?.();}abort(){}};
 });
 let rows=[{role:'user',text:'红门有什么故事？',spot_id:'hongmen'},{role:'assistant',text:'这是更早的红门回答。',spot_id:'hongmen',sources:[]},{role:'user',text:'十八盘为什么这样命名？',spot_id:'shibapan'},{role:'assistant',text:'这是十八盘的历史回答。',spot_id:'shibapan',sources:[]},{role:'user',text:'红门有什么故事？',spot_id:'hongmen'},{role:'assistant',text:'这是最近一次红门回答。',spot_id:'hongmen',sources:[]}];
 const calls=[];let hold=false,release,started;
 await c.route('**/api/**',async r=>{
  const path=new URL(r.request().url()).pathname,reply=json=>r.fulfill({json});
  if(path==='/api/catalog')return reply(catalog);
  if(path==='/api/agent/history')return r.request().method()==='DELETE'?(rows=[],reply({cleared:true})):reply(rows);
  if(path==='/api/agent/chat'){const body=r.request().postDataJSON();calls.push(body);if(hold){started?.();await new Promise(resolve=>release=resolve);}const answer='测试回答：'+body.message;rows.push({role:'user',text:body.message,spot_id:body.current_spot},{role:'assistant',text:answer,spot_id:body.current_spot,sources:[]});return reply({answer,mode:'local_knowledge',sources:[]});}
  if(path==='/api/journey')return reply({visited:[],favorites:[],story_progress:{completed:[],next_chapter:'gate',total:5}});
  return reply({saved:true});
 });
 const p=await c.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>{errors.push({width,message:e.message});console.log('Page error',e.message);});
 await p.goto(base+'#agent?id=shibapan');await p.locator('#guide-thread .guide-turn').nth(2).waitFor().catch(async e=>{console.log('Initial guide state',await p.locator('body').innerText());throw e;});await p.evaluate(()=>document.fonts.ready);
 assert.equal(await p.locator('#guide-questions button').first().isVisible(),true);assert.equal(await p.locator('#guide-history-list .guide-history-item').count(),2);
 await p.locator('#guide-input').fill('我暂时不发送的草稿');
 if(width<768)await p.locator('#guide-history-shortcut').click();
 await p.locator('.guide-history-item').filter({hasText:'红门有什么故事？'}).locator('.guide-history-read').click();
 await p.locator('.guide-turn.is-selected').filter({hasText:'最近一次红门回答'}).waitFor();assert.equal(await p.locator('#guide-input').inputValue(),'我暂时不发送的草稿');
 if(width<768)await p.locator('#guide-history-shortcut').click();
 const duplicates=p.locator('.guide-history-item').filter({hasText:'红门有什么故事？'});await duplicates.locator('summary').click();await duplicates.getByRole('button',{name:'更早的回答 1',exact:true}).click();await p.locator('.guide-turn.is-selected').filter({hasText:'更早的红门回答'}).waitFor();

 await p.locator('[data-ui-action=mic]').click();await p.locator('.ref-voice-panel[data-state=listening]').waitFor();
 await p.evaluate(()=>{const result=[{transcript:'请讲一个关于红门的故事。'}];result.isFinal=true;window.testRecognition.onresult({results:[result]});});
 assert.equal(await p.locator('#guide-input').inputValue(),'我暂时不发送的草稿');await p.locator('.ref-voice-end').click();await p.locator('.ref-voice-panel[data-state=confirm]').waitFor();
 assert.equal(await p.locator('.ref-voice-send').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true);await p.screenshot({path:`${out}/${width}-voice-confirm.png`});await p.locator('.ref-voice-cancel').click();assert.equal(await p.locator('.ref-voice-panel').isVisible(),false);assert.equal(await p.locator('#guide-input').inputValue(),'我暂时不发送的草稿');assert.ok(!(await p.locator('#guide-mic-note').innerText()).includes('正在听'));
 await p.locator('[data-ui-action=mic]').click();await p.locator('.ref-voice-panel[data-state=listening]').waitFor();await p.evaluate(()=>{const result=[{transcript:'红门有什么值得看的？'}];result.isFinal=true;window.testRecognition.onresult({results:[result]});});await p.locator('.ref-voice-end').click();await p.locator('.ref-voice-send').click();await p.locator('#guide-answer p').filter({hasText:'测试回答'}).waitFor();assert.equal(calls.at(-1).current_spot,'hongmen');assert.ok((await p.locator('#guide-turn-topic').innerText()).includes('红门'));assert.ok((await p.locator('#guide-context').innerText()).includes('十八盘'));assert.equal(await p.locator('#guide-input').inputValue(),'我暂时不发送的草稿');await p.locator('#guide-return-topic').click();assert.ok((await p.locator('#guide-answer p').innerText()).includes('十八盘'));

 await p.locator('#guide-switch-context').click();await p.locator('.guide-context-dialog select').selectOption('bixia');await p.locator('.guide-context-dialog button[value=apply]').click();await p.locator('#guide-context').filter({hasText:'碧霞祠'}).waitFor();assert.ok((await p.locator('#guide-context').innerText()).includes('碧霞祠'));assert.equal(await p.locator('#guide-input').inputValue(),'我暂时不发送的草稿');
 // Explicitly read old messages while a new response is pending.
 hold=true;const pending=new Promise(resolve=>started=resolve);await p.locator('#guide-input').fill('请介绍碧霞祠');await p.locator('#guide-form button[type=submit]').click();await pending;
 if(width<768)await p.locator('#guide-history-shortcut').click();await p.locator('.guide-history-item').filter({hasText:'十八盘为什么这样命名？'}).locator('.guide-history-read').click();
 const selected=p.locator('.guide-turn.is-selected'),selectedId=await selected.getAttribute('id'),scrollBefore=await p.locator('.guide-scroll').evaluate(e=>e.scrollTop);release();await p.locator('#guide-answer p').filter({hasText:'请介绍碧霞祠'}).waitFor();await p.locator('.guide-latest:not([hidden])').waitFor();assert.equal(await p.locator('.guide-turn.is-selected').getAttribute('id'),selectedId);assert.ok(Math.abs(await p.locator('.guide-scroll').evaluate(e=>e.scrollTop)-scrollBefore)<10);await p.locator('.guide-latest').click();
 assert.ok(await p.locator('#guide-thread .guide-turn').count()>=4);

 // Two image buttons now perform different user-triggered actions.
 await p.locator('#guide-input').fill('这座建筑有什么故事？');const chooser=p.waitForEvent('filechooser');await p.locator('[data-guide-image=album]').click();await chooser;await p.locator('.ref-vision-close').click();await p.locator('#guide-input').waitFor();assert.equal(await p.locator('#guide-input').inputValue(),'这座建筑有什么故事？');assert.ok((await p.locator('#guide-context').innerText()).includes('碧霞祠'));
 await p.locator('[data-guide-image=camera]').click();await p.waitForFunction(()=>document.querySelector('.ref-vision-camera video')?.videoWidth>0);await p.evaluate(()=>window.testCameraTracks=document.querySelector('.ref-vision-camera video').srcObject.getTracks());await p.locator('.ref-vision-shutter').click();await p.locator('#vision-preview:not([hidden])').waitFor();assert.equal(await p.locator('#vision-question').inputValue(),'这座建筑有什么故事？');assert.equal(await p.evaluate(()=>window.testCameraTracks.every(t=>t.readyState==='ended')),true);await p.locator('.ref-vision-close').click();
 await p.locator('#guide-context').filter({hasText:'碧霞祠'}).waitFor();await p.locator('.guide-scene.is-open').waitFor();if(width>=1100)await p.locator('#guide-model[data-model-ready=true]').waitFor({timeout:90000});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await p.locator('#guide-form').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),true);await p.screenshot({path:`${out}/${width}-conversation.png`});
 checks.push({width,height,historyRestoresAnswers:true,duplicateAnswersPreserved:true,voiceDraftPreserved:true,explicitConfirmation:true,perQuestionContext:true,contextSwitchPreservesDraft:true,continuousThread:true,noScrollJump:true,albumPicker:true,cameraCaptureAndStop:true});await c.close();console.log('Guide completion passed',width,height);
}assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,scope:'Controlled chat/history responses, browser ASR test double and Chrome fake camera. Real GLB loads on desktop; no AI or media provider is called.'},null,2));}finally{await b.close();}
