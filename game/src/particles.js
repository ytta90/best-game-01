// Emberkeep — sparks, smoke, shockwave rings, floating score text and
// screen shake. One pool, capped, so a busy fight never allocates its
// way into a stutter. The shake is trauma-based: big events add trauma,
// the offset is trauma squared, and it decays every frame.

export function createEffects() {
  const particles = [];
  const texts = [];
  const rings = [];
  let trauma = 0;
  let time = 0;

  function addParticle(p) {
    if (particles.length > 420) particles.shift();
    particles.push(p);
  }

  return {
    update(dt) {
      time += dt;
      trauma = Math.max(0, trauma - dt * 1.6);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - p.drag * dt;
        p.vy *= 1 - p.drag * dt;
        p.vy += (p.gravity ?? 0) * dt;
        p.size = Math.max(0.1, p.size - p.shrink * dt);
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life -= dt;
        r.radius += r.grow * dt;
        if (r.life <= 0) rings.splice(i, 1);
      }
    },

    burst(x, y, { count = 12, color = '#ffb347', speed = 160, size = 4, life = 0.6, gravity = 60, drag = 2 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        addParticle({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          size: size * (0.6 + Math.random() * 0.8),
          life: life * (0.6 + Math.random() * 0.8),
          color, gravity, drag,
          shrink: size / life,
        });
      }
    },

    emberTrail(x, y) {
      addParticle({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 30,
        vy: -30 - Math.random() * 40,
        size: 3 + Math.random() * 2,
        life: 0.5 + Math.random() * 0.3,
        color: Math.random() < 0.5 ? '#ffb347' : '#ff7a3c',
        gravity: -40, drag: 1, shrink: 6,
      });
    },

    ring(x, y, color = '#ffd27a', grow = 260) {
      rings.push({ x, y, radius: 8, grow, life: 0.45, maxLife: 0.45, color });
    },

    text(x, y, str, color = '#ffffff', size = 16) {
      if (texts.length > 40) texts.shift();
      texts.push({ x, y, str, color, size, life: 0.9, maxLife: 0.9 });
    },

    shake(amount) {
      trauma = Math.min(1, trauma + amount);
    },

    shakeOffset() {
      const s = trauma * trauma * 14;
      return {
        x: (Math.random() * 2 - 1) * s,
        y: (Math.random() * 2 - 1) * s,
      };
    },

    draw(ctx) {
      for (const r of rings) {
        const alpha = Math.max(0, r.life / r.maxLife);
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (const t of texts) {
        const alpha = Math.max(0, t.life / t.maxLife);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${t.size}px Georgia, serif`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },

    clear() {
      particles.length = 0;
      texts.length = 0;
      rings.length = 0;
      trauma = 0;
    },
  };
}
