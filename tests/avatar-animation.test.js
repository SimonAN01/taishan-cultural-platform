import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AnimationMixer, LoopOnce, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { prepareAvatarClips } from '../src/avatar-animation.js';

// Decode the actual shipped geometry/rig in Node, omitting only browser texture loading.
async function loadRig() {
  const bytes=readFileSync(new URL('../public/models/princess-agent-web-v2.glb',import.meta.url));
  assert.ok(bytes.length<1_100_000,'Keep the web model within its first-load budget');
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
  for(const [name,bone,minimum] of [['Nod','Head',19],['Bow','Torso',24],['LookAround','Head',29]]){
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
