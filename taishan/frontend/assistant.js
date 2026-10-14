import {$,esc,api,post,notice,speak,stopSpeech} from './ui.js';
export function createAssistant(getContext,health){
 const dialog=$('#chat-dialog'),messages=$('#chat-messages');let busy=false,loaded=false,loading=null,generation=0;
 const modelName=name=>name==='deepseek-v4.1-flash'?'DeepSeek V4.1 Flash':name??'AI';
 const label=data=>({guide_intro:'文化导览角色',local_knowledge:'直接引用文化资料',rag_llm:modelName(data.model)+' · 文化导览',local_knowledge_fallback:'模型未生成有效答复，已返回文化资料',error:'请求未完成'}[data.mode]??'历史对话 · 未记录生成方式');
 function append(role,text,data={}){
  const item=document.createElement('div');item.className=`message ${role}`;
  const title=document.createElement('div');title.className='message-label';title.textContent=role==='user'?'你':`碧霞仙子 · ${label(data)}`;item.append(title);
  const p=document.createElement('p');p.textContent=text;item.append(p);
  const groups=data.citations?.length?data.citations.map(c=>({title:`[${c.number}] ${c.title}`,sources:c.sources})):data.sources?.length?[{title:'资料来源',sources:data.sources}]:[];
  for(const group of groups){const list=document.createElement('div');list.className='message-sources';const caption=document.createElement('strong');caption.textContent=group.title;list.append(caption);
   for(const s of group.sources){const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`${s.publisher} · ${s.title} ↗`;list.append(a)}item.append(list)}
  if(role==='assistant'&&data.mode!=='error'&&!data.pending&&'speechSynthesis'in window){const b=document.createElement('button');b.className='speak';b.textContent='听讲解';b.onclick=()=>speak(text,b);item.append(b)}
  messages.append(item);messages.scrollTop=messages.scrollHeight;return item;
 }
 function suggestions(){ $('#suggestions').innerHTML=['封禅是什么？','望岳写了什么？','红门线怎么走？'].map(q=>`<button data-question="${esc(q)}">${esc(q)}</button>`).join('') }
 async function loadHistory(){
  if(loaded)return;if(loading)return loading;const revision=generation;
  loading=(async()=>{try{const hist=await api('agent/history');if(revision!==generation)return;
   if(hist.length)hist.forEach(x=>append(x.role,x.text,x));else append('assistant','我是碧霞仙子。选一处景点，或问一段历史、一句诗，我们一起读泰山。',{mode:'guide_intro'});loaded=true;
  }catch{if(revision===generation)notice('历史对话暂未读取，请重新打开问答重试')}finally{if(revision===generation)loading=null}})();await loading;
 }
 async function open(question){
  $('#chat-context').textContent=getContext().label??'聊一聊泰山的历史与文化';
  if(!dialog.open)dialog.showModal();suggestions();
  $('#chat-note').textContent=health.llm_configured?'语言模型服务已配置，每条回答标明实际生成方式。':'当前使用文化资料检索，未配置生成式模型。';
  await loadHistory();if(question&&!busy){$('#chat-input').value=question;await send()}else $('#chat-input').focus();
 }
 async function send(){
  if(busy)return;const input=$('#chat-input'),text=input.value.trim();if(!text)return;const revision=generation;
  busy=true;$('#chat-send').disabled=true;input.value='';append('user',text);const pending=append('assistant','正在查阅文化资料…',{mode:'guide_intro',pending:true});
  try{const result=await post('agent/chat',{message:text,...getContext().payload});if(revision!==generation)return;pending.remove();append('assistant',result.answer,result);$('#chat-note').textContent=label(result)+' · 请对照资料来源。'}
  catch(e){if(revision!==generation)return;pending.remove();append('assistant',e.name==='TimeoutError'?'回应超时，请重新提问。':e.message,{mode:'error'});input.value=text}
  finally{if(revision===generation){busy=false;$('#chat-send').disabled=false;input.focus()}}
 }
 $('#chat-form').onsubmit=e=>{e.preventDefault();send()};$('#chat-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}};
 $('#suggestions').onclick=e=>{const b=e.target.closest('[data-question]');if(b&&!busy){$('#chat-input').value=b.dataset.question;send()}};
 dialog.addEventListener('close',stopSpeech);
 return {open,clear:()=>{generation++;messages.replaceChildren();loaded=false;loading=null;busy=false;$('#chat-send').disabled=false;stopSpeech()},close:()=>dialog.close()};
}
