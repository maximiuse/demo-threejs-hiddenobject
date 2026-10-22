// A camera-facing ribbon that follows the player and fades out behind them.
import * as THREE from 'three';

const LIFE = 1.0;       // seconds a trail point stays visible
const SPACING = 0.35;   // distance between stored points
const WIDTH = 1.0;

export class Trail {
  constructor(scene, n = 64) {
    this.n = n;
    this.pts = Array.from({ length: n }, () => ({ p: new THREE.Vector3(), t: -1e9 }));
    this.pos = new Float32Array(n * 2 * 3);
    this.col = new Float32Array(n * 2 * 4);
    const index = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(index);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.style = null;
    this.stops = [];
    this.c = new THREE.Color();
    this.tan = new THREE.Vector3();
    this.view = new THREE.Vector3();
    this.side = new THREE.Vector3();
  }

  setStyle(def) {
    this.style = def && (def.colors || def.rainbow) ? def : null;
    this.mesh.visible = !!this.style;
    this.stops = this.style && this.style.colors ? this.style.colors.map(c => new THREE.Color(c)) : [];
    for (const pt of this.pts) pt.t = -1e9;
  }

  colorAt(k, time) {
    const c = this.c;
    if (this.style.rainbow) return c.setHSL((time * 0.6 + k * 1.6) % 1, 1, 0.55);
    const st = this.stops;
    if (st.length === 1) return c.copy(st[0]);
    const f = k * (st.length - 1), i = Math.min(Math.floor(f), st.length - 2);
    return c.copy(st[i]).lerp(st[i + 1], f - i);
  }

  update(time, head, camPos) {
    if (!this.style) return;
    const pts = this.pts, n = this.n;
    if (pts[0].p.distanceToSquared(head) > 900) for (const pt of pts) pt.t = -1e9;  // teleported
    pts[0].p.copy(head);
    pts[0].t = time;
    if (pts[1].t < -1e8 || pts[0].p.distanceTo(pts[1].p) > SPACING) {
      const it = pts.pop();
      it.p.copy(head);
      it.t = time;
      pts.unshift(it);
    }
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      if (i > 0 && time - pt.t > LIFE) pt.p.copy(pts[i - 1].p);   // expired: fold onto the live part
      const k = i / (n - 1);
      const a = Math.max(0, 1 - (time - pt.t) / LIFE) * (1 - k);
      const prev = pts[Math.max(0, i - 1)].p, next = pts[Math.min(n - 1, i + 1)].p;
      this.tan.subVectors(prev, next);
      this.view.subVectors(camPos, pt.p);
      this.side.crossVectors(this.tan, this.view);
      const len = this.side.length();
      if (len < 1e-5) this.side.set(0, 0, 0);
      else this.side.multiplyScalar((WIDTH * (0.25 + 0.75 * a)) / 2 / len);
      const o = i * 6;
      this.pos[o] = pt.p.x + this.side.x; this.pos[o + 1] = pt.p.y + this.side.y; this.pos[o + 2] = pt.p.z + this.side.z;
      this.pos[o + 3] = pt.p.x - this.side.x; this.pos[o + 4] = pt.p.y - this.side.y; this.pos[o + 5] = pt.p.z - this.side.z;
      const c = this.colorAt(k, time);
      const q = i * 8;
      this.col[q] = this.col[q + 4] = c.r;
      this.col[q + 1] = this.col[q + 5] = c.g;
      this.col[q + 2] = this.col[q + 6] = c.b;
      this.col[q + 3] = this.col[q + 7] = a * 0.85;
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  }
}
