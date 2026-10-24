// Zone bosses: from time to time a giant appears on the path of an unlocked zone, guarding a
// special egg (always mutated, hatches at least epic, boss pets earn x3). While chasing the
// player it slams the ground: jump over the shock wave or get knocked down.
import * as THREE from 'three';
import { ANIMALS, BOSSES } from './config.js';
import { createNest, Label, mat } from './models.js';
import { zoneAt } from './world.js';
import { sfx } from './audio.js';

const EVERY = [180, 300];      // seconds between bosses
const LIFE = 150;              // seconds a boss waits before leaving
const SCALE = 2.2;

const rand = (a, b) => a + Math.random() * (b - a);

export class BossManager {
  constructor(game, AnimalClass) {
    this.g = game;
    this.Animal = AnimalClass;
    this.boss = null;
    this.t = rand(120, 200);
    this.waves = [];
    this.waveGeo = new THREE.RingGeometry(0.85, 1, 40);
  }

  // Bosses of zones whose first animal the player can already outrun.
  unlocked() {
    const sp = this.g.state.speed;
    const list = BOSSES.filter((b) => {
      const first = ANIMALS.find(a => zoneAt(a.z).id === b.zone);
      return first && sp >= first.speed;
    });
    return list.length ? list : [BOSSES[0]];
  }

  spawn(info) {
    if (this.boss) return false;
    const g = this.g;
    info = info || (() => { const l = this.unlocked(); return l[Math.floor(Math.random() * l.length)]; })();
    const speciesIdx = ANIMALS.findIndex(a => a.id === info.species);
    const base = ANIMALS[speciesIdx];
    const def = { ...base, name: info.name, speed: info.speed, scale: base.scale * SCALE, eggSize: base.eggSize * 1.6, sleeps: false, side: 1, boss: true };
    const nestPos = new THREE.Vector3(0, 0, info.z);
    const pen = {
      def, index: speciesIdx, nestPos, center: nestPos.clone(),
      bounds: { minX: -4.5, maxX: 4.5, minZ: info.z - 7, maxZ: info.z + 7 },
    };
    const nest = createNest();
    nest.scale.setScalar(1.8);
    nest.position.copy(nestPos);
    nest.traverse(o => { if (o.isMesh) o.material = mat('#ffca28'); });
    g.scene.add(nest);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 90, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffd740', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(0, 45, info.z);
    g.scene.add(beam);
    const animal = new this.Animal(g, pen);
    animal.isBoss = true;
    animal.setNestMut(Math.random() < 0.5 ? 1 : 2);
    const sign = new Label({ w: 512, h: 200, worldH: 2.6, bg: 'rgba(120,70,0,0.85)' });
    sign.set([{ t: `👑 ${info.name}`, c: '#ffe57f', s: 54 }, { t: `Скорость ${info.speed}`, c: '#ffffff', s: 44 }, { t: 'особое яйцо', c: '#ffd740', s: 36 }]);
    g.scene.add(sign.sprite);
    this.boss = { animal, info, nest, beam, sign, life: LIFE, slamT: 2.5 };
    g.ui.toast(`👑 Появился босс: ${info.name}! Его яйцо всегда мутировавшее и вылупляется минимум эпическим`, 'gold', 4500);
    sfx.legendary();
    return true;
  }

  remove() {
    const b = this.boss, sc = this.g.scene;
    b.animal.destroy();
    sc.remove(b.nest, b.beam, b.sign.sprite);
    b.beam.geometry.dispose();
    this.boss = null;
  }

  // Called when the boss egg lands in the incubator.
  defeated() {
    this.g.ui.toast(`👑 Яйцо босса твоё! ${this.boss.info.name} уходит`, 'gold', 3500);
    this.remove();
    this.t = rand(EVERY[0], EVERY[1]);
  }

  slam() {
    const g = this.g, a = this.boss.animal;
    a.hop = 1;
    const ring = new THREE.Mesh(this.waveGeo, new THREE.MeshBasicMaterial({ color: '#ff6d00', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(a.pos.x, 0.12, a.pos.z);
    g.scene.add(ring);
    this.waves.push({ ring, r: 1, hit: false });
    g.shake = Math.max(g.shake, 0.25);
    sfx.thud();
  }

  update(dt) {
    const g = this.g, p = g.p;
    if (!this.boss) {
      this.t -= dt;
      if (this.t <= 0) { this.spawn(); this.t = rand(EVERY[0], EVERY[1]); }
    } else {
      const b = this.boss, a = b.animal;
      a.update(dt);
      b.sign.sprite.position.set(a.pos.x, a.top + 2.5, a.pos.z);
      b.beam.material.opacity = 0.18 + Math.sin(g.time * 3) * 0.07;
      const busy = p.carrySrc === a || !a.eggPresent;
      if (!busy) b.life -= dt;
      if (b.life <= 0) {
        g.ui.toast(`👑 ${b.info.name} ушёл, так и не отдав яйцо`, '', 3000);
        this.remove();
      } else if (a.state === 'chase') {
        b.slamT -= dt;
        if (b.slamT <= 0) { b.slamT = rand(2.2, 3.2); this.slam(); }
      } else b.slamT = 1.5;
    }
    // shock waves: knock the player down unless they are in the air
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.r += 16 * dt;
      w.ring.scale.setScalar(w.r);
      w.ring.material.opacity = Math.max(0, 0.8 * (1 - w.r / 16));
      const d = Math.hypot(p.pos.x - w.ring.position.x, p.pos.z - w.ring.position.z);
      if (!w.hit && Math.abs(d - w.r) < 0.9 && p.pos.y < 0.6 && !g.state.god) {
        w.hit = true;
        const k = 14 / (d || 1);
        p.knock.set((p.pos.x - w.ring.position.x) * k, 0, (p.pos.z - w.ring.position.z) * k);
        p.vy = 5;
        p.grounded = false;
        p.stun = 0.7;
        g.shake = 0.5;
      }
      if (w.r >= 16) {
        g.scene.remove(w.ring);
        w.ring.material.dispose();
        this.waves.splice(i, 1);
      }
    }
  }

  get animal() { return this.boss ? this.boss.animal : null; }
}
