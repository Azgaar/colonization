# Interface

The game in the browser (milestone M3). It plays the real rules engine against the test bots: the player is seat 0, every other seat is a goal-driven bot. It grew out of the interface prototype (DD-43, PD-10) and is now TypeScript in strict mode, built with rolldown.

## Running

```bash
pnpm web
```

Builds `dist/app.js` and serves this package at http://localhost:8765. While working on it, run `pnpm web:watch` in one terminal and `node packages/web/tools/serve.ts` in another, then reload the page after a change.

| Command | When |
|---|---|
| `pnpm web:build` | Build the bundle once. The engine, bots and data are bundled from their sources |
| `pnpm replay [seed] [players] [personalities]` | Play a game with the bots and save it as `out/replays/<seed>.json`, to open in the interface (Options → Open a replay) |
| `uv run --with pillow python packages/web/tools/art.py` | After a change to the art in `assets/`. Rewrites `art/` and `src/generated/textures.json` |
| `pnpm typecheck`, `pnpm test` | Types of the whole interface; its unit tests are in `test/` |

## What it does

- **New game** (Options → New game): number of players, your nation, the bots' characters, the ruleset and the seed.
- **Saving**: the game is saved in the browser after every decision and taken up again on reload. Options → Save to a file / Open a file moves a game between browsers.
- **Undo** takes back the player's own choices until something hidden shows: dice, a new tile, a card from a deck, or the bots' turns (FR-U-12).
- **Replays**: a recorded game is stepped through choice by choice, jumped to any point and seen from any seat.
- Both languages, switchable at any time.

## Files

| Path | What |
|---|---|
| `index.html` | The page: the empty elements, the styles, then `dist/app.js` |
| `dist/` | Built, not in git |
| `art/` | Web-sized art, made by `tools/art.py` |
| `styles/` | One file per area, loaded in order. Later files may rely on earlier ones, as in one stylesheet |
| `tools/` | `art.py` (art), `serve.ts` (a static server) |
| `test/` | Unit tests: what the view hides, the session's undo, replays |

`src/` modules, each importing what it uses:

| Module | What |
|---|---|
| `main.ts` | Start-up |
| `sim.ts` | The session: engine and bots, setup, saving, undo, news since the last look, bots playing their turns, replays |
| `view.ts` | What the interface reads from a game state (`GameView`), only what the shown seat may know |
| `data.ts` | The view object `D` and the shown player `P`, language (`pick`, `L`, `t`), words, art paths |
| `state.ts` | What the interface is doing: `S` (agent in hand, open screen, clicked cell), `U` (open boxes), `X` (decision panels and reports) |
| `places.ts` | What every place means for the agent in hand: the engine's options there, or why there are none |
| `flow.ts` | Choices to the engine, then the bots play until it is the player's decision again |
| `input.ts` | Dragging and dropping agents, hovering, clicks, keys |
| `paint.ts` | `paint()` draws everything again after any change. Call it rather than a single painter |
| `icons.ts`, `texts.ts`, `plural.ts` | Flat pictograms and emblems; card texts in both languages; Russian number forms |
| `map/` | `board.ts` the map and what stands on it, `camera.ts` pan, zoom and tilt, `terrain.ts` the painted ground and sea, `sprites.ts` and `towns.ts` ships, infantry, villages, colonies, `bonus.ts` bonus resources on the ground |
| `ui/` | One module per part of the screen: `top`, `hand`, `fans` (choices off the map and the glimpse behind a door), `scenes` (Colony and Europe), `look` (a clicked cell), `decisions` (a panel per decision), `reports`, `cards` and `news` (events, ruins, wrecks, other players' turns), `war`, `setup` (new game, files, replays), `toasts`, `goods`, `kit` (shared pieces) |

## Ways of working

- The engine decides. The interface only shows `Sim.legal()` choices and sends one back with `Sim.apply`, which checks it against the engine's list: a choice that is not legal now is refused (it returns false and warns in the console) and the game is left as it was. Build options from the engine's lists, never from the view's tables alone. A rule that the board game would not have does not belong here.
- After changing `S`, `U` or `X`, call `paint()`.
- A new decision from the engine gets a panel in `ui/decisions.ts` (`V[kind]`); without one it gets the generic panel.
- Text the player reads comes in both languages: `L('English', 'Русский')`, or a pair in `data.ts`.
- Engine log entries, decisions and choices carry loose fields; read them through `Entry`, `Pending` and `Opt` from `sim.ts`, nothing else is `any`.
- In the browser console `Sim`, `S`, `X`, `Board`, `Places`, `Toast` and `paint` are at hand.
