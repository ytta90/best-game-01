// Emberkeep — the best score and best wave, kept in localStorage so the
// title screen can show what the player is chasing. Nothing else is
// persisted: every run starts fresh.

const BEST_KEY = 'emberkeep.best.v1';

export function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { score: 0, wave: 0 };
    const parsed = JSON.parse(raw);
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      wave: typeof parsed.wave === 'number' ? parsed.wave : 0,
    };
  } catch {
    return { score: 0, wave: 0 };
  }
}

export function saveBest(score, wave) {
  const best = loadBest();
  const next = {
    score: Math.max(best.score, score),
    wave: Math.max(best.wave, wave),
  };
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode, blocked cookies); the
    // game plays on regardless.
  }
  return next;
}
