# Decisions

The tracker for rule changes and design choices. A change reaches `rules/` only by the designer's choice (`pnpm rules apply | drop`, which adds a line to the log below). Details live in `rules/`, [rules-spec.md](rules-spec.md), the lab reports in `out/` and git history.

## Open

Questions and candidates awaiting the designer. Candidates are the overrides of [`rulesets/proposed.json`](../rulesets/proposed.json); evidence: `pnpm proposals 400` → `out/proposals.md`.

| # | Item | Note |
|---|---|---|
| O-2 | Early endings: 56–67% of games end before round 8 at 4–5 players | Find where the racing player's bells come from before choosing a fix. Bots that judge their chance of being the loyalist honestly (low early, since only one can be) lean loyalist on 1% of turns, not 73%: they all race for bells, games last 6.8 rounds, not 9.1, and every war starts by bells, not half; the loyalist wins about 5% either way |
| O-3 | 5 players may overshoot: loyalist wins 6% | Event cards can tune it later |
| O-4 | Tuned bots still let the loyalist win 29–49% at 3–5 players | Retune the bots under the new war first |
| O-5 | Dead cards: school (before DD-75), slave, smuggler | May be the bots, not the cards |
| O-6 | Town hall, stockade, work action, alliances look dominated | Recheck after the war changes |
| O-7 | Bots move one token per action | Lab numbers understate DD-73 |
| O-20 | Taxes are dead: nobody has the gold | Only 27% of players have 1 🟡 after round 2 (mean 2.4–2.7). The rules allow about 20: a colony on silver in round 1, 4 silver made, shipped (2 steps from the edge) and sold in round 2 for 4 × 5 🟡; a crops site gives 12, food or timber 4. But it costs 6 of the first 10 cards, silver is in sight in round 1 only 39% of the time, and early gold does not raise the score: bots forced into that opening had 8.5 🟡 after round 2 and the same final score (+0.2 ±0.7, 300 paired games). So bots explore and build instead (10 timber a game against 0.9 silver). Trade changes (crops at 4, five custom houses at 2 🪵, prices recovering, a hold of 6) add about 3 🟡 a game, nothing by round 2. What gives early gold (400 paired games, 2 / 4 players): (a) colony income, "before taxes, take 1 🟡 per colony": 4.2 / 3.7 🟡 after round 2, taxes paid 7 → 17% / 5 → 15%, Royal Army 44.5 → 39.3 / 54.9 → 48.6; (b) start with 5 🟡: 6.0 / 6.2 🟡, taxes paid 21% / 12%, Royal Army 37.9 / 48.5. Both direct, each a new setting. Gold at 1 🏅 per 3 🟡 (`settings.score.goldPerPoint`) doubles trade (units sold 2.7 → 5.9) but not round-2 gold. Selling on arrival in Europe, without a trade action, saves a card a trip for a person (round-2 ceiling 32–36 🟡) |
| O-23 | Franklin (5 🔔; each card that makes 🔔 makes 2 more): his takers win 64% at 4 players, at any price | The bell leader takes him, so making him weaker or dearer only changes how often he is taken: +1 🔔 instead of +2 left his takers at 56%; 7 🔔 at 66% (taken in 26% of games, from 31%), 9 🔔 at 61% (21%). To break the snowball, change what he does. To test: (a) catch-up: the +2 🔔 only while you do not have the most 🔔; (b) the French alliance: no bells, but in the war one free card of 🗡️ 3 on a colony of yours. Each converts directly (card text) and needs a small engine change |
| O-24 | Natives: a stockade (2 🪵) answers them, not gifts, preaching or attacks | 6 of 13 tribe cards start at hostility 4–5, so half the settlements raid from the start; 2 of 3 seats build a stockade, attacks on settlements happen 0.2 times a game. Making the stockade stop nothing alone is not enough: raids 2.8 → 4.3 a game, gifts 5.8 → 6.1 (400 paired games, 4 players), as a raid costs only 2 resources. The threat has to reach the score. To test, together: (a) war-path: at the war, each settlement at hostility 4–5 puts 🟥 equal to its population on the siege of its nearest colony, instead of 1 🟥 to the shared army; (b) the stockade keeps buildings, not stores: a raided colony with a stockade loses 2 resources but never a building; (c) land pressure: at the end of each round, every settlement within 2 cells of a colony gains 1 hostility (to 5). Then a gift buys time, preaching shrinks the war party, and an attack that empties the settlement ends it. Each converts directly (war setup, card text, round-end step) and needs engine work |

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
| DD-77 | Applied `stockade-stops-raids`: Rulebook, raids: a player with a stockade (not only a fort) is never raided. Stockade card: +1 ⚔️ колонии, no raids |
| DD-78 | Applied `gift-any-resource`: Gift: pay 1 resource of any kind (not only goods) |
| DD-79 | Applied `custom-house-open`: Custom house card: price 3 🪵, worker 📖 (not 🎓), sells up to 2 of one resource |
| DD-80 | Applied `newspaper-2`: Newspaper card: → 2 🔔 |
| DD-81 | Dropped `workshop-2-goods`: Blacksmith shop built by 18% and barely worked: 1 🌾 for 1 goods loses value; factory never built |
| DD-82 | Dropped `recruit-half-round`: Crosses are almost never spent: about 0.03 recruits a game, since a recruit costs the round number in ✝️ and a chapel makes 1 a use |
| DD-83 | Applied `fort-3`: Fort card: price 3 🪵 |
| DD-84 | Fort +3 as an upgrade over the stockade (+3 in its place, not +4). Improvements are upgrades (factory, newspaper, church, fort: laid over their building; a passive effect counts once, the upgrade's; the building stays workable by agents without the upgrade's education) or extensions (custom house, shipyard, university: a new effect beside it). `BuildingDef.upgrade` replaces `fort.replacesStockade` |
| DD-85 | Applied `chapel-2-church-4`: Chapel card: → 2 ✝️. Church card: 🎓: → 4 ✝️ |
| DD-86 | Applied `gift-fixed-3`: Gift: give 1 resource from your warehouse; the tribe's hostility drops by 3 (no dice) |
| DD-87 | Applied `shipyard-repairs`: Shipyard card: a damaged ship of yours may return to your colony instead of Europe, fully repaired |
| DD-88 | Dropped `gift-fixed-1`: A gift rolls 3 dice for a drop of 1–4 hostility; a fixed result is quicker at the table and easy to plan |
| DD-89 | Dropped `gift-fixed-2`: A gift rolls 3 dice for a drop of 1–4 hostility; a fixed result is quicker at the table and easy to plan |
| DD-90 | Dropped `goods-6`: Blacksmith shop built by 16% and barely worked, factory never: 1 🌿 (price 3) for 1 📦 (price 5) is worth little; a higher goods price and a longer track give goods a reason |
| DD-91 | Dropped `goods-7`: Blacksmith shop built by 16% and barely worked, factory never: 1 🌿 (price 3) for 1 📦 (price 5) is worth little; a higher goods price and a longer track give goods a reason |
| DD-92 | Dropped `upgrade-in-place`: An upgrade (factory, newspaper, church, fort) stops the effect of the building under it, yet both take a slot of the 6 |
| DD-93 | No upgrade logic (DD-84 withdrawn): an improvement is a second building beside its basic one, with its own slot and 1 🏅 like any building; defences add up. Fort +2 (+3 with the stockade). A Father's bonus for a building (Kościuszko) counts once, the best |
| DD-94 | Dropped `goods-as-tools`: Bots value 1 gold at about 0.15 points and 1 goods at 0.36, timber at 0.6–0.9: goods have no use but a sale, so manufacturing never pays; as tools they feed the buildings that score |
| DD-95 | Dropped `goods-as-tools-3`: Bots value 1 gold at about 0.15 points and 1 goods at 0.36, timber at 0.6–0.9: goods have no use but a sale, so manufacturing never pays; as tools they feed the buildings that score |
| DD-96 | Kościuszko: +1 for the stockade and +1 more for the fort (+2 with both, was +1 or +2); his bonus stays under Siege Artillery, which takes away only the buildings' own defence |
| DD-97 | Applied `gold-5`: Scoring: 1 🏅 for every 5 💰 (not 10) |
| DD-98 | Dropped `gold-7`: Gold scores little (10 a point at the end) and bots value it at about 0.15 points, so selling and manufacturing rarely pay |
| DD-99 | Jakob Fugger: 1 🏅 for every 3 💰 (was 7, against 10), so he keeps his edge over the new 5 (DD-97) |
| DD-100 | Custom house sells like the Europe market, from the warehouse and with no ship: any resources, any amounts, Europe's prices, demand after the sale (replaces DD-79's up to 2 of one resource) |
| DD-101 | Gift: hostility falls by the Europe price of the resource given (goods calm more than food), no dice; replaces the fixed 3 (DD-86) |
| DD-102 | A pawn is never alone in Europe: a beaten pawn, an attacking pawn with no colony, or a pawn a card sends back goes aboard its own ship, wherever the ship is; cargo that no longer fits the hold is discarded. Was: the pawn waited in Europe for its ship. Conversion: direct (rulebook wording) |
| DD-103 | Applied `counter-sieges`: War: after the Royal Army is placed, place war cards one at a time, the loyalist first, then the patriots by bells; you may stop. The loyalist joins any patriot siege or guards their own colonies; a patriot defends their own or besieges a loyalist colony (cards, militia, mercenaries). A loyalist colony that falls (board dice) is scored by the patriot with the most strength there; tied patriots roll a die |
| DD-104 | Applied `loyalist-colony-6`: Scoring: each loyalist colony 6 🏅, as a patriot colony (not 3) |
| DD-105 | Applied `war-20-bells`: The war starts when a player reaches 20 🔔 (not 15) |
| DD-106 | Applied `bells-2-per-point`: At the end, patriots score 1 🏅 per 2 unspent 🔔 (not 1 🏅 per 🔔) |
| DD-107 | Applied `fathers-cheaper-low`: New price in 🔔: Francisco Pizarro 2, Francis Drake 2, Squanto 2, Thomas Hooker 2, John Smith 2, Pedro Cabral 2, Eli Whitney 2, John Rolfe 2, Benedict Arnold 1, Thomas Jefferson 4, Christopher Columbus 1, Michiel de Ruyter 1, William Bradford 2, Roger Williams 1, Olaudah Equiano 1, Francisco de Orellana 1, Pocahontas 1, John Eliot 1, Hernan Cortes 1, Peter Minuit 1 |
| DD-108 | Applied `propaganda-anywhere`: Propaganda: the ship doesn't need to be in Europe |
| DD-109 | Applied `hooker-crosses`: Thomas Hooker: take 6 ✝️ (instead of → +1 ✝️) |
| DD-110 | Applied `whitney-workshop`: Eli Whitney: also get a blacksmith's shop free, if you can (keeps → +1 📦) |
| DD-111 | Applied `squanto-harvest`: Squanto: take 5 🐟 into your warehouse, enough for a colony (instead of → +1 🐟) |
| DD-112 | Dropped `rolfe-trade`: Rolfe: each resource sold brings +1 🟡 — the designer found it odd; replaced by `rolfe-farmers` |
| DD-113 | Dropped `cabral-brazilwood`: Cabral: 3 🪵 on gain; replaced by `cabral-europe` (the ship counts as in Europe) |
| DD-114 | Dropped `drake-treasure`: Drake: 6 🟡 on gain — not liked; replaced by `drake-corsair` or `drake-king` |
| DD-115 | Dropped `drake-corsair`: Drake: a corsair on gain; replaced by damaging rival ships (`drake-ships-away`, `drake-ship-one`) |
| DD-116 | Dropped `drake-king`: Drake: −3 🟥 from the King's army — unique, but Drake served the King |
| DD-117 | Dropped `champlain-no-food`: Champlain: all colonies without 🐟 — too much; replaced by `champlain-next-colony` (only the next one) |
| DD-118 | Applied `rolfe-farmers`: John Rolfe: put 2 planters into your discard, from the deck or the common discard (instead of → +1 🌿) |
| DD-119 | Applied `cabral-europe`: Pedro Cabral: your ship always counts as in Europe: trade, hire, repair and taking on your pawn from Europe wherever it is, events that hit ships away from Europe pass it by, and it cannot be attacked (instead of +2 💨) |
| DD-120 | Applied `drake-ships-away`: Francis Drake: every other player's ship not in Europe takes 1 damage (instead of ship attack +2 🗡️) |
| DD-121 | Dropped `drake-ship-one`: Alternative to drake-ships-away: one rival ship of your choice away from Europe takes 1 damage, 49% |
| DD-122 | Dropped `champlain-next-colony`: Champlain is taken 73–76% at 4–6 🔔 and his takers score about +5.5 and win 1.8×. Only the next colony free, at 3 🔔: 60%, takers +3.5 and 1.35×; at 4 🔔: 56%, +5.3 |
| DD-123 | Applied by the designer (was O-16): the war is fought with cards on the colony slots of the nation boards, no player cubes. Royal Army shared by formula; Braves (🗡️ 2) per ally for every player, the loyalist too; patriots swap agents without 🗡️ for Militia (1 🔔, 🗡️ 1); anyone buys Mercenaries (5 🟡, 🗡️ 1); placing face down, several cards a turn, until all pass; nation tokens on enemy slots; patriots never help each other; ties for a patriot colony by die against the King; a colony the King takes scores for nobody; war cards count as agents. `war.allyCubes` 3 → 2, `war.militiaCards` and `war.mercenaryCards` 18 added. Conversion: component (colony slots, 6 Braves, 18 Militia, 18 Mercenaries, 60 two-sided nation tokens). Rulebook, rulings, rules-spec, engine, bots and screen all play it; `war.counterSieges` removed. Placeholder art: militia and mercenaries show the colonist and the soldier |
| DD-124 | Applied by the designer (was O-17): two players never take nations of one colour (5 colours, 2 nations each). Conversion: direct (rulebook wording). The engine refuses such a game; the new-game screen and the lab pick nations apart |
| DD-125 | Applied `hudson-3`: Henry Hudson costs 3 🔔 (not 2) |
| DD-126 | Applied `fugger-cheaper`: Jakob Fugger costs 2 🔔 (not 3) |
| DD-127 | Applied `pizarro-loot`: Francisco Pizarro: +10 🟡 for each native settlement you destroy (instead of double loot) |
| DD-128 | Applied `indian-power`: Indian agent card: +1 🗡️ on land |
| DD-129 | Applied `jefferson-two`: Thomas Jefferson: take the two cheapest Fathers free, one after the other; you may have 6 Fathers |
| DD-130 | Applied `smith-allies`: John Smith: ally at once with every revealed settlement with no ally at hostility 0–2 to you (instead of alliances up to hostility 3) |
| DD-131 | Dropped `fathers-cheaper`: Every Father 1 🔔 cheaper, at least 1 (after DD-107) |
| DD-132 | Dropped `fathers-cheaper-2`: Every Father 2 🔔 cheaper, at least 1 (after DD-107) |
| DD-133 | Dropped `fathers-keep-bells`: Bots take 1.2 Fathers a game of the 8 they see: a patriot's 🔔 score 1 🏅 each at the end, so a Father costing 2–5 🔔 and scoring 1 🏅 costs points unless its effect is strong |
| DD-134 | Dropped `war-25-bells`: At 20 🔔 games last only 7.5 rounds and 99% of wars still start by bells |
| DD-135 | Dropped `bells-5-per-point`: A patriot's unspent 🔔 score 1 🏅 each, so spending them on Fathers or militia costs points, and the bell leader's 20+ 🔔 are most of the winning score |
| DD-136 | Dropped `events-1-cube`: Five event cards add 2 cubes per player, card or unit; with cube strength 1 and no refusal bell the Royal Army still takes most colonies (loyalist wins 45-69% at 4 players) |
| DD-137 | Dropped `raids-at-5`: Raids start at hostility 4 of 5, so one hostile neighbour raids every activation |
| DD-138 | Dropped `crosses-every-round`: Players gain 0.14 ✝️ a game: a chapel must be worked for 1 ✝️ while a recruit costs the round number |
| DD-139 | Dropped `shipyard-repairs-on-build`: A second way to repair: a player whose ship is damaged can build the shipyard to repair it at once, wherever it is |
| DD-140 | Dropped `town-hall-higher`: Every bot builds a town hall by round 3–4 and races for bells; most starting agents (📖) can work it |
| DD-141 | Dropped `father-scores-price`: A Father costs 2–5 🔔 (2–5 🏅 for a patriot) and scores 1 🏅; scoring its price makes the purchase neutral, so the effect is the gain |
| DD-142 | Dropped `newspaper-per-player`: AI games, 2 players (40 games, two seeds): the newspaper is unique and makes 2 🔔 a card (3 with a politician); bots build it in rounds 3 to 4, the player who has it wins the bell race and chooses when the war comes, the other is shut out for the rest of the game |
| DD-143 | Dropped `newspaper-needs-crops`: The newspaper turns any spare card into 2 🔔 with no other cost, so the bell race is won by building it first; a crop per print ties the bells to the economy, as the workshop ties goods to crops |
| DD-144 | Dropped `newspaper-dearer`: The newspaper costs 4 🟫, which a slave on a bonus forest makes in two cards; at 6 🟫 it comes later, after the colonies, instead of in round 2 to 4 |
| DD-145 | Dropped `salon-rotates`: Fathers stay in the salon until taken, so the weak ones fill its 5 places: a game shows about 14 of the 34, and half of them are never taken |
| DD-146 | Dropped `fugger-per-2`: Players end with about 8 🟡. At 2 🔔 (DD-124) Fugger is taken 46% of the time; with 1 🏅 per 2 🟡 too: 62% |

Questions Q1–Q21 are answered in DD-11 to DD-67.

## Decided by the designer (2026-11-28)

| # | Decision |
|---|---|
| DD-147 | Applied `destroyed-scores-zero`: A nation with no colony after the war is destroyed and scores 0 🏅 |
| DD-148 | Applied `tax-two-2`: Tax refusal in a 2-player game adds 2 🟥 (not 1) |
| DD-149 | Applied `loyalist-colony-4`: Scoring: each colony the loyalist holds after the war scores 4 🏅, not 6 |
| DD-150 | Applied `no-loyalist-on-tie`: War, sides: if the players with the fewest 🔔 also tie on ✝️ and 🟡, there is no loyalist (was O-18) |
| DD-151 | Dropped O-19: 3 players keep `loyalist-colony-4`, though the loyalist wins 26% there |
| DD-152 | Applied O-22: a pawn aboard counts for a colony's defence only through its ship. Conversion: direct (rulebook wording, already printed); La Salle and single-copy improvements need no wording |
| DD-153 | Dropped O-21's timing idea (cube events into the lower half of the deck): the setup stays simple. Pirate Blockade's ransom equal to the round number is candidate `pirate-ransom-round` |

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
