// User-triggered browser speech recognition -> same-origin API -> audio -> avatar.
export function createVoicePipeline({host,input,onSubmit,getAvatar,onStatus,isOpen,isBusy}) {
  host.innerHTML=`<button type="button" id="guide-mic">语音提问</button><label><input type="checkbox" id="guide-autospeak" checked> 回答后自动朗读</label><p id="guide-mic-note"></p><button type="button" id="guide-device-voice" hidden>改用设备朗读</button>`;
  const mic=host.querySelector('#guide-mic'),note=host.querySelector('#guide-mic-note'),auto=host.querySelector('#guide-autospeak'),device=host.querySelector('#guide-device-voice');
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null, audio=null, audioUrl=null, controller=null, context=null, analyser=null, audioNode=null, frequency=null, animation=0, revision=0, recognitionRevision=0,lastText='',speaking=false;
  if(!window.isSecureContext){mic.disabled=true;note.textContent='当前 HTTP 地址无法启用麦克风，请使用 HTTPS 语音入口；文字提问和朗读仍可使用。';if(location.hostname==='118.89.176.236'){const a=document.createElement('a');a.href='https://118.89.176.236/experience/#agent';a.textContent=' 前往 HTTPS 语音入口 →';note.append(a);}}
  else if(!Recognition){mic.disabled=true;note.textContent='此浏览器未提供语音识别，请使用支持该功能的浏览器，或输入文字提问。';}
  else note.textContent='点击后授权麦克风，语音将由浏览器的语音服务转成文字。';
  function stopListening(){recognitionRevision++;recognition?.abort();recognition=null;mic.textContent='语音提问';}
  function stop(){revision++;controller?.abort();controller=null;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio.remove();audio=null;}if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}cancelAnimationFrame(animation);animation=0;audioNode?.disconnect();analyser?.disconnect();audioNode=null;analyser=null;frequency=null;speaking=false;getAvatar()?.setAudioLevel?.(0);getAvatar()?.setSpeaking(false);if('speechSynthesis' in window)speechSynthesis.cancel();}
  function unlock(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!context&&AudioContext)context=new AudioContext();
    if(context?.state==='suspended')context.resume().catch(()=>{});
  }
  function meter(){if(!audio||audio.paused)return;let level=0;if(analyser){analyser.getByteTimeDomainData(frequency);let square=0;for(const sample of frequency)square+=((sample-128)/128)**2;level=Math.min(1,Math.sqrt(square/frequency.length)*5);}getAvatar()?.setAudioLevel?.(level);animation=requestAnimationFrame(meter);}
  async function speak(text){
    stop();lastText=text;device.hidden=true;const token=revision;controller=new AbortController();const activeController=controller;const timeout=setTimeout(()=>activeController.abort(),35000);
    onStatus('正在合成晓晓语音','thinking');
    try{
      const response=await fetch('/api/speech/tts',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.replace(/\[\d+\]/g,'').slice(0,1500)}),signal:activeController.signal});
      if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.detail||'语音服务暂不可用');}
      const blob=await response.blob();if(token!==revision||!isOpen())return;
      audioUrl=URL.createObjectURL(blob);audio=new Audio(audioUrl);audio.preload='auto';audio.controls=true;audio.setAttribute('aria-label','碧霞仙子讲解音频');host.append(audio);const currentAudio=audio;
      // An AudioContext analyser measures the actual audio amplitude, not a timed mouth animation.
      if(context){audioNode=context.createMediaElementSource(audio);analyser=context.createAnalyser();analyser.fftSize=256;frequency=new Uint8Array(analyser.fftSize);audioNode.connect(analyser);analyser.connect(context.destination);}
      const finish=()=>{if(token!==revision)return;speaking=false;cancelAnimationFrame(animation);getAvatar()?.setAudioLevel?.(0);getAvatar()?.setSpeaking(false);onStatus('讲解完毕，可以继续提问','ready');};
      currentAudio.onplaying=()=>{if(token!==revision)return;speaking=true;getAvatar()?.setSpeaking(true);onStatus('正在播放 TTS 讲解','speaking');meter();};
      currentAudio.onpause=()=>{if(token!==revision)return;speaking=false;getAvatar()?.setAudioLevel?.(0);getAvatar()?.setSpeaking(false);if(!currentAudio.ended)onStatus('讲解已暂停，可在播放器继续','ready');};
      currentAudio.onended=finish;
      currentAudio.onerror=()=>{finish();device.hidden=false;onStatus('音频未能播放，可重试或改用设备朗读','ready');};
      await currentAudio.play();
    }catch(error){if(token!==revision)return;device.hidden=false;getAvatar()?.setSpeaking(false);onStatus(error.name==='NotAllowedError'?'浏览器需要点击“再听一遍”后才能播放':error.name==='AbortError'?'语音合成超时，可重试或改用设备朗读':error.message,'ready');}
    finally{clearTimeout(timeout);if(token===revision)controller=null;}
  }
  device.onclick=()=>{stop();if(!('speechSynthesis' in window)){onStatus('设备未提供朗读能力，请继续阅读','ready');return;}const token=revision,u=new SpeechSynthesisUtterance(lastText);u.lang='zh-CN';u.rate=.85;u.onstart=()=>{if(token!==revision)return;getAvatar()?.setSpeaking(true);onStatus('设备朗读中 · 语音事件驱动口型','speaking');};u.onboundary=()=>{if(token===revision)getAvatar()?.speechBoundary();};u.onend=()=>{if(token===revision){getAvatar()?.setSpeaking(false);onStatus('讲解完毕','ready');}};u.onerror=()=>{if(token===revision){getAvatar()?.setSpeaking(false);onStatus('设备朗读未能播放','ready');}};speechSynthesis.speak(u);};
  mic.onclick=()=>{
    if(recognition){recognition.stop();return;}if(!Recognition||isBusy())return;
    stop();unlock();const token=++recognitionRevision;let finalText='';recognition=new Recognition();const current=recognition;current.lang='zh-CN';current.continuous=false;current.interimResults=true;current.maxAlternatives=1;mic.textContent='结束并提问';note.textContent='正在听，请说出你的问题…';
    current.onresult=e=>{if(token!==recognitionRevision)return;let partial='';finalText='';for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript;else partial+=e.results[i][0].transcript;}input.value=(finalText+partial).slice(0,800);};
    current.onerror=e=>{if(token!==recognitionRevision)return;recognitionRevision++;recognition=null;mic.textContent='语音提问';note.textContent=({ 'not-allowed':'麦克风权限未开启，请在浏览器站点设置中允许麦克风。','audio-capture':'未检测到可用麦克风。','no-speech':'没有听清，请再试一次。','network':'浏览器语音服务连接失败，请输入文字或稍后重试。'})[e.error]||'语音识别未完成，请重试或输入文字。';};
    current.onend=()=>{if(token!==recognitionRevision)return;recognition=null;mic.textContent='语音提问';if(finalText.trim()&&isOpen()&&!isBusy()){note.textContent='已转成文字并提交，可在会话记录查看。';onSubmit(finalText.trim().slice(0,800));}else note.textContent='没有获取到完整语音，可以输入文字继续提问。';};
    try{current.start();}catch{stopListening();note.textContent='无法启动语音识别，请重新点击或输入文字。';}
  };
  return {speak,stop,stopListening,unlock,autoSpeak:()=>auto.checked,destroy(){stopListening();stop();context?.close();}};
}
