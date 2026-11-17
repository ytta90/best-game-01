// The world: the arena, its four ember pillars, the wave manager and the
// pickups (gems and hearts) that litter the floor after a fight.

import { WAVES, ARENA } from './config.js';
import { spawnEnemy, spawnBoss, edgeSpawn } from './enemies.js';
import { gainXp } from './player.js';

export const PILLARS = [
  { x: 300, y: 190, w: 46, h: 46 },
  { x: 934, y: 190, w: 46, h: 46 },
  { x: 300, y: 484, w: 46, h: 46 },
  { x: 934, y: 484, w: 46, h: 46 },
];

// Circle-vs-rectangle push-out, used for the player and the enemies.
export function collidePillars(ent) {
  for (const pl of PILLARS) {
    const cx = Math.max(pl.x, Math.min(ent.x, pl.x + pl.w));
    const cy = Math.max(pl.y, Math.min(ent.y, pl.y + pl.h));
    const dx = ent.x - cx;
    const dy = ent.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < ent.radius && d > 0.001) {
      const push = (ent.radius - d) / d;
      ent.x += dx * push;
      ent.y += dy * push;
    } else if (d <= 0.001) {
      ent.y -= ent.radius;
    }
  }
}

export function buildWaveQueue(state, n) {
  const def = WAVES[n - 1];
  const q = [];
  for (const [kind, count] of Object.entries(def)) {
    if (kind === 'interval' || kind === 'eliteChance' || kind === 'boss') continue;
    for (let i = 0; i < count; i++) q.push(kind);
  }
  return state.rng.shuffle(q);
}

export function startWave(state, n) {
  state.wave = n;
  state.waveState = 'spawning';
  state.waveQueue = buildWaveQueue(state, n);
  state.spawnTimer = 0.6;
  state.spawnInterval = WAVES[n - 1].interval;
  state.boss = null;
  if (n === 10) {
    spawnBoss(state);
    state.banner = { title: 'WAVE 10 — THE PYRE LORD', sub: 'Bring down the boss to win', t: 3 };
    state.sfx.boss();
    state.shake = Math.max(state.shake, 8);
  } else {
    state.banner = { title: `WAVE ${n}`, sub: waveSubtitle(n), t: 2.4 };
    state.sfx.wave();
  }
}

function waveSubtitle(n) {
  const lines = [
    '',
    'The embers stir.',
    'They come faster now.',
    'Something spits from the dark.',
    'The swarm splits and reforms.',
    'The dark learns new shapes.',
    'Hold the line. The flame depends on it.',
    'Elites walk among them.',
    'The horde does not tire. Neither do you.',
    '',
  ];
  return lines[n] || 'Defend the flame.';
}

export function updateWaves(state, dt) {
  if (state.waveState === 'spawning') {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.waveQueue.length > 0) {
      state.spawnTimer = state.spawnInterval;
      const kind = state.waveQueue.shift();
      const pos = edgeSpawn(state);
      const elite = state.rng.chance(WAVES[state.wave - 1].eliteChance || 0);
      spawnEnemy(state, kind, pos.x, pos.y, elite);
    }
    if (state.waveQueue.length === 0 && state.enemies.length === 0) {
      waveCleared(state);
    } else if (state.waveQueue.length === 0) {
      state.waveState = 'fighting';
    }
  } else if (state.waveState === 'fighting') {
    if (state.enemies.length === 0) waveCleared(state);
  } else if (state.waveState === 'breather') {
    state.breather -= dt;
    if (state.breather <= 0) {
      startWave(state, state.wave + 1);
    }
  }
}

function waveCleared(state) {
  if (state.wave >= 10) {
    // The boss is dead: victory. (waveState 'fighting' with no boss left.)
    if (!state.boss || state.boss.hp <= 0) {
      state.win();
      return;
    }
  }
  state.waveState = 'breather';
  state.breather = 3;
  state.banner = { title: `WAVE ${state.wave} CLEARED`, sub: 'Catch your breath — the next wave is coming', t: 2.4 };
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
  state.particles.text(state.player.x, state.player.y - 30, '+1 HP', '#ff5d73', 15);
}

export function updatePickups(state, dt) {
  const p = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.t += dt;
    // Fresh gems scatter, then settle.
    pk.x += (pk.vx || 0) * dt;
    pk.y += (pk.vy || 0) * dt;
    pk.vx = (pk.vx || 0) * Math.pow(0.02, dt);
    pk.vy = (pk.vy || 0) * Math.pow(0.02, dt);
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    // Magnet: gems drift toward the player inside the pickup radius.
    if (d < p.magnet) {
      const pull = 420 * (1 - d / p.magnet) + 160;
      pk.x += ((p.x - pk.x) / (d || 1)) * pull * dt;
      pk.y += ((p.y - pk.y) / (d || 1)) * pull * dt;
    }
    if (d < p.radius + 14) {
      if (pk.kind === 'gem') {
        state.pickups.splice(i, 1);
        state.sfx.pickup();
        if (gainXp(state, pk.value)) {
          state.requestLevelUp();
        }
      } else if (pk.kind === 'heart') {
        state.pickups.splice(i, 1);
        p.hp = Math.min(p.maxHp, p.hp + 1);
        state.sfx.heart();
        state.particles.text(p.x, p.y - 26, '+1 HP', '#ff5d73', 15);
      }
    }
  }
}

export { ARENA };
