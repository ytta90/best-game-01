// Emberkeep — the level-up upgrade pool. When the keeper gathers enough
// embers the game pauses and offers three cards; each card is one
// upgrade, and most can be taken several times (the `max` column).
// Every upgrade changes a number the player can feel in the next wave.

export const UPGRADE_POOL = [
  {
    id: 'ember-focus', name: 'Ember Focus', glyph: '✦', color: '#ffb347', max: 5,
    desc: '+25% bolt damage',
    apply: (p) => { p.damage *= 1.25; },
  },
  {
    id: 'quick-hands', name: 'Quick Hands', glyph: '»', color: '#7fd4ff', max: 5,
    desc: '+18% fire rate',
    apply: (p) => { p.fireRate *= 1.18; },
  },
  {
    id: 'twin-flame', name: 'Twin Flame', glyph: '⁂', color: '#ff9d5c', max: 2,
    desc: '+1 bolt per shot',
    apply: (p) => { p.projectiles += 1; },
  },
  {
    id: 'piercing-ember', name: 'Piercing Ember', glyph: '→', color: '#e8e6ff', max: 3,
    desc: 'Bolts pierce +1 enemy',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'swift-boots', name: 'Swift Boots', glyph: '▲', color: '#a8e6a1', max: 4,
    desc: '+12% move speed',
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'heartwood', name: 'Heartwood', glyph: '♥', color: '#ff7a7a', max: 5,
    desc: '+25 max health, heal 25',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'ember-magnet', name: 'Ember Magnet', glyph: '◎', color: '#ffd27a', max: 3,
    desc: '+60% ember pickup radius',
    apply: (p) => { p.magnetRadius *= 1.6; },
  },
  {
    id: 'lantern-mend', name: 'Lantern Mend', glyph: '♦', color: '#ffe9a8', max: 5,
    desc: 'Restore 30 lantern flame',
    apply: (p, state) => { state.lantern.flame = Math.min(state.lantern.maxFlame, state.lantern.flame + 30); },
  },
  {
    id: 'crit-spark', name: 'Crit Spark', glyph: '✧', color: '#f2a6ff', max: 4,
    desc: '+10% critical chance (double damage)',
    apply: (p) => { p.critChance += 0.1; },
  },
  {
    id: 'heavy-ember', name: 'Heavy Ember', glyph: '●', color: '#c98a4b', max: 3,
    desc: '+40% damage, −10% fire rate',
    apply: (p) => { p.damage *= 1.4; p.fireRate *= 0.9; },
  },
  {
    id: 'ember-nova', name: 'Ember Nova', glyph: '✺', color: '#ff5c8a', max: 3,
    desc: 'A burning nova erupts every 6s',
    apply: (p) => { p.novaLevel = (p.novaLevel ?? 0) + 1; },
  },
  {
    id: 'frost-ember', name: 'Frost Ember', glyph: '❄', color: '#a8d8ff', max: 3,
    desc: 'Bolts chill enemies, slowing them 30%',
    apply: (p) => { p.chillLevel = (p.chillLevel ?? 0) + 1; },
  },
];

// Pick three distinct upgrades the player has not maxed out yet. The
// caller passes the player's owned levels ({id: count}) and the rng.
export function chooseUpgrades(rng, owned) {
  const available = UPGRADE_POOL.filter((u) => (owned[u.id] ?? 0) < u.max);
  const picks = [];
  const pool = [...available];
  while (picks.length < 3 && pool.length > 0) {
    const index = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  // If the player has maxed nearly everything, pad with the cheapest
  // repeatable comfort: a small heal and flame mend.
  while (picks.length < 3) {
    picks.push(picks.length % 2 === 0 ? UPGRADE_POOL[5] : UPGRADE_POOL[7]);
  }
  return picks;
}
