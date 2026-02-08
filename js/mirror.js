import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/geometries/TextGeometry.js';

/* =======================
   БАЗА
======================= */
const MODEL_URL = 'models/mirror.glb';
const HDRI_URL = 'textures/studio_small_09_1k.jpg';

const container = document.getElementById('viewer');
const loadingOverlay = document.getElementById('loadingOverlay');

const isMobile =
  matchMedia('(pointer: coarse)').matches ||
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/* =======================
   СЦЕНА / КАМЕРА / РЕНДЕР
======================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a3e);
scene.fog = new THREE.Fog(0x2a2a3e, 35, 100);

const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.domElement.style.touchAction = 'none';
container.appendChild(renderer.domElement);

/* resize */
function resize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

/* =======================
   СВЕТ
======================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

/* =======================
   ДВИЖЕНИЕ
======================= */
let controls;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const move = { forward: false, backward: false, left: false, right: false };
const speed = 9;
const damping = 6;

let walls = [];

/* мобильный поворот */
let started = false;
let yaw = 0;
let pitch = 0;
let startPosition = null;

/* =======================
   ПК УПРАВЛЕНИЕ
======================= */
function setupDesktopControls(pos) {
  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());
  controls.getObject().position.copy(pos);

  container.addEventListener('click', () => {
    if (!controls.isLocked) controls.lock();
  });

  controls.addEventListener('lock', () => {
    loadingOverlay.style.display = 'none';
  });

  document.addEventListener('keydown', e => {
    if (e.code === 'KeyW') move.forward = true;
    if (e.code === 'KeyS') move.backward = true;
    if (e.code === 'KeyA') move.left = true;
    if (e.code === 'KeyD') move.right = true;
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'KeyW') move.forward = false;
    if (e.code === 'KeyS') move.backward = false;
    if (e.code === 'KeyA') move.left = false;
    if (e.code === 'KeyD') move.right = false;
  });
}

/* =======================
   МОБИЛЬНЫЙ СТАРТ
======================= */
function startMobile() {
  if (started || !startPosition) return;
  started = true;

  camera.position.copy(startPosition);
  camera.position.y = 7;

  yaw = -Math.PI / 2;
  pitch = 0;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  loadingOverlay.style.display = 'none';
  document.getElementById('mobileControls').style.display = 'flex';
}

/* =======================
   TOUCH LOOK
======================= */
let touching = false;
let lastX = 0, lastY = 0;

renderer.domElement.addEventListener('touchstart', e => {
  if (!isMobile) return;
  startMobile();
  touching = true;
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
}, { passive: false });

renderer.domElement.addEventListener('touchmove', e => {
  if (!isMobile || !touching) return;
  e.preventDefault();

  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;

  yaw -= (x - lastX) * 0.004;
  pitch -= (y - lastY) * 0.004;

  const limit = Math.PI / 2 - 0.05;
  pitch = Math.max(-limit, Math.min(limit, pitch));

  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  lastX = x;
  lastY = y;
}, { passive: false });

renderer.domElement.addEventListener('touchend', () => touching = false);

/* =======================
   КНОПКИ
======================= */
document.querySelectorAll('.mbtn').forEach(btn => {
  const dir = btn.dataset.move;
  btn.addEventListener('pointerdown', () => {
    startMobile();
    move[dir] = true;
  });
  btn.addEventListener('pointerup', () => move[dir] = false);
  btn.addEventListener('pointerleave', () => move[dir] = false);
});

/* =======================
   КОЛЛИЗИИ
======================= */
function checkCollisions(pos) {
  const box = new THREE.Box3().setFromCenterAndSize(
    pos,
    new THREE.Vector3(1, 4.5, 1)
  );
  return walls.some(w =>
    box.intersectsBox(new THREE.Box3().setFromObject(w))
  );
}

/* =======================
   МАТЕРИАЛЫ / ЗЕРКАЛА
======================= */
let mirrorCameras = [];
let mirrorMeshes = [];

function setupMaterials(root, envMap) {
  walls = [];
  mirrorCameras = [];
  mirrorMeshes = [];

  root.traverse(obj => {
    if (!obj.isMesh) return;
    const name = obj.name.toLowerCase();

    if (name.includes('mirror')) {
      const rt = new THREE.WebGLCubeRenderTarget(256);
      const cam = new THREE.CubeCamera(0.1, 100, rt);
      cam.position.copy(obj.position);
      scene.add(cam);

      obj.material = new THREE.MeshStandardMaterial({
        envMap: rt.texture,
        metalness: 0.95,
        roughness: 0.05
      });

      mirrorCameras.push(cam);
      mirrorMeshes.push(obj);
      walls.push(obj);
    }
  });
}

/* =======================
   ТЕКСТ ENTER
======================= */
function addSign() {
  const fl = new FontLoader();
  fl.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', f => {
    const geo = new TextGeometry('ENTER', { font: f, size: 0.8, height: 0.1 });
    const mat = new THREE.MeshStandardMaterial({ color: 0xe68a00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-14, 6, -2.5);
    mesh.rotation.y = -Math.PI / 2;
    scene.add(mesh);
  });
}

/* =======================
   ЗАГРУЗКА
======================= */
const loader = new GLTFLoader();
const pmrem = new THREE.PMREMGenerator(renderer);
const texLoader = new THREE.TextureLoader();

texLoader.load(HDRI_URL, tex => {
  const env = pmrem.fromEquirectangular(tex).texture;
  scene.environment = env;

  loader.load(MODEL_URL, gltf => {
    const root = gltf.scene;
    scene.add(root);

    setupMaterials(root, env);
    startPosition = new THREE.Vector3(-16, 3, 0);

    addSign();

    loadingOverlay.textContent = isMobile
      ? 'Торкніться, щоб почати'
      : 'Клікніть, щоб почати';

    if (!isMobile) setupDesktopControls(startPosition);
  });
});

/* =======================
   АНИМАЦИЯ
======================= */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  velocity.x -= velocity.x * damping * dt;
  velocity.z -= velocity.z * damping * dt;

  direction.z = Number(move.forward) - Number(move.backward);
  direction.x = Number(move.right) - Number(move.left);
  direction.normalize();

  velocity.z -= direction.z * speed * dt;
  velocity.x -= direction.x * speed * dt;

  if (!isMobile && controls?.isLocked) {
    const dx = velocity.x * dt;
    const dz = velocity.z * dt;
    const next = controls.getObject().position.clone().add(new THREE.Vector3(-dx, 0, -dz));
    if (!checkCollisions(next)) {
      controls.moveRight(-dx);
      controls.moveForward(-dz);
    }
    controls.getObject().position.y = 7;
  }

  if (isMobile && started) {
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    const deltaPos = new THREE.Vector3()
      .addScaledVector(right, -velocity.x * dt)
      .addScaledVector(forward, -velocity.z * dt);

    const next = camera.position.clone().add(deltaPos);
    if (!checkCollisions(next)) camera.position.copy(next);
    camera.position.y = 7;
  }

  mirrorMeshes.forEach((m, i) => {
    m.visible = false;
    mirrorCameras[i].update(renderer, scene);
    m.visible = true;
  });

  renderer.render(scene, camera);
}

animate();
