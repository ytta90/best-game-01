// Level-ups: roll three upgrades the player has not maxed out, and apply
// the one they pick. Choices are drawn from the seeded RNG so a shot scene
// shows the same three cards every time.

import { UPGRADES } from './config.js';

export function availableUpgrades(player) {
  return UPGRADES.filter((u) => (player.upgrades[u.id] || 0) < u.max);
}

export function rollChoices(rng, player, count = 3) {
  const pool = availableUpgrades(player);
  const shuffled = rng.shuffle(pool);
  const picks = shuffled.slice(0, Math.min(count, shuffled.length));
  // Always offer three cards: if the pool runs dry, repeat the best of
  // what is left rather than showing an empty slot.
  while (picks.length < count && pool.length > 0) {
    picks.push(pool[picks.length % pool.length]);
  }
  return picks;
}

export function applyUpgrade(state, upgrade) {
  const p = state.player;
  p.upgrades[upgrade.id] = (p.upgrades[upgrade.id] || 0) + 1;
  upgrade.apply(p);
  state.particles.text(p.x, p.y - 30, upgrade.name.toUpperCase(), '#ffd166', 17);
  state.particles.shockwave(p.x, p.y, '#ffd166', 120, 0.4);
  state.sfx.levelup();
}
