// Deterministic shot scenes: the four screenshots the judge sees.
// Each scene builds its state from the seeded RNG, so the same seed always
// renders the same picture. No wall clock, no input — the main loop only
// runs the visual update for a fixed number of steps, then the renderer
// sets window.__shotReady.

import { rollChoices } from './upgrades.js';
import { spawnEnemy, spawnBoss } from './enemies.js';

function placePlayer(state, x, y) {
  const p = state.player;
  p.x = x;
  p.y = y;
  p.aim = -Math.PI / 2;
}

function scatterEnemies(state, kinds, count) {
  const a = state.arena;
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const x = state.rng.range(a.x + 80, a.x + a.w - 80);
    const y = state.rng.range(a.y + 80, a.y + a.h - 80);
    if (Math.hypot(x - state.player.x, y - state.player.y) < 150) continue;
    const elite = state.rng.chance(0.12);
    spawnEnemy(state, kind, x, y, elite);
  }
}

function firework(state) {
  // A few bullets already in flight, for a mid-action frame.
  const p = state.player;
  for (let i = 0; i < 10; i++) {
    const a = p.aim + (i - 4.5) * 0.14;
    state.bullets.push({
      x: p.x + Math.cos(a) * (40 + i * 26),
      y: p.y + Math.sin(a) * (40 + i * 26),
      vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
      damage: 12, pierce: 0, radius: 5, friendly: true,
      life: 1.2, hit: new Set(),
    });
  }
  state.particles.burst(p.x + 120, p.y - 60, '#ffd166', 16, 260, 0.6, 4);
  state.particles.burst(p.x - 160, p.y + 80, '#ff7a2f', 12, 220, 0.5, 4);
}

export function setupShot(state, scene) {
  const rng = state.rng;
  // A clean slate, then the scene builds its own moment.
  state.enemies = [];
  state.bullets = [];
  state.ebullets = [];
  state.pickups = [];
  state.banner = null;
  state.shake = 0;
  state.flash = 0;
  state.boss = null;

  if (scene === 'title') {
    state.mode = 'title';
    placePlayer(state, 640, 600);
    scatterEnemies(state, ['cinder', 'dart', 'wisp'], 7);
    state.particles.burst(640, 600, '#ffd166', 20, 200, 0.8, 4);
    return;
  }

  if (scene === 'play') {
    state.mode = 'playing';
    state.wave = 4;
    state.waveState = 'fighting';
    state.waveQueue = ['cinder', 'dart', 'spitter', 'brute'];
    state.score = 2450;
    state.kills = 87;
    state.combo = 12;
    state.comboTimer = 1.8;
    state.elapsed = 132;
    const p = state.player;
    p.hp = 4;
    p.level = 5;
    p.xp = 30;
    p.xpNext = 45;
    p.projectiles = 2;
    p.fireRate = 5.6;
    placePlayer(state, 620, 380);
    p.aim = -0.5;
    scatterEnemies(state, ['cinder', 'dart', 'spitter', 'brute', 'splitter', 'wisp'], 18);
    // A couple of gems on the floor and one heart, mid-collect.
    for (let i = 0; i < 6; i++) {
      state.pickups.push({
        kind: 'gem',
        x: state.rng.range(480, 780), y: state.rng.range(280, 500),
        vx: 0, vy: 0, value: 1, t: 0,
      });
    }
    state.pickups.push({ kind: 'heart', x: 540, y: 300, vx: 0, vy: 0, value: 1, t: 0 });
    firework(state);
    // Enemy shots already in flight, for colour and danger.
    for (let i = 0; i < 3; i++) {
      const sx = 880 + i * 40;
      const sy = 180 + i * 30;
      const a = Math.atan2(p.y - sy, p.x - sx);
      state.ebullets.push({
        x: sx, y: sy, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230,
        damage: 1, pierce: 0, radius: 6, friendly: false,
        life: 1.4, hit: new Set(),
      });
    }
    return;
  }

  if (scene === 'levelup') {
    state.mode = 'levelup';
    state.wave = 5;
    state.waveState = 'fighting';
    state.waveQueue = ['cinder', 'dart'];
    state.score = 3120;
    state.kills = 104;
    state.combo = 6;
    state.comboTimer = 1.2;
    state.elapsed = 168;
    const p = state.player;
    p.hp = 5;
    p.level = 6;
    p.xp = 0;
    p.xpNext = 52;
    placePlayer(state, 640, 360);
    scatterEnemies(state, ['cinder', 'dart', 'spitter'], 6);
    state.choices = rollChoices(rng, p, 3);
    return;
  }

  if (scene === 'victory') {
    state.mode = 'victory';
    state.wave = 10;
    state.waveState = 'fighting';
    state.waveQueue = [];
    state.score = 18400;
    state.kills = 312;
    state.elapsed = 462;
    state.best = Math.max(state.best, 18400);
    const p = state.player;
    p.hp = 4;
    p.level = 14;
    p.xp = 20;
    p.xpNext = 108;
    placePlayer(state, 640, 400);
    // Confetti embers over the victory screen.
    for (let i = 0; i < 5; i++) {
      state.particles.burst(
        state.rng.range(300, 980), state.rng.range(180, 420),
        ['#ffd166', '#7ef0c1', '#5ee6e6'][i % 3], 18, 300, 0.9, 4,
      );
    }
    state.particles.burst(400, 220, '#ffd166', 18, 300, 0.9, 4);
    state.particles.burst(880, 220, '#7ef0c1', 18, 300, 0.9, 4);
    state.particles.shockwave(640, 400, '#7ef0c1', 300, 0.9);
    return;
  }

  if (scene === 'boss') {
    state.mode = 'playing';
    state.wave = 10;
    state.waveState = 'fighting';
    state.waveQueue = ['cinder', 'dart'];
    state.score = 15200;
    state.kills = 268;
    state.combo = 16;
    state.comboTimer = 2.1;
    state.elapsed = 401;
    const p = state.player;
    p.hp = 3;
    p.level = 13;
    p.projectiles = 3;
    p.orbitals = 2;
    placePlayer(state, 640, 520);
    p.aim = -Math.PI / 2;
    const boss = spawnBoss(state);
    boss.hp = boss.maxHp * 0.45;
    boss.phase = 2;
    scatterEnemies(state, ['cinder', 'dart'], 5);
    firework(state);
    return;
  }

  // Unknown scene: fall back to the title.
  state.mode = 'title';
  placePlayer(state, 640, 470);
}
