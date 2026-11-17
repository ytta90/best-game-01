// The player: the last flame. Movement, dash with i-frames, firing and
// levelling live here; the numbers come from config.js and upgrades.

import { PLAYER_BASE, xpForLevel } from './config.js';

export function createPlayer(x, y) {
  const p = { ...PLAYER_BASE };
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.aim = -Math.PI / 2;
  p.hp = p.maxHp;
  p.level = 1;
  p.xp = 0;
  p.xpNext = xpForLevel(1);
  p.fireTimer = 0;
  p.dashTimer = 0; // counts down while dashing
  p.dashCdLeft = 0;
  p.dashDir = { x: 1, y: 0 };
  p.invuln = 0;
  p.regenTimer = 0;
  p.novaTimer = 0;
  p.orbitalAngle = 0;
  p.trail = [];
  p.upgrades = {}; // id -> stacks taken
  p.facing = 1;
  return p;
}

export function updatePlayer(state, input, dt) {
  const p = state.player;
  const arena = state.arena;

  // Aim at the mouse, always.
  p.aim = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  // Dash: Space or Shift, in the movement direction (or the aim if idle).
  if (p.dashCdLeft > 0) p.dashCdLeft -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  const wantDash = input.hit(' ', 'shift');
  const mv = input.moveVector();
  if (wantDash && p.dashCdLeft <= 0 && p.dashTimer <= 0) {
    p.dashTimer = p.dashTime;
    p.dashCdLeft = p.dashCooldown;
    const dx = mv.x !== 0 || mv.y !== 0 ? mv.x : Math.cos(p.aim);
    const dy = mv.x !== 0 || mv.y !== 0 ? mv.y : Math.sin(p.aim);
    const len = Math.hypot(dx, dy) || 1;
    p.dashDir = { x: dx / len, y: dy / len };
    p.invuln = Math.max(p.invuln, p.dashTime + 0.05);
    state.sfx.dash();
    state.particles.burst(p.x, p.y, '#ffd166', 8, 180, 0.3, 3);
  }

  // Movement (dash overrides normal speed while it lasts).
  let speed = p.speed;
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    speed = p.dashSpeed;
    p.vx = p.dashDir.x * speed;
    p.vy = p.dashDir.y * speed;
  } else {
    p.vx = mv.x * speed;
    p.vy = mv.y * speed;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(arena.x + p.radius, Math.min(arena.x + arena.w - p.radius, p.x));
  p.y = Math.max(arena.y + p.radius, Math.min(arena.y + arena.h - p.radius, p.y));
  if (mv.x !== 0) p.facing = mv.x > 0 ? 1 : -1;

  // Dash trail for the eye.
  p.trail.push({ x: p.x, y: p.y, life: 0.22 });
  if (p.trail.length > 14) p.trail.shift();
  for (const t of p.trail) t.life -= dt;

  // Regeneration (Ember Heart).
  if (p.regenPerSec > 0 && p.hp < p.maxHp) {
    p.regenTimer += dt;
    const every = 1 / p.regenPerSec;
    while (p.regenTimer >= every) {
      p.regenTimer -= every;
      p.hp = Math.min(p.maxHp, p.hp + 1);
      state.particles.text(p.x, p.y - 24, '+1', '#7ef0c1', 14);
    }
  }

  // Frost nova ticks on its own clock.
  if (p.novaInterval > 0) {
    p.novaTimer += dt;
    if (p.novaTimer >= p.novaInterval) {
      p.novaTimer = 0;
      state.combat.fireNova(state);
    }
  }

  // Orbital blades spin.
  p.orbitalAngle += dt * 3.4;

  // Firing: hold the mouse button. Spread grows with projectile count.
  p.fireTimer -= dt;
  if (input.mouse.down && p.fireTimer <= 0) {
    p.fireTimer = 1 / p.fireRate;
    state.combat.firePlayerShots(state);
    state.sfx.shoot();
  }
}

// Award XP; returns true when a level-up is owed (the game pauses for it).
export function gainXp(state, amount) {
  const p = state.player;
  p.xp += amount;
  let leveled = false;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level += 1;
    p.xpNext = xpForLevel(p.level);
    leveled = true;
  }
  return leveled;
}
