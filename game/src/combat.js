// Combat: player shots, enemy shots, the nova, orbital blades, and every
// collision that matters. Damage numbers and kill rewards are handed out
// here so the rest of the game never counts a kill twice.

import { ENEMY_KINDS } from './config.js';
import { spawnEnemy } from './enemies.js';

function spawnBullet(state, x, y, vx, vy, damage, pierce, radius, friendly) {
  const b = {
    x, y, vx, vy, damage, pierce, radius, friendly,
    life: 1.6, hit: new Set(),
  };
  (friendly ? state.bullets : state.ebullets).push(b);
  return b;
}

export const Combat = {
  // The player's spread shot, aimed at the mouse.
  firePlayerShots(state) {
    const p = state.player;
    const n = p.projectiles;
    const spread = 0.14;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      const a = p.aim + off;
      const mx = p.x + Math.cos(a) * (p.radius + 8);
      const my = p.y + Math.sin(a) * (p.radius + 8);
      spawnBullet(state, mx, my, Math.cos(a) * p.bulletSpeed, Math.sin(a) * p.bulletSpeed,
        p.bulletDamage, p.pierce, p.bulletRadius, true);
    }
    state.particles.burst(p.x + Math.cos(p.aim) * 22, p.y + Math.sin(p.aim) * 22, '#ffd166', 2, 90, 0.18, 2);
  },

  // One enemy shot (spitter, boss). Speed is per-kind.
  fireEnemyShot(state, e, nx, ny, speed = 0) {
    const def = ENEMY_KINDS[e.kind] || {};
    const s = speed || def.shootSpeed || 230;
    spawnBullet(state, e.x + nx * (e.radius + 6), e.y + ny * (e.radius + 6),
      nx * s, ny * s, e.damage, 0, 6, false);
  },

  // Frost Nova: slows everything near the player and chips it.
  fireNova(state) {
    const p = state.player;
    const R = 260;
    state.particles.shockwave(p.x, p.y, '#5ee6e6', R, 0.55);
    state.sfx.nova();
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < R + e.radius) {
        e.slowUntil = state.time + 3;
        e.slowFactor = 0.45;
        this.damageEnemy(state, e, 10, 0, 0);
      }
    }
  },

  // Orbital spark blades: passive damage to anything they touch.
  updateOrbitals(state, dt) {
    const p = state.player;
    if (p.orbitals <= 0) return;
    const R = 74;
    for (let i = 0; i < p.orbitals; i++) {
      const a = p.orbitalAngle + (i / p.orbitals) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * R;
      const oy = p.y + Math.sin(a) * R;
      for (const e of state.enemies) {
        const d = Math.hypot(e.x - ox, e.y - oy);
        if (d < e.radius + 12) {
          this.damageEnemy(state, e, 16 * dt * 4, Math.cos(a) * 60, Math.sin(a) * 60);
        }
      }
    }
  },

  // A bullet hits an enemy: damage, knockback, flash, maybe a kill.
  damageEnemy(state, e, dmg, kx, ky) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    e.flash = 0.09;
    e.knockX += kx;
    e.knockY += ky;
    if (e.hp <= 0) this.killEnemy(state, e);
  },

  killEnemy(state, e) {
    e.hp = 0;
    const mult = Math.min(state.player.comboCap, 1 + Math.floor(state.combo / 4));
    const gained = e.score * mult;
    state.score += gained;
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = state.player.comboWindow;
    state.particles.burst(e.x, e.y, e.color, e.boss ? 46 : 14, e.boss ? 420 : 260, 0.6, e.boss ? 6 : 4);
    state.particles.text(e.x, e.y - e.radius - 6, `+${gained}`, '#ffd166', e.boss ? 24 : 14);
    if (e.boss) {
      state.particles.shockwave(e.x, e.y, '#ffd166', 320, 0.9);
      state.shake = Math.max(state.shake, 16);
      state.sfx.victory();
    } else {
      state.sfx.die();
      state.shake = Math.max(state.shake, 2.5);
    }
    // Gems: one per 20 base score, at least one; elites and the boss rain.
    const gems = e.boss ? 30 : e.elite ? 8 : Math.max(1, Math.round(e.score / 50));
    for (let i = 0; i < gems; i++) {
      const a = state.rng.angle();
      const d = state.rng.range(6, 42);
      state.pickups.push({
        kind: 'gem', x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d,
        vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, value: 1, t: 0,
      });
    }
    // A rare heart from anything that is not a spark.
    if (e.kind !== 'spark' && state.rng.chance(e.boss ? 1 : 0.03)) {
      state.pickups.push({
        kind: 'heart', x: e.x, y: e.y, vx: 0, vy: 0, value: 1, t: 0,
      });
    }
    // Splitters break into sparks.
    if (e.kind === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const a = state.rng.angle();
        spawnEnemy(state, 'spark', e.x + Math.cos(a) * 16, e.y + Math.sin(a) * 16);
      }
    }
  },

  // An enemy touches the player.
  damagePlayer(state, dmg) {
    const p = state.player;
    if (p.invuln > 0 || p.hp <= 0) return;
    p.hp -= dmg;
    p.invuln = 0.9;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = Math.max(state.shake, 9);
    state.flash = 0.22;
    state.sfx.hurt();
    state.particles.burst(p.x, p.y, '#ff5d73', 18, 300, 0.5, 4);
    if (p.hp <= 0) {
      p.hp = 0;
      state.gameOver();
    }
  },

  updateBullets(state, dt) {
    const a = state.arena;
    // Friendly bullets.
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.life <= 0
        || b.x < a.x || b.x > a.x + a.w || b.y < a.y || b.y > a.y + a.h;
      if (!dead) {
        for (const e of state.enemies) {
          if (e.hp <= 0 || b.hit.has(e)) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < e.radius + b.radius) {
            b.hit.add(e);
            const kb = 140;
            this.damageEnemy(state, e, b.damage, (b.vx / 640) * kb, (b.vy / 640) * kb);
            state.particles.burst(b.x, b.y, '#ffe9a8', 3, 120, 0.2, 2);
            state.sfx.hit();
            if (b.pierce > 0) {
              b.pierce -= 1;
            } else {
              dead = true;
            }
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }
    // Enemy bullets.
    for (let i = state.ebullets.length - 1; i >= 0; i--) {
      const b = state.ebullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.life <= 0
        || b.x < a.x || b.x > a.x + a.w || b.y < a.y || b.y > a.y + a.h;
      if (!dead) {
        const p = state.player;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < p.radius + b.radius) {
          this.damagePlayer(state, b.damage);
          dead = true;
        }
      }
      if (dead) state.ebullets.splice(i, 1);
    }
  },
};
