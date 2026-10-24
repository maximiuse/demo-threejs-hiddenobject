// Game balance and layout constants.

export const START_SPEED = 16;

// Displayed speed -> world units per second. Grows slower than linearly so that
// late-game speeds (300) don't turn running into teleporting. Chases stay fair:
// whoever has the bigger displayed speed is faster.
export function worldSpeed(s) {
  return 8 * Math.pow(Math.max(s, 0.1) / START_SPEED, 0.7);
}
export const MAX_SPEED = 500;

// Everything with z > BASE_EDGE is the player's safe territory: animals can't cross it.
export const BASE_EDGE = 0;
export const BASE = { minX: -24, maxX: 24, minZ: 0, maxZ: 36 };
export const WORLD = { minX: -44, maxX: 44, minZ: -1012, maxZ: 35 };
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
  { id: 'celestial', from: -505, to: -762, sky: '#cfe6ff', fog: '#efe8ff', hellSky: '#5a1414', hellFog: '#3d0f0f' },
  { id: 'bloggers', from: -762, to: -1300, sky: '#ff9fd6', fog: '#f7c6ff' },
];

// speed: what you need to outrun it; income: $/s of a common pet; hatch: seconds in the incubator.
export const ANIMALS = [
  { id: 'chicken', name: 'Курица', emoji: '🐔', speed: 14, income: 1, z: -30, side: -1, scale: 1.15, egg: '#fff3dc', spot: '#e3a55e', eggSize: 0.75, hatch: 10 },
  { id: 'duck', name: 'Утка', emoji: '🦆', speed: 18, income: 2, z: -62, side: 1, scale: 1.1, egg: '#d8f1ef', spot: '#7fb8b2', eggSize: 0.75, hatch: 15 },
  { id: 'pig', name: 'Свинья', emoji: '🐷', speed: 23, income: 3, z: -96, side: -1, scale: 1.0, egg: '#ffd3e1', spot: '#f06292', eggSize: 0.8, hatch: 20 },
  { id: 'sheep', name: 'Овца', emoji: '🐑', speed: 29, income: 5, z: -132, side: 1, scale: 1.0, egg: '#f4f4f4', spot: '#9e9e9e', eggSize: 0.85, hatch: 25 },
  { id: 'cow', name: 'Корова', emoji: '🐮', speed: 36, income: 8, z: -172, side: -1, scale: 1.0, egg: '#ffffff', spot: '#2b2b2b', eggSize: 0.9, hatch: 30 },
  { id: 'ostrich', name: 'Страус', emoji: '🦤', speed: 44, income: 13, z: -216, side: 1, scale: 1.0, egg: '#f3e6c4', spot: '#c9a96b', eggSize: 1.0, hatch: 35 },
  { id: 'wolf', name: 'Волк', emoji: '🐺', speed: 53, income: 20, z: -264, side: -1, scale: 1.1, egg: '#9aa3b5', spot: '#4a5168', eggSize: 0.95, hatch: 40 },
  { id: 'bear', name: 'Медведь', emoji: '🐻', speed: 63, income: 32, z: -316, side: 1, scale: 1.15, egg: '#c8a27c', spot: '#6d4c41', eggSize: 1.05, hatch: 45 },
  { id: 'dino', name: 'Динозавр', emoji: '🦖', speed: 74, income: 50, z: -380, side: -1, scale: 1.45, egg: '#e8c99a', spot: '#8a5a2b', eggSize: 1.25, hatch: 50, sleeps: true },
  { id: 'dragon', name: 'Дракон', emoji: '🐉', speed: 86, income: 80, z: -450, side: 1, scale: 1.45, egg: '#ff7043', spot: '#7f1d1d', eggSize: 1.3, hatch: 55 },
  { id: 'cherub', name: 'Херувим', emoji: '👼', speed: 99, income: 130, z: -535, side: -1, scale: 1.2, egg: '#fffde7', spot: '#ffd54f', eggSize: 1.1, hatch: 60, realm: 'heaven' },
  { id: 'imp', name: 'Бес', emoji: '😈', speed: 113, income: 200, z: -575, side: 1, scale: 1.25, egg: '#c62828', spot: '#1a1a1a', eggSize: 1.1, hatch: 65, realm: 'hell' },
  { id: 'seraph', name: 'Серафим', emoji: '😇', speed: 128, income: 320, z: -615, side: -1, scale: 1.3, egg: '#ffffff', spot: '#90caf9', eggSize: 1.2, hatch: 70, realm: 'heaven' },
  { id: 'hellhound', name: 'Адский пёс', emoji: '🐕', speed: 144, income: 500, z: -655, side: 1, scale: 1.35, egg: '#263238', spot: '#ff6d00', eggSize: 1.2, hatch: 75, realm: 'hell' },
  { id: 'archangel', name: 'Архангел', emoji: '⚔️', speed: 161, income: 800, z: -695, side: -1, scale: 1.4, egg: '#fff8e1', spot: '#ffc107', eggSize: 1.3, hatch: 80, realm: 'heaven' },
  { id: 'demonlord', name: 'Повелитель демонов', emoji: '👹', speed: 178, income: 1300, z: -735, side: 1, scale: 1.5, egg: '#3d0000', spot: '#ff1744', eggSize: 1.4, hatch: 85, realm: 'hell' },
  { id: 'blondie', name: 'Блондинка', emoji: '💁‍♀️', speed: 196, income: 2000, z: -795, side: -1, scale: 1.25, egg: '#ffd6e7', spot: '#f06292', eggSize: 1.2, hatch: 90, realm: 'blog' },
  { id: 'headphones', name: 'Блогер в наушниках', emoji: '🎧', speed: 216, income: 3200, z: -835, side: 1, scale: 1.25, egg: '#2b2b30', spot: '#cfd2d6', eggSize: 1.2, hatch: 95, realm: 'blog' },
  { id: 'robloxgirl', name: 'Roblox-девочка', emoji: '🍭', speed: 236, income: 5000, z: -875, side: -1, scale: 1.3, egg: '#f8bbd0', spot: '#111111', eggSize: 1.25, hatch: 100, realm: 'blog' },
  { id: 'streamer', name: 'Стример', emoji: '🎮', speed: 256, income: 8000, z: -915, side: 1, scale: 1.3, egg: '#7c4dff', spot: '#00e676', eggSize: 1.3, hatch: 105, realm: 'blog' },
  { id: 'vlogger', name: 'Влогер', emoji: '📸', speed: 278, income: 13000, z: -955, side: -1, scale: 1.35, egg: '#ffeb3b', spot: '#ff6d00', eggSize: 1.3, hatch: 110, realm: 'blog' },
  { id: 'millionaire', name: 'Миллионник', emoji: '🏆', speed: 300, income: 20000, z: -995, side: 1, scale: 1.5, egg: '#ffd700', spot: '#ff1744', eggSize: 1.45, hatch: 120, realm: 'blog' },
];

export const RARITIES = [
  { name: 'Обычный', chance: 0.70, mult: 1, color: '#e0e0e0' },
  { name: 'Редкий', chance: 0.22, mult: 2, color: '#42a5f5' },
  { name: 'Эпический', chance: 0.07, mult: 5, color: '#c158ff' },
  { name: 'Легендарный', chance: 0.01, mult: 15, color: '#ffc400' },
  { name: 'Мифический', chance: 0, mult: 40, color: '#ff3d00' },     // only by merging
];
export const LEGENDARY = 3;

// Egg mutations: rolled when an egg appears in a nest. Storm eggs only appear during a storm.
export const MUTATIONS = [
  { id: 'none', name: '', mult: 1 },
  { id: 'gold', name: 'Золотая', mult: 3, chance: 0.05, color: '#ffd740' },
  { id: 'rainbow', name: 'Радужная', mult: 6, chance: 0.015, color: '#ea80fc' },
  { id: 'storm', name: 'Грозовая', mult: 8, stormChance: 0.25, color: '#40c4ff' },
];

export function rollMutation(storm) {
  if (storm && Math.random() < MUTATIONS[3].stormChance) return 3;
  const r = Math.random();
  if (r < MUTATIONS[2].chance) return 2;
  if (r < MUTATIONS[2].chance + MUTATIONS[1].chance) return 1;
  return 0;
}

// Pets level up while they sit in the incubator; three identical pets merge into one of the next rarity.
export const PET = { maxLevel: 10, xpPerLevel: 60, levelBonus: 0.25, merge: 3, bossMult: 3 };
export const levelMult = (lv) => 1 + PET.levelBonus * ((lv || 1) - 1);

// Zone bosses: a giant guarding a special egg on the path. speed: what you need to outrun it.
export const BOSSES = [
  { zone: 'farm', species: 'chicken', name: 'Гигантская курица', z: -130, speed: 50 },
  { zone: 'forest', species: 'bear', name: 'Медведь-гора', z: -290, speed: 69 },
  { zone: 'desert', species: 'dino', name: 'Король динозавров', z: -395, speed: 80 },
  { zone: 'volcano', species: 'dragon', name: 'Древний дракон', z: -478, speed: 92 },
  { zone: 'celestial', species: 'demonlord', name: 'Архидемон', z: -640, speed: 186 },
  { zone: 'bloggers', species: 'millionaire', name: 'Мега-блогер', z: -892, speed: 310 },
];

export const UPG = {
  // The price of +2 speed follows the income of the animal you're working towards (see speedPrice),
  // so every new animal takes about the same amount of farming.
  speed: { step: 2, mult: 60 },
  treadmill: { max: 10, gain: lvl => 0.05 * lvl, cost: lvl => Math.round(150 * Math.pow(3, lvl - 1)) },
  slots: { start: 4, max: 12, cost: s => Math.round(100 * Math.pow(3, s - 4)) },
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

// Price of one speed upgrade bought at speed s: income of the animals around s
// (interpolated between neighbours on a log scale) times UPG.speed.mult.
export function speedPrice(s) {
  const a = ANIMALS;
  let inc;
  if (s <= a[0].speed) inc = a[0].income;
  else if (s >= a[a.length - 1].speed) inc = a[a.length - 1].income * Math.pow(1.04, s - a[a.length - 1].speed);
  else {
    let i = 0;
    while (a[i + 1].speed <= s) i++;
    const t = (s - a[i].speed) / (a[i + 1].speed - a[i].speed);
    inc = a[i].income * Math.pow(a[i + 1].income / a[i].income, t);
  }
  return Math.round(UPG.speed.mult * inc);
}
