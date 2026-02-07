import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/geometries/TextGeometry.js';

//базові константи
const MODEL_URL = 'models/mirror.glb';
const HDRI_URL = 'textures/studio_small_09_1k.jpg';
const container = document.getElementById('viewer');
const loadingOverlay = document.getElementById('loadingOverlay');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a3e);
scene.fog = new THREE.Fog(0x2a2a3e, 35, 100);

const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
container.appendChild(renderer.domElement);

//світло
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
mainLight.position.set(10, 20, 10);
scene.add(mainLight);

// гравець
function createPlayerBody() {
  const group = new THREE.Group();

  const matBody = new THREE.MeshStandardMaterial({
    color: 0x6699ff, metalness: 0.3, roughness: 0.6,
    emissive: 0x3366ff, emissiveIntensity: 0.4
  });
  const matSkin = new THREE.MeshStandardMaterial({
    color: 0xffe4c4, metalness: 0.1, roughness: 0.5
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.7, 16), matBody);
  body.position.y = -0.8;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), matSkin);
  head.position.y = 0.3;
  group.add(head);

  return group;
}

// рух персонажа
let controls, velocity = new THREE.Vector3(), direction = new THREE.Vector3();
const move = { forward: false, backward: false, left: false, right: false };
const speed = 9.0;
const damping = 6.0;
let walls = [];

function setupMovement(startPosition) {
  controls = new PointerLockControls(camera, renderer.domElement);
  container.addEventListener('click', () => { if (!controls.isLocked) controls.lock(); });
  controls.addEventListener('lock', () => (loadingOverlay.style.display = 'none'));
  scene.add(controls.getObject());

  controls.getObject().position.copy(startPosition);

  const playerBody = createPlayerBody();
  playerBody.position.y = -1.2;
  controls.getObject().add(playerBody);

  const keyHandler = (e, state) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': move.forward = state; break;
      case 'KeyS': case 'ArrowDown': move.backward = state; break;
      case 'KeyA': case 'ArrowLeft': move.left = state; break;
      case 'KeyD': case 'ArrowRight': move.right = state; break;
      case 'Escape': if (state && controls.isLocked) controls.unlock(); break;
    }
  };
  document.addEventListener('keydown', e => keyHandler(e, true));
  document.addEventListener('keyup', e => keyHandler(e, false));
}

// дзеркала
let mirrorCameras = [], mirrorMeshes = [];
function createMirrorMaterial(position) {
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
  cubeCamera.position.copy(position);
  scene.add(cubeCamera);

  const material = new THREE.MeshStandardMaterial({
    envMap: cubeRenderTarget.texture,
    metalness: 0.97, roughness: 0.05, color: 0xC1C5D7, side: THREE.DoubleSide
  });
  return { material, camera: cubeCamera };
}

function setupMaterials(root, envMap) {
  walls = [];
  root.traverse(obj => {
    if (obj.isMesh) {
      const name = obj.name.toLowerCase();
      if (name.includes('mirror')) {
        const { material, camera } = createMirrorMaterial(obj.position);
        obj.material = material;
        mirrorCameras.push(camera);
        mirrorMeshes.push(obj);
        walls.push(obj);
      } else if (name.includes('floor')) {
        obj.material = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 0.3, roughness: 0.7, envMap });
      
      }
    }
  });
}

function checkCollisions(pos) {
  const box = new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(1.0, 4.5, 1.0));
  return walls.some(w => box.intersectsBox(new THREE.Box3().setFromObject(w)));
}

// табличка входу
function addEntranceSign() {
  const fontLoader = new FontLoader();
  fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', font => {
    const textGeo = new TextGeometry('ENTER', {
      font,
      size: 0.8,
      height: 0.1,
      curveSegments: 8
    });
    const textMat = new THREE.MeshStandardMaterial({
      color: 0xe68a00,
      emissive: 0xe68a00,
      emissiveIntensity: 1,
      metalness: 0.4,
      roughness: 0.3
    });
    const textMesh = new THREE.Mesh(textGeo, textMat);
    textMesh.position.set(-14, 6, -2,5); 
    textMesh.rotation.y = -Math.PI / 2; 
    scene.add(textMesh);
  });
}

// завантаження моделі
const loader = new GLTFLoader();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const textureLoader = new THREE.TextureLoader();

textureLoader.load(HDRI_URL, texture => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;

  loader.load(
    MODEL_URL,
    gltf => {
      const root = gltf.scene;
      scene.add(root);
      setupMaterials(root, envMap);
      const startPosition = new THREE.Vector3(-16, 3, 0);

      setupMovement(startPosition);
      controls.getObject().rotation.y = -Math.PI / 2; // дивитися у бік таблички "ВХІД"
      addEntranceSign();

      loadingOverlay.textContent = 'Клікніть, щоб почати!';
      loadingOverlay.style.cursor = 'pointer';
    },
    xhr => loadingOverlay.textContent = `Завантаження: ${Math.round(xhr.loaded / xhr.total * 100)}%`,
    err => loadingOverlay.textContent = 'Помилка: ' + err.message
  );
});

// анімація
const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  frameCount++;

  if (controls && controls.isLocked) {
    velocity.x -= velocity.x * damping * delta;
    velocity.z -= velocity.z * damping * delta;

    direction.z = Number(move.forward) - Number(move.backward);
    direction.x = Number(move.right) - Number(move.left);
    direction.normalize();

    if (move.forward || move.backward) velocity.z -= direction.z * speed * delta;
    if (move.left || move.right) velocity.x -= direction.x * speed * delta;

    const moveX = velocity.x * delta;
    const moveZ = velocity.z * delta;
    const nextPos = controls.getObject().position.clone().add(new THREE.Vector3(-moveX, 0, -moveZ));

    if (!checkCollisions(nextPos)) {
      controls.moveRight(-moveX);
      controls.moveForward(-moveZ);
    }

    controls.getObject().position.y = 7;
  }

  if (frameCount % 10 === 0) {
    mirrorMeshes.forEach((m, i) => {
      if (mirrorCameras[i]) {
        m.visible = false;
        mirrorCameras[i].update(renderer, scene);
        m.visible = true;
      }
    });
  }

  renderer.render(scene, camera);
}
animate();

document.addEventListener("DOMContentLoaded", () => {
  const textBtn = document.getElementById("textBtn");
  const videoBtn = document.getElementById("videoBtn");
  const textContent = document.getElementById("textContent");
  const videoContent = document.getElementById("videoContent");

  if (textBtn && videoBtn && textContent && videoContent) {
    textBtn.addEventListener("click", () => {
      textBtn.classList.add("active");
      videoBtn.classList.remove("active");
      textContent.style.display = "block";
      videoContent.style.display = "none";
    });

    videoBtn.addEventListener("click", () => {
      videoBtn.classList.add("active");
      textBtn.classList.remove("active");
      textContent.style.display = "none";
      videoContent.style.display = "block";
    });
  }
});
// відкриття сайдбару
const infoSidebar = document.getElementById('infoSidebar');
const infoToggle = document.getElementById('infoToggle');

infoToggle.addEventListener('click', () => {
  infoSidebar.classList.toggle('open');
  infoToggle.textContent = infoSidebar.classList.contains('open') ? 'інформація ▶' : 'інформація ◀';
});