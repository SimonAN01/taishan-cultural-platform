import { artUrl } from './art-gallery.js';
import { requestApi } from './integration.js';
import './cultural-scenes.css';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const references=point=>`<details class="scene-sources"><summary>对照资料出处</summary>${(point.sources||[]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)} · ${esc(s.title)} ↗</a>`).join('')}</details>`;

export function renderSceneDirectory(host,scenes,onOpen){
  host.innerHTML=`<div class="scene-directory"><p class="culture-eyebrow">BEYOND THE SUMMIT · 山有别境</p><h1 id="culture-title">庙有千年，石有回声，松有来路。</h1><p class="scene-directory-lead">走出一条登顶线，把目光留给山前、西麓与岱阴。<br>选一卷，循三处阅读点，读一段泰山。</p><div class="scene-collection">${scenes.map(s=>`<button class="scene-cover ${s.id}" data-open-scene="${s.id}"><span class="scene-cover-art"><img src="${artUrl(s.cover)}" alt="${esc(s.name)}艺术化画境"></span><span class="scene-cover-copy"><small>${esc(s.eyebrow)}</small><strong>${esc(s.name)}</strong><span>${esc(s.intro)}</span><b>走入画境 <i aria-hidden="true">↗</i></b></span></button>`).join('')}</div><p class="scene-directory-note">三卷为独立文化场景，不拼接为现实登山路线。画面使用已有艺术素材，讲解附原始资料。</p></div>`;
  host.querySelectorAll('[data-open-scene]').forEach(b=>b.onclick=()=>onOpen(b.dataset.openScene));
}

export function mountCulturalScene(host,{scene,initialPoint,initialMode='space',onMode=()=>{},onPoint,onGuide,onSpot,onRoute,onDirectory}){
  let current=scene.points.find(p=>p.id===initialPoint)||scene.points[0];
  let alive=true,progress=null,saved=null,saveFavorite=false,spatial=null,spatialRevision=0;
  let mode=initialMode;
  const saving=new Set(),controller=new AbortController();
  let audio=null,audioUrl=null,audioRequest=null,audioRevision=0;
  host.innerHTML=`<section class="cultural-scene ${scene.id}"><header class="scene-heading"><div><p class="culture-eyebrow">${esc(scene.eyebrow)}</p><h1 id="culture-title">${esc(scene.name)}</h1><p>${esc(scene.title)}</p></div><div class="scene-mode-actions"><button class="scene-mode" aria-pressed="false">进入空间漫游</button><button class="scene-directory-back">三卷山境 ↗</button></div></header><div class="scene-layout"><div class="scene-visual-column"><div class="scene-stage"><div class="scene-space" hidden></div><div class="scene-canvas">${scene.background?`<img class="scene-background" src="${artUrl(scene.background)}" alt="${esc(scene.name)}山水意象">`:'<div class="scene-paper-horizon" aria-hidden="true"></div>'}${scene.foreground?`<img class="scene-foreground ${scene.foreground_style}" src="${artUrl(scene.foreground)}" alt="${esc(scene.name)}建筑意象">`:''}<div class="scene-point-art"></div>${scene.points.map((p,i)=>`<button class="scene-pin" data-point="${p.id}" style="left:${p.x}%;top:${p.y}%" aria-label="阅读${esc(p.title)}"><span>0${i+1}</span><b>${esc(p.label)}</b></button>`).join('')}</div><button class="scene-zoom" aria-pressed="false">放大画境 ＋</button><span class="scene-art-seal" aria-hidden="true">${esc(scene.name)}<br>一山千年</span></div><p class="scene-space-status" role="status"></p><p class="scene-art-caption">${esc(scene.art_note)}</p><div class="scene-reading-progress" role="status">正在读取阅读记录…</div><div class="scene-record-error" role="alert"></div><nav class="scene-point-list" aria-label="场景阅读点">${scene.points.map((p,i)=>`<button data-step="${p.id}"><small>0${i+1}</small><span>${esc(p.label)}</span><i aria-hidden="true"></i></button>`).join('')}</nav><div class="scene-context"><span>${esc(scene.theme)}</span><button class="scene-favorite" disabled>读取收藏…</button></div></div><article class="scene-reading" aria-live="polite"></article></div><footer class="scene-continue"><div><small>山境之外 · 接着读山</small><p>把这一处，放回更大的泰山。</p></div><div>${scene.related_spots.map(id=>`<button data-related="${id}"></button>`).join('')}${scene.related_route?'<button class="scene-route">查看关联游览线 ↗</button>':''}<a href="#trail">我的足迹与收藏 ↗</a></div></footer></section>`;
  const reading=host.querySelector('.scene-reading'),stage=host.querySelector('.scene-stage'),canvas=host.querySelector('.scene-canvas'),zoom=host.querySelector('.scene-zoom');
  const status=()=>reading.querySelector('.scene-audio-status');
  function stopVoice(){audioRevision++;audioRequest?.abort();audioRequest=null;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio.remove();audio=null;}if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}}
  async function speak(){
    stopVoice();const token=audioRevision,point=current;
    audioRequest=new AbortController();const request=audioRequest,timer=setTimeout(()=>request.abort(),35000);
    const play=reading.querySelector('.scene-listen');play.disabled=true;status().textContent='正在合成这一段讲解…';
    try{
      const response=await fetch('/api/speech/tts',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:scene.name+'。'+point.title+'。'+point.text}),signal:request.signal});
      if(!response.ok)throw new Error('讲解语音暂不可用，请重试或继续阅读。');
      const blob=await response.blob();if(!alive||token!==audioRevision)return;
      audioUrl=URL.createObjectURL(blob);audio=new Audio(audioUrl);audio.controls=true;audio.setAttribute('aria-label',scene.name+'文化讲解音频');reading.querySelector('.scene-audio').append(audio);
      audio.onplaying=()=>{if(alive&&token===audioRevision)status().textContent='正在播放这一段讲解';};
      audio.onpause=()=>{if(alive&&token===audioRevision&&!audio.ended)status().textContent='讲解已暂停，可在播放器继续';};
      audio.onended=()=>{if(alive&&token===audioRevision)status().textContent='这一段已播完';};
      audio.onerror=()=>{if(alive&&token===audioRevision)status().textContent='音频未能播放，请重试。';};
      await audio.play();
    }catch(error){if(alive&&token===audioRevision)status().textContent=error.name==='AbortError'?'语音等待超时，请重试。':error.name==='NotAllowedError'?'请再次点击“听这一段”以播放讲解。':error.message;}
    finally{clearTimeout(timer);if(alive&&token===audioRevision){play.disabled=false;audioRequest=null;}}
  }
  function updateProgress(){
    host.querySelector('.scene-reading-progress').textContent=progress?`已记录 ${progress.viewed.length} / ${progress.total} 处阅读点${progress.viewed.length===progress.total?' · 此卷已读完':''}`:'正在读取阅读记录…';
    for(const b of host.querySelectorAll('[data-step]'))b.classList.toggle('is-read',Boolean(progress?.viewed.includes(b.dataset.step)));
    const mark=reading.querySelector('.scene-mark');if(mark){mark.disabled=!progress||saving.has(current.id)||progress.viewed.includes(current.id);mark.textContent=saving.has(current.id)?'正在保存…':progress?.viewed.includes(current.id)?'已记录这一处 ✓':'记录这一处已读';}
    const favorite=host.querySelector('.scene-favorite');favorite.disabled=saved===null||saveFavorite;favorite.textContent=saveFavorite?'正在保存…':saved?'已收藏此景 ✓':'收藏此景';favorite.setAttribute('aria-pressed',String(saved===true));
  }
  async function record(){
    const point=current; saving.add(point.id);updateProgress();host.querySelector('.scene-record-error').textContent='';
    try{const reply=await requestApi(`scenes/${scene.id}/discover`,{method:'POST',body:JSON.stringify({point_id:point.id}),signal:controller.signal});if(alive)progress=reply.progress;}
    catch(error){if(alive)host.querySelector('.scene-record-error').textContent='阅读记录未能保存，可重试：'+error.message;}
    finally{saving.delete(point.id);if(alive)updateProgress();}
  }
  function select(id,update=true,follow=true){
    const point=scene.points.find(p=>p.id===id);if(!point)return;stopVoice();current=point;
    zoom.setAttribute('aria-pressed','false');zoom.textContent='放大画境 ＋';stage.classList.remove('is-zoomed');
    canvas.style.transformOrigin=`${point.x}% ${point.y}%`;
    host.querySelectorAll('[data-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.point===id)));
    host.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',b.dataset.step===id?'step':'false'));
    host.querySelector('.scene-point-art').innerHTML=point.detail_asset?`<figure><img src="${artUrl(point.detail_asset)}" alt="${esc(point.label)}意象"><figcaption>${esc(point.label)} · 艺术化近观</figcaption></figure>`:'';
    const index=scene.points.indexOf(point);
    reading.innerHTML=`<p class="scene-chapter-number">阅读 0${index+1} <span>／ 0${scene.points.length}</span></p><span class="scene-kind">${esc(point.kind)}</span><h2 tabindex="-1">${esc(point.title)}</h2><div class="scene-reading-rule"></div><p class="scene-fact">${esc(point.text)}</p><div class="scene-observe"><small>停一停 · 看一眼</small><p>${esc(point.observe)}</p></div>${references(point)}<div class="scene-audio"><div><button class="scene-listen">听这一段 ▶</button><button class="scene-stop-audio">停止朗读</button></div><p class="scene-audio-status" role="status"></p></div><div class="scene-actions"><button class="scene-mark">记录这一处已读</button><button class="scene-ask">追问仙子 ↗</button></div><p class="scene-progress-note">阅读记录保存在当前浏览器的匿名会话中。</p><nav class="scene-turn-pages" aria-label="阅读翻页"><button class="scene-previous" ${index===0?'disabled':''}>← 上一处</button><button class="scene-next" ${index===scene.points.length-1?'disabled':''}>下一处 →</button></nav>`;
    reading.querySelector('.scene-mark').onclick=record;
    reading.querySelector('.scene-listen').onclick=speak;
    reading.querySelector('.scene-stop-audio').onclick=()=>{stopVoice();reading.querySelector('.scene-listen').disabled=false;status().textContent='已停止朗读';};
    reading.querySelector('.scene-ask').onclick=()=>onGuide(scene.spot_id,point.question);
    reading.querySelector('.scene-previous').onclick=()=>select(scene.points[index-1]?.id);
    reading.querySelector('.scene-next').onclick=()=>select(scene.points[index+1]?.id);
    spatial?.setPoint(id);updateProgress();if(update){onPoint(point.id);if(follow&&innerWidth<768)reading.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  }
  async function loadProgress(){
    const errorHost=host.querySelector('.scene-record-error');errorHost.replaceChildren();
    try{const data=await requestApi('scenes/'+scene.id,{signal:controller.signal});if(!alive)return;progress=data.progress;saved=data.saved;updateProgress();}
    catch(error){if(!alive)return;host.querySelector('.scene-reading-progress').textContent='阅读与收藏状态暂未读取';errorHost.textContent=error.message+' ';const retry=document.createElement('button');retry.textContent='重新读取记录';retry.onclick=loadProgress;errorHost.append(retry);}
  }
  host.querySelectorAll('[data-point],[data-step]').forEach(b=>b.onclick=()=>select(b.dataset.point||b.dataset.step));
  const steps=[...host.querySelectorAll('[data-step]')];steps.forEach((b,i)=>b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?steps.length-1:(i+(e.key==='ArrowRight'?1:-1)+steps.length)%steps.length;select(steps[n].dataset.step);steps[n].focus({preventScroll:true});});
  zoom.onclick=()=>{const value=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(value));zoom.textContent=value?'复位画境 −':'放大画境 ＋';stage.classList.toggle('is-zoomed',value);};
  async function setMode(value,update=true){
    mode=value;const token=++spatialRevision;spatial?.destroy();spatial=null;
    for(const p of scene.points){const pin=host.querySelector(`[data-point="${p.id}"]`);pin.style.left=p.x+'%';pin.style.top=p.y+'%';pin.style.visibility='';}
    const space=host.querySelector('.scene-space'),button=host.querySelector('.scene-mode'),message=host.querySelector('.scene-space-status');
    stage.classList.remove('is-space');space.hidden=value!=='space';
    button.setAttribute('aria-pressed',String(value==='space'));button.textContent=value==='space'?'切回画卷阅读':'进入空间漫游';
    if(update)onMode(value);
    if(value!=='space'){message.textContent='';return;}
    message.textContent='正在准备空间漫游…';
    try{const {createSpatialScene}=await import('./spatial-scene.js');if(!alive||token!==spatialRevision)return;
      spatial=createSpatialScene(space,{scene,onPoint:id=>select(id,true,false),onStatus:text=>{if(alive&&token===spatialRevision)message.textContent=text;},reducedMotion:document.body.classList.contains('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches});
      const active=spatial;await active.ready;if(!alive||token!==spatialRevision){active.destroy();return;}stage.classList.add('is-space');active.setPoint(current.id);
    }catch{if(alive&&token===spatialRevision){spatial?.destroy();spatial=null;space.hidden=true;stage.classList.remove('is-space');mode='reading';button.setAttribute('aria-pressed','false');button.textContent='重试空间漫游';message.textContent='空间漫游暂未载入，仍可阅读画卷和听讲解。';onMode('reading');}}
  }
  host.querySelector('.scene-mode').onclick=()=>setMode(mode==='space'?'reading':'space');
  host.querySelector('.scene-directory-back').onclick=onDirectory;
  host.querySelectorAll('[data-related]').forEach(b=>{b.textContent=scene.related_names?.[b.dataset.related]||b.dataset.related;b.onclick=()=>onSpot(b.dataset.related);});
  if(scene.related_route)host.querySelector('.scene-route').onclick=()=>onRoute(scene.related_route);
  host.querySelector('.scene-favorite').onclick=async()=>{
    const desired=!saved;saveFavorite=true;updateProgress();host.querySelector('.scene-record-error').textContent='';
    try{await requestApi('journey/favorite',{method:'POST',body:JSON.stringify({kind:'spot',item_id:scene.spot_id,saved:desired}),signal:controller.signal});if(alive)saved=desired;}
    catch(error){if(alive)host.querySelector('.scene-record-error').textContent='收藏未保存，可重试：'+error.message;}
    finally{saveFavorite=false;if(alive)updateProgress();}
  };
  select(current.id,false);loadProgress();setMode(mode,false);
  return {pointId:current.id,destroy(){alive=false;spatialRevision++;spatial?.destroy();controller.abort();stopVoice();}};
}
