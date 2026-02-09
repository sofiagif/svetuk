import * as THREE from "https://unpkg.com/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js";

const container = document.getElementById("viewer");
const loadingOverlay = document.getElementById("loadingOverlay");

let autoRotate = true;
let showSpectrum = true;

const BEAM_LENGTH = 16;
const UP = new THREE.Vector3(0, 1, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6f1eb);

// фон
const bgTexture = new THREE.TextureLoader().load("textures/bp2.png");
bgTexture.colorSpace = THREE.SRGBColorSpace;

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(50, 64, 64),
  new THREE.MeshBasicMaterial({
    map: bgTexture,
    side: THREE.BackSide
  })
);
scene.add(sky);

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(2, 1.5, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xfff5eb, 1.0));
scene.add(new THREE.HemisphereLight(0xffffff, 0xffe6d5, 0.7));

const mainLight = new THREE.DirectionalLight(0xffeec4, 2.3);
mainLight.position.set(-5, 1, 0);
scene.add(mainLight);

const mainLightTarget = new THREE.Object3D();
scene.add(mainLightTarget);
mainLight.target = mainLightTarget;

// геометрія призми
const prismGeometry = new THREE.CylinderGeometry(0, 1.8, 3.2, 3, 1);
prismGeometry.rotateY(Math.PI / 6);
prismGeometry.computeVertexNormals();

// матеріал
const prismMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 0.95,
  thickness: 0.6,
  roughness: 0,
  metalness: 0,
  ior: 1.52,
  clearcoat: 1,
  clearcoatRoughness: 0,
  side: THREE.DoubleSide
});

const prism = new THREE.Mesh(prismGeometry, prismMaterial);
scene.add(prism);

// площина
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({
    color: 0x5a4530,
    roughness: 0.7,
    emissive: 0x2a1810,
    emissiveIntensity: 0.08
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.5;
scene.add(floor);

// допоміжні промені
function createBeam(radius, color, opacity = 0.6) {
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.4, BEAM_LENGTH, 16, 1, true);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0,
    metalness: 0,
    transmission: 0.85,
    thickness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  return new THREE.Mesh(geometry, material);
}



// білий промінь
const whiteBeam = createBeam(0.08, 0xffeecc, 0.4);
whiteBeam.position.set(-8, 0, 0);
whiteBeam.rotation.z = Math.PI / 2;
scene.add(whiteBeam);

const whiteGlow = createBeam(0.14, 0xffd9b3, 0.15);
whiteGlow.position.copy(whiteBeam.position);
whiteGlow.rotation.copy(whiteBeam.rotation);
scene.add(whiteGlow);

// вихідні промені
const spectrumColors = [
  0xff6f61,  
  0xffb347,  
  0xffeb8a,  
  0x88d18a, 
  0x6acff6,  
  0x5b5bff,  
  0xbf85ff   
];

const spectrum = [];
const tempDir = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();

spectrumColors.forEach((color, i) => {
  const dispersion = (i - spectrumColors.length / 2) * 0.12;

  const light = new THREE.SpotLight(color, 4, 25, Math.PI / 28, 0.2);
  const target = new THREE.Object3D();
  scene.add(target, light);
  light.target = target;

  const beam = createBeam(0.05, color, 0.7);
  
  const glow = createBeam(0.08, color, 0.3);
  scene.add(beam, glow);

  spectrum.push({ light, target, beam, glow, dispersion });
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;


// повороти призми
const prismSlider = document.getElementById("prismAngle");

if (prismSlider) {
  prismSlider.addEventListener("input", () => {
    const angleDeg = Number(prismSlider.value);
    const angleRad = THREE.MathUtils.degToRad(angleDeg);

    prism.rotation.y = angleRad;
  });
}

// анімація спектру
function updateSpectrum() {
  spectrum.forEach(({ light, target, beam, glow, dispersion }) => {

    const baseAngle = -prism.rotation.y;
   const angleFactor = Math.max(0.15, Math.abs(Math.sin(prism.rotation.y)));

    const refraction = prismMaterial.ior - 1;
    const angle = baseAngle + dispersion * refraction * angleFactor * 1.8;

    const distance = 10;
    target.position.set(
      prism.position.x + Math.cos(angle) * distance,
      prism.position.y + dispersion * 4 * angleFactor,
      prism.position.z + Math.sin(angle) * distance
    );

    light.position.copy(prism.position);
    light.intensity = showSpectrum ? 4 * angleFactor : 0;

    tempDir.subVectors(target.position, prism.position);
    const len = Math.min(tempDir.length(), BEAM_LENGTH);
    tempDir.normalize();

    const center = prism.position.clone().addScaledVector(tempDir, len / 2);
    beam.position.copy(center);
    glow.position.copy(center);
    beam.scale.y = glow.scale.y = len / BEAM_LENGTH;

    tempQuat.setFromUnitVectors(UP, tempDir);
    beam.quaternion.copy(tempQuat);
    glow.quaternion.copy(tempQuat);

    beam.visible = glow.visible = showSpectrum;
  });
}

function animate() {
  requestAnimationFrame(animate);
  

  mainLightTarget.position.copy(prism.position);
  updateSpectrum();

  controls.update();
  renderer.render(scene, camera);
}

animate();

// адаптивність до екрану
window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// екран завантаження
if (loadingOverlay) {
  setTimeout(() => {
    loadingOverlay.style.display = "none";
  }, 500);
}

// Текст / Відео перемикач
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
// сайдбар
const infoSidebar = document.getElementById('infoSidebar');
const infoToggle = document.getElementById('infoToggle');

infoToggle.addEventListener('click', () => {
  infoSidebar.classList.toggle('open');
  infoToggle.textContent = infoSidebar.classList.contains('open') ? 'інформація ▶' : 'інформація ◀';
});
