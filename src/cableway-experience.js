import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// The cabin, camera and progress share one journey through a real WebGL scene.
export function createCablewayExperience(host,{onReady,onError,onProgress,onNavigate,inputHost=host}={}){
  let active=false,riding=false,ready=false,modelLoaded=false,disposed=false,frame=0,lastTime=0,elapsed=0;
  let audio=null,audioGain=null,sound=false,volume=.8;
  let loadTimeout;
  const manager=new THREE.LoadingManager();
  const duration=70,scene=new THREE.Scene(),vehicle=new THREE.Group();
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.setClearColor(0x000000,0);renderer.domElement.setAttribute('aria-label','三维缆车与连续全景画境，拖动观察车厢，方向键控制行程和视角');
  renderer.domElement.tabIndex=0;
  const onKey=event=>{if(event.defaultPrevented||event.altKey||event.metaKey||event.ctrlKey||event.target.closest('input,textarea,select,[contenteditable=true]'))return;const action={ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'left',ArrowRight:'right'}[event.key];if(action){event.preventDefault();onNavigate?.(action);}};
  inputHost.addEventListener('keydown',onKey);
  renderer.domElement.addEventListener('pointerdown',()=>renderer.domElement.focus({preventScroll:true}));
  host.replaceChildren(renderer.domElement);
  scene.fog=new THREE.Fog(0xf4eee0,60,175);
  scene.add(new THREE.HemisphereLight(0xfff5e2,0x718172,2.1));
  const light=new THREE.DirectionalLight(0xffe2b2,2.8);light.position.set(20,30,12);scene.add(light);
  const camera=new THREE.PerspectiveCamera(40,1,.1,350);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.enableDamping=true;controls.minDistance=10;controls.maxDistance=32;
  controls.minAzimuthAngle=-.15;controls.maxAzimuthAngle=1.15;
  controls.minPolarAngle=1.17;controls.maxPolarAngle=1.65;
  const targetOffset=new THREE.Vector3(),position=new THREE.Vector3(),previous=new THREE.Vector3();
  const at=t=>new THREE.Vector3(0,4*t,70-140*t);
  previous.copy(at(0));vehicle.position.copy(previous);scene.add(vehicle);
  let returnCar=null;
  const backdrop=inputHost.querySelector('.cableway-backdrop');
  // A single continuous scenic painting has no billboard edges or detached
  // architectural cutouts. Only the cabin, return cabin and cables are 3D.
  const landscape=new Image();manager.itemStart('landscape');
  landscape.onload=()=>manager.itemEnd('landscape');
  landscape.onerror=()=>{if(!disposed)onError?.(new Error('全景山景未能载入，请重试'));};
  landscape.src=import.meta.env.BASE_URL+'design-assets/cableway-cloud-valley-v1.webp';
  function syncBackdrop(){if(backdrop)backdrop.style.backgroundPosition=`${(camera.aspect<.85?63:50)+(elapsed/duration-.5)*8+(controls.getAzimuthalAngle()-.5)*10}% 50%`;}
  controls.addEventListener('change',syncBackdrop);
  function place(){
    position.copy(at(elapsed/duration));const delta=position.clone().sub(previous);
    vehicle.position.copy(position);camera.position.add(delta);controls.target.add(delta);previous.copy(position);
    if(returnCar)returnCar.position.copy(at(1-elapsed/duration)).add(new THREE.Vector3(6,0,0));
    syncBackdrop();onProgress?.(elapsed/duration,false);
  }
  function resetView(){
    const portrait=camera.aspect<.85;targetOffset.set(portrait?0:2.7,-.65,0);
    const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
    controls.target.copy(vehicle.position).add(targetOffset);
    camera.position.copy(vehicle.position).add(new THREE.Vector3(7,2.1,10).multiplyScalar(Math.max(1,1.05/camera.aspect)));
    controls.update();controls.enableDamping=damping;
  }
  function resize(){if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(ready)resetView();}
  function loop(now){
    if(disposed||!active){frame=0;return;}
    const delta=lastTime?Math.min(.1,(now-lastTime)/1000):0;lastTime=now;
    if(ready&&riding){elapsed=Math.min(duration,elapsed+delta);place();if(elapsed===duration)riding=false;}
    controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(loop);
  }
  manager.onLoad=()=>{if(!disposed&&modelLoaded){clearTimeout(loadTimeout);ready=true;resetView();place();onReady?.();}};
  const loader=new GLTFLoader(manager);loader.setMeshoptDecoder(MeshoptDecoder);
  loadTimeout=setTimeout(()=>{if(!disposed&&!ready)onError?.(new Error('模型载入超时，请检查网络后重试'));},90000);
  loader.load(import.meta.env.BASE_URL+'models/cable-car-optimized.glb',gltf=>{
    if(disposed){disposeObject(gltf.scene);return;}
    const model=gltf.scene;model.rotation.y=Math.PI/2;
    const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.setScalar(5.7/Math.max(size.x,size.y,size.z));
    model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
    const bounds=new THREE.Box3().setFromObject(model),attachmentY=bounds.max.y-.14;
    vehicle.add(model);returnCar=new THREE.Group();returnCar.add(model.clone(true));scene.add(returnCar);
    // Longitudinal suspension hardware follows the same direction as both
    // cable lines. No guessed ground pylons or floating station cutouts.
    const material=new THREE.LineBasicMaterial({color:0x656050,transparent:true,opacity:.8});
    for(const offset of[0,6]){
      const points=Array.from({length:181},(_,i)=>at(-1+i/60).add(new THREE.Vector3(offset,attachmentY,0)));
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material));
    }
    modelLoaded=true;
  },event=>{if(event.total)onProgress?.(event.loaded/event.total,true);},error=>{if(!disposed)onError?.(error);});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();if(!disposed)onError?.(new Error('三维绘图中断，请重新载入'));});
  const observer=new ResizeObserver(resize);observer.observe(host);resize();resetView();

  function createSound(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw new Error('此浏览器不支持环境声');
    audio=new AudioContext();audioGain=audio.createGain();audioGain.gain.value=0;audioGain.connect(audio.destination);
    const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate),samples=buffer.getChannelData(0);let brown=0;
    for(let i=0;i<samples.length;i++){brown=(brown+(Math.random()*2-1)*.02)/1.02;samples[i]=brown*3.5;}
    const wind=audio.createBufferSource();wind.buffer=buffer;wind.loop=true;
    const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;wind.connect(filter);filter.connect(audioGain);wind.start();
    const motor=audio.createOscillator(),gain=audio.createGain();motor.frequency.value=62;gain.gain.value=.035;motor.connect(gain);gain.connect(audioGain);motor.start();
  }
  function applyVolume(){if(audioGain)audioGain.gain.setTargetAtTime(sound&&active?volume*.32:0,audio.currentTime,.08);}
  function disposeObject(object){object.traverse(node=>{node.geometry?.dispose();for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}});}
  return{
    setActive(value){active=value;lastTime=0;if(active&&!frame)frame=requestAnimationFrame(loop);if(!active){cancelAnimationFrame(frame);frame=0;audio?.suspend();}applyVolume();},
    setRide(value){if(elapsed===duration&&value){elapsed=0;place();}riding=value;lastTime=0;},
    seek(progress){elapsed=THREE.MathUtils.clamp(progress,0,1)*duration;place();lastTime=0;},
    rotateView(amount){const damping=controls.enableDamping;controls.enableDamping=false;controls.update();camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),amount).add(controls.target);controls.update();controls.enableDamping=damping;},
    resetView,
    async setSound(value,nextVolume=volume){if(value&&!audio)createSound();if(value)await audio.resume();if(disposed||!active)return false;sound=value;volume=nextVolume;applyVolume();if(!sound)await audio?.suspend();return sound;},
    setVolume(value){volume=value;applyVolume();},
    destroy(){clearTimeout(loadTimeout);disposed=true;active=false;cancelAnimationFrame(frame);inputHost.removeEventListener('keydown',onKey);observer.disconnect();controls.dispose();audio?.close();disposeObject(scene);renderer.dispose();renderer.domElement.remove();},
  };
}
