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
| DD-43 | B8, the tilted map, is the official interface prototype (`prototypes/index.html`). Other versions are removed; they remain in git history (commit 5c6d9ac). Design work continues in smaller steps |
| DD-44 | The pier at rest shows faces only; names, abilities and prices appear on hover |
| DD-45 | Hiring, building and Founding Fathers show every choice at once when an agent is lifted, with no second list |
| DD-46 | The Europe border is subtle: faint hatching without a hard line |
| DD-47 | Mountains carry no food bonus. The importer drops the three printed ones until the workbook is edited |

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
| PD-10 | The prototype plays the real rules engine with the test bots (`prototypes/build/engine.js`, built by `pnpm prototype`), so every step of the rules has a place in the interface | Faked steps hid missing screens and wrong numbers | Low |

## Open questions

Work can start with the defaults. "Matters" is an estimate of the effect on results.

| # | Question | Default used | Matters |
|---|---|---|---|
| Q14 | "Leader at round 5 wins": should the player with the highest score at round 5 rarely win in the end, or did the answer mean that games rarely end by round 5? | Reported, no target | Low |
| Q15 | What happens to a ship damaged by a storm, pirates or a wreck? It cannot move, and repair needs Europe or a shipyard | Goes to Europe (or next to a colony with a shipyard), as after a lost battle | High |
| Q16 | May a settlement appear next to an existing colony when a fragment is revealed? | Yes | Low |
| Q17 | Does forest give fur without a fur bonus? The document (15:13) says timber only, the spreadsheet 🟫, 🟩 | Yes, as in the spreadsheet | Medium |
| Q18 | Is Supply meant to gain an action? As written it plays 1 card to draw 1, so it only swaps a card for 1 food and a turn | As written | Medium |

Smaller defaults are marked **[D]** in [rules-spec.md](rules-spec.md).

Answered: Q1 (DD-11), Q2 (DD-12), Q3 (DD-13), Q4 (DD-22), Q5 (DD-14), Q6 (DD-15), Q7 (DD-23), Q8 (DD-26), Q9 (DD-27), Q10 (DD-28), Q11 (DD-29), Q12 (DD-30), Q13 (DD-31).

## Source edits still to make

Checked on the 15:13 versions. Done by the designer: activation rule, docks, ocean, Sepúlveda, terrain costs, spreadsheet wording of events.

| Where | Edit | From |
|---|---|---|
| Document, Принципы | Describe the two rings | DD-12 |
| Document, Салон | "1 Отца-Основателя" → up to 2 | DD-22 |
| Document, terrain table | Forest also gives crops, or correct the spreadsheet | Q17 |
| Document, starting decks and stars | Follow the spreadsheet | DD-6 |
| Document, Торговец | Education 🎓 in the document, 📖 in the spreadsheet | DD-6 |
| Document, Поселенец | "Базовых построек" is not in the spreadsheet; every building is cheaper | DD-6 |
| Spreadsheet, Tiles | Remove 🌽 from tile 8 cell 3, tile 35 cell 6, tile 37 cell 7 (mountains) | DD-47 |
| Document, Эквиано | Slaves go under the deck in the document, are removed in the spreadsheet | DD-6 |
