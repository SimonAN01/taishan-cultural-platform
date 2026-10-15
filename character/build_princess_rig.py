"""Rebuild the supplied princess with weighted arms/fingers and a baked offering bow.
Run: Blender --background --python character/build_princess_rig.py
Keeps the supplied mesh, UVs, facial shape keys and material. Requires only Blender.
"""
from pathlib import Path
import bpy, math, json
import numpy as np
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'taishan/runtime/arm-rig';WORK.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'public/models/princess-agent.glb'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
rig=bpy.data.objects['PrincessRig'];body=bpy.data.objects['meshes[0]'];mouth=bpy.data.objects['Mouth surface']
for ob in list(bpy.data.objects):
 ob.animation_data_clear()
 if ob.type=='MESH' and ob.data.shape_keys:ob.data.shape_keys.animation_data_clear()
 if ob not in [rig,body,mouth] and ob.type=='MESH':bpy.data.objects.remove(ob,do_unlink=True)
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
for pb in rig.pose.bones:pb.matrix_basis.identity()
rig.show_in_front=True
bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb=rig.data.edit_bones

def bone(name,head,tail,parent,deform=True,connected=False):
 b=eb.new(name);b.head=head;b.tail=tail;b.parent=eb[parent];b.use_deform=deform;b.use_connect=connected;return b

bone('Control_Grip',(0,-.20,.410),(0,-.20,.470),'Torso',False)
bone('Ruyi',(0,-.20,.410),(.045,-.17,.510),'Control_Grip')
landmarks={};finger_segments={}
for side,sign in [('L',1),('R',-1)]:
 wrist=Vector((sign*.060,-.195,.416 if side=='L' else .399))
 elbow=Vector((sign*.149,-.070,.377))
 shoulder=Vector((sign*.112,-.025,.528))
 hand_tip=Vector((sign*.018,-.226,.410 if side=='L' else .391))
 bone('Clavicle_'+side,(sign*.025,-.008,.535),shoulder,'Torso')
 bone('UpperArm_'+side,shoulder,elbow,'Clavicle_'+side,connected=True)
 bone('Forearm_'+side,elbow,wrist,'UpperArm_'+side,connected=True)
 bone('Hand_'+side,wrist,hand_tip,'Forearm_'+side,connected=True)
 bone('Sleeve_'+side,(sign*.140,-.065,.350),(sign*.140,-.065,.235),'Hand_'+side)
 bone('Control_Wrist_'+side,wrist,hand_tip,'Control_Grip',False)
 # Pole lies in the original elbow plane so the IK solution preserves the rest mesh.
 projection=shoulder+(wrist-shoulder)*(elbow-shoulder).dot(wrist-shoulder)/(wrist-shoulder).length_squared
 pole=elbow+(elbow-projection).normalized()*.22
 bone('Control_Pole_'+side,pole,pole+Vector((0,0,.04)),'Torso',False)
 landmarks[side]={'wrist':list(wrist),'elbow':list(elbow),'shoulder':list(shoulder)}
 finger_segments[side]=[]
 for digit,offset in [('Index',0),('Middle',1),('Ring',2),('Little',3)]:
  z=(.424 if side=='L' else .411)-offset*.0105
  # Curved rest chains follow the supplied closed grip rather than an imagined T-pose.
  points=[(sign*.045,-.217,z),(sign*.028,-.241,z-.0015),(sign*.012,-.235,z-.006),(sign*.009,-.216,z-.011)]
  for j in range(3):
   name=f'{digit}_{j+1:02}_{side}';parent='Hand_'+side if j==0 else f'{digit}_{j:02}_{side}'
   bone(name,points[j],points[j+1],parent,connected=j>0)
   finger_segments[side].append((name,np.array(points[j]),np.array(points[j+1])))
 z=.425 if side=='L' else .415
 thumb=[(sign*.048,-.202,z-.010),(sign*.030,-.226,z+.009),(sign*.013,-.235,z+.006),(sign*.005,-.220,z-.004)]
 for j in range(3):
  name=f'Thumb_{j+1:02}_{side}';parent='Hand_'+side if j==0 else f'Thumb_{j:02}_{side}'
  bone(name,thumb[j],thumb[j+1],parent,connected=j>0)
  finger_segments[side].append((name,np.array(thumb[j]),np.array(thumb[j+1])))
bpy.ops.object.mode_set(mode='OBJECT')

# Arm targets share a grip control: the two hands and the rigid prop move together.
for side in ['L','R']:
 fore=rig.pose.bones['Forearm_'+side]
 ik=fore.constraints.new('IK');ik.name='Two-bone wrist reach';ik.target=rig;ik.subtarget='Control_Wrist_'+side;ik.chain_count=2;ik.use_stretch=False
 ik.pole_target=rig;ik.pole_subtarget='Control_Pole_'+side
 hand=rig.pose.bones['Hand_'+side];copy=hand.constraints.new('COPY_TRANSFORMS');copy.name='Keep the supplied grip';copy.target=rig;copy.subtarget='Control_Wrist_'+side
 # Calibrate pole roll against the actual rest elbow, rather than guessing a side.
 target=Vector(landmarks[side]['elbow']);best=(1e9,0)
 for angle in range(-180,181,5):
  ik.pole_angle=math.radians(angle);bpy.context.view_layer.update()
  error=(fore.head-target).length
  if error<best[0]:best=(error,angle)
 for angle in np.arange(best[1]-5,best[1]+5,.1):
  ik.pole_angle=math.radians(float(angle));bpy.context.view_layer.update()
  error=(fore.head-target).length
  if error<best[0]:best=(error,float(angle))
 ik.pole_angle=math.radians(best[1]);print('IK_REST',side,best)
 assert best[0]<.002,'IK must preserve the rest elbow'
bpy.context.view_layer.update()

# Paint spatial arm weights, then refine the supplied skin/ivory texture regions.
m=body.data;n=len(m.vertices);pos=np.zeros(n*3,dtype=np.float32);m.vertices.foreach_get('co',pos);pos=pos.reshape(-1,3)
uv=np.zeros((n,2),dtype=np.float32)
for loop in m.loops:uv[loop.vertex_index]=m.uv_layers.active.data[loop.index].uv
image=next(node.image for node in m.materials[0].node_tree.nodes if node.type=='TEX_IMAGE')
pixels=np.array(image.pixels[:],dtype=np.float32).reshape(image.size[1],image.size[0],4)
xx=np.clip((uv[:,0]*image.size[0]).astype(int),0,image.size[0]-1);yy=np.clip((uv[:,1]*image.size[1]).astype(int),0,image.size[1]-1);color=pixels[yy,xx,:3]
names=[b.name for b in rig.data.bones if b.use_deform];index={name:i for i,name in enumerate(names)}
weights=np.zeros((n,len(names)),dtype=np.float32)
for v in m.vertices:
 for group in v.groups:
  name=body.vertex_groups[group.group].name
  if name in index:weights[v.index,index[name]]=group.weight

def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)

def segment_distance(p,a,b):
 a=np.asarray(a);b=np.asarray(b);ab=b-a;t=np.clip(((p-a)*ab).sum(axis=1)/(ab@ab),0,1);return np.linalg.norm(p-a-t[:,None]*ab,axis=1)

x,y,z=pos.T
for side,sign in [('L',1),('R',-1)]:
 # Long sleeves blend back into the stationary robe near their lower/inner edges.
 amount=smooth(.052,.105,sign*x)*smooth(.165,.245,z)*(1-smooth(.475,.552,z))*(1-smooth(.015,.105,y))
 cuff=smooth(.022,.055,sign*x)*smooth(.165,.235,z)*(1-smooth(.435,.515,z))*(1-smooth(-.170,-.110,y))
 amount=np.maximum(amount,cuff)*.97
 upper=smooth(.395,.495,z)
 fore=(1-upper)*.15
 hanging=1-upper-fore
 weights*=1-amount[:,None]
 weights[:,index['UpperArm_'+side]]+=amount*upper
 weights[:,index['Forearm_'+side]]+=amount*fore
 weights[:,index['Sleeve_'+side]]+=amount*hanging

# Let the whole wrist/cuff follow the palm before assigning individual skin digits.
for side in ['L','R']:
 wrist=np.array(landmarks[side]['wrist']);palm=wrist+np.array((-.033 if side=='L' else .033,-.027,-.006))
 distance=segment_distance(pos,wrist,palm)
 amount=(1-smooth(.021,.058,distance))*(1-smooth(-.167,-.135,y))
 weights*=1-amount[:,None];weights[:,index['Hand_'+side]]+=amount

# This generated asset fuses prop, fingers and cuffs into one surface. The grip
# region shares one rigid transform; only the skin digits get small local curls.
hand_volume=(1-smooth(.090,.120,abs(x)))*(1-smooth(-.178,-.145,y))*smooth(.335,.363,z)*(1-smooth(.451,.475,z))
head_radius=np.sqrt(((x-.064)/.070)**2+((z-.514)/.051)**2)
head_volume=(1-smooth(1,1.25,head_radius))*(1-smooth(-.165,-.140,y))
shaft_x=-.020+(z-.350)*.56
shaft_volume=(1-smooth(.023,.038,abs(x-shaft_x)))*smooth(.322,.345,z)*(1-smooth(.510,.535,z))*(1-smooth(-.212,-.185,y))
ring_radius=np.sqrt(((x+.018)/.035)**2+((z-.350)/.031)**2)
ring_volume=(1-smooth(1,1.3,ring_radius))*(1-smooth(-.212,-.188,y))
grip=np.maximum.reduce([hand_volume,head_volume,shaft_volume,ring_volume])
weights*=1-grip[:,None];weights[:,index['Ruyi']]+=grip
prop=grip>.99
assert int(prop.sum())>500

skin=(color[:,0]>color[:,1]*1.10)&(color[:,1]>color[:,2]*1.16)&(color[:,1]>.20)
hand_roi=(abs(x)<.077)&(y<-.163)&(z>.364)&(z<.449)&skin
centers=[np.array((.034,-.219,.416)),np.array((-.034,-.222,.394))]
side_distance=np.stack([np.linalg.norm(pos-c,axis=1) for c in centers],axis=1)
for side,si,sign in [('L',0,1),('R',1,-1)]:
 ids=np.where(hand_roi&(side_distance.argmin(axis=1)==si))[0]
 p=pos[ids]
 distances=np.stack([segment_distance(p,a,b) for _,a,b in finger_segments[side]],axis=1)
 nearest=np.argsort(distances,axis=1)[:,:2]
 weights[ids]=0
 finger_amount=(1-smooth(.023,.053,sign*p[:,0]))*.94
 weights[ids,index['Hand_'+side]]=1-finger_amount
 for row,vertex in enumerate(ids):
  candidates=nearest[row];v=np.exp(-distances[row,candidates]**2/(.008**2));v=v/max(v.sum(),1e-15)
  for k,value in zip(candidates,v):weights[vertex,index[finger_segments[side][k][0]]]+=finger_amount[row]*value

# UV seams duplicate vertices: identical positions need identical weights to avoid cracks.
seams={}
for i,p in enumerate(pos):seams.setdefault(tuple(np.round(p,5)),[]).append(i)
for ids in seams.values():
 if len(ids)>1:weights[ids]=weights[ids].mean(axis=0)
# Smooth over the welded surface, not UV islands, to remove hard paint boundaries.
_,inverse=np.unique(np.round(pos,5),axis=0,return_inverse=True)
count=int(inverse.max())+1;counts=np.bincount(inverse,minlength=count)
welded=np.zeros((count,len(names)),dtype=np.float32)
np.add.at(welded,inverse,weights);welded/=counts[:,None]
edges=np.zeros(len(m.edges)*2,dtype=np.int32);m.edges.foreach_get('vertices',edges);edges=inverse[edges.reshape(-1,2)]
edges=np.unique(np.sort(edges,axis=1),axis=0);edges=edges[edges[:,0]!=edges[:,1]]
starts=np.concatenate([edges[:,0],edges[:,1]]);ends=np.concatenate([edges[:,1],edges[:,0]])
degree=np.maximum(1,np.bincount(starts,minlength=count))
for iteration in range(8):
 average=np.stack([np.bincount(starts,weights=welded[ends,j],minlength=count)/degree for j in range(len(names))],axis=1)
 welded=welded*.35+average*.65
# The closed grip hides one proximal knuckle under the palm. Paint its broad
# support on nearby skin so that the MCP joint has a real deformation region.
skin_confidence=np.bincount(inverse,weights=hand_roi.astype(float),minlength=count)/counts
weld_pos=np.zeros((count,3),dtype=np.float32);np.add.at(weld_pos,inverse,pos);weld_pos/=counts[:,None]
for side in ['L','R']:
 for name,a,b in finger_segments[side]:
  strongest=np.argsort(welded,axis=1)[:,-4:]
  support_count=int(((welded[:,index[name]]>.05)&(strongest==index[name]).any(axis=1)).sum())
  if support_count>=8:continue
  print('Refine proximal skin support',name,support_count)
  distance=segment_distance(weld_pos,a,b)
  support=.60*np.exp(-(distance/.015)**2)*skin_confidence
  support*=weld_pos[:,0]>0 if side=='L' else weld_pos[:,0]<0
  welded*=1-support[:,None];welded[:,index[name]]+=support
weights=welded[inverse]
# glTF/Three.js use four influences per vertex; enforce the same limit in the source.
keep=np.argsort(weights,axis=1)[:,-4:];limited=np.zeros_like(weights)
np.put_along_axis(limited,keep,np.take_along_axis(weights,keep,axis=1),axis=1)
weights=limited/np.maximum(limited.sum(axis=1,keepdims=True),1e-9)
body.vertex_groups.clear()
for name in names:body.vertex_groups.new(name=name)
for i in range(n):
 for j in np.flatnonzero(weights[i]>.0001):body.vertex_groups[names[j]].add([i],float(weights[i,j]),'REPLACE')

scene=bpy.context.scene;scene.render.fps=30
# Sample constraints into keyframes on a separate export rig; retain editable IK in the .blend.
def curve(t,keys):
 for (a,va),(b,vb) in zip(keys,keys[1:]):
  if t<=b:
   u=max(0,min(1,(t-a)/(b-a)));u=u*u*(3-2*u);return va+(vb-va)*u
 return keys[-1][1]

def pose(clip,t,duration):
 for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
 phase=t/duration
 if clip=='Bow':
  gather=curve(t,[(0,0),(.8,1),(3.6,1),(4.8,0)])
  lean=curve(t,[(0,0),(.9,0),(1.9,1),(2.6,1),(3.7,0),(4.8,0)])
  rig.pose.bones['Torso'].rotation_euler.x=math.radians(25)*lean
  rig.pose.bones['Head'].rotation_euler.x=math.radians(10)*lean
  control=rig.pose.bones['Control_Grip']
  control.location=control.bone.matrix_local.to_3x3().inverted()@Vector((0,-.008*gather,.018*gather))
  control.rotation_euler.x=math.radians(2)*gather
  for side,sign in [('L',1),('R',-1)]:
   rig.pose.bones['Sleeve_'+side].rotation_euler.x=math.radians(-1.2)*curve(t,[(0,0),(1.1,1),(3.9,1),(4.8,0)])
   for digit in ['Thumb','Index','Middle','Ring','Little']:
    for j in range(1,4):rig.pose.bones[f'{digit}_{j:02}_{side}'].rotation_euler.z=math.radians(-sign*(1.2 if digit=='Thumb' else 2.8)/(1 if j==2 else 1.7))*gather
 elif clip=='Nod':rig.pose.bones['Head'].rotation_euler.x=math.radians(20)*math.sin(2*math.pi*phase)**2
 elif clip=='LookAround':
  # Imported upright bones use local Y along world Z: yaw is Y, not Z.
  turn=curve(t,[(0,0),(.55,.35),(1.4,1),(3.4,1),(4.5,.35),(5.4,0)])
  rig.pose.bones['Torso'].rotation_euler.y=math.radians(8)*turn
  rig.pose.bones['Head'].rotation_euler.y=math.radians(25)*turn
  rig.pose.bones['Head'].rotation_euler.x=math.radians(-4)*turn
 elif clip=='Talk':
  rig.pose.bones['Head'].rotation_euler.z=math.radians(1.4)*math.sin(2*math.pi*phase)
  rig.pose.bones['Torso'].rotation_euler.y=math.radians(.4)*math.sin(2*math.pi*phase)
 elif clip=='Idle':rig.pose.bones['Torso'].rotation_euler.y=math.radians(.35)*math.sin(2*math.pi*phase)
 bpy.context.view_layer.update()

# Bake evaluated matrices (including IK) into an identical constraint-free skeleton.
export_rig=rig.copy();export_rig.data=rig.data.copy();export_rig.name='PrincessRig_Baked';bpy.context.collection.objects.link(export_rig);export_rig.animation_data_clear()
for pb in export_rig.pose.bones:
 for constraint in list(pb.constraints):pb.constraints.remove(constraint)
clips=[('Idle',4.0),('Nod',2.2),('Bow',4.8),('LookAround',5.4),('Talk',3.0)]
for clip,duration in clips:
 action=bpy.data.actions.new(clip);export_rig.animation_data_create();export_rig.animation_data.action=action
 for frame in range(0,round(duration*30)+1):
  scene.frame_set(frame);pose(clip,frame/30,duration)
  for pb in export_rig.pose.bones:
   pb.rotation_mode='QUATERNION'
   desired=rig.pose.bones[pb.name].matrix.copy()
   basis=pb.bone.matrix_local.inverted()
   if pb.parent:basis=basis@pb.parent.bone.matrix_local@rig.pose.bones[pb.parent.name].matrix.inverted()
   pb.matrix_basis=basis@desired
   pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert('scale',frame=frame,group=pb.name)
 export_rig.animation_data.action=None
 track=export_rig.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,0,action);track.mute=True

# Add an editable, sparse authoring action to the original IK rig.
rig.animation_data_create();author=bpy.data.actions.new('Bow_Editable_IK');rig.animation_data.action=author
for frame in [0,12,24,27,45,57,78,108,111,132,144]:
 scene.frame_set(frame);pose('Bow',frame/30,4.8)
 for pb in rig.pose.bones:
  pb.keyframe_insert('location',frame=frame,group=pb.name);pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
for slot in author.slots:
 for layer in author.layers:
  for strip in layer.strips:
   for fc in strip.channelbag(slot).fcurves:
    for key in fc.keyframe_points:key.interpolation='LINEAR'
rig['asset_revision']=4;rig['rig_version']=3;rig['description']='Weighted arms, wrists, 30 finger joints and sleeves; shared grip IK; baked offering bow.'
export_rig['asset_revision']=4;rig['rig_version']=3;export_rig['description']=rig['description']
# Web export uses only the baked skeleton; the .blend keeps both rigs for editing.
for ob in [body,mouth]:
 for modifier in ob.modifiers:
  if modifier.type=='ARMATURE':modifier.object=export_rig
 ob.parent=export_rig
pose('Idle',0,4);scene.frame_set(0)
for ob in bpy.context.selected_objects:ob.select_set(False)
for ob in [export_rig,body,mouth]:ob.select_set(True)
bpy.context.view_layer.objects.active=export_rig
for track in export_rig.animation_data.nla_tracks:track.mute=False
bpy.ops.export_scene.gltf(filepath=str(WORK/'princess-arms-raw.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_nla_strips=True,export_def_bones=False,export_morph=True,export_skins=True,export_extras=True)
for track in export_rig.animation_data.nla_tracks:track.mute=True
# Keep the original IK rig as the editable preview, avoiding two visible copies.
for ob in [body,mouth]:
 for modifier in ob.modifiers:
  if modifier.type=='ARMATURE':modifier.object=rig
 ob.parent=rig
export_rig.hide_set(True);export_rig.hide_render=True
rig.animation_data.action=author;scene.frame_set(0)
bpy.context.view_layer.objects.active=rig
for label,choose in [
 ('01 Body',lambda n:n in ['Root','Torso','Head']),
 ('02 Arms and sleeves',lambda n:n.startswith(('Clavicle_','UpperArm_','Forearm_','Hand_','Sleeve_'))),
 ('03 Fingers',lambda n:n.startswith(('Thumb_','Index_','Middle_','Ring_','Little_'))),
 ('04 Grip controls',lambda n:n.startswith('Control_') or n=='Ruyi'),
]:
 collection=rig.data.collections.new(label)
 for bone in rig.data.bones:
  if choose(bone.name):collection.assign(bone)
scene.frame_start=0;scene.frame_end=144
for ob in bpy.context.selected_objects:ob.select_set(False)
rig.select_set(True);bpy.context.view_layer.objects.active=rig
for b in rig.data.bones:b.select=False
rig.data.bones.active=rig.data.bones['Control_Grip'];rig.data.bones['Control_Grip'].select=True
from mathutils import Quaternion
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=1.7;space.region_3d.view_location=(0,-.07,.50)
   space.region_3d.view_rotation=Quaternion((1,0,0),math.pi/2);space.region_3d.view_perspective='ORTHO';space.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'character/princess-arm-rig.blend'),compress=True)
report={'source':str(SOURCE.relative_to(ROOT)),'bone_count':len(rig.data.bones),'weighted_bones':{name:int((weights[:,index[name]]>.01).sum()) for name in names},'prop_vertices':int(prop.sum()),'hand_skin_vertices':int(hand_roi.sum()),'clips':dict(clips),'landmarks':landmarks}
(WORK/'rig-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
