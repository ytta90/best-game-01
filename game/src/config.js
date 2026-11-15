// Emberkeep — tuning and world constants.
// Everything that makes the game feel the way it does lives here, so a
// balance pass is one file: sizes, speeds, damage, wave pacing, drops.

export const VIEW = { width: 1280, height: 720 };
export const LANTERN = { x: 640, y: 360, radius: 46 };
export const ARENA = { x: 40, y: 40, width: 1200, height: 640 };

export const PLAYER = {
  radius: 16,
  maxHp: 100,
  speed: 265,
  fireRate: 4.2, // shots per second
  damage: 12,
  bulletSpeed: 560,
  bulletRadius: 6,
  projectiles: 1,
  pierce: 0,
  critChance: 0.05,
  magnetRadius: 90,
  hurtCooldown: 0.7, // seconds of invulnerability after a hit
};

export const LANTERN_STATS = {
  maxFlame: 100,
  waveClearBonus: 14, // flame restored when a wave is cleared
  drainPerSecond: { mite: 3, crawler: 4, wisp: 3, spitter: 0, brute: 6, boss: 0 },
};

// Enemy kinds. hp and speed scale a little with the wave; the table holds
// the base values, the score each kill is worth, and the embers it drops.
export const ENEMIES = {
  mite:    { hp: 12, speed: 118, radius: 12, damage: 7,  score: 10, embers: 1, color: '#e05a4e' },
  crawler: { hp: 30, speed: 62,  radius: 18, damage: 12, score: 20, embers: 2, color: '#a06ee8' },
  wisp:    { hp: 16, speed: 150, radius: 11, damage: 8,  score: 25, embers: 2, color: '#7fd4ff' },
  spitter: { hp: 22, speed: 70,  radius: 15, damage: 0,  score: 30, embers: 2, color: '#7fce5a' },
  brute:   { hp: 110, speed: 38, radius: 28, damage: 18, score: 60, embers: 4, color: '#c98a4b' },
  boss:    { hp: 950, speed: 30, radius: 52, damage: 24, score: 500, embers: 12, color: '#d8b13c' },
};

export const BOSS_WAVES = [5, 10];
export const WIN_WAVE = 10; // beating the wave-10 boss wins the game

export function wavePointBudget(wave) {
  return 10 + wave * 7;
}

export function enemyCost(kind) {
  return { mite: 1, wisp: 2, crawler: 2, spitter: 3, brute: 5, boss: 0 }[kind] ?? 1;
}

export function xpNeededFor(level) {
  return 6 + level * 4 + level * level;
}

export function comboMultiplier(combo) {
  if (combo >= 24) return 5;
  if (combo >= 16) return 4;
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}
