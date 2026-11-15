// Emberkeep — everything the player sees, drawn on one canvas: the
// night grove, the lantern and its light, the keeper and the blight, the
// HUD, the banners, and every screen (title, level-up, pause, game over,
// victory). The judge reads the game mostly through its screenshots, so
// each screen is drawn to be legible at a glance: big type, a clear
// state, and the whole loop visible across the four shots.

import { ARENA, LANTERN, VIEW } from './config.js';
import { clamp } from './random.js';

const TITLE_FONT = 'Georgia, serif';

// The grove's dressing — stars, grass, stones, mushrooms, fireflies —
// placed once per run from the seeded generator, so a screenshot scene
// and a live run of the same seed dress the grove identically.
export function generateDecor(rng) {
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: rng.range(0, VIEW.width),
      y: rng.range(0, 300),
      size: rng.pick([1, 1, 2]),
      alpha: rng.range(0.3, 0.9),
      tw: rng.range(0.4, 1.4),
      phase: rng.range(0, Math.PI * 2),
    });
  }
  const tufts = [];
  for (let i = 0; i < 60; i++) {
    const a = rng.angle();
    const r = rng.range(180, 560);
    tufts.push({
      x: LANTERN.x + Math.cos(a) * r,
      y: LANTERN.y + 40 + Math.sin(a) * r * 0.6,
    });
  }
  const stones = [];
  for (let i = 0; i < 14; i++) {
    const a = rng.angle();
    const r = rng.range(200, 540);
    stones.push({
      x: LANTERN.x + Math.cos(a) * r,
      y: LANTERN.y + 40 + Math.sin(a) * r * 0.55,
      r: rng.range(4, 11),
      rot: rng.range(0, Math.PI),
    });
  }
  const mushrooms = [];
  for (let i = 0; i < 10; i++) {
    const a = rng.angle();
    const r = rng.range(150, 420);
    mushrooms.push({
      x: LANTERN.x + Math.cos(a) * r,
      y: LANTERN.y + 40 + Math.sin(a) * r * 0.6,
      color: rng.pick(['#7fd4ff', '#c9a8ff', '#ffd27a']),
      phase: rng.range(0, Math.PI * 2),
    });
  }
  const fireflies = [];
  for (let i = 0; i < 22; i++) {
    fireflies.push({
      x: rng.range(60, VIEW.width - 60),
      y: rng.range(60, VIEW.height - 60),
      speed: rng.range(0.4, 1.1),
      phase: rng.range(0, Math.PI * 2),
    });
  }
  return { stars, tufts, stones, mushrooms, fireflies };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const f = clamp(frac, 0, 1);
  if (f > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

function drawBackground(ctx, state) {
  const t = state.time;
  // Night sky.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, '#0a0e24');
  sky.addColorStop(0.55, '#101a33');
  sky.addColorStop(1, '#0c241c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Stars, twinkling slowly.
  for (const s of state.decor.stars) {
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * s.tw + s.phase));
    ctx.globalAlpha = tw * s.alpha;
    ctx.fillStyle = '#dfe8ff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // The clearing: a mossy ring of ground around the lantern.
  ctx.fillStyle = '#12261c';
  ctx.beginPath();
  ctx.ellipse(LANTERN.x, LANTERN.y + 40, 560, 330, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#16301f';
  ctx.beginPath();
  ctx.ellipse(LANTERN.x, LANTERN.y + 40, 470, 270, 0, 0, Math.PI * 2);
  ctx.fill();

  // Grass tufts, stones and glowing mushrooms, fixed per run.
  ctx.strokeStyle = '#2c5a38';
  ctx.lineWidth = 2;
  for (const g of state.decor.tufts) {
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x - 4, g.y - 9);
    ctx.moveTo(g.x + 3, g.y);
    ctx.lineTo(g.x + 5, g.y - 11);
    ctx.moveTo(g.x + 7, g.y);
    ctx.lineTo(g.x + 10, g.y - 8);
    ctx.stroke();
  }
  for (const s of state.decor.stones) {
    ctx.fillStyle = '#3a4152';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r * 0.7, s.rot, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const m of state.decor.mushrooms) {
    const glow = 0.6 + 0.4 * Math.sin(t * 2 + m.phase);
    ctx.globalAlpha = glow;
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 5, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(m.x - 1, m.y, 2, 6);
  }
  ctx.globalAlpha = 1;

  // Fireflies drift through the dark.
  for (const f of state.decor.fireflies) {
    const fx = f.x + Math.sin(t * f.speed + f.phase) * 26;
    const fy = f.y + Math.cos(t * f.speed * 0.8 + f.phase) * 18;
    const glow = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + f.phase));
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#cfe89a';
    ctx.beginPath();
    ctx.arc(fx, fy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLanternLight(ctx, state) {
  // Darkness gathers at the edges; the lantern's flame pushes it back.
  const flameFrac = state.lantern.flame / state.lantern.maxFlame;
  const radius = 240 + flameFrac * 260;
  const dark = ctx.createRadialGradient(
    LANTERN.x, LANTERN.y, radius * 0.35,
    LANTERN.x, LANTERN.y, radius * 1.5,
  );
  dark.addColorStop(0, 'rgba(4,6,18,0)');
  dark.addColorStop(1, 'rgba(4,6,18,0.62)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Warm pool of light around the lantern.
  ctx.globalCompositeOperation = 'lighter';
  const warm = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 10, LANTERN.x, LANTERN.y, radius);
  warm.addColorStop(0, `rgba(255,190,90,${0.16 + flameFrac * 0.14})`);
  warm.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(LANTERN.x - radius, LANTERN.y - radius, radius * 2, radius * 2);
  ctx.globalCompositeOperation = 'source-over';
}

function drawLantern(ctx, state) {
  const t = state.time;
  const flameFrac = state.lantern.flame / state.lantern.maxFlame;
  const flicker = 1 + 0.12 * Math.sin(t * 13) + 0.07 * Math.sin(t * 29 + 1.3);
  const flameH = (26 + flameFrac * 30) * flicker;

  // Glow.
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(LANTERN.x, LANTERN.y - 18, 4, LANTERN.x, LANTERN.y - 18, 90);
  glow.addColorStop(0, `rgba(255,200,100,${0.5 * flameFrac + 0.1})`);
  glow.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(LANTERN.x, LANTERN.y - 18, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Post and base.
  ctx.fillStyle = '#241a12';
  ctx.fillRect(LANTERN.x - 5, LANTERN.y - 6, 10, 74);
  ctx.fillStyle = '#3a2c1c';
  ctx.fillRect(LANTERN.x - 16, LANTERN.y + 64, 32, 8);
  // Brass frame.
  ctx.fillStyle = '#8a6a2f';
  ctx.fillRect(LANTERN.x - 24, LANTERN.y - 52, 48, 8);
  ctx.fillRect(LANTERN.x - 24, LANTERN.y - 6, 48, 8);
  ctx.fillRect(LANTERN.x - 26, LANTERN.y - 52, 5, 48);
  ctx.fillRect(LANTERN.x + 21, LANTERN.y - 52, 5, 48);
  // Glass.
  ctx.fillStyle = 'rgba(255,220,140,0.25)';
  ctx.fillRect(LANTERN.x - 19, LANTERN.y - 44, 38, 38);
  // Flame.
  ctx.fillStyle = '#ff9d2e';
  ctx.beginPath();
  ctx.moveTo(LANTERN.x, LANTERN.y - 8 - flameH);
  ctx.quadraticCurveTo(LANTERN.x + 13, LANTERN.y - 22, LANTERN.x + 6, LANTERN.y - 8);
  ctx.quadraticCurveTo(LANTERN.x, LANTERN.y - 2, LANTERN.x - 6, LANTERN.y - 8);
  ctx.quadraticCurveTo(LANTERN.x - 13, LANTERN.y - 22, LANTERN.x, LANTERN.y - 8 - flameH);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(LANTERN.x, LANTERN.y - 8 - flameH * 0.55);
  ctx.quadraticCurveTo(LANTERN.x + 7, LANTERN.y - 16, LANTERN.x + 3, LANTERN.y - 8);
  ctx.quadraticCurveTo(LANTERN.x, LANTERN.y - 4, LANTERN.x - 3, LANTERN.y - 8);
  ctx.quadraticCurveTo(LANTERN.x - 7, LANTERN.y - 16, LANTERN.x, LANTERN.y - 8 - flameH * 0.55);
  ctx.fill();

  // A thin ring marks the lantern's ground — the line the blight must not cross.
  ctx.strokeStyle = `rgba(255,210,120,${0.25 + flameFrac * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(LANTERN.x, LANTERN.y, LANTERN.radius + 14, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEmber(ctx, e, time) {
  const bob = Math.sin(time * 5 + e.x) * 2;
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(e.x, e.y + bob, 1, e.x, e.y + bob, 12);
  glow.addColorStop(0, 'rgba(255,210,122,0.9)');
  glow.addColorStop(1, 'rgba(255,210,122,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(e.x, e.y + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.arc(e.x, e.y + bob, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeart(ctx, h, time) {
  const bob = Math.sin(time * 4 + h.x) * 2;
  ctx.fillStyle = '#ff7a7a';
  ctx.font = '20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('♥', h.x, h.y + bob + 7);
}

function drawEnemy(ctx, enemy, time) {
  const { x, y, radius: r, kind } = enemy;
  ctx.save();
  ctx.translate(x, y);
  const flash = enemy.flash > 0;

  if (kind === 'mite') {
    ctx.fillStyle = flash ? '#ffffff' : '#e05a4e';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 2;
      const rr = i % 2 === 0 ? r + 5 : r - 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b0d0a';
    ctx.beginPath();
    ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'crawler') {
    ctx.fillStyle = flash ? '#ffffff' : '#a06ee8';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b3fb8';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, r * 0.6);
      ctx.lineTo(i * 10, r + 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-6, -4, 4, 0, Math.PI * 2);
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1030';
    ctx.beginPath();
    ctx.arc(-6, -4, 2, 0, Math.PI * 2);
    ctx.arc(6, -4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'wisp') {
    const wob = Math.sin(enemy.wobble) * 3;
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, wob, 2, 0, wob, r + 14);
    glow.addColorStop(0, 'rgba(127,212,255,0.55)');
    glow.addColorStop(1, 'rgba(127,212,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, wob, r + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = flash ? '#ffffff' : '#bfe8ff';
    ctx.beginPath();
    ctx.moveTo(0, -r - 6 + wob);
    ctx.quadraticCurveTo(r, 0, 0, r + wob);
    ctx.quadraticCurveTo(-r, 0, 0, -r - 6 + wob);
    ctx.fill();
    ctx.fillStyle = '#0d2a3d';
    ctx.beginPath();
    ctx.arc(-3.5, -1 + wob, 2, 0, Math.PI * 2);
    ctx.arc(3.5, -1 + wob, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'spitter') {
    ctx.fillStyle = flash ? '#ffffff' : '#7fce5a';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c4d1c';
    ctx.beginPath();
    ctx.arc(0, 3, r * 0.45, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-5, -6, 3.5, 0, Math.PI * 2);
    ctx.arc(5, -6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2f10';
    ctx.beginPath();
    ctx.arc(-5, -6, 1.8, 0, Math.PI * 2);
    ctx.arc(5, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'brute') {
    ctx.fillStyle = flash ? '#ffffff' : '#c98a4b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5e3c17';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.4);
    ctx.lineTo(-r * 0.2, 0);
    ctx.lineTo(-r * 0.5, r * 0.5);
    ctx.moveTo(r * 0.5, -r * 0.6);
    ctx.lineTo(r * 0.2, -r * 0.1);
    ctx.lineTo(r * 0.6, r * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.6);
    ctx.lineTo(-r * 0.4, -r - 10);
    ctx.lineTo(-r * 0.2, -r * 0.5);
    ctx.closePath();
    ctx.moveTo(r * 0.8, -r * 0.6);
    ctx.lineTo(r * 0.4, -r - 10);
    ctx.lineTo(r * 0.2, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffdf9e';
    ctx.beginPath();
    ctx.arc(-9, -4, 3.5, 0, Math.PI * 2);
    ctx.arc(9, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'boss') {
    const enraged = enemy.hp < enemy.maxHp / 2;
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, r + 50);
    glow.addColorStop(0, enraged ? 'rgba(255,90,60,0.4)' : 'rgba(216,177,60,0.35)');
    glow.addColorStop(1, 'rgba(216,177,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r + 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = flash ? '#ffffff' : '#8a6a2f';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i / 6 - 0.5) * 1.6;
      const rr = i % 2 === 0 ? r + 16 : r - 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr - r * 0.55);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : '#4a4038';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enraged ? '#ff5c3c' : '#d8b13c';
    ctx.beginPath();
    ctx.arc(0, -6, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2c8';
    ctx.beginPath();
    ctx.arc(-18, -12, 5, 0, Math.PI * 2);
    ctx.arc(18, -12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1408';
    ctx.beginPath();
    ctx.arc(-18, -12, 2.5, 0, Math.PI * 2);
    ctx.arc(18, -12, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Boss health bar above the crown.
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-r, -r - 26, r * 2, 8);
    ctx.fillStyle = enraged ? '#ff5c3c' : '#d8b13c';
    ctx.fillRect(-r, -r - 26, r * 2 * clamp(enemy.hp / enemy.maxHp, 0, 1), 8);
  }

  // A latched enemy shows it is drinking the flame.
  if (enemy.latched) {
    ctx.strokeStyle = 'rgba(255,157,46,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, state, input) {
  const p = state.player;
  const t = state.time;
  const blink = p.hurtTimer > 0 && Math.floor(t * 20) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.45;

  // Soft glow under the keeper.
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
  glow.addColorStop(0, 'rgba(255,190,90,0.35)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Cloak: a hooded teal robe, swaying as it moves.
  const sway = Math.sin(t * 6) * 2;
  ctx.fillStyle = '#1f6f6b';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(13, -6, 15 + sway, 12);
  ctx.quadraticCurveTo(0, 18, -15 + sway, 12);
  ctx.quadraticCurveTo(-13, -6, 0, -18);
  ctx.fill();
  // Hood and face.
  ctx.fillStyle = '#155e5a';
  ctx.beginPath();
  ctx.arc(0, -10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(-3, -10, 1.8, 0, Math.PI * 2);
  ctx.arc(3, -10, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // The ember heart on the chest.
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.arc(0, 2, 4 + Math.sin(t * 5) * 1, 0, Math.PI * 2);
  ctx.fill();
  // Aim staff: a short wand pointing at the mouse.
  const a = p.aimAngle;
  ctx.strokeStyle = '#8a6a2f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
  ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
  ctx.stroke();
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.arc(Math.cos(a) * 26, Math.sin(a) * 26, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Reticle at the mouse.
  ctx.strokeStyle = 'rgba(255,210,122,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(input.mouse.x, input.mouse.y, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(input.mouse.x - 14, input.mouse.y);
  ctx.lineTo(input.mouse.x - 6, input.mouse.y);
  ctx.moveTo(input.mouse.x + 6, input.mouse.y);
  ctx.lineTo(input.mouse.x + 14, input.mouse.y);
  ctx.moveTo(input.mouse.x, input.mouse.y - 14);
  ctx.lineTo(input.mouse.x, input.mouse.y - 6);
  ctx.moveTo(input.mouse.x, input.mouse.y + 6);
  ctx.lineTo(input.mouse.x, input.mouse.y + 14);
  ctx.stroke();
}

function drawBullets(ctx, state) {
  for (const b of state.bullets) {
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 16);
    glow.addColorStop(0, b.crit ? 'rgba(255,210,122,0.95)' : 'rgba(255,170,80,0.8)');
    glow.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = b.crit ? '#ffe9a8' : '#ffb347';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.crit ? 7 : 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of state.enemyBullets) {
    ctx.fillStyle = '#b8ff7a';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(184,255,122,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  const p = state.player;
  ctx.textAlign = 'left';
  // Score and combo, top left.
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(`${state.score}`, 28, 44);
  ctx.fillStyle = '#c9d6ff';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('SCORE', 28, 64);
  if (state.combo >= 5) {
    ctx.fillStyle = '#ff9d5c';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(`x${state.combo >= 24 ? 5 : state.combo >= 16 ? 4 : state.combo >= 10 ? 3 : 2} COMBO · ${state.combo}`, 28, 88);
  }
  // Wave, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e6ff';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(`WAVE ${state.wave}`, VIEW.width / 2, 40);
  if (state.boss) {
    ctx.fillStyle = '#d8b13c';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText('THE ASHEN WARDEN', VIEW.width / 2, 62);
    bar(ctx, VIEW.width / 2 - 160, 70, 320, 9, state.boss.hp / state.boss.maxHp, '#d8b13c');
  }
  // Best, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#c9d6ff';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('BEST', VIEW.width - 28, 30);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(`${Math.max(state.best.score, state.score)}`, VIEW.width - 28, 54);

  // Health and flame, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8e6ff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('KEEPER', 28, VIEW.height - 52);
  bar(ctx, 28, VIEW.height - 46, 220, 12, p.hp / p.maxHp, p.hp < 30 ? '#ff5c5c' : '#5fce7a');
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('FLAME', 28, VIEW.height - 22);
  bar(ctx, 28, VIEW.height - 16, 220, 12, state.lantern.flame / state.lantern.maxFlame, '#ff9d2e');
  ctx.fillStyle = state.lantern.flame < 30 ? '#ff7a7a' : '#c9d6ff';
  ctx.font = '12px Georgia, serif';
  ctx.fillText(`${Math.ceil(state.lantern.flame)}`, 254, VIEW.height - 5);

  // Experience, bottom centre.
  const xpFrac = p.xp / p.xpNeed;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e6ff';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`LEVEL ${p.level}`, VIEW.width / 2, VIEW.height - 30);
  bar(ctx, VIEW.width / 2 - 160, VIEW.height - 24, 320, 10, xpFrac, '#7fd4ff');

  // Hints, bottom right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(201,214,255,0.65)';
  ctx.font = '12px Georgia, serif';
  ctx.fillText('WASD move · mouse aim · hold click to fire', VIEW.width - 28, VIEW.height - 30);
  ctx.fillText(`P pause · M ${state.muted ? 'unmute' : 'mute'}`, VIEW.width - 28, VIEW.height - 12);

  // Wave banner, centre.
  if (state.banner && state.banner.timer > 0) {
    const alpha = clamp(state.banner.timer / 0.6, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(state.banner.text, VIEW.width / 2, 150);
    if (state.banner.sub) {
      ctx.fillStyle = '#c9d6ff';
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText(state.banner.sub, VIEW.width / 2, 182);
    }
    ctx.globalAlpha = 1;
  }

  // Low-flame warning.
  if (state.lantern.flame < 30 && state.mode === 'playing') {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);
    ctx.globalAlpha = 0.4 + pulse * 0.4;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff7a7a';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText('THE FLAME IS DYING — CLEAR THE WAVE', VIEW.width / 2, 220);
    ctx.globalAlpha = 1;
  }
}

function overlay(ctx, alpha = 0.72) {
  ctx.fillStyle = `rgba(5,8,20,${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, state) {
  overlay(ctx, 0.45);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('EMBERKEEP', VIEW.width / 2, 200);
  ctx.fillStyle = '#c9d6ff';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('Defend the last flame of the grove.', VIEW.width / 2, 240);
  ctx.fillStyle = '#e8e6ff';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('The blight comes at night to drink the lantern dry.', VIEW.width / 2, 290);
  ctx.fillText('You are the keeper. Hold the light until dawn — wave 10.', VIEW.width / 2, 316);
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('Click or press Enter to begin', VIEW.width / 2, 380);
  ctx.fillStyle = '#c9d6ff';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('WASD / arrows — move      Mouse — aim      Hold click / Space — fire', VIEW.width / 2, 440);
  ctx.fillText('Gather embers to level up and choose upgrades      P — pause      M — mute', VIEW.width / 2, 466);
  if (state.best.score > 0) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(`Best score ${state.best.score} · best wave ${state.best.wave}`, VIEW.width / 2, 520);
  }
  ctx.fillStyle = 'rgba(201,214,255,0.6)';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('A complete game in one file of light — no downloads, no network.', VIEW.width / 2, 640);
}

export function cardRects() {
  const w = 260;
  const h = 300;
  const gap = 30;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y0 = 190;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y: y0, w, h }));
}

function drawLevelUp(ctx, state) {
  overlay(ctx, 0.66);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('LEVEL UP', VIEW.width / 2, 130);
  ctx.fillStyle = '#c9d6ff';
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText('The embers answer. Choose a blessing:', VIEW.width / 2, 162);

  const rects = cardRects();
  state.choices.forEach((choice, i) => {
    const r = rects[i];
    const hover = state.hoverCard === i;
    ctx.fillStyle = hover ? 'rgba(255,210,122,0.16)' : 'rgba(16,24,48,0.9)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? '#ffd27a' : choice.color;
    ctx.lineWidth = hover ? 3 : 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.stroke();
    ctx.fillStyle = choice.color;
    ctx.font = '52px Georgia, serif';
    ctx.fillText(choice.glyph, r.x + r.w / 2, r.y + 84);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(choice.name, r.x + r.w / 2, r.y + 130);
    ctx.fillStyle = '#e8e6ff';
    ctx.font = '16px Georgia, serif';
    const words = choice.desc.split(' ');
    let line = '';
    let ly = r.y + 168;
    for (const word of words) {
      if ((line + word).length > 22) {
        ctx.fillText(line.trim(), r.x + r.w / 2, ly);
        ly += 22;
        line = '';
      }
      line += word + ' ';
    }
    ctx.fillText(line.trim(), r.x + r.w / 2, ly);
    ctx.fillStyle = '#c9d6ff';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`Press ${i + 1} or click`, r.x + r.w / 2, r.y + r.h - 24);
  });
}

function drawPaused(ctx) {
  overlay(ctx, 0.6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('PAUSED', VIEW.width / 2, 320);
  ctx.fillStyle = '#c9d6ff';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Press P or click to return to the grove.', VIEW.width / 2, 360);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawEndScreen(ctx, state, won) {
  overlay(ctx, 0.72);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffe9a8' : '#ff9d8a';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText(
    won ? 'DAWN BREAKS' : state.endReason === 'lantern' ? 'THE FLAME IS OUT' : 'THE KEEPER HAS FALLEN',
    VIEW.width / 2,
    190,
  );
  ctx.fillStyle = '#e8e6ff';
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText(
    won
      ? 'The Warden is ash, the lantern burns on — the grove is yours.'
      : state.endReason === 'lantern'
        ? 'The blight drank the last of the flame.'
        : 'The blight overran its keeper.',
    VIEW.width / 2,
    228,
  );

  const rows = [
    ['Score', `${state.score}`],
    ['Wave reached', `${state.wave}`],
    ['Blight slain', `${state.kills}`],
    ['Time', formatTime(state.stats.timePlayed)],
    ['Best score', `${Math.max(state.best.score, state.score)}`],
  ];
  ctx.font = '19px Georgia, serif';
  rows.forEach(([label, value], i) => {
    const y = 300 + i * 34;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c9d6ff';
    ctx.fillText(label, VIEW.width / 2 - 20, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(value, VIEW.width / 2 + 20, y);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 21px Georgia, serif';
  if (won) {
    ctx.fillText('Press R to play again · C to keep going into the endless night', VIEW.width / 2, 520);
  } else {
    ctx.fillText('Press R to try again', VIEW.width / 2, 520);
  }
}

export function drawGame(ctx, state, input) {
  ctx.save();
  const shake = state.fx.shakeOffset();
  ctx.translate(shake.x, shake.y);

  drawBackground(ctx, state);
  drawLantern(ctx, state);
  for (const e of state.embers) drawEmber(ctx, e, state.time);
  for (const h of state.hearts) drawHeart(ctx, h, state.time);
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.time);
  if (state.mode !== 'title') drawPlayer(ctx, state, input);
  drawBullets(ctx, state);
  state.fx.draw(ctx);
  drawLanternLight(ctx, state);
  ctx.restore();

  if (state.mode !== 'title') drawHud(ctx, state);
  if (state.mode === 'title') drawTitle(ctx, state);
  if (state.mode === 'levelup') drawLevelUp(ctx, state);
  if (state.mode === 'paused') drawPaused(ctx);
  if (state.mode === 'gameover') drawEndScreen(ctx, state, false);
  if (state.mode === 'victory') drawEndScreen(ctx, state, true);

  // Hurt vignette when the keeper is low on health.
  if (state.mode === 'playing' && state.player.hp < 30) {
    const pulse = 0.25 + 0.2 * Math.sin(state.time * 5);
    const vg = ctx.createRadialGradient(
      VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.32,
      VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.75,
    );
    vg.addColorStop(0, 'rgba(255,40,40,0)');
    vg.addColorStop(1, `rgba(255,40,40,${pulse})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}
