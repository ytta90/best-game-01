// Emberkeep — the deterministic screenshot scenes. Each scene builds a
// real game state with the seeded generator, runs the same fixed-step
// simulation the live game runs, and renders once: the screenshots are
// renders of the game's own code, never staged images. Four scenes cover
// the whole loop: title, play, level-up and victory.

import { LANTERN, LANTERN_STATS } from './config.js';
import { makeRng } from './random.js';
import { chooseUpgrades } from './upgrades.js';
import { setBanner, spawnEnemy } from './entities.js';
import { generateDecor } from './render.js';

// A scripted stand-in for the player's input: it steers the keeper in a
// small orbit around a point left of the lantern and holds the fire
// button down, so the play scene is a real fight rather than a still
// life. The steering aims at a moving anchor, so the keeper stays in
// frame instead of wandering off.
export function scriptedInputFor(state, scene) {
  const mouse = { x: 920, y: 330, down: scene === 'play' };
  function anchor() {
    return {
      x: 470 + Math.sin(state.time * 0.8) * 60,
      y: 430 + Math.cos(state.time * 0.6) * 50,
    };
  }
  return {
    mouse,
    down: () => false,
    moveX() {
      if (scene !== 'play') return 0;
      const a = anchor();
      const dx = a.x - state.player.x;
      const dy = a.y - state.player.y;
      const d = Math.hypot(dx, dy) || 1;
      return dx / d;
    },
    moveY() {
      if (scene !== 'play') return 0;
      const a = anchor();
      const dx = a.x - state.player.x;
      const dy = a.y - state.player.y;
      const d = Math.hypot(dx, dy) || 1;
      return dy / d;
    },
    firing() {
      return scene === 'play';
    },
    wasPressed: () => false,
    endFrame() {},
  };
}

function scatterBlight(state, kinds) {
  for (const kind of kinds) {
    const a = state.rng.angle();
    const r = state.rng.range(180, 330);
    spawnEnemy(state, kind, LANTERN.x + Math.cos(a) * r, LANTERN.y + Math.sin(a) * r * 0.7);
  }
}

export function prepareShot(state, scene, seed) {
  state.rng = makeRng(seed);
  state.decor = generateDecor(state.rng);
  state.time = 0;
  state.fx.clear();

  if (scene === 'title') {
    state.mode = 'title';
    state.lantern.flame = state.lantern.maxFlame;
    scatterBlight(state, ['wisp', 'mite', 'wisp', 'crawler', 'mite', 'wisp']);
    state.time = 2.4;
    return { steps: 0 };
  }

  if (scene === 'play') {
    state.mode = 'playing';
    state.wave = 3;
    state.score = 1840;
    state.kills = 47;
    state.combo = 8;
    state.comboTimer = 2.5;
    state.player.x = 430;
    state.player.y = 400;
    state.player.level = 3;
    state.player.xp = 12;
    state.player.xpNeed = 27;
    state.player.damage = 15;
    state.player.fireRate = 5;
    state.player.projectiles = 2;
    state.player.hp = 82;
    state.lantern.flame = 74;
    state.director.phase = 'active';
    state.director.queue = ['mite', 'crawler', 'wisp', 'mite', 'spitter', 'mite', 'crawler', 'brute'];
    setBanner(state, 'WAVE 3', 'hold the grove', 2.6);
    scatterBlight(state, ['mite', 'crawler', 'wisp', 'mite', 'spitter', 'crawler', 'mite', 'brute', 'wisp']);
    for (let i = 0; i < 6; i++) {
      const a = state.rng.angle();
      state.embers.push({
        x: LANTERN.x + Math.cos(a) * state.rng.range(60, 200),
        y: LANTERN.y + Math.sin(a) * state.rng.range(60, 160),
        vx: 0, vy: 0, value: 1, life: 14,
      });
    }
    // 150 fixed steps: two and a half seconds of real fighting.
    return { steps: 150 };
  }

  if (scene === 'levelup') {
    state.mode = 'levelup';
    state.wave = 4;
    state.score = 3120;
    state.kills = 68;
    state.combo = 0;
    state.player.x = 640;
    state.player.y = 480;
    state.player.level = 4;
    state.player.xp = 0;
    state.player.xpNeed = 38;
    state.player.hp = 90;
    state.lantern.flame = 86;
    state.choices = chooseUpgrades(state.rng, {});
    state.hoverCard = 1;
    scatterBlight(state, ['mite', 'crawler', 'wisp', 'mite']);
    state.time = 5.1;
    return { steps: 0 };
  }

  if (scene === 'victory') {
    state.mode = 'victory';
    state.wave = 10;
    state.score = 12480;
    state.kills = 214;
    state.stats.timePlayed = 742;
    state.stats.shots = 1830;
    state.stats.hits = 1492;
    state.player.hp = 64;
    state.player.level = 8;
    state.player.xp = 30;
    state.player.xpNeed = 78;
    state.lantern.flame = 58;
    state.lantern.maxFlame = LANTERN_STATS.maxFlame;
    state.time = 8.0;
    return { steps: 0 };
  }

  // Unknown scene name: fall back to the title.
  state.mode = 'title';
  return { steps: 0 };
}
