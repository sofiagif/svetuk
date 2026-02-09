import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// сцена і рендер
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const main = document.querySelector('main');
const bgContainer = document.createElement('div');
bgContainer.style.position = 'fixed';
bgContainer.style.top = '0';
bgContainer.style.left = '0';
bgContainer.style.width = '100%';
bgContainer.style.height = '100%';
bgContainer.style.zIndex = '-1';
main.appendChild(bgContainer);
bgContainer.appendChild(renderer.domElement);




const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,
  0.7,
  0
);
composer.addPass(bloomPass);

// переливаючі кольори
const fragmentShader = `
uniform float time;
uniform vec2 mouse;
varying vec2 vUv;

float noise(vec2 p) {
  return sin(p.x * 2.3 + p.y * 1.7 + time * 0.3) * 0.5 + 0.5;
}

vec3 palette(float t) {
  vec3 c1 = vec3(0.10, 0.10, 0.10);   // #191919
  vec3 c2 = vec3(0.21, 0.25, 0.22);   // #354038
  vec3 c3 = vec3(0.46, 0.54, 0.49);   // #75897E
  vec3 c4 = vec3(0.68, 0.48, 0.27);   // #AE7B46
  vec3 c5 = vec3(0.31, 0.21, 0.12);   // #4F3620

  vec3 base = mix(mix(c1, c2, t * 0.7), mix(c3, c4, t * 0.4), 0.5);
  return mix(base, c5, smoothstep(0.4, 1.0, t * 0.8));
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;

  // сильніше зміщення залежно від миші
  vec2 shift = (mouse - 0.5) * 1.6;
  vec2 p = uv + shift * 0.5;

  float n = noise(p * 3.0);
  float wave = sin((p.x * 1.8 + p.y * 1.8 + time * 0.9)) * 0.5 + 0.5;
  float combined = smoothstep(0.0, 1.0, n * 0.5 + wave * 0.5);

  vec3 col = palette(combined + sin(time * 0.6) * 0.15);

  // переливи реагують на мишу
  float mouseInfluence = smoothstep(0.2, 1.2, length(p - (mouse - 0.5) * 1.4));
  col += 0.15 * (1.0 - mouseInfluence);

  // динаміка кольору
  col += 0.05 * vec3(
    sin((p.x + mouse.x * 3.0 + time) * 1.6),
    cos((p.y + mouse.y * 2.5 + time) * 1.3),
    sin((p.x + p.y + time * 0.4) * 1.5)
  );

  // віньєтка
  float vignette = smoothstep(1.2, 0.3, length(uv));
  col *= vignette;
  gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    mouse: { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader,
  fragmentShader,
  transparent: true,
  blending: THREE.AdditiveBlending,
});

const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material);
scene.add(plane);

// рух від миші
const targetMouse = new THREE.Vector2(0.5, 0.5);
window.addEventListener('mousemove', (e) => {
  targetMouse.x = e.clientX / window.innerWidth;
  targetMouse.y = 1.0 - e.clientY / window.innerHeight;
});
// анімація
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  material.uniforms.time.value = clock.getElapsedTime();
  material.uniforms.mouse.value.lerp(targetMouse, 0.12); // плавний рух
  composer.render();
}
animate();

// адаптивність вікна
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
