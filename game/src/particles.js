// Particles, floating score text, shockwaves and the ambient ember drift
// that keeps the arena alive even when nothing is fighting.

export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    this.waves = [];
    this.embers = [];
  }

  // A burst of glowing dots flying out from (x, y).
  burst(x, y, color, count = 14, speed = 260, life = 0.55, size = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 0.88,
      });
    }
    if (this.list.length > 420) this.list.splice(0, this.list.length - 420);
  }

  // A ring that expands and fades (nova, boss death, wave clear).
  shockwave(x, y, color, maxR = 160, life = 0.5) {
    this.waves.push({ x, y, color, r: 8, maxR, life, maxLife: life });
  }

  // Score / message text that floats up and fades.
  text(x, y, str, color = '#ffd166', size = 16) {
    this.texts.push({ x, y, str, color, size, life: 0.9, maxLife: 0.9 });
    if (this.texts.length > 40) this.texts.shift();
  }

  // Slow embers drifting up across the whole arena (ambient, always on).
  seedEmbers(rng, count, w, h) {
    this.embers = [];
    for (let i = 0; i < count; i++) {
      this.embers.push({
        x: rng.range(0, w),
        y: rng.range(0, h),
        r: rng.range(1, 2.6),
        vy: rng.range(8, 26),
        sway: rng.range(0.4, 1.4),
        phase: rng.range(0, Math.PI * 2),
        alpha: rng.range(0.15, 0.5),
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.life -= dt;
      const k = 1 - w.life / w.maxLife;
      w.r = 8 + (w.maxR - 8) * (1 - Math.pow(1 - k, 3));
      if (w.life <= 0) this.waves.splice(i, 1);
    }
  }

  updateEmbers(dt, time, w, h) {
    for (const e of this.embers) {
      e.y -= e.vy * dt;
      e.x += Math.sin(time * e.sway + e.phase) * 12 * dt;
      if (e.y < -6) {
        e.y = h + 6;
        e.x = Math.random() * w;
      }
    }
  }

  draw(ctx) {
    for (const e of this.embers) {
      ctx.globalAlpha = e.alpha;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const w of this.waves) {
      const a = Math.max(0, w.life / w.maxLife);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
