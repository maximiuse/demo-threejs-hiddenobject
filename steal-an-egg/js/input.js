// Keyboard, mouse and touch (virtual joystick + camera drag) input.

export class Input {
  constructor({ canvas, joyZone, joyBase, joyKnob, jumpBtn }) {
    this.keys = new Set();
    this.joy = { x: 0, y: 0, id: null, cx: 0, cy: 0 };
    this.camDrag = { id: null, x: 0, y: 0 };
    this.look = { dx: 0, dy: 0, zoom: 0 };
    this.jumpQueued = false;
    this.enabled = true;
    this.joyBase = joyBase;
    this.joyKnob = joyKnob;
    this.radius = 55;
    this.pinch = null;

    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.add(e.code);
      if (e.code === 'Space') { this.jumpQueued = true; e.preventDefault(); }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    // Joystick: the touch zone covers the lower-left part of the screen,
    // the stick re-centres under the finger.
    joyZone.addEventListener('pointerdown', (e) => {
      if (this.joy.id !== null) return;
      e.preventDefault();
      joyZone.setPointerCapture?.(e.pointerId);
      this.joy.id = e.pointerId;
      this.joy.cx = e.clientX;
      this.joy.cy = e.clientY;
      joyBase.style.left = `${e.clientX}px`;
      joyBase.style.top = `${e.clientY}px`;
      joyBase.classList.add('active');
      this.updateJoy(e);
    });
    joyZone.addEventListener('pointermove', (e) => { if (e.pointerId === this.joy.id) this.updateJoy(e); });
    const endJoy = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null; this.joy.x = 0; this.joy.y = 0;
      joyKnob.style.transform = 'translate(-50%, -50%)';
      joyBase.style.left = '';
      joyBase.style.top = '';
      joyBase.classList.remove('active');
    };
    joyZone.addEventListener('pointerup', endJoy);
    joyZone.addEventListener('pointercancel', endJoy);

    // Camera: drag anywhere on the 3D view.
    const pointers = new Map();
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (pointers.size === 2 && this.pinch) {
        p.x = e.clientX; p.y = e.clientY;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.look.zoom += (this.pinch - d) * 0.03;
        this.pinch = d;
        return;
      }
      this.look.dx += e.clientX - p.x;
      this.look.dy += e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
    });
    const endCam = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) this.pinch = null; };
    canvas.addEventListener('pointerup', endCam);
    canvas.addEventListener('pointercancel', endCam);
    canvas.addEventListener('wheel', (e) => { this.look.zoom += e.deltaY * 0.01; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.jumpQueued = true; jumpBtn.classList.add('pressed'); });
    const up = () => jumpBtn.classList.remove('pressed');
    jumpBtn.addEventListener('pointerup', up);
    jumpBtn.addEventListener('pointercancel', up);

    // iOS: block double-tap zoom and pinch-zoom of the page.
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  }

  updateJoy(e) {
    let dx = e.clientX - this.joy.cx, dy = e.clientY - this.joy.cy;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) { dx *= this.radius / len; dy *= this.radius / len; }
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.joy.x = dx / this.radius;
    this.joy.y = -dy / this.radius;
  }

  // Returns {x: right, y: forward} in [-1, 1].
  getMove() {
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (this.joy.id !== null) {
      const len = Math.hypot(this.joy.x, this.joy.y);
      if (len > 0.15) { x += this.joy.x; y += this.joy.y; }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  consumeLook() {
    const k = this.keys;
    const keyYaw = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
    const l = { dx: this.look.dx + keyYaw * 6, dy: this.look.dy, zoom: this.look.zoom };
    this.look.dx = this.look.dy = this.look.zoom = 0;
    return l;
  }

  consumeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }
}
