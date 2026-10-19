// Conversation history and per-question context share the existing chat API.
export function resolveGuideContext(question,catalog,selectedId,topic={},previous=null){
  const spots=catalog?.spots||[];
  const named=spots.filter(s=>[s.name,...(s.alias||[])].some(name=>name.length>1&&question.includes(name)));
  if(named.length===1)return {spotId:named[0].id,label:named[0].name,topic:{}};
  if(named.length>1)return {spotId:selectedId,label:named.map(s=>s.name).join('、'),topic:{}};
  if(previous&&/^(继续|再讲|接着|它|那[里处])/.test(question.trim()))return previous;
  const item=topic.poem?catalog?.poems.find(p=>p.id===topic.poem):topic.route?catalog?.routes.find(r=>r.id===topic.route):null;
  return {spotId:selectedId||null,label:item?.title||item?.name||spots.find(s=>s.id===selectedId)?.name||'泰山文化',topic};
}

export function guideTurns(rows,catalog){
  const turns=[];let pending=null;
  for(const row of rows){
    if(row.role==='user')pending=row;
    else if(row.role==='assistant'&&pending){
      turns.push({question:pending.text,reply:row,context:resolveGuideContext(pending.text,catalog,pending.spot_id||row.spot_id)});pending=null;
    }
  }
  return turns;
}

export function groupGuideTurns(turns){
  const groups=new Map();
  for(const turn of [...turns].reverse()){
    const key=turn.context.label+'\n'+turn.question.trim();
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(turn);
  }
  return [...groups.values()];
}

export function mountGuideThread({host,historyHost,getCatalog,onRead,onReplay,onSpeak,onSpot,getActiveElement}){
  let turns=[],active=null,serial=0;
  function identify(turn){return {...turn,id:'guide-turn-'+(++serial)};}
  function select(turn){
    onRead();host.querySelectorAll('.is-selected').forEach(e=>e.classList.remove('is-selected'));
    const target=turn===active?getActiveElement():document.getElementById(turn.id);
    if(target){target.classList.add('is-selected');target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}
  }
  function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
  function render(){
    const archived=turns.filter(t=>t!==active),ids=new Set(archived.map(t=>t.id));
    for(const node of [...host.children])if(!ids.has(node.id))node.remove();
    for(const [index,turn] of archived.entries()){
      if(host.children[index]?.id===turn.id)continue;
      const article=document.createElement('article');article.className='guide-turn';article.id=turn.id;
      article.innerHTML='<p class="guide-turn-topic"></p><p class="guide-turn-question"></p><section class="guide-turn-answer"><strong>碧霞仙子</strong><p></p><div class="guide-turn-actions"></div></section>';
      article.querySelector('.guide-turn-topic').textContent='关于 '+turn.context.label;
      article.querySelector('.guide-turn-question').textContent=turn.question;
      article.querySelector('.guide-turn-answer>p').textContent=turn.reply.answer||turn.reply.text;
      const actions=article.querySelector('.guide-turn-actions');
      actions.append(button('再次提问',()=>onReplay(turn)),button('朗读回答',()=>onSpeak(turn.reply.answer||turn.reply.text)));
      if(turn.context.spotId)actions.append(button('查看景点资料 ↗',()=>onSpot(turn.context.spotId)));
      const sources=turn.reply.sources||[];
      if(sources.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='资料来源 · '+sources.length;details.append(summary);
        for(const source of sources){try{const url=new URL(source.url);if(!['http:','https:'].includes(url.protocol))continue;const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(source.publisher?source.publisher+' · ':'')+source.title;details.append(a);}catch{}}
        article.querySelector('.guide-turn-answer').append(details);
      }
      host.insertBefore(article,host.children[index]||null);
    }
    historyHost.replaceChildren();
    if(!turns.length){historyHost.textContent='还没有对话。选一个问题开始。';return;}
    for(const group of groupGuideTurns(turns)){
      const latest=group[0],item=document.createElement('section');item.className='guide-history-item';
      const open=button('',()=>select(latest));open.className='guide-history-read';
      const title=document.createElement('span'),label=document.createElement('small');title.textContent=latest.question;label.textContent=latest.context.label+(group.length>1?' · '+group.length+' 次问答':' · 查看问答');open.append(title,label);item.append(open);
      if(group.length>1){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='展开 '+group.length+' 次回答';details.append(summary);group.forEach((turn,i)=>details.append(button(i===0?'最近一次回答':'更早的回答 '+i,()=>select(turn))));item.append(details);}
      historyHost.append(item);
    }
  }
  return {
    reset(rows=[]){active=null;turns=guideTurns(rows,getCatalog()).map(identify);render();},
    archive(){active=null;render();},
    complete(question,reply,context){active=identify({question,reply,context});turns.push(active);render();},
    sync(rows){const previous=[...turns],incoming=guideTurns(rows,getCatalog()).map(turn=>{const index=previous.findIndex(t=>t.question===turn.question&&(t.reply.answer||t.reply.text)===(turn.reply.answer||turn.reply.text)&&t.context.label===turn.context.label);return index<0?identify(turn):{...turn,id:previous.splice(index,1)[0].id};});if(active){const match=incoming.findLast(t=>t.question===active.question&&(t.reply.answer||t.reply.text)===(active.reply.answer||active.reply.text));if(match)active=match;else incoming.push(active);}turns=incoming;render();},
    selectLast(){if(turns.length)select(turns.at(-1));},
  };
}
