import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AnimationMixer, LoopOnce, Vector3, Quaternion } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { prepareAvatarClips } from '../src/avatar-animation.js';

// Decode the actual shipped geometry/rig in Node, omitting only browser texture loading.
async function loadRig() {
  const bytes=readFileSync(new URL('../public/models/princess-agent-web-v4.glb',import.meta.url));
  assert.ok(bytes.length<1_400_000,'Keep the web model within its first-load budget');
  const jsonLength=bytes.readUInt32LE(12), json=JSON.parse(bytes.subarray(20,20+jsonLength));
  for(const material of json.materials) if(material.pbrMetallicRoughness)delete material.pbrMetallicRoughness.baseColorTexture;
  json.images=[];json.textures=[];
  const text=Buffer.from(JSON.stringify(json));
  const padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(padded);
  const binary=bytes.subarray(20+jsonLength), header=Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+binary.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const glb=Buffer.concat([header,padded,binary]);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'');
}

test('shipped compressed rig has visible gestures and real deforming mouth geometry',async()=>{
  const gltf=await loadRig(),clips=prepareAvatarClips(gltf.animations);
  const mixer=new AnimationMixer(gltf.scene);
  for(const [name,bone,minimum] of [['Nod','Head',19],['Bow','Torso',24]]){
    mixer.stopAllAction();const clip=clips.find(c=>c.name===name);assert.ok(clip,name);
    const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
    let peak=0;
    for(let t=0;t<clip.duration;t+=1/60){mixer.update(1/60);peak=Math.max(peak,2*Math.acos(Math.min(1,Math.abs(gltf.scene.getObjectByName(bone).quaternion.w)))*180/Math.PI);}
    assert.ok(peak>minimum,`${name}: ${peak.toFixed(1)}°`);
  }
  mixer.stopAllAction();gltf.scene.updateMatrixWorld(true);
  let deformingMeshes=0;
  gltf.scene.traverse(mesh=>{
    const index=mesh.morphTargetDictionary?.jawOpen;if(index===undefined)return;
    let peak=0;const a=new Vector3(),b=new Vector3();
    for(let i=0;i<mesh.geometry.attributes.position.count;i++){
      mesh.morphTargetInfluences[index]=0;mesh.getVertexPosition(i,a);
      mesh.morphTargetInfluences[index]=1.6;mesh.getVertexPosition(i,b);peak=Math.max(peak,a.distanceTo(b));
    }
    assert.ok(peak>.015,'Jaw must change actual vertices, not just a status value');deformingMeshes++;
  });
  assert.equal(deformingMeshes,2);
});

test('both arms and all thirty finger joints deform the mesh; wrists stay on the shared grip',async()=>{
  const gltf=await loadRig(),scene=gltf.scene,clips=prepareAvatarClips(gltf.animations);
  let mesh;scene.traverse(node=>{if(node.isSkinnedMesh&&node.geometry.attributes.position.count>1000)mesh=node;});
  assert.ok(mesh);
  const {skinIndex,skinWeight,position}=mesh.geometry.attributes;
  for(const value of position.array)assert.ok(Number.isFinite(value),'Finite geometry after export');
  const weighted=new Map(mesh.skeleton.bones.map(b=>[b.name,[]]));
  const components=['getX','getY','getZ','getW'];
  for(let i=0;i<skinWeight.count;i++)for(const component of components){
    if(skinWeight[component](i)>.05)weighted.get(mesh.skeleton.bones[skinIndex[component](i)].name).push(i);
  }
  for(const side of ['L','R']){
    for(const part of ['UpperArm','Forearm','Hand','Sleeve'])assert.ok(weighted.get(`${part}_${side}`)?.length>10,`${part}_${side} needs actual weights`);
    for(const digit of ['Thumb','Index','Middle','Ring','Little'])for(let joint=1;joint<=3;joint++){
      const name=`${digit}_${String(joint).padStart(2,'0')}_${side}`,bone=scene.getObjectByName(name),ids=weighted.get(name);
      assert.ok(bone?.isBone&&ids?.length>=3,`${name} needs geometry, not an empty bone`);
      scene.updateMatrixWorld(true);const before=ids.map(i=>mesh.getVertexPosition(i,new Vector3()).clone());
      const rest=bone.quaternion.clone();bone.rotateZ(.15);scene.updateMatrixWorld(true);
      const peak=Math.max(...ids.map((i,k)=>mesh.getVertexPosition(i,new Vector3()).distanceTo(before[k])));
      assert.ok(peak>.00001,`${name} must change actual vertices`);bone.quaternion.copy(rest);
    }
  }
  const mixer=new AnimationMixer(scene),action=mixer.clipAction(clips.find(c=>c.name==='Bow')).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  const grip=scene.getObjectByName('Ruyi'),hands=['L','R'].map(side=>scene.getObjectByName('Hand_'+side));
  mixer.setTime(0);scene.updateMatrixWorld(true);
  const baseline=hands.map(hand=>grip.matrixWorld.clone().invert().multiply(hand.matrixWorld));
  const finger=scene.getObjectByName('Index_02_L'),rest=finger.quaternion.clone();
  let curl=0,lift=0,maxPositionError=0,maxRotationError=0;const start=hands[0].getWorldPosition(new Vector3());
  for(let t=0;t<=4.8;t+=.1){
    mixer.setTime(t);scene.updateMatrixWorld(true);curl=Math.max(curl,finger.quaternion.angleTo(rest));
    if(t<1)lift=Math.max(lift,hands[0].getWorldPosition(new Vector3()).y-start.y);
    hands.forEach((hand,i)=>{
      const relative=grip.matrixWorld.clone().invert().multiply(hand.matrixWorld);
      const error=new Vector3().setFromMatrixPosition(relative).distanceTo(new Vector3().setFromMatrixPosition(baseline[i]));
      const rotation=new Quaternion().setFromRotationMatrix(relative).angleTo(new Quaternion().setFromRotationMatrix(baseline[i]));
      maxPositionError=Math.max(maxPositionError,error);maxRotationError=Math.max(maxRotationError,rotation);
    });
  }
  // Baked/quantized animation may round rotations; bound actual contact drift.
  assert.ok(maxPositionError<.0005,'Grip contact drift must stay below 0.0005 model units');
  assert.ok(maxRotationError<.01,'Grip orientation drift must stay below 0.6 degrees');
  assert.ok(curl>.02,'Bow must animate the finger grip');
  assert.ok(lift>.012,'Hands must rise before the torso bows');
  mixer.setTime(4.8);scene.updateMatrixWorld(true);
  assert.ok(hands[0].getWorldPosition(new Vector3()).distanceTo(start)<.0005,'Bow must settle back to the initial pose');
});

test('far look turns toward the scenery with an upright neck, holds, then faces forward',async()=>{
  const gltf=await loadRig(),scene=gltf.scene,mixer=new AnimationMixer(scene);
  const clip=prepareAvatarClips(gltf.animations).find(c=>c.name==='LookAround');
  const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  const head=scene.getObjectByName('Head');
  const direction=()=>new Vector3(0,0,1).transformDirection(head.matrixWorld);
  mixer.setTime(0);scene.updateMatrixWorld(true);const start=direction();
  mixer.setTime(2.2);scene.updateMatrixWorld(true);
  const forward=direction(),up=new Vector3(0,1,0).transformDirection(head.matrixWorld);
  const yaw=Math.atan2(forward.x,forward.z)*180/Math.PI;
  assert.ok(yaw>30&&yaw<37,`Far look needs a horizontal turn, got ${yaw.toFixed(1)} degrees`);
  assert.ok(up.y>.99&&Math.abs(up.x)<.06,'Do not implement looking away as a sideways neck tilt');
  assert.ok(forward.y>0&&forward.y<.13,'Only a small upward chin movement is appropriate');
  mixer.setTime(3.0);scene.updateMatrixWorld(true);assert.ok(direction().angleTo(forward)<.005,'Hold the scenery gaze rather than shake left and right');
  mixer.setTime(clip.duration);scene.updateMatrixWorld(true);assert.ok(direction().angleTo(start)<.003,'Return to the visitor after the gesture');
});
