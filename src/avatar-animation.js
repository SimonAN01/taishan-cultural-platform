import { Quaternion, Vector3 } from 'three';

// The supplied rig has only Root, Torso and Head; keep gestures within that rig.
export function prepareAvatarClips(clips) {
  const axis = new Vector3();
  const q = new Quaternion();
  return clips.map(source => {
    const clip = source.clone();
    // Speech and blinking are driven from live audio and the render loop.
    clip.tracks = clip.tracks.filter(track => !track.name.endsWith('.morphTargetInfluences'));
    for (const track of clip.tracks) {
      if (!track.name.endsWith('.quaternion')) continue;
      const factor = clip.name === 'Nod' ? 3.2 : clip.name === 'Bow' ? (track.name.startsWith('Torso.') ? 4 : 2.5) : clip.name === 'LookAround' ? 3.3 : 1;
      if (factor === 1) continue;
      for (let i = 0; i < track.values.length; i += 4) {
        q.fromArray(track.values, i).normalize();
        if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
        const angle = 2 * Math.acos(Math.min(1, q.w));
        axis.set(q.x, q.y, q.z);
        if (axis.lengthSq() > 1e-12) q.setFromAxisAngle(axis.normalize(), Math.min(angle * factor, Math.PI / 3));
        q.toArray(track.values, i);
      }
    }
    return clip;
  });
}
