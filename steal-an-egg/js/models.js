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

export function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// A limb that swings around its top end. foot = [w, h, d, color, zOffset]
export function leg(parent, list, w, h, d, color, x, y, z, phase, foot) {
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

function eyes(rig, parent, x, y, z, size = 0.14, color = '#111', brows = true) {
  for (const s of [-1, 1]) {
    rig.eyes.push(box(parent, size, size * 1.3, 0.05, color, s * x, y, z));
    if (brows) box(parent, size * 1.8, size * 0.45, 0.06, '#111', s * x, y + size * 1.15, z + 0.01).rotation.z = s * 0.45;
  }
}

// ---------- Bloggers (blocky people) ----------
function fabric(base, draw) {
  return new THREE.MeshLambertMaterial({ map: canvasTexture(32, 32, (ctx) => { ctx.fillStyle = base; ctx.fillRect(0, 0, 32, 32); draw?.(ctx); }) });
}
const knit = (c) => fabric(c, (ctx) => { ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let x = 0; x < 32; x += 4) ctx.fillRect(x, 0, 1, 32); });
const stripes = (a, b) => fabric(a, (ctx) => { ctx.fillStyle = b; for (let y = 0; y < 32; y += 8) ctx.fillRect(0, y, 32, 4); });
const fishnet = (skin) => fabric(skin, (ctx) => { ctx.fillStyle = '#111'; for (let i = 0; i < 32; i += 5) { ctx.fillRect(i, 0, 1, 32); ctx.fillRect(0, i, 32, 1); } });
function textFabric(base, text, color, size = 9) {
  return fabric(base, (ctx) => {
    ctx.fillStyle = color; ctx.font = `900 ${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    text.split('\n').forEach((l, i, arr) => ctx.fillText(l, 16, 16 + (i - (arr.length - 1) / 2) * (size + 1)));
  });
}

function personFace(o) {
  if (o.faceTex) return o.faceTex;
  return canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = o.skin; ctx.fillRect(0, 0, 32, 32);
    if (o.stubble) { ctx.fillStyle = 'rgba(80,60,40,0.25)'; ctx.fillRect(8, 22, 16, 8); }
    if (o.blush) { ctx.fillStyle = '#f48fb1'; ctx.fillRect(4, 19, 4, 2); ctx.fillRect(24, 19, 4, 2); }
    if (o.brow) { ctx.fillStyle = o.brow; ctx.fillRect(6, 8, 8, 2); ctx.fillRect(18, 8, 8, 2); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 12, 6, 5); ctx.fillRect(18, 12, 6, 5);
    ctx.fillStyle = o.iris; ctx.fillRect(10, 12, 4, 5); ctx.fillRect(20, 12, 4, 5);
    ctx.fillStyle = '#111'; ctx.fillRect(11, 13, 2, 3); ctx.fillRect(21, 13, 2, 3);
    if (o.mole) { ctx.fillStyle = '#7b5a48'; ctx.fillRect(24, 21, 1, 1); }
    ctx.fillStyle = 'rgba(120,70,50,0.35)'; ctx.fillRect(15, 15, 2, 5);
    ctx.fillStyle = o.lips; ctx.fillRect(12, 24, 8, 2);
  });
}

// Human body for animal-style rigs: arms swing in the leg list, opposite to the legs.
function person(rig, r, o) {
  const L = rig.legs;
  const legs = [];
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) {
    legs.push(leg(r, L, 0.5, 1.0, 0.5, s < 0 && o.pantsL ? o.pantsL : o.pants, s * 0.26, 1.0, 0, ph, [0.54, 0.2, 0.64, o.shoe, 0.06]));
  }
  if (o.crop) {
    box(r, 1.04, 0.6, 0.54, o.shirt, 0, 1.7, 0);
    box(r, 1.0, 0.42, 0.5, o.skin, 0, 1.2, 0);
  } else box(r, 1.04, 1.0, 0.54, o.shirt, 0, 1.5, 0);
  const arms = [];
  for (const [s, ph] of [[-1, Math.PI], [1, 0]]) {
    const a = pivot(r, s * 0.76, 1.95, 0);
    box(a, 0.46, 0.72, 0.5, o.sleeve || o.shirt, 0, -0.32, 0);
    box(a, 0.42, 0.3, 0.46, o.skin, 0, -0.84, 0);
    a.userData.phase = ph;
    L.push(a);
    arms.push(a);
  }
  const head = pivot(r, 0, 2.0, 0);
  const sk = mat(o.skin);
  const fm = new THREE.MeshLambertMaterial({ map: personFace(o) });
  const hm = new THREE.Mesh(boxGeo(0.84, 0.84, 0.84), [sk, sk, sk, sk, fm, sk]);
  hm.position.y = 0.44;
  hm.castShadow = true;
  head.add(hm);
  rig.height = 3.3;
  return { head, legs, arms };
}

const lensMat = new THREE.MeshLambertMaterial({ color: '#f2e6d0', transparent: true, opacity: 0.35 });

function buildBlogger(id, rig, r) {
  switch (id) {
    case 'blondie': {
      const sweater = knit('#f7a8c4');
      const { head } = person(rig, r, { skin: '#f3cdb4', shirt: sweater, pants: '#9fb7d6', shoe: '#fafafa', iris: '#6d5a3a', brow: '#8a6a45', lips: '#d98c8c', mole: true });
      const hair = '#e6c98f';
      box(head, 0.94, 0.24, 0.94, hair, 0, 0.93, -0.02);
      box(head, 0.1, 0.06, 0.6, '#b8955a', 0, 1.06, 0.12);
      box(head, 0.96, 1.7, 0.2, hair, 0, 0.1, -0.42);
      for (const s of [-1, 1]) {
        box(head, 0.16, 1.35, 0.55, hair, s * 0.47, 0.3, -0.15);
        box(head, 0.18, 1.1, 0.2, hair, s * 0.47, 0.05, 0.25);
      }
      return head;
    }
    case 'headphones': {
      const { head } = person(rig, r, { skin: '#e9c09a', shirt: textFabric('#1e1e22', 'TIME', '#e0e0e0', 8), sleeve: '#1e1e22', pants: '#222226', shoe: '#eeeeee', iris: '#3b2a1d', brow: '#3b2a1d', lips: '#c98b80', stubble: true });
      box(r, 0.6, 0.16, 0.56, '#2a2a30', 0, 2.02, -0.05);                       // hood collar
      const hair = '#e8dcb5';
      box(head, 0.96, 0.3, 0.96, hair, 0, 0.95, -0.02);
      box(head, 0.96, 0.5, 0.2, hair, 0, 0.65, -0.42);
      box(head, 0.6, 0.2, 0.2, hair, 0.12, 0.86, 0.42).rotation.z = 0.25;
      box(head, 0.32, 0.26, 0.32, hair, -0.22, 1.16, 0.15).rotation.y = 0.6;
      box(head, 0.3, 0.24, 0.3, hair, 0.22, 1.14, -0.12).rotation.y = 0.3;
      box(head, 0.28, 0.22, 0.28, '#d8c99c', 0.05, 1.18, 0.3).rotation.z = 0.4;
      const gold = '#d4af37';
      for (const s of [-1, 1]) {
        box(head, 0.3, 0.24, 0.03, lensMat, s * 0.2, 0.47, 0.44);
        box(head, 0.3, 0.03, 0.04, gold, s * 0.2, 0.33, 0.45);
        box(head, 0.03, 0.24, 0.04, gold, s * 0.36, 0.47, 0.45);
        box(head, 0.03, 0.03, 0.5, gold, s * 0.43, 0.56, 0.2);
        box(head, 0.24, 0.52, 0.44, '#cfd2d6', s * 0.55, 0.45, 0);               // headphone cups
        box(head, 0.06, 0.4, 0.34, '#9ea3a8', s * 0.43, 0.45, 0);
        box(head, 0.12, 0.45, 0.2, '#bfc3c8', s * 0.6, 0.88, 0);
      }
      box(head, 0.8, 0.04, 0.05, gold, 0, 0.59, 0.45);
      box(head, 1.25, 0.12, 0.24, '#bfc3c8', 0, 1.14, 0);
      return head;
    }
    case 'robloxgirl': {
      const skin = '#fbe3cf';
      const top = [mat('#111111'), mat('#111111'), mat('#111111'), mat('#111111'), textFabric('#111111', 'BLACK\nPINK', '#ff6fb5', 9), mat('#111111')];
      const { head, legs } = person(rig, r, {
        skin, shirt: top, sleeve: stripes('#111111', '#ff6fb5'), crop: true, pants: stripes('#111111', '#ff6fb5'), pantsL: fishnet(skin),
        shoe: '#111111', iris: '#111111', lips: '#ff6fb5', blush: true,
      });
      for (const l of legs) box(l, 0.56, 0.12, 0.2, '#ffffff', 0, -0.94, 0.32);   // sneaker toe caps
      box(r, 1.18, 0.4, 0.68, stripes('#f48fb1', '#f8bbd0'), 0, 1.06, 0);         // skirt
      box(r, 1.1, 0.08, 0.6, '#ffffff', 0, 1.28, 0);                              // belt chain
      const hair = '#f1d9a6';
      box(head, 0.96, 0.26, 0.96, hair, 0, 0.93, -0.02);
      box(head, 0.96, 1.0, 0.2, hair, 0, 0.35, -0.42);
      box(head, 0.96, 0.2, 0.16, hair, 0, 0.82, 0.43);
      for (const s of [-1, 1]) {
        box(head, 0.14, 0.9, 0.62, hair, s * 0.48, 0.42, -0.12);
        box(head, 0.42, 0.42, 0.42, hair, s * 0.32, 1.18, -0.05);                // space buns
      }
      const gum = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('#ff4f9a'));
      gum.position.set(0.06, 0.2, 0.5);
      head.add(gum);
      return head;
    }
    case 'streamer': {
      const { head, arms } = person(rig, r, { skin: '#d9a37c', shirt: textFabric('#6a1b9a', 'GG', '#00e676', 12), sleeve: '#6a1b9a', pants: '#263238', shoe: '#00e676', iris: '#2e2e2e', brow: '#2e2e2e', lips: '#b9746a' });
      box(head, 0.96, 0.24, 0.96, '#d50000', 0, 0.96, 0);                         // backwards cap
      box(head, 0.7, 0.08, 0.46, '#d50000', 0, 0.88, -0.66);
      box(head, 0.94, 0.3, 0.2, '#3e2723', 0, 0.68, -0.42);
      box(head, 1.04, 0.1, 0.2, '#111111', 0, 1.12, 0);                           // headset
      for (const s of [-1, 1]) {
        box(head, 0.22, 0.44, 0.4, '#111111', s * 0.53, 0.45, 0);
        box(head, 0.04, 0.3, 0.28, '#00e676', s * 0.65, 0.45, 0);
        box(head, 0.1, 0.5, 0.12, '#111111', s * 0.55, 0.85, 0);
      }
      box(head, 0.05, 0.05, 0.5, '#111111', -0.46, 0.25, 0.25);
      box(head, 0.1, 0.1, 0.1, '#00e676', -0.32, 0.2, 0.5);
      box(arms[1], 0.6, 0.14, 0.34, '#37474f', -0.3, -1.02, 0.25);               // gamepad
      return head;
    }
    case 'vlogger': {
      const shirt = fabric('#26c6da', (ctx) => { ctx.fillStyle = '#ffeb3b'; for (let i = 0; i < 6; i++) ctx.fillRect((i * 11) % 28, (i * 7) % 28, 4, 4); ctx.fillStyle = '#ff7043'; for (let i = 0; i < 5; i++) ctx.fillRect((i * 13 + 5) % 28, (i * 9 + 15) % 28, 3, 3); });
      const { head } = person(rig, r, { skin: '#f1c27d', shirt, pants: '#5d4037', shoe: '#ff7043', iris: '#4e342e', brow: '#4e342e', lips: '#c47a6c' });
      box(head, 1.0, 0.3, 1.0, '#ff7043', 0, 0.97, 0);                            // bucket hat
      box(head, 1.32, 0.06, 1.32, '#f4511e', 0, 0.83, 0);
      box(head, 0.84, 0.18, 0.05, '#111111', 0, 0.5, 0.44);                       // sunglasses
      box(r, 0.8, 0.9, 0.3, '#00897b', 0, 1.55, -0.42);                           // backpack
      const stick = box(r, 0.07, 1.7, 0.07, '#212121', 0.85, 2.85, 0.45);         // selfie stick
      stick.rotation.x = -0.35;
      box(r, 0.4, 0.28, 0.3, '#111111', 0.85, 3.65, 0.78);
      box(r, 0.14, 0.14, 0.05, '#4fc3f7', 0.85, 3.65, 0.62);
      box(r, 0.06, 0.06, 0.05, '#ff1744', 0.98, 3.74, 0.62);
      return head;
    }
    case 'cultist': {
      // Roblox "noob" in a dark coat with a deer-skull mask and antlers.
      const noob = canvasTexture(32, 32, (ctx) => {
        ctx.fillStyle = '#f5d33a'; ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#111'; ctx.fillRect(11, 22, 10, 2); ctx.fillRect(9, 20, 2, 2); ctx.fillRect(21, 20, 2, 2);
      });
      const coat = '#3b3d3a';
      const vest = fabric('#6d6a62', (ctx) => { ctx.fillStyle = '#2b2b2b'; for (let y = 6; y < 30; y += 7) ctx.fillRect(15, y, 2, 2); ctx.fillStyle = coat; ctx.fillRect(0, 0, 9, 32); ctx.fillRect(23, 0, 9, 32); });
      const { head } = person(rig, r, { skin: '#f5d33a', faceTex: noob, shirt: vest, sleeve: coat, pants: '#9a8350', shoe: '#5a1f1a' });
      box(r, 1.1, 0.55, 0.6, coat, 0, 0.98, -0.02);                               // coat tails
      box(r, 0.5, 0.18, 0.1, '#55574f', 0, 1.98, 0.27);                            // collar
      const bone = '#d9dcc4';
      box(head, 0.88, 0.46, 0.08, bone, 0, 0.66, 0.45);                           // skull mask
      box(head, 0.14, 0.12, 0.04, '#222', -0.2, 0.62, 0.5);
      box(head, 0.14, 0.12, 0.04, '#222', 0.2, 0.62, 0.5);
      box(head, 0.16, 0.42, 0.16, bone, 0, 0.36, 0.55);                            // long skull snout
      const horn = '#4a4a44';
      for (const s of [-1, 1]) {
        const beam = box(head, 0.1, 1.3, 0.1, horn, s * 0.45, 1.45, 0);
        beam.rotation.z = -s * 0.35;
        box(head, 0.08, 0.55, 0.08, horn, s * 0.42, 1.55, 0).rotation.z = s * 0.5;
        box(head, 0.08, 0.6, 0.08, horn, s * 0.85, 1.85, 0).rotation.z = -s * 0.9;
        box(head, 0.08, 0.5, 0.08, horn, s * 0.75, 2.15, 0).rotation.z = s * 0.2;
        box(head, 0.08, 0.45, 0.08, horn, s * 0.95, 1.55, 0).rotation.z = -s * 1.2;
      }
      rig.height = 4.6;
      return head;
    }
    case 'millionaire': {
      const white = '#fafafa';
      const { head } = person(rig, r, { skin: '#e0ac80', shirt: white, pants: white, shoe: '#ffd700', iris: '#3b2a1d', brow: '#3b2a1d', lips: '#b9746a' });
      box(r, 0.36, 0.95, 0.05, '#212121', 0, 1.52, 0.28);                         // shirt under the jacket
      for (const s of [-1, 1]) box(r, 0.05, 0.5, 0.06, '#ffd700', s * 0.16, 1.78, 0.31).rotation.z = s * 0.45;   // chain
      box(r, 0.2, 0.24, 0.06, '#ffd700', 0, 1.52, 0.32);
      box(head, 0.94, 0.2, 0.94, '#2b1d14', 0, 0.92, 0);
      box(head, 0.86, 0.18, 0.05, '#111111', 0, 0.5, 0.44);
      box(head, 0.86, 0.04, 0.06, '#ffd700', 0, 0.6, 0.45);
      box(head, 0.9, 0.24, 0.9, '#ffd700', 0, 1.12, 0);                           // crown
      for (const [x, z] of [[-0.35, 0.35], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35]]) box(head, 0.18, 0.26, 0.18, '#ffd700', x, 1.36, z);
      box(head, 0.14, 0.14, 0.06, '#e53935', 0, 1.15, 0.46);
      const plaque = pivot(r, -1.0, 1.7, 0.4);                                     // golden play button
      plaque.rotation.y = 0.35;
      box(plaque, 0.95, 1.15, 0.1, '#ffd700', 0, 0, 0);
      box(plaque, 0.5, 0.36, 0.06, '#ff1744', 0, 0.05, 0.07);
      box(plaque, 0.12, 0.16, 0.04, '#ffffff', 0.02, 0.05, 0.1);
      return head;
    }
  }
  return null;
}

const haloGeo = new THREE.TorusGeometry(0.42, 0.07, 6, 20);
const haloMat = new THREE.MeshBasicMaterial({ color: '#ffe57f' });
function halo(parent, y) {
  const h = new THREE.Mesh(haloGeo, haloMat);
  h.rotation.x = Math.PI / 2;
  h.position.y = y;
  parent.add(h);
  return h;
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
    case 'cherub': {
      const S = '#ffe0c8';
      leg(r, L, 0.32, 0.55, 0.32, S, -0.22, 0.6, 0, 0, null);
      leg(r, L, 0.32, 0.55, 0.32, S, 0.22, 0.6, 0, Math.PI, null);
      box(r, 0.98, 0.45, 0.78, '#ffffff', 0, 0.78, 0);
      box(r, 0.95, 0.75, 0.75, S, 0, 1.35, 0);
      for (const s of [-1, 1]) box(r, 0.26, 0.6, 0.3, S, s * 0.6, 1.35, 0.05);
      head = pivot(r, 0, 1.72, 0);
      box(head, 1.0, 0.95, 0.9, S, 0, 0.45, 0);
      box(head, 1.06, 0.3, 0.96, '#ffd54f', 0, 0.95, -0.02);
      box(head, 1.06, 0.55, 0.2, '#ffd54f', 0, 0.68, -0.43);
      box(head, 0.26, 0.26, 0.26, '#ffca28', -0.32, 1.12, 0.22);
      box(head, 0.26, 0.26, 0.26, '#ffca28', 0.28, 1.14, 0.05);
      box(head, 0.2, 0.12, 0.04, '#f48fb1', -0.33, 0.28, 0.46);
      box(head, 0.2, 0.12, 0.04, '#f48fb1', 0.33, 0.28, 0.46);
      eyes(rig, head, 0.2, 0.5, 0.46, 0.13, '#1565c0', false);
      halo(head, 1.4);
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.4, 1.6, -0.42);
        w.rotation.y = s * 0.35;
        box(w, 1.2, 0.75, 0.12, '#ffffff', s * 0.6, 0.15, 0);
        box(w, 0.8, 0.4, 0.12, '#eceff1', s * 0.7, -0.35, 0);
        w.userData.side = s;
        w.userData.flap = true;
        rig.wings.push(w);
      }
      rig.height = 3.4;
      break;
    }
    case 'imp': {
      const R = '#d32f2f';
      const foot = [0.34, 0.1, 0.44, '#3e2723', 0.06];
      leg(r, L, 0.28, 0.6, 0.3, '#b71c1c', -0.22, 0.65, 0, 0, foot);
      leg(r, L, 0.28, 0.6, 0.3, '#b71c1c', 0.22, 0.65, 0, Math.PI, foot);
      box(r, 0.85, 0.8, 0.6, R, 0, 1.05, 0);
      head = pivot(r, 0, 1.45, 0.05);
      box(head, 0.9, 0.8, 0.8, R, 0, 0.4, 0);
      box(head, 0.16, 0.42, 0.16, '#212121', -0.3, 0.98, 0).rotation.z = 0.35;
      box(head, 0.16, 0.42, 0.16, '#212121', 0.3, 0.98, 0).rotation.z = -0.35;
      box(head, 0.3, 0.16, 0.1, R, -0.55, 0.48, 0).rotation.z = -0.3;
      box(head, 0.3, 0.16, 0.1, R, 0.55, 0.48, 0).rotation.z = 0.3;
      box(head, 0.52, 0.1, 0.05, '#ffffff', 0, 0.16, 0.41);
      eyes(rig, head, 0.2, 0.5, 0.41, 0.12, '#ffeb3b');
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.35, 1.3, -0.3);
        w.rotation.y = s * 0.4;
        box(w, 1.1, 0.6, 0.08, '#4a0e0e', s * 0.55, 0.1, 0);
        box(w, 1.1, 0.1, 0.12, '#1a0505', s * 0.55, 0.42, 0);
        w.userData.side = s;
        w.userData.flap = true;
        rig.wings.push(w);
      }
      rig.tail = pivot(r, 0, 0.85, -0.3);
      box(rig.tail, 0.12, 0.12, 0.9, R, 0, 0, -0.45);
      box(rig.tail, 0.3, 0.3, 0.08, '#212121', 0, 0, -0.95).rotation.z = Math.PI / 4;
      rig.height = 2.8;
      break;
    }
    case 'seraph': {
      const foot = [0.34, 0.1, 0.42, '#ffd54f', 0.05];
      leg(r, L, 0.3, 0.5, 0.3, '#fafafa', -0.25, 0.55, 0, 0, foot);
      leg(r, L, 0.3, 0.5, 0.3, '#fafafa', 0.25, 0.55, 0, Math.PI, foot);
      box(r, 1.2, 1.9, 0.9, '#fafafa', 0, 1.45, 0);
      box(r, 1.24, 0.15, 0.94, '#ffd54f', 0, 1.6, 0);
      box(r, 1.24, 0.12, 0.94, '#ffd54f', 0, 0.55, 0);
      for (const s of [-1, 1]) box(r, 0.34, 1.0, 0.45, '#f5f5f5', s * 0.75, 1.95, 0.05);
      head = pivot(r, 0, 2.4, 0);
      box(head, 0.8, 0.85, 0.8, '#f3d9c4', 0, 0.45, 0);
      box(head, 0.86, 0.25, 0.86, '#ffe082', 0, 0.92, 0);
      box(head, 0.86, 0.85, 0.2, '#ffe082', 0, 0.45, -0.42);
      eyes(rig, head, 0.18, 0.5, 0.41, 0.11, '#40c4ff', false);
      halo(head, 1.35);
      [[2.95, 1.4], [2.35, 1.7], [1.7, 1.3]].forEach(([y, len]) => {
        for (const s of [-1, 1]) {
          const w = pivot(r, s * 0.45, y, -0.45);
          w.rotation.y = s * 0.3;
          box(w, len, 0.5, 0.1, '#fffde7', s * len / 2, 0, 0);
          box(w, len, 0.1, 0.12, '#ffe082', s * len / 2, 0.22, 0);
          w.userData.side = s;
          w.userData.flap = true;
          rig.wings.push(w);
        }
      });
      rig.height = 4.1;
      break;
    }
    case 'hellhound': {
      const D = '#263238';
      quad(r, L, 0.35, 1.0, '#1c2429', 0.45, 0.8, 1.05, '#111111');
      box(r, 1.3, 1.1, 2.4, D, 0, 1.55, 0);
      box(r, 1.5, 0.4, 1.0, '#ff6d00', 0, 2.2, 0.6);
      box(r, 1.0, 0.3, 1.4, '#ffab00', 0, 2.15, -0.2);
      rig.tail = pivot(r, 0, 1.8, -1.2);
      box(rig.tail, 0.3, 0.3, 1.2, '#ff6d00', 0, 0.15, -0.55).rotation.x = -0.5;
      for (const k of [-1, 0, 1]) {
        const hp = pivot(r, k * 0.55, 2.0, 1.2);
        hp.rotation.y = k * 0.35;
        box(hp, 0.6, 0.6, 0.7, D, 0, 0.1, 0.2);
        box(hp, 0.36, 0.3, 0.42, '#37474f', 0, -0.05, 0.66);
        box(hp, 0.12, 0.1, 0.05, '#111', 0, 0.05, 0.88);
        box(hp, 0.14, 0.3, 0.1, D, -0.2, 0.48, 0.05);
        box(hp, 0.14, 0.3, 0.1, D, 0.2, 0.48, 0.05);
        for (const s of [-1, 1]) rig.eyes.push(box(hp, 0.12, 0.1, 0.04, '#ff3d00', s * 0.15, 0.2, 0.56));
        if (k === 0) head = hp;
      }
      rig.height = 3.0;
      break;
    }
    case 'archangel': {
      const A = '#cfd8dc', G = '#ffd54f';
      const foot = [0.46, 0.2, 0.58, G, 0.05];
      leg(r, L, 0.42, 1.2, 0.42, '#b0bec5', -0.28, 1.25, 0, 0, foot);
      leg(r, L, 0.42, 1.2, 0.42, '#b0bec5', 0.28, 1.25, 0, Math.PI, foot);
      box(r, 1.3, 1.3, 0.8, A, 0, 1.95, 0);
      box(r, 0.9, 0.6, 0.06, G, 0, 2.1, 0.42);
      box(r, 1.38, 0.4, 0.86, G, 0, 1.25, 0);
      for (const s of [-1, 1]) {
        box(r, 0.5, 0.35, 0.62, G, s * 0.82, 2.55, 0);
        box(r, 0.36, 1.0, 0.4, '#b0bec5', s * 0.85, 1.95, 0.05);
      }
      box(r, 0.12, 2.3, 0.3, '#b3e5fc', 0.95, 2.6, 0.45);         // sword blade
      box(r, 0.6, 0.12, 0.2, G, 0.95, 1.45, 0.45);
      box(r, 0.14, 0.4, 0.14, '#6d4c41', 0.95, 1.22, 0.45);
      head = pivot(r, 0, 2.6, 0);
      box(head, 0.85, 0.85, 0.85, '#eceff1', 0, 0.45, 0);
      box(head, 0.62, 0.3, 0.05, '#263238', 0, 0.45, 0.43);
      eyes(rig, head, 0.14, 0.47, 0.46, 0.1, '#40c4ff', false);
      box(head, 0.15, 0.4, 0.75, '#e53935', 0, 1.0, -0.1);
      halo(head, 1.4);
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.5, 2.4, -0.45);
        w.rotation.y = s * 0.3;
        box(w, 2.4, 0.9, 0.12, '#ffffff', s * 1.2, 0.2, 0);
        box(w, 2.4, 0.12, 0.14, '#ffe082', s * 1.2, 0.68, 0);
        box(w, 1.6, 0.5, 0.12, '#eceff1', s * 1.4, -0.45, 0);
        w.userData.side = s;
        w.userData.flap = true;
        rig.wings.push(w);
      }
      rig.height = 4.4;
      break;
    }
    case 'demonlord': {
      const R = '#8e0000';
      const foot = [0.66, 0.25, 0.82, '#111', 0.1];
      leg(r, L, 0.55, 1.4, 0.6, '#3e0000', -0.45, 1.45, 0, 0, foot);
      leg(r, L, 0.55, 1.4, 0.6, '#3e0000', 0.45, 1.45, 0, Math.PI, foot);
      box(r, 1.8, 1.6, 1.1, R, 0, 2.3, 0);
      box(r, 1.2, 0.9, 0.08, '#5d0000', 0, 2.1, 0.56);
      box(r, 0.42, 0.42, 0.1, '#eeeeee', 0, 1.6, 0.57);
      for (const s of [-1, 1]) {
        box(r, 0.6, 0.5, 0.7, '#212121', s * 1.05, 3.05, 0);
        box(r, 0.18, 0.6, 0.18, '#fafafa', s * 1.15, 3.55, 0).rotation.z = -s * 0.3;
        box(r, 0.55, 1.4, 0.6, R, s * 1.2, 2.2, 0.1);
        box(r, 0.6, 0.25, 0.65, '#212121', s * 1.2, 1.42, 0.15);
      }
      head = pivot(r, 0, 3.1, 0.1);
      box(head, 1.1, 1.0, 1.0, R, 0, 0.5, 0);
      box(head, 0.8, 0.25, 0.1, '#212121', 0, 0.15, 0.51);
      for (let i = 0; i < 4; i++) box(head, 0.1, 0.12, 0.04, '#ffffff', -0.27 + i * 0.18, 0.25, 0.56);
      eyes(rig, head, 0.25, 0.62, 0.51, 0.15, '#ffea00');
      for (const s of [-1, 1]) {
        box(head, 0.25, 0.8, 0.25, '#212121', s * 0.55, 1.2, 0).rotation.z = -s * 0.5;
        box(head, 0.2, 0.5, 0.2, '#212121', s * 0.88, 1.62, 0).rotation.z = -s * 0.95;
      }
      box(head, 0.95, 0.3, 0.95, '#ff6d00', 0, 1.08, 0);
      for (const s of [-1, 1]) {
        const w = pivot(r, s * 0.6, 2.9, -0.55);
        w.rotation.y = s * 0.3;
        box(w, 3.0, 1.4, 0.1, '#2b0000', s * 1.5, 0.2, 0);
        box(w, 3.0, 0.12, 0.16, '#111111', s * 1.5, 0.9, 0);
        w.userData.side = s;
        w.userData.flap = true;
        rig.wings.push(w);
      }
      rig.tail = pivot(r, 0, 1.7, -0.6);
      box(rig.tail, 0.25, 0.25, 1.6, R, 0, 0, -0.8);
      box(rig.tail, 0.4, 0.4, 0.1, '#111', 0, 0, -1.65).rotation.z = Math.PI / 4;
      rig.height = 5.2;
      break;
    }
    case 'fox': {
      const F = '#e8762b';
      quad(r, L, 0.2, 0.6, '#3e2723', 0.25, 0.5, 0.62);
      box(r, 0.8, 0.65, 1.5, F, 0, 0.95, 0);
      box(r, 0.6, 0.45, 0.6, '#fafafa', 0, 0.85, 0.5);
      rig.tail = pivot(r, 0, 1.05, -0.75);
      box(rig.tail, 0.45, 0.45, 1.2, F, 0, 0.1, -0.55).rotation.x = -0.3;
      box(rig.tail, 0.4, 0.4, 0.35, '#fafafa', 0, 0.32, -1.15).rotation.x = -0.3;
      head = pivot(r, 0, 1.25, 0.75);
      box(head, 0.7, 0.6, 0.6, F, 0, 0.15, 0.1);
      box(head, 0.36, 0.28, 0.45, '#fafafa', 0, 0.02, 0.55);
      box(head, 0.12, 0.1, 0.06, '#111', 0, 0.12, 0.79);
      for (const s of [-1, 1]) {
        box(head, 0.2, 0.36, 0.1, F, s * 0.22, 0.58, 0.05).rotation.z = -s * 0.2;
        box(head, 0.12, 0.12, 0.11, '#3e2723', s * 0.25, 0.74, 0.05);
      }
      eyes(rig, head, 0.17, 0.25, 0.41, 0.09, '#ffd54f');
      rig.height = 1.9;
      break;
    }
    default: {
      head = buildBlogger(id, rig, r);
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
