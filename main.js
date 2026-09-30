import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// ------------------------------------------------------------
// WORLD
// ------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd2f4);
scene.fog = new THREE.FogExp2(0x8bc9e8, 0.0062);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 420);
camera.position.set(0, 13.2, 20);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.48;
document.body.appendChild(renderer.domElement);

// ------------------------------------------------------------
// LIGHTING
// ------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xeaf8ff, 0x66815f, 3.05);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xfff3d6, 4.5);
moon.position.set(-28, 45, 18);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -90;
moon.shadow.camera.right = 90;
moon.shadow.camera.top = 90;
moon.shadow.camera.bottom = -90;
scene.add(moon);

const fill = new THREE.DirectionalLight(0xb7dcff, 1.8);
fill.position.set(35, 18, -40);
scene.add(fill);

// Day/night state. Day is the default.
let worldMode = "day";
const worldModeLabel = {
  day: "☀ DAY",
  night: "☾ NIGHT"
};

function applyWorldMode(mode, instant=false) {
  worldMode = mode;

  const isDay = mode === "day";
  const bgTarget = isDay ? 0x9fd8ff : 0x0a0714;
  const fogTarget = isDay ? 0x8fc7e8 : 0x160f2a;

  // Smoothly changing these colors every frame would be more complex than needed;
  // set them immediately when switching modes for a crisp toggle.
  scene.background.setHex(bgTarget);
  scene.fog.color.setHex(fogTarget);

  hemi.color.setHex(isDay ? 0xdff4ff : 0x8a7cff);
  hemi.groundColor.setHex(isDay ? 0x5b625d : 0x1b1327);
  hemi.intensity = isDay ? 2.35 : 1.25;

  moon.color.setHex(isDay ? 0xfff0cf : 0x8994ff);
  moon.intensity = isDay ? 4.25 : 2.2;
  moon.position.set(isDay ? -28 : -20, isDay ? 45 : 31, isDay ? 18 : 10);

  fill.color.setHex(isDay ? 0x9cc9ff : 0x7f34ff);
  fill.intensity = isDay ? 1.8 : 1.05;

  renderer.toneMappingExposure = isDay ? 1.28 : 1.16;

  lampPosts.forEach(({light, bulb}) => {
    light.intensity = isDay ? 0.05 : 3.8;
    bulb.material.emissiveIntensity = isDay ? 0.08 : 6;
  });
  if(typeof fireflies !== "undefined") fireflies.forEach(p=>p.visible=!isDay);

  const switcher = document.querySelector("#modeToggle");
  if (switcher) {
    switcher.textContent = worldModeLabel[worldMode];
    switcher.setAttribute("aria-label", isDay ? "Switch to night" : "Switch to day");
    switcher.classList.toggle("night", !isDay);
  }
}

function toggleWorldMode() {
  applyWorldMode(worldMode === "day" ? "night" : "day");
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
const colliders = [];
const zones = [];
let fireflies = [];

function mat(color, roughness=.75, metalness=.05, emissive=null, ei=0) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: ei
  });
}

function block(x,y,z,w,h,d,material, collide=false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
  m.position.set(x,y+h/2,z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  if(collide) colliders.push({x,z,w,d});
  return m;
}

function cyl(x,y,z,r,h,material,segments=10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);
  m.position.set(x,y+h/2,z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function makeTextSprite(text, options={}) {
  const {
    color = "#ffffff", size = 58, width = 1000,
    height = 240, weight = 800
  } = options;
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Inter, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width/2, height/2 + 3);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.scale.set(7.3,1.75,1);
  return sprite;
}

function placeLabel(text,x,y,z,color="#ffffff") {
  const s = makeTextSprite(text,{color});
  s.position.set(x,y,z);
  scene.add(s);
  return s;
}

function roundedPlate(w,h,color) {
  const g = new THREE.Shape();
  const r = .18;
  g.moveTo(-w/2+r,-h/2); g.lineTo(w/2-r,-h/2);
  g.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
  g.lineTo(w/2,h/2-r); g.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
  g.lineTo(-w/2+r,h/2); g.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
  g.lineTo(-w/2,-h/2+r); g.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geo = new THREE.ShapeGeometry(g);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,side:THREE.DoubleSide}));
  return mesh;
}

// ------------------------------------------------------------
// GROUND / ASPHALT ROAD — ORIGINAL SIMPLE ROAD LANGUAGE
// ------------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(360,360),
  mat(0x76aa6f,.98)
);
ground.rotation.x=-Math.PI/2;
ground.receiveShadow=true;
scene.add(ground);

// Dark asphalt, exactly like the original direction: one road, long and
// continuous, with a normal sidewalk around it. No road grid.
const road = mat(0x30353a,.92,.02);
road.side=THREE.DoubleSide;
const sidewalk = mat(0xc5c3be,.94);
sidewalk.side=THREE.DoubleSide;
const curb = mat(0xd8d5cf,.78,.03);
curb.side=THREE.DoubleSide;
const laneMark = mat(0xd9d7d4,.68,.02);
laneMark.side=THREE.DoubleSide;

// The road stays perfectly centered around the car for the whole near/mid
// section. The bend only starts farther away, so the player sees equal
// asphalt + sidewalk on both sides instead of a skewed road.
const roadPoints=[
  new THREE.Vector3(0,0,150),
  new THREE.Vector3(0,0,125),
  new THREE.Vector3(0,0,100),
  new THREE.Vector3(0,0,75),
  new THREE.Vector3(0,0,50),
  new THREE.Vector3(0,0,25),
  new THREE.Vector3(0,0,0),
  new THREE.Vector3(0,0,-25),
  new THREE.Vector3(0.15,0,-50),
  new THREE.Vector3(0.7,0,-75),
  new THREE.Vector3(1.8,0,-100),
  new THREE.Vector3(3.2,0,-125),
  new THREE.Vector3(4.5,0,-150)
];
const roadCurve=new THREE.CatmullRomCurve3(roadPoints,false,"catmullrom",.25);

// Build ONE polygon for the entire asphalt surface. This avoids the
// disappearing-ribbon problem and guarantees a single continuous road.
function roadPolygon(curve,width,y,samples=420,material=road){
  const left=[],right=[];
  for(let i=0;i<=samples;i++){
    const t=i/samples;
    const p=curve.getPointAt(t);
    const tangent=curve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
    left.push([p.x+side.x*width/2,y,p.z+side.z*width/2]);
    right.push([p.x-side.x*width/2,y,p.z-side.z*width/2]);
  }
  const shape=new THREE.Shape();
  shape.moveTo(left[0][0],-left[0][2]);
  for(let i=1;i<left.length;i++) shape.lineTo(left[i][0],-left[i][2]);
  for(let i=right.length-1;i>=0;i--) shape.lineTo(right[i][0],-right[i][2]);
  shape.closePath();
  const geo=new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geo,material);
  mesh.position.y=y;
  mesh.receiveShadow=true;
  scene.add(mesh);
  return mesh;
}

// Sidewalk first, asphalt on top. Both are single continuous surfaces.
roadPolygon(roadCurve,24.0,.035,420,sidewalk);
roadPolygon(roadCurve,16.0,.105,420,road);

// Continuous curbs follow the road edge.
function edgeCurve(curve,offset,samples=120){
  const pts=[];
  for(let i=0;i<samples;i++){
    const t=i/(samples-1);
    const p=curve.getPointAt(t);
    const tan=curve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(-tan.z,0,tan.x).normalize();
    pts.push(p.clone().addScaledVector(side,offset));
  }
  return new THREE.CatmullRomCurve3(pts,false,"catmullrom",.25);
}
function thinCurve(curve,width,y,material,samples=180){
  const pts=[];
  for(let i=0;i<samples;i++){
    const p=curve.getPointAt(i/(samples-1));
    p.y=y;pts.push(p);
  }
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:material.color,transparent:true,opacity:.9}));
  line.scale.x=1;
  scene.add(line);
  return line;
}
thinCurve(edgeCurve(roadCurve,-8.12),.2,.17,curb,240);
thinCurve(edgeCurve(roadCurve,8.12),.2,.17,curb,240);
const roadEdgeMat=new THREE.MeshBasicMaterial({color:0xf4f2ec,transparent:true,opacity:.9,side:THREE.DoubleSide});
thinCurve(edgeCurve(roadCurve,-7.86),.18,.185,roadEdgeMat,240);
thinCurve(edgeCurve(roadCurve,7.86),.18,.185,roadEdgeMat,240);

// Sidewalk tile seams: subtle modular paving detail, kept perfectly off the asphalt.
const sidewalkSeamMat=new THREE.MeshBasicMaterial({color:0x9d9c9c,transparent:true,opacity:.42,side:THREE.DoubleSide});
for(let i=4;i<41;i++){
  const t=i/42;
  const p=roadCurve.getPointAt(t);
  const tangent=roadCurve.getTangentAt(t).normalize();
  const angle=Math.atan2(tangent.x,tangent.z);
  for(const sideSign of [-1,1]){
    const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
    const tileCenter=p.clone().addScaledVector(side,sideSign*10.05);
    const seam=new THREE.Mesh(new THREE.BoxGeometry(3.65,.018,.06),sidewalkSeamMat);
    seam.position.set(tileCenter.x,.075,tileCenter.z);
    seam.rotation.y=angle;
    seam.receiveShadow=false;
    scene.add(seam);
  }
}

// Center markings are real flat asphalt-road stripes, not screen-facing lines.
// Every dash is placed on the exact curve center, so left/right road width
// remains equal around it.
function addRoadDashes(curve){
  const stripeMat=new THREE.MeshBasicMaterial({
    color:0xd9d7d4,
    transparent:true,
    opacity:.92,
    side:THREE.DoubleSide
  });

  const count=24;
  for(let i=0;i<count;i++){
    const t0=i/count+.012;
    const t1=Math.min(t0+.024, .99);
    const tm=(t0+t1)/2;
    const p=curve.getPointAt(tm);
    const tangent=curve.getTangentAt(tm).normalize();

    const dash=new THREE.Mesh(
      new THREE.BoxGeometry(.28,.035,4.2),
      stripeMat
    );
    dash.position.set(p.x,.17,p.z);
    dash.rotation.y=Math.atan2(tangent.x,tangent.z);
    dash.receiveShadow=false;
    scene.add(dash);
  }
}
addRoadDashes(roadCurve);

// Small driveway pads branch off the same asphalt, only where needed.
function driveway(x,z){
  let bestT=0,best=Infinity;
  for(let i=0;i<=160;i++){
    const t=i/160,p=roadCurve.getPointAt(t);
    const d=(p.x-x)**2+(p.z-z)**2;
    if(d<best){best=d;bestT=t;}
  }
  const rp=roadCurve.getPointAt(bestT);
  const a=rp.clone();
  const b=new THREE.Vector3((rp.x+x)/2,0,(rp.z+z)/2);
  const c=new THREE.Vector3(x,0,z);
  const dc=new THREE.CatmullRomCurve3([a,b,c],false,"catmullrom",.18);
  roadPolygon(dc,5.2,.125,90,road);
  roadPolygon(dc,7.0,.085,90,sidewalk);
}
driveway(-24,-31);
driveway(24,-31);
driveway(-24,31);
driveway(24,31);

// No decorative pad under the car: the continuous road surface itself is enough.

// ------------------------------------------------------------
// GRASS PATCHES / LOW-POLY FOLIAGE
// ------------------------------------------------------------
const grassMat=mat(0x3e654f,.98);
const grassTip=mat(0x54775b,.95);

function grassClump(x,z,scale=1){
  const g=new THREE.Group();

  for(let i=0;i<4;i++){
    const blade=new THREE.Mesh(
      new THREE.ConeGeometry(.13*scale,.65*scale,5),
      grassTip
    );
    blade.position.set(
      (Math.random()-.5)*.75*scale,
      .32*scale,
      (Math.random()-.5)*.75*scale
    );
    blade.rotation.z=(Math.random()-.5)*.18;
    blade.rotation.x=(Math.random()-.5)*.18;
    blade.castShadow=true;
    g.add(blade);
  }

  const base=new THREE.Mesh(
    new THREE.IcosahedronGeometry(.42*scale,1),
    grassMat
  );
  base.position.y=.25*scale;
  base.scale.y=.48;
  base.castShadow=true;
  g.add(base);

  g.position.set(x,0,z);
  scene.add(g);
}

for(let i=0;i<420;i++){
  const x=(Math.random()-.5)*150;
  const z=(Math.random()-.5)*155;

  // Keep the immediate road corridor clean.
  if(Math.abs(x)<15 && Math.abs(z)<140) continue;
  grassClump(x,z,.65+Math.random()*.8);
}

// Trees with rounded, clustered crowns instead of sharp geometry.
const trunkMat=mat(0x493b36,.98);
const leafMats=[
  mat(0x4f8a4d,.96),
  mat(0x63a254,.96),
  mat(0x76a85d,.97)
];

function tree(x,z,s=1){
  cyl(x,0,z,.22*s,2.15*s,trunkMat,9);
  const g=new THREE.Group();

  for(let i=0;i<4;i++){
    const leaf=new THREE.Mesh(
      new THREE.IcosahedronGeometry((1.15+Math.random()*.35)*s,1),
      leafMats[i%leafMats.length]
    );
    leaf.position.set(
      (Math.random()-.5)*.6*s,
      2.45*s+(i%2)*.45*s,
      (Math.random()-.5)*.6*s
    );
    leaf.scale.y=.9;
    leaf.rotation.set(Math.random()*.35,Math.random(),Math.random()*.35);
    leaf.castShadow=true;
    leaf.receiveShadow=true;
    g.add(leaf);
  }

  g.position.set(x,0,z);
  scene.add(g);
}

const treeSpots=[
  [-39,-42,1.0],[-48,-17,.8],[-42,16,1.0],[-50,48,.9],
  [38,-50,.9],[47,-28,1.1],[43,5,.85],[50,34,1.05],
  [-38,75,.85],[42,82,.9],[-50,105,1.0],[48,110,.85],
  [-36,132,.9],[40,132,1.0],
  [-26,-105,.8],[26,-105,.82],[-27,-78,.78],[27,-78,.8],
  [-27,78,.82],[27,78,.82],[-26,105,.88],[26,105,.9],
  [-44,-118,.95],[44,-118,.95],[-45,118,.95],[45,118,.95]
];
treeSpots.forEach(p=>tree(...p));

// Boulevard landscaping: trees and shrubs frame the parking areas like a small city block.
const boulevardTrees=[
  [-17,-52,.72],[-17,-20,.82],[-17,18,.75],[-17,52,.9],
  [17,-52,.76],[17,-20,.88],[17,18,.8],[17,52,.92],
  [-33,-56,.95],[-33,-8,.78],[-33,48,.9],[-33,92,.82],
  [33,-56,.9],[33,-8,.82],[33,48,.95],[33,92,.85]
];
boulevardTrees.forEach(p=>tree(...p));

function shrub(x,z,s=1){
  const m=mat([0x5f8d48,0x6d9b52,0x789f5c][Math.floor(Math.random()*3)],.98);
  const g=new THREE.Group();
  for(let i=0;i<3;i++){
    const q=new THREE.Mesh(new THREE.IcosahedronGeometry(.42*s,1),m);
    q.position.set((Math.random()-.5)*.7*s,.32*s,(Math.random()-.5)*.7*s);
    q.scale.y=.7; q.castShadow=true; g.add(q);
  }
  g.position.set(x,0,z); scene.add(g);
}
for(const [x,z] of [[-18,-47],[-18,-15],[-18,22],[-18,57],[18,-47],[18,-15],[18,22],[18,57],[-31,-47],[-31,40],[31,-47],[31,40]]) shrub(x,z,.9);

// Extra city-life dressing: more small landscaping clusters and pedestrian furniture,
// all kept outside the driving surface.
for(const [x,z,s] of [
  [-29,-72,1.0],[-20,-72,.8],[20,-72,.85],[29,-72,1.05],
  [-30,-18,.85],[30,-18,.9],[-30,18,.9],[30,18,.85],
  [-30,72,1.0],[-20,72,.8],[20,72,.85],[30,72,1.0],
  [-38,-88,.95],[38,-88,1.0],[-38,88,1.0],[38,88,.95],
  [-49,-74,1.1],[49,-74,1.05],[-49,-20,1.0],[49,-20,1.0],
  [-49,22,1.0],[49,22,1.1],[-49,76,1.05],[49,76,1.0],
  [-57,-115,1.1],[57,-115,1.1],[-57,112,1.1],[57,112,1.05]
]) {
  shrub(x,z,s);
}

function planter(x,z,s=1){
  const pot=mat(0x77726b,.9,.2);
  const green=mat(0x4f8248,.95);
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.48*s,.58*s,.5*s,10),pot);
  base.position.y=.25*s; base.castShadow=true; g.add(base);
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.58*s,1),green);
  crown.position.y=.9*s; crown.scale.y=1.15; crown.castShadow=true; g.add(crown);
  g.position.set(x,0,z); scene.add(g);
}
for(const [x,z] of [
  [-15.2,-31],[15.2,-31],[-15.2,31],[15.2,31],[-15.2,-62],[15.2,-62],[-15.2,62],[15.2,62],
  [-19,-49],[19,-49],[-19,49],[19,49],[-39,-48],[39,-48],[-39,48],[39,48]
]) planter(x,z,.9);

// Dense landscape islands: short hedges, flowering shrubs and tree groupings.
function hedgeStrip(x,z,length=6,rot=0){
  const g=new THREE.Group();
  const m=mat(0x4b7f45,.97);
  for(let i=0;i<Math.max(2,Math.floor(length));i++){
    const q=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),m);
    q.position.set((i-(length-1)/2)*.9,.45,(Math.random()-.5)*.35);
    q.scale.set(1.15,.72,.8); q.castShadow=true; g.add(q);
  }
  g.position.set(x,0,z); g.rotation.y=rot; scene.add(g);
}
for(const [x,z,l,r] of [
  [-20,-48,7,0],[20,-48,7,0],[-20,48,7,0],[20,48,7,0],
  [-36,-60,6,Math.PI/2],[36,-60,6,-Math.PI/2],[-36,60,6,Math.PI/2],[36,60,6,-Math.PI/2],
  [-50,-26,5,0],[50,-26,5,0],[-50,26,5,0],[50,26,5,0]
]) hedgeStrip(x,z,l,r);

// ------------------------------------------------------------
// LAMPS — placed along the actual asphalt route
// ------------------------------------------------------------
const lampPosts=[];
function lamp(x,z){
  const postMat=mat(0x35343b,.45,.35);
  cyl(x,0,z,.10,3.45,postMat,9);

  const glowMat=mat(0xffeab0,.18,.08,0xffa52d,5);
  const bulb=new THREE.Mesh(new THREE.BoxGeometry(.32,.44,.32),glowMat);
  bulb.position.set(x,3.35,z);
  bulb.castShadow=true;
  scene.add(bulb);

  const light=new THREE.PointLight(0xffa34c,3.6,10,.62);
  light.position.set(x,3.25,z);
  scene.add(light);
  lampPosts.push({light,bulb});
}

for(let i=1;i<=13;i++){
  const t=i/14;
  const p=roadCurve.getPointAt(t);
  const tangent=roadCurve.getTangentAt(t).normalize();
  const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
  const left=p.clone().addScaledVector(side,9.25);
  const right=p.clone().addScaledVector(side,-9.25);
  lamp(left.x,left.z);
  lamp(right.x,right.z);
}

applyWorldMode("day");

// ------------------------------------------------------------
// FLOATING PORTFOLIO POPUPS
// ------------------------------------------------------------
function makePopupSprite(title, subtitle, accent="#b7ff00") {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 420;
  const ctx = c.getContext("2d");

  function roundRect(x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  ctx.clearRect(0,0,c.width,c.height);

  // shadow / panel
  ctx.fillStyle = "rgba(5, 3, 12, 0.88)";
  roundRect(70,45,1060,285,28);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 5;
  roundRect(70,45,1060,285,28);
  ctx.stroke();

  // accent line
  ctx.fillStyle = accent;
  roundRect(70,45,18,285,9);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "700 27px Inter, Arial";
  ctx.textAlign = "left";
  ctx.fillText("PORTFOLIO ZONE", 125, 105);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 70px Inter, Arial";
  ctx.fillText(title, 125, 188);

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "500 28px Inter, Arial";
  ctx.fillText(subtitle, 125, 245);

  ctx.fillStyle = accent;
  ctx.font = "800 24px Inter, Arial";
  ctx.fillText("PARKED  •  PRESS E TO OPEN", 125, 293);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,
    transparent:true,
    depthWrite:false,
    opacity:0
  }));

  sprite.scale.set(9.5,3.35,1);
  sprite.userData.baseY = 0;
  return sprite;
}

const popupDefinitions = {
  ABOUT: {
    title:"ABOUT ME",
    subtitle:"Backend Programmer • APIs • Systems"
  },
  PROJECTS: {
    title:"PROJECTS",
    subtitle:"MCU • Payment Gateway • Fleet Management"
  },
  SKILLS: {
    title:"SKILLS",
    subtitle:"Java • Spring Boot • Golang • .NET • Docker"
  },
  CONTACT: {
    title:"CONTACT",
    subtitle:"GitHub • LinkedIn • Email"
  }
};

// ------------------------------------------------------------
// PORTFOLIO BUILDINGS
// ------------------------------------------------------------
const zoneData=[
  {
    name:"ABOUT", title:"About Naufal",
    text:"Backend Programmer who likes turning messy requirements into practical systems, services and APIs.",
    chips:["BACKEND","APIs","SYSTEMS"], pos:[-24,0,-31], color:0x533779
  },
  {
    name:"PROJECTS", title:"Selected Projects",
    text:"A small interactive showcase of MCU services, payment gateway work, fleet management and web applications.",
    chips:["MCU SERVICE","PAYMENT GATEWAY","FLEET MANAGEMENT"], pos:[24,0,-31], color:0x40532e
  },
  {
    name:"SKILLS", title:"Technology Stack",
    text:"Java, Spring Boot, Golang, Node.js, .NET, React, PostgreSQL, SQL Server, Docker and Git.",
    chips:["JAVA","SPRING BOOT","GOLANG","POSTGRESQL","DOCKER"], pos:[-24,0,31], color:0x314b59
  },
  {
    name:"CONTACT", title:"Let's Build Something",
    text:"Turn the corner, open the contact area and connect this scene to your real GitHub, LinkedIn and email.",
    chips:["GITHUB","LINKEDIN","EMAIL"], pos:[24,0,31], color:0x653852
  }
];

function roundedBuildingShape(w,d,r=.7){
  const shape=new THREE.Shape();
  shape.moveTo(-w/2+r,-d/2);
  shape.lineTo(w/2-r,-d/2);
  shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);
  shape.lineTo(w/2,d/2-r);
  shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);
  shape.lineTo(-w/2+r,d/2);
  shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);
  shape.lineTo(-w/2,-d/2+r);
  shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
  return shape;
}

function building(z){
  const [x,y,zp]=z.pos;
  const w=12.4,d=9.4,h=5.2;

  const geo=new THREE.ExtrudeGeometry(
    roundedBuildingShape(w,d,.75),
    {depth:h,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.22,bevelThickness:.16}
  );
  geo.rotateX(-Math.PI/2);

  const base=new THREE.Mesh(
    geo,
    mat(z.color,.68,.07)
  );
  base.position.set(x,.12,zp);
  base.castShadow=true;
  base.receiveShadow=true;
  scene.add(base);

  colliders.push({x,z:zp,w:w+.7,d:d+.7});

  // Soft roof with shallow overhang.
  const roofGeo=new THREE.ExtrudeGeometry(
    roundedBuildingShape(w+.5,d+.5,.82),
    {depth:.32,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.12,bevelThickness:.1}
  );
  roofGeo.rotateX(-Math.PI/2);
  const roof=new THREE.Mesh(roofGeo,mat(0x5d5969,.65,.16));
  roof.position.set(x,5.15,zp);
  roof.castShadow=true;
  scene.add(roof);

  // Windows are inset-looking flat panels, not protruding boxes.
  const winMat=mat(0xb8dded,.16,.3,0x5b9cb7,1.0);
  for(const dx of [-3.2,-1.1,1.1,3.2]){
    const win=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.25),winMat);
    win.position.set(x+dx,2.65,zp-d/2-.025);
    win.rotation.x=0;
    scene.add(win);

    const back=win.clone();
    back.position.z=zp+d/2+.025;
    back.rotation.y=Math.PI;
    scene.add(back);
  }

  // Front door with small canopy.
  const door=block(x,0,zp-d/2-.06,1.25,2.65,.10,mat(0x17171c,.28,.35));
  const canopy=block(x,2.72,zp-d/2-.22,2.0,.16,.7,mat(0x77717d,.7,.12));

  // Wider storefront glazing + mullions gives every portfolio building a more finished facade.
  const glassFrontMat=mat(0x8ebfd1,.12,.28,0x4d9bb6,.9);
  const storefront=new THREE.Mesh(new THREE.PlaneGeometry(5.7,1.62),glassFrontMat);
  storefront.position.set(x,2.25,zp-d/2-.075);
  scene.add(storefront);
  for(const dx of [-2.15,-.72,.72,2.15]){
    const mullion=new THREE.Mesh(new THREE.BoxGeometry(.075,1.65,.06),mat(0x26313a,.5,.3));
    mullion.position.set(x+dx,2.25,zp-d/2-.105);
    scene.add(mullion);
  }

  // Bright horizontal fascia makes the zone recognizable while driving past.
  const fasciaMat=mat(0xcfe5e9,.2,.16,0xa2d9e3,.8);
  const fascia=new THREE.Mesh(new THREE.BoxGeometry(6.4,.34,.12),fasciaMat);
  fascia.position.set(x,4.02,zp-d/2-.11);
  fascia.castShadow=true;
  scene.add(fascia);

  // Larger canopy + side fins give each building a readable street frontage.
  const canopyTop=new THREE.Mesh(new THREE.BoxGeometry(7.7,.18,1.0),mat(0x6d6975,.62,.14));
  canopyTop.position.set(x,3.45,zp-d/2-.52);
  canopyTop.castShadow=true;
  scene.add(canopyTop);
  for(const dx of [-3.25,3.25]){
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.16,2.9,.26),mat(0x222730,.48,.25));
    fin.position.set(x+dx,1.95,zp-d/2-.15);
    fin.castShadow=true;
    scene.add(fin);
  }

  // Large vertical road-facing sign.
  const signPostMat=mat(0x27282e,.52,.22);
  const signPost=new THREE.Mesh(new THREE.BoxGeometry(.13,4.0,.13),signPostMat);
  signPost.position.set(x+Math.sign(x)*3.55,2.0,zp-d/2-.7);
  signPost.castShadow=true;
  scene.add(signPost);

  const signPlate=new THREE.Mesh(new THREE.BoxGeometry(4.9,1.05,.16),mat(0x171a21,.44,.25));
  signPlate.position.set(x+Math.sign(x)*3.55,4.1,zp-d/2-.72);
  signPlate.castShadow=true;
  scene.add(signPlate);

  const lbl=placeLabel(z.name,x+Math.sign(x)*3.55,4.14,zp-d/2-.84,"#c7ff32");
  lbl.scale.set(3.9,.82,1);

  // Entrance planters keep the frontage detailed without touching the roadway.
  planter(x-2.35,zp-d/2-.65,.65);
  planter(x+2.35,zp-d/2-.65,.65);

  const definition=popupDefinitions[z.name] || {title:z.name,subtitle:z.title};
  const popup=makePopupSprite(definition.title,definition.subtitle);
  popup.position.set(x,10.7,zp);
  scene.add(popup);

  z.popup=popup;
  z.popupPhase=Math.random()*Math.PI*2;

  zones.push({...z,object:base});
}
zoneData.forEach(building);

// ------------------------------------------------------------
// ROAD-SIDE BUILDING SIGNS — readable while driving
// ------------------------------------------------------------
function buildingRoadSign(text,x,z,side){
  const g=new THREE.Group();
  const postMat=mat(0x202329,.6,.25);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,3.2,10),postMat);
  post.position.y=1.6; post.castShadow=true; g.add(post);

  const plate=roundedPlate(5.9,1.35,0x20252a);
  plate.position.set(0,3.05,0); plate.rotation.x=Math.PI/2; g.add(plate);

  const label=placeLabel(text,0,3.06,0,"#c7ff32");
  label.scale.set(3.6,.88,1); g.add(label);

  g.rotation.y = side < 0 ? Math.PI/2 : -Math.PI/2;
  g.position.set(x,0,z); scene.add(g);
}

buildingRoadSign("ABOUT",-12.8,-25,-1);
buildingRoadSign("PROJECTS",12.8,-25,1);
buildingRoadSign("SKILLS",-12.8,25,-1);
buildingRoadSign("CONTACT",12.8,25,1);

// Additional small directory pylons make the route readable before reaching a building.
for(const [label,x,z] of [["WORKS",-13.2,-68],["LAB",13.2,-68],["API",-13.2,66],["STACK",13.2,66]]){
  const pole=block(x,0,z,.10,2.8,.10,mat(0x282b31,.55,.2),false);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(3.9,.85,.12),mat(0x171a21,.45,.2));
  plate.position.set(x,3.0,z); plate.castShadow=true; scene.add(plate);
  const txt=placeLabel(label,x,3.04,z-.09,"#c7ff32"); txt.scale.set(2.7,.58,1);
}

// Smaller soft-edged houses in the distance.
for(let i=0;i<10;i++){
  const side=i%2===0?-1:1;
  const x=side*(32+Math.random()*28);
  const z=-125+i*25+(Math.random()-.5)*8;
  const w=4.5+Math.random()*2.5;
  const d=4.2+Math.random()*2.2;
  const h=2.7+Math.random()*2.4;

  const geo=new THREE.ExtrudeGeometry(
    roundedBuildingShape(w,d,.45),
    {depth:h,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.16,bevelThickness:.1}
  );
  geo.rotateX(-Math.PI/2);
  const house=new THREE.Mesh(geo,mat([0x6c526a,0x52677a,0x667452][i%3],.86));
  house.position.set(x,.05,z);
  house.castShadow=true;
  house.receiveShadow=true;
  scene.add(house);
}

// Benches — deliberately kept well outside the asphalt lane.
function bench(x,z,rot=0){
  const g=new THREE.Group();
  const wood=mat(0x5b372e,1);
  const leg=mat(0x31313b,1);
  for(const px of [-.95,.95]){
    const legMesh=new THREE.Mesh(new THREE.BoxGeometry(.13,.8,.15),leg);
    legMesh.position.set(px,.4,0);
    legMesh.castShadow=true;
    g.add(legMesh);
  }
  const seat=new THREE.Mesh(new THREE.BoxGeometry(2.25,.22,.72),wood);
  seat.position.y=.91; seat.castShadow=true; g.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(2.25,.18,.68),wood);
  back.position.set(0,1.48,.22); back.castShadow=true; g.add(back);
  g.position.set(x,0,z);
  g.rotation.y=rot;
  scene.add(g);
}
// Put benches on the outer side of each building, never on the road or driveway.
bench(-28,-42,.15);
bench(28,-42,-.15);
bench(-28,42,-.15);
bench(28,42,.15);

// ------------------------------------------------------------
// PARKING AREAS — off-road, next to each portfolio building
// ------------------------------------------------------------
const parkingMat=mat(0x303238,.9,.02);
const parkingLineMat=new THREE.MeshBasicMaterial({color:0xf1f0ea,transparent:true,opacity:.88,side:THREE.DoubleSide});

function parkingLot(x,z,side){
  const lotW=19.2, lotD=18.6;
  const lot=new THREE.Mesh(new THREE.PlaneGeometry(lotW,lotD),parkingMat);
  lot.rotation.x=-Math.PI/2;
  lot.position.set(x,.13,z);
  lot.receiveShadow=true;
  scene.add(lot);

  // Spacious 2x4 bays with a readable center aisle.
  const bayW=4.25;
  for(const row of [-5.0,5.0]){
    for(let i=0;i<4;i++){
      const bx=x-8.25+i*bayW;
      const sideLine=new THREE.Mesh(new THREE.PlaneGeometry(.11,6.6),parkingLineMat);
      sideLine.rotation.x=-Math.PI/2; sideLine.position.set(bx,.18,z+row); scene.add(sideLine);
      const endLine=new THREE.Mesh(new THREE.PlaneGeometry(3.85,.11),parkingLineMat);
      endLine.rotation.x=-Math.PI/2; endLine.position.set(bx+1.9,.18,z+row+(row<0?-3.05:3.05)); scene.add(endLine);
    }
  }

  const aisle=new THREE.Mesh(new THREE.PlaneGeometry(lotW-.8,.1),parkingLineMat);
  aisle.rotation.x=-Math.PI/2; aisle.position.set(x,.18,z); scene.add(aisle);

  const curbMat=mat(0xb9b7b2,.9);
  for(const dz of [-lotD/2,lotD/2]){
    const edge=new THREE.Mesh(new THREE.BoxGeometry(lotW,.12,.18),curbMat);
    edge.position.set(x,.20,z+dz); scene.add(edge);
  }
  for(const dx of [-lotW/2,lotW/2]){
    const edge=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,lotD),curbMat);
    edge.position.set(x+dx,.20,z); scene.add(edge);
  }
}
parkingLot(-24,-43,-1);
parkingLot(24,-43,1);
parkingLot(-24,43,-1);
parkingLot(24,43,1);

// Small connector pads from the building-side path to each parking lot.
function parkingConnector(x,z){
  const pad=new THREE.Mesh(new THREE.BoxGeometry(5.8,.10,3.0),road);
  pad.position.set(x,.11,z);
  pad.receiveShadow=true;
  scene.add(pad);
}
parkingConnector(-24,-36.7);
parkingConnector(24,-36.7);
parkingConnector(-24,36.7);
parkingConnector(24,36.7);

function parkedCar(x,z,scale=1,rot=0,paintColor=0x59636c){
  const g=new THREE.Group();
  const bodyM=mat(paintColor,.32,.48);
  const darkM=mat(0x181b21,.30,.35);
  const glassM=mat(0x263041,.12,.50);
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.55,.58,4.35),bodyM);
  body.position.y=.58; body.castShadow=true; g.add(body);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(2.62,.20,1.25),bodyM);
  hood.position.set(0,.88,-1.45); hood.castShadow=true; g.add(hood);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.95,.78,2.05),darkM);
  cabin.position.set(0,1.02,.05); cabin.castShadow=true; g.add(cabin);
  const windshield=new THREE.Mesh(new THREE.BoxGeometry(1.78,.44,.06),glassM);
  windshield.position.set(0,1.14,-1.05); windshield.rotation.x=.10; g.add(windshield);
  for(const xx of [-1.13,1.13]) for(const zz of [-1.55,1.55]){
    const t=new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,.20,18),darkM);
    t.position.set(xx,.39,zz); t.rotation.z=Math.PI/2; t.castShadow=true; g.add(t);
  }
  const head=mat(0xffefb6,.15,.12,0xffa52d,4);
  for(const xx of [-.85,.85]){
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.52,.20,.08),head);
    lamp.position.set(xx,.82,-2.20); g.add(lamp);
  }
  g.position.set(x,0,z); g.rotation.y=rot; g.scale.setScalar(scale); scene.add(g);
}
// Main lots: multiple full-size parked cars, with visual variety.
const parkedColors=[0xd9dde0,0x3f5365,0xb7b1a7,0x6d7e69,0x8b546c,0x4a4d54,0xc6c8c4,0x778fa5];
const mainParkingCars=[
  [-29.2,-48.3,1.08,Math.PI,0xd9dde0],[-24.7,-48.3,1.08,Math.PI,0x4a4d54],[-20.2,-48.3,1.08,Math.PI,0x778fa5],
  [29.2,-48.3,1.08,Math.PI,0xb7b1a7],[24.7,-48.3,1.08,Math.PI,0x6d7e69],[20.2,-48.3,1.08,Math.PI,0x8b546c],
  [-29.2,48.3,1.08,0,0x6d7e69],[-24.7,48.3,1.08,0,0xc6c8c4],[-20.2,48.3,1.08,0,0x3f5365],
  [29.2,48.3,1.08,0,0xd9dde0],[24.7,48.3,1.08,0,0x8b546c],[20.2,48.3,1.08,0,0x4a4d54]
];
mainParkingCars.forEach(v=>parkedCar(...v));

// Small parking pockets for the foreground neighborhood strip.
function parkingPocket(x,z,sideSign){
  const g=new THREE.Group();
  const asphalt=new THREE.Mesh(new THREE.PlaneGeometry(10.5,8.4),parkingMat);
  asphalt.rotation.x=-Math.PI/2;
  asphalt.position.y=.13;
  g.add(asphalt);
  for(const bx of [-3.6,0,3.6]){
    const line=new THREE.Mesh(new THREE.PlaneGeometry(.10,6.1),parkingLineMat);
    line.rotation.x=-Math.PI/2; line.position.set(bx,.18,0); g.add(line);
  }
  const signPole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.5,8),mat(0x303137,.6,.2));
  signPole.position.set(sideSign*4.1,.75,-3.4); g.add(signPole);
  const pPlate=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.10),mat(0x1e2429,.45,.22));
  pPlate.position.set(sideSign*4.1,1.55,-3.4); g.add(pPlate);
  const pLabel=placeLabel("P",0,0,0,"#c7ff32"); pLabel.scale.set(.55,.48,1); pLabel.position.set(0,1.57,-3.46); pPlate.add(pLabel);
  g.position.set(x,0,z); scene.add(g);
}
parkingPocket(-31,84,-1); parkingPocket(31,84,1);
parkingPocket(-48,111,-1); parkingPocket(48,111,1);

// Full-size parked cars in the new foreground pockets.
for(const [x,z,r,c] of [
  [-34.2,82.7,Math.PI,0xd9dde0],[-30.6,82.7,Math.PI,0x4a4d54],[-27.0,82.7,Math.PI,0x778fa5],
  [34.2,82.7,0,0xb7b1a7],[30.6,82.7,0,0x6d7e69],[27.0,82.7,0,0x8b546c],
  [-51.2,109.7,Math.PI/2,0xc6c8c4],[-46.8,109.7,Math.PI/2,0x3f5365],
  [51.2,109.7,-Math.PI/2,0xd9dde0],[46.8,109.7,-Math.PI/2,0x6d7e69]
]) parkedCar(x,z,1.0,r,c);

// A few strong foreground tree groups frame the storefronts without shrinking the boulevard.
for(const [x,z,s] of [
  [-18,76,1.18],[18,76,1.18],[-42,86,1.22],[42,86,1.2],[-42,115,1.12],[42,115,1.12]
]) tree(x,z,s);

// Secondary lots farther down the avenue.
for(const [x,z,r,c] of [
  [-43,-77,Math.PI/2,0xc6c8c4],[-43,-71,Math.PI/2,0x3f5365],[-43,-65,Math.PI/2,0x8b546c],
  [43,-77,-Math.PI/2,0xb7b1a7],[43,-71,-Math.PI/2,0x6d7e69],[43,-65,-Math.PI/2,0xd9dde0],
  [-43,65,Math.PI/2,0x6d7e69],[-43,71,Math.PI/2,0x4a4d54],[-43,77,Math.PI/2,0xd9dde0],
  [43,65,-Math.PI/2,0x3f5365],[43,71,-Math.PI/2,0x8b546c],[43,77,-Math.PI/2,0xc6c8c4]
]) parkedCar(x,z,1.0,r,c);

// More street-side vehicles, kept outside the driving lane.
for(const [x,z,r,c] of [
  [-52,-108,0,0x7a8c96],[-46,-108,0,0xd9dde0],[46,-108,Math.PI,0x4a4d54],[52,-108,Math.PI,0x8b546c],
  [-52,108,0,0xb7b1a7],[-46,108,0,0x3f5365],[46,108,Math.PI,0xc6c8c4],[52,108,Math.PI,0x6d7e69]
]) parkedCar(x,z,.94,r,c);

// Small planted islands between sidewalk and parking lots.
for(const [x,z] of [[-18,-42],[-18,42],[18,-42],[18,42]]){
  shrub(x,z,1.15);
  tree(x+(x<0?-1.6:1.6),z,1.0);
}

// Small pedestrian details around each block make the boulevard feel inhabited.
function bollard(x,z,s=1){
  const g=new THREE.Group();
  const postMat=mat(0x303137,.55,.25);
  const capMat=mat(0xd9d3b8,.35,.05,0xffbb55,.7);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.09*s,.11*s,.78*s,8),postMat);
  post.position.y=.39*s; post.castShadow=true; g.add(post);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.15*s,.15*s,.12*s,8),capMat);
  cap.position.y=.82*s; cap.castShadow=true; g.add(cap);
  g.position.set(x,0,z); scene.add(g);
}
for(const [x,z] of [[-13.6,-38.2],[13.6,-38.2],[-13.6,38.2],[13.6,38.2],[-33,-52],[33,-52],[-33,52],[33,52]]) bollard(x,z,.85);

// Mid-distance side buildings to avoid empty grass fields while keeping the road open.
const sideBuildings=[
  [-56,-98,10,8,6.0,0x536c7b], [56,-98,10,8,6.4,0x66714e],
  [-54,-66,9,8,5.0,0x72516b], [54,-66,10,8,5.8,0x4e6174],
  [-57,-5,9,8,5.4,0x596b52], [57,-5,9,8,5.3,0x72525e],
  [-54,52,10,8,5.8,0x56667d], [54,52,10,8,6.1,0x6c624d],
  [-58,92,9,8,5.3,0x5b6f59], [58,92,10,8,5.7,0x6c5869],
  [-46,120,8,7,4.6,0x596e7b], [46,120,8,7,4.9,0x6f744e]
];
for(const [x,z,w,d,h,c] of sideBuildings){
  const b=block(x,0,z,w,h,d,mat(c,.86),true);
  b.material.roughness=.88;
  // Simple front window band.
  block(x,2.0,z-(d/2)-.03,w*.62,.9,.05,mat(0x9fc7d2,.2,.3,0x5b9cb7,1.0),false);
  block(x,3.35,z-(d/2)-.04,w*.38,.28,.06,mat(0xd8e9e8,.25,.12,0xa2d9e3,.75),false);
}

// Ground-floor storefronts on secondary buildings: glass, awnings, signs, and planters.
function storefrontBuilding(x,z,w,d,h,c,label){
  const bodyM=mat(c,.82,.05);
  block(x,0,z,w,h,d,bodyM,true);
  const glassM=mat(0x98c6d8,.12,.28,0x4a93ab,.8);
  const frontZ=z-d/2-.05;
  block(x,1.65,frontZ,w*.68,2.0,.08,glassM,false);
  block(x,3.75,frontZ-.03,w*.72,.24,.12,mat(0xe7eef0,.25,.08,0xa4dce8,.5),false);
  const sign=placeLabel(label,x,4.05,frontZ-.1,"#c7ff32");
  sign.scale.set(3.0,.68,1);
  planter(x-w*.34,z-d/2-.8,.68); planter(x+w*.34,z-d/2-.8,.68);
}
const extraStores=[
  [-44,-36,9,7,4.8,0x536c7b,"STUDIO"],[44,-36,9,7,4.8,0x6f586d,"LAB"],
  [-44,36,9,7,4.6,0x65794f,"API"],[44,36,9,7,4.8,0x596579,"DEV"],
  [-52,-12,8,6,4.0,0x7a5b63,"WEB"],[52,-12,8,6,4.2,0x4f6672,"DATA"],
  [-52,72,8,6,4.0,0x5e725a,"TOOLS"],[52,72,8,6,4.2,0x6b5d6e,"CODE"]
];
extraStores.forEach(v=>storefrontBuilding(...v));

// More compact storefronts fill the gaps between the hero buildings.
const microStores=[
  [-39,-18,6.5,5.5,3.6,0x6b7b55,"CAFE"],[39,-18,6.5,5.5,3.7,0x75606b,"SHOP"],
  [-41,18,6.5,5.5,3.8,0x4e6c7b,"LAB"],[41,18,6.5,5.5,3.8,0x69784f,"APP"],
  [-42,62,7,5.5,3.9,0x775c65,"DATA"],[42,62,7,5.5,4.0,0x5d6f7b,"API"]
];
microStores.forEach(v=>storefrontBuilding(...v));

// Foreground neighborhood strip: larger, closer storefronts so the first driving
// section already feels like a lived-in boulevard instead of an empty field.
const foregroundStores=[
  [-29,74,8.5,6.8,4.5,0x526b76,"CAFE"],[29,74,8.5,6.8,4.7,0x6a6450,"WORK"],
  [-46,104,8.5,6.8,4.8,0x72546a,"SHOP"],[46,104,8.5,6.8,4.9,0x566b54,"LAB"]
];
foregroundStores.forEach(v=>storefrontBuilding(...v));

// A few larger low-rise blocks fill the horizon without closing the boulevard.
const neighborhoodBlocks=[
  [-72,-118,12,9,5.5,0x4e6877],[72,-118,13,10,6.2,0x5e714d],
  [-70,-62,11,9,5.8,0x6e4e65],[70,-62,12,10,6.0,0x496476],
  [-72,8,12,9,5.4,0x536c5f],[72,8,12,9,5.7,0x74525e],
  [-72,72,11,10,5.8,0x4f6275],[72,72,13,9,6.1,0x6a604b],
  [-70,120,12,9,5.3,0x5e6f52],[70,120,11,10,5.7,0x66526a]
];
neighborhoodBlocks.forEach(([x,z,w,d,h,c],i)=>{
  const b=block(x,0,z,w,h,d,mat(c,.9),true);
  const face=block(x,2.4,z-(d/2)-.05,w*.58,1.15,.06,mat(0x96becb,.18,.25,0x518ca2,.7),false);
  block(x,3.85,z-(d/2)-.06,w*.4,.3,.07,mat(0xd4ded8,.3,.1,0xaad4dc,.6),false);
  if(i%2===0){ planter(x-w*.35,z-d/2-.72,.72); planter(x+w*.35,z-d/2-.72,.72); }
});

// Repeated low fences and planter islands give the side blocks a developed-city feel.
const fenceMat=mat(0x70706a,.9,.15);
for(const side of [-1,1]){
  for(const z of [-92,-62,-32,32,62,92]){
    for(let i=0;i<5;i++){
      const px=side*(38+i*1.8);
      const p=block(px,.02,z,.08,.55,.08,fenceMat,false);
      p.rotation.y=side<0?0:Math.PI;
    }
  }
}

// ------------------------------------------------------------
// DISTANT CITY SKYLINE — gives the boulevard a real portfolio-city destination.
// ------------------------------------------------------------
const skylineMats=[mat(0x5b79a1,.88),mat(0x6c83a2,.9),mat(0x7489a0,.9),mat(0x526c8d,.9)];
const skyline=[
  [-26,-132,8,13,18],[-14,-138,10,20,25],[-2,-143,7,12,34],[11,-137,9,18,24],[25,-132,12,24,30],
  [-38,-124,7,11,16],[37,-126,8,14,20],[-48,-140,6,9,12],[47,-143,6,10,15]
];
skyline.forEach(([x,z,w,d,h],i)=>{
  const b=block(x,0,z,w,h,d,skylineMats[i%skylineMats.length],false);
  b.material.roughness=.86;
});

// Soft low-poly mountain silhouettes beyond the city.
const mountainMats=[mat(0x80a4b6,.98),mat(0x6e93a7,.98),mat(0x8db0bd,.98)];
[[ -58,-164,28,16,0],[ -28,-172,23,14,1],[ 6,-166,31,18,2],[ 39,-171,25,15,0],[ 68,-164,30,17,1 ]].forEach(([x,z,r,h,mi])=>{
  const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,6),mountainMats[mi]);
  m.position.set(x,h/2-.4,z);
  m.rotation.y=.52;
  m.scale.z=.72;
  scene.add(m);
});

// Soft cloud clusters give the distant sky more depth without external textures.
const cloudMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.76,depthWrite:false});
function cloud(x,y,z,s=1){
  const g=new THREE.Group();
  const pieces=[[-1.4,0,.1,1.15],[0,0,.2,1.45],[1.35,.1,.1,1.0],[-.45,.45,0,1.0],[.65,.42,.15,.9]];
  for(const [px,py,pz,sc] of pieces){
    const q=new THREE.Mesh(new THREE.IcosahedronGeometry(sc*s,1),cloudMat);
    q.position.set(px*s,py*s,pz*s); q.scale.y=.52; g.add(q);
  }
  g.position.set(x,y,z); scene.add(g);
}
cloud(-52,28,-132,2.2); cloud(20,31,-150,2.6); cloud(68,26,-144,1.9); cloud(-95,32,-120,1.7);

// ------------------------------------------------------------
// FAR PLAZA / CITY END
// ------------------------------------------------------------
const farPlaza=new THREE.Mesh(new THREE.PlaneGeometry(62,24),mat(0x638e67,.98));
farPlaza.rotation.x=-Math.PI/2; farPlaza.position.set(0,.015,-137); farPlaza.receiveShadow=true; scene.add(farPlaza);
for(const x of [-24,24]) tree(x,-137,1.2);
for(const x of [-12,0,12]) shrub(x,-136,1.25);
for(const x of [-30,-18,18,30]) bollard(x,-132,.9);

// ------------------------------------------------------------
// CAR — detailed stylized sports crossover
// ------------------------------------------------------------
const car=new THREE.Group();

function carMesh(geometry, material, position=[0,0,0], rotation=[0,0,0]){
  const m=new THREE.Mesh(geometry,material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow=true;
  m.receiveShadow=true;
  car.add(m);
  return m;
}

const paint=mat(0x59616b,.24,.72);
const paintDark=mat(0x171a20,.3,.68);
const black=mat(0x080a0e,.78,.18);
const glass=mat(0x202638,.08,.72,0x252848,.65);
const chrome=mat(0xb8bfca,.18,.9);
const headMat=mat(0xffe8a3,.12,.2,0xffa928,8);
const tailMat=mat(0xff1f4c,.16,.18,0xff003d,7);
const accent=mat(0xb7ff00,.18,.35,0x7aaa00,1.2);

const body = carMesh(new THREE.BoxGeometry(2.9,.72,4.9),paint,[0,.93,0]);
carMesh(new THREE.BoxGeometry(3.02,.25,4.65),paintDark,[0,.65,0]);
carMesh(new THREE.BoxGeometry(3.0,.25,.25),black,[0,.72,-2.43]);
carMesh(new THREE.BoxGeometry(3.0,.25,.25),black,[0,.72,2.43]);

carMesh(new THREE.BoxGeometry(2.72,.32,1.52),paint,[0,1.33,-1.48],[.045,0,0]);
carMesh(new THREE.BoxGeometry(2.78,.38,1.52),paint,[0,1.24,1.55],[-.035,0,0]);

const cabin = carMesh(new THREE.BoxGeometry(2.08,.82,2.25),paintDark,[0,1.63,-.02]);
carMesh(new THREE.BoxGeometry(1.78,.53,.06),glass,[0,1.69,-1.16],[.12,0,0]);
carMesh(new THREE.BoxGeometry(1.78,.53,.06),glass,[0,1.69,1.05],[-.1,0,0]);

for(const x of [-1.055,1.055]){
  carMesh(new THREE.BoxGeometry(.055,.55,1.62),glass,[x,1.67,-.05]);
}

carMesh(new THREE.BoxGeometry(2.18,.14,2.2),paintDark,[0,2.08,-.02]);
for(const x of [-.78,.78]) carMesh(new THREE.BoxGeometry(.08,.12,2.25),chrome,[x,2.17,-.02]);

carMesh(new THREE.BoxGeometry(1.28,.38,.08),black,[0,.99,-2.51]);
carMesh(new THREE.BoxGeometry(.95,.055,.06),accent,[0,1.06,-2.56]);

for(const x of [-.92,.92]){
  carMesh(new THREE.BoxGeometry(.56,.22,.08),headMat,[x,1.24,-2.48]);
  carMesh(new THREE.BoxGeometry(.66,.06,.07),accent,[x,1.07,-2.51]);
}

for(const x of [-.91,.91]) carMesh(new THREE.BoxGeometry(.62,.22,.08),tailMat,[x,1.22,2.48]);
carMesh(new THREE.BoxGeometry(1.35,.06,.07),tailMat,[0,1.26,2.52]);

for(const x of [-1.22,1.22]){
  carMesh(
    new THREE.BoxGeometry(.28,.13,.38),
    paintDark,
    [x,1.56,-.87],
    [0,0,(x<0?.16:-.16)]
  );
}

carMesh(new THREE.BoxGeometry(1.85,.1,.15),black,[0,2.05,2.07]);
for(const x of [-.73,.73]) carMesh(new THREE.BoxGeometry(.08,.28,.08),black,[x,1.92,2.07]);

const tireGeo=new THREE.CylinderGeometry(.49,.49,.36,20);
const rimGeo=new THREE.CylinderGeometry(.28,.28,.38,16);
const discGeo=new THREE.CylinderGeometry(.17,.17,.40,12);

for(const x of [-1.32,1.32]){
  for(const z of [-1.58,1.58]){
    carMesh(tireGeo,black,[x,.52,z],[0,0,Math.PI/2]);
    carMesh(rimGeo,chrome,[x,.52,z],[0,0,Math.PI/2]);
    carMesh(discGeo,accent,[x,.52,z],[0,0,Math.PI/2]);
  }
}

for(const x of [-1.36,1.36]){
  for(const z of [-1.58,1.58]){
    carMesh(
      new THREE.TorusGeometry(.58,.05,8,18,Math.PI),
      paintDark,
      [x,.63,z],
      [0,Math.PI/2,Math.PI/2]
    );
  }
}

for(const x of [-.65,.65]){
  carMesh(new THREE.CylinderGeometry(.09,.09,.18,10),chrome,[x,.68,2.5],[Math.PI/2,0,0]);
}

for(const x of [-.62,0,.62]){
  carMesh(new THREE.BoxGeometry(.28,.09,.18),headMat,[x,2.2,-.08]);
}

car.position.set(0,0,108);
car.rotation.y=0;
car.scale.setScalar(1.08);
scene.add(car);

// ------------------------------------------------------------
// GAMEPLAY
// ------------------------------------------------------------
const keys={};
const mobileInput={
  steer:0,
  gas:false,
  brake:false
};

addEventListener("keydown",e=>{
  const key = e.key.toLowerCase();
  keys[key]=true;
  if(key==="e") interact();
  if(key==="n") toggleWorldMode();
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

// ------------------------------------------------------------
// MOBILE CONTROLS
// Same driving model as desktop: touch controls only feed the
// existing gas/brake/steering values, so keyboard and mobile stay
// in sync.
// ------------------------------------------------------------
const mobileJoystick=document.querySelector("#mobileJoystick");
const mobileJoystickKnob=document.querySelector("#mobileJoystickKnob");
const mobileGas=document.querySelector("#mobileGas");
const mobileBrake=document.querySelector("#mobileBrake");
const mobileInteract=document.querySelector("#mobileInteract");

let joystickPointerId=null;

function resetMobileJoystick(){
  mobileInput.steer=0;
  if(mobileJoystickKnob) mobileJoystickKnob.style.transform="translate(0px,0px)";
}

function updateMobileJoystick(clientX,clientY){
  if(!mobileJoystick || !mobileJoystickKnob) return;

  const rect=mobileJoystick.getBoundingClientRect();
  const centerX=rect.left+rect.width/2;
  const centerY=rect.top+rect.height/2;
  let dx=clientX-centerX;
  let dy=clientY-centerY;

  const maxDistance=42;
  const distance=Math.hypot(dx,dy);

  if(distance>maxDistance){
    const scale=maxDistance/distance;
    dx*=scale;
    dy*=scale;
  }

  mobileInput.steer=THREE.MathUtils.clamp(dx/maxDistance,-1,1);
  mobileJoystickKnob.style.transform=`translate(${dx}px,${dy}px)`;
}

if(mobileJoystick){
  mobileJoystick.addEventListener("pointerdown",e=>{
    e.preventDefault();
    joystickPointerId=e.pointerId;
    mobileJoystick.setPointerCapture(e.pointerId);
    updateMobileJoystick(e.clientX,e.clientY);
  });

  mobileJoystick.addEventListener("pointermove",e=>{
    if(e.pointerId!==joystickPointerId) return;
    e.preventDefault();
    updateMobileJoystick(e.clientX,e.clientY);
  });

  const endJoystick=()=>{
    joystickPointerId=null;
    resetMobileJoystick();
  };

  mobileJoystick.addEventListener("pointerup",endJoystick);
  mobileJoystick.addEventListener("pointercancel",endJoystick);
}

function bindHoldButton(button,property){
  if(!button) return;

  const press=e=>{
    e.preventDefault();
    mobileInput[property]=true;
    button.classList.add("isPressed");
    if(e.pointerId!=null) button.setPointerCapture(e.pointerId);
  };

  const release=e=>{
    if(e) e.preventDefault();
    mobileInput[property]=false;
    button.classList.remove("isPressed");
  };

  button.addEventListener("pointerdown",press);
  button.addEventListener("pointerup",release);
  button.addEventListener("pointercancel",release);
  button.addEventListener("lostpointercapture",release);
}

bindHoldButton(mobileGas,"gas");
bindHoldButton(mobileBrake,"brake");

if(mobileInteract){
  mobileInteract.addEventListener("pointerdown",e=>{
    e.preventDefault();
    interact();
  });
}

addEventListener("blur",()=>{
  mobileInput.gas=false;
  mobileInput.brake=false;
  resetMobileJoystick();
  mobileGas?.classList.remove("isPressed");
  mobileBrake?.classList.remove("isPressed");
});

let speed=0;
let yaw=0;
let nearest=null;
const clock=new THREE.Clock();
const zoneCard=document.querySelector("#zone-card");
const zoneTitle=document.querySelector("#zone-title");
const info=document.querySelector("#info");
const infoTitle=document.querySelector("#infoTitle");
const infoText=document.querySelector("#infoText");
const infoKicker=document.querySelector("#infoKicker");
const infoChips=document.querySelector("#infoChips");

function distanceToZone(z){
  const dx=car.position.x-z.pos[0], dz=car.position.z-z.pos[2];
  return Math.sqrt(dx*dx+dz*dz);
}

function updateNearest(){
  let best=null,bd=Infinity;
  for(const z of zones){
    const d=distanceToZone(z);
    if(d<10.5 && d<bd){best=z;bd=d;}
  }

  nearest=best;

  for(const z of zones){
    if(!z.popup) continue;

    const d=distanceToZone(z);
    const parkedNear = nearest === z && Math.abs(speed) < 1.35;

    // Fade popup / connector in only when the player is close and parked.
    const targetOpacity = parkedNear ? 1 : 0;
    z.popup.material.opacity = THREE.MathUtils.lerp(
      z.popup.material.opacity,
      targetOpacity,
      0.14
    );
    // Gentle floating motion.
    const bob = parkedNear
      ? Math.sin(performance.now()*.002 + z.popupPhase) * .16
      : 0;
    z.popup.position.y = 10.8 + bob;
  }

  if(nearest){
    zoneTitle.textContent=nearest.name;
    zoneCard.classList.add("show");
    mobileInteract?.classList.toggle("show", Math.abs(speed)<1.7);
  }else{
    zoneCard.classList.remove("show");
    mobileInteract?.classList.remove("show");
  }
}

function interact(){
  if(!nearest || Math.abs(speed) > 1.7) return;
  infoKicker.textContent=`${nearest.name} AREA`;
  infoTitle.textContent=nearest.title;
  infoText.textContent=nearest.text;
  infoChips.innerHTML=nearest.chips.map(c=>`<span>${c}</span>`).join("");
  info.classList.add("open");
  info.setAttribute("aria-hidden","false");
}
document.querySelector("#closeInfo").addEventListener("click",()=>{
  info.classList.remove("open");
  info.setAttribute("aria-hidden","true");
});

function blocked(x,z){
  // Keep the driving space playable. Buildings are soft boundaries for now.
  for(const c of colliders){
    const hitX=Math.abs(x-c.x)<c.w/2+1.3;
    const hitZ=Math.abs(z-c.z)<c.d/2+1.3;
    if(hitX && hitZ) return true;
  }
  return false;
}

function updateCar(dt){
  const f=keys.w||keys.arrowup||mobileInput.gas;
  const b=keys.s||keys.arrowdown||mobileInput.brake;
  const l=keys.a||keys.arrowleft;
  const r=keys.d||keys.arrowright;

  if(f) speed+=17*dt;
  if(b) speed-=13*dt;
  if(!f&&!b) speed*=Math.pow(.055,dt);
  if(keys[" "]) speed*=Math.pow(.0002,dt);

  speed=THREE.MathUtils.clamp(speed,-6.5,22);

  let steer=(l?-1:0)+(r?1:0);
  if(Math.abs(mobileInput.steer)>Math.abs(steer)){
    steer=mobileInput.steer;
  }

  const steeringScale=Math.min(Math.abs(speed)/6,1.2);
  yaw-=steer*dt*(1.25+1.35*steeringScale)*(speed>=0?1:-1);
  car.rotation.y=yaw;

  const oldX=car.position.x, oldZ=car.position.z;
  car.translateZ(-speed*dt);

  car.position.x=THREE.MathUtils.clamp(car.position.x,-72,72);
  car.position.z=THREE.MathUtils.clamp(car.position.z,-145,145);
  if(blocked(car.position.x,car.position.z)){
    car.position.x=oldX; car.position.z=oldZ; speed*=.2;
  }

  // small suspension animation
  const bounce=Math.sin(performance.now()*.018)*Math.min(Math.abs(speed)/22,.15);
  body.position.y=.82+bounce*.08;
  cabin.position.y=1.45+bounce*.05;

  updateNearest();

  // Proper third-person driving camera:
  // camera stays BEHIND the car, sits higher, and looks farther down the road.
  const forward = new THREE.Vector3(0,0,-1)
    .applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

  const absSpeed = Math.abs(speed);
  const cameraDistance = 11.8 + Math.min(absSpeed * 0.16, 3.4);
  const cameraHeight = 12.8 + Math.min(absSpeed * 0.08, 1.8);

  const desired = car.position.clone()
    .add(forward.clone().multiplyScalar(-cameraDistance))
    .add(new THREE.Vector3(0, cameraHeight, 0));

  camera.position.lerp(desired, 1 - Math.pow(0.00001, dt));

  const lookAhead = 8.5 + Math.min(absSpeed * 0.28, 6);
  const target = car.position.clone()
    .add(forward.clone().multiplyScalar(lookAhead))
    .add(new THREE.Vector3(0, 1.0, 0));

  camera.lookAt(target);
}

// ------------------------------------------------------------
// AMBIENT FLOATERS / FIREFLIES
// ------------------------------------------------------------
const fireflyMat=mat(0xb7ff00,.2,.1,0xb7ff00,7);
fireflies=[];
for(let i=0;i<22;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(.04,6,6),fireflyMat);
  p.position.set((Math.random()-.5)*100,.7+Math.random()*7,(Math.random()-.5)*120);
  p.userData.seed=Math.random()*10;
  p.visible=false;
  fireflies.push(p);
  scene.add(p);
}

// ------------------------------------------------------------
// RESIZE / START
// ------------------------------------------------------------
addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

setTimeout(()=>{
  const loader=document.querySelector("#loading");
  loader.style.opacity="0";
  loader.style.visibility="hidden";
  setTimeout(()=>loader.remove(),900);
},1100);

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);

  // gentle moving fireflies
  scene.traverse(o=>{
    if(o.userData?.seed){
      o.position.y += Math.sin(performance.now()*.001+o.userData.seed)*0.0008;
    }
  });

  updateCar(dt);

  // Slight lamp flicker, only at night.
  if(worldMode === "night"){
    lampPosts.forEach((l,i)=>{
      l.light.intensity=3.4+Math.sin(performance.now()*.003+i)*.12;
    });
  }

  renderer.render(scene,camera);
}
animate();
