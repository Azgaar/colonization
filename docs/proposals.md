# Proposed rule changes

2026-11-26. Proposals for the designer, from lab evidence. Nothing here is decided: a change reaches the rules (`rules/`), and with them the spreadsheet and the rulebook, only by the designer's choice (`pnpm rules apply`, logged in [decisions.md](decisions.md)).

Every candidate is a **direct** change: printed numbers only, with the table wording ready. They are the overrides of [`rulesets/proposed.json`](../rulesets/proposed.json), a sandbox ruleset on top of `board`. The full tables come from `node packages/lab/src/proposals.ts 400` (about 7 minutes on 8 cores), which writes `out/proposals.md`.

## Decided so far

- **Accepted** (DD-49, DD-50, DD-52): each Royal Army cube attacks with 1, not 2; refusing the tax gives no bell; refusing adds 1 cube, not 2. All three are now in `board`.
- **Accepted** (DD-60, the designer's own change): recruiting with crosses is an action; the crosses spent are the agents looked at; Roger Williams takes up to 2.
- **Accepted** (DD-62, the designer's own change): a colony may be founded on the edge of the map. The edge rule dates from when the tiles touched Europe; the open-sea ring (DD-12) already keeps edge colonies apart from it.
- **Accepted** (DD-63 to DD-67): one product per terrain. Grassland gives crops only, the farmer +1 🍂, Squanto and the Indian +1 🐟; corn is gone from the game, bonuses included, and food is drawn as a fish.
- **Accepted** (DD-71, the designer's idea): paying the tax gives +1 🔔.
- **Rejected** (DD-51): a base colony defence of 4. The designer's rule: a colony's strength is balanced by the King's cubes, not by raising the colony.

## Where the board stands

4 players, 400 paired games, two kinds of bot: **tuned** (one self-play-tuned bot in every seat; never races to 15 bells) and **mixed** (eight bot characters, including the rebel who races). Targets in [ai-and-testlab.md](ai-and-testlab.md#balance-targets).

| | Before the changes | Cube 1 + no refusal bell | Now (+ refusal 1 cube) | Target |
|---|---|---|---|---|
| Loyalist wins (tuned / mixed) | 87% / 87% | 69% / 45% | 39% / **11%** | about 15% (10–20%) |
| Patriot colonies that survive (tuned / mixed) | 4% / 4% | 20% / 24% | 43% / **56%** | 40–70% |
| Games ending before round 8 (mixed) | 53% | 35% | 56% | under 25% |

At 3 and 5 players with mixed bots: the loyalist wins 23% and 6%, colonies survive 46% and 58%, games end before round 8 in 36% and 67%. With 2 players the loyalist still wins 62% (open question 1).

## Candidates

| Id | Table wording | Setting |
|---|---|---|
| `events-1-cube` | El Dorado Rumors: the Royal Army gains 1 cube per player, not 2. Mutiny, Boston Tea Party, Pirate Blockade, Black Market: 1 cube instead of 2 for each refusal, unit or seller. | five event-card numbers 2 → 1 |

Russian wording is in `rulesets/proposed.json`. Tested before refusal 1 cube was adopted: it removes 6–8 cubes and moves the loyalist only 4–9 points, because events give about a quarter of the Royal Army (refusals gave 72 of about 105 cubes at 4 players). Kept for fine-tuning one player count, not as a fix.

## A bell for paying the tax (2026-11-27, accepted: DD-71)

The designer's idea: nobody pays the tax, because refusing costs 1 🟥 in a pool shared by all patriots and paying gives nothing. A bell for paying makes the cheap early taxes worth it; the late ones stay too dear, as they should.

| Id | Table wording | Setting |
|---|---|---|
| `tax-pay-bell` | Paying the tax gives +1 🔔. | `settings.tax.payBells` 0 → 1 (new setting; 0 plays as now) |

Quick check, 300 games per cell, mixed bots, not paired (not a full lab run):

| Taxes paid | Round 2 (1 🟡) | Round 3 (3 🟡) | Round 4 (6 🟡) | Round 5+ (10–25 🟡) |
|---|---|---|---|---|
| Board, 3–5 players | 13–15% | 0–5% | 0% | 0% |
| With the bell | 25–27% | 18–19% | 3–4% | 0–1% |

- **Bells from the tax: +0.5 per player** over a game, against about 7 from everything else. The refusal bell gave 5–9 and was removed for it (DD-50); this one cannot flood, because a player holds 2–4 🟡 when the tax comes until round 7.
- **The war does not move**: rounds, endings by bells, loyalist wins and colonies kept all change within ±2 points at 3, 4 and 5 players.
- **Round 2 is held back by gold, not by choice**: only about 28% of seats have the 1 🟡.
Applied as DD-71, with the rulebook, T-5 in rules-spec and the in-game help updated.

## One product per terrain (2026-11-27, accepted: DD-63 to DD-67)

The designer's idea: grassland gives crops only, so every terrain gives one product (ocean food, forest timber since DD-56, grassland crops, mountains silver; desert and tundra nothing), food has to come from the sea, and the rules read cleaner. With it, the three cards whose talent was corn or crops move with the land (the designer's choice), so none loses its purpose:

| Id | Table wording | Setting |
|---|---|---|
| `grassland-crops-only` | Grassland gives 🍂 only, not 🌽. | `terrain.grassland.yields` corn, leaf → leaf |
| `farmer-crops` | Farmer: +1 🍂, not +1 🌽. | `agents.farmer.mods.0.icons` corn → leaf |
| `squanto-fish` | Squanto: +1 🐟, not +1 🌽. | `fathers.squanto.mods.0.icons` corn → fish |
| `indian-fish` | Indian: +1 🐟, not +1 🍂. | `agents.indian.mods.0.icons` leaf → fish |

All four are direct changes (one rule and three printed symbols), together the package `one-product-per-terrain` in `rulesets/proposed.json`, with Russian wording. To make the three card changes possible the bench now also offers which resources a talent works on (`…mods.N.icons`).

Evidence (`node packages/lab/src/terrain.ts 400`, writes `out/terrain.md`): 400 paired games per cell, 3 and 4 players, tuned and mixed bots.

| Per player | Board | Grassland only | The package |
|---|---|---|---|
| Corn produced | 1.4–2.9 | 0.1–0.4 | 0.1–0.3 |
| Fish produced | 6.6–13.5 | +0.9 to +2.4 | +1.0 to +2.4 |
| All food produced | 8.0–16.2 | −0.1 to −0.3 | −0.2 to −0.3 |
| Crops produced | 1.6–5.1 | no change | +0.1 to +0.2 |
| Colonies, buildings, rounds | | no real change | no real change |
| Mean score | | −0.3 to −0.4 | −0.2 to −0.5 |
| Loyalist wins | 11–45% | +8 points at 3 players, tuned bots; else no change | within ±4 points everywhere |

What it shows:

- **Food moves to the sea and barely falls.** Players fish instead of farming; total food drops by 0.1–0.3 per player.
- **Every colony is already coastal.** 100% of colonies touch the ocean under every rule here: 398 of the 666 cells are ocean and the islands are small. So the change does not create a choice between the sea and the fields; it makes fish the only food, and the number of ocean and fish cells next to a colony matters more.
- **The farmer keeps his place on grassland**, now for crops: crops rise a little with the package, and the one shift grassland alone made (the loyalist +8 points at 3 players with tuned bots) halves to within the noise.
- **Squanto and the Indian are not tested by play**: the bots never took Squanto in these games and hold almost no Indians (0–0.1 per player, on board too). Their changes stand on the reading: both then help the food every colony gathers.

Recommendation: **adopt the package**, all four together. The game plays as before, the rules lose an exception (one product per terrain), and no card loses its purpose. Grassland alone is not recommended: it leaves the farmer and Squanto nearly empty.

## Open

1. **Two players stay loyalist-heavy**: with one patriot against one loyalist, whoever has fewer bells nearly always wins. Decided (DD-58): a 2-player game has no loyalist, and the war plays without the loyalist's steps. In `board` as `two-players-no-loyalist` (setting `war.loyalistFrom` = 3).
2. **Early endings** rose to 56–67% at 4–5 players with mixed bots now that the war is winnable: racing to 15 bells pays again. The refusal bell is gone, so where the racing player's bells come from (buildings, fathers, events) needs a look before choosing a fix.
3. **5 players may overshoot** (loyalist 6% with mixed bots). Event cards can tune this later.
4. **Tuned bots** still let the loyalist win 29–49% at 3–5 players. They were trained under the old war and should be tuned again under the new rules before these numbers are trusted further.

## Not proposed yet

- **Dead cards** (detectors, 800 games): the school (built by 9 of 1,929 seats it was offered to), the slave, the smuggler. Teaching and smuggling are actions the bots hardly use ([system-check.md](system-check.md)), so this may be the bots, not the cards.
- **"Dominated" town hall, stockade, the work action, alliances**: their holders win less, but they are what patriots build, and patriots lost under the old war. Recheck after the war change.

## Caveats

Bots play weaker than people ([system-check.md](system-check.md)): they build up slowly and defend badly. Each finding here holds for both kinds of bot, as the lab's standards ask, but human games remain the check. Each candidate can be tried in the game: Design bench → Rules, make a ruleset with its values, then Play it.

## To adopt a change

1. `pnpm rules apply proposed <id>` (or Design bench → Export → Into the rules, in dev mode): writes it into `rules/`, rebuilds the game data, logs the decision, and lists the printed texts to update (`pnpm rules todo`).
2. Update those texts in `rules/`, then `pnpm rules:review`.
3. `pnpm rules:sheet publish` so Dextrous prints it; the rulebook takes its values from `rules/`.
