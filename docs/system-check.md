# System check

2026-11-25. `pnpm systems 400`: bot games at 1–5 players with every engine check on.

| Check | Result |
|---|---|
| Games finished | 400 of 400, no failures |
| Replays identical | 40 of 40 |
| Nations played | 10 of 10 |
| Events, ruins, wrecks, King tactics, tribes seen | all |
| Fathers | 33 of 34 (Jefferson not taken) |
| Buildings | 13 of 14 (university not built) |
| Hired agents | 21 of 22 (slave not hired) |

Jefferson, the university and the slave are covered by tests and by `pnpm fuzz`; the bots just don't choose them here.

## What bots use, and what they hardly touch

Used regularly: exploring, founding, production, building, trade, hiring, Fathers, ruins and wrecks, events, taxes, the war.

Used rarely, so checked by tests and fuzzing rather than by sensible play: attacks on players, naval battles, plunder, alliances, gifts, teaching, custom house, smuggling, shipyard, recruiting with crosses.

## Bot strength: not enough for balance

| Solo | Score | Result | REF cubes |
|---|---|---|---|
| Designer's recorded games | 14, 41, 28 | all recorded as holding or level | 3, 8, 7 |
| Balanced bot, 160 games (before the last bug fix) | 22 on average, best 40 | 14% won | 23 |

The bots build up too slowly, pay too little tax and defend badly. **Win rates, role balance and tax behaviour from these bots should not be used to change the game yet.** In the same games with 2–5 players the loyalist won 79–94%, which mixes a possible design effect with weak patriots.

## Facts that do not depend on bot skill

- **REF growth scales with players.** Each refusal adds 2 cubes whoever refuses, so 4 players refusing one tax add 8, and the cubes fall on fewer patriots.
- **Bells can be shed.** Buying Fathers lowers a player's bells, which is also how someone makes sure to become the loyalist. Self-play tuning found this by itself.
- **Raids cost buildings.** With fewer than 2 spare resources a raid takes a building, and bots meet 4–7 raids per game.
- **Supply gains no action** (H13): it plays one card to draw one.
