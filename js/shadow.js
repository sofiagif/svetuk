import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const container = document.getElementById("viewer");
const loadingOverlay = document.getElementById("loadingOverlay");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(0, 4, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0x1a1f2a, 0.18);
scene.add(ambient);

const mainLight = new THREE.DirectionalLight(0xe5ecff, 2.7);
mainLight.position.set(9.5, 2, 3);
mainLight.target.position.set(0, 0, 0);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(4096, 4096);
mainLight.shadow.camera.left = -12;
mainLight.shadow.camera.right = 12;
mainLight.shadow.camera.top = 12;
mainLight.shadow.camera.bottom = -12;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 35;
mainLight.shadow.bias = -0.0003;
mainLight.shadow.normalBias = 0.01;
scene.add(mainLight);
scene.add(mainLight.target);

const fillLight = new THREE.DirectionalLight(0xaecaff, 0.12);
fillLight.position.set(-4, 2, 2);
scene.add(fillLight);

const planeGeometry = new THREE.PlaneGeometry(40, 40);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0f0f0,
  roughness: 0.95,
  metalness: 0,
});
/* площина для приймання тіней */
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -0.002;
plane.receiveShadow = true;
scene.add(plane);

const loader = new GLTFLoader();
loader.load(
  "../models/shadow.glb",
  (gltf) => {
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    const scaleFactor = 4.5 / size;
    model.scale.setScalar(scaleFactor);
    model.position.sub(center.multiplyScalar(scaleFactor));
    model.position.y = 0;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
        if (child.material) {
          child.material.metalness = 0.2;
          child.material.roughness = 0.18;
        }
      }
    });

    scene.add(model);

    if (loadingOverlay) {
      loadingOverlay.style.display = "none";
    }
  },
  undefined,
  (error) => {
    console.error("Помилка завантаження shadow.glb:", error);
    if (loadingOverlay) {
      loadingOverlay.textContent = "Помилка завантаження моделі";
    }
  }
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 15;

const sliders = {
  x: document.getElementById("light-x"),
  y: document.getElementById("light-y"),
  z: document.getElementById("light-z"),
};

function updateLightPosition() {
  mainLight.position.set(
    parseFloat(sliders.x.value),
    parseFloat(sliders.y.value),
    parseFloat(sliders.z.value)
  );
}

Object.values(sliders).forEach((slider) =>
  slider.addEventListener("input", updateLightPosition)
);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
/* друга сцена */
const c2 = document.getElementById("second-model-container");
if (c2) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0xeeeeee);

  const cam = new THREE.PerspectiveCamera(
    45,
    c2.clientWidth / c2.clientHeight,
    0.1,
    20
  );
  cam.position.set(3, 2.5, 4);
  cam.lookAt(0, 1, 0);

  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setSize(c2.clientWidth, c2.clientHeight);
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.physicallyCorrectLights = true;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;
  c2.appendChild(r.domElement);

  s.add(new THREE.AmbientLight(0x2b3550, 0.15));
  /* світло другої сцени */
  const baseHeight = 3.5;

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(2.0, baseHeight, 2.5); 
  key.target.position.set(-0.25, 0.8, -0.5); 
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 1;
  s.add(key);
  s.add(key.target);

  const soft = new THREE.DirectionalLight(0xffffff, 0.5); 
  soft.position.set(1.9, baseHeight - 0.3, 1.9); 
  soft.target.position.set(-0.2, 0.7, -0.65); 
  soft.castShadow = true;
  soft.shadow.mapSize.set(4096, 4096); 
  soft.shadow.camera.left = -14; 
  soft.shadow.camera.right = 14;
  soft.shadow.camera.top = 14;
  soft.shadow.camera.bottom = -14;
  soft.shadow.camera.near = 0.05;
  soft.shadow.camera.far = 28;
  soft.shadow.radius = 22; 
  soft.shadow.bias = -0.0003;
  soft.shadow.normalBias = 0.12;
  s.add(soft);
  s.add(soft.target);

  const fill = new THREE.DirectionalLight(0xbfd7ff, 0.4);
  fill.position.set(-2, 3, -2);
  s.add(fill);

  const floorSizeX = 3;
  const floorSizeZ = 3;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSizeX, floorSizeZ),
    new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.9,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  s.add(floor);

  const wallHeight = 3;
  const wallOffset = 0.01;

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSizeX, wallHeight),
    wallMat
  );
  backWall.position.set(0, wallHeight / 2, -floorSizeZ / 2 + wallOffset);
  backWall.receiveShadow = true;
  s.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSizeZ, wallHeight),
    wallMat
  );
  leftWall.rotation.y = -Math.PI / 2;
  leftWall.position.set(floorSizeX / 2 - wallOffset, wallHeight / 2, 0);
  leftWall.receiveShadow = true;
  s.add(leftWall);

  const loader = new GLTFLoader();
  loader.load("../models/skittle.glb", (gltf) => {
    const m = gltf.scene;
    m.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
        o.material.roughness = 0.25;
        o.material.metalness = 0.1;
      }
    });

    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    const scale = 1.2 / size;
    m.scale.setScalar(scale);
    m.position.sub(center.multiplyScalar(scale));
    m.position.set(0, 0, -0.5);
    s.add(m);
  });

  const ctrl = new OrbitControls(cam, r.domElement);
  ctrl.enableDamping = true;
  ctrl.enablePan = false;

  const shadowYSlider = document.getElementById("shadow-y");
  if (shadowYSlider) {
    shadowYSlider.min = "2.5";
    shadowYSlider.max = "5.5";
    shadowYSlider.value = baseHeight.toString();
    
    shadowYSlider.addEventListener("input", (e) => {
      const newHeight = parseFloat(e.target.value);
      key.position.y = newHeight;
      soft.position.y = newHeight - 0.2;
    });
  }

  function anim() {
    requestAnimationFrame(anim);
    ctrl.update();
    r.render(s, cam);
  }
  anim();

  window.addEventListener("resize", () => {
    cam.aspect = c2.clientWidth / c2.clientHeight;
    cam.updateProjectionMatrix();
    r.setSize(c2.clientWidth, c2.clientHeight);
  });
}

const modelContainer = document.getElementById("second-model-container");
const sliderImage = document.getElementById("slider-image");
const prevBtn = document.querySelector(".prev-btn");
const nextBtn = document.querySelector(".next-btn");
const shadowSliderWrapper = document.querySelector(".prism-slider-wrapper");

const items = ["3d", "images/tinnap.png"];
let currentIndex = 0;

function updateDisplay() {
  if (items[currentIndex] === "3d") {
    modelContainer.style.display = "block";
    sliderImage.style.display = "none";

    if (shadowSliderWrapper) {
      shadowSliderWrapper.style.display = "flex";
    }
  } else {
    modelContainer.style.display = "none";
    sliderImage.style.display = "block";

    if (shadowSliderWrapper) {
      shadowSliderWrapper.style.display = "none";
    }
  }
}

if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    currentIndex--;
    if (currentIndex < 0) currentIndex = items.length - 1;
    updateDisplay();
  });
}

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    currentIndex++;
    if (currentIndex >= items.length) currentIndex = 0;
    updateDisplay();
  });
}

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

const infoSidebar = document.getElementById('infoSidebar');
const infoToggle = document.getElementById('infoToggle');

infoToggle.addEventListener('click', () => {
  infoSidebar.classList.toggle('open');
  infoToggle.textContent = infoSidebar.classList.contains('open') ? 'інформація ▶' : 'інформація ◀';
});

