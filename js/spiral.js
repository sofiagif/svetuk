import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("viewer");
const loadingOverlay = document.getElementById("loadingOverlay");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
);

window.camera = camera;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 1.0));

const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(3, 4, 2);
dir.castShadow = true;
scene.add(dir);

const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x171417,
    roughness: 0.8,
    metalness: 0.05,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.2;
floor.receiveShadow = true;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = true;
controls.enablePan = true;
controls.enableZoom = true;
window.controls = controls;

let modelRoot = null;
window.modelRoot = null;

const loader = new GLTFLoader();
loader.load(
    "models/spiral.glb",

    (gltf) => {
        modelRoot = gltf.scene;
        window.modelRoot = modelRoot;
        modelRoot.traverse((child) => {
            if (child.isMesh) {
                console.log("MESH:", child.name);
                console.log("MATERIAL:", child.material);

                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material.map) {
                    child.material.map.colorSpace = THREE.SRGBColorSpace;
                }
            }
        });

        // адаптивність до
        const tempBox = new THREE.Box3().setFromObject(modelRoot);
        const tempSize = new THREE.Vector3();
        tempBox.getSize(tempSize);
        const maxDim = Math.max(tempSize.x, tempSize.y, tempSize.z);

        const scale = 1.2 / maxDim;
        modelRoot.scale.setScalar(scale);
        modelRoot.updateMatrixWorld(true);
 /* центрування моделі */
        const box = new THREE.Box3().setFromObject(modelRoot);
        const center = new THREE.Vector3();
        box.getCenter(center);

        modelRoot.position.sub(center);
        modelRoot.updateMatrixWorld(true);

        scene.add(modelRoot);

        camera.position.set(-1.84, 0.09, 0.03);
        controls.target.set(0, 0, 0);
        controls.update();

        if (loadingOverlay) loadingOverlay.style.display = "none";
    },

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
/* перемикання текст / відео */
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