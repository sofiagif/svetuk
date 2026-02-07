import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const viewer = document.getElementById("viewer");
const overlay = document.getElementById("loadingOverlay");

// сцена
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1114);

const camera = new THREE.PerspectiveCamera(45, viewer.clientWidth / viewer.clientHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);

// рендер 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewer.clientWidth, viewer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
viewer.appendChild(renderer.domElement);

//контроль
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// світло 
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const spot = new THREE.SpotLight(0xc99d6e, 1.4);
spot.position.set(2,5,3);
scene.add(spot);

// завантаження моделі
let clockModel;
new GLTFLoader().load(
  "models/clock.glb",
  gltf => {
    clockModel = gltf.scene;
    clockModel.rotation.y = Math.PI / 2;
    scene.add(clockModel);
    overlay.style.display = "none";
  },
  undefined,
  () => overlay.textContent = "Помилка завантаження моделі"
);

const rt = new THREE.WebGLRenderTarget(viewer.clientWidth*devicePixelRatio, viewer.clientHeight*devicePixelRatio);

// лінза
let lensMode = 0; // 0 none, 1 convex, 2 concave, 3 invert, 4 crazy

const lensMaterial = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    tDiffuse: { value: null },
    mode: { value: lensMode },
    power: { value: 2.5 },
    alpha: { value: 0 } 
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
uniform int mode;
uniform float power;
uniform float alpha;
varying vec2 vUv;

void main(){
    vec2 center = vec2(0.5);
    vec2 d = vUv - center;
    float dist = length(d);
    float mask = smoothstep(0.5, 0.45, dist);

    vec2 uv = d;

    if(mode == 1){ // convex (збиральна)
    float k = dist * dist;
    float shrink = 1.0 - 0.25 * k;
    float spread = 1.0 + power * k * 54.5;
    vec2 warped = d * spread * shrink;

    uv = warped;
}
    else if(mode == 2){ // concave (розсіювальна) 
        float k = dist * dist;
        uv = d / (1.0 + power * k * 3.0);
        float inv = smoothstep(0.18, 0.35, dist);
        uv = mix(uv, -uv * 0.6, inv);
    }
    
    else if(mode == 3){ // invert (перевернута)
        vec2 invD = -d;
        float k = smoothstep(0.15, 0.45, dist);
        uv = mix(invD, invD * 0.7, k);
}
    else if(mode == 4){ // crazy
        uv = d + 0.1 * sin(10.0 * d.y);
    }

    vec2 sampleUv = clamp(center + uv, 0.001, 0.999);
    vec4 color = texture2D(tDiffuse, sampleUv);

    gl_FragColor = vec4(color.rgb, alpha * mask);
}
  `
});

const lensMesh = new THREE.Mesh(new THREE.CircleGeometry(0.6, 64), lensMaterial);
lensMesh.position.set(0,0,-1);
camera.add(lensMesh);
scene.add(camera);

// кнопки
document.querySelectorAll(".lens-panel button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".lens-panel button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    lensMode = btn.dataset.lens==="convex"?1:
               btn.dataset.lens==="concave"?2:
               btn.dataset.lens==="invert"?3:
               btn.dataset.lens==="crazy"?4:0;
    lensMaterial.uniforms.mode.value = lensMode;
  });
});

// анмація появи лінзи
let targetAlpha = 0;
function updateAlpha(){
  targetAlpha = lensMode===0?0:1;
  lensMaterial.uniforms.alpha.value += (targetAlpha - lensMaterial.uniforms.alpha.value)*0.05; // плавное появление
}

// адаптивність до розміру екрана
window.addEventListener("resize", ()=>{
  camera.aspect = viewer.clientWidth / viewer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  rt.setSize(viewer.clientWidth*devicePixelRatio, viewer.clientHeight*devicePixelRatio);
});

// функція анімації
function animate(){
  requestAnimationFrame(animate);
  controls.update();
  updateAlpha();

  // сцена в текстуру
  lensMesh.visible = lensMode!==0;
  lensMesh.material.uniforms.tDiffuse.value = rt.texture;

  lensMesh.visible = false;
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);

  lensMesh.visible = true;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}

animate();

// Текст / Відео

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


