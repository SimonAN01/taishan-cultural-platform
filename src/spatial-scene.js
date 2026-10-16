import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {artUrl} from './art-gallery.js';
import {artworkCameraDistance} from './scene-framing.js';

// A real perspective viewport for layered art today and artist-authored GLB scenes later.
// Artwork layers remain explicitly distinct from a reconstructed architectural model.
export function createSpatialScene(host,{scene,controlsHost,onPoint,onStatus,reducedMotion=false}){
  let alive=true,frame=0,tween=null,tour=false,tourStart=0,tourIndex=0,modelLoaded=false,homeDistance=0;
  const resources=[],textures=[],markers=new Map();
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#e8e0cd',0);
  renderer.domElement.setAttribute('aria-label',scene.name+'空间画境，拖动转视角，使用缩放按钮拉近');host.append(renderer.domElement);
  const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,1.6,9);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enablePan=false;controls.minDistance=4.2;controls.maxDistance=12;controls.minAzimuthAngle=-.35;controls.maxAzimuthAngle=.35;controls.minPolarAngle=1.15;controls.maxPolarAngle=1.7;
  const layers=new THREE.Group();world.add(layers);const loader=new THREE.TextureLoader();
  world.add(new THREE.HemisphereLight(0xfff9e8,0x6f796c,2));const light=new THREE.DirectionalLight(0xffe2bd,2.2);light.position.set(-4,7,5);world.add(light);
  function track(object){object.traverse(o=>{if(o.geometry)resources.push(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){resources.push(m);for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'])if(m[key])textures.push(m[key]);}});}
  async function plane(id,width,height,x,y,z,opacity=1){
    const texture=await loader.loadAsync(artUrl(id));if(!alive){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.025,opacity,side:THREE.DoubleSide,depthWrite:opacity===1});const geo=new THREE.PlaneGeometry(width,height),mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);layers.add(mesh);resources.push(material,geo);return mesh;
  }
  function render(){if(!alive)return;renderer.render(world,camera);for(const [id,point] of markers){const p=point.clone().project(camera);const pin=host.parentElement.querySelector(`[data-point="${id}"]`);if(pin){pin.style.left=(p.x*.5+.5)*100+'%';pin.style.top=(-p.y*.5+.5)*100+'%';pin.style.visibility=p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.96?'visible':'hidden';}}}
  function resize(){if(!alive)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(!scene.background&&!modelLoaded){const distance=artworkCameraDistance(camera.aspect,38,8.2,4.3);if(homeDistance){camera.position.sub(controls.target).multiplyScalar(distance/homeDistance).add(controls.target);}else{controls.target.set(0,-.7,0);camera.position.set(0,-.7,distance);}homeDistance=distance;controls.minDistance=distance*.55;controls.maxDistance=distance*1.2;controls.update();}render();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  function tick(now){if(!alive)return;frame=0;
    if(tour&&now-tourStart>6500){tourIndex=(tourIndex+1)%scene.points.length;tourStart=now;onPoint(scene.points[tourIndex].id);}
    if(tween){const t=Math.min(1,(now-tween.start)/700),e=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.lookFrom,tween.lookTo,e);controls.update();if(t===1)tween=null;}
    if(tween||tour)schedule();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(tick);}
  function stopTour(){tour=false;const button=toolbar.querySelector('.space-tour');button.setAttribute('aria-pressed','false');button.textContent='依次导读';}
  controls.addEventListener('change',render);controls.addEventListener('start',()=>{tween=null;stopTour();});
  for(const p of scene.points)markers.set(p.id,new THREE.Vector3((p.x/100-.5)*8,(.5-p.y/100)*5,.3));
  const toolbar=document.createElement('div');toolbar.className='space-tools';toolbar.innerHTML='<button class="space-in" aria-label="拉近空间画境">＋</button><button class="space-out" aria-label="拉远空间画境">−</button><button class="space-reset">复位视角</button><button class="space-tour" aria-pressed="false">依次导读</button>';
  controlsHost.append(toolbar);
  const hint=document.createElement('p');hint.className='space-hint';hint.textContent='拖动观察画境 · 双指或按钮拉近';controlsHost.append(hint);
  const reset=()=>{tween=null;stopTour();controls.target.set(0,0,0);if(!scene.background&&!modelLoaded){controls.target.set(0,-.7,0);camera.position.set(0,-.7,homeDistance);}else camera.position.set(0,1.6,9);controls.update();render();};
  function zoom(factor){stopTour();tween=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();render();}
  toolbar.querySelector('.space-in').onclick=()=>zoom(.82);toolbar.querySelector('.space-out').onclick=()=>zoom(1.22);toolbar.querySelector('.space-reset').onclick=reset;
  toolbar.querySelector('.space-tour').onclick=e=>{tour=!tour;e.currentTarget.setAttribute('aria-pressed',String(tour));e.currentTarget.textContent=tour?'停止导读':'依次导读';if(tour){tourIndex=0;tourStart=performance.now();onPoint(scene.points[0].id);schedule();}};
  host.tabIndex=0;host.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();stopTour();tween=null;camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.06:-.06);controls.update();render();}else if(e.key==='Escape')reset();};
  function setPoint(id,{fromTour=false}={}){if(!fromTour)stopTour();if(!modelLoaded)return;const p=markers.get(id);if(!p)return;const look=new THREE.Vector3(p.x*.25,p.y*.25,0),target=new THREE.Vector3(p.x*.32,1+p.y*.18,7.7);if(reducedMotion){controls.target.copy(look);camera.position.copy(target);controls.update();render();}else{tween={start:performance.now(),from:camera.position.clone(),to:target,lookFrom:controls.target.clone(),lookTo:look};schedule();}}
  const api={representation:'concept',setPoint,destroy(){alive=false;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();for(const resource of new Set(resources))resource.dispose();for(const texture of new Set(textures))texture.dispose();renderer.dispose();renderer.domElement.remove();toolbar.remove();hint.remove();}};
  async function load(){
  resize();onStatus('正在展开空间画境…');
  // Keep the base visual while textures are loading; no invented building backsides.
  try{
    await Promise.all([
      scene.background?plane(scene.background,11,7.3,0,0,-1.6):Promise.resolve(),
      scene.foreground?plane(scene.foreground,scene.foreground_style==='cliff'?4.5:8.2,scene.foreground_style==='cliff'?3.5:5.2,scene.foreground_style==='cliff'?1.2:0,-.5,.1):Promise.resolve(),
      !scene.foreground&&scene.background?plane(scene.background,11,7.3,0,0,-1.8,.28):Promise.resolve()
    ]);
    if(!alive)return api;
    for(const p of scene.points){if(!p.detail_asset)continue;const size=p.id==='pines'?2.6:3.1;await plane(p.detail_asset,size,size*1.05,p.id==='pines'?-2.5:.3,-.9,.5,.95);}
    if(!alive)return api;
    onStatus('分层概念画境 · 文化主题不表示实物位置');
    if(scene.model_available){
      try{const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(scene.model_url);if(!alive){track(gltf.scene);api.destroy();return api;}
        const model=gltf.scene;track(model);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const extent=Math.max(size.x,size.y,size.z);if(!Number.isFinite(extent)||extent<=0||scene.points.some(p=>!model.getObjectByName('POI_'+p.id)))throw new Error('Invalid scene geometry or POI anchors');const scale=7/extent;const group=new THREE.Group();group.scale.setScalar(scale);model.position.sub(center);group.add(model);world.add(group);layers.visible=false;
        group.updateMatrixWorld(true);for(const point of scene.points){const node=model.getObjectByName('POI_'+point.id);if(node)markers.set(point.id,node.getWorldPosition(new THREE.Vector3()));}
        modelLoaded=true;api.representation='model';controls.minDistance=4.2;controls.maxDistance=12;controls.target.set(0,0,0);camera.position.set(0,1.6,9);controls.update();controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.minPolarAngle=.3;controls.maxPolarAngle=1.8;onStatus('建筑模型空间 · 拖动观察细节');
      }catch{onStatus('建筑模型未载入，已保留分层画境，可切换阅读后重试');}
    }
    resize();
  }catch{onStatus('部分空间素材未载入，可切回画卷阅读后重试');throw new Error('空间素材未载入');}
  }
  api.ready=load();
  return api;
}
