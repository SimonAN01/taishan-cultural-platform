// Cover the viewport without distorting the source art or exposing canvas edges.
export function fitPanorama(width,height,portrait,scale=1,x=0,y=0){
  const ratio=portrait?309/645:1211/749;
  const stageWidth=Math.max(width,height*ratio),stageHeight=stageWidth/ratio;
  const zoom=Math.max(1,Math.min(2.5,scale));
  const maxX=Math.max(0,(stageWidth*zoom-width)/2),maxY=Math.max(0,(stageHeight*zoom-height)/2);
  return {width:stageWidth,height:stageHeight,scale:zoom,x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))};
}
// Transform the whole stage so imagery, route paths and hotspots share coordinates.
export function installPanoramaControls({stage, viewport, places, catalog, openSpot, onRoutes}) {
  let scale=1, x=0, y=0, frame=0, moved=false, resetPosition=true;
  const pointers=new Map();let pinch=null;
  const toolbar=document.createElement('div');toolbar.className='panorama-controls';
  toolbar.innerHTML='<button aria-label="放大地图" data-zoom="in">＋</button><output aria-label="地图缩放">100%</output><button aria-label="缩小地图" data-zoom="out">−</button><button aria-label="复位地图" data-zoom="reset">复位</button>';
  document.querySelector('.home').append(toolbar);
  const movement=document.createElement('details');movement.className='panorama-movement';movement.innerHTML='<summary>方向控制 <span>↑↓←→</span></summary><p class="panorama-movement-hint"></p><div role="group" aria-label="地图方向控制"><button data-map-direction="ArrowUp" aria-label="向上浏览地图">↑</button><button data-map-direction="ArrowLeft" aria-label="向左浏览地图">←</button><button data-map-direction="ArrowDown" aria-label="向下浏览地图">↓</button><button data-map-direction="ArrowRight" aria-label="向右浏览地图">→</button></div>';document.querySelector('.home').append(movement);
  const moves={ArrowLeft:[70,0],ArrowRight:[-70,0],ArrowUp:[0,70],ArrowDown:[0,-70]};
  function moveMap(direction){x+=moves[direction][0];y+=moves[direction][1];apply();}
  movement.querySelectorAll('[data-map-direction]').forEach(button=>button.onclick=()=>moveMap(button.dataset.mapDirection));
  const search=document.createElement('form');search.className='panorama-search';search.setAttribute('role','search');
  search.innerHTML='<label class="sr-only" for="panorama-search-input">搜索泰山景点</label><input id="panorama-search-input" placeholder="搜索景点，如南天门" autocomplete="off"><button type="submit" aria-label="搜索景点">查找</button><div class="panorama-results" hidden></div>';
  document.querySelector('.home').append(search);
  const input=search.querySelector('input'),results=search.querySelector('.panorama-results');
  let items=catalog?.spots||[],directoryState=catalog?'ready':'loading';
  const feedback=document.createElement('p');feedback.className='panorama-search-status';feedback.setAttribute('role','status');search.append(feedback);
  function mapId(id){const local=id==='nantian'?'nantianmen':id;return places[local]&&stage.querySelector(`[data-place="${local}"]`)?.getClientRects().length?local:null;}
  const home=document.querySelector('.home');
  // A directory is independent of the illustration's finite set of art markers.
  // Every catalogue entry remains reachable, including places outside this painting.
  const discovery=document.createElement('div');discovery.className='map-discovery';
  discovery.innerHTML='<button type="button" data-map-directory>景点目录</button><button type="button" data-map-routes>登山路线</button>';
  home.append(discovery);
  const atlas=document.createElement('dialog');atlas.className='native-map-atlas';atlas.setAttribute('aria-labelledby','map-atlas-title');
  atlas.innerHTML='<header><div><p>一山千年 · 山中导览</p><h2 id="map-atlas-title">泰山全图</h2></div><button type="button" aria-label="关闭全图与景点目录">×</button></header><div class="map-atlas-scroll"><figure><img src="'+import.meta.env.BASE_URL+'design-assets/map-art-desktop-v2.webp" alt="泰山完整艺术全景，山顶、山脚和两侧群峰"><figcaption>艺术化画卷，景点位置为示意。下方目录涵盖全部已收录景点。</figcaption></figure><section aria-labelledby="map-directory-title"><h3 id="map-directory-title" tabindex="-1">全部景点</h3><p class="map-directory-count" role="status"></p><div class="map-directory-list"></div></section></div>';
  document.body.append(atlas);atlas.querySelector('header>button').onclick=()=>atlas.close();
  function openAtlas(directory=false){
    closeSearch();movement.open=false;atlas.classList.toggle('directory-first',directory);
    atlas.querySelector('h2').textContent=directory?'山中景点目录':'泰山全图';
    atlas.querySelector('.map-directory-count').textContent=directoryState==='ready'?'共 '+items.length+' 处 · 选择景点即可阅读资料':directoryState==='loading'?'正在读取完整景点目录…':'景点目录未能加载，请重新加载。';
    const list=atlas.querySelector('.map-directory-list');list.replaceChildren();
    items.forEach((item,index)=>{const row=document.createElement('article');row.dataset.spotId=item.id;
      const read=document.createElement('button');read.type='button';read.className='map-directory-read';
      const number=document.createElement('small');number.textContent=String(index+1).padStart(2,'0');const label=document.createElement('span');label.textContent=item.name;const hint=document.createElement('small');hint.textContent=item.category||item.subtitle||'景点文化';read.append(number,label,hint);read.onclick=()=>{atlas.close();openSpot(item.id);};row.append(read);
      // Only offer positioning when this exact illustration has a visible marker.
      if(mapId(item.id)){const position=document.createElement('button');position.type='button';position.className='map-directory-locate';position.textContent='定位';position.setAttribute('aria-label','在地图定位'+item.name);position.onclick=()=>{atlas.close();locate(item.id);};row.append(position);}list.append(row);
    });
    if(directoryState==='error'){const retry=document.createElement('button');retry.type='button';retry.className='map-directory-retry';retry.textContent='重新加载目录';retry.onclick=()=>location.reload();list.append(retry);}
    if(!atlas.open){atlas.showModal();atlas.querySelector('.map-atlas-scroll').scrollTop=0;(directory?atlas.querySelector('#map-directory-title'):atlas.querySelector('header>button')).focus({preventScroll:true});}
  }
  discovery.querySelector('[data-map-routes]').onclick=onRoutes;discovery.querySelector('[data-map-directory]').onclick=()=>openAtlas(false);
  function closeSearch(){home.classList.remove('is-searching');results.hidden=true;input.blur();}
  function locate(id){
    const local=mapId(id),node=local&&stage.querySelector(`[data-place="${local}"]`);if(!node)return;
    const box=node.getBoundingClientRect(),view=viewport.getBoundingClientRect(),next=Math.max(scale,1.6),ratio=next/scale;
    x=(x-(box.x+box.width/2-(view.x+view.width/2)))*ratio;y=(y-(box.y+box.height/2-(view.y+view.height/2)))*ratio;scale=next;apply();
    closeSearch();node.focus({preventScroll:true});stage.querySelectorAll('.is-located').forEach(e=>e.classList.remove('is-located'));node.classList.add('is-located');feedback.textContent='已定位'+places[local].name+'，点击地标可继续探索。';
  }
  function searchSpots(){
    const q=input.value.trim();home.classList.add('is-searching');results.hidden=false;feedback.textContent='';results.replaceChildren();
    const header=document.createElement('header');header.className='ref-search-heading';const heading=document.createElement('h2');heading.textContent=q?'搜索结果':'搜索山中景点';header.append(heading);const back=document.createElement('button');back.type='button';back.className='ref-search-back';back.textContent='返回地图';back.onclick=closeSearch;header.append(back);results.append(header);
    if(directoryState!=='ready'){heading.textContent=directoryState==='loading'?'正在读取景点资料…':'景点资料暂不可用';const p=document.createElement('p');p.textContent=directoryState==='loading'?'资料读取后，结果会自动展开。':'请稍后重新加载页面。';results.append(p);return;}
    if(!q){const p=document.createElement('p');p.textContent='输入景点名称，寻找你想去的山中一处。';results.append(p);recommend();return;}
    const found=items.filter(s=>(s.name+(s.subtitle||'')+(s.alias||[]).join('')).includes(q));heading.textContent=found.length?'搜索结果 · 共 '+found.length+' 个相关景点':'未找到相关景点';
    for(const item of found){const row=document.createElement('article');row.className='panorama-search-result';const image=document.createElement('img');const photo=item.photos?.[0];if(photo){image.src='/'+photo.url.replace(/^\//,'');image.alt=item.name+'实景';row.append(image);}const copy=document.createElement('div');const label=document.createElement('button');label.className='ref-search-name';label.type='button';label.textContent=item.name+' ›';label.onclick=()=>{closeSearch();openSpot(item.id);};copy.append(label);const p=document.createElement('p');p.textContent=item.subtitle||item.category||'山中文化景点';copy.append(p);const tag=document.createElement('small');tag.textContent=item.category||'景点文化';copy.append(tag);
      const actions=document.createElement('div');actions.className='ref-search-actions';if(mapId(item.id)){const b=document.createElement('button');b.type='button';b.textContent='定位'+item.name;b.onclick=()=>locate(item.id);actions.append(b);}const read=document.createElement('button');read.type='button';read.textContent='阅读'+item.name;read.onclick=()=>{closeSearch();openSpot(item.id);};actions.append(read);copy.append(actions);row.append(copy);results.append(row);
    }
    if(!found.length){const p=document.createElement('p');p.className='ref-search-empty';p.textContent='换个关键词试试～';results.append(p);recommend();}
    function recommend(){const card=document.createElement('section');card.className='ref-search-recommend';const title=document.createElement('h3');title.textContent='推荐搜索';card.append(title);for(const name of ['南天门','天街','玉皇顶','日观峰','碧霞祠','红门']){const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=()=>{input.value=name;searchSpots();};card.append(b);}results.append(card);}
  }
  const routeSummary=document.createElement('section');routeSummary.className='ref-map-route-summary';home.append(routeSummary);
  function showRoute(route,variant){closeSearch();home.classList.add('has-route');routeSummary.replaceChildren();const title=document.createElement('h2');title.textContent=route.name;const sequence=document.createElement('p');sequence.textContent=(variant?.node_sequence||route.node_sequence||[]).map(id=>items.find(s=>s.id===id)?.name||id).join(' → ');const edit=document.createElement('button');edit.type='button';edit.textContent='修改路线';edit.onclick=onRoutes;const cancel=document.createElement('button');cancel.type='button';cancel.className='ref-route-summary-cancel';cancel.textContent='取消路线';cancel.onclick=()=>home.classList.remove('has-route');routeSummary.append(title,sequence,edit,cancel);}
  input.onfocus=searchSpots;input.oninput=searchSpots;search.onsubmit=e=>{e.preventDefault();searchSpots();results.querySelector('button')?.focus();};search.onkeydown=e=>{if(e.key==='Escape'){closeSearch();}};
  function apply(){if(frame)return;frame=requestAnimationFrame(()=>{
    frame=0;const portrait=matchMedia('(max-width:767px)').matches;
    const fit=fitPanorama(viewport.clientWidth,viewport.clientHeight,portrait,scale,x,y);
    // Centre the mobile trail instead of anchoring the illustration's top edge;
    // top alignment hid the entire lower route on wide, short phone windows.
    if(resetPosition){fit.y=0;resetPosition=false;}
    ({scale,x,y}=fit);stage.style.setProperty('--map-width',fit.width+'px');stage.style.setProperty('--map-height',fit.height+'px');
    stage.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;
    stage.style.setProperty('--map-scale',scale);toolbar.querySelector('output').textContent=Math.round(scale*100)+'%';toolbar.dataset.zoomed=String(Math.abs(scale-1)>.01);
    const maxX=Math.max(0,(fit.width*scale-viewport.clientWidth)/2),maxY=Math.max(0,(fit.height*scale-viewport.clientHeight)/2);
    const blocked={ArrowLeft:x>=maxX-.5,ArrowRight:x<=-maxX+.5,ArrowUp:y>=maxY-.5,ArrowDown:y<=-maxY+.5};
    movement.querySelectorAll('[data-map-direction]').forEach(button=>button.disabled=blocked[button.dataset.mapDirection]);
    movement.querySelector('.panorama-movement-hint').textContent=maxX<1&&maxY<1?'全图已展开，放大后可移动。':'灰色方向表示已到画面边缘。';
    toolbar.querySelector('[data-zoom=in]').disabled=scale>=2.5;toolbar.querySelector('[data-zoom=out]').disabled=scale<=1;
  });}
  function zoom(value){scale=Math.max(1,Math.min(2.5,value));apply();}
  toolbar.querySelector('[data-zoom=in]').onclick=()=>zoom(scale+.2);
  toolbar.querySelector('[data-zoom=out]').onclick=()=>zoom(scale-.2);
  function reset(){scale=1;x=y=0;resetPosition=true;apply();}
  toolbar.querySelector('[data-zoom=reset]').onclick=reset;

  viewport.style.touchAction='none';viewport.tabIndex=0;viewport.setAttribute('aria-label','泰山地图，拖动、滚动或方向键平移，加减键或双指捏合缩放；Tab 键选择景点');
  viewport.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey)zoom(scale*Math.exp(-e.deltaY*.0015));else{x-=e.deltaX;y-=e.deltaY;apply();}},{passive:false});
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button')){moved=false;return;}stage.classList.add('is-dragging');viewport.focus({preventScroll:true});viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),scale};}});
  viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()];zoom(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance));moved=true;}else{x+=e.clientX-old.x;y+=e.clientY-old.y;moved=moved||Math.abs(e.clientX-old.x)+Math.abs(e.clientY-old.y)>2;apply();}});
  const end=e=>{pointers.delete(e.pointerId);pinch=null;if(!pointers.size)stage.classList.remove('is-dragging');};viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
  viewport.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
  home.addEventListener('keydown',e=>{if(e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(moves[e.key]){e.preventDefault();moveMap(e.key);}else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(scale+(e.key==='-'?-.2:.2));}});
  new ResizeObserver(apply).observe(viewport);apply();
  return {showRoute,closeSearch,openAtlas,setCatalog(value){items=value?.spots||[];directoryState=value?'ready':'error';discovery.querySelector('[data-map-directory]').textContent=value?'景点目录 · '+items.length:'景点目录';if(atlas.open)openAtlas(atlas.classList.contains('directory-first'));if(home.classList.contains('is-searching'))searchSpots();},reset};
}
