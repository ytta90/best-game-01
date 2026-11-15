// Emberkeep — the wave director. Each wave is a budget of blight spent
// on a mix of kinds that grows nastier as the waves climb; boss waves
// spend the budget on the Ashen Warden instead. Between waves the grove
// breathes: a short intermission, a flame bonus, and the next banner.

import { ARENA, BOSS_WAVES, LANTERN_STATS, wavePointBudget, enemyCost } from './config.js';
import { spawnBoss, spawnEnemy, setBanner } from './entities.js';

const SPAWN_EDGE = 60;

function edgeSpawnPoint(state) {
  const side = state.rng.int(0, 3);
  const m = SPAWN_EDGE;
  if (side === 0) return { x: state.rng.range(ARENA.x, ARENA.x + ARENA.width), y: ARENA.y - m };
  if (side === 1) return { x: state.rng.range(ARENA.x, ARENA.x + ARENA.width), y: ARENA.y + ARENA.height + m };
  if (side === 2) return { x: ARENA.x - m, y: state.rng.range(ARENA.y, ARENA.y + ARENA.height) };
  return { x: ARENA.x + ARENA.width + m, y: state.rng.range(ARENA.y, ARENA.y + ARENA.height) };
}

function waveMix(wave, rng) {
  // Spend the wave's point budget on kinds the wave has unlocked.
  const unlocked = ['mite'];
  if (wave >= 2) unlocked.push('crawler');
  if (wave >= 3) unlocked.push('wisp');
  if (wave >= 4) unlocked.push('spitter');
  if (wave >= 6) unlocked.push('brute');
  const queue = [];
  let budget = wavePointBudget(wave);
  while (budget > 0) {
    const kind = rng.pick(unlocked);
    const cost = enemyCost(kind);
    if (cost > budget && queue.length > 0) break;
    queue.push(kind);
    budget -= cost;
  }
  // Shuffle so the wave never arrives in kind order.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export function createDirector() {
  return {
    phase: 'intermission', // 'intermission' | 'active' | 'cleared'
    timer: 2.5,
    queue: [],
    spawnTimer: 0,
    bossSpawned: false,
  };
}

export function startWave(state, wave) {
  const d = state.director;
  state.wave = wave;
  d.phase = 'active';
  d.bossSpawned = false;
  if (BOSS_WAVES.includes(wave)) {
    d.queue = waveMix(wave, state.rng).slice(0, 8);
    d.spawnTimer = 1.2;
    setBanner(state, `WAVE ${wave}`, 'something vast is coming');
    state.audio.waveHorn();
  } else {
    d.queue = waveMix(wave, state.rng);
    d.spawnTimer = 0.6;
    setBanner(state, `WAVE ${wave}`, wave === 1 ? 'the blight comes for the flame' : 'hold the grove');
    state.audio.waveHorn();
  }
}

export function updateDirector(state, dt) {
  const d = state.director;
  if (state.mode !== 'playing') return;

  if (d.phase === 'intermission') {
    d.timer -= dt;
    if (d.timer <= 0) startWave(state, state.wave + 1);
    return;
  }

  // Trickle the queue out over the wave, a little faster as waves climb.
  if (d.queue.length > 0) {
    d.spawnTimer -= dt;
    if (d.spawnTimer <= 0) {
      d.spawnTimer = Math.max(0.25, 1.1 - state.wave * 0.06);
      const kind = d.queue.shift();
      const at = edgeSpawnPoint(state);
      spawnEnemy(state, kind, at.x, at.y);
    }
  }

  // Boss waves: the Warden walks in once the first few mites are out.
  if (BOSS_WAVES.includes(state.wave) && !d.bossSpawned && d.queue.length <= 4) {
    d.bossSpawned = true;
    spawnBoss(state);
  }

  // The wave is cleared when the queue is empty, nothing is alive, and
  // no boss is standing. Then the grove breathes and the flame is fed.
  const alive = state.enemies.length > 0;
  if (d.queue.length === 0 && !alive && !state.boss) {
    const bonus = 100 + state.wave * 25;
    state.score += bonus;
    state.lantern.flame = Math.min(
      state.lantern.maxFlame,
      state.lantern.flame + LANTERN_STATS.waveClearBonus,
    );
    setBanner(state, `WAVE ${state.wave} CLEARED`, `+${bonus} score · the flame steadies`);
    state.audio.levelUp();
    d.phase = 'intermission';
    d.timer = 4;
    // The wave-10 boss is the win: clearing it ends the run in dawn.
    if (state.wave >= 10 && !state.endless) {
      state.pendingVictory = true;
    }
  }
}
