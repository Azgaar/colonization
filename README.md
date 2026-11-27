# Colonization

Digital version and test bench for the board game. Start with [docs/PRD.md](docs/PRD.md).

| Path | What |
|---|---|
| `docs/` | Requirements, rules specification, decisions |
| `rules/` | **The rules**: one file per sheet of the board game's spreadsheet (every cell as printed, plus each card's effect `$fx`), and `settings.json`. The single source of truth; the game data, the Google Sheet Dextrous prints from, and the rulebook are made from it |
| `packages/data` | Compiling `rules/` into game data, publishing it to the Google Sheet, rulesets and changes |
| `packages/engine` | Rules engine: no interface, no I/O, seeded randomness |
| `packages/bots` | AI players: random, goal-driven with personalities, search (information-set Monte Carlo), difficulty levels, the advisor |
| `packages/lab` | Playing many games: batches on all cores or in the browser, A/B on paired seeds, sweeps, problem detectors |
| `packages/web` | The game in the browser: against bots or hot-seat, advisor, saving, replays, the design bench (rules editor, lab, export), and dev mode (Dev menu, forecasts). See [packages/web/README.md](packages/web/README.md) |
| `rulesets/` | Sandbox rulesets on top of the rules: `proposed` (candidate changes for the designer), `alternatives` (every unclear rule read the other way). `board` is the rules themselves |

`assets/` and `components/` are kept out of git.

## Commands

| Command | What it does |
|---|---|
| `pnpm install` | Once, after cloning |
| `pnpm rules:build` | Compile `rules/` into the game data. Stops with sheet, row and column on any error |
| `pnpm rules:review` | Accept changed printed texts, after checking each card's `$fx` against them |
| `pnpm rules:sheet check`, `publish [--yes]` | Compare the Google Sheet with `rules/`; write `rules/` into it (values only, its formatting stays). Setup at the top of `packages/data/src/sheet.ts` |
| `pnpm rulebook` | Build the rulebook, Russian and English, into `rulebook/dist/` from `rulebook/src/` and the rules; open it in Chrome and print (A4, Letter or A5) |
| `pnpm test` | All tests |
| `pnpm fuzz 10000` | Random games with every check on |
| `pnpm systems 400` | Bot games that list which systems and cards were exercised |
| `pnpm watch seed 3 trader,rebel` | One game as text |
| `pnpm tune`, `pnpm experiments` | Self-play tuning and balance experiments (bots are not strong enough yet to trust the numbers) |
| `pnpm web` | Build the interface and serve it at http://localhost:8765 |
| `pnpm replay seed 4` | Play a bot game and save it as a replay for the interface |
| `pnpm sweep settings.tax.refuseRef=1,2,3 --games 200` | One or two values over a range, on paired seeds; writes `out/sweep-*.md` |
| `pnpm strength:search [seeds] [iterations] [players]` | Search bot against the tuned bot on paired seeds, e.g. `100 60 2` |
| `pnpm seat new [id] --vs normal`, `pick <n> [id]`, `show`, `result` | One seat played a decision at a time from the command line, so that Claude Code (or you) can play against bots of a level; the game ends with the same seed replayed with a bot in that seat, to compare. Kept in `out/seat/`. The `colonization-player` agent plays a whole game this way, on any model
| `pnpm proposals 400` | The evidence for the candidate rule changes in `rulesets/proposed.json` against `board`; writes `out/proposals.md` (open candidates in [docs/decisions.md](docs/decisions.md#open)) |
| `pnpm detect 400 --players 4` | Look for stalls, dead cards, runaway leaders and dominated options; writes `out/detect-*.md` |
| `pnpm rules list`, `export <ruleset> --csv`, `report <ruleset>` | Rulesets and their changes against the rules, where each value is printed, the conversion report |
| `pnpm rules apply <ruleset> <id>`, `drop <ruleset> <id>`, `todo` | Write a change into `rules/` (and rebuild), or drop it; both are logged in `docs/decisions.md`. `todo` lists printed texts still to follow an applied change. In dev mode the same steps are in Design bench → Export |
| `pnpm release:patch`, `:minor`, `:major` | Raise the game's version (shown on the title screen) |
| `pnpm check` | Build the rules, type check (engine and interface) and tests |

## Changing the rules

- Everything is in `rules/`: card texts and values as printed, each card's effect (`$fx`), and `settings.json` (tax track, limits, war, scoring). Edit it, run `pnpm rules:build` (and `pnpm rules:review` if a printed text changed), then `pnpm rules:sheet publish` so Dextrous prints the new values, and `pnpm rulebook` for the rulebook.
- Trying a change first: in the game, Design bench → Rules: make a ruleset, find the value, change it, give it its label and table wording; then Lab to compare it with `board` (the rules); then, in dev mode, Export → Into the rules to apply it.
- Or by hand: add an override to `rulesets/proposed.json`, for example
  `{ "id": "cheap-priest", "why": "never hired", "conversion": "direct", "table": "Priest costs 5 gold", "set": { "agents.priest.price": 5 } }`, then `pnpm rules apply proposed cheap-priest`.
  Overrides can also add a card as a copy of another (`"copy": { "fathers.minuit_2": "fathers.peter_minuit" }`, label `component`) or remove one (`"remove": ["events.stamp_act"]`); those are tried in a ruleset and then added to `rules/` by hand.
