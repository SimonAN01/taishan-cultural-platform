// Transform the whole stage so imagery, route paths and hotspots share coordinates.
export function installPanoramaControls({stage, viewport, places, catalog, openSpot, openScene}) {
  let scale=1, x=0, y=0, frame=0, moved=false;
  const pointers=new Map();let pinch=null;
  const toolbar=document.createElement('div');toolbar.className='panorama-controls';
  toolbar.innerHTML='<button aria-label="放大地图" data-zoom="in">＋</button><output aria-label="地图缩放">100%</output><button aria-label="缩小地图" data-zoom="out">−</button><button aria-label="复位地图" data-zoom="reset">复位</button><button id="route-layer-toggle" aria-pressed="true">路线</button>';
  document.querySelector('.home').append(toolbar);
  const search=document.createElement('form');search.className='panorama-search';search.setAttribute('role','search');
  search.innerHTML='<label class="sr-only" for="panorama-search-input">搜索泰山景点</label><input id="panorama-search-input" placeholder="搜索景点，如南天门" autocomplete="off"><button type="submit" aria-label="搜索景点">查找</button><div class="panorama-results" hidden></div>';
  document.querySelector('.home').append(search);
  const input=search.querySelector('input'),results=search.querySelector('.panorama-results');
  let items=catalog?.spots||Object.entries(places).map(([id,p])=>({id,name:p.name,subtitle:p.tag}));
  const feedback=document.createElement('p');feedback.className='panorama-search-status';feedback.setAttribute('role','status');search.append(feedback);
  function mapId(id){const local=id==='nantian'?'nantianmen':id;return places[local]?local:null;}
  function locate(id){
    const local=mapId(id),node=local&&stage.querySelector(`[data-place="${local}"]`);if(!node)return;
    const box=node.getBoundingClientRect(),view=viewport.getBoundingClientRect(),next=Math.max(scale,1.6),ratio=next/scale;
    x=(x-(box.x+box.width/2-(view.x+view.width/2)))*ratio;y=(y-(box.y+box.height/2-(view.y+view.height/2)))*ratio;scale=next;apply();
    results.hidden=true;node.focus({preventScroll:true});feedback.textContent='已定位'+places[local].name+'，点击地标可继续探索。';
  }
  function searchSpots(){
    const q=input.value.trim();results.hidden=!q;feedback.textContent='';if(!q)return;results.replaceChildren();
    const found=items.filter(s=>(s.name+(s.subtitle||'')+(s.alias||[]).join('')).includes(q));
    for(const s of found){const row=document.createElement('div');row.className='panorama-search-result';const label=document.createElement('strong');label.textContent=s.name;row.append(label);
      if(mapId(s.id)){const b=document.createElement('button');b.type='button';b.textContent='定位'+s.name;b.onclick=()=>locate(s.id);row.append(b);}
      const read=document.createElement('button');read.type='button';read.textContent='阅读'+s.name;read.onclick=()=>{results.hidden=true;openSpot(s.id);};row.append(read);results.append(row);
    }
    if(!found.length){const p=document.createElement('p');p.textContent='未找到景点，试试“红门”或“玉皇顶”。';results.append(p);}
  }
  input.oninput=searchSpots;search.onsubmit=e=>{e.preventDefault();searchSpots();results.querySelector('button')?.focus();};search.onkeydown=e=>{if(e.key==='Escape'){results.hidden=true;input.focus();}};
  function apply(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const maxX=stage.clientWidth*Math.max(.25,scale-.65)/2,maxY=stage.clientHeight*Math.max(.25,scale-.65)/2;x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));stage.style.transform=`translate(${x}px,${y}px) scale(${scale})`;stage.style.setProperty('--map-scale',scale);toolbar.querySelector('output').textContent=Math.round(scale*100)+'%';toolbar.querySelector('[data-zoom=in]').disabled=scale>=2.5;toolbar.querySelector('[data-zoom=out]').disabled=scale<=.8;});}
  function zoom(value){scale=Math.max(.8,Math.min(2.5,value));apply();}
  toolbar.querySelector('[data-zoom=in]').onclick=()=>zoom(scale+.2);
  toolbar.querySelector('[data-zoom=out]').onclick=()=>zoom(scale-.2);
  toolbar.querySelector('[data-zoom=reset]').onclick=()=>{scale=1;x=y=0;apply();};
  toolbar.querySelector('#route-layer-toggle').onclick=e=>{const shown=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',shown);document.querySelector('.paths').toggleAttribute('hidden',!shown);};
  viewport.style.touchAction='none';viewport.tabIndex=0;viewport.setAttribute('aria-label','泰山地图，方向键平移，加减键缩放；Tab 键选择景点');
  viewport.addEventListener('wheel',e=>{e.preventDefault();zoom(scale*Math.exp(-e.deltaY*.0015));},{passive:false});
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button')){moved=false;return;}viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),scale};}});
  viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()];zoom(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance));moved=true;}else{x+=e.clientX-old.x;y+=e.clientY-old.y;moved=moved||Math.abs(e.clientX-old.x)+Math.abs(e.clientY-old.y)>2;apply();}});
  const end=e=>{pointers.delete(e.pointerId);pinch=null;};viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
  viewport.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
  viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const moves={ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]};if(moves[e.key]){e.preventDefault();x+=moves[e.key][0];y+=moves[e.key][1];apply();}else if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(scale+(e.key==='-'?-.2:.2));}});
  return {setCatalog(value){items=value.spots;},reset(){scale=1;x=y=0;apply();}};
}
