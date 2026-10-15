import { requestApi, apiSpotId, recordVisit } from './integration.js';
import { artUrl, images } from './art-gallery.js';
import './cultural-pages.css';
import {renderSceneDirectory,mountCulturalScene} from './cultural-scenes.js';
import {mountReadingAudio,mountFavorite} from './cultural-audio.js';
import {mountRecords} from './cultural-records.js';
import { readCultureLocation, cultureHash } from './culture-location.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sources = item => `<div class="culture-sources"><strong>资料出处</strong>${(item.sources || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)} · ${esc(s.title)} ↗</a>`).join('') || '<p>本条资料暂未附出处。</p>'}</div>`;
const photoUrl = p => '/' + p.url.replace(/^\//, '');
const sceneUrl = id => artUrl(({nantian:'nantian-front',riguan:'riguan-landscape',taohua:'taohua-landscape',tianwai:'tianwai-landscape',daimiao:'H-ND-15A',caishixi:'H-BG-17',houshiwu:'H-ND-21-bg'})[id] || images.find(i => i.spot_id === (id === 'nantian' ? 'nantianmen' : id))?.id || 'map-cover');
const sections = [['map','山水地图'],['spot','景点详情'],['scenes','三卷山境'],['routes','登山路线'],['history','历史长卷'],['poetry','诗词文化'],['vision','AI识景'],['trail','足迹'],['agent','问山']];

export function createCulturalPages({getCatalog, onMap, onGuide, onLeaveGuide, onRoute, onScene}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'culture-dialog'; dialog.setAttribute('aria-labelledby','culture-title');
  dialog.innerHTML = `<header class="culture-header"><a class="culture-brand" href="#map"><span>岱</span>一山千年 · 泰山</a><nav aria-label="文化页面导航"></nav><button class="culture-close" aria-label="返回山水地图">×</button></header><div class="culture-body"></div>`;
  document.body.append(dialog);
  const body=dialog.querySelector('.culture-body');
  const photoViewer=document.createElement('dialog');
  photoViewer.className='culture-photo-viewer';photoViewer.setAttribute('aria-label','景点实景大图');
  photoViewer.innerHTML='<button aria-label="关闭实景大图">×</button><figure><img alt=""><figcaption></figcaption></figure>';
  document.body.append(photoViewer);
  photoViewer.querySelector('button').onclick=()=>photoViewer.close();
  photoViewer.addEventListener('click',event=>{if(event.target===photoViewer)photoViewer.close();});
  let cat, page='map', currentSpot='', routeId='hongmen', variantId='walk', era='先秦', poemId='wangyue', spotTab='history', photoIndex=0, sceneId='daimiao', scenePoint='', sceneMode='space', sceneView, chapterId='', poetryLine=0, poetryPanel='note';
  let widgets=[];
  function clearWidgets(){widgets.forEach(w=>w.destroy());widgets=[];}
  let revision=0, controller, previewUrl, speechToken=0, speechTimer, poemUtterance, returnFocus;
  const spot = id => cat?.spots.find(s=>s.id===id);
  const related = ids => `<div class="culture-links">${ids.map(id=>`<button data-spot="${esc(id)}">${esc(spot(id)?.name || id)} ↗</button>`).join('')}</div>`;
  const title = (small,text,lead='') => `<p class="culture-eyebrow">${small}</p><h1 id="culture-title">${text}</h1>${lead?`<p class="culture-lead">${lead}</p>`:''}`;
  function stopAudio(){ speechToken++; clearTimeout(speechTimer); poemUtterance=null; if('speechSynthesis' in window)speechSynthesis.cancel(); }
  function cleanup(){clearWidgets();sceneView?.destroy();sceneView=null;if(photoViewer.open)photoViewer.close();controller?.abort();controller=null;stopAudio();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
  function close(update=true){revision++;cleanup();if(dialog.open)dialog.close();document.body.classList.remove('culture-open');if(update&&location.hash!=='#map')history.pushState(null,'','#map');returnFocus?.focus({preventScroll:true});}
  dialog.querySelector('.culture-close').onclick=()=>close();
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.querySelector('.culture-brand').onclick=e=>{e.preventDefault();close();onMap();};
  async function open(next,id,update=true){
    if(next==='map'){chapterId='';close(update);onLeaveGuide?.();onMap();return;}
    if(next==='agent'){const saved=!update?readCultureLocation(location.hash):null;const context=id||(update&&page==='spot'?currentSpot:null),extra=saved?{poem:saved.poem,route:saved.route}:page==='poetry'?{poem:poemId}:page==='routes'?{route:routeId}:{};close(false);onGuide(context,update,null,extra);return;}
    onLeaveGuide?.();
    cleanup();page=next;const token=++revision;
    if(next==='spot'){if(id)currentSpot=apiSpotId(id);spotTab='history';photoIndex=0;}
    if(next==='routes'&&id)routeId=id;
    if(next==='poetry'){if(id)poemId=id;poetryLine=0;poetryPanel='note';}
    if(next==='study')chapterId=id||'';
    if(next==='scene'){sceneId=id||'daimiao';scenePoint='';sceneMode='space';}
    if(!update){
      const saved=readCultureLocation(location.hash);
      if(saved?.page===next){
        if(cat?.story.chapters.some(c=>c.id===saved.chapter)||saved.chapter)chapterId=saved.chapter;
        if(next==='spot'){currentSpot=apiSpotId(saved.id);spotTab=saved.tab;photoIndex=saved.photo;}
        if(next==='routes'){routeId=saved.id||'hongmen';variantId=saved.variant;}
        if(next==='history')era=saved.era;
        if(next==='poetry'){poemId=saved.id||'wangyue';poetryLine=saved.line;poetryPanel=saved.panel;}
        if(next==='study')chapterId=saved.id;
        if(next==='scene'){sceneId=saved.id||'daimiao';scenePoint=saved.point;sceneMode=saved.mode;}
      }
    }
    if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}
    document.body.classList.add('culture-open');

    dialog.querySelector('nav').innerHTML=sections.map(([key,label])=>`<button data-page="${key}" ${(page==='scene'?'scenes':page)===key?'aria-current="page"':''}>${label}</button>`).join('');
    dialog.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>open(b.dataset.page));
    body.innerHTML=title('一山千年 · 文化长卷','正在展开画卷')+'<p role="status">正在读取文化资料…</p>';
    try{cat=getCatalog() || await requestApi('catalog');if(token!==revision||!dialog.open)return;render(update);dialog.querySelector('.culture-close').focus();if(next==='spot'&&spot(currentSpot))recordVisit(currentSpot).catch(()=>{if(token===revision){const note=document.createElement('p');note.className='culture-note';note.textContent='足迹暂未保存，可稍后重新打开此景点。';body.append(note);}});}
    catch(error){if(token!==revision)return;body.innerHTML=title('文化资料','暂时未能展开')+`<p role="alert">${esc(error.message)}</p><button class="culture-primary" id="culture-retry">重新加载</button>`;body.querySelector('#culture-retry').onclick=()=>open(page,id,false);}
  }
  function syncLocation(push=true){
    const hash=cultureHash(page,{id:page==='spot'?currentSpot:page==='routes'?routeId:page==='poetry'?poemId:page==='scene'?sceneId:page==='study'?chapterId:null,line:poetryLine,panel:poetryPanel,chapter:chapterId,point:scenePoint,mode:sceneMode,variant:variantId,era,tab:spotTab,photo:photoIndex});
    if(hash!==location.hash)history[push?'pushState':'replaceState'](null,'',hash);
  }
  function render(push=true,preserveScroll=false){
    const scroll=preserveScroll?body.scrollTop:0;stopAudio();clearWidgets();
    if(page==='trail'||page==='study')widgets.push(mountRecords(body,{catalog:cat,page,chapterId,onSelect:(next,id)=>open(next,id),onSpot:id=>open('spot',id),onPoem:id=>open('poetry',id),onGuide:(id,question)=>{close(false);onGuide(id,true,question);}}));else if(page==='scenes')renderSceneDirectory(body,cat.scenes||[],id=>open('scene',id));else if(page==='scene')renderScenePage();else if(page==='routes')renderRoutes();else if(page==='history')renderHistory();else if(page==='poetry')renderPoetry();else if(page==='vision')renderVision();else renderSpot();
    syncLocation(push);
    body.querySelectorAll('[data-cultural-scene]').forEach(b=>b.onclick=()=>open('scene',b.dataset.culturalScene));
    body.querySelectorAll('[data-spot]').forEach(b=>b.onclick=()=>open('spot',b.dataset.spot));
    body.querySelectorAll('[data-poem]').forEach(b=>b.onclick=()=>open('poetry',b.dataset.poem));
    body.querySelectorAll('[data-ask]').forEach(b=>b.onclick=()=>{close(false);onGuide(b.dataset.ask,true);});
    body.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{const id=b.dataset.scene;close();onScene(id);});
    body.scrollTop=scroll;
  }
  function renderScenePage(){
    const scene=cat.scenes?.find(s=>s.id===sceneId);
    if(!scene){page='scenes';renderSceneDirectory(body,cat.scenes||[],id=>open('scene',id));return;}
    sceneView=mountCulturalScene(body,{scene:{...scene,related_names:Object.fromEntries(cat.spots.map(s=>[s.id,s.name+' ↗']))},initialPoint:scenePoint,initialMode:sceneMode,onMode:mode=>{sceneMode=mode;syncLocation();},
      onPoint:id=>{scenePoint=id;syncLocation();},onGuide:(id,question)=>{close(false);onGuide(id,true,question);},
      onSpot:id=>open('spot',id),onRoute:id=>open('routes',id),onDirectory:()=>open('scenes')});
    scenePoint=sceneView.pointId;
  }
  function renderRoutes(){
    const route=cat.routes.find(r=>r.id===routeId)||cat.routes[0];routeId=route.id;
    const variant=route.variants?.find(v=>v.id===variantId)||route.variants?.[0]||route;variantId=variant.id===route.id?'walk':variant.id;
    body.innerHTML=title('FOUR PATHS · 四径同归','登泰山 · 选路而行','古道、溪谷、山林与云海，循不同路径，读同一座泰山。')+`<div class="culture-routes">${cat.routes.map((r,i)=>`<button class="culture-route ${r.id===routeId?'selected':''}" data-route-card="${r.id}" aria-pressed="${r.id===routeId}"><img src="${sceneUrl(r.node_sequence[0])}" alt="${esc(r.name)}艺术化山水" loading="lazy"><span class="route-number">0${i+1}</span><span class="route-text"><strong>${esc(r.name)}</strong><small>${esc(r.type)}</small><span>${esc(r.tagline)}</span></span></button>`).join('')}</div><section class="culture-route-detail"><div><p class="culture-eyebrow">所选路线</p><h2>${esc(route.name)}</h2><p>${esc(route.description)}</p>${sources(route)}<button class="route-ask">带着此路线问仙子 ↗</button><button class="culture-primary" id="route-map">在长卷中标出此路线 →</button></div><div><div class="culture-tabs">${(route.variants||[]).map(v=>`<button data-variant="${v.id}" aria-pressed="${variant.id===v.id}">${esc(v.name)}</button>`).join('')}</div><ol class="culture-stops">${variant.node_sequence.map((id,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><button data-spot="${id}">${esc(spot(id)?.name)} ↗</button>${(variant.transport||[]).filter(t=>t.to===id).map(t=>`<small>${esc(t.label)}</small>`).join('')}</li>`).join('')}</ol><p class="culture-note">${esc(route.notes)}</p>${route.detours?.length?`<p>可另行探索的支线</p>${related(route.detours)}`:''}</div></section>`;
    body.querySelectorAll('[data-route-card]').forEach(b=>b.onclick=()=>{routeId=b.dataset.routeCard;variantId='walk';render(true,true);body.querySelector(`[data-route-card="${routeId}"]`).focus({preventScroll:true});});
    body.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>{variantId=b.dataset.variant;render(true,true);body.querySelector(`[data-variant="${variantId}"]`).focus({preventScroll:true});});
    body.querySelector('.route-ask').onclick=()=>{close(false);onGuide(null,true,route.name+'有哪些文化看点？',{route:route.id});};
    body.querySelector('#route-map').onclick=()=>{close();onRoute(routeId,variant.id);};
  }
  function renderHistory(){
    const groups={'先秦':['先秦'],'秦汉':['秦','汉'],'唐宋':['唐','宋'],'明清':['明清'],'近现代':['近现代']};
    const entries=cat.history.filter(h=>groups[era].includes(h.era));
    body.innerHTML=title('HISTORY IN THE MOUNTAIN · 文明长卷','泰山与中华文明','从古代礼制到诗文记忆，让每一次回望都有出处。')+`<div class="culture-eras" role="tablist" aria-label="历史朝代">${Object.keys(groups).map((e,i)=>`<button role="tab" id="era-${i}" aria-controls="era-content" aria-selected="${e===era}" tabindex="${e===era?0:-1}" data-era="${e}"><small>0${i+1}</small><strong>${e}</strong><span>${['山岳与文明','礼制与封禅','诗文与题刻','古迹与民俗','世界遗产'][i]}</span></button>`).join('')}</div><div class="culture-columns" id="era-content" role="tabpanel" aria-labelledby="era-${Object.keys(groups).indexOf(era)}"><div>${entries.map(e=>`<article class="culture-card"><span class="culture-tag">${esc(e.kind||'文献与遗产资料')}</span><p class="culture-note">${esc(e.era)} · ${esc(e.year)}</p><h2>${esc(e.title)}</h2><p>${esc(e.content)}</p>${related(e.spot_ids)}${sources(e)}</article>`).join('')||'<p>此时期暂无收录资料。</p>'}</div><figure class="culture-landscape"><img src="${artUrl('map-cover')}" alt="泰山山水意境画"><figcaption>山水为艺术化演绎 · 历史判断请对照左侧文献</figcaption><blockquote>山河未改<br>来者不同</blockquote></figure></div>`;
    const buttons=[...body.querySelectorAll('[data-era]')];
    buttons.forEach((b,i)=>{b.onclick=()=>{era=b.dataset.era;render();body.querySelector(`[data-era="${era}"]`).focus();};b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;era=buttons[n].dataset.era;render();body.querySelector(`[data-era="${era}"]`).focus();}};});
  }
  function renderSpot(){
    const s=spot(currentSpot);
    if(!s){currentSpot='';body.innerHTML=title('景点详情','选择一处山中风景')+related(cat.spots.map(s=>s.id));return;}
    const poems=cat.poems.filter(p=>p.spot_ids.includes(s.id)), events=cat.history.filter(h=>h.spot_ids.includes(s.id));
    photoIndex=Math.min(photoIndex,Math.max(0,(s.photos?.length||0)-1));
    const p=s.photos?.[photoIndex];
    const text=spotTab==='history'?`<h2>${esc(s.subtitle)}</h2><p>${esc(s.intro)}</p><p>${esc(s.interpretation)}</p>${sources(s)}${events.map(e=>`<h3>${esc(e.era)} · ${esc(e.title)}</h3><p>${esc(e.content)}</p>${sources(e)}`).join('')}`:spotTab==='poetry'?(poems.map(p=>`<h2>${esc(p.title)}</h2><p>${esc(p.author)} · ${esc(p.era)}</p><p class="culture-poem-excerpt">${esc(p.original_text)}</p><button data-poem="${p.id}">读诗与释义 →</button>`).join('')||'<p>当前资料中尚未收录与此处直接关联的诗词。</p>'):`<h2>${esc(s.category)} · 景观与空间</h2><p>${esc(s.interpretation)}</p><p class="culture-note">现有资料仅支持上述概述，更细的建筑测绘、年代与形制尚待补充核验。</p>${sources(s)}`;
    body.innerHTML=title('CULTURAL LANDMARK · 山中一处',esc(s.name),esc(s.subtitle))+`<div class="culture-columns"><div><figure class="culture-photo">${p?`<button class="culture-photo-zoom" aria-label="放大${esc(p.caption)}"><img src="${photoUrl(p)}" alt="${esc(p.caption)}"></button>`:`<img src="${sceneUrl(s.id)}" alt="${esc(s.name)}艺术化插画">`}<figcaption>${p?`${esc(p.caption)} · ${esc(p.author)} · <a href="${esc(p.source_page)}" target="_blank" rel="noopener noreferrer">${esc(p.license)} / 原图出处 ↗</a>`:'艺术化插画 · 此处暂未收录实景照片'}</figcaption></figure>${s.photos?.length>1?`<div class="culture-tabs" aria-label="景点图集">${s.photos.map((_,i)=>`<button data-photo="${i}" aria-pressed="${i===photoIndex}">实景 ${i+1}</button>`).join('')}</div>`:''}<div class="culture-tabs" aria-label="景点文化分类">${[['history','历史沿革'],['poetry','诗词典故'],['architecture','建筑与景观']].map(([key,label])=>`<button data-spot-tab="${key}" aria-pressed="${spotTab===key}">${label}</button>`).join('')}</div><article class="culture-card">${text}</article></div><aside class="culture-card culture-fold"><span class="culture-tag">入山见史</span><h2>从风景走向故事</h2><p>看一处山景，读一段历史。带着眼前的风景，向碧霞仙子继续提问。</p><button class="culture-primary" data-ask="${s.id}">请仙子讲解此处 →</button>${s.scene_id?`<button data-cultural-scene="${s.scene_id}">走入${esc(s.name)}文化场景 ↗</button>`:`<button data-scene="${s.id}">回到画卷定位 ↗</button>`}<button class="spot-favorite" disabled>读取收藏…</button><div class="spot-narration"></div>${chapterId?`<button class="study-return">← 返回文化游历章节</button>`:''}<h3>山中还有这些风景</h3>${related(cat.spots.filter(x=>x.id!==s.id).slice(0,5).map(x=>x.id))}<p class="culture-note">文化资料已附来源，专业史实与建筑细节仍待领域专家复核。</p></aside></div>`;
    widgets.push(mountFavorite(body.querySelector('.spot-favorite'),'spot',s.id));
    widgets.push(mountReadingAudio(body.querySelector('.spot-narration'),{text:s.name+'。'+s.intro+'。'+s.interpretation}));
    const studyReturn=body.querySelector('.study-return');if(studyReturn)studyReturn.onclick=()=>open('study',chapterId);
    const enlarge=body.querySelector('.culture-photo-zoom');
    if(enlarge)enlarge.onclick=()=>{
      const image=photoViewer.querySelector('img');image.src=photoUrl(p);image.alt=p.caption;
      photoViewer.querySelector('figcaption').innerHTML=`${esc(p.caption)} · ${esc(p.author)} · <a href="${esc(p.source_page)}" target="_blank" rel="noopener noreferrer">${esc(p.license)} / 原图出处 ↗</a>`;
      photoViewer.showModal();
    };
    body.querySelectorAll('[data-spot-tab]').forEach(b=>b.onclick=()=>{spotTab=b.dataset.spotTab;render(true,true);body.querySelector(`[data-spot-tab="${spotTab}"]`).focus({preventScroll:true});});
    body.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{photoIndex=Number(b.dataset.photo);render(true,true);body.querySelector(`[data-photo="${photoIndex}"]`).focus({preventScroll:true});});
  }
  function renderPoetry(){
    const p=cat.poems.find(p=>p.id===poemId)||cat.poems[0];
    if(!p){body.innerHTML=title('诗词文化','暂无收录诗词');return;}
    poemId=p.id;const lines=p.original_text.split('\n');poetryLine=Math.min(poetryLine,lines.length-1);
    body.innerHTML=title('POETRY · 诗词长廊','登高有诗 · 望岳有志')+`<div class="culture-tabs">${cat.poems.map(x=>`<button data-poem="${x.id}" aria-pressed="${x.id===poemId}">${esc(x.author)}《${esc(x.title)}》</button>`).join('')}</div><div class="culture-columns"><article class="culture-poetry"><span class="culture-tag">诗词长卷</span><h2>${esc(p.title)}</h2><p>${esc(p.era)} · ${esc(p.author)}</p><div class="poetry-narration"></div><div class="culture-lines">${lines.map((line,i)=>`<button data-line="${i}" aria-pressed="false">${esc(line)}</button>`).join('')}</div><p class="culture-note">点击诗句读释义；朗诵时按真实音频时间高亮。</p></article><div><img class="culture-poem-art" src="${sceneUrl(p.spot_ids.includes('riguan')?'riguan':p.spot_ids[0])}" alt="泰山诗词意境插画"><article class="culture-card poetry-note-card"><div class="culture-tabs" aria-label="诗词阅读方式"><button data-poetry-panel="note">诗句注释</button><button data-poetry-panel="analysis">意境赏析</button><button data-poetry-panel="author">诗人与作品</button></div><h2 id="poetry-heading"></h2><p id="poetry-meaning"></p><button class="poetry-return-line">↑ 回到当前诗句</button><p class="culture-note">${esc(p.note)} · 关联景点用于理解文学意象，并非精确游踪证明。</p>${related(p.spot_ids)}${sources(p)}<div class="culture-actions"><button class="poem-favorite" disabled>读取收藏…</button><button class="poem-ask">追问这首诗 ↗</button>${chapterId?'<button class="study-return">← 返回文化游历章节</button>':''}</div><a href="#trail">我的足迹与收藏 ↗</a></article></div></div>`;
    function showNote(){
      body.querySelectorAll('[data-line]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.line)===poetryLine)));
      body.querySelectorAll('[data-poetry-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.poetryPanel===poetryPanel)));
      body.querySelector('#poetry-heading').textContent=poetryPanel==='analysis'?p.reading_title:poetryPanel==='author'?p.author+' · '+p.era:lines[poetryLine];
      body.querySelector('#poetry-meaning').textContent=poetryPanel==='analysis'?p.interpretation:poetryPanel==='author'?p.author_note:p.annotations.find(a=>a.line===lines[poetryLine])?.meaning||'此句暂未收录独立注释，请参照全诗赏析。';
    }
    const player=mountReadingAudio(body.querySelector('.poetry-narration'),{poemId:p.id,onLine:i=>{poetryLine=i;body.querySelectorAll('[data-line]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.line)===i?'true':'false'));if(poetryPanel==='note')showNote();syncLocation(false);}});widgets.push(player);
    widgets.push(mountFavorite(body.querySelector('.poem-favorite'),'poem',p.id));
    body.querySelectorAll('[data-line]').forEach(b=>b.onclick=()=>{poetryLine=Number(b.dataset.line);poetryPanel='note';showNote();player.seekLine(poetryLine);syncLocation();if(innerWidth<768)body.querySelector('.poetry-note-card').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
    body.querySelectorAll('[data-poetry-panel]').forEach(b=>b.onclick=()=>{poetryPanel=b.dataset.poetryPanel;showNote();syncLocation();});
    body.querySelector('.poetry-return-line').onclick=()=>body.querySelector(`[data-line="${poetryLine}"]`).scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    body.querySelector('.poem-ask').onclick=()=>{close(false);onGuide(null,true,p.question,{poem:p.id});};
    const studyReturn=body.querySelector('.study-return');if(studyReturn)studyReturn.onclick=()=>open('study',chapterId);
    showNote();
  }
  function renderVision(){
    body.innerHTML=title('AI VISION · 观山识景','一拍识泰山','让镜头里的山石、门阙与题刻，成为读懂泰山的起点。')+`<div class="culture-columns"><section class="culture-upload"><span class="vision-mark" aria-hidden="true">◎</span><h2>上传您拍摄的泰山照片</h2><p>支持 JPG、PNG、WebP，最大 8 MB</p><label class="culture-file">选择照片<input id="vision-file" type="file" accept="image/jpeg,image/png,image/webp"></label><img id="vision-preview" alt="所选照片预览" hidden><p id="vision-file-name"></p><div class="culture-actions"><button class="culture-primary" id="vision-start" disabled>开始识景</button><button id="vision-cancel" hidden>停止请求</button></div><p class="culture-note">照片将提交至云端模型分析；本服务不保存原图，保留识别结果。发送至云端模型前，服务器会移除照片 EXIF 信息。</p></section><section class="culture-card"><span class="culture-tag">识景结果</span><div id="vision-result" aria-live="polite"><h2>等待一幅山中风景</h2><p>选取地标清晰的照片。模型返回候选后，请对照实景与判断依据确认。</p></div><button id="vision-browse">手动浏览全部景点 →</button></section></div>`;
    const input=body.querySelector('#vision-file'),preview=body.querySelector('#vision-preview'),start=body.querySelector('#vision-start'),cancel=body.querySelector('#vision-cancel'),result=body.querySelector('#vision-result');let file=null,run=0;
    body.querySelector('#vision-browse').onclick=()=>{currentSpot='';open('spot');};
    input.onchange=()=>{run++;controller?.abort();start.disabled=true;cancel.hidden=true;file=null;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}preview.removeAttribute('src');preview.hidden=true;body.querySelector('#vision-file-name').textContent='';result.innerHTML='<h2>等待一幅山中风景</h2><p>请选择照片后开始识景。</p>';const f=input.files[0];if(!f)return;
      if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024){result.innerHTML='<h2>照片无法使用</h2><p>请选择不超过 8 MB 的 JPG、PNG 或 WebP 照片。</p>';input.value='';return;}
      file=f;previewUrl=URL.createObjectURL(f);preview.src=previewUrl;preview.hidden=false;body.querySelector('#vision-file-name').textContent=f.name;start.disabled=false;result.innerHTML='<h2>照片已就绪</h2><p>点击“开始识景”，获取模型的真实分析。</p>';};
    cancel.onclick=()=>{run++;controller?.abort();controller=null;start.disabled=!file;cancel.hidden=true;result.innerHTML='<h2>已停止等待</h2><p>你可以重新识别。已发送至服务器的分析可能仍会完成。</p>';};
    start.onclick=async()=>{if(!file)return;const token=++run,rev=revision;controller=new AbortController();const activeController=controller,signal=activeController.signal,timer=setTimeout(()=>activeController.abort(),60000);start.disabled=true;cancel.hidden=false;result.innerHTML='<h2>正在识景…</h2><p role="status">正在上传照片并请求云端模型，请稍候。</p>';
      try{const form=new FormData();form.append('file',file);const reply=await requestApi('vision/recognize',{method:'POST',body:form,signal});if(token!==run||rev!==revision)return;
        result.innerHTML=`<h2>${reply.status==='unknown'?'暂时无法确认':'找到可能的景点'}</h2><p>${esc(reply.message)}</p><p class="culture-note">AI 生成 · ${esc(reply.model_version)} · 候选不代表准确率</p>${(reply.candidates||[]).map(c=>`<article class="vision-candidate">${spot(c.spot_id)?.photos?.[0]?`<img src="${photoUrl(spot(c.spot_id).photos[0])}" alt="${esc(c.name)}资料照片">`:''}<h3>${esc(c.name||spot(c.spot_id)?.name)}</h3><p>${esc(c.reason||'视觉相近，请人工核对')}</p><button data-confirm="${esc(c.spot_id)}">确认是这里，查看文化 →</button></article>`).join('')}`;
        result.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await requestApi(`vision/predictions/${encodeURIComponent(reply.request_id)}/confirm`,{method:'POST',body:JSON.stringify({spot_id:b.dataset.confirm})});if(rev===revision)open('spot',b.dataset.confirm);}catch(e){b.disabled=false;const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=e.message;b.after(p);}});
      }catch(e){if(token!==run||rev!==revision)return;result.innerHTML=`<h2>识景未完成</h2><p role="alert">${esc(e.name==='AbortError'?'等待超时，请稍后重试。':e.message)}</p>`;}finally{clearTimeout(timer);if(token===run&&rev===revision){start.disabled=!file;cancel.hidden=true;controller=null;if(innerWidth<768)result.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}};
  }
  addEventListener('hashchange',()=>{const saved=readCultureLocation(location.hash);if(saved)open(saved.page,saved.id,false);else{close(false);onLeaveGuide?.();}});
  return {open,close, get currentSpot(){return currentSpot;}};
}
