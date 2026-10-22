// Player skins. Every skin returns the same rig shape the game animates:
// { root, body, legs, arms, flaps, spin, carryY, setScared(bool) }
import * as THREE from 'three';
import { box, boxGeo, mat, pivot, leg, canvasTexture } from './models.js';

function plaidTexture() {
  return canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = '#c62828'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'rgba(20,0,0,0.45)';
    for (let i = 0; i < 32; i += 8) { ctx.fillRect(i, 0, 3, 32); ctx.fillRect(0, i, 32, 3); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 4; i < 32; i += 8) { ctx.fillRect(i, 0, 1, 32); ctx.fillRect(0, i, 32, 1); }
  });
}

function sparkleTexture(base, dot) {
  return canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = dot;
    for (let i = 0; i < 14; i++) ctx.fillRect((i * 13) % 31, (i * 7 + (i % 3) * 5) % 31, 2, 2);
  });
}

function woodTexture(face, scared) {
  return canvasTexture(32, 64, (ctx) => {
    ctx.fillStyle = '#a1785a'; ctx.fillRect(0, 0, 32, 64);
    ctx.fillStyle = 'rgba(70,40,20,0.35)';
    for (let x = 2; x < 32; x += 6) ctx.fillRect(x, 0, 1, 64);
    ctx.fillRect(22, 40, 4, 6);
    if (!face) return;
    ctx.fillStyle = '#fff';
    const e = scared ? 10 : 8;
    ctx.fillRect(16 - 3 - e, 14, e, e); ctx.fillRect(16 + 3, 14, e, e);
    ctx.fillStyle = '#111';
    const pupil = scared ? 2 : 3;
    ctx.fillRect(16 - 3 - e / 2 - 1, 14 + e / 2 - 1, pupil, pupil);
    ctx.fillRect(16 + 3 + e / 2 - 1, 14 + e / 2 - 1, pupil, pupil);
    ctx.fillStyle = '#3e2116';
    if (scared) ctx.fillRect(12, 30, 8, 7);
    else { ctx.fillRect(11, 31, 10, 2); ctx.fillRect(9, 29, 2, 2); ctx.fillRect(21, 29, 2, 2); }
  });
}

function cupTexture(scared) {
  return canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#d7ccc8'; ctx.fillRect(0, 26, 32, 6);
    ctx.fillStyle = '#111';
    if (scared) { ctx.fillRect(8, 9, 5, 6); ctx.fillRect(19, 9, 5, 6); ctx.fillRect(13, 18, 6, 5); }
    else {
      ctx.fillRect(8, 10, 5, 5); ctx.fillRect(19, 10, 5, 5);
      ctx.fillRect(7, 8, 2, 2); ctx.fillRect(23, 8, 2, 2);
      ctx.fillStyle = '#e57373'; ctx.fillRect(13, 19, 6, 2);
    }
    ctx.fillStyle = '#f8bbd0'; ctx.fillRect(5, 16, 3, 2); ctx.fillRect(24, 16, 3, 2);
  });
}

// 32x32 pixel-art faces. kind: boy | girl | kpop
function faceTexture(kind, skin, scared) {
  return canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = skin; ctx.fillRect(0, 0, 32, 32);
    const dark = '#1d1d22';
    if (kind !== 'boy') { ctx.fillStyle = '#f48fb1'; ctx.fillRect(5, 19, 4, 2); ctx.fillRect(23, 19, 4, 2); }
    if (scared) {
      ctx.fillStyle = dark; ctx.fillRect(7, 9, 7, 7); ctx.fillRect(18, 9, 7, 7);
      ctx.fillStyle = '#fff'; ctx.fillRect(9, 11, 3, 3); ctx.fillRect(20, 11, 3, 3);
      ctx.fillStyle = dark; ctx.fillRect(7, 5, 7, 2); ctx.fillRect(18, 5, 7, 2);
      ctx.fillStyle = '#5a1010'; ctx.fillRect(10, 20, 12, 8);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 20, 12, 2);
      ctx.fillStyle = '#e57373'; ctx.fillRect(12, 25, 8, 3);
      return;
    }
    if (kind === 'boy') {
      ctx.fillStyle = dark; ctx.fillRect(8, 11, 5, 7); ctx.fillRect(19, 11, 5, 7);
      ctx.fillStyle = '#fff'; ctx.fillRect(9, 12, 2, 2); ctx.fillRect(20, 12, 2, 2);
      ctx.fillStyle = dark; ctx.fillRect(7, 8, 6, 2); ctx.fillRect(19, 8, 6, 2);
      ctx.fillRect(11, 23, 10, 2); ctx.fillRect(9, 21, 2, 2); ctx.fillRect(21, 21, 2, 2);
      return;
    }
    const iris = kind === 'kpop' ? '#6a1b9a' : '#4e342e';
    ctx.fillStyle = iris; ctx.fillRect(8, 10, 6, 8); ctx.fillRect(18, 10, 6, 8);
    ctx.fillStyle = dark; ctx.fillRect(9, 12, 4, 5); ctx.fillRect(19, 12, 4, 5);
    ctx.fillStyle = '#fff'; ctx.fillRect(9, 11, 2, 2); ctx.fillRect(19, 11, 2, 2);
    if (kind === 'kpop') { ctx.fillRect(12, 15, 1, 1); ctx.fillRect(22, 15, 1, 1); }
    ctx.fillStyle = dark;                                   // lashes
    ctx.fillRect(7, 9, 8, 1); ctx.fillRect(17, 9, 8, 1); ctx.fillRect(6, 8, 2, 1); ctx.fillRect(24, 8, 2, 1);
    ctx.fillStyle = kind === 'kpop' ? '#ec407a' : '#c2185b';
    ctx.fillRect(13, 23, 6, 2); ctx.fillRect(12, 22, 1, 1); ctx.fillRect(19, 22, 1, 1);
  });
}

function faceSwitcher(mats) {
  return (v) => {
    for (const m of mats) {
      const map = v ? m.userData.scared : m.userData.normal;
      if (m.map !== map) { m.map = map; m.needsUpdate = true; }
    }
  };
}

function faceMat(normal, scared) {
  const m = new THREE.MeshLambertMaterial({ map: normal });
  m.userData = { normal, scared };
  return m;
}

function rig(root, body) {
  return { root, body, legs: [], arms: [], flaps: [], spin: [], carryY: 2.92, setScared: () => {} };
}

// Shared blocky human body (classic, girl, k-pop).
function humanoid(o) {
  const root = new THREE.Group();
  const r = rig(root, pivot(root, 0, 0, 0));
  const body = r.body;
  const shoe = [0.54, 0.2, 0.64, o.shoe, 0.06];
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) {
    const l = leg(body, r.legs, 0.5, 1.0, 0.5, o.pants, s * 0.26, 1.0, 0, ph, shoe);
    if (o.boot) box(l, 0.53, o.boot[1], 0.53, o.boot[0], 0, -1.0 + o.boot[1] / 2 + 0.18, 0);
  }
  box(body, 1.04, 1.0, 0.54, o.shirt, 0, 1.5, 0);
  for (const s of [-1, 1]) {
    const a = pivot(body, s * 0.76, 1.95, 0);
    box(a, 0.46, 0.72, 0.5, o.sleeve || o.shirt, 0, -0.32, 0);
    box(a, 0.42, 0.3, 0.46, o.skin, 0, -0.84, 0);
    a.userData.side = s;
    r.arms.push(a);
  }
  const head = pivot(body, 0, 2.0, 0);
  const fm = faceMat(faceTexture(o.face, o.skin, false), faceTexture(o.face, o.skin, true));
  const sk = mat(o.skin);
  const hm = new THREE.Mesh(boxGeo(0.84, 0.84, 0.84), [sk, sk, sk, sk, fm, sk]);
  hm.position.y = 0.44;
  hm.castShadow = true;
  head.add(hm);
  r.head = head;
  r.setScared = faceSwitcher([fm]);
  return r;
}

function classic() {
  const r = humanoid({ skin: '#f1c27d', shirt: new THREE.MeshLambertMaterial({ map: plaidTexture() }), pants: '#26262b', shoe: '#f4f4f4', face: 'boy' });
  const h = r.head, hair = '#1d1d22';
  box(h, 0.94, 0.26, 0.94, hair, 0, 0.92, -0.02);
  box(h, 0.94, 0.6, 0.2, hair, 0, 0.6, -0.4);
  box(h, 0.14, 0.38, 0.86, hair, -0.46, 0.7, -0.04);
  box(h, 0.14, 0.38, 0.86, hair, 0.46, 0.7, -0.04);
  box(h, 0.94, 0.16, 0.16, hair, 0, 0.8, 0.42);
  box(h, 0.3, 0.24, 0.3, hair, -0.2, 1.12, 0.18).rotation.y = 0.5;
  box(h, 0.3, 0.22, 0.3, hair, 0.18, 1.1, -0.15).rotation.y = 0.3;
  box(h, 0.26, 0.2, 0.26, hair, 0.25, 1.06, 0.28).rotation.y = 0.9;
  return r;
}

function girl() {
  const skin = '#f5cba7';
  const r = humanoid({ skin, shirt: '#ec407a', pants: skin, shoe: '#e91e63', boot: ['#ffffff', 0.3], face: 'girl' });
  box(r.body, 1.16, 0.45, 0.66, '#7e57c2', 0, 1.08, 0);       // skirt
  box(r.body, 0.6, 0.12, 0.08, '#ffffff', 0, 1.94, 0.26);       // collar
  box(r.body, 0.12, 0.12, 0.06, '#ffeb3b', 0, 1.55, 0.29);      // button
  const h = r.head, hair = '#6d3b1f';
  box(h, 0.96, 0.26, 0.96, hair, 0, 0.93, -0.02);
  box(h, 0.96, 1.35, 0.22, hair, 0, 0.3, -0.42);
  box(h, 0.16, 1.0, 0.7, hair, -0.47, 0.42, -0.1);
  box(h, 0.16, 1.0, 0.7, hair, 0.47, 0.42, -0.1);
  box(h, 0.96, 0.2, 0.16, hair, 0, 0.82, 0.42);
  box(h, 0.34, 0.24, 0.12, '#e53935', -0.3, 1.06, 0.15).rotation.z = 0.3;  // bow
  box(h, 0.34, 0.24, 0.12, '#e53935', 0.0, 1.06, 0.15).rotation.z = -0.3;
  box(h, 0.14, 0.14, 0.14, '#b71c1c', -0.15, 1.06, 0.16);
  return r;
}

function kpop() {
  const skin = '#fbe0d0';
  const top = new THREE.MeshLambertMaterial({ map: sparkleTexture('#ffffff', '#f8bbd0') });
  const r = humanoid({ skin, shirt: top, sleeve: '#f48fb1', pants: skin, shoe: '#ffffff', boot: ['#fafafa', 0.62], face: 'kpop' });
  box(r.body, 1.18, 0.42, 0.68, '#212121', 0, 1.08, 0);        // pleated skirt
  for (let i = -2; i <= 2; i++) box(r.body, 0.06, 0.42, 0.04, '#424242', i * 0.22, 1.08, 0.35);
  box(r.body, 1.08, 0.1, 0.58, '#ffd600', 0, 1.3, 0);           // belt
  for (const s of [-1, 1]) box(r.body, 0.18, 0.95, 0.06, '#f48fb1', s * 0.43, 1.52, 0.29); // jacket
  const h = r.head, hair = '#f8a5c2', tips = '#b39ddb';
  box(h, 0.96, 0.28, 0.96, hair, 0, 0.94, -0.02);
  box(h, 0.96, 0.7, 0.2, hair, 0, 0.62, -0.42);
  box(h, 0.14, 0.45, 0.8, hair, -0.47, 0.66, -0.06);
  box(h, 0.14, 0.45, 0.8, hair, 0.47, 0.66, -0.06);
  box(h, 0.96, 0.22, 0.16, hair, 0, 0.82, 0.43);
  for (const s of [-1, 1]) {                                     // twin tails
    box(h, 0.3, 0.3, 0.3, hair, s * 0.62, 0.95, -0.2);
    box(h, 0.28, 0.75, 0.28, hair, s * 0.7, 0.45, -0.25);
    box(h, 0.24, 0.35, 0.24, tips, s * 0.72, -0.05, -0.25);
  }
  box(h, 0.22, 0.22, 0.08, '#ffd600', 0.3, 0.98, 0.45).rotation.z = Math.PI / 4;  // star clip
  box(h, 0.06, 0.06, 0.45, '#212121', 0.44, 0.3, 0.2);          // headset mic
  box(h, 0.1, 0.1, 0.1, '#212121', 0.3, 0.22, 0.44);
  return r;
}

function tungTung() {
  const root = new THREE.Group();
  const r = rig(root, pivot(root, 0, 0, 0));
  const b = r.body, wood = '#8d6e63';
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) leg(b, r.legs, 0.24, 0.9, 0.24, wood, s * 0.26, 0.92, 0, ph, [0.36, 0.14, 0.48, '#4e342e', 0.06]);
  const side = new THREE.MeshLambertMaterial({ map: woodTexture(false) });
  const fm = faceMat(woodTexture(true, false), woodTexture(true, true));
  const top = mat('#c8a27c');
  const log = new THREE.Mesh(boxGeo(1.0, 2.0, 0.9), [side, side, top, top, fm, side]);
  log.position.y = 1.9;
  log.castShadow = true;
  b.add(log);
  box(b, 0.7, 0.04, 0.6, '#a1785a', 0, 2.92, 0);               // tree rings
  for (const s of [-1, 1]) {
    const a = pivot(b, s * 0.62, 2.35, 0);
    box(a, 0.22, 1.0, 0.22, wood, 0, -0.5, 0);
    a.userData.side = s;
    r.arms.push(a);
    if (s > 0) {                                                // the bat
      const bat = box(a, 0.18, 1.5, 0.18, '#d7ccc8', 0, -1.25, 0.35);
      bat.rotation.x = 0.5;
      box(a, 0.26, 0.6, 0.26, '#bcaaa4', 0, -1.75, 0.6).rotation.x = 0.5;
    }
  }
  r.carryY = 3.0;
  r.setScared = faceSwitcher([fm]);
  return r;
}

function tralalero() {
  const root = new THREE.Group();
  const r = rig(root, pivot(root, 0, 0, 0));
  const b = r.body, skin = '#78909c';
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) {
    const l = leg(b, r.legs, 0.34, 0.9, 0.34, '#b0bec5', s * 0.3, 0.98, 0, ph, [0.5, 0.28, 0.74, '#1e88e5', 0.1]);
    box(l, 0.04, 0.08, 0.4, '#ffffff', s * 0.26, -0.82, 0.12);  // sneaker swoosh
    box(l, 0.52, 0.06, 0.76, '#ffffff', 0, -0.98, 0.1);         // sole
  }
  box(b, 1.0, 1.0, 2.4, skin, 0, 1.5, 0.1);
  box(b, 0.8, 0.45, 2.2, '#eceff1', 0, 1.2, 0.2);
  box(b, 0.82, 0.72, 0.6, skin, 0, 1.55, 1.55);
  box(b, 0.72, 0.16, 0.06, '#7f1d1d', 0, 1.3, 1.86);
  for (let i = 0; i < 5; i++) box(b, 0.08, 0.1, 0.04, '#ffffff', -0.26 + i * 0.13, 1.36, 1.88);
  for (const s of [-1, 1]) box(b, 0.06, 0.18, 0.18, '#111', s * 0.42, 1.75, 1.35);
  const fin = box(b, 0.16, 0.85, 0.75, '#607d8b', 0, 2.3, -0.1);
  fin.rotation.x = -0.35;
  const tail = pivot(b, 0, 1.6, -1.1);
  box(tail, 0.14, 1.2, 0.5, '#607d8b', 0, 0.15, -0.2).rotation.x = 0.3;
  r.tail = tail;
  for (const s of [-1, 1]) {
    const f = pivot(b, s * 0.5, 1.35, 0.55);
    box(f, 0.9, 0.12, 0.5, '#607d8b', s * 0.45, 0, 0);
    f.userData.side = s;
    r.flaps.push(f);
  }
  r.carryY = 2.35;
  return r;
}

function ballerina() {
  const root = new THREE.Group();
  const r = rig(root, pivot(root, 0, 0, 0));
  const b = r.body, skin = '#f5d0b5';
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) leg(b, r.legs, 0.24, 1.1, 0.24, '#f8bbd0', s * 0.18, 1.12, 0, ph, [0.26, 0.14, 0.42, '#f48fb1', 0.06]);
  box(b, 0.72, 0.85, 0.46, '#f48fb1', 0, 1.52, 0);
  box(b, 1.7, 0.16, 1.4, '#fce4ec', 0, 1.14, 0);
  box(b, 1.35, 0.14, 1.1, '#f8bbd0', 0, 1.26, 0);
  for (const s of [-1, 1]) {
    const a = pivot(b, s * 0.46, 1.88, 0);
    box(a, 0.18, 0.85, 0.18, skin, 0, -0.42, 0);
    a.userData.side = s;
    r.arms.push(a);
  }
  box(b, 0.2, 0.15, 0.2, skin, 0, 2.0, 0);                      // neck
  box(b, 1.2, 0.08, 1.2, '#fafafa', 0, 2.08, 0);                // saucer
  const fm = faceMat(cupTexture(false), cupTexture(true));
  const cup = mat('#fafafa');
  const head = new THREE.Mesh(boxGeo(0.92, 0.82, 0.92), [cup, cup, cup, cup, fm, cup]);
  head.position.y = 2.53;
  head.castShadow = true;
  b.add(head);
  box(b, 0.84, 0.06, 0.84, '#6d4c41', 0, 2.92, 0);              // coffee
  box(b, 0.5, 0.06, 0.5, '#efebe9', 0.05, 2.95, 0.05);          // foam
  box(b, 0.12, 0.42, 0.34, '#fafafa', 0.56, 2.55, 0);           // handle
  box(b, 0.12, 0.2, 0.14, '#fafafa', 0.66, 2.55, 0);
  r.carryY = 2.98;
  r.setScared = faceSwitcher([fm]);
  return r;
}

function chimpanzini() {
  const root = new THREE.Group();
  const r = rig(root, pivot(root, 0, 0, 0));
  const b = r.body, fur = '#6d4c41', yellow = '#ffeb3b';
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) leg(b, r.legs, 0.3, 0.75, 0.3, '#5d4037', s * 0.25, 0.78, 0, ph, [0.36, 0.14, 0.5, '#d7a77a', 0.08]);
  box(b, 1.0, 1.9, 0.9, yellow, 0, 1.68, 0);
  box(b, 0.3, 0.32, 0.3, '#5d4037', 0, 2.78, -0.1);
  box(b, 0.5, 0.3, 0.4, '#fbc02d', 0, 0.72, 0);
  for (const [x, z, rx, rz] of [[0, 0.5, 0.45, 0], [0, -0.5, -0.45, 0], [0.55, 0, 0, -0.45], [-0.55, 0, 0, 0.45]]) {
    const peel = box(b, Math.abs(x) ? 0.12 : 0.95, 0.9, Math.abs(z) ? 0.12 : 0.85, '#fdd835', x, 1.15, z);
    peel.rotation.set(rx, 0, rz);
  }
  box(b, 0.82, 0.82, 0.12, fur, 0, 2.0, 0.47);
  box(b, 0.6, 0.36, 0.12, '#d7a77a', 0, 1.82, 0.55);
  box(b, 0.24, 0.06, 0.04, '#3e2723', 0, 1.78, 0.62);
  for (const s of [-1, 1]) {
    box(b, 0.2, 0.2, 0.06, '#fff', s * 0.18, 2.12, 0.54);
    box(b, 0.1, 0.12, 0.04, '#111', s * 0.18, 2.12, 0.58);
    box(b, 0.22, 0.3, 0.12, fur, s * 0.52, 2.05, 0.4);
    const a = pivot(b, s * 0.62, 2.05, 0);
    box(a, 0.26, 1.0, 0.26, fur, 0, -0.5, 0);
    box(a, 0.3, 0.22, 0.3, '#d7a77a', 0, -1.0, 0);
    a.userData.side = s;
    r.arms.push(a);
  }
  r.carryY = 2.98;
  return r;
}

function bombardiro() {
  const root = new THREE.Group();
  const r = rig(root, pivot(root, 0, 0, 0));
  const b = r.body, croc = '#558b2f';
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) leg(b, r.legs, 0.22, 0.7, 0.22, '#455a64', s * 0.4, 0.82, 0.2, ph, [0.36, 0.36, 0.36, '#212121', 0]);
  box(b, 0.95, 0.85, 2.6, '#78909c', 0, 1.35, -0.2);
  box(b, 0.7, 0.4, 0.7, '#4fc3f7', 0, 1.85, 0.4);              // cockpit glass
  box(b, 0.9, 0.72, 0.9, croc, 0, 1.45, 1.4);
  box(b, 0.75, 0.38, 1.05, '#689f38', 0, 1.3, 2.25);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) box(b, 0.04, 0.12, 0.08, '#ffffff', s * 0.38, 1.22, 1.9 + i * 0.25);
    box(b, 0.26, 0.26, 0.26, croc, s * 0.25, 1.9, 1.3);
    box(b, 0.1, 0.12, 0.04, '#111', s * 0.25, 1.92, 1.44);
    const w = pivot(b, s * 0.47, 1.45, -0.1);
    box(w, 2.6, 0.12, 0.9, '#90a4ae', s * 1.3, 0, 0);
    box(w, 0.26, 0.26, 0.65, '#37474f', s * 1.25, -0.26, 0);   // bomb
    box(w, 0.3, 0.3, 0.5, '#546e7a', s * 1.6, 0, 0.45);        // engine
    const prop = pivot(w, s * 1.6, 0, 0.72);
    box(prop, 0.08, 0.95, 0.06, '#212121', 0, 0, 0);
    r.spin.push(prop);
    w.userData.side = s;
    r.flaps.push(w);
  }
  box(b, 0.12, 0.9, 0.6, '#607d8b', 0, 2.0, -1.3);
  box(b, 1.5, 0.1, 0.45, '#607d8b', 0, 1.5, -1.35);
  r.carryY = 2.2;
  return r;
}

const BUILDERS = { classic, girl, kpop, tungtung: tungTung, tralalero, ballerina, chimpanzini, bombardiro };

export function createPlayer(id = 'classic') {
  return (BUILDERS[id] || classic)();
}

// Renders a small picture of every skin for the shop (once, with the main renderer).
export function renderSkinThumbs(renderer, ids, w = 120, h = 140) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#3b4a6b');
  scene.add(new THREE.HemisphereLight('#ffffff', '#55606e', 2.2));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(3, 5, 6);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(32, w / h, 0.1, 50);
  const rt = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace });
  const px = new Uint8Array(w * h * 4);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const out = {};
  const prevTarget = renderer.getRenderTarget();
  for (const id of ids) {
    const r = createPlayer(id);
    r.root.rotation.y = 0.55;
    scene.add(r.root);
    const box3 = new THREE.Box3().setFromObject(r.root);
    const c = box3.getCenter(new THREE.Vector3());
    const size = box3.getSize(new THREE.Vector3());
    const dist = Math.max(size.y, size.x * 0.9) * 2.0 + 1.2;
    cam.position.set(c.x, c.y + 0.3, c.z + dist);
    cam.lookAt(c);
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    out[id] = canvas.toDataURL();
    scene.remove(r.root);
  }
  renderer.setRenderTarget(prevTarget);
  rt.dispose();
  return out;
}
