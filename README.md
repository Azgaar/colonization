# Colonization

Digital version and test bench for the board game. Start with [docs/PRD.md](docs/PRD.md).

| Path | What |
|---|---|
| `docs/` | Requirements, rules specification, decisions |
| `packages/data` | Import of `Colonization.xlsx`, card effects (`src/effects.ts`), settings (`src/settings.ts`) |
| `packages/engine` | Rules engine: no interface, no I/O, seeded randomness |
| `packages/bots` | AI players: random, goal-driven with personalities, search (information-set Monte Carlo), difficulty levels, the advisor |
| `packages/lab` | Playing many games: batches on all cores or in the browser, A/B on paired seeds, sweeps, problem detectors |
| `packages/web` | The game in the browser: against bots or hot-seat, advisor, saving, replays, the design bench (rules editor, lab, export), and dev mode (Dev menu, forecasts). See [packages/web/README.md](packages/web/README.md) |
| `rulesets/` | `board` (reference), `pc` (convertible changes), `alternatives` (sandbox), `proposed` (candidate changes for the designer) |

`assets/` and `components/` are kept out of git.

## Commands

| Command | What it does |
|---|---|
| `pnpm install` | Once, after cloning |
| `pnpm data:import` | Read the workbook. Stops with sheet, row and column on any error |
| `pnpm data:review` | Accept changed card texts, after checking `effects.ts` against them |
| `pnpm test` | All tests |
| `pnpm fuzz 10000` | Random games with every check on |
| `pnpm systems 400` | Bot games that list which systems and cards were exercised |
| `pnpm watch seed 3 trader,rebel` | One game as text |
| `pnpm tune`, `pnpm experiments` | Self-play tuning and balance experiments (bots are not strong enough yet to trust the numbers) |
| `pnpm web` | Build the interface and serve it at http://localhost:8765 |
| `pnpm replay seed 4` | Play a bot game and save it as a replay for the interface |
| `pnpm sweep settings.tax.refuseRef=1,2,3 --games 200` | One or two values over a range, on paired seeds; writes `out/sweep-*.md` |
| `pnpm strength:search [seeds] [iterations] [players]` | Search bot against the tuned bot on paired seeds, e.g. `100 60 2` |
| `pnpm proposals 400` | The evidence for the candidate rule changes in `rulesets/proposed.json` against `board`; writes `out/proposals.md` (see [docs/proposals.md](docs/proposals.md)) |
| `pnpm detect 400 --players 4` | Look for stalls, dead cards, runaway leaders and dominated options; writes `out/detect-*.md` |
| `pnpm rules list`, `export pc --csv`, `report` | Rulesets and their changes, the cells to edit in the workbook, the conversion report `pc` vs `board` |
| `pnpm rules add <ruleset> <id>`, `promote <id>`, `drop <id>` | Put a change from another ruleset into `pc`; move a change from `pc` to `board`, or drop it; promote and drop are logged in `docs/decisions.md`. In dev mode the same steps are in Design bench → Export |
| `pnpm release:patch`, `:minor`, `:major` | Raise the game's version (shown on the title screen) |
| `pnpm check` | Import, type check (engine and interface) and tests |

## Changing numbers

- Anything in the workbook: edit it there, then run `pnpm data:import`.
- Anything else (tax track, limits, war, scoring): `packages/data/src/settings.ts`, then `pnpm data:import`.
- Trying a change without touching either: in the game, Design bench → Rules: make a ruleset, find the value, change it, give it its label and table wording; then Lab to compare it with `board`, and Export for the cells to edit and the conversion report.
- Or by hand: add an override to `rulesets/pc.json`, for example
  `{ "id": "cheap-priest", "why": "never hired", "conversion": "direct", "table": "Priest costs 5 gold", "set": { "agents.priest.price": 5 } }`.
  Overrides can also add a card as a copy of another (`"copy": { "fathers.minuit_2": "fathers.peter_minuit" }`, label `component`) or remove one (`"remove": ["events.stamp_act"]`).
