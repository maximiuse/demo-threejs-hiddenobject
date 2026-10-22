// Blocky (voxel style) models built from boxes, procedural canvas textures and text sprites.
import * as THREE from 'three';

export const FONT = '"Rubik", "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const geoCache = new Map();
export function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  let g = geoCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
  return g;
}

const matCache = new Map();
export function mat(color) {
  let m = matCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); matCache.set(color, m); }
  return m;
}

export function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
  const material = color instanceof THREE.Material || Array.isArray(color) ? color : mat(color);
  const m = new THREE.Mesh(boxGeo(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// A limb that swings around its top end. foot = [w, h, d, color, zOffset]
function leg(parent, list, w, h, d, color, x, y, z, phase, foot) {
  const p = pivot(parent, x, y, z);
  box(p, w, h, d, color, 0, -h / 2, 0);
  if (foot) box(p, foot[0], foot[1], foot[2], foot[3], 0, -h + foot[1] / 2, foot[4] || 0);
  p.userData.phase = phase;
  list.push(p);
  return p;
}

// Four legs with a diagonal gait.
function quad(parent, list, w, h, color, xOff, zOff, top, hoof) {
  const foot = hoof ? [w + 0.02, 0.18, w + 0.02, hoof, 0] : null;
  leg(parent, list, w, h, w, color, -xOff, top, zOff, 0, foot);
  leg(parent, list, w, h, w, color, xOff, top, zOff, Math.PI, foot);
  leg(parent, list, w, h, w, color, -xOff, top, -zOff, Math.PI, foot);
  leg(parent, list, w, h, w, color, xOff, top, -zOff, 0, foot);
}

export function canvasTexture(w, h, draw, { repeat = null, nearest = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) t.magFilter = THREE.NearestFilter;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 4;
  return t;
}

// Grid of slightly different coloured cells, like voxel ground blocks.
export function cellTexture(colors, line, cells = 4, size = 16, seed = 1) {
  const rnd = mulberry32(seed);
  return canvasTexture(cells * size, cells * size, (ctx) => {
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
        ctx.fillRect(x * size, y * size, size, size);
        // a few darker pixels for texture
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let k = 0; k < 3; k++) ctx.fillRect(x * size + Math.floor(rnd() * (size - 2)), y * size + Math.floor(rnd() * (size - 2)), 2, 2);
        if (line) {
          ctx.fillStyle = line;
          ctx.fillRect(x * size, y * size, size, 1);
          ctx.fillRect(x * size, y * size, 1, size);
        }
      }
    }
  });
}

function plaidTexture() {
  return canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = '#c62828'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'rgba(20,0,0,0.45)';
    for (let i = 0; i < 32; i += 8) { ctx.fillRect(i, 0, 3, 32); ctx.fillRect(0, i, 32, 3); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 4; i < 32; i += 8) { ctx.fillRect(i, 0, 1, 32); ctx.fillRect(0, i, 32, 1); }
  });
}

function faceTexture(scared) {
  return canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = '#f1c27d'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#1d1d22';
    if (scared) {
      ctx.fillRect(7, 9, 7, 7); ctx.fillRect(18, 9, 7, 7);           // wide eyes
      ctx.fillStyle = '#fff'; ctx.fillRect(9, 11, 3, 3); ctx.fillRect(20, 11, 3, 3);
      ctx.fillStyle = '#1d1d22'; ctx.fillRect(7, 5, 7, 2); ctx.fillRect(18, 5, 7, 2); // raised brows
      ctx.fillStyle = '#5a1010'; ctx.fillRect(10, 19, 12, 9);         // screaming mouth
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 19, 12, 2);
      ctx.fillStyle = '#e57373'; ctx.fillRect(12, 25, 8, 3);
    } else {
      ctx.fillRect(8, 11, 5, 7); ctx.fillRect(19, 11, 5, 7);
      ctx.fillStyle = '#fff'; ctx.fillRect(9, 12, 2, 2); ctx.fillRect(20, 12, 2, 2);
      ctx.fillStyle = '#1d1d22'; ctx.fillRect(7, 8, 6, 2); ctx.fillRect(19, 8, 6, 2);
      ctx.fillRect(11, 23, 10, 2); ctx.fillRect(9, 21, 2, 2); ctx.fillRect(21, 21, 2, 2); // smile
    }
  });
}

export function createPlayer() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const legs = [], arms = [];
  const plaid = new THREE.MeshLambertMaterial({ map: plaidTexture() });
  const skin = '#f1c27d';
  const shoe = [0.54, 0.2, 0.64, '#f4f4f4', 0.06];
  leg(body, legs, 0.5, 1.0, 0.5, '#26262b', -0.26, 1.0, 0, 0, shoe);
  leg(body, legs, 0.5, 1.0, 0.5, '#26262b', 0.26, 1.0, 0, Math.PI, shoe);
  box(body, 1.04, 1.0, 0.54, plaid, 0, 1.5, 0);
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.76, 1.95, 0);
    box(a, 0.46, 0.72, 0.5, plaid, 0, -0.32, 0);
    box(a, 0.42, 0.3, 0.46, skin, 0, -0.84, 0);
    a.userData.side = s;
    arms.push(a);
  }
  const head = pivot(body, 0, 2.0, 0);
  const faces = { normal: faceTexture(false), scared: faceTexture(true) };
  const faceMat = new THREE.MeshLambertMaterial({ map: faces.normal });
  const sk = mat(skin);
  const headMesh = new THREE.Mesh(boxGeo(0.84, 0.84, 0.84), [sk, sk, sk, sk, faceMat, sk]);
  headMesh.position.y = 0.44;
  headMesh.castShadow = true;
  head.add(headMesh);
  const hair = '#1d1d22';
  box(head, 0.94, 0.26, 0.94, hair, 0, 0.92, -0.02);
  box(head, 0.94, 0.6, 0.2, hair, 0, 0.6, -0.4);
  box(head, 0.14, 0.38, 0.86, hair, -0.46, 0.7, -0.04);
  box(head, 0.14, 0.38, 0.86, hair, 0.46, 0.7, -0.04);
  box(head, 0.94, 0.16, 0.16, hair, 0, 0.8, 0.42);
  box(head, 0.3, 0.24, 0.3, hair, -0.2, 1.12, 0.18).rotation.y = 0.5;
  box(head, 0.3, 0.22, 0.3, hair, 0.18, 1.1, -0.15).rotation.y = 0.3;
  box(head, 0.26, 0.2, 0.26, hair, 0.25, 1.06, 0.28).rotation.y = 0.9;
  return {
    root, body, legs, arms, head,
    setScared(v) {
      const map = v ? faces.scared : faces.normal;
      if (faceMat.map !== map) { faceMat.map = map; faceMat.needsUpdate = true; }
    },
  };
}

function eyes(rig, parent, x, y, z, size = 0.14, color = '#111', brows = true) {
  for (const s of [-1, 1]) {
    rig.eyes.push(box(parent, size, size * 1.3, 0.05, color, s * x, y, z));
    if (brows) box(parent, size * 1.8, size * 0.45, 0.06, '#111', s * x, y + size * 1.15, z + 0.01).rotation.z = s * 0.45;
  }
}

// Builds an animal rig facing +z. Returns { root, legs, wings, tail, head, eyes, height }.
export function createAnimal(id) {
  const root = new THREE.Group();
  const rig = { root, legs: [], wings: [], tail: null, head: null, eyes: [], height: 2 };
  const L = rig.legs;
  const r = pivot(root, 0, 0, 0);
  rig.body = r;
  let head;
  switch (id) {
    case 'chicken': {
      const W = '#fafafa';
      const foot = [0.36, 0.08, 0.42, '#ffa000', 0.08];
      leg(r, L, 0.14, 0.62, 0.14, '#ffb300', -0.25, 0.66, 0, 0, foot);
      leg(r, L, 0.14, 0.62, 0.14, '#ffb300', 0.25, 0.66, 0, Math.PI, foot);
      box(r, 1.1, 1.0, 1.3, W, 0, 1.15, 0);
      rig.tail = pivot(r, 0, 1.4, -0.6);
      box(rig.tail, 0.9, 0.8, 0.3, '#eeeeee', 0, 0.25, -0.1);
      head = pivot(r, 0, 1.75, 0.5);
      box(head, 0.7, 0.85, 0.7, W, 0, 0.25, 0);
      box(head, 0.16, 0.36, 0.6, '#e53935', 0, 0.84, -0.02);
      box(head, 0.42, 0.2, 0.36, '#ffa726', 0, 0.2, 0.5);
      box(head, 0.2, 0.3, 0.14, '#e53935', 0, -0.06, 0.4);
      eyes(rig, head, 0.2, 0.38, 0.36, 0.12);
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.6, 1.55, 0);
        box(w, 0.14, 0.7, 0.95, '#eeeeee', 0, -0.32, 0);
        w.userData.side = s;
        rig.wings.push(w);
      }
      rig.height = 2.7;
      break;
    }
    case 'duck': {
      const foot = [0.4, 0.08, 0.45, '#ff8f00', 0.1];
      leg(r, L, 0.14, 0.5, 0.14, '#ff8f00', -0.25, 0.55, 0, 0, foot);
      leg(r, L, 0.14, 0.5, 0.14, '#ff8f00', 0.25, 0.55, 0, Math.PI, foot);
      box(r, 1.1, 0.85, 1.5, '#cfd8dc', 0, 0.95, -0.05);
      box(r, 1.0, 0.7, 0.5, '#8d6e63', 0, 1.05, 0.6);
      rig.tail = pivot(r, 0, 1.15, -0.75);
      box(rig.tail, 0.6, 0.35, 0.4, '#37474f', 0, 0.12, -0.1);
      head = pivot(r, 0, 1.45, 0.6);
      box(head, 0.32, 0.5, 0.32, '#2e7d32', 0, 0.15, 0);
      box(head, 0.65, 0.65, 0.65, '#2e7d32', 0, 0.6, 0.05);
      box(head, 0.5, 0.14, 0.5, '#ffb300', 0, 0.45, 0.55);
      box(head, 0.7, 0.08, 0.68, '#ffffff', 0, 0.24, 0.05);
      eyes(rig, head, 0.2, 0.72, 0.39, 0.11);
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.6, 1.3, -0.05);
        box(w, 0.12, 0.55, 1.1, '#78909c', 0, -0.22, 0);
        w.userData.side = s;
        rig.wings.push(w);
      }
      rig.height = 2.3;
      break;
    }
    case 'pig': {
      const P = '#f8a5b8';
      quad(r, L, 0.36, 0.7, '#f48fb1', 0.42, 0.62, 0.72, '#8d5a6a');
      box(r, 1.4, 1.1, 2.0, P, 0, 1.25, 0);
      rig.tail = pivot(r, 0, 1.55, -1.0);
      box(rig.tail, 0.15, 0.15, 0.35, '#f48fb1', 0, 0.05, -0.15);
      head = pivot(r, 0, 1.4, 1.0);
      box(head, 1.0, 0.95, 0.8, P, 0, 0.1, 0.25);
      box(head, 0.55, 0.38, 0.22, '#f06292', 0, -0.02, 0.74);
      box(head, 0.1, 0.12, 0.04, '#7b1f3a', -0.12, -0.02, 0.86);
      box(head, 0.1, 0.12, 0.04, '#7b1f3a', 0.12, -0.02, 0.86);
      box(head, 0.32, 0.32, 0.14, '#f48fb1', -0.36, 0.62, 0.2).rotation.z = 0.4;
      box(head, 0.32, 0.32, 0.14, '#f48fb1', 0.36, 0.62, 0.2).rotation.z = -0.4;
      eyes(rig, head, 0.24, 0.3, 0.66, 0.13);
      rig.height = 2.3;
      break;
    }
    case 'sheep': {
      quad(r, L, 0.3, 0.8, '#3e3e3e', 0.45, 0.65, 0.85);
      box(r, 1.6, 1.3, 2.0, '#f5f5f5', 0, 1.45, 0);
      box(r, 1.3, 0.3, 1.6, '#ffffff', 0, 2.15, 0);
      box(r, 1.75, 0.9, 1.4, '#fafafa', 0, 1.5, 0.1);
      head = pivot(r, 0, 1.7, 1.05);
      box(head, 0.7, 0.8, 0.8, '#3e3e3e', 0, 0, 0.3);
      box(head, 0.8, 0.3, 0.6, '#ffffff', 0, 0.45, 0.2);
      box(head, 0.4, 0.2, 0.25, '#2a2a2a', -0.5, 0.1, 0.2);
      box(head, 0.4, 0.2, 0.25, '#2a2a2a', 0.5, 0.1, 0.2);
      eyes(rig, head, 0.18, 0.1, 0.71, 0.12, '#fff', false);
      rig.tail = pivot(r, 0, 1.6, -1.0);
      box(rig.tail, 0.4, 0.4, 0.3, '#ffffff', 0, 0, -0.1);
      rig.height = 2.6;
      break;
    }
    case 'cow': {
      quad(r, L, 0.42, 1.0, '#ffffff', 0.55, 0.9, 1.05, '#3e2723');
      box(r, 1.7, 1.4, 2.6, '#ffffff', 0, 1.75, 0);
      box(r, 0.06, 0.7, 0.9, '#222222', 0.86, 1.85, 0.4);
      box(r, 0.06, 0.5, 0.7, '#222222', 0.86, 1.6, -0.7);
      box(r, 0.06, 0.6, 1.0, '#222222', -0.86, 1.8, -0.2);
      box(r, 1.0, 0.06, 0.9, '#222222', 0.2, 2.46, -0.3);
      box(r, 0.7, 0.3, 0.6, '#f8bbd0', 0, 1.0, -0.6);
      rig.tail = pivot(r, 0, 2.2, -1.3);
      box(rig.tail, 0.14, 1.0, 0.14, '#ffffff', 0, -0.5, -0.05);
      head = pivot(r, 0, 2.1, 1.3);
      box(head, 1.0, 1.0, 0.9, '#ffffff', 0, 0.1, 0.35);
      box(head, 0.9, 0.45, 0.28, '#f8bbd0', 0, -0.2, 0.9);
      box(head, 0.2, 0.36, 0.2, '#efe3c2', -0.42, 0.75, 0.3);
      box(head, 0.2, 0.36, 0.2, '#efe3c2', 0.42, 0.75, 0.3);
      box(head, 0.36, 0.2, 0.14, '#222', -0.62, 0.4, 0.3);
      box(head, 0.36, 0.2, 0.14, '#222', 0.62, 0.4, 0.3);
      eyes(rig, head, 0.24, 0.3, 0.81, 0.14);
      rig.height = 3.2;
      break;
    }
    case 'ostrich': {
      const S = '#f0b8a0';
      const foot = [0.36, 0.1, 0.5, '#d7907a', 0.12];
      leg(r, L, 0.22, 1.8, 0.22, S, -0.3, 1.85, 0, 0, foot);
      leg(r, L, 0.22, 1.8, 0.22, S, 0.3, 1.85, 0, Math.PI, foot);
      box(r, 1.4, 1.0, 1.8, '#212121', 0, 2.35, 0);
      rig.tail = pivot(r, 0, 2.6, -0.9);
      box(rig.tail, 1.1, 0.6, 0.4, '#fafafa', 0, 0.15, -0.1);
      head = pivot(r, 0, 2.7, 0.75);
      box(head, 0.28, 1.6, 0.28, S, 0, 0.75, 0);
      box(head, 0.45, 0.45, 0.6, S, 0, 1.65, 0.12);
      box(head, 0.3, 0.12, 0.3, '#ffcc80', 0, 1.58, 0.52);
      eyes(rig, head, 0.16, 1.72, 0.43, 0.1);
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.72, 2.6, 0);
        box(w, 0.12, 0.6, 1.2, '#424242', 0, -0.25, 0);
        w.userData.side = s;
        rig.wings.push(w);
      }
      rig.height = 4.6;
      break;
    }
    case 'wolf': {
      const G = '#7d7d84';
      quad(r, L, 0.3, 0.95, '#6a6a70', 0.38, 0.75, 1.0);
      box(r, 1.1, 1.0, 2.2, G, 0, 1.45, 0);
      box(r, 0.9, 0.3, 1.8, '#b0b0b8', 0, 0.98, 0.05);
      rig.tail = pivot(r, 0, 1.7, -1.1);
      box(rig.tail, 0.32, 0.32, 1.1, '#6a6a70', 0, 0.1, -0.5).rotation.x = -0.4;
      head = pivot(r, 0, 1.8, 1.1);
      box(head, 0.9, 0.85, 0.9, G, 0, 0.1, 0.3);
      box(head, 0.5, 0.42, 0.55, '#a0a0a8', 0, -0.08, 0.95);
      box(head, 0.2, 0.16, 0.1, '#111', 0, 0.08, 1.23);
      box(head, 0.26, 0.42, 0.16, G, -0.3, 0.7, 0.2);
      box(head, 0.26, 0.42, 0.16, G, 0.3, 0.7, 0.2);
      eyes(rig, head, 0.22, 0.28, 0.76, 0.12, '#ffd54f');
      rig.height = 2.9;
      break;
    }
    case 'bear': {
      const B = '#6d4c41';
      quad(r, L, 0.55, 1.1, '#5d4037', 0.55, 0.85, 1.15);
      box(r, 1.8, 1.6, 2.6, B, 0, 1.95, 0);
      box(r, 1.4, 0.4, 1.6, '#5d4037', 0, 2.85, -0.2);
      head = pivot(r, 0, 2.3, 1.3);
      box(head, 1.2, 1.1, 1.0, B, 0, 0.15, 0.4);
      box(head, 0.6, 0.45, 0.4, '#a1887f', 0, -0.05, 1.05);
      box(head, 0.24, 0.16, 0.08, '#111', 0, 0.08, 1.26);
      box(head, 0.36, 0.36, 0.2, '#5d4037', -0.48, 0.82, 0.3);
      box(head, 0.36, 0.36, 0.2, '#5d4037', 0.48, 0.82, 0.3);
      eyes(rig, head, 0.26, 0.38, 0.91, 0.13);
      rig.tail = pivot(r, 0, 2.0, -1.3);
      box(rig.tail, 0.3, 0.3, 0.2, B, 0, 0, -0.05);
      rig.height = 3.6;
      break;
    }
    case 'dino': {
      const D = '#43a047';
      const foot = [0.8, 0.2, 1.1, '#2e7d32', 0.15];
      leg(r, L, 0.7, 1.5, 0.9, '#388e3c', -0.6, 1.6, -0.2, 0, foot);
      leg(r, L, 0.7, 1.5, 0.9, '#388e3c', 0.6, 1.6, -0.2, Math.PI, foot);
      box(r, 2.0, 1.8, 3.0, D, 0, 2.4, 0);
      box(r, 1.6, 1.2, 2.4, '#a5d6a7', 0, 2.0, 0.35);
      for (let i = 0; i < 4; i++) box(r, 0.3, 0.5, 0.5, '#1b5e20', 0, 3.5, 1.0 - i * 0.8);
      box(r, 0.25, 0.6, 0.25, '#388e3c', -0.6, 2.2, 1.6).rotation.x = -0.5;
      box(r, 0.25, 0.6, 0.25, '#388e3c', 0.6, 2.2, 1.6).rotation.x = -0.5;
      rig.tail = pivot(r, 0, 2.4, -1.4);
      box(rig.tail, 1.3, 1.1, 1.6, D, 0, 0, -0.7);
      box(rig.tail, 0.8, 0.7, 1.6, D, 0, -0.15, -2.1);
      box(rig.tail, 0.25, 0.4, 0.4, '#1b5e20', 0, 0.7, -0.6);
      box(rig.tail, 0.25, 0.4, 0.4, '#1b5e20', 0, 0.35, -1.9);
      head = pivot(r, 0, 3.0, 1.4);
      box(head, 1.5, 1.2, 1.9, D, 0, 0.35, 0.8);
      box(head, 1.3, 0.4, 1.4, '#66bb6a', 0, -0.35, 0.95);
      box(head, 1.2, 0.12, 0.1, '#ffffff', 0, -0.12, 1.72);
      box(head, 0.3, 0.45, 0.6, '#1b5e20', 0, 1.1, 0.3);
      eyes(rig, head, 0.42, 0.6, 1.76, 0.18);
      rig.height = 4.6;
      break;
    }
    case 'dragon': {
      const R = '#c62828';
      quad(r, L, 0.55, 1.4, '#b71c1c', 0.65, 1.0, 1.55, '#3e2723');
      box(r, 1.8, 1.6, 3.0, R, 0, 2.5, 0);
      box(r, 1.4, 1.0, 2.6, '#ffb74d', 0, 2.1, 0.1);
      for (let i = 0; i < 4; i++) box(r, 0.25, 0.45, 0.45, '#ffe0b2', 0, 3.5, 1.0 - i * 0.8);
      rig.tail = pivot(r, 0, 2.6, -1.5);
      box(rig.tail, 1.0, 0.8, 1.8, R, 0, 0, -0.8);
      box(rig.tail, 0.6, 0.5, 1.6, R, 0, -0.1, -2.4);
      box(rig.tail, 0.8, 0.15, 0.6, '#ffe0b2', 0, -0.1, -3.3);
      head = pivot(r, 0, 3.0, 1.4);
      box(head, 0.8, 1.4, 0.8, R, 0, 0.6, 0.2);
      box(head, 1.2, 1.0, 1.6, R, 0, 1.4, 0.8);
      box(head, 1.0, 0.35, 0.8, '#ffb74d', 0, 0.98, 1.3);
      box(head, 0.2, 0.6, 0.2, '#ffe0b2', -0.4, 2.1, 0.4).rotation.x = -0.6;
      box(head, 0.2, 0.6, 0.2, '#ffe0b2', 0.4, 2.1, 0.4).rotation.x = -0.6;
      box(head, 0.12, 0.12, 0.05, '#111', -0.22, 1.45, 1.62);
      box(head, 0.12, 0.12, 0.05, '#111', 0.22, 1.45, 1.62);
      eyes(rig, head, 0.36, 1.7, 1.61, 0.16, '#ffeb3b');
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.85, 3.2, 0.2);
        box(w, 2.8, 0.12, 2.0, '#8e1b1b', s * 1.4, 0, 0);
        box(w, 2.8, 0.2, 0.2, '#5d0f0f', s * 1.4, 0.05, 0.95);
        w.userData.side = s;
        w.userData.flap = true;
        rig.wings.push(w);
      }
      rig.height = 5.0;
      break;
    }
  }
  rig.head = head;
  return rig;
}

// amount: 0 = standing still, 1 = full run cycle.
export function animateRig(rig, phase, amount) {
  for (const l of rig.legs) l.rotation.x = Math.sin(phase + l.userData.phase) * 0.8 * amount;
  for (const w of rig.wings) {
    if (w.userData.flap) w.rotation.z = w.userData.side * (Math.sin(phase * 0.7) * 0.5 * (0.3 + amount));
    else w.rotation.z = w.userData.side * (0.05 + Math.abs(Math.sin(phase * 1.6)) * 0.9 * amount);
  }
  if (rig.tail) rig.tail.rotation.y = Math.sin(phase * 1.3) * 0.25 * (0.3 + amount);
  rig.body.position.y = Math.abs(Math.sin(phase)) * 0.12 * amount;
}

export function setEyesClosed(rig, closed) {
  for (const e of rig.eyes) e.scale.y = closed ? 0.15 : 1;
}

// ---------- Eggs ----------
const eggGeo = new THREE.SphereGeometry(0.5, 18, 14);
const eggMats = new Map();
export function eggMaterial(def) {
  let m = eggMats.get(def.id);
  if (!m) {
    const rnd = mulberry32(def.id.length * 97 + def.speed);
    const tex = canvasTexture(64, 32, (ctx) => {
      ctx.fillStyle = def.egg; ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = def.spot;
      for (let i = 0; i < 16; i++) {
        const w = 2 + Math.floor(rnd() * 5), h = 2 + Math.floor(rnd() * 4);
        ctx.fillRect(Math.floor(rnd() * 60), 4 + Math.floor(rnd() * 24), w, h);
      }
    });
    m = new THREE.MeshLambertMaterial({ map: tex });
    eggMats.set(def.id, m);
  }
  return m;
}

export function createEgg(def) {
  const m = new THREE.Mesh(eggGeo, eggMaterial(def));
  const s = def.eggSize;
  m.scale.set(s, s * 1.3, s);
  m.castShadow = true;
  m.userData.halfH = s * 0.65;
  return m;
}

export function createNest() {
  const g = new THREE.Group();
  const hay = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.25, 0.45, 10), mat('#d4ad55'));
  hay.position.y = 0.22; hay.receiveShadow = true; hay.castShadow = true;
  g.add(hay);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 10), mat('#8d6e2f'));
  inner.position.y = 0.43;
  g.add(inner);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = box(g, 0.9, 0.08, 0.12, '#e8c766', Math.cos(a) * 1.35, 0.47, Math.sin(a) * 1.35);
    s.rotation.y = -a + 0.6;
  }
  return g;
}

// ---------- Text sprites ----------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Label {
  constructor({ w = 512, h = 160, worldH = 1.5, bg = 'rgba(15,20,35,0.55)' } = {}) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.sprite.scale.set(worldH * w / h, worldH, 1);
    this.sprite.renderOrder = 10;
    this.bg = bg;
    this.key = '';
  }

  // lines: [{ t: text, c: color, s: font px }]
  set(lines) {
    const key = JSON.stringify(lines);
    if (key === this.key) return;
    this.key = key;
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let total = 0, maxW = 0;
    for (const l of lines) {
      ctx.font = `800 ${l.s}px ${FONT}`;
      maxW = Math.max(maxW, ctx.measureText(l.t).width);
      total += l.s * 1.18;
    }
    const padX = 20, padY = 10;
    const bw = Math.min(canvas.width - 4, maxW + padX * 2);
    const bh = Math.min(canvas.height - 4, total + padY * 2);
    if (this.bg) {
      ctx.fillStyle = this.bg;
      roundRect(ctx, (canvas.width - bw) / 2, (canvas.height - bh) / 2, bw, bh, 22);
      ctx.fill();
    }
    let y = (canvas.height - bh) / 2 + padY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    for (const l of lines) {
      ctx.font = `800 ${l.s}px ${FONT}`;
      ctx.lineWidth = Math.max(3, l.s * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(l.t, canvas.width / 2, y + l.s * 0.06, canvas.width - 8);
      ctx.fillStyle = l.c || '#fff';
      ctx.fillText(l.t, canvas.width / 2, y + l.s * 0.06, canvas.width - 8);
      y += l.s * 1.18;
    }
    this.tex.needsUpdate = true;
  }
}
