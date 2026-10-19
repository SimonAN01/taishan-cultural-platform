import * as THREE from 'three';

// A controllable, bounded 3D street. Geometry is an artistic interpretation,
// never a claimed survey or reconstruction of Tianjie.
export function createStreetExperience(host,{onPosition=()=>{},inputHost=host}={}){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label','天街三维漫游，按 W 或上箭头前进，S 后退，左右箭头转向，也可拖动视角');renderer.domElement.tabIndex=0;host.replaceChildren(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xede5d2,28,85);
  const camera=new THREE.PerspectiveCamera(59,1,.08,150),keys=new Set();let x=0,z=10,yaw=0,pitch=0,alive=true,frame=0,last=0,pointer=null;
  scene.add(new THREE.HemisphereLight(0xfff3d4,0x687e70,2.3));const sun=new THREE.DirectionalLight(0xffdeb0,2.5);sun.position.set(-15,30,12);scene.add(sun);
  const stone=new THREE.MeshStandardMaterial({color:0xada591,roughness:1}),red=new THREE.MeshStandardMaterial({color:0x8b4030,roughness:.9}),plaster=new THREE.MeshStandardMaterial({color:0xd7cbb3,roughness:1}),roof=new THREE.MeshStandardMaterial({color:0x47584f,roughness:.95}),wood=new THREE.MeshStandardMaterial({color:0x604731,roughness:1});
  roof.side=THREE.DoubleSide;
  const textures=[];
  function grain(base){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,128,128);
    let seed=177;for(let i=0;i<3900;i++){seed=(seed*16807)%2147483647;const px=seed%128;seed=(seed*16807)%2147483647;const py=seed%128;ctx.fillStyle=i%2?'#3e403a0a':'#fff8e30f';ctx.fillRect(px,py,1+(i%3),1);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;textures.push(texture);return texture;
  }
  plaster.map=grain('#e9e1ca');plaster.color.setHex(0xffffff);stone.map=grain('#dbd6c5');stone.color.setHex(0xf2f1e8);wood.map=grain('#755c44');
  const paving=new THREE.MeshStandardMaterial({map:grain('#e4dfd0'),color:0xffffff,roughness:1});
  function box(w,h,d,material,px,py,pz,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(px,py,pz);parent.add(mesh);return mesh;}
  // Separate paving stones give translation and perspective a visible scale.
  const slabs=new THREE.InstancedMesh(new THREE.BoxGeometry(1.43,.13,1.9),paving,5*52),matrix=new THREE.Matrix4(),color=new THREE.Color();let index=0;
  for(let row=0;row<52;row++)for(let col=0;col<5;col++){matrix.makeTranslation((col-2)*1.48,-.08,12-row*2);slabs.setMatrixAt(index,matrix);color.setHex([0xd1cbbd,0xc1bdae,0xb9b7ad,0xc8c3b6][(row+col)%4]);slabs.setColorAt(index++,color);}scene.add(slabs);
  box(8,.7,108,stone,0,-.5,-39);
  // Open cliff side on the left; shops and tiled eaves on the right.
  for(let i=0;i<28;i++){const pz=11-i*3.8;box(.25,1.2,.25,stone,-3.65,.6,pz);if(i<27){box(.18,.18,3.8,stone,-3.65,.85,pz-1.9);box(.18,.18,3.8,stone,-3.65,.38,pz-1.9);}}
  function house(pz,side=1){
    const group=new THREE.Group();group.position.set(side*6.1,0,pz);scene.add(group);
    box(4.5,3.2,7,plaster,0,1.6,0,group);box(.14,2.8,1.45,wood,-side*2.32,1.5,0,group);
    for(const dz of[-2.6,2.6]){box(.15,1.45,1.55,wood,-side*2.33,1.8,dz,group);for(const dz2 of[-.4,0,.4])box(.18,1.3,.05,red,-side*2.42,1.8,dz+dz2,group);}
    for(const dz of[-3.2,3.2])box(.24,3.4,.24,red,-side*2.6,1.7,dz,group);
    const roofGeometry=new THREE.PlaneGeometry(6,8.6,20,4),points=roofGeometry.attributes.position;roofGeometry.rotateX(-Math.PI/2);
    for(let i=0;i<points.count;i++){const t=Math.abs(points.getX(i))/3;points.setY(i,.2+1.1*Math.pow(1-t,1.1)+.22*Math.pow(t,7));}
    roofGeometry.computeVertexNormals();const tiles=new THREE.Mesh(roofGeometry,roof);tiles.position.y=3.1;group.add(tiles);
    const tileMaterial=new THREE.LineBasicMaterial({color:0x8b9181});
    for(let line=0;line<17;line++){const pz=-4.3+line*.5375,curve=[];for(let j=0;j<=20;j++){const px=-3+j*.3,t=Math.abs(px)/3;curve.push(new THREE.Vector3(px,3.31+1.1*Math.pow(1-t,1.1)+.22*Math.pow(t,7),pz));}group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve),tileMaterial));}
    box(.19,.14,8.8,roof,0,4.43,0,group);
    box(.12,.5,1.6,red,-side*2.5,2.9,0,group);
  }
  for(let i=0;i<10;i++){house(4-i*9.5);if(i===4||i===8)house(4-i*9.5,-1);}
  // Simple mountain masses beyond the balustrade, kept behind the walkable area.
  const mountain=new THREE.MeshStandardMaterial({color:0x8c978a,roughness:1,flatShading:true});
  for(let i=0;i<16;i++){const mesh=new THREE.Mesh(new THREE.ConeGeometry(7+i%4,17+i%5*3,6),mountain);mesh.position.set(-22-i%3*10,-9,18-i*9);scene.add(mesh);}
  const gateZ=-73;for(const px of[-2.7,2.7])box(.48,5,.48,stone,px,2.5,gateZ);box(6.9,.5,.7,stone,0,4.4,gateZ);box(7.7,.35,1.1,roof,0,5.05,gateZ);
  function renderPosition(){camera.position.set(x,1.7,z);camera.rotation.set(pitch,yaw,0,'YXZ');const steps=Math.round((10-z)/2);const canMove=d=>Math.hypot(THREE.MathUtils.clamp(x-Math.sin(yaw)*d,-2.6,2.6)-x,THREE.MathUtils.clamp(z-Math.cos(yaw)*d,-77,10)-z)>.01;onPosition({x,z,yaw,steps,canForward:canMove(2),canBack:canMove(-2)});}
  function move(forward,side=0){x=THREE.MathUtils.clamp(x-Math.sin(yaw)*forward+Math.cos(yaw)*side,-2.6,2.6);z=THREE.MathUtils.clamp(z-Math.cos(yaw)*forward-Math.sin(yaw)*side,-77,10);renderPosition();}
  function turn(amount){yaw+=amount;renderPosition();}
  function reset(){x=0;z=10;yaw=0;pitch=0;keys.clear();renderPosition();}
  const canvas=renderer.domElement;
  function keydown(e){if(e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(!keys.has(e.key)){if(['w','ArrowUp'].includes(e.key))move(.35);else if(['s','ArrowDown'].includes(e.key))move(-.35);else if(e.key==='ArrowLeft')turn(.08);else if(e.key==='ArrowRight')turn(-.08);}keys.add(e.key);}}
  function keyup(e){keys.delete(e.key);}
  const clearKeys=()=>keys.clear(),focusout=e=>{if(!inputHost.contains(e.relatedTarget))clearKeys();};inputHost.addEventListener('keydown',keydown);inputHost.addEventListener('keyup',keyup);inputHost.addEventListener('focusout',focusout);window.addEventListener('blur',clearKeys);
  canvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;yaw-=(e.clientX-pointer.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-pointer.y)*.003,-.4,.4);pointer.x=e.clientX;pointer.y=e.clientY;renderPosition();});
  function pointerup(){pointer=null;}canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('pointercancel',pointerup);
  function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();reset();
  function loop(now){if(!alive)return;const dt=last?Math.min(.08,(now-last)/1000):0;last=now;const speed=dt*3.4;if(keys.has('w')||keys.has('ArrowUp'))move(speed);if(keys.has('s')||keys.has('ArrowDown'))move(-speed);if(keys.has('a'))move(0,-speed);if(keys.has('d'))move(0,speed);if(keys.has('ArrowLeft'))turn(dt);if(keys.has('ArrowRight'))turn(-dt);renderer.render(scene,camera);frame=requestAnimationFrame(loop);}frame=requestAnimationFrame(loop);
  return{move,turn,reset,destroy(){alive=false;cancelAnimationFrame(frame);keys.clear();inputHost.removeEventListener('keydown',keydown);inputHost.removeEventListener('keyup',keyup);inputHost.removeEventListener('focusout',focusout);window.removeEventListener('blur',clearKeys);observer.disconnect();scene.traverse(o=>o.geometry?.dispose());const materials=new Set();scene.traverse(o=>{if(o.material)materials.add(o.material);});for(const material of materials)material.dispose();paving.dispose();for(const texture of textures)texture.dispose();renderer.dispose();canvas.remove();}};
}
