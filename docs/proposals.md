# Proposed rule changes

2026-11-26. Proposals for the designer, from lab evidence. Nothing here is decided: a change reaches `board`, the rulebook and the spreadsheet only by the designer's choice (`pnpm rules promote <id>`, logged in [decisions.md](decisions.md)).

Every candidate is a **direct** change: printed numbers only, with the table wording ready. They are the overrides of [`rulesets/proposed.json`](../rulesets/proposed.json), a sandbox ruleset on top of `board`. The full tables come from `node packages/lab/src/proposals.ts 400` (about 7 minutes on 8 cores), which writes `out/proposals.md`.

## Decided so far

- **Accepted** (DD-49, DD-50, DD-52): each Royal Army cube attacks with 1, not 2; refusing the tax gives no bell; refusing adds 1 cube, not 2. All three are now in `board`.
- **Accepted** (DD-60, the designer's own change): recruiting with crosses is an action; the crosses spent are the agents looked at; Roger Williams takes up to 2.
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

1. `pnpm rules add proposed <id>`: copies it into `pc`.
2. `pnpm rules promote <id>`: moves it to `board`, logs the decision, and prints the setting or card to edit.
3. Carry the table wording into the rulebook.
