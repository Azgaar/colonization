# Colonization: Product Requirements

|                     |                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Status              | Draft 4, designer answers included                                                                                                    |
| Date                | 2026-11-25                                                                                                                            |
| Sources             | `Колонизация.docx`, `Colonization.xlsx` (both as of 2026-11-25 14:12), `assets/`                                                      |
| Companion documents | [rules-spec.md](rules-spec.md) · [data-spec.md](data-spec.md) · [ai-and-testlab.md](ai-and-testlab.md) · [decisions.md](decisions.md) |

This PRD says what is being built, why, and in what order. The companion documents hold the detail. Where two documents conflict, `rules-spec.md` wins on game rules and this one wins on scope.

## 1. Problem

The board game prototype is complete on paper: rules, data, art, and a Tabletop Simulator table. Testing it is the bottleneck.

- A multiplayer test needs several people for hours. Recorded tests so far are three solo games.
- Solo games cannot reveal multiplayer problems. Refusing taxes looks balanced solo but not with 3 or more players (see [hypothesis H2](ai-and-testlab.md#5-balance-hypotheses)).
- The content is too large to cover by hand: 10 nations, 34 Founding Fathers, 22 events, 40 ruin and wreck cards, 9 King tactics, 74 map tiles.
- Printing is slow and expensive to repeat, so numbers should be settled first.
- Tabletop Simulator enforces no rules, so it finds no contradictions and collects no data.

## 2. Vision

A web game that plays like a colonial-era 4X on PC, with its own look. Under it is a headless rules engine that can play thousands of AI games and report what is broken or unbalanced. Any number in the game can be changed and re-tested in minutes.

### Goals

| #   | Goal                                                | Measure                                                                                                                             |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Validate and improve the board game before printing | Every printed rule and card is implemented and exercised by simulation, and each balance hypothesis gets an evidence-backed verdict |
| G2  | Be a game worth playing                             | A person can finish a 1–5 player game against AI without reading the rulebook first                                                 |
| G3  | Make tweaking cheap                                 | Changing a number and getting an A/B report takes no code and under 10 minutes                                                      |
| G4  | Give AI opponents that expose flaws                 | Bots play legally, pursue distinct strategies, and the strongest reliably beats the simpler ones                                    |
| G5  | Tell us what to print                               | Report peak use of each component (cubes, tokens, card copies)                                                                      |

### Non-goals for version 1

- Mechanics that cannot be played at a table.
- Online multiplayer, accounts, servers, monetisation.
- Mobile-first layout. Tablet-size screens should work, phones are not a target.
- Replacing Tabletop Simulator or Dextrous, or producing print files.
- Reproducing screens, art, names or layouts of any existing game. The presentation is original.
- 3D graphics, animation-heavy combat, voice, or a campaign.
- LLM-driven players. Balance results need thousands of fast, reproducible games.

## 3. Users

| User                   | Needs                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Designer** (primary) | Change rules, run simulations, replay odd games, see which cards and nations are off |
| **Player**             | Play a full game against AI or hot-seat, with clear options and no bookkeeping       |
| **Playtester**         | Play a fixed scenario and hand back a replay file with comments                      |
| **Developer or agent** | Add a card or bot safely, with tests that fail when a rule breaks                    |

## 4. Key product decisions

Full reasoning is in [decisions.md](decisions.md).

1. **The final product is a board game.** PC rules follow the board rules. They may be changed to suit the PC, but every change must be convertible back to the table (section 5) **[A]**.
2. **The v1 difference is presentation.** Continuous map with fog, colony and Europe screens, automatic bookkeeping, previews, undo, advisors. Mechanics start identical.
3. **The spreadsheet is the source of truth for data.** It is imported, never retyped. Unused component exports are ignored.
4. **Unclear rules become named settings with a default**, so no ambiguity blocks work.
5. **Everything random comes from a seed.** Any game can be replayed exactly.
6. **The AI sees only what a human in that seat would see**, unless a run is explicitly marked as cheating.
7. **Web app in TypeScript.** Runs locally with no server. A desktop wrapper can come later.

## 5. Board and PC rules

Two rulesets share one engine:

| Ruleset | Content                                        | Role                                                                  |
| ------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| `board` | The paper rules as they would be printed today | Reference for balance and printing. Changes only by explicit decision |
| `pc`    | `board` plus named changes. Empty at the start | Where ideas are tried and played                                      |

A change that works in `pc` is either **promoted** to `board`, and then carried into the document and spreadsheet, or **dropped**. The two are not meant to drift apart for good.

Each change carries a conversion label:

| Label           | Meaning                                                             | Allowed in `pc`                |
| --------------- | ------------------------------------------------------------------- | ------------------------------ |
| Interface       | No rule changes: automation, previews, undo, fog drawing, animation | Yes                            |
| Direct          | Changes a number or text already printed                            | Yes                            |
| Component       | Needs a new card, token or track that can be produced               | Yes, with the component listed |
| Not convertible | Cannot reasonably be played at a table                              | Sandbox experiments only       |

A change is convertible when all of these hold:

1. **Tracking:** all state can be shown with cards, cubes, tokens or a track, within a reasonable count.
2. **Arithmetic:** small whole numbers, a sum a player can do in their head.
3. **Randomness:** dice, shuffled cards or drawn tokens, with odds those can produce.
4. **Hidden information:** hidden by cards or face-down pieces, with no referee needed.
5. **Decisions by the system** (events, natives, the King): follow a short printed procedure.
6. **Effort:** upkeep does not noticeably lengthen a turn for human players.
7. **Wording:** fits in a rules paragraph or on a card.

AI opponents are the exception: they replace human players and are not a rule. Solo play must still work without them.

## 6. What the game is

One paragraph for orientation; the rules are in [rules-spec.md](rules-spec.md).

1–5 governors explore a hidden 12×12 map, found up to three colonies, and play agent cards from a personal deck. Each turn is one card and one action: move, found, attack, trade, hire, recruit Fathers, repair, produce, build, supply, exchange. Each of up to 10 rounds ends with an event and a tax that can be paid or refused. Refusal strengthens the Royal Expeditionary Force (REF, КЭК). When someone reaches 15 bells or round 10 ends, the War of Independence is resolved once: the least rebellious player joins the King, the others defend their colonies, and surviving colonies plus assets are scored.

## 7. Functional requirements

Priority: **M** must (v1), **S** should (v1 if cheap), **C** could (later). Milestones are in section 11.

### 7.1 Data import

| ID     | Requirement                                                                                   | P   | Milestone |
| ------ | --------------------------------------------------------------------------------------------- | --- | --------- |
| FR-D-1 | Import every content sheet of the workbook into typed, versioned game data                    | M   | M1        |
| FR-D-2 | Validate on import; fail with sheet, row and column for each error                            | M   | M1        |
| FR-D-3 | Warn about gameplay anomalies, e.g. effects that cannot trigger, too few copies for an effect | M   | M1        |
| FR-D-4 | Report differences between two imports in plain words                                         | S   | M2        |
| FR-D-5 | Map art to entities, downscale for web, report missing or unused images                       | M   | M3        |
| FR-D-6 | Keep Russian and English names for every entity                                               | M   | M1        |

### 7.2 Rules engine

| ID      | Requirement                                                                                                                                | P   | Milestone |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- | --------- |
| FR-E-1  | Implement the complete `board` ruleset for 1–5 players                                                                                     | M   | M1        |
| FR-E-2  | Expose every choice, including combat responses, event choices and war setup, as an explicit pending decision with a list of legal options | M   | M1        |
| FR-E-3  | Be deterministic: same ruleset, data, seed and choices give the same game                                                                  | M   | M1        |
| FR-E-4  | Record a log of choices and consequences sufficient to replay, undo and explain any state                                                  | M   | M1        |
| FR-E-5  | Provide a per-player view that hides other hands, deck orders and unrevealed tiles                                                         | M   | M1        |
| FR-E-6  | Read every number and named setting from the ruleset, never from code                                                                      | M   | M1        |
| FR-E-7  | Compose card effects from shared building blocks; custom code only for cards that need it                                                  | M   | M1        |
| FR-E-8  | Explain any computed value, e.g. combat strength or price, as a list of contributions                                                      | M   | M1        |
| FR-E-9  | Reject illegal choices with a reason a player can read                                                                                     | M   | M1        |
| FR-E-10 | Save and load at any decision, with the ruleset version embedded                                                                           | M   | M3        |

### 7.3 Rulesets and tweaking

| ID     | Requirement                                                                                                            | P   | Milestone |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | --- | --------- |
| FR-R-1 | A ruleset is base data plus an ordered list of small named overrides                                                   | M   | M1        |
| FR-R-2 | Overrides can change numbers, costs, copies, starting decks, prices, tax track, effects' values, and any named setting | M   | M1        |
| FR-R-3 | Overrides can disable or add cards built from existing effect blocks, with no code                                     | S   | M4        |
| FR-R-4 | Editor panel with search, default vs current value, validation and reset                                               | M   | M4        |
| FR-R-5 | Export the change list in terms of sheet, row and column so it can be applied to the workbook                          | M   | M4        |
| FR-R-6 | Changing a ruleset mid-game is allowed only in sandbox mode                                                            | S   | M4        |

| FR-R-7 | Every override carries a conversion label and its table wording; unlabelled or non-convertible overrides run only in sandbox mode | M | M1 |
| FR-R-8 | Conversion report: what differs between `pc` and `board`, with label, components needed and sources to edit | M | M4 |
| FR-R-9 | Promote or drop a change, recorded in the decision log | S | M4 |

### 7.4 AI players

| ID     | Requirement                                                                                | P   | Milestone |
| ------ | ------------------------------------------------------------------------------------------ | --- | --------- |
| FR-A-1 | Random legal bot, used to fuzz the engine                                                  | M   | M1        |
| FR-A-2 | Goal-driven bot with configurable personality weights                                      | M   | M2        |
| FR-A-3 | At least six personalities: balanced, trader, explorer-looter, missionary, rebel, loyalist | M   | M2        |
| FR-A-4 | Automatic tuning of weights by self-play, checked on held-out seeds                        | M   | M2        |
| FR-A-5 | Search-based bot (information-set MCTS) with a time or iteration budget                    | M   | M4        |
| FR-A-6 | Difficulty levels that change thinking quality, not rules or resources                     | M   | M4        |
| FR-A-7 | Every bot can report why it chose an action                                                | M   | M2        |
| FR-A-8 | Advisor: show a human player the bot's top suggestions                                     | S   | M4        |

### 7.5 Test lab

| ID     | Requirement                                                                    | P   | Milestone |
| ------ | ------------------------------------------------------------------------------ | --- | --------- |
| FR-T-1 | Run batches of AI-only games in parallel from the command line                 | M   | M2        |
| FR-T-2 | Store per-game results and replayable logs of chosen games                     | M   | M2        |
| FR-T-3 | Report the metrics listed in [ai-and-testlab.md](ai-and-testlab.md#4-metrics)  | M   | M2        |
| FR-T-4 | Compare rulesets on paired seeds with confidence intervals                     | M   | M2        |
| FR-T-5 | Sweep one or two parameters over ranges                                        | M   | M4        |
| FR-T-6 | Open any simulated game in the UI as a replay                                  | M   | M3        |
| FR-T-7 | Detect stalls, dead cards, runaway leaders and dominated options automatically | S   | M4        |
| FR-T-8 | Run batches from the UI without the command line                               | S   | M4        |
| FR-T-9 | Report peak component usage (G5)                                               | M   | M2        |

### 7.6 Game interface

| ID      | Requirement                                                                                                         | P   | Milestone |
| ------- | ------------------------------------------------------------------------------------------------------------------- | --- | --------- |
| FR-U-1  | New game: players, nations, human or AI, difficulty, ruleset, seed                                                  | M   | M3        |
| FR-U-2  | Map: pan, zoom, fog, terrain, bonuses, tokens, colonies, settlements with hostility, points of interest, Europe     | M   | M3        |
| FR-U-3  | Hand of agents; selecting a card highlights every legal action and target, with the reason an option is unavailable | M   | M3        |
| FR-U-4  | Movement with path preview and cost, exploration, loading and unloading                                             | M   | M3        |
| FR-U-5  | Colony screen: workable cells, yields, buildings, warehouse, defence breakdown                                      | M   | M3        |
| FR-U-6  | Europe screen: market with demand, agents on the pier, Fathers' salon, building projects, shipyard, REF size        | M   | M3        |
| FR-U-7  | Native settlement panel: population, hostility, alliance, available actions with odds                               | M   | M3        |
| FR-U-8  | Combat: card commitment, strength breakdown, success odds, dice result                                              | M   | M3        |
| FR-U-9  | Event, ruin and wreck cards with choices and consequences                                                           | M   | M3        |
| FR-U-10 | War of Independence as a distinct, guided sequence                                                                  | M   | M3        |
| FR-U-11 | Final scoring broken down by source                                                                                 | M   | M3        |
| FR-U-12 | Undo until hidden information or dice are revealed; unrestricted undo in sandbox mode                               | M   | M3        |
| FR-U-13 | Readable log of every action with links to the map                                                                  | M   | M3        |
| FR-U-14 | AI turns: adjustable speed, skip, summary of what happened                                                          | M   | M3        |
| FR-U-15 | Standing forecasts: score estimate, likely loyalist, siege odds per colony                                          | S   | M4        |
| FR-U-16 | Hot-seat for several humans with hand hiding                                                                        | S   | M4        |
| FR-U-17 | Replay viewer with step, jump and per-seat view                                                                     | M   | M3        |
| FR-U-18 | Russian and English interface, switchable in game                                                                   | M   | M3        |
| FR-U-19 | Sandbox: edit the state, force cards and dice, play any seat                                                        | S   | M4        |
| FR-U-20 | Tutorial and in-game rules reference                                                                                | C   | M5        |
| FR-U-21 | Sound and music                                                                                                     | C   | M5        |

## 8. User stories

**Designer**

1. I want to change the tax track and rerun 1,000 games, so that I know whether refusal still dominates.
2. I want to compare the same seeds before and after a change, so that I see the effect rather than noise.
3. I want each nation's win rate with a confidence interval, so that I can set difficulty ratings from data.
4. I want to see which agents, Fathers and buildings are never chosen, so that I can fix or cut them.
5. I want income per player split by source, so that I can tell whether trade is worth doing.
6. I want to open the weirdest simulated games as replays, so that I understand what happened.
7. I want to play a bot that only rushes bells, so that I can check that a counter exists.
8. I want to switch an unclear rule between readings and compare them, so that I can decide which to print.
9. I want a list of spreadsheet cells to change, so that a digital result reaches the printed game.
10. I want to know how many cubes and tokens were used at peak, so that I print enough.
11. I want import errors to name the row and column, so that I can fix the sheet quickly.
12. I want to force a given event or hand in sandbox mode, so that I can check one card.
13. I want to try a rule that suits the PC and see what it would take to print it, so that the digital game keeps serving the board game.

**Player**

14. I want legal actions highlighted when I pick a card, so that I can learn by playing.
15. I want odds and strength breakdowns before I attack, so that I decide with the information a board player would work out.
16. I want to undo a misclick, so that I'm not punished by the interface.
17. I want bookkeeping done for me, so that a solo game takes under an hour.
18. I want opponents with recognisable styles, so that games differ.
19. I want to see how the war would go if it started now, so that I can plan for it.
20. I want to save and resume, so that I can play in pieces.

**Playtester**

21. I want to load a scenario and export my replay with notes, so that the designer sees exactly what I saw.

**Developer or agent**

22. I want one place that says how a rule works, so that code and rules don't drift.
23. I want new cards to be data in most cases, so that adding one is safe.
24. I want any failed simulated game to give a seed and log, so that I can reproduce it at once.

## 9. Non-functional requirements

Numbers are targets to be confirmed by measurement in M1–M2.

| Area           | Requirement                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Speed          | 1,000 four-player games with goal-driven bots in under 5 minutes on the development Mac, using all cores      |
| Responsiveness | UI reacts within 100 ms; goal-driven AI moves within 200 ms; search AI within a chosen budget, 3 s by default |
| Determinism    | Same inputs give byte-identical logs across browser and command line                                          |
| Robustness     | 10,000 random-bot games with no crash, illegal state or endless loop                                          |
| Compatibility  | Current Chrome, Safari, Firefox; minimum width 1024 px                                                        |
| Offline        | Full game and lab work with no network                                                                        |
| Size           | First load under 15 MB, art loaded lazily                                                                     |
| Privacy        | No telemetry; files stay on the user's machine                                                                |
| Accessibility  | Keyboard play, colour never the only signal, scalable text, reduced motion                                    |

## 10. Architecture

```
 Colonization.xlsx ──► data import ──► game data ─┐
                                                  ├─► RULES ENGINE ◄── ruleset overrides
                                                  │     state + choice → state + events
                       ┌──────────────────────────┼───────────────────────┐
                       ▼                          ▼                       ▼
                   AI players                 Test lab                Game UI
               (per-seat view only)      (parallel batches)      (map, screens, replay)
```

| Module   | Responsibility                                              | Depends on        |
| -------- | ----------------------------------------------------------- | ----------------- |
| `data`   | Import, schema, validation, localisation, asset manifest    | –                 |
| `engine` | State, legal choices, transitions, effects, scoring, replay | `data` types only |
| `bots`   | Random, goal-driven, search                                 | `engine`          |
| `lab`    | Batches, metrics, A/B, sweeps, reports                      | `engine`, `bots`  |
| `app`    | Interface, tweak panel, replay viewer                       | all               |

Rules for the boundaries:

- `engine` has no DOM, no clock, no unseeded randomness and no I/O, so it runs the same in a browser, a worker and Node.
- The engine's public surface is small: create a game, get the pending decision, apply a choice, get a player's view, explain a value.
- The UI and bots use the same surface. There is no back door for either.
- War, combat and market calculations are pure functions that can be tested alone.

Proposed stack: TypeScript (strict), pnpm workspace, Vite, React for screens, PixiJS for the map, Zod for schemas, Vitest and fast-check for tests, worker threads for batches. The project needs a git repository, with raw art kept out of normal git history (`assets/` and `components/` total about 426 MB).

## 11. Milestones

Each milestone ends with something the designer can use.

| #                                   | Milestone               | Delivers                                                                                     | Exit criteria                                                                                            |
| ----------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| M0                                  | Specification           | This document set, reviewed                                                                  | Open questions in `decisions.md` answered or defaults accepted                                           |
| M1 (built)                          | Engine                  | Import, full `board` ruleset, random bot, replay                                             | Every rule ID has a test; every card effect has a test; 10,000 random games clean at 1–5 players         |
| M2 (tools built, evidence deferred) | Evidence                | Goal-driven bots, tuning, batch runner, first balance report                                 | Tuned bots beat random bots in over 95% of two-player games; hypotheses H1–H13 each have a first verdict |
| M3                                  | Playable                | Full interface, replay viewer, art, both languages                                           | A person completes solo and four-player games with no console; simulated games open as replays           |
| M4                                  | Design bench            | Search AI, tweak panel, sweeps, sandbox, hot-seat                                            | Search bot beats tuned bots significantly; designer completes a tweak-test-export cycle unaided          |
| M5                                  | Rule changes and polish | Convertible PC rule changes, promotion to `board`, tutorial, sound, optional desktop package | Agreed separately after M4                                                                               |

M1 status (2026-11-25): all rule IDs and cards have tests; 20,000 random games at 1–5 players and 2,000 with alternative settings ran without failures. Not checked yet: identical results in a browser, English card texts beyond names and option labels.

M2 status (2026-11-25): goal-driven bots, eight personalities, war solver, batch runner, metrics, paired comparisons and self-play tuning work; see [system-check.md](system-check.md). **Not met:** bots are weaker than the designer's recorded solo games, so the exit criteria are open. The designer asked to check that systems work first and leave balance for later.

M3 status (2026-11-26): done. The interface is `packages/web`: new game with players, the player's nation, each bot's character, ruleset and seed; the full map, hand, Colony and Europe screens, every engine decision as a panel, combat, events, ruins, wrecks, the war and the final score by source; saving in the browser at every decision and to a file; undo until something hidden shows; replays of bot games with step, jump and any seat's view; both languages.

## 12. Testing

Good tests here check observable behaviour: given a state and a choice, these options are legal and this is the result.

| Level          | What                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Rule tests     | At least one per rule ID in `rules-spec.md`, including every named setting's alternatives                                    |
| Card tests     | One scenario per agent, building, Father, event, ruin, wreck, tactic and tribe                                               |
| Property tests | Conservation of cards; limits never exceeded; no negative stock; view never leaks hidden information; replay equals original |
| Fuzzing        | Random-bot games at all player counts, on every ruleset                                                                      |
| Golden games   | A few full logs that must not change unless a rule does                                                                      |
| Bot tests      | Bots only use their view, always return a legal choice, respect their budget                                                 |
| UI tests       | Main flows end to end, including a full war                                                                                  |

## 13. Risks

| Risk                                       | Effect                                             | Response                                                                                                       |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Bots play poorly                           | Balance results mislead                            | Report bot strength with every result; require findings to hold for several bot types; confirm with human play |
| Bots share a blind spot                    | A real exploit is missed                           | Distinct personalities, search bot, directed "exploit hunter" experiments                                      |
| Digital rules drift from paper             | Results don't transfer; game stops being printable | Rule IDs, locked `board` ruleset, conversion labels, promote or drop                                           |
| Ambiguous rules multiply                   | Wrong game is tested                               | Every default is logged and switchable; sensitivity runs show which ones matter                                |
| Social play is not modelled                | Bluffing, deals and table mood stay unknown        | State this limit; use hot-seat and human playtests                                                             |
| Scope creep in the interface               | Evidence is delayed                                | M2 before M3; section 2 non-goals                                                                              |
| Title and theme close to a commercial game | Problem on public release                          | Treat "Colonization" as a working title; original presentation; check naming before any public release         |
| Sensitive history (slavery, conquest)      | Poor reception                                     | Keep wording factual and consistent; review card texts before public release                                   |

## 14. Success criteria for v1

1. Every hypothesis in `ai-and-testlab.md` has a verdict with sample size and confidence interval.
2. The designer has made at least one ruleset change backed by lab data and carried it into the workbook.
3. A newcomer finishes a game against AI using only in-game help.
4. No known mismatch between `board` and the rules document and spreadsheet.
5. A printing list with component counts exists.
6. Every difference between `pc` and `board` is convertible and has a recorded status.
