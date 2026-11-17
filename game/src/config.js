// EMBERFALL — configuration: every tunable number in one place.
// The arena, the player, the enemy kinds, the ten waves and the twelve
// upgrades are all defined here so balance can be tuned without touching
// the simulation code.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const ARENA = { x: 24, y: 24, w: VIEW_W - 48, h: VIEW_H - 48 };

// Coherent ember palette: charcoal ground, hot orange player, teal accents.
export const PALETTE = {
  bg0: '#0d0a14',
  bg1: '#171022',
  grid: 'rgba(255, 170, 80, 0.05)',
  vignette: 'rgba(0, 0, 0, 0.45)',
  player: '#ffb347',
  playerCore: '#fff3d6',
  bullet: '#ffd166',
  gem: '#7ef0c1',
  heart: '#ff5d73',
  text: '#f5ead9',
  dim: '#a89bb8',
  gold: '#ffd166',
  teal: '#5ee6e6',
};

export const PLAYER_BASE = {
  radius: 16,
  speed: 265,
  maxHp: 5,
  fireRate: 4.4, // shots per second
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 5,
  projectiles: 1,
  pierce: 0,
  magnet: 95,
  dashCooldown: 1.6,
  dashTime: 0.16,
  dashSpeed: 820,
  regenPerSec: 0,
  comboWindow: 2.5,
  comboCap: 8,
  novaInterval: 0, // 0 = no nova
  orbitals: 0,
};

// Enemy kinds. hp/speed scale with the wave; score is the base kill score.
export const ENEMY_KINDS = {
  cinder: {
    name: 'Cinder', radius: 15, hp: 22, speed: 95, score: 50,
    color: '#ff7a2f', core: '#ffd166', damage: 1,
    desc: 'A shambling ember that walks straight at the flame.',
  },
  dart: {
    name: 'Dart', radius: 11, hp: 12, speed: 185, score: 70,
    color: '#ffcf3f', core: '#fff3d6', damage: 1,
    desc: 'Fast and fragile; it darts in from the dark.',
  },
  spitter: {
    name: 'Spitter', radius: 15, hp: 26, speed: 70, score: 90,
    color: '#5ee6e6', core: '#d6fffa', damage: 1, ranged: true,
    shootEvery: 2.6, shootSpeed: 230, shootRange: 420,
    desc: 'Keeps its distance and spits cold fire.',
  },
  brute: {
    name: 'Brute', radius: 24, hp: 90, speed: 52, score: 150,
    color: '#c65df0', core: '#f2d6ff', damage: 2,
    desc: 'Slow, heavy, and hard to stop.',
  },
  splitter: {
    name: 'Splitter', radius: 18, hp: 34, speed: 80, score: 110,
    color: '#7ef0c1', core: '#eafff5', damage: 1, splits: 2,
    desc: 'Breaks apart into two sparks when it dies.',
  },
  spark: {
    name: 'Spark', radius: 9, hp: 8, speed: 150, score: 30,
    color: '#9dffc8', core: '#ffffff', damage: 1,
    desc: 'A splinter of a splitter.',
  },
  wisp: {
    name: 'Wisp', radius: 13, hp: 20, speed: 120, score: 100,
    color: '#b8a7ff', core: '#efeaff', damage: 1, wavy: true,
    desc: 'Drifts in a sine wave; hard to lead with a shot.',
  },
};

// Ten waves. counts are per kind; interval is the spawn gap in seconds;
// eliteChance is the chance a spawned enemy is an elite (bigger, tougher,
// drops a burst of gems). Wave 10 is the boss.
export const WAVES = [
  { cinder: 8, interval: 1.15, eliteChance: 0 },
  { cinder: 10, dart: 5, interval: 1.0, eliteChance: 0 },
  { cinder: 12, dart: 7, spitter: 3, interval: 0.9, eliteChance: 0.06 },
  { cinder: 12, dart: 9, spitter: 4, splitter: 3, interval: 0.85, eliteChance: 0.08 },
  { cinder: 14, dart: 10, spitter: 5, splitter: 4, wisp: 4, interval: 0.8, eliteChance: 0.1 },
  { cinder: 14, dart: 12, spitter: 6, splitter: 5, wisp: 6, brute: 2, interval: 0.75, eliteChance: 0.12 },
  { cinder: 16, dart: 13, spitter: 7, splitter: 6, wisp: 8, brute: 3, interval: 0.7, eliteChance: 0.14 },
  { cinder: 18, dart: 14, spitter: 8, splitter: 7, wisp: 9, brute: 4, interval: 0.65, eliteChance: 0.16 },
  { cinder: 20, dart: 16, spitter: 9, splitter: 8, wisp: 10, brute: 5, interval: 0.6, eliteChance: 0.18 },
  { boss: 1, cinder: 6, dart: 6, interval: 1.4, eliteChance: 0 },
];

export const BOSS = {
  name: 'PYRE LORD',
  radius: 48, hp: 980, speed: 66, score: 5000,
  color: '#ff3d5e', core: '#ffd166', damage: 2,
};

// The twelve upgrades offered on level-up. max is how many times one can
// be taken; apply() mutates the player.
export const UPGRADES = [
  {
    id: 'rapid', name: 'Rapid Chamber', max: 5, icon: '»',
    desc: '+18% fire rate. Your embers leave the barrel faster.',
    apply: (p) => { p.fireRate *= 1.18; },
  },
  {
    id: 'heavy', name: 'Heavy Embers', max: 5, icon: '●',
    desc: '+25% bullet damage. Each hit lands like a hammer.',
    apply: (p) => { p.bulletDamage *= 1.25; },
  },
  {
    id: 'twin', name: 'Twin Barrels', max: 3, icon: '‖',
    desc: '+1 projectile per shot. Twice the trouble, same trigger.',
    apply: (p) => { p.projectiles += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Rounds', max: 3, icon: '→',
    desc: 'Bullets pierce +1 enemy. Lines of foes fall together.',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'boots', name: 'Swift Boots', max: 4, icon: '»',
    desc: '+10% move speed. The flame never stands still.',
    apply: (p) => { p.speed *= 1.1; },
  },
  {
    id: 'dash', name: 'Adrenal Dash', max: 3, icon: '⚡',
    desc: 'Dash recharges 30% faster. Blink through the swarm.',
    apply: (p) => { p.dashCooldown *= 0.7; },
  },
  {
    id: 'heart', name: 'Ember Heart', max: 4, icon: '♥',
    desc: 'Regenerate 1 HP every 5 seconds. The flame feeds itself.',
    apply: (p) => { p.regenPerSec += 0.2; },
  },
  {
    id: 'magnet', name: 'Magnet Coil', max: 3, icon: '◎',
    desc: '+45% pickup radius. Gems fly to you.',
    apply: (p) => { p.magnet *= 1.45; },
  },
  {
    id: 'combo', name: 'Combo Lens', max: 3, icon: '×',
    desc: 'Combo lasts 50% longer and caps +2 higher.',
    apply: (p) => { p.comboWindow *= 1.5; p.comboCap += 2; },
  },
  {
    id: 'nova', name: 'Frost Nova', max: 3, icon: '✳',
    desc: 'Every 9s a nova bursts out, slowing all nearby foes.',
    apply: (p) => { p.novaInterval = p.novaInterval === 0 ? 9 : p.novaInterval * 0.85; },
  },
  {
    id: 'orbital', name: 'Orbital Sparks', max: 3, icon: '◍',
    desc: '+1 orbiting spark blade that chews through anything near.',
    apply: (p) => { p.orbitals += 1; },
  },
  {
    id: 'vitality', name: 'Vitality', max: 4, icon: '+',
    desc: '+1 max HP and heal 1 HP now. A sturdier flame.',
    apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); },
  },
];

// XP needed to go from `level` to `level + 1`.
export function xpForLevel(level) {
  return 10 + level * 7;
}

// Enemy stat scaling with the wave number (1-based).
export function scaleHp(base, wave) {
  return Math.round(base * (1 + 0.22 * (wave - 1)));
}
export function scaleSpeed(base, wave) {
  return base * (1 + 0.03 * (wave - 1));
}
