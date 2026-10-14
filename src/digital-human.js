import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const preferredGesture = {
  nod: 'Nod',
  bow: 'Bow',
  look: 'LookAround',
};

export function createDigitalHuman(host, { onReady, onError } = {}) {
  let renderer;
  let model;
  let mixer;
  let active = false;
  let speaking = false;
  let lastBoundary = -Infinity;
  let thinking = false;
  let frame = 0;
  let last = performance.now();
  let blinkAt = last + 2200;
  let gestureTimer;
  const morphMeshes = [];
  const actions = new Map();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, 1, 0.01, 100);
  camera.position.set(0, 0.08, 7.6);

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    onError?.(error);
    return fallbackController();
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', '碧霞仙子数字人三维形象，可拖动查看');
  host.replaceChildren(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = false;
  controls.minDistance = 5.5;
  controls.maxDistance = 9.5;
  controls.minPolarAngle = Math.PI * 0.39;
  controls.maxPolarAngle = Math.PI * 0.61;
  controls.target.set(0, 0.2, 0);

  scene.add(new THREE.HemisphereLight(0xfff5df, 0x9ba9a2, 3.05));
  scene.add(new THREE.AmbientLight(0xfff3e3, 0.72));
  const key = new THREE.DirectionalLight(0xffe7c7, 3.55);
  key.position.set(3.5, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd3e6df, 1.85);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.65, 64),
    new THREE.MeshBasicMaterial({ color: 0x5d665d, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.setScalar(0.78);
  shadow.position.y = -1.74;
  scene.add(shadow);

  function fallbackController() {
    return {
      speechBoundary() {}, setActive() {}, setSpeaking() {}, setThinking() {}, gesture() {}, destroy() {},
    };
  }

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function setMorph(name, value) {
    for (const mesh of morphMeshes) {
      const index = mesh.morphTargetDictionary?.[name];
      if (index !== undefined) mesh.morphTargetInfluences[index] = value;
    }
  }

  function playBase(name, fade = 0.25) {
    const next = actions.get(name);
    if (!next) return;
    for (const [keyName, action] of actions) {
      if (keyName !== name && ['Idle', 'Talk', 'LookAround'].includes(keyName)) action.fadeOut(fade);
    }
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
  }

  function gesture(kind = 'nod') {
    if (!mixer) return;
    const name = preferredGesture[kind] || preferredGesture.nod;
    const action = actions.get(name);
    if (!action) return;
    clearTimeout(gestureTimer);
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.fadeIn(0.16).play();
    const duration = Math.max(700, (action.getClip().duration || 1.2) * 1000);
    gestureTimer = setTimeout(() => {
      action.fadeOut(0.22);
      playBase(speaking ? 'Talk' : (thinking ? 'LookAround' : 'Idle'));
    }, duration);
  }

  function frameLoop(now) {
    if (!active) return;
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    mixer?.update(delta);
    controls.update();

    if (model) {
      model.rotation.y += ((speaking ? 0.035 : 0) - model.rotation.y) * Math.min(1, delta * 2.2);
      const jaw = speaking ? Math.max(0, 1 - (now - lastBoundary) / 160) * .55 : 0;
      setMorph('jawOpen', jaw);
      setMorph('mouthRound', jaw * .25);
      const blinking = now > blinkAt && now < blinkAt + 135;
      setMorph('eyeBlinkLeft', blinking ? 1 : 0);
      setMorph('eyeBlinkRight', blinking ? 1 : 0);
      if (now >= blinkAt + 135) blinkAt = now + 2800 + Math.random() * 2600;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(frameLoop);
  }

  new GLTFLoader().load(import.meta.env.BASE_URL + 'models/princess-agent.glb', gltf => {
    model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 3.35 / Math.max(0.001, size.y);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale - 0.02, -center.z * scale);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = false;
      if (node.morphTargetDictionary && node.morphTargetInfluences) morphMeshes.push(node);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!material) continue;
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      }
    });
    scene.add(model);
    mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
    playBase('Idle', 0);
    resize();
    host.dataset.modelReady = 'true';
    onReady?.({ animations: [...actions.keys()] });
    if (active && !frame) frame = requestAnimationFrame(frameLoop);
  }, undefined, error => onError?.(error));

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    setActive(value) {
      active = value;
      if (active) {
        last = performance.now();
        if (!frame) frame = requestAnimationFrame(frameLoop);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    speechBoundary() { lastBoundary = performance.now(); },
    setSpeaking(value) {
      speaking = value;
      if (!value) lastBoundary = -Infinity;
      if (!mixer) return;
      playBase(value ? 'Talk' : (thinking ? 'LookAround' : 'Idle'));
    },
    setThinking(value) {
      thinking = value;
      if (!mixer || speaking) return;
      playBase(value ? 'LookAround' : 'Idle');
    },
    gesture,
    destroy() {
      active = false;
      cancelAnimationFrame(frame);
      clearTimeout(gestureTimer);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
