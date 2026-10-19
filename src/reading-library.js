import {mountReadingAudio} from './cultural-audio.js';
import {artUrl} from './art-gallery.js';
import {uiIcon,navMarkup,brandMarkup,toolsMarkup} from './ui-chrome.js';
import {readCultureLocation} from './culture-location.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoUrl=p=>'/'+p.url.replace(/^\//,'');
const choices=[['history','历史长卷','一座山，承载千年中国史','H-ND-01'],['poetry','诗词之山','千古名句，咏叹泰山气象','riguan-landscape'],['spot','景点文化','名胜古迹，山中人文胜景','nantian-front'],['museum','石刻文博','一方石刻，见证千年文明','stone-landscape'],['gallery','山水图集','丹青画卷，收藏泰山四时','H-ND-21-bg']];
export function renderLibrary(host,onOpen){
  let last=null;try{last=JSON.parse(localStorage.getItem('taishan-last-reading'));}catch{}
  const saved=last&&readCultureLocation(last.hash);
  const asset=name=>import.meta.env.BASE_URL+'design-assets/'+name+'.webp';
  host.innerHTML=`<header class="ref-reading-hero"><h1 id="culture-title">把泰山，<em>读</em>成一本书。</h1><p>在山的历史、诗意与人文中，遇见更辽阔的中国。</p></header><div class="ref-reading-cards">${choices.map(([id,name,note],i)=>`<button data-library="${id}" aria-label="${name}：${note}"><img src="${asset('read-art-'+i)}" alt="${name}画境" draggable="false"><span class="native-read-copy"><strong>${name}</strong><small>${note}</small></span><i aria-hidden="true">›</i></button>`).join('')}</div><section class="ref-reading-continue"><button class="ref-continue-button" aria-label="继续阅读${esc(saved?last.title:'泰山的起源与信仰')}">${uiIcon('read')}<span><small>继续阅读</small><strong>${esc(saved?last.title:'泰山的起源与信仰')}</strong><span>从东岳信仰到五岳之首，走进泰山的精神脉络。</span></span><b>继续阅读 ${uiIcon('arrow')}</b></button></section>`;
  host.querySelectorAll('[data-library]').forEach(b=>b.onclick=()=>onOpen(b.dataset.library));
  host.querySelector('.ref-continue-button').onclick=()=>{if(saved){location.hash=last.hash;}else onOpen('history');};
}

export function mountGallery(host,catalog,{initialCategory,onChange=()=>{}}={}){
  let category=initialCategory==='实景'?'实景':'画境',current=0;
  const photos=catalog.spots.flatMap(s=>(s.photos||[]).map(p=>({id:p.id,name:s.name+' · '+p.caption,url:photoUrl(p),category:'实景',caption:`${p.author} · ${p.license} · ${p.caption}`})));

  const design=[['南天门','建筑'],['云海','山水'],['红门','建筑'],['古松','点景'],['溪石','山水']].map(([name,category],i)=>({id:'word-gallery-'+i,name,category,url:import.meta.env.BASE_URL+'design-assets/gallery-art-'+i+'.webp',caption:'用户提供 UI 设计稿中的艺术画境',design:true}));
  let visible=design;
  host.innerHTML=`<header class="ui-gallery-hero"><h1 id="culture-title" >山水之间，<em>皆有回响</em></h1><p>在泰山的山水画卷中，遇见千年的风景与故事。</p><div class="culture-tabs ui-gallery-filters">${[['画境','山水画境'],['实景','景点实景']].map(([id,label])=>`<button data-gallery-filter="${id}" aria-label="筛选${label}" aria-pressed="${id===category}">${label}</button>`).join('')}</div></header><p class="culture-note gallery-count" role="status"></p><div class="ui-gallery-grid"></div>`;
  const viewer=document.createElement('dialog');viewer.className='ui-image-viewer';viewer.setAttribute('aria-label','山水大图');viewer.innerHTML=`<header class="ui-header ref-viewer-header">${brandMarkup}${navMarkup('gallery')}${toolsMarkup}</header><div class="ui-image-canvas"><img alt=""></div><button class="ref-viewer-close" aria-label="关闭大图">×</button><div class="ref-viewer-caption"><h2></h2><p></p></div><button data-viewer-prev aria-label="上一幅">‹</button><button data-viewer-next aria-label="下一幅">›</button><footer><button data-viewer-zoom aria-label="放大图片" aria-pressed="false">＋</button><button data-viewer-out aria-label="缩小图片">−</button><button data-viewer-reset>⟳ 重置</button><p class="sr-only"></p></footer>`;document.body.append(viewer);
  const viewerImage=viewer.querySelector('.ui-image-canvas img');viewerImage.onerror=()=>viewer.classList.add('has-image-error');viewerImage.onload=()=>viewer.classList.remove('has-image-error');const retry=document.createElement('button');retry.className='ref-image-retry';retry.textContent='重新加载';retry.onclick=()=>{const url=new URL(viewerImage.src,location.href);url.searchParams.set('retry',Date.now());viewerImage.src=url.href;};viewer.querySelector('.ui-image-canvas').append(retry);
  let viewerZoom=1;
  function applyZoom(value){viewerZoom=Math.max(1,Math.min(2.5,value));viewer.style.setProperty('--viewer-zoom',viewerZoom);viewer.classList.toggle('is-zoomed',viewerZoom>1);viewer.querySelector('[data-viewer-zoom]').setAttribute('aria-pressed',String(viewerZoom>1));viewer.querySelector('[data-viewer-out]').disabled=viewerZoom===1;}
  function show(index){current=(index+visible.length)%visible.length;const i=visible[current];viewer.querySelector('h2').textContent=i.name;const img=viewer.querySelector('.ui-image-canvas img');img.src=i.url;img.alt=i.name;viewer.querySelector('.ref-viewer-caption p').textContent=i.caption;viewer.querySelector('footer p').textContent=`${current+1} / ${visible.length} · ${i.caption}`;applyZoom(1);if(!viewer.open)viewer.showModal();}
  viewer.querySelector('.ref-viewer-close').onclick=()=>viewer.close();viewer.querySelector('header').addEventListener('click',e=>{if(e.target.closest('a,button'))viewer.close();});viewer.querySelector('[data-viewer-prev]').onclick=()=>show(current-1);viewer.querySelector('[data-viewer-next]').onclick=()=>show(current+1);
  viewer.querySelector('[data-viewer-zoom]').onclick=()=>applyZoom(viewerZoom===1?1.6:viewerZoom+.4);viewer.querySelector('[data-viewer-out]').onclick=()=>applyZoom(viewerZoom<=1.6?1:viewerZoom-.4);viewer.querySelector('[data-viewer-reset]').onclick=()=>applyZoom(1);
  viewer.addEventListener('keydown',e=>{if(e.altKey||e.metaKey||e.ctrlKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1));});viewer.onclick=e=>{if(e.target===viewer)viewer.close();};
  function render(){
    visible=category==='画境'?design:photos;
    host.dataset.galleryFilter=category;
    host.querySelector('.gallery-count').textContent=`${visible.length} 幅${category==='实景'?'署名实景照片':'山水画面'} · 点击查看大图与来源说明`;
    const captions=['云上天门，直通岱顶。','云涌成海，山峦浮沉。','千年古道，万丈雄心。','苍松迎客，岁月长青。','山泉清冷，石上听声。'];
    const card=(i,n)=>i.design?`<div class="ref-gallery-card native-gallery-card"><button data-gallery-item="${n}" aria-label="放大${esc(i.name)}画境"><picture><img src="${i.url}" alt="${esc(i.name)}" loading="lazy"></picture><span class="native-gallery-caption"><strong>${esc(i.name)}</strong><small>${captions[Number(i.id.replace('word-gallery-',''))]}</small></span></button>${i.id==='word-gallery-0'?`<button class="ref-gallery-go" data-gallery-spot="nantian" aria-label="前往南天门景点">${uiIcon('pin')}前往景点</button>`:''}</div>`:`<button data-gallery-item="${n}"><img src="${i.url}" alt="${esc(i.name)}" loading="lazy"><span><strong>${esc(i.name)}</strong><small>${i.category==='实景'?'实景照片':'艺术画境'} ${uiIcon('search')}</small></span></button>`;
    host.querySelector('.ui-gallery-grid').innerHTML=category==='画境'?`<div class="ref-gallery-collection">${visible.map(card).join('')}</div>`:visible.map(card).join('');
    if(!visible.length)host.querySelector('.ui-gallery-grid').innerHTML='<p class="native-gallery-empty">这个分类暂未收录画面，可以切换其他分类。</p>';
    host.querySelectorAll('[data-gallery-item]').forEach(b=>b.onclick=()=>show(Number(b.dataset.galleryItem)));host.querySelectorAll('[data-gallery-spot]').forEach(b=>b.onclick=()=>{location.hash='#spot?id='+b.dataset.gallerySpot;});
    host.querySelectorAll('[data-gallery-filter]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.galleryFilter===category));b.onclick=()=>{category=b.dataset.galleryFilter;render();onChange(category);};});
  }
  host.querySelectorAll('[data-gallery-filter]').forEach(b=>b.onclick=()=>{category=b.dataset.galleryFilter;render();onChange(category);});render();
  return {destroy(){viewer.close();viewer.remove();}};
}

export function renderMuseum(host,catalog,onSpot,{initialId,initialMode,initialPhoto=0,onChange=()=>{}}={}){
  const entries=[['jingshi','经石峪'],['daguan','纪泰山铭'],['zhongtian','泰山门阙建筑'],['daimiao','岱庙石刻'],['riguan','日观峰题刻'],['yuhuang','五岳独尊'],['bixia','碧霞祠碑刻']].filter(([id])=>catalog.spots.find(s=>s.id===id)?.photos?.length);
  let selected=entries.some(([id])=>id===initialId)?initialId:entries[0]?.[0],mode=['text','listen'].includes(initialMode)?initialMode:'original',index=initialPhoto,zoom=1,audioWidget=null;
  if(!selected){host.innerHTML='<h1 id="culture-title">石刻文博</h1><p>暂无收录实景图像，请稍后再来。</p>';return{destroy(){}};}
  function render(){
    audioWidget?.destroy();audioWidget=null;
    const place=catalog.spots.find(s=>s.id===selected),artifact=catalog.artifacts.find(a=>a.spot_id===selected),title=artifact?.name||place.name,sources=artifact?.sources||place.sources||[];
    const pictures=(place.photos||[]).map(p=>({url:photoUrl(p),caption:p.caption,credit:p.author+' · '+p.license,source:p.source_page}));


    index=Math.max(0,Math.min(index,pictures.length-1));
    const nav=entries.map(([id,label])=>`<button data-museum-place="${id}" ${id===selected?'aria-current="page"':''}>${label}</button>`).join('');
    host.innerHTML=`<h1 id="culture-title" class="sr-only">石刻文博 · ${esc(title)}</h1><header class="ref-museum-mobile-title"><strong>石刻文博</strong><span>⌖ ${esc(place.name)}</span><details><summary aria-label="选择石刻文博条目">切换条目 ⌄</summary><div>${nav}</div></details></header><div class="ref-museum-layout"><nav class="ref-museum-nav" aria-label="石刻文博"><h2>石刻文博</h2>${nav}</nav><figure class="ref-museum-figure"><div class="ref-museum-canvas"><img class="ref-museum-main" alt=""><div class="ref-museum-zoom"><button data-museum-zoom="out" aria-label="缩小石刻图像">−</button><output>100%</output><button data-museum-zoom="in" aria-label="放大石刻图像">＋</button><button data-museum-fullscreen aria-label="全屏查看石刻图像">⛶</button></div></div><figcaption></figcaption><div class="ref-museum-thumbs"><button data-museum-prev aria-label="上一幅石刻图像">‹</button><div>${pictures.map((p,i)=>`<button data-museum-thumb="${i}" aria-label="图像 ${i+1}：${esc(p.caption)}"><img src="${p.url}" alt="${esc(p.caption)}"></button>`).join('')}</div><button data-museum-next aria-label="下一幅石刻图像">›</button></div></figure><aside class="ref-museum-inspector"><div class="ref-museum-tabs" role="tablist" aria-label="石刻查看方式">${[['original','看原貌'],['text','文化导读'],['listen','听讲解']].map(([id,label])=>`<button data-museum-mode="${id}" role="tab" aria-selected="${mode===id}">${label}</button>`).join('')}</div><article class="ref-museum-content"><p class="culture-tag">${esc(artifact?.subtitle||place.subtitle)}</p><h2>${esc(title)}</h2><section class="museum-mode-panel" data-museum-panel="original"><h3>实景与图像</h3><p>${esc(place.reading?.observe||place.intro)}</p><p>下方为已收录的景点实景照片，可切换、放大并查看来源。</p></section><section class="museum-mode-panel" data-museum-panel="text"><h3>释读与文化背景</h3><p>${esc(artifact?.content||place.intro)}</p><p>${esc(place.interpretation)}</p><p>${esc(place.reading?.meaning||'')}</p><p class="culture-note">当前资料为文化导读，尚未收录完整碑刻逐字释文与文物测绘。</p></section><section class="museum-mode-panel" data-museum-panel="listen"><h3>听这处文化的讲解</h3><p>点击播放，合成并播放当前条目的讲解音频。</p><div class="ref-museum-audio"></div></section><h3>资料来源</h3>${sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)} · ${esc(s.title)} ↗</a></p>`).join('')}<button class="ref-museum-visit">走近${esc(place.name)} →</button><p class="museum-operation-status" role="status"></p></article></aside></div>`;
    const figure=host.querySelector('.ref-museum-figure'),image=host.querySelector('.ref-museum-main');
    function select(i){
      index=(i+pictures.length)%pictures.length;zoom=1;const p=pictures[index];figure.dataset.index=String(index);figure.dataset.zoomed='false';image.style.transform='none';image.src=p.url;image.alt=p.caption;
      host.querySelector('.ref-museum-figure>figcaption').innerHTML=esc(p.caption)+' · '+esc(p.credit)+(p.source?` · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">原图出处 ↗</a>`:'');
      host.querySelectorAll('[data-museum-thumb]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.museumThumb)===index)));host.querySelector('.ref-museum-zoom output').textContent='100%';onChange(selected,mode,index);
    }
    host.querySelectorAll('[data-museum-place]').forEach(b=>b.onclick=()=>{selected=b.dataset.museumPlace;index=0;zoom=1;render();});
    host.querySelectorAll('[data-museum-thumb]').forEach(b=>b.onclick=()=>select(Number(b.dataset.museumThumb)));host.querySelector('[data-museum-prev]').onclick=()=>select(index-1);host.querySelector('[data-museum-next]').onclick=()=>select(index+1);host.querySelector('[data-museum-prev]').disabled=host.querySelector('[data-museum-next]').disabled=pictures.length<2;
    host.querySelectorAll('[data-museum-zoom]').forEach(b=>b.onclick=()=>{zoom=Math.max(1,Math.min(2.5,zoom+(b.dataset.museumZoom==='in'?.6:-.6)));figure.dataset.zoomed=String(zoom>1);image.style.transform=`scale(${zoom})`;host.querySelector('.ref-museum-zoom output').textContent=Math.round(zoom*100)+'%';});
    host.querySelector('[data-museum-fullscreen]').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(figure.requestFullscreen)await figure.requestFullscreen();else throw new Error('此浏览器不支持全屏，可使用放大按钮');}catch(error){host.querySelector('.museum-operation-status').textContent=error.message;}};
    function setMode(next){mode=next;host.querySelector('.ref-museum-inspector').dataset.mode=next;host.querySelectorAll('[data-museum-mode]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.museumMode===next));b.tabIndex=b.dataset.museumMode===next?0:-1;});host.querySelectorAll('[data-museum-panel]').forEach(p=>p.hidden=p.dataset.museumPanel!==next);audioWidget?.destroy();audioWidget=null;host.querySelector('.ref-museum-audio').replaceChildren();if(next==='listen')audioWidget=mountReadingAudio(host.querySelector('.ref-museum-audio'),{text:(artifact?.content||place.intro)+'。'+place.interpretation});onChange(selected,mode,index);}
    const tabs=[...host.querySelectorAll('[data-museum-mode]')];tabs.forEach((b,i)=>{b.onclick=()=>setMode(b.dataset.museumMode);b.onkeydown=e=>{if(e.altKey||e.metaKey||e.ctrlKey||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;setMode(tabs[n].dataset.museumMode);tabs[n].focus({preventScroll:true});};});host.querySelector('.ref-museum-visit').onclick=()=>onSpot(place.id);select(index);setMode(mode);
  }
  render();return{destroy(){audioWidget?.destroy();}};
}
