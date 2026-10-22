// Game balance and layout constants.

export const SPEED_SCALE = 0.5;     // displayed speed -> world units per second
export const START_SPEED = 16;
export const MAX_SPEED = 400;

// Everything with z > BASE_EDGE is the player's safe territory: animals can't cross it.
export const BASE_EDGE = 0;
export const BASE = { minX: -24, maxX: 24, minZ: 0, maxZ: 36 };
export const WORLD = { minX: -44, maxX: 44, minZ: -484, maxZ: 35 };
export const PATH_HALF = 5;
export const PEN_HALF = 9;
export const SPAWN = { x: 0, z: 9 };

// Zones along the path (z decreases going away from the base).
export const ZONES = [
  { id: 'farm', from: 60, to: -240, sky: '#9ad8ff', fog: '#bfe6ff' },
  { id: 'forest', from: -240, to: -345, sky: '#86c9e8', fog: '#a9d8c2' },
  { id: 'desert', from: -345, to: -415, sky: '#ffd99a', fog: '#f5d9a8' },
  { id: 'volcano', from: -415, to: -600, sky: '#5b2b2b', fog: '#6e3328' },
];

export const ANIMALS = [
  { id: 'chicken', name: 'Курица', emoji: '🐔', speed: 14, income: 1, z: -30, side: -1, scale: 1.15, egg: '#fff3dc', spot: '#e3a55e', eggSize: 0.75, hatch: 6 },
  { id: 'duck', name: 'Утка', emoji: '🦆', speed: 20, income: 2, z: -62, side: 1, scale: 1.1, egg: '#d8f1ef', spot: '#7fb8b2', eggSize: 0.75, hatch: 8 },
  { id: 'pig', name: 'Свинья', emoji: '🐷', speed: 27, income: 4, z: -96, side: -1, scale: 1.0, egg: '#ffd3e1', spot: '#f06292', eggSize: 0.8, hatch: 10 },
  { id: 'sheep', name: 'Овца', emoji: '🐑', speed: 35, income: 8, z: -132, side: 1, scale: 1.0, egg: '#f4f4f4', spot: '#9e9e9e', eggSize: 0.85, hatch: 12 },
  { id: 'cow', name: 'Корова', emoji: '🐮', speed: 45, income: 15, z: -172, side: -1, scale: 1.0, egg: '#ffffff', spot: '#2b2b2b', eggSize: 0.9, hatch: 15 },
  { id: 'ostrich', name: 'Страус', emoji: '🦤', speed: 58, income: 30, z: -216, side: 1, scale: 1.0, egg: '#f3e6c4', spot: '#c9a96b', eggSize: 1.0, hatch: 18 },
  { id: 'wolf', name: 'Волк', emoji: '🐺', speed: 72, income: 60, z: -264, side: -1, scale: 1.1, egg: '#9aa3b5', spot: '#4a5168', eggSize: 0.95, hatch: 22 },
  { id: 'bear', name: 'Медведь', emoji: '🐻', speed: 88, income: 120, z: -316, side: 1, scale: 1.15, egg: '#c8a27c', spot: '#6d4c41', eggSize: 1.05, hatch: 26 },
  { id: 'dino', name: 'Динозавр', emoji: '🦖', speed: 105, income: 250, z: -380, side: -1, scale: 1.45, egg: '#e8c99a', spot: '#8a5a2b', eggSize: 1.25, hatch: 32, sleeps: true },
  { id: 'dragon', name: 'Дракон', emoji: '🐉', speed: 125, income: 500, z: -450, side: 1, scale: 1.45, egg: '#ff7043', spot: '#7f1d1d', eggSize: 1.3, hatch: 40 },
];

export const RARITIES = [
  { name: 'Обычный', chance: 0.70, mult: 1, color: '#e0e0e0' },
  { name: 'Редкий', chance: 0.22, mult: 2, color: '#42a5f5' },
  { name: 'Эпический', chance: 0.07, mult: 5, color: '#c158ff' },
  { name: 'Легендарный', chance: 0.01, mult: 15, color: '#ffc400' },
];

export const UPG = {
  speed: { step: 2, cost: n => Math.round(10 * Math.pow(1.17, n)) },          // n = purchases made
  treadmill: { max: 10, gain: lvl => 0.4 * lvl, cost: lvl => Math.round(60 * Math.pow(2.6, lvl - 1)) },
  slots: { start: 4, max: 12, cost: s => Math.round(40 * Math.pow(2.8, s - 4)) },
  sellMult: 20,
};

// Egg incubator pedestals inside the base: 3 columns x 4 rows.
export const SLOT_POS = [];
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 3; col++) SLOT_POS.push({ x: -19 + col * 5, z: 7 + row * 6 });
}

export const TREADMILL = { x: 15, z: 15, halfW: 1.3, halfL: 2.9 };
export const SHOP_PAD = { x: 0, z: 27.5, r: 1.8 };
