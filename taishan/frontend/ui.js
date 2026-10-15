export const $ = (selector, root=document) => root.querySelector(selector);
export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const api = async (path, options={}) => {
 const response=await fetch(new URL(`api/${path}`,document.baseURI),{...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers},signal:options.signal??AbortSignal.timeout(65000)});
 const data=response.headers.get('content-type')?.includes('application/json')?await response.json():null;
 if(!response.ok)throw new Error(typeof data?.detail==='string'?data.detail:({413:'上传内容过大，图片限 8 MB',429:'操作较频繁，请稍后再试',502:'服务暂不可用，请稍后重试',503:'服务繁忙，请稍后重试'}[response.status]??'请求未完成，请稍后再试'));
 if(data===null)throw new Error('服务返回了无法读取的内容，请刷新后重试');return data;
};
export const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});
let timer;
export function notice(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('#notice').hidden=true,4500)}
export function sources(items=[]){return items.length?`<details class="source-list"><summary>查看资料来源 · ${items.length} 项</summary>${items.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p class="source-note">${esc(s.publisher)}</p>`).join('')}<p class="source-note">内容为简要释读，欢迎对照原始资料。</p></details>`:''}
export function heading(kicker,title,description){return `<div class="page-heading"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div>`}
let activeUtterance=null,activeButton=null,buttonLabel='',speechTimer=null;
export function speak(text,button){
 if(!('speechSynthesis' in window)){notice('当前浏览器不支持语音朗读');return}
 if(activeButton===button&&activeUtterance){stopSpeech();return}
 stopSpeech();activeUtterance=new SpeechSynthesisUtterance(text);activeUtterance.lang='zh-CN';activeUtterance.rate=.9;const utterance=activeUtterance;
 const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('zh'));if(voice)activeUtterance.voice=voice;
 activeButton=button??null;buttonLabel=button?.textContent??'';if(button)button.textContent='正在启动朗读…';
 const finish=()=>{if(activeUtterance!==utterance)return;clearTimeout(speechTimer);if(activeButton)activeButton.textContent=buttonLabel;activeButton=null;activeUtterance=null};
 utterance.onstart=()=>{if(activeUtterance!==utterance)return;clearTimeout(speechTimer);if(button)button.textContent='停止朗读';notice('朗读已开始，可点击停止')};
 utterance.onend=finish;utterance.onerror=()=>{if(activeUtterance===utterance){finish();notice('朗读未完成，请检查设备语音支持后重试')}};
 speechTimer=setTimeout(()=>{if(activeUtterance===utterance){stopSpeech();notice('设备尚未启动朗读，请重试或直接阅读文字')}},5000);
 speechSynthesis.speak(utterance);
}
export function stopSpeech(){clearTimeout(speechTimer);activeUtterance=null;if(activeButton)activeButton.textContent=buttonLabel;activeButton=null;if('speechSynthesis' in window)speechSynthesis.cancel()}
