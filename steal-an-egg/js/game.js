// Steal An Egg — main game loop, player, animal AI, incubators and economy.
import * as THREE from 'three';
import {
  ANIMALS, RARITIES, UPG, worldSpeed, speedPrice, START_SPEED, MAX_SPEED, BASE_EDGE, WORLD,
  SLOT_POS, TREADMILL, SHOP_PAD, SPAWN, SKINS, TRAILS, ADMIN_CODE,
  MUTATIONS, rollMutation, PET, levelMult, LEGENDARY,
} from './config.js';
import { createPlayer, renderSkinThumbs } from './skins.js';
import { Trail } from './trail.js';
import { WorldEvents } from './events.js';
import { BossManager } from './bosses.js';
import { createAnimal, createEgg, eggMaterial, tintRig, addCrown, animateRig, setEyesClosed, Label, boxGeo, mat } from './models.js';
import { buildWorld, zoneAt } from './world.js';
import { Input } from './input.js';
import { initAudio, setSound, sfx } from './audio.js';
import { UI, fmt } from './ui.js';

const SAVE_KEY = 'steal-an-egg-save-v1';
const OFFLINE_CAP = 2 * 3600;
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');
addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch'); }, true);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Pushes a circle (x/z) out of axis-aligned boxes.
function resolveCollisions(pos, r, colliders) {
  for (const c of colliders) {
    if (pos.y >= c.h) continue;
    if (pos.x < c.minX - r || pos.x > c.maxX + r || pos.z < c.minZ - r || pos.z > c.maxZ + r) continue;
    const cx = clamp(pos.x, c.minX, c.maxX), cz = clamp(pos.z, c.minZ, c.maxZ);
    const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
    if (d2 > r * r) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      pos.x = cx + (dx / d) * r;
      pos.z = cz + (dz / d) * r;
    } else {
      const l = pos.x - c.minX, rr = c.maxX - pos.x, f = pos.z - c.minZ, b = c.maxZ - pos.z;
      const m = Math.min(l, rr, f, b);
      if (m === l) pos.x = c.minX - r;
      else if (m === rr) pos.x = c.maxX + r;
      else if (m === f) pos.z = c.minZ - r;
      else pos.z = c.maxZ + r;
    }
  }
}

function defaultState() {
  return {
    money: 0, speed: START_SPEED, speedBuys: 0, tread: 1, slots: UPG.slots.start,
    pets: new Array(UPG.slots.max).fill(null), col: {}, sound: true, steals: 0, t: Date.now(),
    skin: 'classic', skins: { classic: true }, trail: 'none', trails: { none: true },
    admin: false, god: false, forceLeg: false,
  };
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || typeof s.money !== 'number') return null;
    const st = Object.assign(defaultState(), s);
    st.pets = Array.from({ length: UPG.slots.max }, (_, i) => {
      const p = st.pets[i];
      if (!p || !ANIMALS[p.a]) return null;
      return { m: 0, lv: 1, xp: 0, b: 0, ...p };
    });
    st.skins = Object.assign({ classic: true }, st.skins);
    if (!SKINS.some(k => k.id === st.skin)) st.skin = 'classic';
    st.trails = Object.assign({ none: true }, st.trails);
    if (!TRAILS.some(k => k.id === st.trail)) st.trail = 'none';
    return st;
  } catch {
    return null;
  }
}

// Short-lived "+$5" style text that floats up.
class Floaters {
  constructor(scene, n = 16) {
    this.items = Array.from({ length: n }, () => {
      const l = new Label({ w: 256, h: 96, worldH: 0.9, bg: null });
      l.sprite.visible = false;
      scene.add(l.sprite);
      return { l, life: 0 };
    });
    this.next = 0;
  }

  spawn(text, color, pos, size = 64) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    it.l.set([{ t: text, c: color, s: size }]);
    it.l.sprite.position.copy(pos);
    it.l.sprite.visible = true;
    it.l.sprite.material.opacity = 1;
    it.life = 1.3;
  }

  update(dt) {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      it.l.sprite.position.y += dt * 1.5;
      it.l.sprite.material.opacity = clamp(it.life / 0.5, 0, 1);
      if (it.life <= 0) it.l.sprite.visible = false;
    }
  }
}

class Animal {
  constructor(game, pen) {
    const def = pen.def;
    this.g = game;
    this.def = def;
    this.pen = pen;
    this.idx = pen.index;
    this.rig = createAnimal(def.id);
    this.rig.root.scale.setScalar(def.scale);
    // Guards from behind the nest (the side away from the gate).
    this.home = new THREE.Vector3(pen.nestPos.x + def.side * 2.6, 0, pen.nestPos.z);
    this.pos = this.home.clone();
    this.target = this.home.clone();
    this.facing = def.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    game.scene.add(this.rig.root);

    this.nestMut = 0;
    this.nestEgg = createEgg(def);
    this.nestEgg.position.set(pen.nestPos.x, 0.45 + this.nestEgg.userData.halfH, pen.nestPos.z);
    game.scene.add(this.nestEgg);
    this.mutLabel = null;
    this.eggPresent = true;
    this.respawnT = 0;
    this.popT = 1;
    if (!def.boss) this.setNestMut(rollMutation(game.state.weather === 'storm'));

    this.state = 'idle';
    this.timer = Math.random() * 2;
    this.phase = Math.random() * 10;
    this.moveAmt = 0;
    this.hop = 0;
    this.sleepIn = 0;

    this.alertLabel = new Label({ w: 128, h: 128, worldH: 1.7, bg: null });
    this.alertLabel.set([{ t: '!', c: '#ff1744', s: 110 }]);
    this.alertLabel.sprite.visible = false;
    game.scene.add(this.alertLabel.sprite);

    this.sleeping = false;
    if (def.sleeps) {
      this.zzz = new Label({ w: 256, h: 128, worldH: 1.5, bg: null });
      this.zzz.set([{ t: 'Z z z', c: '#e3f2fd', s: 64 }]);
      game.scene.add(this.zzz.sprite);
      this.setSleeping(true);
    }
  }

  get top() { return this.rig.height * this.def.scale; }

  setNestMut(m) {
    this.nestMut = m;
    this.nestEgg.material = eggMaterial(this.def, m);
    if (m && !this.mutLabel) {
      this.mutLabel = new Label({ w: 384, h: 96, worldH: 1.0, bg: 'rgba(0,0,0,0.55)' });
      this.g.scene.add(this.mutLabel.sprite);
    }
    if (this.mutLabel) {
      const mu = MUTATIONS[m];
      this.mutLabel.set([{ t: `${mu.name} ×${mu.mult}`, c: mu.color || '#fff', s: 48 }]);
      this.mutLabel.sprite.position.set(this.pen.nestPos.x, 1.2 + this.def.eggSize * 2.2, this.pen.nestPos.z);
      this.mutLabel.sprite.visible = !!m && this.eggPresent;
    }
  }

  destroy() {
    const sc = this.g.scene;
    sc.remove(this.rig.root, this.nestEgg, this.alertLabel.sprite);
    if (this.mutLabel) sc.remove(this.mutLabel.sprite);
    if (this.zzz) sc.remove(this.zzz.sprite);
  }

  setSleeping(v) {
    this.sleeping = v;
    setEyesClosed(this.rig, v);
    if (this.zzz) this.zzz.sprite.visible = v;
  }

  alert() {
    this.state = 'alert';
    this.timer = this.sleeping ? 0.9 : 0.4;
    this.alertLabel.sprite.visible = true;
    if (this.sleeping) this.setSleeping(false);
    sfx.alert();
  }

  moveTo(target, speed, dt) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const step = Math.min(d, speed * dt);
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    // The glowing barrier: animals never enter the base territory.
    if (this.pos.z > BASE_EDGE - 0.8) this.pos.z = BASE_EDGE - 0.8;
    this.facing = lerpAngle(this.facing, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10));
    return step / dt;
  }

  update(dt) {
    const g = this.g, p = g.p, def = this.def;
    let speed = 0;
    switch (this.state) {
      case 'idle': {
        if (this.sleeping) break;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = rand(2, 5);
          const b = this.pen.bounds;
          this.target.set(clamp(this.home.x + rand(-3, 3), b.minX, b.maxX), 0, clamp(this.home.z + rand(-4, 4), b.minZ, b.maxZ));
        }
        speed = this.moveTo(this.target, 1.6, dt);
        if (def.sleeps) {
          this.sleepIn -= dt;
          if (this.sleepIn <= 0) { this.target.copy(this.home); if (this.pos.distanceTo(this.home) < 0.3) this.setSleeping(true); }
        }
        break;
      }
      case 'alert': {
        this.timer -= dt;
        this.facing = lerpAngle(this.facing, Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z), 1 - Math.exp(-dt * 12));
        this.hop = Math.max(this.hop, 0.6);
        if (this.timer <= 0) this.state = 'chase';
        break;
      }
      case 'chase': {
        if (p.carrySrc !== this || g.inBase(p.pos)) { this.state = 'return'; break; }
        speed = this.moveTo(p.pos, worldSpeed(def.speed), dt);
        const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
        if (d < 0.9 + def.scale * 0.6 && p.pos.y < this.top && !g.state.god) g.caught(this);
        break;
      }
      case 'return': {
        this.alertLabel.sprite.visible = false;
        speed = this.moveTo(this.home, Math.max(5, worldSpeed(def.speed) * 0.4), dt);
        if (this.pos.distanceTo(this.home) < 0.1) { this.state = 'idle'; this.timer = 1; this.sleepIn = 5; }
        break;
      }
    }

    if (!this.eggPresent && this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.restoreEgg(true);
    }
    if (this.popT < 1) {
      this.popT = Math.min(1, this.popT + dt * 2.5);
      const s = def.eggSize * Math.max(0.01, easeOutBack(this.popT));
      this.nestEgg.scale.set(s, s * 1.3, s);
    }

    this.moveAmt += (clamp(speed / 3, 0, 1) - this.moveAmt) * Math.min(1, dt * 10);
    this.phase += dt * Math.min(2 + speed * 1.3 / def.scale, 30);
    animateRig(this.rig, this.phase, this.moveAmt);
    this.hop = Math.max(0, this.hop - dt * 2.5);
    const t = g.time;
    if (this.rig.head) this.rig.head.rotation.x = this.sleeping ? 0.45 : 0;
    const root = this.rig.root;
    root.position.set(this.pos.x, Math.sin(this.hop * Math.PI) * 0.8, this.pos.z);
    root.rotation.y = this.facing;
    if (this.sleeping) root.scale.y = this.def.scale * (1 + Math.sin(t * 2) * 0.03);
    else root.scale.y = this.def.scale;
    if (this.alertLabel.sprite.visible) {
      this.alertLabel.sprite.position.set(this.pos.x, this.top + 1.2 + Math.sin(t * 12) * 0.1, this.pos.z);
      if (this.state === 'chase' && this.timer < -1.2) this.alertLabel.sprite.visible = false;
      this.timer -= this.state === 'chase' ? dt : 0;
    }
    if (this.zzz && this.sleeping) this.zzz.sprite.position.set(this.pos.x, this.top + 1 + Math.sin(t * 1.5) * 0.3, this.pos.z);
  }

  // pop: a fresh egg appears (rolls a new mutation); otherwise the stolen one comes back.
  restoreEgg(pop) {
    this.eggPresent = true;
    this.nestEgg.visible = true;
    if (pop && !this.def.boss) this.setNestMut(rollMutation(this.g.state.weather === 'storm'));
    else if (this.mutLabel) this.mutLabel.sprite.visible = !!this.nestMut;
    this.popT = pop ? 0 : 1;
    if (!pop) this.nestEgg.scale.set(this.def.eggSize, this.def.eggSize * 1.3, this.def.eggSize);
  }
}

class Game {
  constructor() {
    const loaded = loadState();
    this.state = loaded || defaultState();
    this.isNewPlayer = !loaded;
    setSound(this.state.sound);
    this.time = 0;
    this.started = false;
    this.paused = false;
    this.resetArmed = false;
    this.flights = [];
    this.particles = [];
    this.shake = 0;
    this.saveT = 3;
    this.fullWarned = false;
    this.trainTick = 0;
    this.lastSignSpeed = -1;
    this.labelT = 0;

    // --- renderer / scene ---
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.75 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.sky = new THREE.Color('#9ad8ff');
    this.scene.background = this.sky;
    this.scene.fog = new THREE.Fog('#bfe6ff', 70, 210);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 280);
    this.cam = { yaw: 0, pitch: 0.38, dist: 11, target: new THREE.Vector3(SPAWN.x, 2.4, SPAWN.z), orbit: 0 };

    this.hemi = new THREE.HemisphereLight('#e3f4ff', '#6b8f4a', 1.4);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3dc', 2.3);
    this.sun.castShadow = true;
    const sm = isTouch ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    Object.assign(this.sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 140 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);

    // --- world ---
    this.world = buildWorld(this.scene);
    this.colliders = this.world.colliders;
    this.animals = this.world.pens.map(pen => new Animal(this, pen));
    this.floaters = new Floaters(this.scene);

    // --- player ---
    this.rig = createPlayer(this.state.skin);
    this.scene.add(this.rig.root);
    if (new URLSearchParams(location.search).get('admin') === ADMIN_CODE) this.state.admin = true;
    this.trail = new Trail(this.scene);
    this.trail.setStyle(TRAILS.find(t => t.id === this.state.trail));
    this.p = {
      pos: new THREE.Vector3(SPAWN.x, 0, SPAWN.z), vy: 0, grounded: true, facing: Math.PI,
      stun: 0, knock: new THREE.Vector3(), carrying: -1, carryMesh: null, carrySrc: null, carryMut: 0, phase: 0, moveAmt: 0,
      training: false, onPad: false,
    };

    // --- incubator slots ---
    this.ringGeo = new THREE.RingGeometry(1.0, 1.22, 28);
    this.ringMats = RARITIES.map(r => new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    this.slotVis = SLOT_POS.map((sp, i) => {
      const holder = new THREE.Group();
      holder.position.set(sp.x, 0.52, sp.z);
      this.scene.add(holder);
      const label = new Label({ w: 384, h: 240, worldH: 2.1 });
      label.sprite.visible = false;
      this.scene.add(label.sprite);
      return { i, holder, label, egg: null, rig: null, floatT: 1 + i * 0.27, pending: false, phase: i };
    });

    this.applyOffline();
    this.syncAllSlots();
    this.updateTreadmillLabel();
    this.updateSigns();
    this.recalcIncome();

    // --- input / UI ---
    this.input = new Input({
      canvas,
      joyZone: document.getElementById('joyZone'),
      joyBase: document.getElementById('joyBase'),
      joyKnob: document.getElementById('joyKnob'),
      jumpBtn: document.getElementById('btnJump'),
    });
    this.ui = new UI(this);
    this.events = new WorldEvents(this);
    this.bosses = new BossManager(this, Animal);

    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.resize();
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    addEventListener('pagehide', () => this.save());

    const play = document.getElementById('btnPlay');
    play.textContent = this.isNewPlayer ? 'Играть' : 'Продолжить';
    document.getElementById('loading').textContent = '';
    play.addEventListener('click', () => this.start());

    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------- lifecycle ----------
  start() {
    initAudio();
    document.getElementById('start').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.started = true;
    this.cam.yaw = 0;
    if (this.isNewPlayer) {
      this.ui.toast('Укради яйцо у курицы! Она в загоне у тропинки 🐔', 'gold', 4500);
    } else if (this.offlineMsg) {
      this.ui.toast(this.offlineMsg, 'good', 4500);
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 72 : 60;
    this.camera.updateProjectionMatrix();
  }

  applyOffline() {
    const s = this.state;
    const elapsed = clamp((Date.now() - (s.t || Date.now())) / 1000, 0, OFFLINE_CAP);
    if (elapsed < 30) return;
    let inc = 0;
    for (let i = 0; i < s.slots; i++) {
      const p = s.pets[i];
      if (!p) continue;
      if (p.r >= 0) inc += this.petIncome(p);
      else p.t = Math.max(0.5, p.t - elapsed);
    }
    const earned = inc * elapsed * 0.5;
    if (earned >= 1) {
      s.money += earned;
      this.offlineMsg = `Пока тебя не было, питомцы заработали $${fmt(earned)} 💰`;
    }
  }

  save() {
    try {
      this.state.t = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch { /* storage unavailable (private mode) */ }
  }

  onModal(name) {
    this.paused = name === 'pause' || name === 'admin';
    if (name !== 'pause') this.resetArmed = false;
  }

  // ---------- economy ----------
  petIncome(p) {
    return ANIMALS[p.a].income * RARITIES[p.r].mult * MUTATIONS[p.m || 0].mult * (p.b ? PET.bossMult : 1) * levelMult(p.lv);
  }
  sellPrice(p) { return this.petIncome(p) * UPG.sellMult; }
  speedCost(k) {
    let c = 0;
    for (let j = 0; j < k; j++) c += speedPrice(this.state.speed + j * UPG.speed.step);
    return c;
  }
  treadmillCost() { return UPG.treadmill.cost(this.state.tread); }
  slotCost() { return UPG.slots.cost(this.state.slots); }

  recalcIncome() {
    let inc = 0;
    for (let i = 0; i < this.state.slots; i++) {
      const p = this.state.pets[i];
      if (p && p.r >= 0) inc += this.petIncome(p);
    }
    this.income = inc;
  }

  action(act, arg) {
    const s = this.state, ui = this.ui;
    const pay = (cost) => {
      if (s.money < cost) { sfx.error(); return false; }
      s.money -= cost;
      sfx.buy();
      ui.bump('money');
      return true;
    };
    switch (act) {
      case 'speed': {
        const k = Number(arg) || 1;
        if (!pay(this.speedCost(k))) return;
        s.speedBuys += k;
        s.speed = Math.min(MAX_SPEED, s.speed + UPG.speed.step * k);
        ui.bump('speed');
        ui.toast(`👟 Скорость +${UPG.speed.step * k}!`, 'good', 1500);
        this.updateSigns();
        break;
      }
      case 'tread':
        if (s.tread >= UPG.treadmill.max || !pay(this.treadmillCost())) return;
        s.tread++;
        this.updateTreadmillLabel();
        ui.toast(`🏃 Беговая дорожка: уровень ${s.tread}!`, 'good', 1500);
        break;
      case 'slot':
        if (s.slots >= UPG.slots.max || !pay(this.slotCost())) return;
        s.slots++;
        this.syncAllSlots();
        this.fullWarned = false;
        ui.toast('🏠 Новый слот в инкубаторе!', 'good', 1500);
        break;
      case 'sell': {
        const i = Number(arg), p = s.pets[i];
        if (!p || p.r < 0) return;
        const price = this.sellPrice(p);
        s.money += price;
        s.pets[i] = null;
        this.syncSlot(i);
        this.recalcIncome();
        this.fullWarned = false;
        sfx.coin();
        ui.bump('money');
        ui.toast(`Продано за $${fmt(price)}`, '', 1500);
        break;
      }
      case 'discard': {
        const i = Number(arg), p = s.pets[i];
        if (!p || p.r >= 0) return;
        s.pets[i] = null;
        this.syncSlot(i);
        this.fullWarned = false;
        sfx.error();
        ui.toast(`🗑 Яйцо (${ANIMALS[p.a].name}) выброшено`, '', 1500);
        break;
      }
      case 'replace': {
        const i = this.weakestSlot();
        if (i < 0 || this.p.carrying < 0) return;
        const p = s.pets[i];
        if (p.r >= 0) this.action('sell', i);
        else this.action('discard', i);
        return;
      }
      case 'trail': {
        const k = TRAILS.find(x => x.id === arg);
        if (!k) return;
        if (!s.trails[k.id]) {
          if (!pay(k.price)) return;
          s.trails[k.id] = true;
          ui.toast(`✨ Новый след: ${k.name}!`, 'gold', 2000);
        }
        s.trail = k.id;
        this.trail.setStyle(k);
        break;
      }
      case 'resume': ui.close(); return;
      case 'sound':
        s.sound = !s.sound;
        setSound(s.sound);
        break;
      case 'home':
        if (this.p.carrying >= 0) this.dropEgg();
        this.p.pos.set(SPAWN.x, 0, SPAWN.z);
        this.p.knock.set(0, 0, 0);
        ui.close();
        return;
      case 'skin': {
        const k = SKINS.find(x => x.id === arg);
        if (!k) return;
        if (!s.skins[k.id]) {
          if (!pay(k.price)) return;
          s.skins[k.id] = true;
          ui.toast(`👕 Новый скин: ${k.name}!`, 'gold', 2000);
        }
        this.setSkin(k.id);
        break;
      }
      case 'adm-login':
        if (String(arg).trim() !== ADMIN_CODE) { sfx.error(); ui.toast('Неверный код', 'bad', 1500); return; }
        s.admin = true;
        sfx.buy();
        break;
      case 'adm-logout': s.admin = false; break;
      case 'adm-money': {
        if (!s.admin) return;
        const v = parseFloat(arg);
        if (Number.isFinite(v)) s.money = Math.max(0, v);
        ui.bump('money');
        break;
      }
      case 'adm-money-add':
        if (!s.admin) return;
        s.money += Number(arg) || 0;
        ui.bump('money');
        break;
      case 'adm-speed': {
        if (!s.admin) return;
        const v = parseFloat(arg);
        if (Number.isFinite(v)) s.speed = clamp(v, 1, MAX_SPEED);
        ui.bump('speed');
        this.updateSigns();
        break;
      }
      case 'adm-tread':
        if (!s.admin) return;
        s.tread = clamp(s.tread + Number(arg), 1, UPG.treadmill.max);
        this.updateTreadmillLabel();
        break;
      case 'adm-slots':
        if (!s.admin) return;
        s.slots = clamp(s.slots + Number(arg), 1, UPG.slots.max);
        this.syncAllSlots();
        this.recalcIncome();
        break;
      case 'adm-god': if (s.admin) s.god = !s.god; break;
      case 'adm-leg': if (s.admin) s.forceLeg = !s.forceLeg; break;
      case 'adm-hatch':
        if (!s.admin) return;
        for (let i = 0; i < s.slots; i++) if (s.pets[i] && s.pets[i].r < 0) s.pets[i].t = 0.05;
        ui.close();
        return;
      case 'adm-time': if (s.admin) this.events.skipPhase(); ui.close(); return;
      case 'adm-weather': {
        if (!s.admin) return;
        const order = ['clear', 'rain', 'storm'];
        this.events.setWeather(order[(order.indexOf(s.weather) + 1) % order.length]);
        break;
      }
      case 'adm-fox':
        if (!s.admin) return;
        if (!this.events.spawnFox()) ui.toast('Лисе нечего красть: инкубатор пуст', '', 2000);
        ui.close();
        return;
      case 'adm-cult': if (s.admin) this.events.spawnCultists(true); ui.close(); return;
      case 'adm-boss':
        if (!s.admin) return;
        if (!this.bosses.spawn()) ui.toast('Босс уже на карте', '', 2000);
        ui.close();
        return;
      case 'merge':
        if (!this.merge(arg)) return;
        break;
      case 'adm-skins':
        if (!s.admin) return;
        for (const k of SKINS) s.skins[k.id] = true;
        for (const k of TRAILS) s.trails[k.id] = true;
        break;
      case 'reset':
        if (!this.resetArmed) { this.resetArmed = true; break; }
        try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
        this.save = () => {};
        location.reload();
        return;
    }
    this.save();
  }

  setSkin(id) {
    const old = this.rig;
    this.rig = createPlayer(id);
    this.state.skin = id;
    this.scene.remove(old.root);
    this.scene.add(this.rig.root);
    this.rig.root.position.copy(this.p.pos);
    this.rig.root.rotation.y = this.p.facing;
    if (this.p.carryMesh) {
      this.rig.root.add(this.p.carryMesh);
      this.p.carryMesh.position.y = this.rig.carryY + this.p.carryMesh.userData.halfH;
    }
  }

  // Shop pictures of the skins, rendered on first use.
  skinThumbs() {
    if (!this.thumbs) this.thumbs = renderSkinThumbs(this.renderer, SKINS.map(k => k.id));
    return this.thumbs;
  }

  // ---------- slots ----------
  // The slot whose content earns the least (an egg counts as a common pet of its kind).
  slotValue(p) { return p.r >= 0 ? this.petIncome(p) : ANIMALS[p.a].income * MUTATIONS[p.m || 0].mult * (p.b ? PET.bossMult : 1); }

  weakestSlot() {
    let best = -1, bestV = Infinity;
    for (let i = 0; i < this.state.slots; i++) {
      const p = this.state.pets[i];
      if (!p || this.slotVis[i].pending) continue;
      const v = this.slotValue(p);
      if (v < bestV) { bestV = v; best = i; }
    }
    return best;
  }

  findFreeSlot() {
    for (let i = 0; i < this.state.slots; i++) if (!this.state.pets[i]) return i;
    return -1;
  }

  syncAllSlots() {
    for (let i = 0; i < SLOT_POS.length; i++) {
      this.world.slots[i].setUnlocked(i < this.state.slots);
      this.syncSlot(i);
    }
  }

  syncSlot(i) {
    const v = this.slotVis[i], p = this.state.pets[i];
    v.holder.clear();
    v.egg = null;
    v.rig = null;
    v.label.key = '';
    if (!p || v.pending || i >= this.state.slots) { v.label.sprite.visible = false; return; }
    const def = ANIMALS[p.a];
    let top;
    if (p.r < 0) {
      v.egg = createEgg(def, p.m);
      if (p.b) v.egg.scale.multiplyScalar(1.3);
      v.egg.userData.halfH *= p.b ? 1.3 : 1;
      v.egg.position.y = v.egg.userData.halfH;
      v.holder.add(v.egg);
      top = v.egg.userData.halfH * 2;
    } else {
      v.rig = createAnimal(def.id);
      tintRig(v.rig.root, p.m);
      if (p.b) addCrown(v.rig.root, v.rig.height + 0.2);
      const sc = def.scale * 0.42 * (p.b ? 1.3 : 1);
      v.rig.root.scale.setScalar(sc);
      v.rig.root.rotation.y = Math.random() * Math.PI * 2;
      v.holder.add(v.rig.root);
      const ring = new THREE.Mesh(this.ringGeo, this.ringMats[p.r]);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;
      v.holder.add(ring);
      top = v.rig.height * sc;
    }
    v.label.sprite.position.set(SLOT_POS[i].x, 0.52 + top + 1.6, SLOT_POS[i].z);
    v.label.sprite.visible = true;
    this.updateSlotLabel(i);
  }

  updateSlotLabel(i) {
    const v = this.slotVis[i], p = this.state.pets[i];
    if (!p || v.pending) return;
    const def = ANIMALS[p.a];
    const mu = MUTATIONS[p.m || 0];
    const name = { t: `${p.b ? '👑 ' : ''}${def.name}`, c: p.b ? '#ffe57f' : '#ffffff', s: 44 };
    const mut = p.m ? [{ t: `${mu.name} ×${mu.mult}`, c: mu.color, s: 32 }] : [];
    if (p.r < 0) {
      v.label.set([name, ...mut, { t: `Вылупится: ${Math.ceil(p.t)} с`, c: '#ffe57f', s: 34 }]);
    } else {
      const r = RARITIES[p.r];
      v.label.set([name, { t: `${r.name} · ур. ${p.lv || 1}`, c: r.color, s: 32 }, ...mut, { t: `$${fmt(this.petIncome(p))}/с`, c: '#b9f6ca', s: 38 }]);
    }
  }

  hatch(i) {
    const s = this.state, p = s.pets[i], def = ANIMALS[p.a];
    // boss eggs hatch at least epic; mythic only comes from merging
    const minR = p.b ? 2 : 0;
    const pool = RARITIES.map((x, i) => (i >= minR && x.chance > 0 ? x.chance : 0));
    let roll = Math.random() * pool.reduce((a, b) => a + b, 0), r = minR;
    if (s.forceLeg) r = LEGENDARY;
    else for (r = 0; r < LEGENDARY; r++) {
      if (roll < pool[r]) break;
      roll -= pool[r];
    }
    p.r = r;
    p.t = 0;
    p.lv = 1;
    p.xp = 0;
    const key = `${def.id}:${r}`;
    const isNew = !s.col[key];
    s.col[key] = true;
    this.syncSlot(i);
    this.recalcIncome();
    const rr = RARITIES[r];
    const pos = new THREE.Vector3(SLOT_POS[i].x, 1.2, SLOT_POS[i].z);
    this.burst(pos, def.egg, 12);
    this.burst(pos, rr.color, r > 0 ? 18 : 8);
    if (r >= 2) sfx.legendary(); else sfx.hatch();
    const mu = p.m ? ` · ${MUTATIONS[p.m].name}` : '';
    this.ui.toast(`🐣 ${p.b ? '👑 ' : ''}${def.emoji} ${def.name} — ${rr.name}${mu}! +$${fmt(this.petIncome(p))}/с${isNew ? ' · новый!' : ''}`, r >= 2 || p.m ? 'gold' : 'good', 3000);
    this.save();
  }

  allAnimals() {
    const b = this.bosses && this.bosses.animal;
    return b ? [...this.animals, b] : this.animals;
  }

  // Storms bring storm eggs into the nests; when the storm ends they go back to normal.
  onWeather(id) {
    for (const a of this.animals) {
      if (!a.eggPresent) continue;
      if (id === 'storm' && Math.random() < MUTATIONS[3].stormChance) a.setNestMut(3);
      else if (id !== 'storm' && a.nestMut === 3) a.setNestMut(0);
    }
  }

  merge(key) {
    const s = this.state;
    const [a, r] = key.split(':').map(Number);
    const idx = [];
    for (let i = 0; i < s.slots; i++) {
      const p = s.pets[i];
      if (p && p.a === a && p.r === r && !this.slotVis[i].pending) idx.push(i);
    }
    if (idx.length < PET.merge || r >= RARITIES.length - 1) return false;
    const use = idx.slice(0, PET.merge), parts = use.map(i => s.pets[i]);
    const best = parts.reduce((m, q) => (MUTATIONS[q.m || 0].mult > MUTATIONS[m].mult ? q.m || 0 : m), 0);
    const pet = { a, r: r + 1, t: 0, m: best, b: parts.some(q => q.b) ? 1 : 0, lv: Math.max(...parts.map(q => q.lv || 1)), xp: 0 };
    for (const i of use) s.pets[i] = null;
    s.pets[use[0]] = pet;
    s.col[`${ANIMALS[a].id}:${r + 1}`] = true;
    for (const i of use) this.syncSlot(i);
    this.recalcIncome();
    const pos = new THREE.Vector3(SLOT_POS[use[0]].x, 1.2, SLOT_POS[use[0]].z);
    this.burst(pos, RARITIES[r + 1].color, 24);
    sfx.legendary();
    this.ui.toast(`🔀 Слияние! ${ANIMALS[a].emoji} ${ANIMALS[a].name} — ${RARITIES[r + 1].name}! +$${fmt(this.petIncome(pet))}/с`, 'gold', 3500);
    return true;
  }

  // ---------- stealing ----------
  inBase(pos) { return pos.z > BASE_EDGE + 0.3; }

  steal(animal) {
    const p = this.p, def = animal.def;
    animal.eggPresent = false;
    animal.nestEgg.visible = false;
    if (animal.mutLabel) animal.mutLabel.sprite.visible = false;
    const egg = createEgg(def, animal.nestMut);
    egg.position.set(0, this.rig.carryY + egg.userData.halfH, 0.25);
    this.rig.root.add(egg);
    p.carryMesh = egg;
    p.carrying = animal.idx;
    p.carrySrc = animal;
    p.carryMut = animal.nestMut;
    animal.alert();
    sfx.pickup();
    if (this.state.steals < 2) this.ui.toast('Беги на базу! Не дай себя поймать 🏃', 'gold');
  }

  detachCarry() {
    const p = this.p, mesh = p.carryMesh;
    const from = new THREE.Vector3();
    mesh.getWorldPosition(from);
    this.rig.root.remove(mesh);
    mesh.position.copy(from);
    mesh.rotation.set(0, 0, 0);
    this.scene.add(mesh);
    p.carryMesh = null;
    p.carrying = -1;
    p.carrySrc = null;
    return { mesh, from };
  }

  placeEgg() {
    const i = this.findFreeSlot();
    if (i < 0) {
      if (!this.fullWarned) {
        this.ui.toast('База заполнена! Нажми «♻️ Заменить», продай питомца (🐣) или купи слот (🛒)', 'bad', 3500);
        sfx.error();
        this.fullWarned = true;
      }
      return;
    }
    const a = this.p.carrying, def = ANIMALS[a], src = this.p.carrySrc, boss = !!src.isBoss;
    const m = this.p.carryMut;
    const { mesh, from } = this.detachCarry();
    this.state.pets[i] = { a, r: -1, t: def.hatch * (boss ? 1.5 : 1), m, b: boss ? 1 : 0, lv: 1, xp: 0 };
    this.state.steals++;
    const v = this.slotVis[i];
    v.pending = true;
    const to = new THREE.Vector3(SLOT_POS[i].x, 0.52 + mesh.userData.halfH, SLOT_POS[i].z);
    this.flights.push({
      mesh, from, to, t: 0, dur: 0.7, h: 4,
      done: () => { this.scene.remove(mesh); v.pending = false; this.syncSlot(i); sfx.place(); },
    });
    if (boss) this.bosses.defeated();
    else src.respawnT = 3;
    sfx.safe();
    if (!boss) this.ui.toast(`🥚 Яйцо: ${def.name}${m ? ` (${MUTATIONS[m].name})` : ''} — в инкубаторе!`, m ? 'gold' : 'good');
    this.save();
  }

  // Egg goes back to the nest (caught or teleported home).
  dropEgg() {
    const animal = this.p.carrySrc;
    const { mesh, from } = this.detachCarry();
    this.flights.push({
      mesh, from, to: animal.nestEgg.position.clone(), t: 0, dur: 0.8, h: 5,
      done: () => { this.scene.remove(mesh); animal.restoreEgg(false); },
    });
    animal.state = 'return';
  }

  caught(animal) {
    const p = this.p, def = animal.def;
    this.dropEgg();
    const dx = p.pos.x - animal.pos.x, dz = p.pos.z - animal.pos.z, d = Math.hypot(dx, dz) || 1;
    p.knock.set((dx / d) * 14, 0, (dz / d) * 14);
    p.vy = 7;
    p.grounded = false;
    p.stun = 1.0;
    this.shake = 0.5;
    sfx.caught();
    this.ui.toast(`😵 Тебя поймали! ${def.emoji} ${def.name}: скорость ${def.speed}, у тебя ${Math.floor(this.state.speed)}`, 'bad', 3200);
  }

  // ---------- effects ----------
  burst(pos, color, n) {
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(boxGeo(0.22, 0.22, 0.22), mat(color));
      m.position.copy(pos);
      this.scene.add(m);
      this.particles.push({ m, v: new THREE.Vector3(rand(-4, 4), rand(4, 9), rand(-4, 4)), life: rand(0.7, 1.2) });
    }
  }

  updateEffects(dt) {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      f.t += dt / f.dur;
      const t = Math.min(1, f.t);
      f.mesh.position.lerpVectors(f.from, f.to, t);
      f.mesh.position.y += Math.sin(t * Math.PI) * f.h;
      f.mesh.rotation.z = t * Math.PI * 2;
      if (f.t >= 1) { f.done(); this.flights.splice(i, 1); }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.v.y -= 20 * dt;
      pt.m.position.addScaledVector(pt.v, dt);
      if (pt.m.position.y < 0.1) { pt.m.position.y = 0.1; pt.v.y *= -0.4; pt.v.x *= 0.7; pt.v.z *= 0.7; }
      pt.m.rotation.x += dt * 5;
      pt.life -= dt;
      pt.m.scale.setScalar(clamp(pt.life * 2, 0, 1));
      if (pt.life <= 0) { this.scene.remove(pt.m); this.particles.splice(i, 1); }
    }
    this.floaters.update(dt);
  }

  // ---------- labels ----------
  updateSigns() {
    const sp = Math.floor(this.state.speed);
    if (sp === this.lastSignSpeed) return;
    this.lastSignSpeed = sp;
    for (const pen of this.world.pens) {
      const def = pen.def, ok = sp >= def.speed;
      pen.sign.set([
        { t: def.name, c: '#ffffff', s: 60 },
        { t: `Скорость ${def.speed}`, c: ok ? '#69f0ae' : '#ff5252', s: 46 },
        { t: `Питомец: $${fmt(def.income)}/с`, c: '#ffd740', s: 38 },
      ]);
    }
  }

  updateTreadmillLabel() {
    const l = this.state.tread;
    this.world.treadmill.label.set([
      { t: 'БЕГОВАЯ ДОРОЖКА', c: '#80d8ff', s: 50 },
      { t: `Ур. ${l} · +${UPG.treadmill.gain(l).toFixed(2)} скорости/с`, c: '#ffffff', s: 38 },
      { t: 'встань и стой', c: '#cfd8dc', s: 30 },
    ]);
  }

  // ---------- per-frame ----------
  updatePlayer(dt) {
    const p = this.p, s = this.state, cam = this.cam, rig = this.rig;
    const mv = this.input.getMove();
    const look = this.input.consumeLook();
    cam.yaw -= look.dx * 0.006;
    cam.pitch = clamp(cam.pitch + look.dy * 0.004, 0.06, 1.25);
    cam.dist = clamp(cam.dist + look.zoom, 5, 26);

    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    const dx = cy * mv.x - sy * mv.y, dz = -sy * mv.x - cy * mv.y;
    p.stun -= dt;
    const moving = Math.hypot(dx, dz) > 0.05 && p.stun <= 0;
    const speed = worldSpeed(s.speed);
    let vx = 0, vz = 0;
    if (moving) {
      vx = dx * speed;
      vz = dz * speed;
      p.facing = lerpAngle(p.facing, Math.atan2(dx, dz), 1 - Math.exp(-dt * 14));
    }
    p.knock.multiplyScalar(Math.exp(-dt * 4));
    vx += p.knock.x;
    vz += p.knock.z;

    // treadmill
    const T = TREADMILL;
    const onT = Math.abs(p.pos.x - T.x) < T.halfW + 0.3 && Math.abs(p.pos.z - T.z) < T.halfL;
    const ground = onT ? 0.3 : 0;
    if (this.input.consumeJump() && p.grounded && p.stun <= 0) {
      p.vy = 10.5;
      p.grounded = false;
      sfx.jump();
    }
    p.vy -= 28 * dt;
    p.pos.y += p.vy * dt;
    if (p.pos.y <= ground) { p.pos.y = ground; p.vy = 0; p.grounded = true; }

    const dist = Math.hypot(vx, vz) * dt;
    const n = Math.max(1, Math.ceil(dist / 0.3));
    for (let i = 0; i < n; i++) {
      p.pos.x += (vx * dt) / n;
      p.pos.z += (vz * dt) / n;
      resolveCollisions(p.pos, 0.55, this.colliders);
    }
    p.pos.x = clamp(p.pos.x, WORLD.minX, WORLD.maxX);
    p.pos.z = clamp(p.pos.z, WORLD.minZ, WORLD.maxZ);

    p.training = onT && !moving && p.grounded && p.stun <= 0;
    if (p.training) {
      const k = Math.min(1, dt * 8);
      p.pos.x += (T.x - p.pos.x) * k;
      p.pos.z += (T.z + 0.4 - p.pos.z) * k;
      p.facing = lerpAngle(p.facing, Math.PI, k);
      const gain = UPG.treadmill.gain(s.tread);
      s.speed = Math.min(MAX_SPEED, s.speed + gain * dt);
      this.world.treadmill.beltTex.offset.y -= dt * 2.5;
      this.trainTick += dt;
      if (this.trainTick >= 2) {
        this.trainTick = 0;
        this.floaters.spawn(`+${(gain * 2).toFixed(2)} 👟`, '#80d8ff', new THREE.Vector3(p.pos.x, 3.6, p.pos.z), 56);
        this.updateSigns();
      }
    } else {
      this.trainTick = 0;
    }

    // interactions
    if (p.carrying < 0 && p.stun <= 0 && p.pos.y < 2) {
      for (const a of this.allAnimals()) {
        if (!a.eggPresent) continue;
        const r = 1.7 + a.def.eggSize;
        const ex = p.pos.x - a.pen.nestPos.x, ez = p.pos.z - a.pen.nestPos.z;
        if (ex * ex + ez * ez < r * r) { this.steal(a); break; }
      }
    }
    if (p.carrying >= 0 && p.pos.z > BASE_EDGE + 0.6) this.placeEgg();
    if (p.carrying < 0) this.fullWarned = false;

    const onPad = Math.hypot(p.pos.x - SHOP_PAD.x, p.pos.z - SHOP_PAD.z) < SHOP_PAD.r;
    if (onPad && !p.onPad && this.ui.modal !== 'shop') this.ui.open('shop');
    p.onPad = onPad;

    // animation
    const target = p.training || moving ? 1 : 0;
    p.moveAmt += (target - p.moveAmt) * Math.min(1, dt * 10);
    const cadence = p.training ? 14 : Math.min(8 + speed * 0.3, 24);
    p.phase += dt * cadence;
    const swing = 0.95 * p.moveAmt;
    rig.legs.forEach((l) => {
      l.rotation.x = p.grounded ? Math.sin(p.phase + l.userData.phase) * swing : (l.userData.phase ? 0.6 : -0.5);
    });
    rig.arms.forEach((a, i) => {
      if (p.carrying >= 0) {
        a.rotation.x += (-2.95 - a.rotation.x) * Math.min(1, dt * 14);
        a.rotation.z = -a.userData.side * 0.12;
      } else {
        const want = p.grounded ? -Math.sin(p.phase + (i ? Math.PI : 0)) * swing : -2.4;
        a.rotation.x += (want - a.rotation.x) * Math.min(1, dt * 16);
        a.rotation.z = 0;
      }
    });
    for (const f of rig.flaps) f.rotation.z = f.userData.side * Math.sin(p.phase * 0.8) * (0.12 + 0.3 * p.moveAmt);
    for (const pr of rig.spin) pr.rotation.z += dt * (8 + 30 * p.moveAmt);
    if (rig.tail) rig.tail.rotation.y = Math.sin(p.phase) * 0.35 * p.moveAmt;
    rig.body.position.y = Math.abs(Math.sin(p.phase)) * 0.14 * p.moveAmt;
    rig.root.position.copy(p.pos);
    rig.root.rotation.y = p.facing;
    if (p.carryMesh) p.carryMesh.rotation.z = Math.sin(p.phase) * 0.12 * p.moveAmt;
    this.trail.update(this.time, tmpHead.set(p.pos.x, p.pos.y + 1.0 + rig.body.position.y, p.pos.z), this.camera.position);
  }

  updateSlots(dt) {
    const s = this.state;
    this.labelT -= dt;
    const refresh = this.labelT <= 0;
    if (refresh) this.labelT = 0.25;
    for (let i = 0; i < s.slots; i++) {
      const p = s.pets[i];
      if (!p) continue;
      const v = this.slotVis[i];
      if (p.r < 0) {
        p.t -= dt;
        if (v.egg) {
          const def = ANIMALS[p.a];
          const k = 1 - clamp(p.t / def.hatch, 0, 1);
          v.egg.rotation.z = Math.sin(this.time * (4 + k * 16)) * (0.05 + k * 0.22);
        }
        if (p.t <= 0 && !v.pending) this.hatch(i);
        else if (refresh) this.updateSlotLabel(i);
      } else if (v.rig) {
        if ((p.lv || 1) < PET.maxLevel) {
          p.xp = (p.xp || 0) + dt;
          if (p.xp >= PET.xpPerLevel * (p.lv || 1)) {
            p.lv = (p.lv || 1) + 1;
            p.xp = 0;
            this.recalcIncome();
            this.updateSlotLabel(i);
            this.floaters.spawn(`Ур. ${p.lv}!`, '#ffd740', v.label.sprite.position.clone().setY(v.label.sprite.position.y + 0.4), 70);
          }
        }
        v.phase += dt;
        v.rig.root.rotation.y += dt * 0.5;
        v.rig.root.position.y = Math.abs(Math.sin(v.phase * 2.2)) * 0.25;
        animateRig(v.rig, v.phase * 6, 0.35);
        v.floatT -= dt;
        if (v.floatT <= 0) {
          v.floatT = 3;
          this.floaters.spawn(`+$${fmt(this.petIncome(p) * 3)}`, '#69f0ae', v.label.sprite.position.clone().setY(v.label.sprite.position.y - 0.6));
        }
      }
    }
    s.money += this.income * dt;
  }

  updateCamera(dt) {
    const cam = this.cam, p = this.p;
    const k = 1 - Math.exp(-dt * 12);
    cam.target.x += (p.pos.x - cam.target.x) * k;
    cam.target.y += (p.pos.y + 2.4 - cam.target.y) * k;
    cam.target.z += (p.pos.z - cam.target.z) * k;
    const cp = Math.cos(cam.pitch);
    const c = this.camera.position;
    c.set(
      cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
      cam.target.y + Math.sin(cam.pitch) * cam.dist,
      cam.target.z + Math.cos(cam.yaw) * cp * cam.dist,
    );
    if (c.y < 0.6) c.y = 0.6;
    if (this.shake > 0) {
      this.shake -= dt;
      c.x += rand(-1, 1) * this.shake * 0.6;
      c.y += rand(-1, 1) * this.shake * 0.6;
    }
    this.camera.lookAt(cam.target);
  }

  orbitCamera(dt) {
    const cam = this.cam;
    cam.orbit += dt * 0.08;
    const t = new THREE.Vector3(0, 2, -8);
    this.camera.position.set(Math.sin(cam.orbit) * 34, 16, -8 + Math.cos(cam.orbit) * 34);
    this.camera.lookAt(t);
  }

  updateEnvironment(dt) {
    const w = this.world.animated, t = this.time;
    w.barrierTex.offset.x -= dt * 0.3;
    if (w.blades) w.blades.rotation.z += dt * 0.6;
    for (const m of w.lava) m.color.setHSL(0.06 + Math.sin(t * 2) * 0.015, 1, 0.5 + Math.sin(t * 3) * 0.06);
    w.clouds.position.x = Math.sin(t * 0.02) * 20;
    this.world.pad.material.opacity = 0.45 + Math.sin(t * 4) * 0.2;
    this.world.treadmill.screen.material.color.setHSL(0.52, 1, this.p.training ? 0.5 + Math.sin(t * 10) * 0.15 : 0.35);

    // sky and fog follow the zone the camera is in
    const zone = zoneAt(this.camera.position.z);
    const k = Math.min(1, dt * 1.5);
    // in the celestial realm the sky blends from heaven (left) to hell (right)
    const hell = zone.hellSky ? clamp((this.cam.target.x + 6) / 12, 0, 1) : 0;
    // ...then darkened by clouds and by the night
    const env = this.events.updateVisuals();
    tmpColor.set(zone.sky).lerp(tmpColor2.set(zone.hellSky || zone.sky), hell).lerp(STORM_SKY, env.cloud * 0.55).lerp(NIGHT_SKY, env.night * 0.88);
    this.sky.lerp(tmpColor, k);
    tmpColor.set(zone.fog).lerp(tmpColor2.set(zone.hellFog || zone.fog), hell).lerp(STORM_SKY, env.cloud * 0.5).lerp(NIGHT_FOG, env.night * 0.85);
    this.scene.fog.color.lerp(tmpColor, k);
    if (env.flash > 0) { this.sky.lerp(WHITE, env.flash * 0.6); this.scene.fog.color.lerp(WHITE, env.flash * 0.4); }
    this.sun.intensity = 2.3 * (1 - 0.8 * env.night) * (1 - 0.4 * env.cloud) + env.flash * 3;
    this.hemi.intensity = 1.4 * (1 - 0.55 * env.night) * (1 - 0.25 * env.cloud) + env.flash * 2;
    this.sun.color.copy(SUN_DAY).lerp(SUN_NIGHT, env.night);
    if (w.likes) for (const h of w.likes.children) { h.rotation.y += dt * 1.2; h.position.y = h.userData.y + Math.sin(t * 1.5 + h.userData.phase) * 0.8; }
    if (w.fires) for (const fl of w.fires) fl.scale.set(1, 0.7 + Math.abs(Math.sin(t * 7 + fl.userData.phase)) * 0.6, 1);
    const near = zone.id === 'volcano' ? 40 : 70, far = zone.id === 'volcano' ? 170 : 220;
    this.scene.fog.near += (near - this.scene.fog.near) * k;
    this.scene.fog.far += (far - this.scene.fog.far) * k;

    // the sun's shadow box follows whatever the camera looks at
    const f = this.started ? this.p.pos : tmpFocus;
    const sx = Math.round(f.x), sz = Math.round(f.z);
    this.sun.position.set(sx + 24, 46, sz + 16);
    this.sun.target.position.set(sx, 0, sz);
  }

  hud() {
    const p = this.p;
    let hint = '', danger = false, vignette = 0;
    let nearest = Infinity;
    for (const a of this.allAnimals()) {
      if (a.state === 'chase' || a.state === 'alert') nearest = Math.min(nearest, Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z));
    }
    if (nearest < Infinity) vignette = clamp(1 - (nearest - 2) / 20, 0.2, 0.85);
    this.rig.setScared(nearest < Infinity || p.stun > 0);
    if (p.carrying >= 0) {
      hint = `🏃 Беги на базу! Осталось ${Math.max(0, Math.ceil(BASE_EDGE - p.pos.z))} м`;
      danger = nearest < Infinity;
      if (this.inBase(p.pos)) { hint = 'База заполнена — замени слабое яйцо или купи слот'; danger = false; }
    } else if (p.stun > 0) {
      hint = '😵 Ой!';
    } else if (p.training) {
      hint = '🏃 Тренировка… стой на дорожке';
    } else if (this.state.steals === 0) {
      hint = this.inBase(p.pos) ? '⬆ Иди по тропинке к курице и укради её яйцо' : '🥚 Подойди к гнезду и забери яйцо';
    }
    const ev = this.events.hudInfo();
    if (ev.hint) { hint = ev.hint; danger = ev.danger; }
    let replace = '';
    if (p.carrying >= 0 && this.inBase(p.pos) && this.findFreeSlot() < 0) {
      const w = this.weakestSlot();
      if (w >= 0) {
        const q = this.state.pets[w], a = ANIMALS[q.a];
        replace = q.r >= 0 ? `♻️ Заменить: ${a.emoji} ${a.name} (продать $${fmt(this.sellPrice(q))})` : `♻️ Заменить: яйцо ${a.emoji} ${a.name}`;
      }
    }
    return {
      hint, danger, vignette, income: this.income, replace, clock: ev,
      training: p.training ? UPG.treadmill.gain(this.state.tread) : 0,
    };
  }

  frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    if (this.started && !this.paused) {
      this.updatePlayer(dt);
      this.events.update(dt);
      this.bosses.update(dt);
      for (const a of this.animals) a.update(dt);
      this.updateSlots(dt);
      this.updateEffects(dt);
      this.updateCamera(dt);
      this.ui.update(dt, this.hud());
      this.saveT -= dt;
      if (this.saveT <= 0) { this.saveT = 5; this.save(); }
    } else if (this.started) {
      this.ui.update(0, this.hud());
    } else {
      for (const a of this.animals) a.update(dt);
      this.orbitCamera(dt);
    }
    this.updateEnvironment(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

const tmpColor = new THREE.Color();
const NIGHT_SKY = new THREE.Color('#0b1233');
const NIGHT_FOG = new THREE.Color('#0a0f26');
const STORM_SKY = new THREE.Color('#5d6670');
const WHITE = new THREE.Color('#ffffff');
const SUN_DAY = new THREE.Color('#fff3dc');
const SUN_NIGHT = new THREE.Color('#8fa6ff');
const tmpColor2 = new THREE.Color();
const tmpHead = new THREE.Vector3();
const tmpFocus = new THREE.Vector3(0, 0, -8);

async function boot() {
  try {
    await Promise.race([document.fonts.load('800 40px Rubik'), new Promise(r => setTimeout(r, 2500))]);
  } catch { /* fonts are optional */ }
  window.game = new Game();
}

boot();
