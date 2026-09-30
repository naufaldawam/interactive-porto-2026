import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
// import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a0d);
scene.fog = new THREE.Fog(0x080a0d, 35, 180);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 500);
camera.position.set(8, 7, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enabled = false;

scene.add(new THREE.HemisphereLight(0xaabfff, 0x182018, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(25, 40, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.MeshStandardMaterial({ color: 0x171b20, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const grid = new THREE.GridHelper(260, 65, 0x26302b, 0x1b211e);
grid.position.y = .012; grid.material.opacity = .28; grid.material.transparent = true; scene.add(grid);

const colliders = [];
const interactables = [];

function box(x, y, z, w, h, d, color, name, text) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: .05 })
  );
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  if (name) { m.userData = { name, text }; interactables.push(m); }
  return m;
}

function label(text, x, y, z) {
  const c = document.createElement("canvas"), ctx = c.getContext("2d");
  c.width = 1024; c.height = 256;
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 72px Inter"; ctx.textAlign = "center"; ctx.fillText(text, 512, 145);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.position.set(x, y, z); sp.scale.set(8, 2, 1); scene.add(sp); return sp;
}

// Main road
box(0, -.04, 0, 14, .08, 160, 0x252a2e);
box(0, -.03, 0, 2.8, .09, 160, 0x15181b);

// Buildings / portfolio zones
const about = box(-22, 0, -28, 12, 10, 10, 0x24332c, "ABOUT", "Backend programmer focused on building reliable services, APIs, and practical systems.");
const projects = box(22, 0, -28, 14, 13, 12, 0x303024, "PROJECTS", "Selected work: MCU services, payment gateway systems, fleet management, and web applications.");
const skills = box(-22, 0, 28, 14, 9, 12, 0x252c3c, "SKILLS", "Java, Spring Boot, Golang, Node.js, .NET, React, PostgreSQL, SQL Server, Docker, Git.");
const contact = box(22, 0, 28, 12, 8, 10, 0x30232f, "CONTACT", "Let's build something useful. GitHub · LinkedIn · Email");

label("ABOUT", -22, 11.8, -28);
label("PROJECTS", 22, 14.8, -28);
label("SKILLS", -22, 10.8, 28);
label("CONTACT", 22, 9.8, 28);

// Decorative blocks
for (let i = 0; i < 34; i++) {
  const x = (Math.random() > .5 ? 1 : -1) * (16 + Math.random() * 32);
  const z = -65 + Math.random() * 130;
  const h = 2 + Math.random() * 10;
  if (Math.abs(x) < 18) continue;
  box(x, 0, z, 3 + Math.random() * 4, h, 3 + Math.random() * 4, 0x1e2428);
}

// Car
const car = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, .65, 4.3), new THREE.MeshStandardMaterial({ color: 0x8cff00, roughness: .3, metalness: .5 }));
body.position.y = .85; body.castShadow = true; car.add(body);
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, .65, 1.9), new THREE.MeshStandardMaterial({ color: 0x11161a, roughness: .1, metalness: .3 }));
cabin.position.set(0, 1.4, -.1); cabin.castShadow = true; car.add(cabin);
const wheelGeo = new THREE.CylinderGeometry(.43, .43, .28, 20);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: .9 });
for (const x of [-1.15, 1.15]) for (const z of [-1.45, 1.45]) {
  const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(x, .45, z); w.castShadow = true; car.add(w);
}
car.position.set(0, 0, 20); scene.add(car);

const keys = {};
addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true });
addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false });
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});

const info = document.querySelector("#info"), infoContent = document.querySelector("#infoContent");
document.querySelector("#closeInfo").onclick = () => info.classList.add("hidden");

function showInfo(obj) {
  infoContent.innerHTML = `<div class="eyebrow">INTERACT</div><h2>${obj.userData.name}</h2><div class="desc">${obj.userData.text}</div>`;
  info.classList.remove("hidden");
}

const ray = new THREE.Raycaster();
addEventListener("click", () => {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(interactables);
  if (hits.length) showInfo(hits[0].object);
});

let speed = 0, yaw = 0;
const clock = new THREE.Clock();

function updateCar(dt) {
  const forward = keys["w"] || keys["arrowup"];
  const back = keys["s"] || keys["arrowdown"];
  const left = keys["a"] || keys["arrowleft"];
  const right = keys["d"] || keys["arrowright"];
  if (forward) speed += 18 * dt;
  if (back) speed -= 14 * dt;
  if (!forward && !back) speed *= Math.pow(.08, dt);
  if (keys[" "]) speed *= Math.pow(.0008, dt);
  speed = THREE.MathUtils.clamp(speed, -7, 24);
  const steering = (left ? -1 : 0) + (right ? 1 : 0);
  yaw -= steering * dt * (1.8 + Math.min(Math.abs(speed), 15) * .07);
  car.rotation.y = yaw;
  car.translateZ(-speed * dt);
  car.position.y = 0;
  car.position.x = THREE.MathUtils.clamp(car.position.x, -58, 58);
  car.position.z = THREE.MathUtils.clamp(car.position.z, -72, 72);

  const target = new THREE.Vector3(0, 4.8, 10);
  target.applyQuaternion(car.quaternion);
  target.add(car.position);
  camera.position.lerp(target, 1 - Math.pow(.0001, dt));
  const look = new THREE.Vector3(0, 1, -5).applyQuaternion(car.quaternion).add(car.position);
  camera.lookAt(look);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  updateCar(dt);
  renderer.render(scene, camera);
}
animate();

setTimeout(() => {
  const l = document.querySelector("#loading"); l.style.opacity = "0"; setTimeout(() => l.remove(), 700);
}, 900);
