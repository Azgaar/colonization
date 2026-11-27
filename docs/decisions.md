# Decisions and open questions

## Decided by the designer (2026-11-25)

| # | Decision |
|---|---|
| DD-1 | "Активация индейцев: 🛖 N" activates settlement number N |
| DD-2 | Solo has no loyalist |
| DD-3 | Buildings belong to the player and serve all colonies |
| DD-4 | One sale may fill the demand track several times. The whole trade action uses the old price; the new price applies from the next trade action |
| DD-5 | "Среднее" education was a mistake; it is basic 📖 |
| DD-6 | Where sources disagree, the spreadsheet is correct |
| DD-7 | Outdated component exports are ignored |
| DD-8 | Write the PRD before building anything |
| DD-9 | The computer version may look like a PC 4X and must be easy to tweak. How far rules may differ is set by DD-10 |
| DD-10 | PC rules follow board rules. They may change to suit the PC, but the goal is a board game, so rules must stay convertible to it |
| DD-11 | Settlement activation affects the player with the nearest colony. Hostility 0–2: gives 1 🟨; 3: nothing; 4–5: raid |
| DD-12 | Around the map: inner ring open sea, outer ring Europe |
| DD-13 | Tax track 0, 1, 3, 6, 10, 10, 15, 15, 20, 25 and price cap 5 are current |
| DD-14 | Ocean cells need no docks and give 1 🟨. Docks are a building to work in and give +1 🟨 for an ocean cell, so 2 |
| DD-15 | The warehouse is shared by all the player's colonies |
| DD-16 | Desert producing nothing and nearly empty tundra are intended. The Cossack can use empty tundra |
| DD-17 | Sepúlveda gives 2 slaves for now |
| DD-18 | Bonus frequencies in the spreadsheet are untested, not guidance |
| DD-19 | Four-card starting decks are intended: those nations are harder |
| DD-20 | Activation does nothing if there is no settlement with that number or no colony |
| DD-21 | The Cossack principle also covers the Trapper and Planter |
| DD-22 | Propaganda takes up to 2 Fathers |
| DD-23 | The action card counts as 1 in combat strength |
| DD-24 | "All patriots" stays as written; it is meant to be very rare |
| DD-25 | The designer will apply the source edits below later; until then this specification is ahead of them |
| DD-26 | Loyalist win rate with 4 players should be about 15%. Other balance targets are accepted, except the round 5 leader (Q14) |
| DD-27 | Numbers missing from the workbook stay in a separate settings file; no new sheet |
| DD-28 | Criminals and slaves count as support in battle |
| DD-29 | One action moves both ship and infantry only through embarking or disembarking |
| DD-30 | Solo is won by keeping a colony |
| DD-31 | Working in docks includes the cell's fish bonus (+1), and a fisherman adds +1 more |
| DD-32 | Balance is not needed now; first check that the systems work in general |
| DD-33 | Interface follows direction B, painted world. A and C are abandoned |
| DD-34 | Nation emblems are white on the nation's colour, with shadow and texture |
| DD-35 | B2's look is preferred. Map at least 80% of the screen in map view; colony west, Europe east |
| DD-36 | Dragging an agent shows every possible action, off the map as well |
| DD-37 | The King's army must be readable as an exact number. The war needs no full screen of its own |
| DD-38 | Keep B2's large agent cards, full-screen Colony and Europe views, and Governors view |
| DD-39 | Placed agents stay visible where they were placed until the round ends |
| DD-40 | Warehouse and hold goods are both shown as heaps of goods. Dragging an agent never moves the camera |
| DD-41 | Europe is not drawn as a place. The outer ring of cells on all four sides is marked as Europe cells, as in DD-12, and water fills the whole screen beyond it |
| DD-42 | Colony preview at the left shows its goods, Europe preview at the right shows prices and the pier. Options are in their own menu |
| DD-43 | B8, the tilted map, is the official interface prototype (then `prototypes/index.html`, now `packages/web`). Other versions are removed; they remain in git history (commit 5c6d9ac). Design work continues in smaller steps |
| DD-44 | The pier at rest shows faces only; names, abilities and prices appear on hover |
| DD-45 | Hiring, building and Founding Fathers show every choice at once when an agent is lifted, with no second list |
| DD-46 | The Europe border is subtle: faint hatching without a hard line |
| DD-47 | Mountains carry no food bonus. The importer drops the three printed ones until the workbook is edited |
| DD-48 | The prototype phase is over. The interface is TypeScript in `packages/web`, in strict mode, with minimal unit tests and no end-to-end tests for now |

## Decided by the designer (2026-11-26)

| # | Decision |
|---|---|
| DD-49 | Rule change "cube-strength-1" (direct) promoted from pc to board: Each King's army cube attacks with 1 ⚔️, not 2. / Каждый кубик армии короля атакует с силой 1 ⚔️, а не 2. Why: The King's army grows with every refusal at every seat (about 104 cubes at 4 players); colonies are defended by about 5, so 5% survive and the loyalist wins 87%. To carry into the sources: settings.war.refStrength → 1 (packages/data/src/settings.ts: war.refStrength) |
| DD-50 | Rule change "refusal-no-bell" (direct) promoted from pc to board: Refusing the tax adds cubes to the King's army but gives no bell. / Отказ от налога добавляет кубики в армию короля, но не даёт колокола. Why: Refusing is free in bells and feeds the race to 15: refusals give 9 of 15 bells and end games early. To carry into the sources: settings.tax.refuseBells → 0 (packages/data/src/settings.ts: tax.refuseBells) |
| DD-51 | Rule change "base-defence-4" (direct) dropped from pc. Why it was tried: A colony's own defence in the war is 1, too small against any share of the King's army |
| DD-52 | Rule change "refusal-1-cube" (direct) promoted from pc to board: Refusing the tax adds 1 cube to the King's army, not 2 (solo unchanged). / Отказ от налога добавляет в армию короля 1 кубик, а не 2 (соло без изменений). Why: Each refusal adds 2 cubes to a pool shared by all patriots, so refusing is cheap for the refuser and costly for the others (H2). To carry into the sources: settings.tax.refuseRef → 1 (packages/data/src/settings.ts: tax.refuseRef) |

## Decided by the designer (2026-11-27)

| # | Decision |
|---|---|
| DD-53 | "Leader at round 5 wins … very rare" (Q14) meant that games rarely end by round 5. The target "games ending before round 8: under 25%" covers it; who leads at round 5 is still reported, with no target |
| DD-54 | A ship damaged by any cause (battle, storm, pirates, wreck) goes to Europe, or next to an own colony if its owner has a shipyard (Q15, the default kept) |
| DD-55 | A settlement revealed next to an existing colony is placed as usual: the distance rule limits founding only (Q16, the default kept) |
| DD-56 | Forest gives timber only; fur needs a fur bonus (R-4) or a trapper (R-5). The document is right here and the spreadsheet is to be corrected, an exception to DD-6 (Q17). In `board` as `forest-timber-only` (`terrain.forest.yields` → timber). A trapper on plain forest now gives 1 fur, 2 with the bonus |
| DD-57 | Supply stays as written: spend 1 food, play 1 card, draw 1. It is a way to swap a card, not to gain one; H13 is answered as intended (Q18) |
| DD-58 | A 2-player game has no loyalist. The war plays as with 3+ players without the loyalist's steps: the King's army attacks both players' colonies alone and the game rolls the dice, as in W-12 without a loyalist (Q20). In `board` as `two-players-no-loyalist` (new setting `war.loyalistFrom`: 2 as printed, 3 in `board`) |
| DD-59 | It should be easy for the loyalist to take a colony. The loyalist's threshold for taking a fallen colony (W-13) uses the same strength per cube as the attack, so DD-49 lowered it from 2 to 1 per cube; that is intended |
| DD-60 | Rule change "recruit-action" (direct) promoted from pc to board: Recruit (action). Play any agent. Spend any number of crosses, at least the round number, and look at that many top agents of the Europe deck. You may put one in your discard; the rest go to the bottom of the Europe deck in any order. Recruiting is no longer free. Roger Williams: when recruiting, take up to 2 of the agents you look at. / Вербовка (действие). Сыграйте любого агента. Сбросьте любое количество ✝️, но не меньше номера тура, и посмотрите столько же верхних агентов колоды Европы. Одного можете положить в свой сброс, остальных — под низ колоды Европы в любом порядке. Вербовка больше не бесплатна. Роджер Уильямс: при вербовке возьми до 2 из просмотренных агентов. Why: Every action takes an agent, except recruiting with crosses (T-8), which can also be done with an empty hand. As a card action it needs more pull: the crosses spent buy that many looks, so saving crosses pays. To carry into the sources: settings.crosses.recruitAction → true (packages/data/src/settings.ts: crosses.recruitAction); fathers.roger_williams.mods → [{"mod":"recruitTake","value":2}] (Fathers, F22 (effect)) |
| DD-61 | The King's army is called the Royal Army (Королевская армия) in the game, its rules and the rulebook. Entries above keep the wording they were decided with |

## Proposed in this PRD, awaiting confirmation

| # | Proposal | Why | Cost if reversed |
|---|---|---|---|
| PD-2 | Balance evidence (M2) before the interface (M3) | It may change rules the interface depends on | Low |
| PD-3 | Web app in TypeScript, local, no server | Same code for simulation and play; easy to run and share | High |
| PD-4 | Structured effects in a file beside the workbook, with out-of-date detection | Parsing Russian card text automatically would be unreliable | Medium |
| PD-5 | Russian and English from the start | Content is Russian; retrofitting language support is costly | Medium |
| PD-6 | Code identifiers in English, from `nickname` | Already in the workbook | Low |
| PD-7 | Bots are conventional AI, not LLMs | Thousands of reproducible games are needed | Low |
| PD-8 | Two rulesets, `board` and `pc`, with conversion labels; each `pc` change is promoted or dropped (PRD section 5) | Puts DD-10 into practice | Low |
| PD-10 | The interface plays the real rules engine with the test bots, bundled from their sources into `packages/web/dist/app.js` by `pnpm web:build`, so every step of the rules has a place in the interface | Faked steps hid missing screens and wrong numbers | Low |

## Open questions

Work can start with the defaults. "Matters" is an estimate of the effect on results.

None at the moment. Smaller defaults are marked **[D]** in [rules-spec.md](rules-spec.md).

Answered: Q1 (DD-11), Q2 (DD-12), Q3 (DD-13), Q4 (DD-22), Q5 (DD-14), Q6 (DD-15), Q7 (DD-23), Q8 (DD-26), Q9 (DD-27), Q10 (DD-28), Q11 (DD-29), Q12 (DD-30), Q13 (DD-31), Q14 (DD-53), Q15 (DD-54), Q16 (DD-55), Q17 (DD-56), Q18 (DD-57), Q19 (DD-49 to DD-52), Q20 (DD-58).

## Source edits still to make

Checked on the 15:13 versions. Done by the designer: activation rule, docks, ocean, Sepúlveda, terrain costs, spreadsheet wording of events.

| Where | Edit | From |
|---|---|---|
| Document, Принципы | Describe the two rings | DD-12 |
| Document, Салон | "1 Отца-Основателя" → up to 2 | DD-22 |
| Spreadsheet, terrain | Forest gives timber only, not 🟩 | DD-56 |
| Document, starting decks and stars | Follow the spreadsheet | DD-6 |
| Document, Торговец | Education 🎓 in the document, 📖 in the spreadsheet | DD-6 |
| Document, Поселенец | "Базовых построек" is not in the spreadsheet; every building is cheaper | DD-6 |
| Spreadsheet, Tiles | Remove 🌽 from tile 8 cell 3, tile 35 cell 6, tile 37 cell 7 (mountains) | DD-47 |
| Document, Эквиано | Slaves go under the deck in the document, are removed in the spreadsheet | DD-6 |
| Document, war | Each Royal Army cube attacks with 1 ⚔️, not 2 | DD-49 |
| Document, tax | Refusing the tax gives no bell | DD-50 |
| Document, tax | Refusing the tax adds 1 cube to the Royal Army, not 2 (solo unchanged) | DD-52 |
| Document, war | With 2 players there is no loyalist; the war plays without the loyalist's steps | DD-58 |
| Document and spreadsheet | Call the King's army the Royal Army (Королевская армия) everywhere | DD-61 |
| Document, Кресты | Recruiting is an action: play an agent, spend ✝️ (at least the round number), look at that many agents, take one to the discard, the rest to the bottom | DD-60 |
| Spreadsheet, Fathers F22 | Roger Williams: when recruiting, take up to 2 of the agents you look at | DD-60 |
