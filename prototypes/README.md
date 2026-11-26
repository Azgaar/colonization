# Interface prototype

The official interface prototype (DD-43). It plays the real rules engine against the test bots (PD-10), so every step of the rules has a place on screen.

## Running

```bash
python3 -m http.server 8765 --directory prototypes
```

Then open http://localhost:8765. The page needs no build step of its own: edit a file in `src/` or `styles/` and reload.

| Command | When |
|---|---|
| `pnpm prototype` | After a change to the engine, the data or the bots. Rebuilds `build/engine.js` and the starting position `build/start.js` |
| `uv run --with pillow python prototypes/tools/art.py` | After a change to the art in `assets/`. Rewrites `art/` and `build/textures.js` |
| `node prototypes/tools/check.mjs` | Checks the prototype for missing, unused and duplicate names. Part of `pnpm typecheck` and `pnpm check` |

## Files

| Path | What |
|---|---|
| `index.html` | The page: the empty elements, the styles, then the generated scripts and `src/main.js` |
| `build/` | Generated, do not edit: the rules engine, the starting position, terrain textures |
| `art/` | Generated web-sized art |
| `tools/art.py` | Makes `art/` and `build/textures.js` from `assets/` |
| `styles/` | One file per area, loaded in order. Later files may rely on earlier ones, as in one stylesheet |

`src/` holds plain JavaScript modules, each importing what it uses:

| Module | What |
|---|---|
| `main.js` | Start-up |
| `sim.js` | The engine and the bots: one seat is the player. Undo, news since the last look, bots playing their turns |
| `data.js` | The game as the interface sees it (`D`, the player `P`), language (`pick`, `L`, `t`), words, art paths |
| `state.js` | What the interface is doing: `S` (agent in hand, open screen, clicked cell), `U` (open boxes), `X` (decision panels and reports) |
| `places.js` | What every place means for the agent in hand: the options there from the engine, or why there are none |
| `flow.js` | Choices to the engine, then the bots play until it is the player's decision again |
| `input.js` | Dragging and dropping agents, hovering, clicks, keys |
| `paint.js` | `paint()` draws everything again after any change. Call it rather than a single painter |
| `icons.js`, `texts.js` | Flat pictograms and emblems; card texts in both languages |
| `map/` | `board.js` the map and what stands on it, `camera.js` pan, zoom and tilt, `terrain.js` the painted ground and sea, `sprites.js` and `towns.js` ships, infantry, villages, colonies, `bonus.js` bonus resources on the ground |
| `ui/` | One module per part of the screen: `top`, `hand`, `fans` (choices off the map and the glimpse behind a door), `scenes` (Colony and Europe), `look` (a clicked cell), `decisions` (a panel per decision), `reports` and `cards` (events, ruins, wrecks), `war`, `toasts`, `goods`, `kit` (shared pieces) |

## Ways of working

- The engine decides. The interface only shows `Sim.legal()` choices and sends one back with `Sim.apply`. A rule that the board game would not have does not belong here.
- After changing `S`, `U` or `X`, call `paint()`.
- A new decision from the engine gets a panel in `ui/decisions.js` (`V[kind]`); without one it gets the generic panel.
- Text the player reads comes in both languages: `L('English', 'Русский')`, or a pair in `data.js`.
- In the browser console `Sim`, `S`, `X`, `Board`, `Places`, `Toast` and `paint` are at hand.
