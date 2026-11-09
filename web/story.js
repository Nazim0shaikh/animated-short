// Staging for "The Candy Bar That Started Microwaves": every frame is a pure function of frame number.
import { clamp, lin, smooth, smoother, easeOut, easeIn, easeInOut, back, lerp, lerp3, add3, camKeys, kick, blinkAt, idle, q } from "./motion.js";
import { PERCY, PERCY_LAB, COWORKER } from "./castdefs.js";

export const FPS = 30, TOTAL = 1132;

// Light presets
const LP = {
  day: {
    az: 125, el: 46, sun: [1.3, 1.2, 1.05], amb: [0.42, 0.42, 0.46], gnd: [0.28, 0.26, 0.24],
    top: "#4a6888", mid: "#8aa0b5", hor: "#c8ccd0", fog: [25, 120], sat: 1.06,
    lift: [0.02, 0.025, 0.04], gain: [1, 1, 1], card: [1, 0.98, 0.96], cloud: [1, 1, 1], disc: 0
  },
  lab_focused: {
    az: 110, el: 52, sun: [1.35, 1.22, 1.0], amb: [0.38, 0.38, 0.44], gnd: [0.25, 0.24, 0.22],
    top: "#3d546e", mid: "#7a90a4", hor: "#b8bec4", fog: [20, 110], sat: 1.08,
    lift: [0.02, 0.02, 0.04], gain: [1.02, 1, 0.98], card: [1, 0.97, 0.94], cloud: [1, 1, 1], disc: 0
  },
  blue_energy: {
    az: 135, el: 40, sun: [0.8, 1.15, 1.4], amb: [0.28, 0.35, 0.52], gnd: [0.18, 0.22, 0.32],
    top: "#1b2c4e", mid: "#3b5882", hor: "#6f94b8", fog: [18, 100], sat: 1.15,
    lift: [0.015, 0.025, 0.06], gain: [0.95, 1.02, 1.12], card: [0.88, 0.94, 1.02], cloud: [0.6, 0.8, 1.0], disc: 0.002
  },
  golden: {
    az: 155, el: 22, sun: [1.55, 1.15, 0.72], amb: [0.36, 0.32, 0.44], gnd: [0.28, 0.24, 0.2],
    top: "#50628e", mid: "#b89078", hor: "#f0c498", fog: [22, 110], sat: 1.14,
    lift: [0.03, 0.02, 0.05], gain: [1.05, 1, 0.92], card: [1.06, 0.96, 0.86], cloud: [1, 0.88, 0.75], disc: 0.003
  }
};

const SHOTS = [];
const shot = (id, a, b, fn) => SHOTS.push({ id, a, b, fn });

// Helpers
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a, b) => Math.hypot(...sub(a, b));
const camRight = (c) => norm(cross(sub(c.look, c.pos), [0, 1, 0]));
const camUp = (c) => norm(cross(camRight(c), sub(c.look, c.pos)));
const lightAng = (c, L, mirror = 1) => {
  const d = [Math.cos(L.el * Math.PI / 180) * Math.cos(L.az * Math.PI / 180), Math.sin(L.el * Math.PI / 180), Math.cos(L.el * Math.PI / 180) * Math.sin(L.az * Math.PI / 180)];
  const r = camRight(c), u = camUp(c);
  const sx = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) * mirror, sy = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
  return q(Math.atan2(-Math.max(0.25, sy), sx), 0.35);
};

// ---------------- 1. HOOK: One melted candy bar helped spark the microwave oven ----------------
shot("hook", 0, 120, (f) => {
  const t = lin(0, 120, f);
  const cam = {
    pos: lerp3([0.08, 1.82, 2.35], [0.08, 1.75, 2.15], smoother(t)),
    look: lerp3([0.08, 1.34, 0.18], [0.08, 1.32, 0.18], smoother(t)),
    fov: lerp(42, 39, t),
  };
  const L = LP.day;
  const melt = smooth(lin(15, 95, f));
  const id = idle(f, 3);
  const actors = [
    {
      id: "percy",
      kind: "front",
      outfit: PERCY,
      pos: [0.08, -0.05],
      opts: {
        expr: f < 45 ? "squint" : "surprised",
        armR: "pocket",
        armL: "hang",
        blink: blinkAt(f, 3),
        seed: 3,
        light: lightAng(cam, L),
        tilt: q(id.tilt * 0.5, 0.5),
        headTilt: q(f < 45 ? -4 : 2, 1),
      }
    }
  ];

  const world = {
    chocolate: true,
    chocolateMelt: melt,
    magnetron: true,
    energy: 0.15 * Math.sin(f * 0.1),
    progress: 0,
  };

  const dof = { focus: dist(cam.pos, [0.08, 1.25, 0.32]), cInf: 8 };
  const shadow = { c: [0, 0, 0], r: 4 };

  return { cam, L, actors, fx: [], world, kicks: [], dof, shadow, vign: 0.18 };
});

// ---------------- 2. LAB: 1945 Raytheon radar lab setup ----------------
shot("lab", 120, 390, (f) => {
  const cam = camKeys([
    { f: 120, pos: [-0.15, 2.1, 3.8], look: [-0.12, 1.32, 0.1], fov: 45 },
    { f: 250, pos: [-0.08, 1.95, 3.4], look: [-0.1, 1.30, 0.1], fov: 42, ease: smoother },
    { f: 390, pos: [0.0, 1.85, 3.1], look: [-0.06, 1.28, 0.1], fov: 40, ease: (x) => x },
  ], f);

  const L = LP.lab_focused;
  const id3 = idle(f, 3), id11 = idle(f, 11);
  const radarPower = smooth(lin(140, 230, f));

  const actors = [
    {
      id: "percy",
      kind: "front",
      outfit: PERCY,
      pos: [0.26, 0.0],
      opts: {
        expr: f < 270 ? "focused" : "surprised",
        armR: f < 270 ? "point" : "temple",
        armL: "pocket",
        blink: blinkAt(f, 3),
        seed: 3,
        light: lightAng(cam, L),
        tilt: q(id3.tilt * 0.5, 0.5),
      }
    },
    {
      id: "coworker",
      kind: "front",
      outfit: COWORKER,
      pos: [-0.48, 0.12],
      opts: {
        expr: f < 270 ? "neutral" : "curious",
        armR: "chin",
        armL: "hang",
        blink: blinkAt(f, 11),
        seed: 11,
        light: lightAng(cam, L),
        tilt: q(id11.tilt * 0.5, 0.5),
      }
    }
  ];

  const world = {
    chocolate: true,
    chocolateMelt: 1.0,
    magnetron: true,
    energy: radarPower * (0.8 + 0.2 * Math.sin(f * 0.25)),
    progress: 0,
  };

  const dof = { focus: dist(cam.pos, [0.0, 1.3, 0.0]), cInf: 7 };
  const shadow = { c: [0, 0, 0], r: 5 };

  return { cam, L, actors, fx: [], world, kicks: [], dof, shadow, vign: 0.18 };
});

// ---------------- 3. POPCORN: He tested popcorn kernels. They popped. ----------------
shot("popcorn", 390, 522, (f) => {
  const t = lin(390, 522, f);
  const cam = {
    pos: lerp3([0.14, 1.78, 2.4], [0.14, 1.70, 2.2], smoother(t)),
    look: lerp3([0.14, 1.30, 0.18], [0.14, 1.28, 0.18], smoother(t)),
    fov: lerp(41, 38, t),
  };

  const L = LP.lab_focused;
  const popped = f >= 488;
  const popT = lin(488, 515, f);
  const id = idle(f, 3);

  const actors = [
    {
      id: "percy",
      kind: "front",
      outfit: PERCY_LAB,
      pos: [0.14, -0.05],
      opts: {
        expr: popped ? "shock" : "curious",
        armR: popped ? "up" : "chin",
        armL: "belly",
        blink: blinkAt(f, 3),
        seed: 3,
        light: lightAng(cam, L),
        tilt: q(popped ? -4 : id.tilt * 0.5, 0.5),
      }
    }
  ];

  const fx = [];
  if (popped && f < 518) {
    const s = q((f - 487) / 28, 0.04);
    fx.push({ id: "p1", kind: "burst", pos: [0.14, 1.25, 0.32], size: 1.6, t: s, col: "#fff7ce" });
    fx.push({ id: "p2", kind: "chips", pos: [0.14, 1.3, 0.32], size: 1.2, t: s, seed: 5 });
  }

  const world = {
    magnetron: true,
    energy: 1.0,
    popcorn: true,
    popcornPop: popped ? smooth(popT) : 0,
    progress: 0,
  };

  const kicks = popped ? [{ f: 488, a: 0.024 }, { f: 494, a: 0.01 }] : [];
  const dof = { focus: dist(cam.pos, [0.14, 1.25, 0.32]), cInf: 8 };
  const shadow = { c: [0, 0, 0], r: 4 };

  return { cam, L, actors, fx, world, kicks, dof, shadow, vign: 0.18 };
});

// ---------------- 4. EGG: Then he tried an egg. It burst. ----------------
shot("egg", 522, 625, (f) => {
  const t = lin(522, 625, f);
  const cam = {
    pos: lerp3([0.08, 1.76, 2.4], [0.08, 1.68, 2.2], smoother(t)),
    look: lerp3([0.08, 1.30, 0.18], [0.08, 1.28, 0.18], smoother(t)),
    fov: lerp(41, 38, t),
  };

  const L = LP.lab_focused;
  const burst = f >= 579;
  const burstT = lin(579, 610, f);
  const id3 = idle(f, 3), id11 = idle(f, 11);

  const actors = [
    {
      id: "percy",
      kind: "front",
      outfit: PERCY_LAB,
      pos: [0.26, -0.05],
      opts: {
        expr: burst ? "shock" : "curious",
        armR: burst ? "temple" : "point",
        armL: "belly",
        blink: blinkAt(f, 3),
        seed: 3,
        light: lightAng(cam, L),
        tilt: q(burst ? -6 : id3.tilt * 0.5, 0.5),
      }
    },
    {
      id: "coworker",
      kind: "front",
      outfit: COWORKER,
      pos: [-0.26, -0.1],
      opts: {
        expr: burst ? "shock" : "squint",
        armR: burst ? "up" : "chin",
        armL: "hang",
        blink: blinkAt(f, 11),
        seed: 11,
        light: lightAng(cam, L),
        tilt: q(burst ? 5 : id11.tilt * 0.5, 0.5),
      }
    }
  ];

  const fx = [];
  if (burst && f < 618) {
    const s = q((f - 578) / 32, 0.035);
    fx.push({ id: "e1", kind: "burst", pos: [0.14, 1.24, 0.32], size: 2.2, t: s, col: "#ffe875" });
    fx.push({ id: "e2", kind: "chips", pos: [0.14, 1.28, 0.32], size: 1.5, t: s, seed: 9 });
  }

  const world = {
    magnetron: true,
    energy: 1.0,
    egg: true,
    eggBurst: burst ? smooth(burstT) : 0,
    progress: 0,
  };

  const kicks = burst ? [{ f: 579, a: 0.032 }, { f: 585, a: 0.014 }] : [];
  const dof = { focus: dist(cam.pos, [0.14, 1.25, 0.32]), cInf: 9 };
  const shadow = { c: [0, 0, 0], r: 4 };

  return { cam, L, actors, fx, world, kicks, dof, shadow, vign: 0.2 };
});

// ---------------- 5. DISCOVERY: Spencer realized invisible energy cooks food ----------------
shot("discovery", 625, 767, (f) => {
  const cam = camKeys([
    { f: 625, pos: [-0.08, 1.85, 2.9], look: [-0.05, 1.34, 0.1], fov: 41 },
    { f: 700, pos: [0.05, 1.80, 2.75], look: [-0.02, 1.34, 0.1], fov: 40, ease: smoother },
    { f: 767, pos: [0.16, 1.76, 2.6], look: [0.0, 1.34, 0.1], fov: 39, ease: (x) => x },
  ], f);

  const L = LP.blue_energy;
  const id3 = idle(f, 3), id11 = idle(f, 11);

  const actors = [
    {
      id: "percy",
      kind: "front",
      outfit: PERCY_LAB,
      pos: [0.18, 0.0],
      opts: {
        expr: "smile",
        armR: "point",
        armL: "hip",
        blink: blinkAt(f, 3),
        seed: 3,
        light: lightAng(cam, L),
        tilt: q(id3.tilt * 0.5, 0.5),
      }
    },
    {
      id: "coworker",
      kind: "front",
      outfit: COWORKER,
      pos: [-0.44, 0.12],
      opts: {
        expr: "smile",
        armR: "hip",
        armL: "belly",
        blink: blinkAt(f, 11),
        seed: 11,
        light: lightAng(cam, L),
        tilt: q(id11.tilt * 0.5, 0.5),
      }
    }
  ];

  const world = {
    magnetron: true,
    energy: 1.0,
    energyRipples: true,
    progress: 0,
  };

  const dof = { focus: dist(cam.pos, [0.18, 1.34, 0.0]), cInf: 7 };
  const shadow = { c: [0, 0, 0], r: 5 };

  return { cam, L, actors, fx: [], world, kicks: [], dof, shadow, vign: 0.16 };
});

// ---------------- 6. PROTOTYPE: First model stood six feet tall, 750 pounds ----------------
shot("prototype", 767, 1018, (f) => {
  const cam = camKeys([
    { f: 767, pos: [-0.05, 1.15, 3.6], look: [0.0, 1.25, 0.0], fov: 46 },
    { f: 880, pos: [-0.05, 2.1, 4.0], look: [0.0, 1.35, 0.0], fov: 44, ease: smoother },
    { f: 1018, pos: [-0.05, 1.95, 3.8], look: [0.0, 1.30, 0.0], fov: 42, ease: (x) => x },
  ], f);

  const L = LP.lab_focused;
  const id3 = idle(f, 3);

  // Time-jump white flash on entrance
  const flash = f < 773 ? [0.65, 0.45, 0.25, 0.12, 0.05, 0.02][f - 767] : 0;

  const actors = [
    {
      id: "percy",
      kind: "front",
      outfit: PERCY_LAB,
      pos: [-0.48, 0.0],
      opts: {
        expr: "focused",
        armR: "point",
        armL: "hip",
        blink: blinkAt(f, 3),
        seed: 3,
        light: lightAng(cam, L),
        tilt: q(id3.tilt * 0.5, 0.5),
      }
    }
  ];

  const world = {
    radarange: true,
    radPos: [0.32, -0.1],
    scaleRuler: true,
    progress: 0,
  };

  const dof = { focus: dist(cam.pos, [0.0, 1.30, 0.0]), cInf: 6 };
  const shadow = { c: [0, 0, 0], r: 6 };

  return { cam, L, actors, fx: [], world, flash, kicks: [], dof, shadow, vign: 0.16 };
});

// ---------------- 7. PAYOFF: A pocket-sized accident led to a kitchen giant ----------------
shot("payoff", 1018, 1132, (f) => {
  const t = lin(1018, 1132, f);
  const cam = {
    pos: lerp3([-0.05, 1.82, 3.4], [-0.05, 1.76, 3.15], smoother(t)),
    look: lerp3([-0.05, 1.28, 0.1], [-0.05, 1.25, 0.1], smoother(t)),
    fov: lerp(43, 40, t),
    roll: lerp(0, -2.0, smooth(t)),
  };

  const L = LP.golden;
  const id3 = idle(f, 3);

  const actors = [
    {
      id: "percy",
      kind: "front",
      outfit: PERCY_LAB,
      pos: [-0.05, 0.0],
      opts: {
        expr: "soft",
        armR: "pocket",
        armL: "hip",
        blink: blinkAt(f, 3),
        seed: 3,
        light: lightAng(cam, L),
        tilt: q(id3.tilt * 0.5, 0.5),
      }
    }
  ];

  const world = {
    chocolate: true,
    chocolateMelt: 1.0,
    radarange: true,
    radPos: [0.58, -0.5],
    scaleRuler: true,
    modernMicrowave: true,
    progress: 0,
  };

  const dof = { focus: dist(cam.pos, [-0.05, 1.28, 0.1]), cInf: 7 };
  const shadow = { c: [0, 0, 0], r: 6 };

  return { cam, L, actors, fx: [], world, kicks: [], dof, shadow, vign: 0.15 };
});

export const SHOTLIST = SHOTS.map(({ id, a, b }) => ({ id, a, b }));
export const frameState = (f) => {
  const s = SHOTS.find((v) => f >= v.a && f < v.b) || SHOTS[SHOTS.length - 1];
  const r = s.fn(f);
  const cam = { ...r.cam, pos: [...r.cam.pos], look: [...r.cam.look] };
  const [kx, ky] = kick(f, r.kicks || []);
  if (kx || ky) {
    const d = dist(cam.pos, cam.look), R = camRight(cam), U = camUp(cam);
    cam.look = add3(cam.look, [R[0] * kx * d + U[0] * ky * d, R[1] * kx * d + U[1] * ky * d, R[2] * kx * d + U[2] * ky * d]);
  }
  return {
    shot: s.id,
    cam,
    light: r.L,
    actors: r.actors || [],
    fx: r.fx || [],
    world: r.world || {},
    flash: r.flash || 0,
    vign: r.vign ?? 0.18,
    dof: r.dof,
    shadow: r.shadow
  };
};
