// Game balance and layout constants.

export const SPEED_SCALE = 0.5;     // displayed speed -> world units per second
export const START_SPEED = 16;
export const MAX_SPEED = 500;

// Everything with z > BASE_EDGE is the player's safe territory: animals can't cross it.
export const BASE_EDGE = 0;
export const BASE = { minX: -24, maxX: 24, minZ: 0, maxZ: 36 };
export const WORLD = { minX: -44, maxX: 44, minZ: -760, maxZ: 35 };
export const PATH_HALF = 5;
export const PEN_HALF = 9;
export const SPAWN = { x: 0, z: 9 };

// Zones along the path (z decreases going away from the base).
export const ZONES = [
  { id: 'farm', from: 60, to: -240, sky: '#9ad8ff', fog: '#bfe6ff' },
  { id: 'forest', from: -240, to: -345, sky: '#86c9e8', fog: '#a9d8c2' },
  { id: 'desert', from: -345, to: -415, sky: '#ffd99a', fog: '#f5d9a8' },
  { id: 'volcano', from: -415, to: -505, sky: '#5b2b2b', fog: '#6e3328' },
  // Heaven on the left of the path (x < 0), hell on the right (x > 0).
  { id: 'celestial', from: -505, to: -900, sky: '#cfe6ff', fog: '#efe8ff', hellSky: '#5a1414', hellFog: '#3d0f0f' },
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
  { id: 'cherub', name: 'Херувим', emoji: '👼', speed: 150, income: 1000, z: -535, side: -1, scale: 1.2, egg: '#fffde7', spot: '#ffd54f', eggSize: 1.1, hatch: 45, realm: 'heaven' },
  { id: 'imp', name: 'Бес', emoji: '😈', speed: 175, income: 2000, z: -575, side: 1, scale: 1.25, egg: '#c62828', spot: '#1a1a1a', eggSize: 1.1, hatch: 50, realm: 'hell' },
  { id: 'seraph', name: 'Серафим', emoji: '😇', speed: 205, income: 4000, z: -615, side: -1, scale: 1.3, egg: '#ffffff', spot: '#90caf9', eggSize: 1.2, hatch: 55, realm: 'heaven' },
  { id: 'hellhound', name: 'Адский пёс', emoji: '🐕', speed: 240, income: 8000, z: -655, side: 1, scale: 1.35, egg: '#263238', spot: '#ff6d00', eggSize: 1.2, hatch: 60, realm: 'hell' },
  { id: 'archangel', name: 'Архангел', emoji: '⚔️', speed: 280, income: 16000, z: -695, side: -1, scale: 1.4, egg: '#fff8e1', spot: '#ffc107', eggSize: 1.3, hatch: 70, realm: 'heaven' },
  { id: 'demonlord', name: 'Повелитель демонов', emoji: '👹', speed: 330, income: 35000, z: -735, side: 1, scale: 1.5, egg: '#3d0000', spot: '#ff1744', eggSize: 1.4, hatch: 80, realm: 'hell' },
];

export const RARITIES = [
  { name: 'Обычный', chance: 0.70, mult: 1, color: '#e0e0e0' },
  { name: 'Редкий', chance: 0.22, mult: 2, color: '#42a5f5' },
  { name: 'Эпический', chance: 0.07, mult: 5, color: '#c158ff' },
  { name: 'Легендарный', chance: 0.01, mult: 15, color: '#ffc400' },
];

export const UPG = {
  speed: { step: 2, cost: n => Math.round(10 * Math.pow(1.12, n)) },          // n = purchases made
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

// Player skins (cosmetic). Bought once in the shop, then can be worn any time.
export const SKINS = [
  { id: 'classic', name: 'Классика', price: 0 },
  { id: 'girl', name: 'Девочка', price: 150 },
  { id: 'kpop', name: 'K-pop девочка', price: 1500 },
  { id: 'tungtung', name: 'Тунг Тунг Тунг Сахур', price: 5000, brainrot: true },
  { id: 'tralalero', name: 'Тралалеро Тралала', price: 15000, brainrot: true },
  { id: 'ballerina', name: 'Балерина Капучина', price: 40000, brainrot: true },
  { id: 'chimpanzini', name: 'Шимпанзини Бананини', price: 100000, brainrot: true },
  { id: 'bombardiro', name: 'Бомбардиро Крокодило', price: 250000, brainrot: true },
];

// Code that unlocks the admin panel (Pause → Админ, or ?admin=CODE in the URL).
// The game is fully client-side, so this only keeps casual players out.
export const ADMIN_CODE = 'egg2026';

// Trails behind the player. colors: gradient from the player to the tail end.
export const TRAILS = [
  { id: 'none', name: 'Без следа', price: 0 },
  { id: 'white', name: 'Белый', price: 200, colors: ['#ffffff'] },
  { id: 'red', name: 'Красный', price: 500, colors: ['#ff1744'] },
  { id: 'blue', name: 'Синий', price: 1000, colors: ['#2979ff'] },
  { id: 'toxic', name: 'Ядовитый', price: 2500, colors: ['#76ff03', '#00e676'] },
  { id: 'pink', name: 'Неон', price: 6000, colors: ['#ff4081', '#e040fb'] },
  { id: 'gold', name: 'Золотой', price: 15000, colors: ['#fff176', '#ffc400', '#ff8f00'] },
  { id: 'fire', name: 'Огненный', price: 40000, colors: ['#ffea00', '#ff6d00', '#d50000'] },
  { id: 'ice', name: 'Ледяной', price: 80000, colors: ['#ffffff', '#80d8ff', '#2962ff'] },
  { id: 'galaxy', name: 'Галактика', price: 150000, colors: ['#ff80ab', '#7c4dff', '#1a237e'] },
  { id: 'rainbow', name: 'Радужный', price: 300000, rainbow: true },
];
