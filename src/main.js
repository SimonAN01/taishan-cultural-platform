import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapters, places, route, routeSource, checkedAt } from './data.js';
import { journeyState, chapterProgress, focusAt } from './journey.js';
import './style.css';

gsap.registerPlugin(ScrollTrigger);

const A='/assets/';
const assets={
  'mountains-far':'mountains-far.webp','mountains-main':'mountains-main.webp','taishan-ridge':'mountains-main.webp',
  'arch':'arch.webp','hongmen':'arch.webp','eighteen-bends':'stairs-study.webp','stairs-study':'stairs-study.webp',
  'nantianmen':'nantianmen.webp','bixia':'temple-study.webp','yuhuang':'temple-study.webp','stone':'stone.webp',
  'foreground-rock':'stone.webp','cloud-far':'cloud-far.webp','cloud-mid':'cloud-mid.webp','cloud-near':'cloud-near.webp',
  'pine-left':'pine-left.webp','pine-right':'pine-right.webp'
};

const app=document.querySelector('#app');
app.innerHTML=`
  <div class="experience" id="journey">
    <div class="sky" aria-hidden="true"><span class="sun"></span><span class="grain"></span></div>
    <canvas id="scene" aria-hidden="true"></canvas>
    <div class="loading" role="status"><span class="seal">岱</span><p>山水徐徐展开</p><i></i></div>
    <header class="topbar">
      <button class="brand" data-jump="0" aria-label="回到山前"><span class="brand-seal">岱</span><span><b>岱宗入画</b><small>TAISHAN · SHANDONG</small></span></button>
      <div class="top-actions">
        <button class="motion-toggle" aria-pressed="false"><span></span>简化动效</button>
        <button class="route-open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18c4-8 10-3 14-12M6 7h.01M18 18h.01"/></svg>登山路线</button>
      </div>
    </header>
    <nav class="chapter-nav" aria-label="游览章节">
      ${chapters.map((c,i)=>`<button data-jump="${i}" aria-label="前往${c.name}"><i></i><span>${String(i+1).padStart(2,'0')}</span><b>${c.short}</b></button>`).join('')}
    </nav>
    <div class="readout" aria-hidden="true"><span class="altitude">0000</span><small>旅程进度</small><i></i></div>
    <main class="copy-layer">
      ${chapters.map((c,i)=>`<section class="chapter-copy ${i===0?'is-active':''}" data-chapter="${i}" aria-labelledby="title-${c.id}">
        <div class="eyebrow"><i></i><span>${String(i+1).padStart(2,'0')} · ${c.en}</span></div>
        <h1 id="title-${c.id}">${c.title.map((line,j)=>`<span class="title-line ${j?'offset':''}">${line}</span>`).join('')}</h1>
        <p class="subtitle">${c.subtitle}</p><p class="body-copy">${c.body}</p>
        ${c.places.length?`<div class="place-actions">${c.places.map(k=>`<button data-place="${k}"><span>${places[k].name}</span><small>${places[k].tag}</small><i>↗</i></button>`).join('')}</div>`:''}
        <blockquote><p>${c.poem}</p><cite>${c.label}</cite></blockquote>
        <img class="static-poster" src="${A}${assets[c.layers.find(x=>!x.asset.includes('cloud')&&!x.asset.includes('pine'))?.asset]||'mountains-far.webp'}" alt="${c.name}艺术化场景">
      </section>`).join('')}
    </main>
    <div class="scroll-hint"><span></span><p>${chapters[0].hint}</p></div>
    <div class="scene-note">青绿山水艺术化演绎 · 地标资料据泰山景区公开信息核对</div>
    <div class="summit-finale" aria-hidden="true"><button class="replay" data-jump="0">↺&nbsp; 再游一次</button></div>
  </div>
  <div class="spacer" aria-hidden="true">${chapters.map(c=>`<div id="chapter-${c.id}"></div>`).join('')}</div>
  <div class="scrim"></div>
  <aside class="drawer place-drawer" aria-hidden="true" aria-label="景点介绍">
    <button class="drawer-close" aria-label="关闭介绍">×</button><div class="drawer-scroll">
      <p class="drawer-index"></p><h2></h2><p class="drawer-tag"></p><div class="drawer-rule"></div>
      <p class="drawer-text"></p><p class="drawer-detail"></p><figure><img alt=""><figcaption>画面为艺术化演绎，地标信息以官方资料为依据。</figcaption></figure>
      <a class="source-link" target="_blank" rel="noreferrer">查看官方资料 <span>↗</span></a><p class="verified">资料核对于 ${checkedAt}</p>
    </div>
  </aside>
  <aside class="drawer route-drawer" aria-hidden="true" aria-label="经典登山路线">
    <button class="drawer-close" aria-label="关闭路线">×</button><div class="drawer-scroll"><p class="drawer-index">THE CLASSIC ROUTE</p><h2>红门古道</h2><p class="drawer-tag">从山麓至极顶 · 路线示意</p>
      <div class="route-list">${route.map((k,i)=>`<button data-route-place="${k}"><span>${String(i+1).padStart(2,'0')}</span><i></i><div><b>${places[k].name}</b><small>${places[k].tag}</small></div></button>`).join('')}</div>
      <p class="route-notice">此路线仅表现景点先后关系，并非导航地图。开放时间、交通与索道安排请查看景区当日公告。</p>
      <a class="source-link" href="${routeSource}" target="_blank" rel="noreferrer">查看官方路线介绍 <span>↗</span></a>
    </div>
  </aside>
`;

const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let simpleMotion=reduced.matches;
const mobile=()=>window.innerWidth<700;
const loading=document.querySelector('.loading');
const copies=[...document.querySelectorAll('.chapter-copy')];
const nav=[...document.querySelectorAll('.chapter-nav button')];
const hint=document.querySelector('.scroll-hint p');
const altitude=document.querySelector('.altitude');
const root=document.documentElement;
let current=0, lastProgress=0, targetMouse={x:0,y:0}, smoothMouse={x:0,y:0};

function jumpTo(i){
  const y=chapterProgress(i,chapters.length)*(document.documentElement.scrollHeight-window.innerHeight);
  window.scrollTo({top:y,behavior:simpleMotion?'auto':'smooth'});
}
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>jumpTo(+b.dataset.jump)));

const motionButton=document.querySelector('.motion-toggle');
function setMotion(value){simpleMotion=value;motionButton.setAttribute('aria-pressed',String(value));document.body.classList.toggle('simple-motion',value);}
setMotion(simpleMotion);motionButton.addEventListener('click',()=>setMotion(!simpleMotion));

function drawer(openSelector){
  document.querySelectorAll('.drawer').forEach(x=>{x.classList.remove('open');x.setAttribute('aria-hidden','true')});
  const el=document.querySelector(openSelector);if(el){el.classList.add('open');el.setAttribute('aria-hidden','false');document.querySelector('.scrim').classList.add('open');el.querySelector('.drawer-close').focus();document.body.classList.add('drawer-open');}
}
function closeDrawer(){document.querySelectorAll('.drawer').forEach(x=>{x.classList.remove('open');x.setAttribute('aria-hidden','true')});document.querySelector('.scrim').classList.remove('open');document.body.classList.remove('drawer-open');}
document.querySelectorAll('.drawer-close').forEach(b=>b.addEventListener('click',closeDrawer));
document.querySelector('.scrim').addEventListener('click',closeDrawer);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
document.querySelector('.route-open').addEventListener('click',()=>drawer('.route-drawer'));
function openPlace(key){
  const p=places[key], el=document.querySelector('.place-drawer');
  el.querySelector('.drawer-index').textContent=`${String(route.indexOf(key)+1).padStart(2,'0')} · LANDMARK`;
  el.querySelector('h2').textContent=p.name;el.querySelector('.drawer-tag').textContent=p.tag;
  el.querySelector('.drawer-text').textContent=p.text;el.querySelector('.drawer-detail').textContent=p.detail;
  const img=el.querySelector('img');img.src=A+(assets[p.image]||'mountains-main.webp');img.alt=`${p.name}艺术化画面`;
  el.querySelector('.source-link').href=p.source;drawer('.place-drawer');
}
document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>openPlace(b.dataset.place)));
document.querySelectorAll('[data-route-place]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.routePlace;closeDrawer();jumpTo(places[k].chapter);setTimeout(()=>openPlace(k),simpleMotion?0:700)}));

let renderer,scene,camera,chapterGroups=[];
try{
  renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#scene'),alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);camera.position.z=22;
  const loader=new THREE.TextureLoader();
  const unique=[...new Set(Object.values(assets))];
  const textures={};
  await Promise.all(unique.map(file=>new Promise(resolve=>loader.load(A+file,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures[file]=t;resolve()},undefined,()=>resolve()))));
  chapters.forEach((chapter,ci)=>{
    const group=new THREE.Group();group.userData.index=ci;scene.add(group);chapterGroups.push(group);
    chapter.layers.forEach((l,li)=>{
      const tex=textures[assets[l.asset]];if(!tex)return;
      const ratio=tex.image.width/tex.image.height;const width=mobile()?(l.mobileWidth||l.width):l.width;
      const geo=new THREE.PlaneGeometry(width,width/ratio);const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:ci===0?(l.opacity??1):0,toneMapped:false});
      const mesh=new THREE.Mesh(geo,mat);mesh.position.set(mobile()?(l.mobileX??l.x):l.x,mobile()?(l.mobileY??l.y):l.y,l.z);mesh.renderOrder=l.z+20;mesh.userData={...l,baseX:mesh.position.x,baseY:mesh.position.y,baseOpacity:l.opacity??1,layerIndex:li};group.add(mesh);
    });
    group.visible=ci<2;
  });
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();chapterGroups.forEach((g,ci)=>g.children.forEach((m,li)=>{const l=chapters[ci].layers[li];const tex=m.material.map, w=mobile()?(l.mobileWidth||l.width):l.width;m.geometry.dispose();m.geometry=new THREE.PlaneGeometry(w,w/(tex.image.width/tex.image.height));m.position.x=mobile()?(l.mobileX??l.x):l.x;m.position.y=mobile()?(l.mobileY??l.y):l.y;m.userData.baseX=m.position.x;m.userData.baseY=m.position.y;}));}
  addEventListener('resize',resize);resize();
}catch(e){document.body.classList.add('no-webgl');loading.classList.add('done');}

function updateExperience(progress){
  lastProgress=progress;const st=journeyState(progress,chapters.length);const idx=st.displayIndex;
  if(idx!==current){copies[current]?.classList.remove('is-active');nav[current]?.classList.remove('is-active');current=idx;copies[current]?.classList.add('is-active');nav[current]?.classList.add('is-active');hint.textContent=chapters[current].hint;}
  nav.forEach((b,i)=>b.classList.toggle('is-past',i<st.index));
  root.style.setProperty('--journey',String(progress));root.style.setProperty('--sunrise',String(Math.max(0,(progress-.78)/.22)));
  altitude.textContent=String(Math.round(progress*1532)).padStart(4,'0');
  document.querySelector('.summit-finale').classList.toggle('show',progress>.965);
  if(!chapterGroups.length)return;
  chapterGroups.forEach((g,i)=>{
    const distance=Math.abs(i-st.index);g.visible=distance<=1;
    let alpha=i===st.index?1-st.blend:i===st.index+1?st.blend:0;
    g.children.forEach(m=>{
      const u=m.userData;let focus=1;
      if(i===4&&u.focus){const f=focusAt(st.local);focus=u.focus===f?1:.05;}
      m.material.opacity=alpha*u.baseOpacity*focus;
      const depth=(u.z+10)/17;const travel=simpleMotion?0:(st.local-.5)*(1.6+depth*2.4);
      m.position.y=u.baseY+travel+(u.drift?Math.sin(performance.now()/3300+u.layerIndex)*u.drift*.12:0);
      m.position.x=u.baseX+smoothMouse.x*depth*(simpleMotion?0:.55);
    });
  });
}

ScrollTrigger.create({trigger:'.spacer',start:'top top',end:'bottom bottom',scrub:true,onUpdate:self=>updateExperience(self.progress)});
addEventListener('pointermove',e=>{targetMouse.x=(e.clientX/innerWidth-.5)*2;targetMouse.y=(e.clientY/innerHeight-.5)*2},{passive:true});
function render(){
  smoothMouse.x+=(targetMouse.x-smoothMouse.x)*.035;smoothMouse.y+=(targetMouse.y-smoothMouse.y)*.035;
  if(camera&&renderer){camera.position.x=simpleMotion?0:smoothMouse.x*.18;camera.position.y=simpleMotion?0:-smoothMouse.y*.12;camera.lookAt(0,0,0);renderer.render(scene,camera);}
  requestAnimationFrame(render);
}
updateExperience(0);nav[0].classList.add('is-active');render();
setTimeout(()=>loading.classList.add('done'),500);
