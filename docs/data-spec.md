# Data specification

How the rules become game data. Since 2026-11-27 the rules live in `rules/` (one file per sheet of the old `Colonization.xlsx`, every cell as printed, plus each card's effect `$fx`, English name `$en` and text check `$checked`, and `settings.json`); `pnpm rules:build` compiles them with the importer described below, reading the same columns, and `pnpm rules:sheet publish` writes them back to the Google Sheet that Dextrous prints from. The spreadsheet is no longer edited by hand.

## 1. Sheets

| Sheet | Rows | Becomes | Notes |
|---|---|---|---|
| Agents | 22 types, 49 cards | Common agents | `copies`, education, price, effect text |
| Sp Agents | 46 rows, 53 cards | 45 nation cards and 8 native agents | Header of column 1 is `e`, meaning copies |
| Europeans | 10 | Nations | Starting deck by Russian agent names, difficulty, colour |
| Resource tokens | 3 | – | Print only |
| Buildings | 14 types, 42 cards | Buildings | `requires` by Russian name, education, price |
| Fathers | 34 | Founding Fathers | `type` is a category, currently without rules |
| Icons | 34 | – | Print only |
| Goods | 5 | Resources and start prices | |
| Terrain | 6 | Terrain | Production, defence, movement. The bonus percentages are notes, not targets **[A]** |
| Tiles | 74 | Map fragments | 9 cells each, reading order |
| Indians | 13 tribes, 26 cards | Tribes | Terrain, hostility, population, loot |
| King Tactics | 9 | Tactics | |
| Events | 22 | Events | Up to 4 effects in order |
| Burial events | 20 | Ruins | Options and dice tables inside one text cell |
| Wreck events | 20 | Wrecks | Same |

Not in the workbook, needed by the engine: the tax track, rounds, hand size, movement points, hold size, limits, war and scoring numbers. They live in a separate settings file **[A]**.

## 2. Identity and language

- IDs come from `nickname`, in lower snake case (`blacksmith shop` → `blacksmith_shop`).
- Russian text comes from the sheet. English names start from `nickname`; English card texts are written once and stored beside the Russian ones.
- Cross-references by Russian name (`requires`, `starting units`) are resolved to IDs on import. An unknown name is an error.

## 3. Effects

Text in `effect` columns is for people. The engine needs structured effects, kept in a file keyed by entity ID and checked against the sheet text: **if a text changes, the importer reports that its effect needs review.**

| Block | Parameters | Example |
|---|---|---|
| `modifyProduction` | resource or icon, amount, terrain, location test, allow on empty terrain | Farmer, Franklin, Cossack |
| `modifyMovement` | token, amount | Sailor, Cabral |
| `modifyCombat` | token type, amount, against, terrain, attack or defence | Soldier, Cortés, Drake |
| `modifyCost` | action, resource, amount, minimum 0 | Builder, Recruiter, Penn, Eliot |
| `modifyPrice` | trade, amount | Trader |
| `restrictActions` | allowed or forbidden actions | Slave, Las Casas |
| `grant` | resource, agent, building, colony, Father, cubes | Pizarro, Hudson, La Salle |
| `grantAction` | bombard, smuggle | Cannoneer, Smuggler |
| `convert` | from, to, rate, cap | Bradford, workshop |
| `workCell` | terrain, bonus | Docks |
| `changeMarket` | resource, change or reset | Events |
| `changeHostility`, `changePopulation` | scope, amount | Smallpox, Treaty of Paris |
| `addREF` | fixed, per player, per item | Tax refusal, events |
| `raid` | scope | Pontiac |
| `activate` | settlement number | Most events |
| `payOr` | cost, consequence | Stamp Act |
| `choice` | list of options with cost and requirement | Ruins, wrecks |
| `roll` | table by die result | Ruins, wrecks |
| `moveToken`, `endMove`, `reveal`, `drawMore` | | Ruins, wrecks |
| `targetPlayer` | most or fewest of something, first player, any | Salem, El Dorado |
| `score` | condition, amount | Bolívar, Minuit |
| `warModifier` | side, timing, amount | Tactics, Washington, Arnold |

Anything these cannot express gets a named code handler, listed in one registry so the number stays visible. Expected: Jefferson, Great Awakening, Equiano, Benedict Arnold, Seven Years' War.

## 4. Validation

**Errors** (import stops)

- Unknown terrain, resource, education, building or agent reference
- Missing or duplicate ID; tile without 9 cells; tile numbers not consecutive
- A resource in the point-of-interest column, or the reverse
- Village or ruin on ocean, wreck on land
- Negative or missing price, copies or population
- Starting deck that doesn't match the nation's cards
- Effect file entry missing, or out of date with the text

**Warnings** (import continues)

- Bonus resource on terrain that does not yield it
- Card copies insufficient for an effect
- Entity that no rule can reach
- Image missing or unused
- `Terrain.cells` and other counted columns out of step with Tiles

## 5. Findings in the current workbook

Checked on the 15:13 version. The earlier tile 20 and tile 31 problems are fixed: 74 tiles, numbered 1–74, no misplaced icons.

| # | Finding | Status |
|---|---|---|
| 1 | Docks effect and ocean food | Updated in the 15:13 workbook |
| 2 | Sepúlveda's slaves | Updated to 2 in the 15:13 workbook |
| 3 | Desert produces nothing; tundra has 1 bonus on 20 cells | Intended **[A]**. The cossack can work empty tundra **[A]** |
| 4 | Bonus frequencies differ from the Terrain sheet's percentages | Not a problem; the percentages are untested notes **[A]**. Actual frequencies are still reported, for information |
| 5 | 3 mountain cells carry corn | Dropped on import (DD-47); to be removed from the workbook |
| 6 | Document lists no crops from forest, the sheet does | Sheet followed |
| 7 | Common agent deck is 35% military (17 of 49) | For simulation to judge |
| 8 | Price cap and tax track exist only on the Europe board image | Confirmed current **[A]**. Kept in the settings file |
| 9 | Settlement activation effect is in neither source | Answered **[A]**. To be added to the document |
| 10 | Difficulty stars and some starting decks in the document follow older text | Sheet used |
| 11 | `Benedict Arnold` uses `edward colston.png` | Art only |

## 6. Assets

- Use raw art in `assets/`. The `components/` exports are outdated and are not used **[A]**, with two exceptions read for information only: the tax track and the play mat.
- Pipeline: resize and convert to WebP, keep several sizes, produce a manifest of entity → image, report gaps. Done by `packages/web/tools/art.py`, which ends with a report of missing and unused images per kind (FR-D-5).
- Reuse directly: terrain textures, portraits, buildings, Fathers, tribes, nation panels, emblems, card backs.
- New art needed: map tokens for ship, pawn, colony and settlement; resource and interface icons (emoji are used now and render differently by platform); terrain transitions and coastlines; fog; war screen.
- Some file names contain Cyrillic letters (`сaravel.png`); the pipeline normalises names.
