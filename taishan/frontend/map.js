import {$,esc} from './ui.js';
export function createMap(catalog,onSpot){
 const viewport=$('#map-viewport'),world=$('#map-world');let scale=1,x=0,y=0,drag=null,moved=false;
 $('#map-nodes').innerHTML=catalog.spots.filter(s=>s.map_visible!==false).map(s=>`<button class="map-node" data-map-spot="${s.id}" style="left:${s.map_x}%;top:${s.map_y}%" aria-label="查看${esc(s.name)}"><span class="dot" aria-hidden="true"></span><span class="label">${esc(s.name)}</span></button>`).join('');
 $('#map-nodes').addEventListener('click',e=>{const button=e.target.closest('[data-map-spot]');if(button&&!moved)onSpot(button.dataset.mapSpot)});
 function paint(){const extraX=world.clientWidth*(scale-1)/2,extraY=world.clientHeight*(scale-1)/2;x=Math.max(viewport.clientWidth-world.offsetLeft-world.clientWidth-extraX,Math.min(-world.offsetLeft+extraX,x));y=Math.max(viewport.clientHeight-world.offsetTop-world.clientHeight-extraY,Math.min(-world.offsetTop+extraY,y));world.style.transform=`translate(${x}px,${y}px) scale(${scale})`;$('#zoom-value').value=`${Math.round(scale*100)}%`;$('#zoom-out').disabled=scale<=1;$('#zoom-in').disabled=scale>=2.5}
 function zoom(delta){scale=Math.max(1,Math.min(2.5,scale+delta));if(scale===1){x=0;y=0}paint()}
 $('#zoom-in').onclick=()=>zoom(.25);$('#zoom-out').onclick=()=>zoom(-.25);$('#zoom-reset').onclick=()=>{scale=1;x=y=0;paint()};
 viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom(e.deltaY>0?-.1:.1)}},{passive:false});
 viewport.addEventListener('pointerdown',e=>{if(e.target.closest('.map-heading,.map-controls,.map-dock,button'))return;moved=false;drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x,y};if(e.pointerType==='mouse')viewport.setPointerCapture(e.pointerId)});
 viewport.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(Math.abs(dx)+Math.abs(dy)<8)return;if(e.pointerType==='touch'&&scale===1&&Math.abs(dy)>Math.abs(dx))return;moved=true;world.classList.add('dragging');x=drag.x+dx;y=drag.y+dy;paint()});
 for(const event of ['pointerup','pointercancel'])viewport.addEventListener(event,()=>{drag=null;world.classList.remove('dragging');setTimeout(()=>moved=false,0)});
 function route(r,selected=null){
  const byId=Object.fromEntries(catalog.spots.map(s=>[s.id,s]));
  const point=id=>`${byId[id].map_x},${byId[id].map_y}`;
  $('#route-lines').innerHTML=r.node_sequence.slice(1).map((id,i)=>{const from=r.node_sequence[i];const t=r.transport?.find(t=>t.from===from&&t.to===id);return `<polyline class="${t?'transport '+t.mode:'walk'}" points="${point(from)} ${point(id)}"><title>${esc(t?.label??'步行文化线路示意')}</title></polyline>`}).join('')+r.detours.map(id=>{const from=id==='jingshi'?'doumu':'yuhuang';return `<polyline class="detour" points="${point(from)} ${point(id)}"/>`}).join('');
  document.querySelectorAll('[data-map-spot]').forEach(b=>{b.classList.toggle('active',b.dataset.mapSpot===selected);b.classList.toggle('secondary',!r.node_sequence.includes(b.dataset.mapSpot)&&!r.detours.includes(b.dataset.mapSpot));b.setAttribute('aria-pressed',String(b.dataset.mapSpot===selected))});
 }
 new ResizeObserver(paint).observe(viewport);
 paint();return {route,reset:()=>{scale=1;x=y=0;paint()}};
}
