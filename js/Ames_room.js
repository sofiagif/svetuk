import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Отримуємо елементи
const container = document.getElementById("viewer");
const loadingEl = document.getElementById("loading");
const overlay = document.getElementById("loadingOverlay");

// Сцена
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x252d32);

// Камера
const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

// Рендерер
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Контроль камери
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 50;

// Освітлення
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight1.position.set(5, 10, 5);
directionalLight1.castShadow = true;
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffd9b3, 0.4);
directionalLight2.position.set(-5, 5, -5);
scene.add(directionalLight2);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
const bottomLight = new THREE.DirectionalLight(0xa8bcc6, 0.3); // Додаткове освітлення знизу
bottomLight.position.set(0, -5, 0);
scene.add(bottomLight);


let model;
let mixer;
const clock = new THREE.Clock();

// Предвизначені позиції камери для кімнати Еймса
const cameraViews = {
    front: { position: [0, 0, 8], target: [0, 0, 0] },      
    side: { position: [8, 0, 0], target: [0, 0, 0] },      
    top: { position: [0, 8, 0], target: [0, 0, 0] },        
    diagonal: { position: [6, 4, 6], target: [0, 0, 0] }    
};

// Завантаження моделі
const loader = new GLTFLoader();

loader.load(
    "models/model.glb",
    function (gltf) {
        console.log("Модель завантажено:", gltf);
        model = gltf.scene;
        scene.add(model);
        overlay.style.display = "none";

        // розміри моделі
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.sub(center);
        
        // відстань камери
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180); // Конвертуємо в радіани
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.2; // 1.2 - запас
        
      

        // початковв позиція камери (фронтальний вид)
        setCameraView('front', false);
    },
);

// Функція для плавного переміщення камери
function setCameraView(viewName, animate = true) {
    const view = cameraViews[viewName];
    
    if (animate) {
        animateCameraTo(
            new THREE.Vector3(...view.position),
            new THREE.Vector3(...view.target)
        );
    } else {
        camera.position.set(...view.position);
        controls.target.set(...view.target);
        controls.update();
    }

}

// Плавна анімація переміщення камери
function animateCameraTo(targetPos, targetLookAt) {
    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();
    const duration = 1500; // мілісекунди
    const startTime = Date.now();

    function updateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-in-out функція для плавності
        const eased = progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;

        camera.position.lerpVectors(startPos, targetPos, eased);
        controls.target.lerpVectors(startLookAt, targetLookAt, eased);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(updateCamera);
        }
    }

    updateCamera();
}


// Анімаційний цикл
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    controls.update();
    renderer.render(scene, camera);
}
animate();

// Адаптивність при зміні розміру вікна
window.addEventListener("resize", () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Текст/Відео
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
// відкриття/закриття сайдбару
const infoSidebar = document.getElementById('infoSidebar');
const infoToggle = document.getElementById('infoToggle');

infoToggle.addEventListener('click', () => {
  infoSidebar.classList.toggle('open');
  infoToggle.textContent = infoSidebar.classList.contains('open') ? 'інформація ▶' : 'інформація ◀';
});