// Static level: terrain, the player's base, animal pens and decorations.
import * as THREE from 'three';
import { ANIMALS, BASE, WORLD, PATH_HALF, PEN_HALF, ZONES, SLOT_POS, TREADMILL, SHOP_PAD } from './config.js';
import { mulberry32, cellTexture, canvasTexture, box, mat, createNest, Label } from './models.js';

// Collects lots of static boxes into a single InstancedMesh (one draw call).
class StaticBoxes {
  constructor(seed) {
    this.items = [];
    this.colliders = [];
    this.rnd = mulberry32(seed);
  }

  add(w, h, d, x, y, z, color, { rotY = 0, collide = false, jitter = 0.04 } = {}) {
    this.items.push({ w, h, d, x, y, z, color, rotY, jitter });
    if (collide) this.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y + h / 2);
  }

  collider(minX, maxX, minZ, maxZ, h) {
    this.colliders.push({ minX, maxX, minZ, maxZ, h });
  }

  build(scene, { shadows = true } = {}) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), this.items.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    this.items.forEach((it, i) => {
      e.set(0, it.rotY, 0);
      q.setFromEuler(e);
      p.set(it.x, it.y, it.z);
      s.set(it.w, it.h, it.d);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      c.set(it.color);
      if (it.jitter) c.offsetHSL(0, 0, (this.rnd() - 0.5) * it.jitter);
      mesh.setColorAt(i, c);
    });
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
}

function zoneAt(z) {
  return ZONES.find(zn => z <= zn.from && z > zn.to) || ZONES[ZONES.length - 1];
}

function flatPlane(scene, w, d, x, z, y, material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function groundMat(colors, line, w, d, seed, cell = 2) {
  const tex = cellTexture(colors, line, 4, 16, seed);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(w / (cell * 4), d / (cell * 4));
  return new THREE.MeshLambertMaterial({ map: tex });
}

function fence(sb, x1, z1, x2, z2, color, rail) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  const n = Math.max(1, Math.round(len / 2.2));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    sb.add(0.34, 1.45, 0.34, x1 + dx * t, 0.72, z1 + dz * t, color);
  }
  const horiz = Math.abs(dx) > Math.abs(dz);
  const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
  for (const y of [0.55, 1.1]) sb.add(horiz ? len : 0.14, 0.18, horiz ? 0.14 : len, mx, y, mz, rail, { jitter: 0 });
  sb.collider(Math.min(x1, x2) - 0.22, Math.max(x1, x2) + 0.22, Math.min(z1, z2) - 0.22, Math.max(z1, z2) + 0.22, 1.45);
}

function tree(sb, x, z, s, leaf, trunk = '#6d4c2f', collide = true) {
  sb.add(0.9 * s, 3 * s, 0.9 * s, x, 1.5 * s, z, trunk, { collide });
  sb.add(3.2 * s, 2.2 * s, 3.2 * s, x, 3.6 * s, z, leaf, { jitter: 0.08 });
  sb.add(2.2 * s, 1.4 * s, 2.2 * s, x + 0.2 * s, 5.2 * s, z - 0.1 * s, leaf, { jitter: 0.1 });
}

function pine(sb, x, z, s, leaf) {
  sb.add(0.7 * s, 2 * s, 0.7 * s, x, 1 * s, z, '#4e342e', { collide: true });
  sb.add(3.0 * s, 1.2 * s, 3.0 * s, x, 2.4 * s, z, leaf, { jitter: 0.06 });
  sb.add(2.2 * s, 1.2 * s, 2.2 * s, x, 3.6 * s, z, leaf, { jitter: 0.06 });
  sb.add(1.4 * s, 1.2 * s, 1.4 * s, x, 4.8 * s, z, leaf, { jitter: 0.06 });
  sb.add(0.6 * s, 0.8 * s, 0.6 * s, x, 5.8 * s, z, leaf, { jitter: 0.06 });
}

function cactus(sb, x, z, s) {
  const g = '#4caf50';
  sb.add(0.8 * s, 3.4 * s, 0.8 * s, x, 1.7 * s, z, g, { collide: true });
  sb.add(0.9 * s, 0.6 * s, 0.6 * s, x + 0.8 * s, 1.6 * s, z, g);
  sb.add(0.6 * s, 1.4 * s, 0.6 * s, x + 1.1 * s, 2.3 * s, z, g);
  sb.add(0.8 * s, 0.6 * s, 0.6 * s, x - 0.75 * s, 2.2 * s, z, g);
  sb.add(0.6 * s, 1.0 * s, 0.6 * s, x - 1.0 * s, 2.7 * s, z, g);
}

function hayBale(sb, x, z, rotY = 0) {
  sb.add(2.2, 1.2, 1.4, x, 0.6, z, '#e3c04f', { rotY, collide: true, jitter: 0.06 });
  sb.add(2.24, 0.08, 1.44, x, 0.85, z, '#b98f2b', { rotY, jitter: 0 });
  sb.add(2.24, 0.08, 1.44, x, 0.35, z, '#b98f2b', { rotY, jitter: 0 });
}

function crate(sb, x, z, s = 1.2) {
  sb.add(s, s, s, x, s / 2, z, '#a1683a', { collide: true, jitter: 0.08 });
  sb.add(s + 0.04, 0.14, s + 0.04, x, s - 0.07, z, '#7a4b25', { jitter: 0 });
  sb.add(s + 0.04, 0.14, s + 0.04, x, 0.07, z, '#7a4b25', { jitter: 0 });
}

function lamp(sb, scene, x, z) {
  sb.add(0.25, 3.4, 0.25, x, 1.7, z, '#3e2723', { collide: true });
  sb.add(1.0, 0.18, 0.18, x + 0.4, 3.3, z, '#3e2723');
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), new THREE.MeshBasicMaterial({ color: '#ffd54f' }));
  l.position.set(x + 0.8, 2.95, z);
  scene.add(l);
  sb.add(0.62, 0.12, 0.62, x + 0.8, 3.3, z, '#3e2723');
}

export function buildWorld(scene) {
  const sb = new StaticBoxes(7);
  const rnd = mulberry32(42);
  const R = (a, b) => a + rnd() * (b - a);
  const animated = { lava: [], blades: null };

  // ---------- Terrain ----------
  flatPlane(scene, 260, 680, 0, -250, 0, groundMat(['#5cbf3a', '#62c840', '#57b636', '#69cc47'], 'rgba(0,0,0,0.07)', 260, 680, 3));
  flatPlane(scene, 260, 105, 0, -292.5, 0.01, groundMat(['#3f9a37', '#47a33d', '#3b9133', '#4caa40'], 'rgba(0,0,0,0.08)', 260, 105, 4));
  flatPlane(scene, 260, 70, 0, -380, 0.012, groundMat(['#f1d18a', '#ebc87c', '#f5d898', '#e6c174'], 'rgba(120,80,20,0.08)', 260, 70, 5));
  flatPlane(scene, 260, 185, 0, -507.5, 0.014, groundMat(['#3a3236', '#433a3e', '#352d31', '#4a3f42'], 'rgba(0,0,0,0.15)', 260, 185, 6));
  // path to the pens
  flatPlane(scene, PATH_HALF * 2, 488, 0, -242, 0.02, groundMat(['#d9b77a', '#cfab6b', '#e0c088', '#d4b072'], 'rgba(90,60,20,0.18)', PATH_HALF * 2, 488, 8, 1.25));
  for (let z = 2; z > WORLD.minZ; z -= 2.5) {
    sb.add(0.5, 0.18, 2.5, -PATH_HALF - 0.25, 0.09, z - 1.25, '#8b9a8f', { jitter: 0.1 });
    sb.add(0.5, 0.18, 2.5, PATH_HALF + 0.25, 0.09, z - 1.25, '#8b9a8f', { jitter: 0.1 });
  }

  // ---------- Base ----------
  const baseTex = canvasTexture(64, 64, (ctx) => {
    const cols = ['#9fb8d9', '#a8c1e0', '#97b0d2', '#a3bcdc'];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = cols[(x * 3 + y * 5) % 4]; ctx.fillRect(x * 16, y * 16, 16, 16);
      ctx.fillStyle = 'rgba(40,60,100,0.25)'; ctx.fillRect(x * 16, y * 16, 16, 1); ctx.fillRect(x * 16, y * 16, 1, 16);
    }
  }, { repeat: [48 / 8, 36 / 8] });
  flatPlane(scene, 48, 36, 0, 18, 0.03, new THREE.MeshLambertMaterial({ map: baseTex }));
  // base walls
  const wallC = '#ececec', wallTop = '#5c8fd6';
  for (const s of [-1, 1]) {
    sb.add(1, 1.6, 36, s * 24.5, 0.8, 18, wallC, { collide: true });
    sb.add(1.2, 0.3, 36.2, s * 24.5, 1.75, 18, wallTop, { jitter: 0 });
  }
  sb.add(50, 1.6, 1, 0, 0.8, 36.5, wallC, { collide: true });
  sb.add(50.2, 0.3, 1.2, 0, 1.75, 36.5, wallTop, { jitter: 0 });
  // entrance arch
  for (const s of [-1, 1]) {
    sb.add(1.6, 6, 1.6, s * 7, 3, 0, '#5c8fd6', { collide: true });
    sb.add(2, 0.5, 2, s * 7, 6.25, 0, '#ffffff', { jitter: 0 });
  }
  sb.add(16, 1.2, 1.2, 0, 6.9, 0, '#5c8fd6', { jitter: 0 });
  const baseSign = new Label({ w: 512, h: 128, worldH: 2.2, bg: 'rgba(30,60,140,0.85)' });
  baseSign.set([{ t: 'ТВОЯ БАЗА', c: '#ffffff', s: 64 }]);
  baseSign.sprite.position.set(0, 9, 0);
  scene.add(baseSign.sprite);

  // Glowing barrier along the whole base edge: animals can't pass it.
  const barrierTex = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(120,220,255,0)');
    g.addColorStop(1, 'rgba(120,220,255,0.9)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = -64; i < 64; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 64); ctx.lineTo(i + 8, 64); ctx.lineTo(i + 72, 0); ctx.lineTo(i + 64, 0); ctx.fill();
    }
  }, { repeat: [22, 1], nearest: false });
  const barrier = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.maxX - WORLD.minX, 2.4),
    new THREE.MeshBasicMaterial({ map: barrierTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.75 }));
  barrier.position.set(0, 1.2, -0.05);
  scene.add(barrier);
  animated.barrierTex = barrierTex;
  sb.add(WORLD.maxX - WORLD.minX, 0.08, 0.4, 0, 0.04, 0, '#4fc3f7', { jitter: 0 });

  // Egg incubator pedestals
  const slots = SLOT_POS.map((p, i) => {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    const stone = box(g, 3.0, 0.4, 3.0, '#cfd8dc', 0, 0.2, 0);
    stone.receiveShadow = true;
    const top = box(g, 2.5, 0.12, 2.5, '#ffd54f', 0, 0.46, 0);
    top.receiveShadow = true;
    const lock = new Label({ w: 256, h: 96, worldH: 0.9, bg: 'rgba(0,0,0,0.5)' });
    lock.set([{ t: 'ЗАКРЫТО', c: '#bbbbbb', s: 44 }]);
    lock.sprite.position.set(0, 1.2, 0);
    g.add(lock.sprite);
    scene.add(g);
    return {
      group: g, top, lock, index: i,
      setUnlocked(v) {
        top.material = mat(v ? '#ffd54f' : '#78909c');
        stone.material = mat(v ? '#cfd8dc' : '#90a4ae');
        lock.sprite.visible = !v;
      },
    };
  });
  const slotsSign = new Label({ w: 512, h: 128, worldH: 1.6 });
  slotsSign.set([{ t: 'ИНКУБАТОР', c: '#ffd54f', s: 54 }, { t: 'яйца вылупляются в питомцев', c: '#ffffff', s: 30 }]);
  slotsSign.sprite.position.set(-14, 4.2, 30);
  scene.add(slotsSign.sprite);

  // Treadmill
  const tm = new THREE.Group();
  tm.position.set(TREADMILL.x, 0, TREADMILL.z);
  box(tm, 3.4, 0.3, 6.6, '#455a64', 0, 0.15, 0).receiveShadow = true;
  const beltTex = canvasTexture(16, 64, (ctx) => {
    ctx.fillStyle = '#263238'; ctx.fillRect(0, 0, 16, 64);
    ctx.fillStyle = '#37474f';
    for (let y = 0; y < 64; y += 8) ctx.fillRect(0, y, 16, 3);
  }, { repeat: [1, 3] });
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 6.2), new THREE.MeshLambertMaterial({ map: beltTex }));
  belt.rotation.x = -Math.PI / 2;
  belt.position.y = 0.31;
  belt.receiveShadow = true;
  tm.add(belt);
  for (const s of [-1, 1]) {
    box(tm, 0.2, 1.3, 0.2, '#37474f', s * 1.55, 0.95, -3.0);
    box(tm, 0.16, 0.12, 4.0, '#b0bec5', s * 1.55, 1.5, -1.0);
    box(tm, 0.16, 1.2, 0.16, '#b0bec5', s * 1.55, 0.9, 0.95);
  }
  const consoleBox = box(tm, 3.2, 0.9, 0.35, '#263238', 0, 1.95, -3.05);
  consoleBox.rotation.x = 0.35;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ color: '#00e5ff' }));
  screen.position.set(0, 2.03, -2.86);
  screen.rotation.x = -Math.PI * 0.11;
  tm.add(screen);
  scene.add(tm);
  sb.collider(TREADMILL.x - 1.7, TREADMILL.x + 1.7, TREADMILL.z - 3.3, TREADMILL.z - 2.85, 2.4);
  const tmLabel = new Label({ w: 512, h: 160, worldH: 1.8 });
  tmLabel.sprite.position.set(TREADMILL.x, 4.4, TREADMILL.z - 2.5);
  scene.add(tmLabel.sprite);

  // Shop stall
  const shop = new THREE.Group();
  shop.position.set(SHOP_PAD.x, 0, SHOP_PAD.z + 4.2);
  box(shop, 6.4, 1.2, 1.6, '#8d6e63', 0, 0.6, 0).receiveShadow = true;
  box(shop, 6.6, 0.2, 1.8, '#6d4c41', 0, 1.25, 0);
  box(shop, 6.4, 3.4, 0.3, '#a1887f', 0, 1.7, 1.2);
  for (const s of [-1, 1]) box(shop, 0.3, 3.6, 0.3, '#5d4037', s * 3.1, 1.8, -0.7);
  for (let i = 0; i < 8; i++) {
    const a = box(shop, 0.85, 0.16, 2.6, i % 2 ? '#ffffff' : '#e53935', -2.98 + i * 0.85, 3.7, 0.2);
    a.rotation.x = -0.35;
  }
  for (let i = 0; i < 3; i++) {
    const e = createEggDisplay(ANIMALS[i * 3]);
    e.position.set(-1.8 + i * 1.8, 1.7, 0);
    shop.add(e);
  }
  scene.add(shop);
  sb.collider(SHOP_PAD.x - 3.3, SHOP_PAD.x + 3.3, SHOP_PAD.z + 3.2, SHOP_PAD.z + 5.6, 3);
  const shopSign = new Label({ w: 512, h: 128, worldH: 1.6, bg: 'rgba(200,40,40,0.9)' });
  shopSign.set([{ t: 'МАГАЗИН', c: '#ffffff', s: 60 }]);
  shopSign.sprite.position.set(SHOP_PAD.x, 5.2, SHOP_PAD.z + 4.2);
  scene.add(shopSign.sprite);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(SHOP_PAD.r, SHOP_PAD.r, 0.12, 24),
    new THREE.MeshBasicMaterial({ color: '#76ff03', transparent: true, opacity: 0.6 }));
  pad.position.set(SHOP_PAD.x, 0.06, SHOP_PAD.z);
  scene.add(pad);

  // decorations inside the base
  hayBale(sb, -21, 32);
  hayBale(sb, -18.5, 33);
  crate(sb, 21.5, 33.5);
  crate(sb, 20, 33.8, 1);
  crate(sb, 21.6, 33.5 - 1.3, 1);
  for (const x of [-22, 22]) lamp(sb, scene, x, 2.5);

  // ---------- Outside the base (z > 0, decor) ----------
  // barn
  const bx = -35, bz = 15;
  sb.add(10, 7, 12, bx, 3.5, bz, '#c0392b', { collide: true, jitter: 0.02 });
  for (let i = 0; i < 5; i++) sb.add(11 - i * 2.2, 0.9, 12.6, bx, 7.45 + i * 0.9, bz, '#7b1e1e', { jitter: 0.02 });
  sb.add(0.3, 5, 4.4, bx + 5.05, 2.5, bz, '#ffffff', { jitter: 0 });
  sb.add(0.32, 4.4, 3.8, bx + 5.08, 2.3, bz, '#8e2a20', { jitter: 0 });
  sb.add(0.34, 0.3, 5.2, bx + 5.1, 2.3, bz, '#ffffff', { jitter: 0 });
  // windmill
  const wx = 35, wz = 18;
  for (let i = 0; i < 6; i++) sb.add(4.4 - i * 0.45, 2, 4.4 - i * 0.45, wx, 1 + i * 2, wz, i % 2 ? '#e0d6c8' : '#d7ccbc', { collide: i === 0 });
  sb.add(2.2, 1.4, 2.2, wx, 12.6, wz, '#8d6e63');
  const blades = new THREE.Group();
  blades.position.set(wx - 1.4, 12.4, wz);
  blades.rotation.y = -Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    box(arm, 0.3, 5.5, 0.15, '#6d4c41', 0, 2.9, 0);
    box(arm, 1.4, 4.4, 0.1, '#fafafa', 0.8, 3.3, 0.05);
    blades.add(arm);
  }
  scene.add(blades);
  animated.blades = blades;
  hayBale(sb, 30, 6, 0.3);
  hayBale(sb, 31, 4.2, -0.2);
  crate(sb, -29, 4);
  crate(sb, -30.4, 4.6, 1);

  // ---------- Pens ----------
  const pens = ANIMALS.map((a, i) => {
    const zone = zoneAt(a.z);
    const cx = a.side * (PATH_HALF + 2 + PEN_HALF), cz = a.z;
    const inner = a.side * (PATH_HALF + 2), outer = a.side * (PATH_HALF + 2 + PEN_HALF * 2);
    const fc = { farm: '#9a6534', forest: '#5d4037', desert: '#c8a16a', volcano: '#2f2b33' }[zone.id];
    const rc = { farm: '#b77a42', forest: '#795548', desert: '#dcbb87', volcano: '#4a4450' }[zone.id];
    const floor = { farm: '#c9a965', forest: '#7b6a3a', desert: '#e2bd78', volcano: '#5b2a22' }[zone.id];
    flatPlane(scene, PEN_HALF * 2 - 0.4, PEN_HALF * 2 - 0.4, cx, cz, 0.025, groundMat([floor, floor, floor], 'rgba(0,0,0,0.08)', 18, 18, 20 + i));
    fence(sb, outer, cz - PEN_HALF, outer, cz + PEN_HALF, fc, rc);
    fence(sb, inner, cz - PEN_HALF, outer, cz - PEN_HALF, fc, rc);
    fence(sb, inner, cz + PEN_HALF, outer, cz + PEN_HALF, fc, rc);
    fence(sb, inner, cz - PEN_HALF, inner, cz - 3, fc, rc);
    fence(sb, inner, cz + 3, inner, cz + PEN_HALF, fc, rc);
    const nest = createNest();
    const nestPos = new THREE.Vector3(a.side * (PATH_HALF + 2 + PEN_HALF * 1.45), 0, cz);
    nest.position.copy(nestPos);
    scene.add(nest);
    // sign at the gate
    sb.add(0.3, 3.2, 0.3, inner - a.side * 0.9, 1.6, cz + 3.6, '#5d4037');
    const sign = new Label({ w: 512, h: 220, worldH: 2.4 });
    sign.sprite.position.set(inner - a.side * 0.9, 4.6, cz + 3.6);
    scene.add(sign.sprite);
    return {
      def: a, index: i, zone: zone.id, nestPos, sign,
      center: new THREE.Vector3(cx, 0, cz),
      bounds: { minX: Math.min(inner, outer) + 1.2, maxX: Math.max(inner, outer) - 1.2, minZ: cz - PEN_HALF + 1.2, maxZ: cz + PEN_HALF - 1.2 },
    };
  });

  // ---------- Scenery along the path ----------
  const nearPen = (x, z) => pens.some(p => Math.abs(x - p.center.x) < PEN_HALF + 3 && Math.abs(z - p.center.z) < PEN_HALF + 3);
  const scatter = (count, z0, z1, fn, xMin = 27, xMax = 70) => {
    for (let k = 0; k < count; k++) {
      const z = R(z1, z0), side = rnd() < 0.5 ? -1 : 1, x = side * R(xMin, xMax);
      if (Math.abs(x) < PATH_HALF + 2 || nearPen(x, z)) continue;
      if (z > -3 && Math.abs(x) < 46) continue;
      fn(x, z);
    }
  };
  // farm
  scatter(70, -4, -240, (x, z) => tree(sb, x, z, R(0.8, 1.3), rnd() < 0.5 ? '#3fa34d' : '#4caf50'));
  scatter(40, 40, -20, (x, z) => tree(sb, x, z, R(0.9, 1.3), '#43a047'), 47, 75);
  scatter(25, -4, -240, (x, z) => hayBale(sb, x, z, R(0, 3)), 12, 40);
  scatter(140, -2, -240, (x, z) => sb.add(0.35, 0.35, 0.35, x, 0.18, z, ['#ff5252', '#ffeb3b', '#ffffff', '#e040fb'][Math.floor(rnd() * 4)]), 6, 60);
  scatter(120, -2, -340, (x, z) => sb.add(0.5, 0.4, 0.5, x, 0.2, z, '#4caf50', { jitter: 0.12 }), 6, 60);
  // forest
  scatter(110, -240, -345, (x, z) => pine(sb, x, z, R(0.9, 1.5), rnd() < 0.5 ? '#2e7d32' : '#1b5e20'), 27, 75);
  scatter(25, -240, -345, (x, z) => sb.add(R(1, 2.4), R(0.6, 1.4), R(1, 2.4), x, 0.4, z, '#8d8d8d', { collide: true, jitter: 0.1 }), 10, 45);
  // desert: canyon walls, cacti, rocks, bones
  for (let z = -345; z > -415; z -= 6) {
    for (const s of [-1, 1]) {
      const h = R(6, 12);
      sb.add(R(6, 10), h, 6.2, s * R(48, 52), h / 2, z - 3, '#d9a866', { jitter: 0.08 });
      sb.add(R(5, 8), 1.5, 5, s * R(46, 50), h + 0.75, z - 3, '#c99556', { jitter: 0.08 });
    }
  }
  scatter(35, -347, -413, (x, z) => cactus(sb, x, z, R(0.8, 1.2)), 12, 44);
  scatter(25, -347, -413, (x, z) => sb.add(R(1, 2.5), R(0.8, 1.8), R(1, 2.5), x, 0.5, z, '#b88a55', { collide: true, jitter: 0.1 }), 10, 44);
  scatter(12, -347, -413, (x, z) => { sb.add(2.2, 0.3, 0.3, x, 0.15, z, '#f5f0e1'); sb.add(0.3, 0.3, 1.2, x - 0.9, 0.15, z, '#f5f0e1'); sb.add(0.3, 0.3, 1.2, x + 0.9, 0.15, z, '#f5f0e1'); }, 10, 44);
  // volcano: dark rocks and lava
  for (let z = -415; z > -600; z -= 7) {
    for (const s of [-1, 1]) {
      const h = R(8, 16);
      sb.add(R(6, 10), h, 7.2, s * R(48, 54), h / 2, z - 3.5, '#2b2326', { jitter: 0.1 });
    }
  }
  for (let i = 0; i < 6; i++) sb.add(60 - i * 9, 6, 60 - i * 9, 0, 3 + i * 6, -560, i > 3 ? '#4a1d14' : '#2b2326', { jitter: 0.04 });
  scatter(30, -418, -482, (x, z) => sb.add(R(1, 3), R(0.8, 2.5), R(1, 3), x, 0.6, z, '#3b3236', { collide: true, jitter: 0.12 }), 10, 44);
  const lavaMat = new THREE.MeshBasicMaterial({ color: '#ff6d00' });
  animated.lava.push(lavaMat);
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * R(28, 42), z = R(-420, -480);
    if (nearPen(x, z)) continue;
    flatPlane(scene, R(4, 9), R(4, 9), x, z, 0.05, lavaMat);
  }
  flatPlane(scene, 30, 12, 0, -500, 0.05, lavaMat);
  // lamps along the path
  for (let z = -20; z > -470; z -= 22) {
    const side = Math.round(z / 22) % 2 ? 1 : -1;
    if (pens.some(p => p.def.side === side && Math.abs(p.center.z - z) < PEN_HALF + 2)) continue;
    lamp(sb, scene, side * (PATH_HALF + 1.2), z);
  }
  // world end
  sb.collider(WORLD.minX - 5, WORLD.maxX + 5, WORLD.minZ - 6, WORLD.minZ, 20);

  // ---------- Clouds ----------
  const cloudBoxes = new StaticBoxes(9);
  for (let i = 0; i < 26; i++) {
    const x = R(-120, 120), z = R(-520, 80), y = R(38, 55);
    const n = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) cloudBoxes.add(R(6, 12), R(2, 3.5), R(5, 9), x + k * R(3, 6), y + R(-0.5, 0.8), z + R(-2, 2), '#ffffff', { jitter: 0 });
  }
  const clouds = cloudBoxes.build(scene, { shadows: false });
  clouds.material = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.92 });
  clouds.receiveShadow = false;
  animated.clouds = clouds;

  sb.build(scene);

  return { colliders: sb.colliders, pens, slots, treadmill: { group: tm, beltTex, label: tmLabel, screen }, pad, animated };
}

function createEggDisplay(def) {
  const g = new THREE.Group();
  const s = 0.5;
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat(def.egg));
  egg.scale.set(s, s * 1.3, s);
  egg.position.y = s * 0.65;
  egg.castShadow = true;
  g.add(egg);
  return g;
}

export { zoneAt };
