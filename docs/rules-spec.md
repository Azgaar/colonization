# Rules specification: `board` ruleset

The rules as the engine must implement them. Each rule has an ID used in code, tests and reports.

**Source marks**

- no mark: stated in `Колонизация.docx` or `Colonization.xlsx`
- **[A]** answered by the designer on 2026-11-25 (listed in [decisions.md](decisions.md)). Answers override the document and the spreadsheet
- **[D]** default chosen because the sources are silent or unclear. Each is a named setting, shown as `setting = value`. Those worth a designer's answer are listed as questions (Q) in [decisions.md](decisions.md#open-questions).

When the document and spreadsheet disagree, the spreadsheet wins **[A]**.

These are the rules of the board game. PC rules start identical and may change only in ways that can go back to the table; see [PRD section 5](PRD.md#5-board-and-pc-rules).

## Vocabulary

| Term | Russian | Meaning |
|---|---|---|
| Agent | агент | Card played to take an action; also a fighter |
| Ship, Infantry | корабль, пехота | Each player's two map tokens |
| Cell / Fragment | клетка / фрагмент | One map square / a 3×3 block revealed together |
| Settlement / Tribe | поселение / племя | A native village on the map / its people; one tribe may own several |
| Hostility | враждебность 💢 | 0–5, shared by all settlements of a tribe |
| Warehouse / Hold | склад / трюм | Player's stored goods / ship's cargo |
| Pier | причал (Европа) | Row of agents for hire |
| Docks | причал (постройка) | Colony building |
| Salon | салон | Row of Founding Fathers |
| REF | КЭК 🟥 | Royal Expeditionary Force cubes |
| Bells, Crosses, Gold | 🔔, ✝️, 🟡 | Special resources |
| Patriot / Loyalist | патриот / лоялист | Sides in the war |
| Education | 🚫 / 📖 / 🎓 | none / basic / higher. There is no "middle" level **[A]** |

Resources: food 🟨 (🌽, 🐟), timber 🟫 (🪵), crops 🟩 (🍂, 🦫), goods 🟦 (📦), silver ⬜ (🪙). Corn and fish are both food; leaf and fur are both crops. The icon matters only for bonuses.

Note: `причал` names both the pier in Europe and the Docks building. Code and English text use different words.

## S. Setup

| ID | Rule |
|---|---|
| S-1 | 1–5 players. Each takes a nation, its starting deck (spreadsheet `starting units`), a ship and infantry aboard. **[D]** Gold, bells, crosses, hold cargo and warehouse start at 0 |
| S-2 | Map is 16 random fragments out of 74, in 4×4, face down, fixed orientation (north up) |
| S-3 | Around the 12×12 map: an inner ring of open sea, then an outer ring of Europe cells **[A]** (`ring.openSea = 1`, `ring.europe = 1`) |
| S-4 | Nation agents and native agents are kept out of the common agent deck. Native agents form their own pile of 8 |
| S-5 | Pier: 5 stacks of different agents. A drawn duplicate goes on top of its own stack and drawing continues until 5 different agents show |
| S-6 | Salon: 5 Fathers, face up. Buildings: 5 copies of each basic one, 1 of each improvement |
| S-7 | Start prices: food 1, timber 1, crops 3, goods 5, silver 5. Price cap 5 **[A]** (`market.maxPrice = 5`), floor 0 |
| S-8 | Tax by round: 0, 1, 3, 6, 10, 10, 15, 15, 20, 25 **[A]** |
| S-9 | Ship start: **[D]** each player picks a free Europe cell in turn order. First player is random |

## T. Round

| ID | Rule |
|---|---|
| T-1 | **Draw.** Each player draws up to 5 agents. An empty deck is refilled by shuffling the discard, also in mid-draw |
| T-2 | **Actions.** Clockwise, one card and one action per turn. Passing ends the round for that player, who keeps or discards **[D]** any subset of the remaining cards |
| T-3 | A player with no cards must pass |
| T-4 | **Event.** When all have passed, resolve the top event (section V) |
| T-5 | **Tax.** If the rate is above 0, each player pays in full, or refuses: +1 🟥 to the REF (DD-52; was +2) (solo: +3 🟥), and no 🔔 (DD-50; was +1 🔔). A player who cannot pay in full must refuse **[D]** |
| T-6 | **End.** Check for war (W-1), advance the round and year (1620 + 20 per round), pass the first-player marker left |
| T-7 | At the end of a player's turn, warehouse excess is discarded by choice. **[D]** The check also applies after events |
| T-8 | Free actions, such as recruiting with crosses, happen on one's own turn, any number of times **[D]** |

## P. Playing a card

| ID | Rule |
|---|---|
| P-1 | Any agent allows any standard action and applies its bonus where relevant |
| P-2 | Criminal and slave may only produce. They may be added as support in battle, 1 strength each (C-3) **[A]**. **[D]** They may also be spent in exchange or on card costs |
| P-3 | The played card goes to the discard after the action |
| P-4 | A player's collection never falls below 4 agents through removal effects; removal stops there |

## M. Movement and exploration

| ID | Rule |
|---|---|
| M-1 | 5 movement points for one token per action. Eight directions |
| M-2 | Cost to enter: ocean, grassland 1; forest, desert, tundra 2; mountains need at least 1 and use all that remain |
| M-3 | Ships stay on water. Infantry stays on land unless aboard. One token per cell, except infantry aboard a ship |
| M-4 | **[D]** Infantry may enter an own colony. No token may enter a settlement or a foreign colony |
| M-5 | **Explore:** 1 point, reveals a closed fragment. From a fragment, the neighbours are those sharing a side **[D]** (`explore.diagonal`). From the rings, any fragment touching the token's cell **[D]** |
| M-6 | On reveal: mark ruins and wrecks as unexplored; place settlements in reading order **[D]** per N-1 |
| M-7 | **Load and unload:** 1 point per operation, any amount **[D]** `cargo.costPer = operation`. Goods move between hold and warehouse when the ship is on water next to an own colony |
| M-8 | **Embark and disembark:** 1 point between adjacent ship and land. This is the only way one action can move both ship and infantry, using the remaining points **[A]**. **[D]** It can be part of either token's action. The point paid covers the first cell, whatever its terrain |
| M-9 | Hold has 4 slots: 1 per resource, 1 for infantry, 1 per damage |
| M-10 | A damaged ship cannot move or attack |
| M-11 | Entering an unexplored ruin or wreck triggers it at once (section X). "Token ends its move" stops further movement in this action |
| M-12 | Infantry sent to Europe waits off the map. **[D]** Its ship may board it from any Europe cell for 1 point |
| M-13 | A ship sent to Europe goes to the nearest free Europe cell **[D]**, with its infantry and, unless stated, its cargo |
| M-14 | **[D]** A ship that takes damage from any cause goes to Europe, or next to an own colony if its owner has a shipyard (`damage.sendsToEurope = true`). Otherwise a ship damaged by a storm or wreck could never be repaired, since it cannot move. Q15 |

## F. Colonies

| ID | Rule |
|---|---|
| F-1 | Up to 3 per player. First is free, others cost 5 food each from the warehouse |
| F-2 | Founded by infantry on its own land cell. Not on the outer edge of the 12×12 map; not adjacent, diagonals included, to a colony or a settlement; at least one adjacent ocean cell that connects through revealed water to Europe |
| F-3 | Colonies are never removed. They can be occupied only in the war |
| F-4 | Warehouse, buildings and Fathers belong to the player and serve all colonies **[A]** |
| F-5 | Warehouse capacity is 6, or 12 with the warehouse building |

## A. Actions in Europe

Require the player's ship on a Europe cell.

| ID | Rule |
|---|---|
| A-1 | **Trade.** Sell any resources from the hold at the current price. Sold cubes go to the demand track, whose size is the number of players |
| A-2 | Each time a track fills, that price drops by 1 and the track keeps only the excess. One sale may fill it several times. All units of one trade action are sold at the old price; new prices apply from the next trade action **[A]** |
| A-3 | **Hire.** Buy 1 or 2 different agents from the pier, to the discard. Or discard the whole pier and refill it. Empty slots refill at once |
| A-4 | Discarded pier cards form a common discard, reshuffled when the agent deck is empty **[D]** |
| A-5 | **Propaganda.** Take up to 2 Fathers for bells **[A]**. Limit 4 Fathers in total |
| A-6 | **Repair.** Remove 1 damage in Europe. With own shipyard, all damage when next to an own colony |
| A-7 | **Cross recruitment** (free, no ship needed): pay crosses equal to the round number, look at the top agent, take it to the discard, return it, or put it on the bottom |

## C. Combat

| ID | Rule |
|---|---|
| C-1 | Attacks target an adjacent cell. Attacker must play an agent with the right ⚔️ type (infantry or ship; captain is both) |
| C-2 | Both sides then secretly add any number of hand cards. The defender may add the unseen top card of their deck |
| C-3 | Strength = number of cards, including the played one **[A]**, plus matching ⚔️ bonuses, plus terrain and other bonuses. Cards without ⚔️ count 1 |
| C-4 | **[D]** Each side uses the ⚔️ of its own token: a ship's battle uses ship ⚔️, anything else infantry ⚔️. A bombarding side uses the higher of the two on each card. Terrain-bound bonuses (highlander) look at the fighter's own cell |
| C-5 | Attacker's strength not greater: the attack fails, no further effect. Otherwise roll dice equal to the difference; 4 and 5 are successes. One success = 1 damage. **[D]** `combat.diceCap = none` outside the war |
| C-6 | **Land token:** 1+ damage sends the defender to Europe. Tokens are never destroyed |
| C-7 | **Ship vs ship:** each damage fills one hold slot (maximum 4 **[D]**); the loser moves to Europe, or next to an own colony if its owner has a shipyard. Winner takes cargo up to free hold space; the rest is lost if the winner wishes. Cargo beyond the damaged hold's capacity is discarded. Infantry that beats a ship takes no cargo **[D]** |
| C-8 | **Colony:** defender gets +1, terrain, stockade +1 or fort +2 (a fort replaces the stockade **[D]**). Each success: take 1 chosen resource to own warehouse, or destroy 1 of the cheapest buildings. Destroying a building an improvement depends on is not allowed while the improvement stands **[D]**. Infantry then moves to the attacker's nearest colony, or to Europe if none **[D]**; a bombarding ship stays **[D]**. Infantry inside a colony cannot be attacked separately **[D]** |
| C-9 | **Landing attack** from a ship: -1. **Infantry against a ship:** -1 |
| C-10 | **Bombardment** (cannoneer, or any ⚔️ agent with de Ruyter): ship attacks land, or infantry attacks a ship, without penalty |
| C-11 | Any victory (1+ success) gives +1 🔔 |
| C-12 | **[D]** Combat is not allowed against tokens on Europe cells: `europe.safe = true` |
| C-13 | All committed cards go to their owners' discards |

## R. Colony actions

| ID | Rule |
|---|---|
| R-1 | **Produce on a cell:** 1 resource from a colony's cell (it may be worked itself **[A]**) or one of its 8 neighbours that is empty. **[D]** Empty means no colony, settlement or token |
| R-2 | Terrain yields: forest timber or crops (fur); grassland food or crops (leaf); mountains silver; ocean food (fish); desert and tundra nothing |
| R-3 | **Ocean.** Working an ocean cell directly gives 1 food (fish) and needs no building. Docks are a building to work in (R-7, no education needed): the agent works an ocean cell through them for +1, so 2 food **[A]** . The player picks an eligible ocean cell (R-1), so its fish bonus adds +1, and a fisherman +1 more: up to 4 food **[A]** |
| R-4 | A cell's bonus icon adds +1 when that resource is produced. **[D]** A bonus on terrain that does not normally yield the resource allows producing it, for 1 in total |
| R-5 | Agent and Father bonuses add to each matching production. A location-bound agent bonus (cossack, trapper, planter) also allows that production where the terrain yields nothing **[A]**. The cossack gives 2 crops on empty tundra |
| R-6 | Planter: "island" is a land group of 3 or fewer cells, connected in 8 directions **[D]** |
| R-7 | **Produce in a building:** one building per action; the agent's education must be at least the building's. No limit on reuse of cells and buildings |
| R-8 | Workshop: 1 crops → 1 goods. Factory: 1 crops → 2 goods. Bonuses add output, not input. Factory, newspaper and church do not add to the basic building; the better one is used **[D]** |
| R-9 | **Build:** pay timber, at most 6 buildings, one of each type. **[D]** An improvement requires the basic building, which stays and keeps its slot |
| R-10 | **School and university:** the played agent is the teacher. Another card in hand is replaced by a copy of the teacher's type from the agent deck or common discard; both cards go to the player's discard, the replaced one to the common discard **[D]**. School teaches 📖 professions, university also 🎓, never unique agents; the teacher's own education must fit. Not allowed if no copy is available **[D]** |
| R-11 | **Custom house:** sell 1 resource from the warehouse at market price, trader bonus included **[D]**; it counts towards demand **[D]** |
| R-12 | **Supply:** spend 1 food, draw 1 card |
| R-13 | **Exchange:** discard 2 cards, the played one included **[D]**, draw 1 |
| R-14 | **Smuggling** (smuggler): sell 1 warehouse resource at price -1; does not count towards demand **[D]** |
| R-15 | Crosses are capped at 15. Bells have no cap |

## N. Natives

| ID | Rule |
|---|---|
| N-1 | Revealing a settlement cell draws the first tribe card matching its terrain, if fewer than 6 settlements have been placed. No match, or limit reached: the cell is plain terrain. **[D]** Destroyed settlements free no slot |
| N-2 | Settlements take numbers 1–6 in order of appearance **[D]** on the order. Events refer to these numbers **[A]** |
| N-3 | Hostility is shared by the tribe, limited to 0–5. A second settlement of a tribe joins at the current value **[D]** |
| N-4 | Native actions need infantry or ship adjacent to the settlement |
| N-5 | **Gift:** 1 goods from the warehouse, roll 3 dice, hostility falls by 1 + successes |
| N-6 | **Preach:** pay crosses equal to hostility; native agent to discard; hostility +1; population -1. **[D]** At population 0 the settlement disappears with no loot |
| N-7 | **Attack:** settlement strength = population + terrain. Victory: optional native agent, +1 🔔, population -1 whatever the damage. Last one gives loot. Any attack, won or lost, sets hostility to 5 |
| N-8 | Loot resources go straight to the warehouse, gold to the player |
| N-9 | **Alliance:** hostility 0–1 (0–3 with John Smith); 🎓 agent or scout; settlement not yet allied. Alliance ends at hostility 4–5 |
| N-10 | Native agents are limited to the pile of 8; none left means none gained **[D]** |
| N-11 | **Activation of settlement N [A].** Affects the owner of the colony nearest to that settlement. Hostility 0–2: the owner receives 1 food. 3: nothing. 4–5: raid on that colony (N-12). Nothing happens if settlement N or any colony does not exist **[A]**. **[D]** A gift that does not fit falls under T-7 |
| N-12 | **Raid** on the nearest colony (straight distance; ties by turn order **[D]**): its owner discards 2 resources or loses 1 building; a fort prevents it. With fewer than 2 resources and no buildings, all resources are lost **[D]** |
| N-13 | Pocahontas lowers hostility by 1 for her owner in all checks, but not the stored value |
| N-14 | **[D]** A settlement revealed next to an existing colony is placed as usual: the distance rule limits founding only. Q16 |

## B. Founding Fathers

All 34 cards are implemented as printed in the spreadsheet. Clarifications:

| ID | Rule |
|---|---|
| B-1 | Limit 4; Jefferson raises it to 6. A taken slot in the salon refills after the action |
| B-2 | Sepúlveda gives 2 slaves **[A]**, or as many as the agent deck and common discard still hold **[D]** |
| B-3 | Equiano: slaves are removed from the player's collection (spreadsheet) to the common discard **[D]**, and each is replaced by the top card of the agent deck. P-4 applies |
| B-4 | Las Casas: preaching is free; attacks on natives are forbidden. Both last all game |
| B-5 | Franklin, Hooker, Rolfe, Squanto, Whitney add to each production action that yields that resource. Rolfe counts only 🍂, Squanto only 🌽 |
| B-6 | Champlain: any revealed legal cell, within the limit of 3 |
| B-7 | Jefferson: the cheapest Father in the salon, owner's choice among ties **[D]** |
| B-8 | Kościuszko: +1 for a stockade or +2 for a fort, on top of the usual bonus |
| B-9 | Arnold: used only if the owner becomes the loyalist |
| B-10 | A card that leaves a collection goes to the common discard, natives to their pile, nation cards out of the game **[D]** |

## V. Events

| ID | Rule |
|---|---|
| V-1 | Shuffle 22 cards; one per round, no reshuffle. At most 10 are seen |
| V-2 | Effects resolve in printed order; players act in turn order from the first player |
| V-3 | "Player with the most": ties go to the closest clockwise from the first player, starting with the first player. If everyone has 0, nothing happens |
| V-4 | Stock counts the warehouse only, not the hold |
| V-5 | Price changes respect 0 and the cap. They do not touch the demand track **[D]** |
| V-6 | "May" effects are offered to each player in turn order. Joint effects (Great Awakening) are simultaneous and secret |
| V-7 | Settlement activation is the last step |
| V-8 | REF additions written "per player" count all players |
| V-9 | **[D]** "The first player may add an agent": taken from the agent deck or common discard, if there is one. "Remove from the top of your deck": an empty deck is refilled first. P-4 applies to every removal |
| V-10 | **[D]** Great Awakening: chapel and church count together. Stamp Act: 1 🔔 in total for town hall or newspaper. Sacred Forest: the player with the most timber, or if nobody has any, the most buildings |
| V-11 | **[D]** Smuggling events sell from the warehouse at the current market price, without agent bonuses |

## X. Ruins and wrecks

| ID | Rule |
|---|---|
| X-1 | Infantry entering a ruin draws from the ruins deck; a ship entering a wreck draws from the wrecks deck. The marker is removed |
| X-2 | Used cards go to a discard, reshuffled if the deck runs out **[D]** |
| X-3 | Options need their cost and requirement to be met. If no option is available, nothing happens **[D]** |
| X-4 | "Requires an agent with ⚔️" or a scout: **[D]** the agent played for this move, or one discarded from hand |
| X-5 | A scout's move ignores effects marked 💀, including for ships **[D]** |
| X-6 | "Nearest settlement" uses straight distance; ties by the player's choice **[D]**. None on the map: that part is skipped |
| X-7 | Losses of crosses and bells stop at 0 **[D]**. Bell costs on "pay" options must be affordable **[D]** |

## W. War of Independence

| ID | Rule |
|---|---|
| W-1 | Starts at the end of a round, after tax, if any player has 15 🔔 or round 10 is over |
| W-2 | Loyalist is the player with the fewest 🔔 (then fewest ✝️, then fewest 🟡 **[D]** on direction). No loyalist in solo **[A]**, or if every player has 15+ 🔔. The second case needs all to reach 15 in the same final round, and is meant to be very rare **[A]** |
| W-3 | Draw one King tactic |
| W-4 | REF pool = accumulated 🟥, plus 1 per settlement with hostility 4–5, plus tactic additions |
| W-5 | Deal 🟥 one per patriot colony, in order of most 🔔 (then ✝️, 🟡), repeating until the pool is empty. **[D]** Within a player, colonies go in founding order |
| W-6 | Loyalist places any of their agents face down at patriot colonies. Counts are public |
| W-7 | Patriots then choose, secretly and at the same time **[D]**: army cards (any with ⚔️, infantry or ship value), militia (1 🔔 each, up to the number of their non-military cards), mercenaries (5 🟡 each), 3 cubes per allied settlement, and their placement |
| W-8 | Washington: 2 militia per bell, still limited by non-military cards **[D]**. Revere: 4 free militia, not limited **[D]** |
| W-9 | Attack = 1 × 🟥 (DD-49; was 2 ×) + tactic + loyalist cards' ⚔️ + loyalist militia. Card count does not add strength here, unlike C-3 |
| W-10 | Defence = 1 + terrain + buildings + 1 per own token on or next to the colony + cards' ⚔️ + support cubes |
| W-11 | A colony not attacked, with no 🟥 and no loyalist card, is kept **[D]** |
| W-12 | If attack is greater, the loyalist rolls (solo and no loyalist: the game rolls **[D]**) dice equal to the difference, at most 10. No success: colony holds. 1+ success: colony falls. Equal or less: colony holds |
| W-13 | If the colony falls and the loyalist's own strength there is at least the REF strength, the loyalist takes it. REF strength = 2 × 🟥 + tactic **[D]** |
| W-14 | Tactics modify the above as printed in the spreadsheet. Loyalist Militia has no effect without a loyalist **[D]** |
| W-15 | Sieges are resolved in the same player order as W-5; all commitments are fixed beforehand |

### Scoring

| ID | Rule |
|---|---|
| W-20 | Patriot: 6 per held colony, 1 per unspent 🔔. Loyalist: 3 per colony, captured ones included |
| W-21 | All: 1 per 5 agents, 1 per 10 🟡 (Fugger 7), 1 per building, 1 per Father, plus card bonuses. Fractions are dropped |
| W-22 | To win, a player must hold at least 1 colony and have the most points. Ties: gold, then number of agents, then shared |
| W-23 | If nobody qualifies, the Crown wins **[D]**. Solo: the player wins by holding at least 1 colony **[A]**, and the score is the measure |

## Settings index

All numbers above are ruleset values. Settings that choose between readings, plus those the designer's answers introduced:

| Setting | Default | Alternatives to test |
|---|---|---|
| `activation.giftMaxHostility` | 2 | 1, 3 |
| `activation.raidMinHostility` | 4 | 3, 5 |
| `activation.gift` | 1 food | 2 food, none |
| `natives.preachMin` | 0 | 1 |
| `fort.replacesStockade` | true | false (adds up to +3) |
| `damage.sendsToEurope` | true | false |
| docks bonus, Sepúlveda's slaves and other card values | as printed | any |
| `ring.openSea`, `ring.europe` | 1, 1 | 0, 1 |
| `market.maxPrice` | 5 | none, higher |
| `propaganda.maxFathers` | 2 | 1 |
| `cargo.costPer` | operation | unit |
| `combat.countPlayedCard` | true | false |
| `combat.supportFromCriminalSlave` | true | false |
| `combat.diceCap` | none | 10 |
| `europe.safe` | true | false |
| `explore.diagonal` | false | true |
| `production.emptyMeans` | noToken | noForeignToken |
| `war.refStrengthIncludesTactic` | true | false |
