import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.UI_BASE_URL||'http://127.0.0.1:4174/experience/',out=process.env.UI_SCREENSHOT_DIR||'/tmp/taishan-recovery-audit';mkdirSync(out,{recursive:true});
// The public enriched catalogue is needed for actual reading content; keep it
// captured once, then inject only explicit failures and recovery responses.
const publicCatalog=await (await fetch(new URL('/api/catalog',base))).json();
const b=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}),checks=[],errors=[];
try{
for(const width of [390,1211]){
 const c=await b.newContext({viewport:{width,height:844},permissions:['camera'],reducedMotion:'reduce'});
 await c.addInitScript(()=>localStorage.setItem('taishan-experience',JSON.stringify({autoSpeak:false,captions:true,volume:.8})));
 let failRead=false,failSave=true,failDiscover=true,failChat=true,holdChat=false,releaseChat,holdAudio=false,releaseAudio,audioStarted,chatStarted;
 let journey={visited:[],favorites:[],stamps:[],scene_progress:[],learning:{},story_progress:{completed:[],next_chapter:'gate',total:5}};
 const viewed=new Set();
 await c.route('**/api/**',async r=>{
  const req=r.request(),path=new URL(req.url()).pathname,reply=data=>r.fulfill({json:data}),failure=()=>r.fulfill({status:503,json:{detail:'测试中的网络故障，请重试'}});
  if(path==='/api/catalog')return reply(publicCatalog);
  if(path==='/api/journey')return failRead?failure():reply(journey);
  if(path==='/api/journey/visit'){journey.visited=[{spot_id:req.postDataJSON().spot_id},...journey.visited];return reply({saved:true});}
  if(path==='/api/journey/favorite'){if(failSave){failSave=false;return failure();}const body=req.postDataJSON();journey.favorites=body.saved?[{kind:body.kind,item_id:body.item_id}]:[];return reply({saved:body.saved});}
  if(path.endsWith('/discover')){if(failDiscover){failDiscover=false;return failure();}viewed.add(req.postDataJSON().point_id);return reply({progress:{viewed:[...viewed],total:3}});}
  if(path.startsWith('/api/scenes/'))return reply({saved:false,progress:{viewed:[...viewed],total:3}});
  if(path==='/api/speech/tts'){if(holdAudio){audioStarted?.();await new Promise(resolve=>releaseAudio=resolve);return failure().catch(()=>{});}return failure();}
  if(path==='/api/agent/chat'){if(holdChat){chatStarted?.();await new Promise(resolve=>releaseChat=resolve);return reply({answer:'迟到的测试回复',mode:'local_knowledge'}).catch(()=>{});}if(failChat){failChat=false;return failure();}return reply({answer:'这是用于验证错误恢复的测试回答。',mode:'local_knowledge',sources:[]});}
  if(path==='/api/agent/history')return reply([]);
  if(path==='/api/vision/recognize')return failure();
  return reply({});
 });
 const p=await c.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push({width,message:e.message}));p.on('response',async r=>{if(r.url().includes('/api/')&&r.status()>=400)console.log('Recovery response',r.status(),new URL(r.url()).pathname);});
 const go=async hash=>{await p.goto(base+'#'+hash);if(!hash.startsWith('agent'))await p.locator('.culture-body[data-loading=false]').waitFor();};

 failRead=true;await go('spot?id=hongmen');await p.locator('.spot-favorite').filter({hasText:'重新读取收藏'}).waitFor();failRead=false;await p.locator('.spot-favorite').click();await p.locator('.spot-favorite').filter({hasText:'收藏此景'}).waitFor();await p.locator('.spot-favorite').click();await p.locator('.ref-feedback[data-feedback=save-error]').waitFor();await p.locator('.ref-feedback-primary').click();await p.locator('.ref-feedback[data-feedback=saved]').waitFor();await p.locator('.ref-feedback-close').click();assert.equal(await p.locator('.spot-favorite').getAttribute('aria-pressed'),'true');checks.push({width,feature:'favorite',failedReadRetry:true,failedSaveRetry:true});

 await go('history');await p.locator('.reading-play').click();await p.locator('.ref-history-audio [role=status]').filter({hasText:'测试中的网络故障'}).waitFor();assert.equal(await p.locator('.reading-stop').isDisabled(),true);assert.equal(await p.locator('.reading-play').isEnabled(),true);
 holdAudio=true;const audioPending=new Promise(r=>audioStarted=r);await p.locator('.reading-play').click();await audioPending;await p.locator('.reading-stop:not([disabled])').waitFor();await p.locator('.reading-stop').click();releaseAudio?.();await p.locator('.ref-history-audio [role=status]').filter({hasText:'已停止朗读'}).waitFor();assert.equal(await p.locator('.reading-audio-player audio').count(),0);checks.push({width,feature:'audio',errorRestoresButtons:true,cancelPreventsLatePlayer:true});

 await go('scene?id=caishixi&mode=reading');await p.locator('.scene-mark:not([disabled])').waitFor();const point=await p.locator('.scene-reading').getAttribute('data-ref-point');await p.locator('.scene-next').click();await p.locator('.scene-record-error').filter({hasText:'阅读记录未能保存'}).waitFor();assert.equal(await p.locator('.scene-reading').getAttribute('data-ref-point'),point);assert.equal(await p.locator('.scene-next').isEnabled(),true);await p.locator('.scene-next').click();await p.waitForFunction(id=>document.querySelector('.scene-reading')?.dataset.refPoint!==id,point);checks.push({width,feature:'scene',failedSaveDoesNotAdvance:true,retryAdvances:true});

 await go('agent?id=nantian');await p.locator('#guide-input').fill('测试问题');await p.locator('#guide-form button[type=submit]').click();await p.locator('#guide-retry:not([hidden])').waitFor();assert.equal(await p.locator('#guide-input').inputValue(),'测试问题');await p.locator('#guide-retry').click();await p.locator('#guide-answer p').filter({hasText:'测试回答'}).waitFor();assert.equal(await p.locator('#guide-cancel').isVisible(),false);
 holdChat=true;const chatPending=new Promise(r=>chatStarted=r);await p.locator('#guide-input').fill('取消后不应覆盖页面');await p.locator('#guide-form button[type=submit]').click();await chatPending;await p.locator('#guide-cancel').click();await p.locator('#guide-answer p').filter({hasText:'已停止等待'}).waitFor();releaseChat?.();assert.equal((await p.locator('#guide-answer p').innerText()).includes('迟到'),false);checks.push({width,feature:'guide',questionRestoredOnError:true,retry:true,cancelIgnoresLateReply:true});

 await go('vision');await p.locator('.ref-vision-shutter').click();await p.waitForFunction(()=>document.querySelector('.ref-vision-camera video')?.videoWidth>0);await p.evaluate(()=>window.testCameraTracks=document.querySelector('.ref-vision-camera video').srcObject.getTracks());await p.locator('.ref-vision-shutter').click();await p.locator('#vision-preview:not([hidden])').waitFor();assert.equal(await p.evaluate(()=>window.testCameraTracks.every(t=>t.readyState==='ended')),true);await p.locator('#vision-start').click();await p.locator('#vision-result').filter({hasText:'识景未完成'}).waitFor();assert.equal(await p.locator('#vision-start').isEnabled(),true);await p.screenshot({path:`${out}/${width}-vision-error-retry.png`});checks.push({width,feature:'vision',browserTestCameraCapture:true,tracksStopped:true,analysisErrorRetainsPhotoAndRetry:true});

 failRead=true;await go('trail');await p.locator('.records-retry').waitFor();failRead=false;await p.locator('.records-retry').click();await p.locator('[data-handbook-tab=favorites]').click();assert.equal(await p.locator('.ui-saved-card').count(),1);await p.locator('.culture-dialog [data-ui-action=settings]').click();await p.locator('.ui-settings input[name=captions]').uncheck();assert.equal(await p.locator('body.hide-guide-captions').count(),1);await p.locator('.ui-settings input[name=volume]').press('Home');await p.locator('.ui-settings input[name=volume]').press('ArrowRight');assert.equal(await p.locator('.ui-settings output').innerText(),'1%');await p.keyboard.press('Escape');assert.equal(await p.locator('.ui-settings').isVisible(),false);checks.push({width,feature:'records-settings',recordReadRetry:true,settingsApply:true,escapeCloses:true});
 await c.close();console.log('Recovery audit passed',width);
}
assert.deepEqual(errors,[]);writeFileSync(out+'/checks.json',JSON.stringify({checks,errors,fixtures:true,scope:'Explicit API error/success fixtures and Chrome fake camera; no real microphone/camera permission or AI/media provider is invoked.'},null,2));
}finally{await b.close();}
