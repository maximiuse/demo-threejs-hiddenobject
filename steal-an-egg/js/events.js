// World events: day/night, weather and lightning, the night fox, cultist raids and boulders.
import * as THREE from 'three';
import { ANIMALS, BASE_EDGE, SPAWN, SLOT_POS, START_SPEED, worldSpeed } from './config.js';
import { createAnimal, animateRig, createEgg, boxGeo, Label } from './models.js';
import { sfx } from './audio.js';
import { fmt } from './ui.js';

// Seconds of each part of the day.
export const DAY = { day: 180, dusk: 12, night: 50, dawn: 12 };
const CYCLE = DAY.day + DAY.dusk + DAY.night + DAY.dawn;

const WEATHER = {
  clear: { name: 'ясно', ico: '', cloud: 0, rain: 0, min: 70, max: 140 },
  rain: { name: 'дождь', ico: '🌧', cloud: 0.7, rain: 0.6, min: 40, max: 80 },
  storm: { name: 'гроза', ico: '⛈', cloud: 1, rain: 1, min: 35, max: 60 },
};

const NIGHT_OUT_LIMIT = 2.5;    // seconds you can stay outside the base at night
const AIM_CHANCE = 0.35;        // share of storm strikes aimed at the player: these follow you and always hit
const FOX_EVERY = [100, 200];   // seconds between fox visits (day or night)
const AIM_COOLDOWN = 20;        // seconds after a hit before lightning aims at the player again
const RITUAL_TIME = 8;
const CULT_SHARE = 0.33;
const FOX_IN_SPEED = 6, FOX_OUT_SPEED = 6.5;
const CULT_SPEED = 4.5;

const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (t) => t * t * (3 - 2 * t);
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class WorldEvents {
  constructor(game) {
    this.g = game;
    const s = game.state;
    if (typeof s.clock !== 'number') s.clock = 15;
    if (!WEATHER[s.weather]) s.weather = 'clear';
    this.weatherT = rand(WEATHER[s.weather].min, WEATHER[s.weather].max);
    this.cloud = WEATHER[s.weather].cloud;
    this.rainAmt = WEATHER[s.weather].rain;
    this.flash = 0;
    this.nightOut = 0;
    this.wasNight = this.isNight;
    this.warned = false;
    this.strikeT = rand(3, 6);
    this.aimCooldown = 0;
    this.strikes = [];
    this.bolts = [];
    this.boulders = [];
    this.boulderT = rand(1.5, 3);
    this.fox = null;
    this.foxIn = rand(FOX_EVERY[0], FOX_EVERY[1]);
    this.cult = null;
    this.cultT = rand(150, 240);
    this.buildSky(game.scene);
    this.buildRain(game.scene);
    this.rockGeo = new THREE.DodecahedronGeometry(1, 0);
    this.rockMat = new THREE.MeshLambertMaterial({ color: '#8d8478', flatShading: true });
    this.ringGeo = new THREE.RingGeometry(0.3, 2.8, 28);
    this.flashEl = document.getElementById('flash');
  }

  // ---------- day / night ----------
  get night() {
    const c = this.g.state.clock;
    if (c < DAY.day) return 0;
    if (c < DAY.day + DAY.dusk) return smooth((c - DAY.day) / DAY.dusk);
    if (c < DAY.day + DAY.dusk + DAY.night) return 1;
    return 1 - smooth((c - DAY.day - DAY.dusk - DAY.night) / DAY.dawn);
  }

  get isNight() { return this.night > 0.5; }

  // Seconds until the next switch between day and night.
  get untilSwitch() {
    const c = this.g.state.clock;
    const nightStart = DAY.day + DAY.dusk / 2, nightEnd = DAY.day + DAY.dusk + DAY.night + DAY.dawn / 2;
    if (c < nightStart) return nightStart - c;
    if (c < nightEnd) return nightEnd - c;
    return CYCLE - c + nightStart;
  }

  skipPhase() {
    const s = this.g.state;
    s.clock = this.isNight ? DAY.day + DAY.dusk + DAY.night + DAY.dawn - 0.5 : DAY.day + DAY.dusk - 0.5;
  }

  onNight() {
    this.g.ui.toast('🌙 Наступила ночь! За базу выходить нельзя', 'gold', 3500);
    sfx.night();
  }

  onDay() {
    this.g.ui.toast('☀️ Утро! Можно снова воровать яйца', 'good', 3000);
    sfx.morning();
  }

  sendHome() {
    const g = this.g, p = g.p;
    if (p.carrying >= 0) g.dropEgg();
    p.pos.set(SPAWN.x, 0, SPAWN.z);
    p.knock.set(0, 0, 0);
    p.vy = 0;
    g.cam.target.set(SPAWN.x, 2.4, SPAWN.z);
    g.ui.toast('🌙 Ночью опасно — ты вернулся на базу', 'bad', 3000);
    sfx.poof();
  }

  // ---------- weather ----------
  setWeather(id) {
    const s = this.g.state;
    s.weather = id;
    this.weatherT = rand(WEATHER[id].min, WEATHER[id].max);
    this.g.onWeather(id);
    if (id === 'rain') this.g.ui.toast('🌧 Пошёл дождь', '', 2000);
    if (id === 'storm') this.g.ui.toast('⛈ Гроза! Молния может ударить в тебя где угодно, даже на базе, и отнять половину скорости', 'bad', 4000);
    this.strikeT = rand(3, 5);
  }

  nextWeather() {
    const s = this.g.state;
    if (s.weather !== 'clear') return 'clear';
    const r = Math.random();
    return r < 0.6 ? 'clear' : r < 0.85 ? 'rain' : 'storm';
  }

  buildSky(scene) {
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 0.9);
      pos[i * 3] = Math.sin(v) * Math.cos(u) * 200;
      pos[i * 3 + 1] = Math.cos(v) * 200;
      pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: '#f5f3ce', transparent: true, opacity: 0, fog: false }));
    scene.add(this.moon);
  }

  buildRain(scene) {
    const n = 1500;
    this.rainN = n;
    this.rainPos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) this.resetDrop(i, 0, 0, 0, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#b6ccff', transparent: true, opacity: 0.55 }));
    this.rain.frustumCulled = false;
    scene.add(this.rain);
  }

  resetDrop(i, cx, cy, cz, anyHeight) {
    const o = i * 6, x = cx + rand(-30, 30), z = cz + rand(-30, 30);
    const y = cy + (anyHeight ? rand(-5, 25) : rand(18, 26));
    this.rainPos[o] = x; this.rainPos[o + 1] = y; this.rainPos[o + 2] = z;
    this.rainPos[o + 3] = x + 0.15; this.rainPos[o + 4] = y + 1.2; this.rainPos[o + 5] = z;
  }

  updateRain(dt) {
    const cam = this.g.camera.position;
    const count = Math.floor(this.rainN * this.rainAmt);
    this.rain.visible = count > 0;
    if (!count) return;
    const P = this.rainPos, fall = 38 * dt;
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      P[o + 1] -= fall; P[o + 4] -= fall;
      P[o] -= fall * 0.12; P[o + 3] -= fall * 0.12;
      let dx = P[o] - cam.x, dz = P[o + 2] - cam.z;
      if (P[o + 1] < 0 || P[o + 1] < cam.y - 12) { this.resetDrop(i, cam.x, cam.y, cam.z, false); continue; }
      if (dx > 30) { P[o] -= 60; P[o + 3] -= 60; } else if (dx < -30) { P[o] += 60; P[o + 3] += 60; }
      if (dz > 30) { P[o + 2] -= 60; P[o + 5] -= 60; } else if (dz < -30) { P[o + 2] += 60; P[o + 5] += 60; }
    }
    this.rain.geometry.setDrawRange(0, count * 2);
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- lightning ----------
  scheduleStrike() {
    const g = this.g, p = g.p;
    const target = new THREE.Vector3();
    const follow = this.aimCooldown <= 0 && Math.random() < AIM_CHANCE;
    if (follow) target.set(p.pos.x, 0, p.pos.z);
    else target.set(p.pos.x + rand(-25, 25), 0, p.pos.z + rand(-25, 25));
    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: '#ffea00', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(target.x, 0.08, target.z);
    g.scene.add(ring);
    this.strikes.push({ target, ring, t: 1.3, follow });
  }

  strike(st) {
    const g = this.g, p = g.p, s = g.state;
    g.scene.remove(st.ring);
    st.ring.material.dispose();
    // jagged bolt from the clouds
    const bolt = new THREE.Group();
    const boltMat = new THREE.MeshBasicMaterial({ color: '#e8f6ff' });
    let a = new THREE.Vector3(st.target.x + rand(-6, 6), 60, st.target.z + rand(-6, 6));
    for (let i = 1; i <= 9; i++) {
      const b = new THREE.Vector3().lerpVectors(a, st.target, 1 / (10 - i));
      if (i < 9) { b.x += rand(-2.5, 2.5); b.z += rand(-2.5, 2.5); }
      const len = a.distanceTo(b);
      const seg = new THREE.Mesh(boxGeo(0.6, 0.6, 1), boltMat);
      seg.scale.z = len;
      seg.position.lerpVectors(a, b, 0.5);
      seg.lookAt(b);
      bolt.add(seg);
      a = b;
    }
    g.scene.add(bolt);
    this.bolts.push({ bolt, t: 0.25 });
    this.flash = 1;
    sfx.thunder();
    g.burst(st.target.clone().setY(0.5), '#ffeb3b', 14);
    if (s.god || (!st.follow && (flat(p.pos, st.target) > 2.8 || p.pos.y > 3))) return;
    this.aimCooldown = AIM_COOLDOWN;
    const before = s.speed;
    s.speed = Math.max(START_SPEED, s.speed * 0.5);
    if (p.carrying >= 0) g.dropEgg();
    p.stun = 1.2;
    p.vy = 8;
    p.grounded = false;
    g.shake = 0.7;
    g.updateSigns();
    g.ui.bump('speed');
    g.ui.toast(`⚡ В тебя попала молния! Скорость ${Math.floor(before)} → ${Math.floor(s.speed)}`, 'bad', 3500);
    g.save();
  }

  // ---------- boulders ----------
  spawnBoulder() {
    const g = this.g, p = g.p;
    const tArr = rand(1.0, 2.0);
    const z = Math.min(BASE_EDGE - 4, p.pos.z + worldSpeed(g.state.speed) * tArr * 0.8 + rand(-5, 5));
    const side = Math.random() < 0.5 ? -1 : 1;
    const v = rand(14, 24), r = rand(1.2, 2.0);
    const x = p.pos.x + side * Math.min(46, v * tArr);
    const mesh = new THREE.Mesh(this.rockGeo, this.rockMat);
    mesh.scale.setScalar(r);
    mesh.castShadow = true;
    mesh.position.set(x, r * 0.85, z);
    g.scene.add(mesh);
    this.boulders.push({ mesh, dir: -side, v, r, hit: false, life: 8 });
    sfx.rumble();
  }

  updateBoulders(dt) {
    const g = this.g, p = g.p;
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i], m = b.mesh;
      m.position.x += b.dir * b.v * dt;
      m.rotation.z -= (b.dir * b.v / b.r) * dt;
      b.life -= dt;
      if (!b.hit && !g.state.god && Math.abs(p.pos.x - m.position.x) < b.r + 0.55 && Math.abs(p.pos.z - m.position.z) < b.r + 0.55 && p.pos.y < b.r * 1.1) {
        b.hit = true;
        p.knock.set(b.dir * 16, 0, rand(-4, 4));
        p.vy = 6;
        p.grounded = false;
        p.stun = 0.35;
        g.shake = 0.35;
        sfx.thud();
      }
      if (b.life <= 0 || Math.abs(m.position.x) > 60) {
        g.scene.remove(m);
        this.boulders.splice(i, 1);
      }
    }
  }

  // ---------- fox ----------
  spawnFox() {
    const g = this.g, s = g.state;
    const taken = [];
    for (let i = 0; i < s.slots; i++) if (s.pets[i] && !g.slotVis[i].pending) taken.push(i);
    if (!taken.length || this.fox) return false;
    const eggs = taken.filter(i => s.pets[i].r < 0);
    const pool = eggs.length ? eggs : taken;
    const slot = pool[Math.floor(Math.random() * pool.length)];
    const rig = createAnimal('fox');
    const pos = new THREE.Vector3(rand(-5, 5), 0, -30);
    rig.root.position.copy(pos);
    g.scene.add(rig.root);
    const label = new Label({ w: 256, h: 96, worldH: 0.9, bg: 'rgba(200,80,0,0.85)' });
    label.set([{ t: 'ЛИСА!', c: '#fff', s: 54 }]);
    g.scene.add(label.sprite);
    this.fox = { rig, pos, slot, state: 'in', t: 0, loot: null, egg: null, label, facing: 0, phase: 0 };
    g.ui.toast('🦊 Лиса-хитрица крадётся к инкубатору! Догони её', 'bad', 3500);
    sfx.fox();
    return true;
  }

  foxMove(target, speed, dt) {
    const f = this.fox;
    const dx = target.x - f.pos.x, dz = target.z - f.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const step = Math.min(d, speed * dt);
    f.pos.x += (dx / d) * step;
    f.pos.z += (dz / d) * step;
    f.facing = Math.atan2(dx, dz);
    f.phase += dt * 14;
    return d - step < 0.2;
  }

  updateFox(dt) {
    const f = this.fox, g = this.g, s = g.state, p = g.p;
    const sp = SLOT_POS[f.slot];
    let moving = true;
    if (f.state === 'in') {
      if (!s.pets[f.slot]) { f.state = 'out'; }
      else if (this.foxMove({ x: sp.x + 1.6, z: sp.z }, FOX_IN_SPEED, dt)) { f.state = 'grab'; f.t = 0.8; }
    } else if (f.state === 'grab') {
      moving = false;
      f.t -= dt;
      if (f.t <= 0) {
        f.loot = s.pets[f.slot];
        if (!f.loot) { f.state = 'out'; }
        else {
          s.pets[f.slot] = null;
          g.syncSlot(f.slot);
          g.recalcIncome();
          f.egg = createEgg(ANIMALS[f.loot.a]);
          f.egg.scale.multiplyScalar(0.6);
          f.egg.position.set(0, 1.25, 1.2);
          f.rig.root.add(f.egg);
          f.state = 'out';
          sfx.fox();
        }
      }
    } else if (f.state === 'out' || f.state === 'flee') {
      const done = this.foxMove({ x: f.pos.x, z: -45 }, f.state === 'flee' ? 14 : FOX_OUT_SPEED, dt);
      if (done) {
        if (f.loot) g.ui.toast(`🦊 Лиса унесла ${f.loot.r < 0 ? 'яйцо' : 'питомца'}: ${ANIMALS[f.loot.a].emoji} ${ANIMALS[f.loot.a].name}`, 'bad', 3500);
        this.removeFox();
        return;
      }
    }
    // the player scares the fox off by running into it
    if (f.state !== 'flee' && flat(p.pos, f.pos) < 1.6) {
      if (f.loot) {
        const i = !s.pets[f.slot] && f.slot < s.slots ? f.slot : g.findFreeSlot();
        if (i >= 0) { s.pets[i] = f.loot; g.syncSlot(i); g.recalcIncome(); }
        else s.money += g.sellPrice({ a: f.loot.a, r: Math.max(0, f.loot.r) });
        f.rig.root.remove(f.egg);
        f.loot = null;
        g.ui.toast('🦊 Ты отобрал добычу у лисы!', 'good', 2500);
      } else g.ui.toast('🦊 Ты прогнал лису!', 'good', 2000);
      f.state = 'flee';
      sfx.poof();
      g.save();
    }
    animateRig(f.rig, f.phase, moving ? 1 : 0);
    f.rig.root.position.copy(f.pos);
    f.rig.root.rotation.y = f.facing;
    f.label.sprite.position.set(f.pos.x, 2.9, f.pos.z);
  }

  removeFox() {
    this.g.scene.remove(this.fox.rig.root, this.fox.label.sprite);
    this.fox = null;
  }

  // ---------- cultists ----------
  spawnCultists(force) {
    const g = this.g;
    if (this.cult || (!force && g.state.money < 50)) return false;
    const center = new THREE.Vector3(0, 0, 17);
    const members = [0, 1, 2].map((i) => {
      const rig = createAnimal('cultist');
      const pos = new THREE.Vector3(-4 + i * 4, 0, -28 - i * 2);
      rig.root.position.copy(pos);
      g.scene.add(rig.root);
      const a = (i / 3) * Math.PI * 2;
      return { rig, pos, spot: new THREE.Vector3(center.x + Math.sin(a) * 3.2, 0, center.z + Math.cos(a) * 3.2), facing: Math.PI, phase: i, gone: false };
    });
    const circle = new THREE.Mesh(new THREE.RingGeometry(2.2, 4.2, 6), new THREE.MeshBasicMaterial({ color: '#9c27ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(center.x, 0.07, center.z);
    g.scene.add(circle);
    const label = new Label({ w: 384, h: 128, worldH: 1.4, bg: 'rgba(80,0,120,0.85)' });
    label.sprite.visible = false;
    label.sprite.position.set(center.x, 6, center.z);
    g.scene.add(label.sprite);
    this.cult = { members, center, circle, label, state: 'walk', t: RITUAL_TIME };
    g.ui.toast('🕯 Культисты идут на твою базу за деньгами! Подбеги к ним, чтобы прогнать', 'bad', 4500);
    sfx.cult();
    return true;
  }

  updateCult(dt) {
    const c = this.cult, g = this.g, p = g.p, s = g.state;
    const alive = c.members.filter(m => !m.gone);
    for (const m of alive) {
      let target = null, speed = CULT_SPEED;
      if (c.state === 'walk') target = m.spot;
      else if (c.state === 'leave') { target = { x: m.pos.x, z: -45 }; speed = 7; }
      let moving = false;
      if (target) {
        const dx = target.x - m.pos.x, dz = target.z - m.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.1) {
          const step = Math.min(d, speed * dt);
          m.pos.x += (dx / d) * step;
          m.pos.z += (dz / d) * step;
          m.facing = Math.atan2(dx, dz);
          moving = true;
        }
      } else m.facing = Math.atan2(c.center.x - m.pos.x, c.center.z - m.pos.z);
      m.phase += dt * 8;
      animateRig(m.rig, m.phase, moving ? 0.8 : 0);
      if (c.state === 'ritual') {
        for (const leg of m.rig.legs) if (leg.userData.phase !== undefined && leg.position.y > 1.5) leg.rotation.x = -2.6;  // arms up
      }
      m.rig.root.position.copy(m.pos);
      m.rig.root.rotation.y = m.facing;
      // banish on touch (not once they're leaving with the money)
      if (c.state !== 'leave' && flat(p.pos, m.pos) < 1.7) {
        m.gone = true;
        g.scene.remove(m.rig.root);
        g.burst(m.pos.clone().setY(1.5), '#9c27ff', 16);
        sfx.poof();
      }
    }
    const left = c.members.filter(m => !m.gone);
    if (!left.length) {
      if (c.state !== 'leave') {
        const bonus = Math.floor(s.money * 0.05);
        s.money += bonus;
        g.ui.toast(`🎉 Ты прогнал культистов!${bonus > 0 ? ` Награда $${fmt(bonus)}` : ''}`, 'good', 3000);
      }
      this.removeCult();
      return;
    }
    if (c.state === 'walk' && left.every(m => flat(m.pos, m.spot) < 0.2)) { c.state = 'ritual'; c.t = RITUAL_TIME; c.label.sprite.visible = true; sfx.cult(); }
    if (c.state === 'ritual') {
      c.t -= dt;
      c.circle.material.opacity = 0.35 + Math.sin(g.time * 6) * 0.15;
      c.circle.rotation.z += dt;
      c.circle.scale.setScalar(1 + (1 - c.t / RITUAL_TIME) * 0.3);
      c.label.set([{ t: `🕯 Ритуал: ${Math.ceil(c.t)} с`, c: '#e1bee7', s: 52 }]);
      if (c.t <= 0) {
        const taken = Math.floor(s.money * CULT_SHARE);
        s.money -= taken;
        g.ui.bump('money');
        g.ui.toast(`🕯 Культисты украли $${fmt(taken)} (33% денег)`, 'bad', 4000);
        sfx.caught();
        c.state = 'leave';
        c.label.sprite.visible = false;
        c.circle.visible = false;
        g.save();
      }
    }
    if (c.state === 'leave' && left.every(m => m.pos.z < -40)) this.removeCult();
  }

  removeCult() {
    const c = this.cult, sc = this.g.scene;
    for (const m of c.members) sc.remove(m.rig.root);
    sc.remove(c.circle, c.label.sprite);
    c.circle.geometry.dispose();
    this.cult = null;
  }

  // ---------- per frame ----------
  update(dt) {
    const g = this.g, s = g.state, p = g.p;
    s.clock = (s.clock + dt) % CYCLE;
    const night = this.isNight;
    if (night && !this.wasNight) this.onNight();
    if (!night && this.wasNight) this.onDay();
    this.wasNight = night;
    if (!night && this.untilSwitch < 15 && !this.warned) {
      this.warned = true;
      g.ui.toast('🌅 Скоро ночь — возвращайся на базу!', 'gold', 3000);
    }
    if (night) this.warned = false;

    // at night the player is pulled back to the base after a couple of seconds outside
    if (night && !g.inBase(p.pos)) {
      this.nightOut += dt;
      if (this.nightOut >= NIGHT_OUT_LIMIT) { this.nightOut = 0; this.sendHome(); }
    } else this.nightOut = 0;

    // weather
    this.weatherT -= dt;
    if (this.weatherT <= 0) this.setWeather(this.nextWeather());
    const w = WEATHER[s.weather];
    this.cloud += (w.cloud - this.cloud) * Math.min(1, dt * 0.4);
    this.rainAmt += (w.rain - this.rainAmt) * Math.min(1, dt * 0.4);
    this.updateRain(dt);
    this.aimCooldown -= dt;
    if (s.weather === 'storm') {
      this.strikeT -= dt;
      if (this.strikeT <= 0) { this.strikeT = rand(4, 8); this.scheduleStrike(); }
    }
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const st = this.strikes[i];
      st.t -= dt;
      if (st.follow) { st.target.set(p.pos.x, 0, p.pos.z); st.ring.position.set(p.pos.x, 0.08, p.pos.z); }   // aimed strikes can't be dodged
      st.ring.material.opacity = 0.35 + Math.abs(Math.sin(st.t * 12)) * 0.5;
      st.ring.scale.setScalar(0.6 + (1.3 - st.t) * 0.3);
      if (st.t <= 0) { this.strike(st); this.strikes.splice(i, 1); }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].t -= dt;
      if (this.bolts[i].t <= 0) { g.scene.remove(this.bolts[i].bolt); this.bolts.splice(i, 1); }
    }
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.flashEl) this.flashEl.style.opacity = (this.flash * 0.55).toFixed(2);

    // boulders roll across the road while you carry an egg home
    if (p.carrying >= 0 && !night && p.pos.z < BASE_EDGE - 15) {
      this.boulderT -= dt;
      if (this.boulderT <= 0) { this.boulderT = rand(3, 5); this.spawnBoulder(); }
    }
    this.updateBoulders(dt);

    // the fox can come at any time of day; with an empty incubator it tries again a bit later
    if (!this.fox) {
      this.foxIn -= dt;
      if (this.foxIn <= 0) this.foxIn = this.spawnFox() ? rand(FOX_EVERY[0], FOX_EVERY[1]) : 30;
    }
    if (this.fox) this.updateFox(dt);

    // cultist raids
    if (!this.cult) {
      this.cultT -= dt;
      if (this.cultT <= 0) { this.cultT = rand(240, 420); this.spawnCultists(false); }
    } else this.updateCult(dt);
  }

  // Lights, sky and stars for the time of day and weather (called every frame, also on the title screen).
  updateVisuals() {
    const g = this.g, cam = g.camera.position;
    const n = this.night, cl = this.cloud;
    this.stars.position.copy(cam);
    this.stars.material.opacity = n * (1 - cl * 0.9);
    this.moon.position.set(cam.x - 70, cam.y + 110, cam.z - 120);
    this.moon.material.opacity = n * (1 - cl * 0.8);
    return { night: n, cloud: cl, flash: this.flash };
  }

  hudInfo() {
    const s = this.g.state;
    const t = Math.ceil(this.untilSwitch);
    const clock = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    let hint = '', danger = false;
    if (this.isNight && this.nightOut > 0) { hint = `🌙 Ночью нельзя за базу! Возврат через ${Math.ceil(NIGHT_OUT_LIMIT - this.nightOut)}…`; danger = true; }
    else if (this.cult && this.cult.state !== 'leave') { hint = this.cult.state === 'ritual' ? `🕯 Культисты проводят ритуал! Прогони их за ${Math.ceil(this.cult.t)} с` : '🕯 Культисты идут на базу — прогони их!'; danger = true; }
    else if (this.fox && this.fox.state !== 'flee') { hint = '🦊 Лиса крадёт яйцо — догони её!'; danger = true; }
    return { ico: this.isNight ? '🌙' : '☀️', clock, weather: WEATHER[s.weather].ico, hint, danger };
  }
}
