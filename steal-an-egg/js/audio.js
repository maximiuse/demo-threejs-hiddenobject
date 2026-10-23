// Tiny synthesized sound effects (WebAudio), no audio files needed.

let ctx = null;
let master = null;
let enabled = true;

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.3;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setSound(v) { enabled = v; }

function tone(freq, dur, { type = 'square', vol = 0.25, slide = 0, delay = 0 } = {}) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Filtered white noise burst (thunder, rumbles, poofs).
function noise(dur, { vol = 0.4, freq = 400, delay = 0 } = {}) {
  if (!ctx || !enabled) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(ctx.currentTime + delay);
}

export const sfx = {
  thunder() { noise(0.25, { vol: 0.7, freq: 2500 }); noise(1.8, { vol: 1.0, freq: 260, delay: 0.05 }); },
  rumble() { noise(0.9, { vol: 0.35, freq: 140 }); },
  thud() { noise(0.3, { vol: 0.6, freq: 200 }); tone(90, 0.25, { type: 'sine', vol: 0.3 }); },
  poof() { noise(0.25, { vol: 0.3, freq: 1600 }); tone(500, 0.2, { type: 'sine', slide: 400, vol: 0.15 }); },
  fox() { tone(900, 0.08, { type: 'triangle' }); tone(1250, 0.12, { type: 'triangle', delay: 0.1 }); },
  cult() { tone(110, 1.4, { type: 'sawtooth', vol: 0.1 }); tone(165, 1.4, { type: 'sawtooth', vol: 0.08 }); },
  night() { tone(392, 0.35, { type: 'sine', vol: 0.25 }); tone(311, 0.5, { type: 'sine', vol: 0.25, delay: 0.3 }); },
  morning() { tone(523, 0.15, { type: 'sine', vol: 0.25 }); tone(659, 0.15, { type: 'sine', vol: 0.25, delay: 0.12 }); tone(784, 0.3, { type: 'sine', vol: 0.25, delay: 0.24 }); },
  pickup() { tone(520, 0.08); tone(780, 0.1, { delay: 0.07 }); tone(1040, 0.14, { delay: 0.14 }); },
  alert() { tone(880, 0.12, { type: 'triangle', vol: 0.3 }); tone(660, 0.12, { type: 'triangle', vol: 0.3, delay: 0.1 }); },
  place() { tone(660, 0.1, { type: 'triangle' }); tone(990, 0.18, { type: 'triangle', delay: 0.08 }); },
  caught() { tone(320, 0.4, { type: 'sawtooth', slide: -220, vol: 0.25 }); },
  hatch() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { type: 'triangle', delay: i * 0.08 })); },
  legendary() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.2, { type: 'square', vol: 0.18, delay: i * 0.07 })); },
  buy() { tone(880, 0.07, { type: 'sine', vol: 0.3 }); tone(1320, 0.12, { type: 'sine', vol: 0.3, delay: 0.06 }); },
  error() { tone(160, 0.18, { type: 'square', vol: 0.15 }); },
  coin() { tone(1250, 0.05, { type: 'sine', vol: 0.08 }); tone(1650, 0.08, { type: 'sine', vol: 0.08, delay: 0.05 }); },
  jump() { tone(300, 0.12, { type: 'sine', slide: 260, vol: 0.12 }); },
  safe() { tone(600, 0.1, { type: 'sine', vol: 0.2 }); tone(900, 0.16, { type: 'sine', vol: 0.2, delay: 0.09 }); },
};
