// Rendering: everything the eye sees. The arena floor, the ember pillars,
// the enemies (each kind drawn as its own shape), the player flame, the
// bullets, the particles — plus the screen shake that sells every hit.

import { VIEW_W, VIEW_H, PALETTE } from './config.js';
import { PILLARS } from './world.js';

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function flameSpikes(ctx, x, y, r, color, time, seed) {
  ctx.fillStyle = color;
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + seed;
    const wob = 1 + 0.18 * Math.sin(time * 6 + i * 1.7);
    const r1 = r * 0.85 * wob;
    const r2 = r * 1.45 * wob;
    const a2 = a + 0.22;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a - 0.22) * r1, y + Math.sin(a - 0.22) * r1);
    ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
    ctx.lineTo(x + Math.cos(a2) * r1, y + Math.sin(a2) * r1);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawBackground(ctx, state) {
  const g = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, 80, VIEW_W / 2, VIEW_H / 2, 780,
  );
  g.addColorStop(0, PALETTE.bg1);
  g.addColorStop(1, PALETTE.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Faint grid so motion reads.
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= VIEW_W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); }
  for (let y = 0; y <= VIEW_H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); }
  ctx.stroke();

  // Arena border: a warm frame.
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(state.arena.x, state.arena.y, state.arena.w, state.arena.h);
}

function drawPillars(ctx, state) {
  for (const pl of PILLARS) {
    const cx = pl.x + pl.w / 2;
    const cy = pl.y + pl.h / 2;
    ctx.save();
    ctx.shadowColor = '#ff7a2f';
    ctx.shadowBlur = 18;
    const g = ctx.createLinearGradient(cx, pl.y, cx, pl.y + pl.h);
    g.addColorStop(0, '#3a2b4d');
    g.addColorStop(1, '#241a33');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 8);
    ctx.stroke();
    // A hot crystal heart in the middle.
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3 + cx);
    ctx.fillStyle = `rgba(255, 122, 47, ${0.5 + 0.4 * pulse})`;
    circle(ctx, cx, cy, 7 + 2 * pulse);
  }
}

function drawPickup(ctx, pk, time) {
  const bob = Math.sin(time * 4 + pk.x * 0.01) * 2;
  if (pk.kind === 'gem') {
    ctx.save();
    ctx.shadowColor = '#7ef0c1';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#7ef0c1';
    ctx.beginPath();
    ctx.moveTo(pk.x, pk.y - 7 + bob);
    ctx.lineTo(pk.x + 5, pk.y + bob);
    ctx.lineTo(pk.x, pk.y + 7 + bob);
    ctx.lineTo(pk.x - 5, pk.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.shadowColor = '#ff5d73';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff5d73';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♥', pk.x, pk.y + bob);
    ctx.restore();
  }
}

function drawEnemy(ctx, e, state) {
  const t = state.time;
  const flash = e.flash > 0;
  ctx.save();
  if (flash) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 22;
  } else {
    ctx.shadowColor = e.color;
    ctx.shadowBlur = e.elite ? 20 : 12;
  }
  const body = flash ? '#ffffff' : e.color;
  const core = flash ? '#ffffff' : e.core;

  if (e.kind === 'dart') {
    const a = Math.atan2(state.player.y - e.y, state.player.x - e.x);
    ctx.translate(e.x, e.y);
    ctx.rotate(a);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(e.radius + 6, 0);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'brute') {
    ctx.translate(e.x, e.y);
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const px = Math.cos(a) * e.radius;
      const py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = core;
    circle(ctx, 0, 0, e.radius * 0.35);
  } else if (e.kind === 'wisp') {
    ctx.translate(e.x, e.y);
    ctx.fillStyle = body;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = e.radius * (1 + 0.16 * Math.sin(a * 3 + t * 5));
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = core;
    circle(ctx, 0, 0, e.radius * 0.3);
  } else if (e.kind === 'boss') {
    ctx.translate(e.x, e.y);
    // Rotating crown ring.
    ctx.strokeStyle = e.phase >= 3 ? '#ff3d5e' : '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 12, t * 0.6, t * 0.6 + Math.PI * 1.5);
    ctx.stroke();
    flameSpikes(ctx, 0, 0, e.radius, body, t, 0.4);
    ctx.fillStyle = body;
    circle(ctx, 0, 0, e.radius * 0.9);
    ctx.fillStyle = core;
    circle(ctx, 0, 0, e.radius * 0.42);
    ctx.fillStyle = '#3a0a12';
    circle(ctx, -e.radius * 0.3, -e.radius * 0.2, 5);
    circle(ctx, e.radius * 0.3, -e.radius * 0.2, 5);
  } else {
    // Cinder, spitter, splitter, spark: spiked ember orb.
    flameSpikes(ctx, e.x, e.y, e.radius * 0.9, body, t, e.wobble);
    ctx.fillStyle = body;
    circle(ctx, e.x, e.y, e.radius * 0.85);
    ctx.fillStyle = core;
    circle(ctx, e.x, e.y, e.radius * 0.38);
    if (e.kind === 'spitter') {
      ctx.strokeStyle = core;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Elite crown.
  if (e.elite) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', e.x, e.y - e.radius - 10);
  }

  // A thin health bar over anything hurt.
  if (e.hp < e.maxHp && !e.boss) {
    const w = e.radius * 2;
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 4);
    ctx.fillStyle = '#ff5d73';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * frac, 4);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const t = state.time;
  // Dash trail ghosts.
  for (const tr of p.trail) {
    if (tr.life <= 0) continue;
    ctx.globalAlpha = (tr.life / 0.22) * 0.35;
    ctx.fillStyle = PALETTE.player;
    circle(ctx, tr.x, tr.y, p.radius * 0.85);
  }
  ctx.globalAlpha = 1;

  // Aim wedge.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aim) * (p.radius + 4), p.y + Math.sin(p.aim) * (p.radius + 4));
  ctx.lineTo(p.x + Math.cos(p.aim) * (p.radius + 20), p.y + Math.sin(p.aim) * (p.radius + 20));
  ctx.stroke();

  // Orbital blades.
  if (p.orbitals > 0) {
    for (let i = 0; i < p.orbitals; i++) {
      const a = p.orbitalAngle + (i / p.orbitals) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * 74;
      const oy = p.y + Math.sin(a) * 74;
      ctx.save();
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(ox, oy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Invulnerability blink.
  if (p.invuln > 0 && Math.floor(t * 18) % 2 === 0) return;

  ctx.save();
  ctx.shadowColor = PALETTE.player;
  ctx.shadowBlur = 26;
  flameSpikes(ctx, p.x, p.y, p.radius, PALETTE.player, t, 0);
  ctx.fillStyle = PALETTE.player;
  circle(ctx, p.x, p.y, p.radius * 0.9);
  ctx.fillStyle = PALETTE.playerCore;
  circle(ctx, p.x, p.y, p.radius * 0.45);
  ctx.restore();

  // Dash cooldown pip under the player.
  if (p.dashCdLeft > 0) {
    const frac = 1 - p.dashCdLeft / p.dashCooldown;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(p.x - 16, p.y + p.radius + 8, 32, 3);
    ctx.fillStyle = '#5ee6e6';
    ctx.fillRect(p.x - 16, p.y + p.radius + 8, 32 * frac, 3);
  }
}

function drawBullets(ctx, state) {
  for (const b of state.bullets) {
    ctx.save();
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#fff3d6';
    circle(ctx, b.x, b.y, b.radius);
    ctx.restore();
  }
  for (const b of state.ebullets) {
    ctx.save();
    ctx.shadowColor = '#c65df0';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#e0aaff';
    circle(ctx, b.x, b.y, b.radius);
    ctx.strokeStyle = 'rgba(224, 170, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 3 + Math.sin(state.time * 8) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawGame(ctx, state) {
  ctx.save();
  if (state.shake > 0.2) {
    const s = state.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, state);
  drawPillars(ctx, state);
  for (const pk of state.pickups) drawPickup(ctx, pk, state.time);
  for (const e of state.enemies) {
    if (e.hp > 0) drawEnemy(ctx, e, state);
  }
  drawBullets(ctx, state);
  if (state.player.hp > 0) drawPlayer(ctx, state);
  state.particles.draw(ctx);
  ctx.restore();

  // Vignette to hold the frame together.
  const vg = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, PALETTE.vignette);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Red flash when the player is hurt.
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 70, ${state.flash * 1.2})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
