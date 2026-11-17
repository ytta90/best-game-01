// Enemies: six kinds, elites, and the wave-10 boss, the Pyre Lord.
// Each kind has its own movement and attack; the boss fights in three
// phases and gets meaner as its health bar falls.

import { ENEMY_KINDS, BOSS, scaleHp, scaleSpeed } from './config.js';

export function spawnEnemy(state, kind, x, y, elite = false) {
  const def = ENEMY_KINDS[kind];
  const wave = state.wave;
  const e = {
    kind,
    name: def.name,
    x, y,
    radius: def.radius * (elite ? 1.35 : 1),
    hp: scaleHp(def.hp, wave) * (elite ? 2.6 : 1),
    maxHp: scaleHp(def.hp, wave) * (elite ? 2.6 : 1),
    speed: scaleSpeed(def.speed, wave) * (elite ? 0.92 : 1),
    score: def.score * (elite ? 3 : 1),
    color: def.color,
    core: def.core,
    damage: def.damage,
    elite,
    shootTimer: def.shootEvery ? def.shootEvery * (0.6 + state.rng.next() * 0.8) : 0,
    wobble: state.rng.next() * Math.PI * 2,
    flash: 0,
    knockX: 0,
    knockY: 0,
    slowUntil: 0,
    slowFactor: 1,
  };
  state.enemies.push(e);
  return e;
}

export function spawnBoss(state) {
  const cx = state.arena.x + state.arena.w / 2;
  const cy = state.arena.y + 120;
  const b = {
    kind: 'boss',
    name: BOSS.name,
    x: cx, y: cy,
    radius: BOSS.radius,
    hp: BOSS.hp,
    maxHp: BOSS.hp,
    speed: BOSS.speed,
    score: BOSS.score,
    color: BOSS.color,
    core: BOSS.core,
    damage: BOSS.damage,
    elite: false,
    boss: true,
    phase: 1,
    shootTimer: 2.0,
    summonTimer: 6,
    chargeTimer: 5,
    charging: 0,
    chargeDir: { x: 0, y: 1 },
    flash: 0,
    knockX: 0,
    knockY: 0,
    slowUntil: 0,
    slowFactor: 1,
    wobble: 0,
  };
  state.enemies.push(b);
  state.boss = b;
  return b;
}

// Pick a spawn point on the arena edge, away from the player.
export function edgeSpawn(state) {
  const a = state.arena;
  const side = state.rng.int(0, 3);
  const m = 30;
  let x;
  let y;
  if (side === 0) { x = state.rng.range(a.x + m, a.x + a.w - m); y = a.y + m; }
  else if (side === 1) { x = state.rng.range(a.x + m, a.x + a.w - m); y = a.y + a.h - m; }
  else if (side === 2) { x = a.x + m; y = state.rng.range(a.y + m, a.y + a.h - m); }
  else { x = a.x + a.w - m; y = state.rng.range(a.y + m, a.y + a.h - m); }
  const p = state.player;
  if (Math.hypot(x - p.x, y - p.y) < 260) {
    x = a.x + a.w - (x - a.x);
    y = a.y + a.h - (y - a.y);
  }
  return { x, y };
}

function slowed(e, now) {
  return now < e.slowUntil ? e.slowFactor : 1;
}

export function updateEnemy(state, e, dt) {
  const p = state.player;
  const now = state.time;
  if (e.flash > 0) e.flash -= dt;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const sp = e.speed * slowed(e, now);

  if (e.kind === 'boss') {
    updateBoss(state, e, dt, nx, ny, dist);
  } else if (e.kind === 'spitter') {
    // Hold a middle distance and shoot.
    if (dist > 380) { e.x += nx * sp * dt; e.y += ny * sp * dt; }
    else if (dist < 280) { e.x -= nx * sp * 0.6 * dt; e.y -= ny * sp * 0.6 * dt; }
    else { e.x += -ny * sp * 0.4 * dt; e.y += nx * sp * 0.4 * dt; }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && dist < 460) {
      e.shootTimer = ENEMY_KINDS.spitter.shootEvery * (0.9 + state.rng.next() * 0.3);
      state.combat.fireEnemyShot(state, e, nx, ny);
    }
  } else if (e.kind === 'wisp') {
    // Sine drift toward the player.
    e.wobble += dt * 3.2;
    const px = -ny * Math.sin(e.wobble) * 0.7;
    const py = nx * Math.sin(e.wobble) * 0.7;
    e.x += (nx + px) * sp * dt;
    e.y += (ny + py) * sp * dt;
  } else if (e.kind === 'brute') {
    // Plods in, with a short lunge every few seconds.
    e.wobble += dt;
    const lunge = (e.wobble % 3.4) > 3.0 ? 1.9 : 1;
    e.x += nx * sp * lunge * dt;
    e.y += ny * sp * lunge * dt;
  } else {
    // Cinder, dart, spark, splitter: straight chase.
    e.x += nx * sp * dt;
    e.y += ny * sp * dt;
  }

  // Knockback decay.
  e.x += e.knockX * dt;
  e.y += e.knockY * dt;
  e.knockX *= Math.pow(0.001, dt);
  e.knockY *= Math.pow(0.001, dt);

  // Stay inside the arena.
  const a = state.arena;
  e.x = Math.max(a.x + e.radius, Math.min(a.x + a.w - e.radius, e.x));
  e.y = Math.max(a.y + e.radius, Math.min(a.y + a.h - e.radius, e.y));
}

function updateBoss(state, b, dt, nx, ny, dist) {
  const p = state.player;
  const frac = b.hp / b.maxHp;
  const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (phase !== b.phase) {
    b.phase = phase;
    state.particles.shockwave(b.x, b.y, '#ff3d5e', 260, 0.6);
    state.particles.text(b.x, b.y - 60, phase === 2 ? 'THE PYRE RAGES' : 'THE PYRE BURNS', '#ff5d73', 22);
    state.sfx.boss();
    state.shake = Math.max(state.shake, 10);
  }

  // Phase 3 charges at the player.
  if (b.phase === 3) {
    b.chargeTimer -= dt;
    if (b.charging > 0) {
      b.charging -= dt;
      b.x += b.chargeDir.x * 460 * dt;
      b.y += b.chargeDir.y * 460 * dt;
      state.particles.burst(b.x, b.y, '#ff3d5e', 2, 120, 0.3, 3);
    } else if (b.chargeTimer <= 0) {
      b.chargeTimer = 4.2;
      b.charging = 0.55;
      b.chargeDir = { x: nx, y: ny };
      state.sfx.dash();
    } else {
      b.x += nx * b.speed * 0.7 * dt;
      b.y += ny * b.speed * 0.7 * dt;
    }
  } else {
    // Slow chase.
    b.x += nx * b.speed * dt;
    b.y += ny * b.speed * dt;
  }

  // Radial fire, faster in later phases.
  b.shootTimer -= dt;
  const every = b.phase === 1 ? 2.4 : b.phase === 2 ? 1.9 : 1.5;
  if (b.shootTimer <= 0) {
    b.shootTimer = every;
    const n = b.phase === 1 ? 8 : b.phase === 2 ? 12 : 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + state.time * 0.3;
      state.combat.fireEnemyShot(state, b, Math.cos(a), Math.sin(a), 190);
    }
    state.sfx.shoot();
  }

  // Phase 2+ summons cinders.
  if (b.phase >= 2) {
    b.summonTimer -= dt;
    if (b.summonTimer <= 0) {
      b.summonTimer = 6.5;
      for (let i = 0; i < 3; i++) {
        const a = state.rng.angle();
        spawnEnemy(state, 'cinder', b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 70);
      }
      state.particles.burst(b.x, b.y, '#ff7a2f', 16, 200, 0.5, 4);
    }
  }

  // Keep the boss inside the arena.
  const a = state.arena;
  b.x = Math.max(a.x + b.radius, Math.min(a.x + a.w - b.radius, b.x));
  b.y = Math.max(a.y + b.radius, Math.min(a.y + a.h - b.radius, b.y));
}
