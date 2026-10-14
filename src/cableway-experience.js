import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createCablewayExperience(host, { onReady, onError, onProgress } = {}) {
  let renderer;
  let model;
  let active = false;
  let riding = true;
  let frame = 0;
  let rideStartedAt = performance.now();
  let baseY = 0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8eee9, 7.8, 17);
  const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 80);
  camera.position.set(3.5, 1.35, 7.4);

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    onError?.(error);
    return fallbackController();
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', '桃花源索道三维缆车，可拖动旋转并滚轮缩放');
  host.replaceChildren(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.autoRotate = false;
  controls.minDistance = 4.8;
  controls.maxDistance = 11.5;
  controls.minPolarAngle = Math.PI * 0.27;
  controls.maxPolarAngle = Math.PI * 0.72;
  controls.target.set(0, 0.15, 0);
  controls.update();

  scene.add(new THREE.HemisphereLight(0xfff6df, 0x6d817a, 3.2));
  scene.add(new THREE.AmbientLight(0xfff1dc, 0.85));
  const key = new THREE.DirectionalLight(0xffe0b5, 4.2);
  key.position.set(4.5, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb8ded9, 2.35);
  rim.position.set(-5, 2.5, -4);
  scene.add(rim);

  function fallbackController() {
    return {
      setActive() {}, setRide() {}, resetView() {}, destroy() {},
    };
  }

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function resetView() {
    camera.position.set(3.5, 1.35, 7.4);
    controls.target.set(0, 0.15, 0);
    controls.update();
  }

  function frameLoop(now) {
    if (!active) return;
    controls.update();
    if (model) {
      const elapsed = (now - rideStartedAt) / 1000;
      const sway = riding ? Math.sin(elapsed * 1.05) : 0;
      model.position.y += ((baseY + sway * 0.045) - model.position.y) * 0.06;
      model.rotation.z += (((riding ? Math.sin(elapsed * 0.72) : 0) * 0.012) - model.rotation.z) * 0.045;
      const progress = riding ? ((now - rideStartedAt) % 18000) / 18000 : 0;
      onProgress?.(progress);
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(frameLoop);
  }

  new GLTFLoader().load('/models/taohuayuan-cable-car.glb', gltf => {
    model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 4.4 / Math.max(0.001, size.x, size.y, size.z);
    model.scale.setScalar(scale);
    const scaledBounds = new THREE.Box3().setFromObject(model);
    const center = scaledBounds.getCenter(new THREE.Vector3());
    model.position.sub(center);
    baseY = model.position.y + 0.05;
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = false;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!material) continue;
        material.side = THREE.DoubleSide;
        if ('roughness' in material) material.roughness = Math.max(0.68, material.roughness || 0);
        if ('metalness' in material) material.metalness = Math.min(0.22, material.metalness || 0);
        material.needsUpdate = true;
      }
    });
    scene.add(model);
    resize();
    onReady?.();
    if (active && !frame) frame = requestAnimationFrame(frameLoop);
  }, event => {
    if (event.total) onProgress?.(Math.min(0.94, event.loaded / event.total), true);
  }, error => onError?.(error));

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    setActive(value) {
      active = value;
      if (active) {
        rideStartedAt = performance.now();
        if (!frame) frame = requestAnimationFrame(frameLoop);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    setRide(value) {
      riding = value;
      if (riding) rideStartedAt = performance.now();
    },
    resetView,
    destroy() {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
