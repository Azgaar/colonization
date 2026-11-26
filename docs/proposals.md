# Proposed rule changes

2026-11-26. Proposals for the designer, from lab evidence. Nothing here is decided: a change reaches `board`, the rulebook and the spreadsheet only by the designer's choice (`pnpm rules promote <id>`, logged in [decisions.md](decisions.md)).

All candidates are **direct** changes: one printed number each, with the table wording ready. They are the overrides of [`rulesets/proposed.json`](../rulesets/proposed.json), which is a sandbox ruleset holding all of them: try one package at a time. The full tables are reproduced by `node packages/lab/src/proposals.ts 400` (about 13 minutes on 8 cores), which writes `out/proposals.md`.

## The problem: the war is one-sided

Baseline on `board`, 4 players (paired experiments, tuned bots and mixed bot characters agree):

| | Board now | Target ([ai-and-testlab.md](ai-and-testlab.md#balance-targets)) |
|---|---|---|
| Loyalist wins | 87–89% | about 15% (10–20%) |
| Patriot colonies that survive the war | 4–5% | 40–70% |
| King's army in the war | 75–104 cubes, about 28 attack per colony | |
| A colony's defence | about 5 | |
| Affordable taxes refused (3+ players) | 96–100% | |
| Games ending before round 8 (mixed bots) | 53% | under 25% |

Why: every refusal adds 2 cubes to one pool shared by all patriots, so refusing costs the refuser little (H2), and each cube attacks with 2 against a colony that starts at 1. The King's army outgrows any defence a colony can buy, so the least rebellious player wins almost every game. Refusal bells also feed the race to 15 bells, so games end early (H3).

## Candidates

| Id | Table wording | Setting |
|---|---|---|
| `cube-strength-1` | Each King's army cube attacks with 1 ⚔️, not 2. | `war.refStrength` 2 → 1 |
| `base-defence-4` | In the war every colony defends with 4 before buildings, terrain and troops, not 1. | `war.baseDefence` 1 → 4 |
| `refusal-no-bell` | Refusing the tax adds cubes to the King's army but gives no bell. | `tax.refuseBells` 1 → 0 |
| `refusal-1-cube` | Refusing the tax adds 1 cube to the King's army, not 2 (solo unchanged). | `tax.refuseRef` 2 → 1 |

Russian wording for each is in `rulesets/proposed.json`.

## Evidence

400 paired games per cell (same seeds, nations and seats on both sides), 2–5 players, two kinds of bots: **tuned** (one self-play-tuned bot in every seat; these never race to 15 bells) and **mixed** (eight characters rotating, including the rebel who does).

**4 players**

| Rules | Loyalist wins (tuned / mixed) | Colonies survive (tuned / mixed) | Ends before round 8 (mixed) |
|---|---|---|---|
| board | 87% / 87% | 4% / 4% | 53% |
| cube strength 1 | 46% / 35% | 28% / 31% | 79% |
| base defence 4 | 81% / 83% | 7% / 6% | 53% |
| no refusal bell | 92% / 93% | 3% / 3% | 10% |
| refusal 1 cube | 66% / 63% | 18% / 16% | 55% |
| **A**: cube 1 + defence 4 | 26% / 15% | 44% / 56% | 87% |
| **B**: cube 1 + defence 4 + no refusal bell | 39% / **21%** | 34% / **46%** | **50%** |
| **C**: cube 1 + refusal 1 cube + no refusal bell | 39% / 11% | 43% / 56% | 56% |

**Package B across player counts** (mixed bots; board in brackets)

| Players | Loyalist wins | Colonies survive | Ends before round 8 |
|---|---|---|---|
| 2 | 73% (96%) | 15% (3%) | 11% (30%) |
| 3 | 32% (92%) | 37% (3%) | 35% (40%) |
| 4 | 21% (87%) | 46% (4%) | 50% (53%) |
| 5 | 15% (86%) | 49% (3%) | 62% (64%) |

What the numbers say:

- **Cube strength is the main lever.** Alone it moves the loyalist from 87% to 35–46% and lets about 30% of colonies survive.
- **Base defence helps little alone, much with weaker cubes.** It matters once an attack is near a colony's defence.
- **The refusal bell decides game length.** Without it, games end before round 8 five times less often. With the war made winnable for patriots (package A), racing to 15 bells pays and 87% of games end early; taking the bell away (B) brings that back to the board's level.
- **Package C** is as strong as A for the war and keeps games as long as B, but it removes cubes from the King's army instead of making colonies sturdier, which flattens the tax decision further.

## Recommendation

**Package B: `cube-strength-1`, `base-defence-4`, `refusal-no-bell`.** It is the closest to all three targets at 3–5 players with mixed bots (loyalist 15–32%, colonies 37–49%, early endings at or below the board's), with three short changes to printed numbers and no new component.

Open after B:

1. **Two players stay loyalist-heavy** (62–89% under every package): with one patriot against one loyalist, whoever has fewer bells nearly always wins. This looks structural (for example, no loyalist with 2 players, or a different 2-player war) and is a question for the designer, not a number to tune. Asked as Q19 in [decisions.md](decisions.md#open-questions).
2. **Early endings** remain at about half of 4-player games with mixed bots, as on the board now. With tuned bots no game ends early, so this depends on how often players race for bells; human games will tell more.
3. **With tuned bots the loyalist still wins 38–39%** at 4–5 players under B. The tuned bots were trained under the old war; they should be tuned again under the chosen rules before the numbers are trusted further.

## Not proposed yet

- **Dead cards** (detectors, 800 games): the school (built by 9 of 1,929 seats it was offered to), the slave, the smuggler. Teaching and smuggling are actions the bots hardly use ([system-check.md](system-check.md)), so this may be the bots, not the cards.
- **"Dominated" town hall, stockade, the work action, alliances**: their holders win less, but they are what patriots build, and patriots lose under the current war. Recheck after the war change.
- **Supply** (H13) plays one card to draw one. Its food cost and draw are fixed in the engine rather than read from the settings, so trying "Supply draws 2" first needs them made settings.

## Caveats

Bots play weaker than people ([system-check.md](system-check.md)): they build up slowly and defend badly. Each finding here holds for both kinds of bot, as the lab's standards ask, but human games remain the check. Each proposal can be tried in the game: Design bench → Rules, make a ruleset with the package's three values, then Play it.

## To adopt a change

1. Copy its override from `rulesets/proposed.json` into `rulesets/pc.json` (or make a ruleset in the design bench and export it).
2. `pnpm rules promote <id>`: moves it to `board`, logs the decision, and prints the cell or setting to edit.
3. Carry the table wording into the rulebook.
