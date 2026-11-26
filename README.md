# Colonization

Digital version and test bench for the board game. Start with [docs/PRD.md](docs/PRD.md).

| Path | What |
|---|---|
| `docs/` | Requirements, rules specification, decisions |
| `packages/data` | Import of `Colonization.xlsx`, card effects (`src/effects.ts`), settings (`src/settings.ts`) |
| `packages/engine` | Rules engine: no interface, no I/O, seeded randomness |
| `packages/bots` | AI players: random, and goal-driven with personalities |
| `packages/lab` | Playing many games |
| `packages/web` | The game in the browser: the real rules engine against bots, saving, replays. See [packages/web/README.md](packages/web/README.md) |
| `rulesets/` | `board` (reference), `pc` (convertible changes), `alternatives` (sandbox) |

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
| `pnpm check` | Import, type check (engine and interface) and tests |

## Changing numbers

- Anything in the workbook: edit it there, then run `pnpm data:import`.
- Anything else (tax track, limits, war, scoring): `packages/data/src/settings.ts`, then `pnpm data:import`.
- Trying a change without touching either: add an override to `rulesets/pc.json`, for example
  `{ "id": "cheap-priest", "why": "never hired", "conversion": "direct", "table": "Priest costs 5 gold", "set": { "agents.priest.price": 5 } }`
