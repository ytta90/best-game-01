// Emberkeep — a best-game-01 entry (Node 22, standard library only).
//
// The program hands the game in: it copies this repository's game/ folder
// (plain static files a desktop browser loads offline: game/index.html and
// its ES modules, no library, no network request) and screenshots/ into the
// output directory, then writes /output/dossier.json with the vendored
// make.fun library, so the judge can read the game from its dossier.
//
// Serve the game locally with `node serve.ts`, then open
// http://localhost:8080 and play it in a desktop browser.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countEntries(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    total += 1;
    if (statSync(full).isDirectory()) total += countEntries(full);
  }
  return total;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Guardrails from the sealed gate (reference/gate.json): game/ holds at
// most 993 files and directories and 48 MiB, screenshots/ at most 4 files
// of at most 256 KiB each, and the whole of /output shares the platform's
// 1,000-entry and 64 MiB caps, so refuse early rather than hand in an
// entry the scorer would refuse.
const gameEntries = countEntries(join(out, 'game'));
const shotEntries = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).length : 0;
if (gameEntries > 993) throw new Error(`game/ holds ${gameEntries} entries, over the 993 cap`);
if (shotEntries > 4) throw new Error(`screenshots/ holds ${shotEntries} files, over the 4 cap`);

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Emberkeep handed in: ${gameEntries} game entries, ${shotEntries} screenshots -> ${out}`);
