import {requestApi} from './integration.js';

// Shared native player: real audio events drive state and provider timings drive poetry.
export function mountReadingAudio(host,{text,poemId,onLine=()=>{}}){
  host.innerHTML='<div class="reading-audio-actions"><button class="reading-play">▶ 听讲解</button><button class="reading-stop" disabled>停止</button><label>语速 <select aria-label="朗读语速"><option value="0.8">0.8 倍</option><option value="1" selected>1 倍</option><option value="1.2">1.2 倍</option></select></label></div><p role="status"></p><div class="reading-audio-player"></div>';
  const play=host.querySelector('.reading-play'),stop=host.querySelector('.reading-stop'),status=host.querySelector('[role=status]'),speed=host.querySelector('select');
  play.textContent=poemId?'▶ 朗诵全诗':'▶ 听此处讲解';
  let alive=true,request=null,audio=null,url=null,cues=[],activeLine=-1,version=0;
  function release(){version++;request?.abort();request=null;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio.remove();audio=null;}if(url)URL.revokeObjectURL(url);url=null;}
  function updateLine(){if(!audio||audio.paused)return;const cue=cues.find(c=>audio.currentTime>=c.start&&audio.currentTime<=c.end);if(cue&&cue.line!==activeLine){activeLine=cue.line;onLine(cue.line);}}
  play.onclick=async()=>{
    release();const token=version;request=new AbortController();const activeRequest=request,timer=setTimeout(()=>activeRequest.abort(),45000),signal=activeRequest.signal;
    play.disabled=true;stop.disabled=false;status.textContent='正在准备讲解音频…';
    try{
      let source;
      if(poemId){const reply=await requestApi(`poems/${poemId}/narration`,{method:'POST',signal});if(!alive||token!==version)return;cues=reply.cues;source=reply.audio_url;}
      else{const reply=await fetch('/api/speech/tts',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,1500)}),signal});if(!reply.ok){const error=await reply.json().catch(()=>({}));throw new Error(error.detail||'朗读暂不可用，请重试');}const blob=await reply.blob();if(!alive||token!==version)return;url=URL.createObjectURL(blob);source=url;}
      audio=new Audio(source);audio.controls=true;audio.playbackRate=Number(speed.value);audio.setAttribute('aria-label',poemId?'诗词朗诵播放器':'景点讲解播放器');host.querySelector('.reading-audio-player').append(audio);activeLine=-1;
      audio.onplaying=()=>{if(alive&&token===version){status.textContent='正在朗读 · 可暂停、拖动进度或调节音量';updateLine();}};
      audio.ontimeupdate=updateLine;audio.onseeked=()=>{activeLine=-1;updateLine();};
      audio.onpause=()=>{if(alive&&token===version&&!audio.ended)status.textContent='已暂停，可在播放器继续';};
      audio.onended=()=>{if(alive&&token===version){status.textContent='朗读完毕';stop.disabled=true;}};
      audio.onerror=()=>{if(alive&&token===version){status.textContent='音频未能播放，请重新朗读';play.disabled=false;stop.disabled=true;}};
      await audio.play();
    }catch(error){if(alive&&token===version)status.textContent=error.name==='AbortError'?'朗读等待超时，请重试':error.name==='NotAllowedError'?'音频已就绪，请点击播放器开始朗读':error.message;}
    finally{clearTimeout(timer);if(alive&&token===version){play.disabled=false;request=null;}}
  };
  stop.onclick=()=>{release();play.disabled=false;stop.disabled=true;status.textContent='已停止朗读';};
  speed.onchange=()=>{if(audio)audio.playbackRate=Number(speed.value);};
  return {seekLine(i){const cue=cues.find(c=>c.line===i);if(audio&&cue){audio.currentTime=cue.start;activeLine=-1;}},destroy(){alive=false;release();}};
}

export function mountFavorite(button,kind,id){
  const controller=new AbortController();let alive=true,saved=null;
  function show(){button.disabled=false;button.textContent=saved===null?'重新读取收藏':saved?'已收藏 ✓':'收藏'+(kind==='poem'?'此诗':'此景');button.setAttribute('aria-pressed',String(saved===true));}
  function error(e){let note=button.parentElement.querySelector('.favorite-error');if(!note){note=document.createElement('p');note.className='favorite-error';note.setAttribute('role','alert');button.after(note);}note.textContent='收藏状态未更新：'+e.message;}
  async function load(){button.disabled=true;button.textContent='读取收藏…';try{const r=await requestApi('journey',{signal:controller.signal});if(alive)saved=r.favorites.some(f=>f.kind===kind&&f.item_id===id);}catch(e){if(alive)error(e);}finally{if(alive)show();}}
  button.onclick=async()=>{if(saved===null){load();return;}const desired=!saved;button.disabled=true;button.textContent='正在保存…';button.parentElement.querySelector('.favorite-error')?.remove();try{await requestApi('journey/favorite',{method:'POST',body:JSON.stringify({kind,item_id:id,saved:desired}),signal:controller.signal});if(alive)saved=desired;}catch(e){if(alive)error(e);}finally{if(alive)show();}};
  load();return {destroy(){alive=false;controller.abort();}};
}
