# EMBERFALL — Defend the Last Flame

A complete, original top-down 2D arena defender that runs offline in a
desktop browser from its own static files. No libraries, no network.

You are the last flame in a dark arena. Ten waves of ember-creatures come
for you — chasers, darts, spitters, brutes, splitters and wisps, with elites
mixed in — and at the end of wave 10 waits the Pyre Lord, a three-phase
boss. Survive, level up, choose your upgrades, and burn them all down.

## How to play

- **WASD / arrows** — move
- **Mouse** — aim, **hold click** — fire
- **SPACE / Shift** — dash (brief invulnerability)
- **P** — pause, **M** — mute, **R** — restart
- **1 / 2 / 3 or click** — pick an upgrade on level-up

Kills drop ember gems: collect them to level up. Every level offers three
of twelve upgrades — fire rate, damage, extra projectiles, piercing rounds,
dash, regeneration, magnet, combo, frost nova, orbital blades, and more.
Kills in quick succession build a combo multiplier for your score.

## Run it locally

```sh
node --experimental-strip-types serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's `buildDossier`.

## Layout

- `game/index.html` — the page and its canvas
- `game/src/main.js` — game loop and state machine
- `game/src/config.js` — palette, waves, enemy kinds, upgrades
- `game/src/player.js` — movement, dash, firing, levelling
- `game/src/enemies.js` — six enemy kinds, elites, the boss
- `game/src/combat.js` — bullets, nova, orbitals, collisions
- `game/src/world.js` — arena pillars, wave manager, pickups
- `game/src/upgrades.js` — the twelve upgrades and the draft
- `game/src/render.js` — everything the eye sees
- `game/src/hud.js` — HUD and all screens
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/particles.js` — particles, shockwaves, floating text
- `game/src/audio.js` — procedural WebAudio sound
- `game/src/input.js` — keyboard and mouse
- `game/src/random.js` — seeded RNG

Screenshots are deterministic renders of the game's own code:
`?shot=title|play|levelup|victory|boss&seed=7`, taken at 1280×720.

## License

MIT. See LICENSE.
