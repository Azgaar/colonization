# Decisions

The tracker for rule changes and design choices. A change reaches `rules/` only by the designer's choice (`pnpm rules apply | drop`, which adds a line to the log below). Details live in `rules/`, [rules-spec.md](rules-spec.md), the lab reports in `out/` and git history.

## Open

Questions and candidates awaiting the designer. Candidates are the overrides of [`rulesets/proposed.json`](../rulesets/proposed.json); evidence: `pnpm proposals 400` → `out/proposals.md`.

| # | Item | Note |
|---|---|---|
| O-1 | Candidate `events-1-cube`: five event cards add 1 cube instead of 2 | Moves the loyalist only 4–9 points; kept for tuning one player count |
| O-2 | Early endings: 56–67% of games end before round 8 at 4–5 players | Find where the racing player's bells come from before choosing a fix |
| O-3 | 5 players may overshoot: loyalist wins 6% | Event cards can tune it later |
| O-4 | Tuned bots still let the loyalist win 29–49% at 3–5 players | Retune the bots under the new war first |
| O-5 | Dead cards: school (before DD-75), slave, smuggler | May be the bots, not the cards |
| O-6 | Town hall, stockade, work action, alliances look dominated | Recheck after the war changes |
| O-7 | Bots move one token per action | Lab numbers understate DD-73 |

## Where the board stands

4 players, mixed bots, before DD-71 and later changes. Targets in [ai-and-testlab.md](ai-and-testlab.md#balance-targets).

| | Now | Target |
|---|---|---|
| Loyalist wins | 11% | about 15% |
| Patriot colonies that survive | 56% | 40–70% |
| Games ending before round 8 | 56% | under 25% |

## Decided by the designer (2026-11-25)

| # | Decision |
|---|---|
| DD-1 | "Активация индейцев: 🛖 N" activates settlement N |
| DD-2 | Solo has no loyalist |
| DD-3 | Buildings belong to the player and serve all colonies |
| DD-4 | One sale may fill the demand track several times; the price changes from the next trade action |
| DD-5 | "Среднее" education is basic 📖 |
| DD-6 | Where sources disagree, the spreadsheet is correct |
| DD-7 | Outdated component exports are ignored |
| DD-8 | Write the PRD before building |
| DD-9 | The PC version may look like a PC 4X and must be easy to tweak |
| DD-10 | PC rules follow board rules and must stay convertible to them |
| DD-11 | Activation affects the nearest colony's player. Hostility 0–2: 1 🟨; 3: nothing; 4–5: raid |
| DD-12 | Around the map: inner ring open sea, outer ring Europe |
| DD-13 | Tax track 0, 1, 3, 6, 10, 10, 15, 15, 20, 25; price cap 5 |
| DD-14 | Ocean cells give 1 🟨 without docks; docks give +1 |
| DD-15 | The warehouse is shared by all the player's colonies |
| DD-16 | Empty desert and tundra are intended; the Cossack can use tundra |
| DD-17 | Sepúlveda gives 2 slaves |
| DD-18 | Spreadsheet bonus frequencies are untested |
| DD-19 | Four-card starting decks are intended |
| DD-20 | Activation with no such settlement or no colony does nothing |
| DD-21 | The Cossack principle covers the Trapper and Planter |
| DD-22 | Propaganda takes up to 2 Fathers |
| DD-23 | The action card counts 1 in combat |
| DD-24 | "All patriots" stays; meant to be very rare |
| DD-25 | The designer applies source edits later; the spec is ahead of them |
| DD-26 | Loyalist win rate at 4 players about 15%; other balance targets accepted |
| DD-27 | Numbers missing from the workbook go in a settings file |
| DD-28 | Criminals and slaves count as support in battle |
| DD-29 | Ship and pawn move in one action only by embarking. Replaced by DD-73 |
| DD-30 | Solo is won by keeping a colony |
| DD-31 | Docks include the fish bonus; a fisherman adds +1 more |
| DD-32 | Balance later; first check the systems work |
| DD-33 | Interface direction B, painted world |
| DD-34 | Nation emblems white on the nation's colour |
| DD-35 | Map at least 80% of the screen; colony west, Europe east |
| DD-36 | Dragging an agent shows every possible action |
| DD-37 | The King's army is shown as an exact number; no war screen |
| DD-38 | Keep large agent cards, full-screen Colony and Europe, Governors view |
| DD-39 | Placed agents stay visible until the round ends |
| DD-40 | Goods are drawn as heaps; dragging never moves the camera |
| DD-41 | Europe is the marked outer ring of cells, water beyond |
| DD-42 | Colony preview left, Europe preview right; options in their own menu |
| DD-43 | The tilted map (B8) is the interface, now `packages/web` |
| DD-44 | The pier shows faces; details on hover |
| DD-45 | Hiring, building and Fathers show all choices when an agent is lifted |
| DD-46 | The Europe border is faint hatching |
| DD-47 | Mountains carry no food bonus |
| DD-48 | The interface is strict TypeScript with minimal unit tests |

## Decided by the designer (2026-11-26)

| # | Decision |
|---|---|
| DD-49 | Applied: each Royal Army cube attacks with 1 ⚔️, not 2 |
| DD-50 | Applied: refusing the tax gives no bell |
| DD-51 | Dropped: base colony defence 4. The King's cubes balance the colony instead |
| DD-52 | Applied: refusing the tax adds 1 cube, not 2 (solo unchanged) |

## Decided by the designer (2026-11-27)

| # | Decision |
|---|---|
| DD-53 | Games rarely end by round 5 (Q14); covered by the "before round 8" target |
| DD-54 | A damaged ship goes to Europe, or next to an own colony with a shipyard |
| DD-55 | Settlements next to colonies are placed as usual; the distance rule limits founding only |
| DD-56 | Forest gives timber only; fur needs a bonus or a trapper |
| DD-57 | Supply stays as written: a card swap |
| DD-58 | A 2-player game has no loyalist |
| DD-59 | The loyalist takes a fallen colony at 1 per cube; intended |
| DD-60 | Applied: recruiting with crosses is an action; crosses spent = agents looked at; Roger Williams takes up to 2 |
| DD-61 | The King's army is called the Royal Army (Королевская армия) |
| DD-62 | Applied: a colony may be founded on the map edge |
| DD-63 | Applied: grassland gives 🍂 only |
| DD-64 | Applied: Planter (farmer) gives +1 🍂 |
| DD-65 | Applied: Squanto gives +1 🐟 |
| DD-66 | Applied: Indian gives +1 🐟 |
| DD-67 | Corn is gone; food is fish only |
| DD-68 | Farmer renamed Planter (Земледелец); Danish planter renamed Cane Planter (Плантатор) |
| DD-69 | `rules/` is the one master; the game data, the Google Sheet and the rulebook come from it |
| DD-70 | The Docks building is «Доки»; «Причал» is only the pier |
| DD-71 | Applied: paying the tax gives +1 🔔 |
| DD-72 | Applied: excess warehouse goods are discarded at once |
| DD-73 | Applied: one pool of 💨 for ship and pawn; move bonuses name no token; Scout 🎓, 6 🟡 |
| DD-74 | Applied: landing or boarding costs the target cell, like any move |
| DD-75 | Applied: a school swaps the agent for a profession it teaches; school 2 🟫, university 4 🟫 |
| DD-76 | Applied: one icon and cube colour per resource: food 🟦 blue (🐟), timber 🟫 brown (🪵), crops 🟩 green (🌿: cash crops and fur), goods 🟧 orange (📦), silver ⬜ light grey (🪙 ingot). 🦫 fur is folded into 🌿, so John Rolfe also adds to fur. Earlier rows keep the old signs (🟨 food, 🟦 goods, 🍂 leaf) |

Questions Q1–Q21 are answered in DD-11 to DD-67.

## Source edits still to make

The spreadsheet is published from `rules/`; what is left is the document, which the new rulebook replaces.

| Edit in the document | From |
|---|---|
| Describe the two rings | DD-12 |
| Salon: up to 2 Fathers | DD-22 |
| Starting decks, stars, Торговец, Поселенец, Эквиано: follow the spreadsheet | DD-6 |
| Food is 🐟 only | DD-67 |
| Planter and Cane Planter names | DD-68 |
| Royal Army: cube attacks with 1; called Royal Army | DD-49, DD-61 |
| Tax: no bell for refusing; 1 cube | DD-50, DD-52 |
| 2 players: no loyalist | DD-58 |
| Recruiting is an action | DD-60 |
| Colonies may be on the map edge | DD-62 |

## To adopt a change

1. `pnpm rules apply proposed <id>` (or Design bench → Export → Into the rules): writes `rules/`, rebuilds, logs here.
2. Update the printed texts it lists (`pnpm rules todo`), then `pnpm rules:review`.
3. `pnpm rules:sheet publish`.
