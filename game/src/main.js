// Emberkeep — the entry point: builds the game state, runs the fixed-step
// loop, and turns keys and clicks into mode changes (title -> playing ->
// level-up / pause -> game over / victory -> restart). In screenshot mode
// (?shot=<scene>&seed=<n>) it instead builds one deterministic scene,
// steps it a fixed number of times, renders once and raises
// window.__shotReady, so the screenshots are real renders of the game.

import { LANTERN, LANTERN_STATS, VIEW } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createSoundBank } from './audio.js';
import { createEffects } from './particles.js';
import { chooseUpgrades } from './upgrades.js';
import {
  createPlayerState,
  spawnEnemy,
  updateBullets,
  updateEnemies,
  updatePickups,
  updatePlayer,
  winGame,
} from './entities.js';
import { createDirector, updateDirector } from './waves.js';
import { cardRects, drawGame, generateDecor } from './render.js';
import { loadBest, saveBest } from './storage.js';
import { prepareShot, scriptedInputFor } from './shots.js';

const STEP = 1 / 60;

export function createState(seed) {
  const rng = makeRng(seed);
  const state = {
    rng,
    audio: createSoundBank(),
    fx: createEffects(),
    mode: 'title',
    time: 0,
    wave: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    player: createPlayerState(),
    lantern: { x: LANTERN.x, y: LANTERN.y, flame: LANTERN_STATS.maxFlame, maxFlame: LANTERN_STATS.maxFlame },
    enemies: [],
    bullets: [],
    enemyBullets: [],
    embers: [],
    hearts: [],
    director: createDirector(),
    choices: [],
    owned: {},
    pendingLevelUps: 0,
    pendingVictory: false,
    banner: null,
    endReason: null,
    stats: { shots: 0, hits: 0, damageDealt: 0, timePlayed: 0 },
    best: loadBest(),
    endless: false,
    muted: false,
    hoverCard: -1,
    decor: generateDecor(rng),
  };
  return state;
}

function resetRun(state) {
  state.mode = 'playing';
  state.time = 0;
  state.wave = 0;
  state.score = 0;
  state.kills = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.player = createPlayerState();
  state.lantern.flame = state.lantern.maxFlame;
  state.enemies = [];
  state.bullets = [];
  state.enemyBullets = [];
  state.embers = [];
  state.hearts = [];
  state.director = createDirector();
  state.choices = [];
  state.owned = {};
  state.pendingLevelUps = 0;
  state.pendingVictory = false;
  state.banner = null;
  state.endReason = null;
  state.stats = { shots: 0, hits: 0, damageDealt: 0, timePlayed: 0 };
  state.endless = false;
  state.hoverCard = -1;
  state.fx.clear();
}

function startGame(state) {
  state.audio.unlock();
  state.audio.startMusic();
  resetRun(state);
}

function openLevelUp(state) {
  state.choices = chooseUpgrades(state.rng, state.owned);
  state.mode = 'levelup';
  state.audio.levelUp();
}

function chooseUpgrade(state, index) {
  const choice = state.choices[index];
  if (!choice) return;
  choice.apply(state.player, state);
  state.owned[choice.id] = (state.owned[choice.id] ?? 0) + 1;
  state.audio.uiClick();
  state.fx.ring(state.player.x, state.player.y, choice.color, 220);
  state.mode = 'playing';
  state.choices = [];
}

function finishRun(state) {
  state.best = saveBest(state.score, state.wave);
}

export function stepGame(state, dt, input) {
  state.time += dt;
  state.fx.update(dt);
  if (state.banner) state.banner.timer -= dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  if (state.mode === 'title') {
    // The title screen is alive: the blight drifts in from the dark
    // around the lantern, but nothing can hurt anything yet.
    for (const enemy of state.enemies) {
      const dx = LANTERN.x - enemy.x;
      const dy = LANTERN.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / d) * 14 * dt;
      enemy.y += (dy / d) * 14 * dt;
      enemy.wobble += dt * 2;
    }
    return;
  }
  if (state.mode !== 'playing') return;

  state.stats.timePlayed += dt;
  updateDirector(state, dt);
  updatePlayer(state, dt, input);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updatePickups(state, dt);

  if (state.mode === 'gameover') {
    finishRun(state);
    return;
  }
  if (state.pendingVictory && state.mode === 'playing') {
    state.pendingVictory = false;
    winGame(state);
    finishRun(state);
    return;
  }
  if (state.pendingLevelUps > 0 && state.mode === 'playing') {
    state.pendingLevelUps -= 1;
    openLevelUp(state);
  }
}

function handleKeys(state, input) {
  if (input.wasPressed('KeyM')) {
    state.muted = state.audio.toggleMute();
  }
  if (state.mode === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed('Space')) startGame(state);
  } else if (state.mode === 'playing') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) state.mode = 'paused';
  } else if (state.mode === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) state.mode = 'playing';
  } else if (state.mode === 'levelup') {
    if (input.wasPressed('Digit1')) chooseUpgrade(state, 0);
    if (input.wasPressed('Digit2')) chooseUpgrade(state, 1);
    if (input.wasPressed('Digit3')) chooseUpgrade(state, 2);
  } else if (state.mode === 'gameover') {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter')) startGame(state);
  } else if (state.mode === 'victory') {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter')) startGame(state);
    if (input.wasPressed('KeyC')) {
      // Keep going into the endless night past the dawn.
      state.endless = true;
      state.mode = 'playing';
      state.director.phase = 'intermission';
      state.director.timer = 3;
      state.audio.uiClick();
    }
  }
}

function handleClick(state, input, wasDown) {
  const nowDown = input.mouse.down;
  if (!wasDown && nowDown) {
    if (state.mode === 'title') {
      startGame(state);
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
    } else if (state.mode === 'levelup') {
      const rects = cardRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (
          input.mouse.x >= r.x && input.mouse.x <= r.x + r.w &&
          input.mouse.y >= r.y && input.mouse.y <= r.y + r.h
        ) {
          chooseUpgrade(state, i);
          break;
        }
      }
    }
  }
  return nowDown;
}

function updateHover(state, input) {
  if (state.mode !== 'levelup') {
    state.hoverCard = -1;
    return;
  }
  const rects = cardRects();
  state.hoverCard = -1;
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (
      input.mouse.x >= r.x && input.mouse.x <= r.x + r.w &&
      input.mouse.y >= r.y && input.mouse.y <= r.y + r.h
    ) {
      state.hoverCard = i;
      break;
    }
  }
}

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') ?? '1') || 1;
  const state = createState(seed);
  window.__game = state;

  if (shot) {
    // Deterministic screenshot mode: build the scene, step it a fixed
    // number of times with a scripted input, render once.
    const plan = prepareShot(state, shot, seed);
    const scripted = scriptedInputFor(state, shot);
    for (let i = 0; i < plan.steps; i++) stepGame(state, STEP, scripted);
    drawGame(ctx, state, scripted);
    window.__shotReady = true;
    return;
  }

  // A few wisps drift around the title screen so it is never still.
  const titleRng = makeRng(20261116);
  for (let i = 0; i < 5; i++) {
    const a = titleRng.angle();
    const r = 260 + titleRng.range(0, 160);
    const kind = titleRng.pick(['wisp', 'mite', 'wisp', 'crawler']);
    spawnEnemy(state, kind, LANTERN.x + Math.cos(a) * r, LANTERN.y + Math.sin(a) * r);
  }

  let last = performance.now();
  let acc = 0;
  let mouseWasDown = false;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    handleKeys(state, input);
    mouseWasDown = handleClick(state, input, mouseWasDown);
    updateHover(state, input);
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      stepGame(state, STEP, input);
      acc -= STEP;
      steps += 1;
    }
    if (steps === 5) acc = 0;
    drawGame(ctx, state, input);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
