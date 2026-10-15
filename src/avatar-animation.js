// The authored asset contains the final authored amplitudes and baked arm/hand IK.
export function prepareAvatarClips(clips) {
  return clips.map(source => {
    const clip = source.clone();
    // Speech and blinking remain driven by live audio and the render loop.
    clip.tracks = clip.tracks.filter(track => !track.name.endsWith('.morphTargetInfluences'));
    return clip;
  });
}
