// Engine: 1945 Raytheon Radar Lab toon world + ink + grade + lens blur + canvas character cards.
// Exposes window.renderFrame(f) and window.ready.
import * as THREE from "three";
import * as T from "./toon.js";
import * as P from "./paint.js";
import { frameState, TOTAL } from "./story.js";

const W = 1080, H = 1920, PX = W / 1080;
const NOINK = 1;
const canvas = document.createElement("canvas");
canvas.width = W; canvas.height = H;
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
camera.layers.enableAll();
scene.fog = new THREE.Fog(0xb8c4d4, 20, 110);

// ---------- toon materials ----------
const grad = (() => {
  const d = new Uint8Array([0, 0, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const ctex = (c, rep = true) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};

const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });

const triToon = (tex, scale, color = 0xffffff, extra = {}) => {
  const m = toon({ color, ...extra });
  m.customProgramCacheKey = () => "tri";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tTri = { value: tex };
    sh.uniforms.triS = { value: 1 / scale };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTP; varying vec3 vTN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vTP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D tTri; uniform float triS; varying vec3 vTP; varying vec3 vTN;")
      .replace("#include <map_fragment>", `{
        vec3 bw = pow(abs(vTN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 tc = texture2D(tTri, vTP.zy * triS).rgb * bw.x + texture2D(tTri, vTP.xz * triS).rgb * bw.y + texture2D(tTri, vTP.xy * triS).rgb * bw.z;
        diffuseColor.rgb *= tc;
      }`);
  };
  return m;
};

// Canvas textures
const TEX = {
  wood: ctex(P.woodTex(7)),
  wall: ctex(P.mudTex(24, 512, "#dfd8cc")),
  brick: ctex(P.mudTex(14, 512, "#a08c7c")),
  floor: ctex(P.woodTex(12, 1024, "#8a6648")),
};

const MAT = {
  floor: triToon(TEX.floor, 2.5),
  wall: triToon(TEX.wall, 4.0),
  bench: triToon(TEX.wood, 1.8, 0x826249),
  steel: toon({ color: 0x5a6672 }),
  darkSteel: toon({ color: 0x363e46 }),
  copper: toon({ color: 0xba6a48 }),
  brass: toon({ color: 0xc89e4c }),
  enamel: toon({ color: 0xe0dad0 }),
  blackboard: toon({ color: 0x273b32 }),
  glass: new THREE.MeshBasicMaterial({ color: 0x82b4cc, transparent: true, opacity: 0.6 }),
  chocolate: toon({ color: 0x462719 }),
  goldFoil: toon({ color: 0xd8ad3e }),
  corn: toon({ color: 0xebb438 }),
  popcorn: toon({ color: 0xfff6dd }),
  eggShell: toon({ color: 0xf4eee4 }),
  eggYolk: toon({ color: 0xf5b722 }),
};

const world = []; // meshes that get inked
const addW = (mesh, cast = true, recv = true) => {
  mesh.castShadow = cast;
  mesh.receiveShadow = recv;
  mesh.layers.set(0);
  scene.add(mesh);
  world.push(mesh);
  return mesh;
};

// ==========================================
// 1945 RAYTHEON LABORATORY WORLD
// ==========================================

// Room Floor
{
  const floorGeo = new THREE.PlaneGeometry(36, 36);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMesh = new THREE.Mesh(floorGeo, MAT.floor);
  addW(floorMesh, false, true);
}

// Back Wall & Windows
{
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 0.4), MAT.wall);
  backWall.position.set(0, 5, -4.2);
  addW(backWall, false, true);

  // Large factory grid windows in the back wall
  for (const wx of [-6.0, 0.0, 6.0]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 0.15), MAT.darkSteel);
    frame.position.set(wx, 5.2, -4.0);
    addW(frame, false, true);

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.0), MAT.glass);
    pane.position.set(wx, 5.2, -3.9);
    pane.layers.set(NOINK);
    scene.add(pane);

    // Window mullion bars
    for (const mx of [-1.0, 0.0, 1.0]) {
      const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.0, 0.08), MAT.darkSteel);
      vbar.position.set(wx + mx, 5.2, -3.88);
      addW(vbar, false, true);
    }
    for (const my of [-0.75, 0.75]) {
      const hbar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.08), MAT.darkSteel);
      hbar.position.set(wx, 5.2 + my, -3.88);
      addW(hbar, false, true);
    }
  }

  // Blackboard with radar schematics
  const bb = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.0, 0.08), MAT.blackboard);
  bb.position.set(-2.8, 2.3, -3.95);
  addW(bb, false, true);

  const bbFrame = new THREE.Mesh(new THREE.BoxGeometry(3.96, 2.16, 0.06), MAT.bench);
  bbFrame.position.set(-2.8, 2.3, -3.98);
  addW(bbFrame, false, true);
}

// Ceiling Steel Beams
for (const bz of [-2.5, 0.5, 3.5]) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(32, 0.35, 0.25), MAT.darkSteel);
  beam.position.set(0, 6.2, bz);
  addW(beam, true, true);
}

// Left Supply Shelving Rack with vintage vacuum tubes & test equipment
{
  const shelfWood = MAT.bench;
  const rack = new THREE.Group();
  for (const sy of [0.6, 1.4, 2.2, 3.0]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 3.2), shelfWood);
    board.position.set(0, sy, 0);
    rack.add(board);
  }
  for (const rx of [-0.45, 0.45]) {
    for (const rz of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 0.08), MAT.darkSteel);
      post.position.set(rx, 1.7, rz);
      rack.add(post);
    }
  }
  // Vintage oscilloscope box on middle shelf
  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), MAT.steel);
  scope.position.set(0, 1.7, -0.4);
  rack.add(scope);
  const scopeScreen = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), toon({ color: 0x48bb78 }));
  scopeScreen.rotation.z = Math.PI / 2;
  scopeScreen.position.set(0.36, 1.7, -0.4);
  rack.add(scopeScreen);

  rack.position.set(-5.5, 0, -1.2);
  rack.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; world.push(o); } });
  scene.add(rack);
}

// ==========================================
// WORKBENCH & EXPERIMENT PROPS
// ==========================================

const labProps = new THREE.Group();

// Central Oak Workbench
{
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.5), MAT.bench);
  top.position.set(0, 0.94, 0);
  labProps.add(top);

  for (const lx of [-1.6, 1.6]) {
    for (const lz of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.94, 0.14), MAT.bench);
      leg.position.set(lx, 0.47, lz);
      labProps.add(leg);
    }
  }
  const apronL = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.06), MAT.bench);
  apronL.position.set(0, 0.85, 0.6);
  labProps.add(apronL);
}

// Radar Magnetron Assembly (mounted on the bench)
const magnetronGroup = new THREE.Group();
{
  // Heavy power transformer console base
  const powerBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.65), MAT.darkSteel);
  powerBox.position.set(-0.85, 1.25, -0.15);
  magnetronGroup.add(powerBox);

  // Copper cylindrical cavity magnetron core
  const magCore = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.38, 20), MAT.copper);
  magCore.position.set(-0.55, 1.35, 0.32);
  magnetronGroup.add(magCore);

  // Radial cooling fins
  for (let i = 0; i < 8; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.42), MAT.darkSteel);
    fin.position.set(-0.55, 1.22 + i * 0.035, 0.32);
    magnetronGroup.add(fin);
  }

  // Ceramic insulators on top
  const ins1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.16, 10), MAT.enamel);
  ins1.position.set(-0.55, 1.58, 0.32);
  magnetronGroup.add(ins1);

  // Brass waveguide horn pointing towards +X across the table
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.09, 0.45, 4), MAT.brass);
  horn.rotation.z = -Math.PI / 2;
  horn.rotation.y = Math.PI / 4;
  horn.position.set(-0.25, 1.35, 0.32);
  magnetronGroup.add(horn);

  // Horn rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.28), MAT.brass);
  rim.position.set(-0.02, 1.35, 0.32);
  magnetronGroup.add(rim);
}
labProps.add(magnetronGroup);

// Concentric Animated Electromagnetic Wave Rings (cyan/blue energy)
const waveRings = [];
for (let i = 0; i < 4; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.16 + i * 0.12, 0.016, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0x4dd8f6, transparent: true, opacity: 0.7 })
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.set(0.1 + i * 0.22, 1.35, 0.32);
  ring.layers.set(NOINK);
  waveRings.push(ring);
  labProps.add(ring);
}

// ---------------- Props: Chocolate Bar ----------------
const chocolateGroup = new THREE.Group();
const goldFoil = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), MAT.goldFoil);
goldFoil.rotation.x = -Math.PI / 2;
goldFoil.position.set(0.14, 1.005, 0.32);
chocolateGroup.add(goldFoil);

const candyBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.16), MAT.chocolate);
candyBar.position.set(0.14, 1.045, 0.32);
chocolateGroup.add(candyBar);

const meltPuddle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.02, 16), MAT.chocolate);
meltPuddle.position.set(0.14, 1.015, 0.32);
meltPuddle.visible = false;
chocolateGroup.add(meltPuddle);

labProps.add(chocolateGroup);

// ---------------- Props: Popcorn Kernels & Popped Puffs ----------------
const popcornGroup = new THREE.Group();
const petriDish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.05, 24), MAT.glass);
petriDish.position.set(0.14, 1.025, 0.32);
petriDish.layers.set(NOINK);
popcornGroup.add(petriDish);

const rawKernels = [];
for (let i = 0; i < 16; i++) {
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), MAT.corn);
  const ang = (i / 16) * Math.PI * 2;
  const r = 0.04 + (i % 3) * 0.045;
  k.position.set(0.14 + Math.cos(ang) * r, 1.04, 0.32 + Math.sin(ang) * r);
  popcornGroup.add(k);
  rawKernels.push(k);
}

const poppedPuffs = [];
for (let i = 0; i < 14; i++) {
  const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.055, 0), MAT.popcorn);
  puff.position.set(0.14 + (Math.sin(i * 1.7) * 0.1), 1.07 + (i % 3) * 0.035, 0.32 + (Math.cos(i * 1.7) * 0.1));
  puff.visible = false;
  popcornGroup.add(puff);
  poppedPuffs.push(puff);
}
popcornGroup.visible = false;
labProps.add(popcornGroup);

// ---------------- Props: Raw Egg & Egg Burst Splat ----------------
const eggGroup = new THREE.Group();
const eggCup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.08, 16), MAT.enamel);
eggCup.position.set(0.14, 1.04, 0.32);
eggGroup.add(eggCup);

const wholeEgg = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), MAT.eggShell);
wholeEgg.scale.set(0.85, 1.25, 0.85);
wholeEgg.position.set(0.14, 1.16, 0.32);
eggGroup.add(wholeEgg);

const eggSplat = new THREE.Group();
const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), MAT.eggYolk);
yolk.scale.set(1.4, 0.3, 1.4);
yolk.position.set(0.14, 1.015, 0.32);
eggSplat.add(yolk);

for (let i = 0; i < 8; i++) {
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), MAT.eggShell);
  const a = (i / 8) * Math.PI * 2;
  drop.scale.set(1.5, 0.25, 1.0);
  drop.position.set(0.14 + Math.cos(a) * 0.15, 1.015, 0.32 + Math.sin(a) * 0.15);
  eggSplat.add(drop);
}
eggSplat.visible = false;
eggGroup.add(eggSplat);

eggGroup.visible = false;
labProps.add(eggGroup);

labProps.traverse((o) => {
  if (o.isMesh && !o.layers.isEnabled(NOINK)) {
    o.castShadow = true;
    o.receiveShadow = true;
    world.push(o);
  }
});
scene.add(labProps);

// ==========================================
// 6-FOOT INDUSTRIAL PROTOTYPE ("RADARANGE")
// ==========================================

const radGroup = new THREE.Group();
{
  // Towering steel cabinet: 1.25m wide, 1.83m tall (6 feet!), 1.0m deep
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.83, 1.0), MAT.enamel);
  cab.position.set(0, 0.915, 0);
  radGroup.add(cab);

  // Heavy steel base plinth
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 1.1), MAT.darkSteel);
  basePlinth.position.set(0, 0.07, 0);
  radGroup.add(basePlinth);

  // Chrome corner angle brackets
  for (const bx of [-0.62, 0.62]) {
    for (const bz of [-0.49, 0.49]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.82, 0.06), MAT.steel);
      trim.position.set(bx, 0.915, bz);
      radGroup.add(trim);
    }
  }

  // Heavy front oven door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.2, 0.08), MAT.enamel);
  door.position.set(0, 0.85, 0.54);
  radGroup.add(door);

  // Dark viewing window with wire screen
  const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.06), MAT.darkSteel);
  windowFrame.position.set(0, 0.95, 0.59);
  radGroup.add(windowFrame);

  const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), new THREE.MeshBasicMaterial({ color: 0x24323c }));
  windowGlass.position.set(0, 0.95, 0.63);
  windowGlass.layers.set(NOINK);
  radGroup.add(windowGlass);

  // Big chrome latch handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 12), MAT.steel);
  handle.position.set(0.44, 0.85, 0.64);
  radGroup.add(handle);

  // Top control panel with rotary dials and "1947" badge
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 0.06), MAT.darkSteel);
  panel.position.set(0, 1.62, 0.54);
  radGroup.add(panel);

  const dialL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), MAT.brass);
  dialL.rotation.x = Math.PI / 2;
  dialL.position.set(-0.25, 1.62, 0.58);
  radGroup.add(dialL);

  const dialR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), MAT.brass);
  dialR.rotation.x = Math.PI / 2;
  dialR.position.set(0.25, 1.62, 0.58);
  radGroup.add(dialR);
}

// Vertical Height Scale Measuring Stick (marked up to 6 FT)
const scaleStick = new THREE.Group();
{
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.95, 0.08), MAT.bench);
  pole.position.set(0, 0.975, 0);
  scaleStick.add(pole);

  // Tick marks: 2 FT (0.61m), 4 FT (1.22m), 6 FT (1.83m)
  for (const [ft, y] of [[2, 0.61], [4, 1.22], [6, 1.83]]) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.06), MAT.darkSteel);
    tick.position.set(0.08, y, 0.02);
    scaleStick.add(tick);
  }
}
scaleStick.position.set(-0.85, 0, 0.5);
radGroup.add(scaleStick);

// Modern Countertop Microwave (sitting on workbench for scale comparison)
const modernMicrowave = new THREE.Group();
{
  const smallCab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.4), MAT.enamel);
  smallCab.position.set(0, 0.18, 0);
  modernMicrowave.add(smallCab);

  const smallWin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.04), MAT.darkSteel);
  smallWin.position.set(-0.06, 0.18, 0.21);
  modernMicrowave.add(smallWin);

  const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.03), MAT.darkSteel);
  keypad.position.set(0.18, 0.18, 0.21);
  modernMicrowave.add(keypad);
}
modernMicrowave.position.set(-0.85, 1.0, 0.32);
modernMicrowave.visible = false;
labProps.add(modernMicrowave);

radGroup.position.set(3.8, 0, 0.2);
radGroup.visible = false;
radGroup.traverse((o) => {
  if (o.isMesh && !o.layers.isEnabled(NOINK)) {
    o.castShadow = true;
    o.receiveShadow = true;
    world.push(o);
  }
});
scene.add(radGroup);

// ---------- Sky Dome ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    top: { value: new THREE.Color() },
    mid: { value: new THREE.Color() },
    hor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3() },
    sunCol: { value: new THREE.Color() },
    sunSize: { value: 0 }
  },
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }",
  fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize; varying vec3 vD;
    void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.22, h)), top, smoothstep(0.18, 0.85, h));
      float s = max(dot(normalize(vD), sunDir), 0.0); c += sunCol * (pow(s, 12.0) * 0.35 + smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.7, s) * 2.0);
      gl_FragColor = vec4(c, 1.0); }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), skyMat);
sky.layers.set(NOINK);
sky.renderOrder = -1;
sky.frustumCulled = false;
scene.add(sky);

// ---------- Lights ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);

// ---------- Character Cards ----------
const SC = 0.00225; // metres per design unit (card is 2.25m tall)
const cards = new Map();
const drawFn = {
  front: (p, a) => T.bodyFrontX(p, a.outfit, a.opts),
  side: (p, a) => T.bodySideX(p, a.outfit, a.opts),
};

const blobTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  T.fxBlob(new T.Pen(c.getContext("2d")), "#484a56");
  return ctex(c, false);
})();

const multiply = (map) => new THREE.MeshBasicMaterial({
  map,
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.ZeroFactor,
  blendDst: THREE.SrcColorFactor,
  fog: false,
  polygonOffset: true,
  polygonOffsetFactor: -2
});

const ndCardMat = (map, pullU) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, uPull: pullU },
  side: THREE.DoubleSide,
  vertexShader: "uniform float uPull; varying vec2 vUv; varying float vZ; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); float d = length(mv.xyz); mv.xyz *= max(0.15, (d - uPull) / d); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform sampler2D map; varying vec2 vUv; varying float vZ; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, vZ); }",
});

const getCard = (id, DW, DH) => {
  let c = cards.get(id);
  if (c && c.DW === DW && c.DH === DH) return c;
  if (c) { scene.remove(c.mesh); scene.remove(c.blob); }
  const sc = DW > 600 ? 1.6 : 2;
  const cv = document.createElement("canvas");
  cv.width = Math.round(DW * sc);
  cv.height = Math.round(DH * sc);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(DW * SC, DH * SC);
  geo.translate(0, (DH * SC) / 2 - 25 * SC, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const pullU = { value: 0.3 };
  mat.customProgramCacheKey = () => "cardpull";
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPull = pullU;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uPull;")
      .replace("#include <project_vertex>", "#include <project_vertex>\n{ float d = length(mvPosition.xyz); mvPosition.xyz *= max(0.15, (d - uPull) / d); gl_Position = projectionMatrix * mvPosition; }");
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.order = "YXZ";
  mesh.castShadow = true;
  mesh.layers.set(NOINK);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: tex,
    alphaTest: 0.5,
    side: THREE.DoubleSide
  });
  mesh.userData.nd = ndCardMat(tex, pullU);
  const bg = new THREE.PlaneGeometry(1.1, 0.55);
  bg.rotateX(-Math.PI / 2);
  const blob = new THREE.Mesh(bg, multiply(blobTex));
  blob.layers.set(NOINK);
  scene.add(mesh);
  scene.add(blob);
  c = { id, DW, DH, sc, cv, g: cv.getContext("2d"), tex, mesh, blob, key: "", pullU };
  cards.set(id, c);
  return c;
};

// ---------- FX Cards ----------
const fxCards = new Map();
const fxDraw = {
  burst: (p, s) => T.fxBurst(p, s.t, s.col || "#fff3b0"),
  puff: (p, s) => T.fxPuff(p, s.t),
  chips: (p, s) => T.fxChips(p, s.t, s.seed || 1),
  glow: (p) => T.fxGlow(p),
};
const FXSIZE = { burst: [500, 500], puff: [300, 300], chips: [400, 400], glow: [256, 256] };

const getFx = (id, kind) => {
  let c = fxCards.get(id);
  if (c && c.kind === kind) return c;
  const [w, h] = FXSIZE[kind] || [300, 300];
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, h / w),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: kind === "glow" ? THREE.AdditiveBlending : THREE.NormalBlending
    })
  );
  mesh.layers.set(NOINK);
  scene.add(mesh);
  c = { id, kind, cv, g: cv.getContext("2d"), tex, mesh, key: "" };
  fxCards.set(id, c);
  return c;
};

// ---------- Post-Processing Render Targets & Shaders ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtND = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtPost = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });

const ndWorld = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: "varying vec3 vN; varying float vZ; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "varying vec3 vN; varying float vZ; void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); gl_FragColor = vec4(n, vZ); }",
});

const FSV = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
fsQuad.frustumCulled = false;
fsScene.add(fsQuad);

const inkMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rtColor.texture },
    tND: { value: rtND.texture },
    texel: { value: new THREE.Vector2(1 / W, 1 / H) },
    px: { value: PX },
    inkCol: { value: new THREE.Color(0x0b0a0c) },
    fogCol: { value: new THREE.Color() },
    sat: { value: 1.06 },
    expo: { value: 1 },
    lift: { value: new THREE.Vector3(0.02, 0.025, 0.04) },
    gain: { value: new THREE.Vector3(1, 1, 1) },
    vign: { value: 0.18 },
    flash: { value: 0 },
    inkK: { value: 1 },
    dbg: { value: 0 },
  },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float px; uniform vec3 inkCol; uniform vec3 fogCol;
  uniform float sat; uniform float expo; uniform vec3 lift; uniform vec3 gain; uniform float vign; uniform float flash; uniform float inkK; uniform float dbg; varying vec2 vUv;
  vec3 shoulder(vec3 x){ return mix(x, 0.78 + 0.3 * (1.0 - exp(-(x - 0.78) / 0.3)), step(0.78, x)); }
  void main(){
    vec3 c = texture2D(tColor, vUv).rgb * expo;
    vec4 nd = texture2D(tND, vUv); float zc = nd.a > 0.0 ? nd.a : 1e5; vec3 nc = nd.xyz;
    float ink = 0.0;
    if (dot(nc, nc) > 0.25 && zc < 4000.0) {
      float w = mix(5.0, 3.2, smoothstep(1.8, 4.5, log(zc))) * px;
      float bD = 99.0, bC = 99.0;
      for (int d = 0; d < 4; d++) {
        vec2 st = d == 0 ? vec2(1.0, 0.0) : d == 1 ? vec2(0.0, 1.0) : d == 2 ? vec2(0.7071, 0.7071) : vec2(0.7071, -0.7071);
        for (int s = 1; s <= 6; s++) {
          float fs = float(s);
          float fl = fs * (d > 1 ? 1.4142 : 1.0);
          if (fl > w + 1.0) break;
          vec2 o = st * texel * fs;
          vec4 a = texture2D(tND, vUv + o), b = texture2D(tND, vUv - o);
          if (a.a <= 0.0) a.a = 1e5; if (b.a <= 0.0) b.a = 1e5;
          float k = 2.0 - zc / a.a - zc / b.a;
          if (k > 0.02) bD = min(bD, fl);
          if (dot(a.xyz, a.xyz) > 0.25 && abs(a.a - zc) < zc * 0.03 && dot(a.xyz, nc) < 0.7) bC = min(bC, fl);
          if (dot(b.xyz, b.xyz) > 0.25 && abs(b.a - zc) < zc * 0.03 && dot(b.xyz, nc) < 0.7) bC = min(bC, fl);
        }
      }
      float iD = 1.0 - smoothstep(w - 0.6, w + 0.4, bD);
      float iC = (1.0 - smoothstep(w * 0.7 - 0.6, w * 0.7 + 0.4, bC)) * 0.85;
      ink = max(iD, iC) * (1.0 - smoothstep(170.0, 560.0, zc)) * inkK;
    }
    vec3 ic = mix(inkCol, fogCol * 0.55, 0.3 * smoothstep(60.0, 400.0, zc));
    c = mix(c, ic, ink);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, sat);
    c = c * gain + lift * (1.0 - clamp(c, 0.0, 1.0));
    c = shoulder(c);
    vec2 q = (vUv - 0.5) * vec2(0.75, 1.0);
    c *= 1.0 - vign * smoothstep(0.25, 0.75, length(q));
    c = mix(c, vec3(1.0), flash);
    if (dbg > 0.5) c = vec3(ink, zc / 60.0, dot(nc, nc));
    gl_FragColor = vec4(c, 1.0);
  }`,
});

const dofMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rtPost.texture },
    tND: { value: rtND.texture },
    texel: { value: new THREE.Vector2(1 / W, 1 / H) },
    focus: { value: 10 },
    cInf: { value: 0 },
    cMax: { value: 18 }
  },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float focus; uniform float cInf; uniform float cMax; varying vec2 vUv;
  float coc(float z){ z = z > 0.0 ? z : 1e5; return min(cMax, cInf * abs(1.0 - focus / max(z, 0.05))); }
  vec3 enc(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main(){
    vec3 c0 = texture2D(tColor, vUv).rgb;
    float cc = coc(texture2D(tND, vUv).a);
    if (cInf < 0.3 || cc < 0.6) { gl_FragColor = vec4(enc(c0), 1.0); return; }
    vec3 acc = c0; float ws = 1.0;
    for (int i = 0; i < 48; i++) {
      float fi = float(i) + 0.5, r = sqrt(fi / 48.0) * cc, a = fi * 2.39996;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
      float cq = coc(texture2D(tND, uv).a);
      float w = clamp(cq - r + 1.0, 0.0, 1.0);
      acc += texture2D(tColor, uv).rgb * w; ws += w;
    }
    gl_FragColor = vec4(enc(acc / ws), 1.0);
  }`,
});

// ---------- Light Application ----------
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const col = (c) => new THREE.Color(c);

const applyLight = (L, S) => {
  const d = new THREE.Vector3(
    Math.cos(L.el * Math.PI / 180) * Math.cos(L.az * Math.PI / 180),
    Math.sin(L.el * Math.PI / 180),
    Math.cos(L.el * Math.PI / 180) * Math.sin(L.az * Math.PI / 180)
  ).normalize();

  sun.color.setRGB(L.sun[0], L.sun[1], L.sun[2]);
  sun.intensity = Math.PI;
  hemi.color.setRGB(L.amb[0], L.amb[1], L.amb[2]);
  hemi.groundColor.setRGB(L.gnd[0], L.gnd[1], L.gnd[2]);
  hemi.intensity = Math.PI;

  const c = v3(S.shadow.c), r = S.shadow.r;
  sun.position.copy(c).addScaledVector(d, 30);
  sun.target.position.copy(c);
  const sc = sun.shadow.camera;
  sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 80;
  sc.updateProjectionMatrix();

  skyMat.uniforms.top.value.copy(col(L.top)).convertSRGBToLinear();
  skyMat.uniforms.hor.value.copy(col(L.hor)).convertSRGBToLinear();
  skyMat.uniforms.mid.value.copy(col(L.mid)).convertSRGBToLinear();
  skyMat.uniforms.sunDir.value.copy(d);
  skyMat.uniforms.sunCol.value.setRGB(L.sun[0] * 0.6, L.sun[1] * 0.5, L.sun[2] * 0.4);
  skyMat.uniforms.sunSize.value = L.disc || 0;

  scene.fog.color.copy(col(L.hor)).convertSRGBToLinear();
  scene.fog.near = L.fog[0];
  scene.fog.far = L.fog[1];

  inkMat.uniforms.fogCol.value.copy(scene.fog.color);
  inkMat.uniforms.sat.value = L.sat;
  inkMat.uniforms.expo.value = L.expo ?? 1;
  inkMat.uniforms.lift.value.set(L.lift[0], L.lift[1], L.lift[2]);
  inkMat.uniforms.gain.value.set(L.gain[0], L.gain[1], L.gain[2]);

  return d;
};

const camRightOf = () => {
  const r = new THREE.Vector3();
  camera.matrixWorld.extractBasis(r, new THREE.Vector3(), new THREE.Vector3());
  return r;
};

// ==========================================
// PER-FRAME RENDER FUNCTION
// ==========================================

window.renderFrame = (f) => {
  const S = frameState(f);
  const w = S.world;

  // Update Experiment Props based on world state
  chocolateGroup.visible = !!w.chocolate;
  if (w.chocolate) {
    const melt = w.chocolateMelt || 0;
    if (melt > 0.02) {
      meltPuddle.visible = true;
      meltPuddle.scale.set(1 + melt * 0.9, 1, 1 + melt * 0.9);
      candyBar.scale.set(1 - melt * 0.2, Math.max(0.2, 1 - melt * 0.75), 1 + melt * 0.25);
      candyBar.position.y = 1.035 - melt * 0.02;
    } else {
      meltPuddle.visible = false;
      candyBar.scale.set(1, 1, 1);
      candyBar.position.y = 1.035;
    }
  }

  // Popcorn visibility & pop reaction
  popcornGroup.visible = !!w.popcorn;
  if (w.popcorn) {
    const pop = w.popcornPop || 0;
    for (const [i, p] of poppedPuffs.entries()) {
      p.visible = pop > 0.02;
      if (pop > 0.02) {
        const scatter = pop * 0.14;
        p.position.y = 1.06 + Math.sin(i * 1.5) * scatter + (pop * 0.12);
      }
    }
    for (const k of rawKernels) {
      k.visible = pop < 0.5;
    }
  }

  // Egg visibility & burst
  eggGroup.visible = !!w.egg;
  if (w.egg) {
    const burst = (w.eggBurst !== undefined && w.eggBurst > 0) || f >= 579;
    wholeEgg.visible = !burst;
    eggSplat.visible = burst;
    if (burst) {
      const bval = w.eggBurst || 1;
      eggSplat.scale.set(1 + bval * 0.8, 1, 1 + bval * 0.8);
    }
  }

  // Pulsing Wave Rings from Waveguide Horn
  const energy = w.energy || 0;
  for (let i = 0; i < waveRings.length; i++) {
    const ring = waveRings[i];
    if (energy > 0.05) {
      ring.visible = true;
      const phase = ((f * 0.08 + i * 0.25) % 1.0);
      ring.scale.setScalar(0.7 + phase * 1.2);
      ring.position.x = 0.05 + phase * 0.7;
      ring.material.opacity = (1.0 - phase) * 0.75 * Math.min(1, energy);
    } else {
      ring.visible = false;
    }
  }

  // Toggle Workbench & Prototype
  labProps.visible = !w.radarange || !!w.modernMicrowave;
  radGroup.visible = !!w.radarange;
  if (w.radarange) {
    const rx = w.radPos ? w.radPos[0] : 0.35;
    const rz = w.radPos ? w.radPos[1] : -0.2;
    radGroup.position.set(rx, 0, rz);
  }
  scaleStick.visible = !!w.scaleRuler;
  modernMicrowave.visible = !!w.modernMicrowave;

  // Camera setup
  camera.position.set(...S.cam.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...S.cam.look);
  camera.fov = S.cam.fov;
  camera.updateProjectionMatrix();
  if (S.cam.roll) camera.rotateZ((S.cam.roll * Math.PI) / 180);
  camera.updateMatrixWorld();
  const camR = camRightOf();

  // Apply lighting
  applyLight(S.light, S);

  // Update Character Cards
  const seen = new Set();
  for (const a of S.actors) {
    const DW = a.wide ? 1000 : 600, DH = a.wide ? 1150 : 1000;
    const c = getCard(a.id, DW, DH);
    seen.add(a.id);
    const key = a.kind + JSON.stringify(a.opts) + (a.outfitKey || "");
    if (key !== c.key) {
      c.key = key;
      c.g.setTransform(1, 0, 0, 1, 0, 0);
      c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      c.g.setTransform(c.sc, 0, 0, c.sc, 0, 0);
      c.g.translate((DW - 600) / 2, DH - 1000);
      drawFn[a.kind](new T.Pen(c.g), a);
      c.tex.needsUpdate = true;
    }
    const y = a.y ?? 0.0;
    c.mesh.position.set(a.pos[0], y + (a.lift || 0), a.pos[1]);
    const s = a.scale || 1;
    let mirror = 1;
    if (a.kind === "side" && a.dir) mirror = a.dir[0] * camR.x + a.dir[1] * camR.z < 0 ? -1 : 1;
    c.mesh.scale.set(s * mirror, s, s);
    c.mesh.rotation.set(0, Math.atan2(camera.position.x - a.pos[0], camera.position.z - a.pos[1]), ((a.roll || 0) * Math.PI) / 180);
    c.mesh.material.color.setRGB(...S.light.card);
    c.pullU.value = a.pull ?? 0.3;
    c.mesh.visible = a.visible !== false;
    c.blob.visible = a.visible !== false && a.blob !== false && !a.lift;
    c.blob.position.set(a.pos[0], 0.03, a.pos[1]);
    c.blob.scale.setScalar(s);
    c.blob.rotation.y = c.mesh.rotation.y;
  }
  for (const [id, c] of cards) if (!seen.has(id)) { c.mesh.visible = false; c.blob.visible = false; }

  // Update FX Cards
  const seenFx = new Set();
  for (const e of (window.NOFX ? [] : S.fx)) {
    const c = getFx(e.id, e.kind);
    seenFx.add(e.id);
    const key = JSON.stringify([e.t, e.seed, e.col]);
    if (key !== c.key) {
      c.key = key;
      c.g.setTransform(1, 0, 0, 1, 0, 0);
      c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      if (fxDraw[e.kind]) fxDraw[e.kind](new T.Pen(c.g), e);
      c.tex.needsUpdate = true;
    }
    c.mesh.position.set(...e.pos);
    c.mesh.quaternion.copy(camera.quaternion);
    if (e.rot) c.mesh.rotateZ(e.rot);
    c.mesh.scale.set(e.size * (e.mirror ? -1 : 1), e.size, e.size);
    c.mesh.material.opacity = e.alpha ?? 1;
    c.mesh.visible = true;
  }
  for (const [id, c] of fxCards) if (!seenFx.has(id)) c.mesh.visible = false;

  sky.position.copy(camera.position);

  // Pass 1: Colour Pass
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rtColor);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, camera);

  // Pass 2: Normal + Depth Pass (world inked, cards = depth only)
  const hidden = [], swapped = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (o.userData.nd) {
      swapped.push([o, o.material]);
      o.material = o.userData.nd;
    } else if (world.includes(o)) {
      swapped.push([o, o.material]);
      o.material = ndWorld;
    } else {
      hidden.push(o);
      o.visible = false;
    }
  });

  const fog = scene.fog;
  scene.fog = null;
  renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rtND);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  scene.fog = fog;

  for (const [o, m] of swapped) o.material = m;
  for (const o of hidden) o.visible = true;

  // Pass 3: Inking + Color Grading
  inkMat.uniforms.dbg.value = window.INKDBG ? 1 : 0;
  inkMat.uniforms.flash.value = S.flash || 0;
  inkMat.uniforms.vign.value = S.vign ?? 0.18;
  fsQuad.material = inkMat;
  renderer.setRenderTarget(rtPost);
  renderer.render(fsScene, fsCam);

  // Pass 4: Lens Blur (DOF) to screen
  dofMat.uniforms.focus.value = S.dof.focus;
  dofMat.uniforms.cInf.value = window.NODOF ? 0 : S.dof.cInf * PX;
  fsQuad.material = dofMat;
  renderer.setRenderTarget(null);
  renderer.render(fsScene, fsCam);

  return canvas.toDataURL("image/jpeg", 0.95);
};

window.TOTAL = TOTAL;
window.ready = true;
