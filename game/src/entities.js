// Emberkeep — the living things: the keeper, the blight, the bolts and
// the embers. Every update here takes the whole game state and a fixed
// delta, so the simulation is the same whether it runs live or in a
// deterministic screenshot scene.

import { ARENA, BOSS_WAVES, ENEMIES, LANTERN, LANTERN_STATS, PLAYER, WIN_WAVE, comboMultiplier, xpNeededFor } from './config.js';
import { clamp, distanceSq } from './random.js';

export function createPlayerState() {
  return {
    x: LANTERN.x,
    y: LANTERN.y + 150,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireRate: PLAYER.fireRate,
    damage: PLAYER.damage,
    bulletSpeed: PLAYER.bulletSpeed,
    projectiles: PLAYER.projectiles,
    pierce: PLAYER.pierce,
    critChance: PLAYER.critChance,
    magnetRadius: PLAYER.magnetRadius,
    fireCooldown: 0,
    hurtTimer: 0,
    aimAngle: -Math.PI / 2,
    level: 1,
    xp: 0,
    xpNeed: xpNeededFor(1),
    novaLevel: 0,
    chillLevel: 0,
    novaTimer: 6,
  };
}

export function spawnEnemy(state, kind, x, y) {
  const base = ENEMIES[kind];
  const scale = 1 + (state.wave - 1) * 0.06;
  const enemy = {
    kind,
    x, y,
    vx: 0, vy: 0,
    hp: Math.round(base.hp * scale),
    maxHp: Math.round(base.hp * scale),
    radius: base.radius,
    speed: base.speed * state.rng.range(0.9, 1.1),
    damage: base.damage,
    score: base.score,
    embers: base.embers,
    color: base.color,
    latched: false,
    slowTimer: 0,
    wobble: state.rng.range(0, Math.PI * 2),
    shootTimer: state.rng.range(1.2, 2.4),
    summonTimer: 5,
    burstTimer: 3,
    flash: 0,
    touchTimer: 0,
    dead: false,
  };
  state.enemies.push(enemy);
  return enemy;
}

export function spawnBoss(state) {
  const boss = spawnEnemy(state, 'boss', LANTERN.x, -70);
  boss.hp = Math.round(ENEMIES.boss.hp * (1 + (state.wave - 1) * 0.12));
  boss.maxHp = boss.hp;
  state.boss = boss;
  state.audio.bossRoar();
  state.fx.shake(0.6);
  state.fx.ring(boss.x, boss.y, '#d8b13c', 420);
  setBanner(state, 'THE ASHEN WARDEN', 'break its crown — protect the flame');
  return boss;
}

export function setBanner(state, text, sub = '', seconds = 2.6) {
  state.banner = { text, sub, timer: seconds };
}

function nearestTarget(state, enemy) {
  const p = state.player;
  const dPlayer = distanceSq(enemy.x, enemy.y, p.x, p.y);
  const dLantern = distanceSq(enemy.x, enemy.y, LANTERN.x, LANTERN.y);
  return dPlayer < dLantern ? p : LANTERN;
}

export function updatePlayer(state, dt, input) {
  const p = state.player;
  p.hurtTimer = Math.max(0, p.hurtTimer - dt);
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);

  // Movement: WASD or arrows, normalized so diagonals are not faster.
  let mx = input.moveX();
  let my = input.moveY();
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    p.x = clamp(p.x + mx * p.speed * dt, ARENA.x + 14, ARENA.x + ARENA.width - 14);
    p.y = clamp(p.y + my * p.speed * dt, ARENA.y + 14, ARENA.y + ARENA.height - 14);
    if (state.rng.chance(dt * 22)) state.fx.emberTrail(p.x, p.y + 10);
  }

  // Aim at the mouse; fire while the button or Space is held.
  p.aimAngle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
  if (input.firing() && p.fireCooldown <= 0) {
    fireBolt(state);
    p.fireCooldown = 1 / p.fireRate;
  }

  // Ember Nova: a burning ring erupts around the keeper on a timer.
  if (p.novaLevel > 0) {
    p.novaTimer -= dt;
    if (p.novaTimer <= 0) {
      p.novaTimer = 6;
      const radius = 130 + p.novaLevel * 45;
      const damage = 26 + p.novaLevel * 16;
      state.audio.nova();
      state.fx.ring(p.x, p.y, '#ff5c8a', radius * 2.4);
      state.fx.shake(0.25);
      for (const enemy of state.enemies) {
        if (distanceSq(enemy.x, enemy.y, p.x, p.y) < radius * radius) {
          damageEnemy(state, enemy, damage, { silent: true });
        }
      }
    }
  }
}

function fireBolt(state) {
  const p = state.player;
  const count = p.projectiles;
  const spread = 0.09;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spread;
    const angle = p.aimAngle + offset;
    const crit = state.rng.chance(p.critChance);
    state.bullets.push({
      x: p.x + Math.cos(angle) * 20,
      y: p.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * p.bulletSpeed,
      vy: Math.sin(angle) * p.bulletSpeed,
      radius: PLAYER.bulletRadius,
      damage: p.damage * (crit ? 2 : 1),
      pierceLeft: p.pierce,
      crit,
      life: 1.1,
      hitSet: new Set(),
    });
  }
  state.stats.shots += count;
  state.audio.shoot();
  state.fx.emberTrail(p.x + Math.cos(p.aimAngle) * 22, p.y + Math.sin(p.aimAngle) * 22);
}

export function updateBullets(state, dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.x > 1280 || b.y < 0 || b.y > 720) {
      state.bullets.splice(i, 1);
      continue;
    }
    for (const enemy of state.enemies) {
      if (enemy.dead || b.hitSet.has(enemy)) continue;
      const rr = b.radius + enemy.radius;
      if (distanceSq(b.x, b.y, enemy.x, enemy.y) < rr * rr) {
        b.hitSet.add(enemy);
        state.stats.hits += 1;
        state.stats.damageDealt += b.damage;
        damageEnemy(state, enemy, b.damage, { crit: b.crit });
        state.audio.hit();
        state.fx.burst(b.x, b.y, { count: 4, color: '#ffd27a', speed: 120, size: 3, life: 0.3 });
        if (b.pierceLeft > 0) {
          b.pierceLeft -= 1;
        } else {
          state.bullets.splice(i, 1);
        }
        break;
      }
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const b = state.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const p = state.player;
    const rr = b.radius + 14;
    if (distanceSq(b.x, b.y, p.x, p.y) < rr * rr) {
      hurtPlayer(state, b.damage);
      state.enemyBullets.splice(i, 1);
      continue;
    }
    if (b.life <= 0 || b.x < 0 || b.x > 1280 || b.y < 0 || b.y > 720) {
      state.enemyBullets.splice(i, 1);
    }
  }
}

export function damageEnemy(state, enemy, damage, { crit = false, silent = false } = {}) {
  if (enemy.dead) return;
  enemy.hp -= damage;
  enemy.flash = 0.09;
  if (state.player.chillLevel > 0) enemy.slowTimer = 1;
  if (crit) state.fx.text(enemy.x, enemy.y - enemy.radius - 6, `${Math.round(damage)}!`, '#ffd27a', 18);
  if (!silent) state.fx.burst(enemy.x, enemy.y, { count: 2, color: enemy.color, speed: 90, size: 3, life: 0.25 });
  if (enemy.hp <= 0) killEnemy(state, enemy);
}

function killEnemy(state, enemy) {
  enemy.dead = true;
  const mult = comboMultiplier(state.combo);
  const gained = enemy.score * mult;
  state.score += gained;
  state.kills += 1;
  state.combo += 1;
  state.comboTimer = 3;
  state.fx.text(enemy.x, enemy.y - enemy.radius - 4, `+${gained}`, '#ffe9a8', enemy.kind === 'boss' ? 26 : 15);
  state.fx.burst(enemy.x, enemy.y, { count: enemy.kind === 'boss' ? 60 : 16, color: enemy.color, speed: 220, size: 5, life: 0.7 });
  state.fx.ring(enemy.x, enemy.y, enemy.color, 200);
  if (enemy.kind === 'boss') {
    state.audio.bruteDie();
    state.fx.shake(1);
    state.boss = null;
    state.fx.burst(enemy.x, enemy.y, { count: 40, color: '#ffd27a', speed: 300, size: 6, life: 1 });
  } else if (enemy.kind === 'brute') {
    state.audio.bruteDie();
    state.fx.shake(0.35);
  } else {
    state.audio.enemyDie();
  }
  // Embers scatter out of the fallen blight.
  for (let i = 0; i < enemy.embers; i++) {
    const a = state.rng.angle();
    state.embers.push({
      x: enemy.x, y: enemy.y,
      vx: Math.cos(a) * state.rng.range(40, 140),
      vy: Math.sin(a) * state.rng.range(40, 140),
      value: 1, life: 14,
    });
  }
  // Brutes and spitters sometimes drop a heartwood heart.
  if ((enemy.kind === 'brute' || enemy.kind === 'crawler') && state.rng.chance(0.12)) {
    state.hearts.push({ x: enemy.x, y: enemy.y, vx: 0, vy: 0, value: 25, life: 12 });
  }
}

export function hurtPlayer(state, damage) {
  const p = state.player;
  if (p.hurtTimer > 0 || state.mode !== 'playing') return;
  p.hp -= damage;
  p.hurtTimer = PLAYER.hurtCooldown;
  state.combo = 0;
  state.audio.playerHurt();
  state.fx.shake(0.45);
  state.fx.burst(p.x, p.y, { count: 14, color: '#ff5c5c', speed: 180, size: 4, life: 0.5 });
  if (p.hp <= 0) {
    p.hp = 0;
    endGame(state, 'fallen');
  }
}

export function endGame(state, reason) {
  if (state.mode === 'gameover' || state.mode === 'victory') return;
  state.mode = 'gameover';
  state.endReason = reason;
  state.audio.gameOver();
  state.fx.shake(0.7);
}

export function winGame(state) {
  if (state.mode === 'victory') return;
  state.mode = 'victory';
  state.audio.victory();
  state.fx.ring(LANTERN.x, LANTERN.y, '#ffd27a', 500);
  state.fx.burst(LANTERN.x, LANTERN.y, { count: 50, color: '#ffd27a', speed: 260, size: 5, life: 1.2 });
}

export function updateEnemies(state, dt) {
  const p = state.player;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.touchTimer = Math.max(0, enemy.touchTimer - dt);
    const slow = enemy.slowTimer > 0 ? 0.7 : 1;
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    enemy.wobble += dt * 3;

    if (enemy.kind === 'spitter') {
      // Spitters keep their distance and spit ember globs at the keeper.
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const want = 260;
      const dir = dist > want + 40 ? 1 : dist < want - 40 ? -1 : 0;
      enemy.x += (dx / dist) * enemy.speed * slow * dir * dt;
      enemy.y += (dy / dist) * enemy.speed * slow * dir * dt;
      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0 && dist < 520) {
        enemy.shootTimer = 2.3;
        const speed = 210;
        state.enemyBullets.push({
          x: enemy.x, y: enemy.y,
          vx: (dx / dist) * speed, vy: (dy / dist) * speed,
          radius: 7, damage: 10, life: 3,
        });
        state.fx.burst(enemy.x, enemy.y, { count: 5, color: '#7fce5a', speed: 80, size: 3, life: 0.3 });
      }
    } else if (enemy.kind === 'boss') {
      // The Ashen Warden stalks the keeper, bursts radial fire and
      // calls mites to its side; under half health it hurries.
      const enraged = enemy.hp < enemy.maxHp / 2;
      const speed = enemy.speed * (enraged ? 1.7 : 1) * slow;
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / dist) * speed * dt;
      enemy.y += (dy / dist) * speed * dt;
      enemy.burstTimer -= dt;
      if (enemy.burstTimer <= 0) {
        enemy.burstTimer = enraged ? 2.6 : 3.8;
        const shots = enraged ? 14 : 10;
        for (let i = 0; i < shots; i++) {
          const a = (i / shots) * Math.PI * 2 + state.rng.range(-0.1, 0.1);
          state.enemyBullets.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(a) * 170, vy: Math.sin(a) * 170,
            radius: 8, damage: 12, life: 4,
          });
        }
        state.audio.bossRoar();
        state.fx.ring(enemy.x, enemy.y, '#d8b13c', 320);
      }
      enemy.summonTimer -= dt;
      if (enemy.summonTimer <= 0) {
        enemy.summonTimer = 7;
        for (let i = 0; i < 3; i++) {
          const a = state.rng.angle();
          spawnEnemy(state, 'mite', enemy.x + Math.cos(a) * 70, enemy.y + Math.sin(a) * 70);
        }
        state.fx.burst(enemy.x, enemy.y, { count: 20, color: '#d8b13c', speed: 160, size: 4, life: 0.6 });
      }
    } else {
      // Mites, crawlers, wisps and brutes hunt the nearer of the keeper
      // and the lantern; wisps weave as they go.
      const target = nearestTarget(state, enemy);
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      let ax = dx / dist;
      let ay = dy / dist;
      if (enemy.kind === 'wisp') {
        const perp = Math.sin(enemy.wobble) * 0.7;
        ax = ax - ay * perp;
        ay = ay + ax * perp;
        const n = Math.hypot(ax, ay) || 1;
        ax /= n;
        ay /= n;
      }
      enemy.x += ax * enemy.speed * slow * dt;
      enemy.y += ay * enemy.speed * slow * dt;
    }

    // Reaching the lantern: the blight latches on and drinks the flame.
    const dl = Math.hypot(enemy.x - LANTERN.x, enemy.y - LANTERN.y);
    if (enemy.kind !== 'boss' && enemy.kind !== 'spitter' && dl < LANTERN.radius + enemy.radius - 4) {
      if (!enemy.latched) {
        enemy.latched = true;
        state.audio.lanternHit();
      }
      const drain = LANTERN_STATS.drainPerSecond[enemy.kind] ?? 3;
      state.lantern.flame -= drain * dt;
      state.lanternHitTimer = (state.lanternHitTimer ?? 0) - dt;
      if (state.lantern.flame <= 0) {
        state.lantern.flame = 0;
        endGame(state, 'lantern');
      }
    } else {
      enemy.latched = false;
    }

    // Touching the keeper hurts, with a short per-enemy cooldown.
    const dp = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (dp < enemy.radius + 15 && enemy.touchTimer <= 0) {
      enemy.touchTimer = 0.9;
      hurtPlayer(state, enemy.damage);
    }
  }

  // Gentle separation so the horde does not stack into one blob.
  const list = state.enemies;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < rr * rr) {
        const d = Math.sqrt(d2);
        const push = (rr - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }

  // Sweep the dead.
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].dead) state.enemies.splice(i, 1);
  }
}

export function updatePickups(state, dt) {
  const p = state.player;
  for (let i = state.embers.length - 1; i >= 0; i--) {
    const e = state.embers[i];
    e.life -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < p.magnetRadius * p.magnetRadius) {
      const d = Math.sqrt(d2) || 1;
      const pull = 900 * dt;
      e.vx += (dx / d) * pull;
      e.vy += (dy / d) * pull;
    }
    e.vx *= 1 - 3 * dt;
    e.vy *= 1 - 3 * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (d2 < 26 * 26) {
      state.embers.splice(i, 1);
      gainXp(state, e.value);
      state.audio.pickup();
      state.fx.burst(e.x, e.y, { count: 3, color: '#ffd27a', speed: 70, size: 3, life: 0.3 });
      continue;
    }
    if (e.life <= 0) state.embers.splice(i, 1);
  }

  for (let i = state.hearts.length - 1; i >= 0; i--) {
    const h = state.hearts[i];
    h.life -= dt;
    const d2 = distanceSq(h.x, h.y, p.x, p.y);
    if (d2 < 28 * 28) {
      state.hearts.splice(i, 1);
      p.hp = Math.min(p.maxHp, p.hp + h.value);
      state.audio.pickup();
      state.fx.text(p.x, p.y - 24, `+${h.value} HP`, '#ff7a7a', 16);
      continue;
    }
    if (h.life <= 0) state.hearts.splice(i, 1);
  }
}

export function gainXp(state, amount) {
  const p = state.player;
  p.xp += amount;
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed;
    p.level += 1;
    p.xpNeed = xpNeededFor(p.level);
    state.pendingLevelUps += 1;
  }
}
