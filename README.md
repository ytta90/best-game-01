# Emberkeep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Defend the last flame of the grove.** The blight comes at night to drink
the lantern dry. You are the keeper: hold the light until dawn — wave 10.

A complete, original 2D canvas game that plays offline in a desktop browser
from its own static files. No libraries, no network requests, no build step.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## How to play

- **WASD / arrows** — move the keeper
- **Mouse** — aim
- **Hold click / Space** — fire ember bolts
- **P** — pause · **M** — mute · **R** — restart after a run ends

The blight hunts the nearer of you and the lantern. Mites, crawlers, wisps,
spitters and brutes arrive in waves; the Ashen Warden walks in on waves 5
and 10. Enemies that reach the lantern latch on and drain its flame. If the
flame hits zero, or the keeper falls, the night wins.

Slain blight drops embers. Gather enough and the game pauses to offer three
blessings — twelve upgrades to choose from, from Twin Flame to Ember Nova.
Clear wave 10's boss and dawn breaks: victory, with the choice to keep going
into the endless night.

## What is inside

- `game/index.html` — the page; `game/src/main.js` — the loop and state machine
- `game/src/entities.js` — keeper, blight, bolts, embers, combat
- `game/src/waves.js` — the wave director and the boss
- `game/src/upgrades.js` — the twelve level-up blessings
- `game/src/render.js` — the night grove, the lantern, the HUD, every screen
- `game/src/audio.js` — all sound synthesized live with WebAudio
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|play|levelup|victory&seed=N`)
- `game/src/config.js`, `random.js`, `input.js`, `particles.js`, `storage.js`

## Entered on make.fun

Built for [best-game-01](https://make.fun/bounty/best-game-01) — "Make the best
game". The program at `main.ts` hands the game in: it copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json`.

## License

MIT — see [LICENSE](LICENSE).
