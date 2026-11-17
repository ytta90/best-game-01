// EMBERFALL — the game loop and state machine.
// Modes: title → playing ⇄ levelup ⇄ paused → gameover | victory.
// The loop runs a fixed 60 Hz step; rendering is separate so a frame never
// changes the simulation. Shot scenes (?shot=title|play|levelup|victory|boss)
// build a deterministic moment and freeze it for the screenshot.

import { VIEW_W, VIEW_H, ARENA } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { Particles } from './particles.js';
import { Combat } from './combat.js';
import { createPlayer, updatePlayer } from './player.js';
import { updateEnemy } from './enemies.js';
import { rollChoices, applyUpgrade } from './upgrades.js';
import { startWave, updateWaves, updatePickups, collidePillars } from './world.js';
import { drawGame } from './render.js';
import {
  drawHud, drawTitle, drawLevelUp, drawPaused, drawGameOver, drawVictory,
  levelUpCardRects,
} from './hud.js';
import { setupShot } from './shots.js';

const STEP = 1 / 60;

function loadBest() {
  try {
    return Number(window.localStorage.getItem('emberfall-best') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem('emberfall-best', String(score));
  } catch {
    // Best score is a nicety; a blocked store must not break the game.
  }
}

export function createState(seed) {
  const rng = makeRng(seed);
  const state = {
    mode: 'title',
    time: 0,
    elapsed: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    wave: 0,
    waveState: 'idle',
    waveQueue: [],
    spawnTimer: 0,
    spawnInterval: 1,
    breather: 0,
    banner: null,
    shake: 0,
    flash: 0,
    best: loadBest(),
    choices: [],
    boss: null,
    arena: { ...ARENA },
    rng,
    seed,
    shotMode: false,
    sfx: new Sfx(),
    particles: new Particles(),
    combat: Combat,
    player: null,
    enemies: [],
    bullets: [],
    ebullets: [],
    pickups: [],
    input: null,
  };
  state.player = createPlayer(VIEW_W / 2, VIEW_H / 2 + 40);
  state.particles.seedEmbers(rng, 46, VIEW_W, VIEW_H);
  return state;
}

function resetRun(state) {
  const seed = (Date.now() % 2147483647) || 7;
  state.rng = makeRng(seed);
  state.seed = seed;
  state.score = 0;
  state.kills = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.wave = 0;
  state.waveState = 'idle';
  state.waveQueue = [];
  state.enemies = [];
  state.bullets = [];
  state.ebullets = [];
  state.pickups = [];
  state.banner = null;
  state.shake = 0;
  state.flash = 0;
  state.boss = null;
  state.elapsed = 0;
  state.choices = [];
  state.player = createPlayer(VIEW_W / 2, VIEW_H / 2 + 40);
  state.particles = new Particles();
  state.particles.seedEmbers(state.rng, 46, VIEW_W, VIEW_H);
}

function startRun(state) {
  resetRun(state);
  state.mode = 'playing';
  state.sfx.unlock();
  state.sfx.startMusic();
  startWave(state, 1);
}

function gameOver(state) {
  if (state.mode === 'gameover') return;
  state.mode = 'gameover';
  state.sfx.stopMusic();
  state.sfx.gameover();
  state.shake = 12;
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.score);
  }
}

function win(state) {
  if (state.mode === 'victory') return;
  state.mode = 'victory';
  state.sfx.stopMusic();
  state.sfx.victory();
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.score);
  }
  for (let i = 0; i < 6; i++) {
    state.particles.burst(
      state.rng.range(300, 980), state.rng.range(150, 420),
      ['#ffd166', '#7ef0c1', '#5ee6e6'][i % 3], 20, 320, 1, 4,
    );
  }
}

function requestLevelUp(state) {
  if (state.shotMode) return;
  state.choices = rollChoices(state.rng, state.player, 3);
  state.mode = 'levelup';
  state.sfx.levelup();
}

function pickUpgrade(state, idx) {
  const u = state.choices[idx];
  if (!u) return;
  applyUpgrade(state, u);
  state.choices = [];
  state.mode = 'playing';
}

// One fixed simulation step while playing.
function stepPlaying(state, input, dt) {
  state.elapsed += dt;
  if (state.banner) {
    state.banner.t -= dt;
    if (state.banner.t <= 0) state.banner = null;
  }
  updatePlayer(state, input, dt);
  collidePillars(state.player);
  for (const e of state.enemies) {
    if (e.hp > 0) updateEnemy(state, e, dt);
  }
  for (const e of state.enemies) collidePillars(e);
  // Purge the dead (their kill rewards were handed out on the killing blow).
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].hp <= 0) state.enemies.splice(i, 1);
  }
  Combat.updateBullets(state, dt);
  Combat.updateOrbitals(state, dt);
  // Touch damage: any living enemy overlapping the player hurts.
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < e.radius + state.player.radius - 2) {
      Combat.damagePlayer(state, e.damage);
      // Push the enemy back a little so one touch is not a chain of hits.
      const nx = (e.x - state.player.x) / (d || 1);
      const ny = (e.y - state.player.y) / (d || 1);
      e.x += nx * 26;
      e.y += ny * 26;
      if (state.player.hp <= 0) break;
    }
  }
  updateWaves(state, dt);
  updatePickups(state, dt);
  state.particles.update(dt);
  state.particles.updateEmbers(dt, state.time, VIEW_W, VIEW_H);
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  state.sfx.music(dt);
}

// Visual-only steps for a frozen shot scene: things drift, nothing dies.
function stepVisual(state, dt) {
  state.particles.update(dt);
  state.particles.updateEmbers(dt, state.time, VIEW_W, VIEW_H);
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const p = state.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * 0.25 * dt;
    e.y += (dy / d) * e.speed * 0.25 * dt;
    e.wobble += dt * 2;
  }
  for (const b of state.bullets) {
    b.x += b.vx * dt * 0.4;
    b.y += b.vy * dt * 0.4;
  }
  if (state.banner) {
    state.banner.t -= dt;
    if (state.banner.t <= 0) state.banner = null;
  }
}

function handleModeInput(state, input) {
  const m = state.mode;
  if (input.hit('m')) {
    state.sfx.setMuted(!state.sfx.muted);
  }
  if (m === 'title') {
    if (input.hit('enter', ' ') || input.mouse.down) {
      input.mouse.down = false;
      startRun(state);
    }
    return;
  }
  if (m === 'playing') {
    if (input.hit('p', 'escape')) {
      state.mode = 'paused';
      state.sfx.stopMusic();
    }
    if (input.hit('r')) startRun(state);
    return;
  }
  if (m === 'levelup') {
    if (input.hit('1')) pickUpgrade(state, 0);
    else if (input.hit('2')) pickUpgrade(state, 1);
    else if (input.hit('3')) pickUpgrade(state, 2);
    else if (input.mouse.down) {
      const rects = levelUpCardRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (input.mouse.x >= r.x && input.mouse.x <= r.x + r.w
          && input.mouse.y >= r.y && input.mouse.y <= r.y + r.h) {
          pickUpgrade(state, i);
          break;
        }
      }
      input.mouse.down = false;
    }
    return;
  }
  if (m === 'paused') {
    if (input.hit('p', 'escape')) {
      state.mode = 'playing';
      state.sfx.startMusic();
    }
    if (input.hit('r')) startRun(state);
    return;
  }
  if (m === 'gameover' || m === 'victory') {
    if (input.hit('r', 'enter', ' ') || input.mouse.down) {
      input.mouse.down = false;
      startRun(state);
    }
  }
}

export function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || '7') || 7;

  const state = createState(shot ? seed : ((Date.now() % 2147483647) || 7));
  state.input = new Input(canvas);
  state.input.attach();
  state.gameOver = () => gameOver(state);
  state.win = () => win(state);
  state.requestLevelUp = () => requestLevelUp(state);

  // First gesture unlocks audio (browsers require it).
  const unlock = () => state.sfx.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  if (shot) {
    state.shotMode = true;
    setupShot(state, shot);
    // Run the scene forward a little so poses and particles settle.
    for (let i = 0; i < 24; i++) {
      state.time += STEP;
      stepVisual(state, STEP);
    }
    drawFrame(ctx, state);
    window.__shotReady = true;
    return state;
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      state.time += STEP;
      state.shake = Math.max(0, state.shake - STEP * 26);
      if (state.flash > 0) state.flash -= STEP;
      handleModeInput(state, state.input);
      if (state.mode === 'playing') {
        stepPlaying(state, state.input, STEP);
      } else if (state.mode === 'title') {
        state.particles.update(STEP);
        state.particles.updateEmbers(STEP, state.time, VIEW_W, VIEW_H);
        for (const e of state.enemies) {
          if (e.hp <= 0) continue;
          e.wobble += STEP * 2;
          e.x += Math.sin(state.time + e.wobble) * 12 * STEP;
          e.y += Math.cos(state.time * 0.7 + e.wobble) * 10 * STEP;
        }
      } else if (state.mode === 'levelup' || state.mode === 'paused'
        || state.mode === 'gameover' || state.mode === 'victory') {
        state.particles.update(STEP);
        state.particles.updateEmbers(STEP, state.time, VIEW_W, VIEW_H);
      }
      state.input.endFrame();
    }
    drawFrame(ctx, state);
  }
  requestAnimationFrame(frame);

  // Debug hook for the automated play-test (not part of the game UI).
  window.__emberfall = {
    state,
    startRun: () => startRun(state),
    startWave: (n) => startWave(state, n),
    setHp: (hp) => { state.player.hp = hp; },
    winNow: () => win(state),
    levelUpNow: () => requestLevelUp(state),
  };
  return state;
}

function drawFrame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const m = state.mode;
  if (m === 'title') {
    drawGame(ctx, state);
    drawTitle(ctx, state);
    return;
  }
  drawGame(ctx, state);
  if (m === 'playing' || m === 'paused') {
    drawHud(ctx, state);
    if (m === 'paused') drawPaused(ctx, state);
  } else if (m === 'levelup') {
    drawHud(ctx, state);
    drawLevelUp(ctx, state);
  } else if (m === 'gameover') {
    drawGameOver(ctx, state);
  } else if (m === 'victory') {
    drawVictory(ctx, state);
  }
}

boot();
