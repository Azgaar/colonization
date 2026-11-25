# AI players and test lab

## 1. What makes the AI problem manageable, and what doesn't

Helpful: short games (about 50 card plays per player plus extra draws), one card and one action per turn, small map, small numbers.

Hard:

- **Hidden information:** hands, deck orders, unrevealed map, face-down war placement.
- **Delayed payoff:** almost all scoring comes from one final battle.
- **Many movement targets** per action.
- **Simultaneous secret choices** in combat and war.
- **Role uncertainty:** whether one ends as loyalist or patriot depends on everyone's bells.

## 2. Bots

| Level | Bot | Purpose |
|---|---|---|
| 0 | **Random**: any legal choice | Find crashes and rule holes |
| 1 | **Greedy**: best immediate estimated value | Baseline and speed reference |
| 2 | **Goal-driven**: keeps plans, scores card-action pairs by progress | Main bot for balance batches, default opponent |
| 3 | **Tuned**: level 2 with weights optimised by self-play | Finds strong lines within its vocabulary |
| 4 | **Search** (information-set MCTS): samples hidden information, simulates with level 2 | Strong opponent and exploit finder |

### Goal-driven bot

1. **Evaluate the situation:** round, expected end round, score estimate, likely role, siege odds.
2. **Maintain goals**, such as: found next colony, deliver cargo, build X, hire a role, take a Father, ally or loot a settlement, prepare defence, rush or delay the war.
3. **Generate candidates:** for each card, macro actions such as "sail to the best reachable cell towards goal". The engine still receives ordinary legal choices.
4. **Score** by goal progress, card fit, opportunity cost and risk, using personality weights.
5. **Explain:** the top candidates and their main score components are logged.

### Personalities

| Personality | Aim | Tests |
|---|---|---|
| Balanced | Best all-round estimate | Reference |
| Trader | Raw goods, workshop, regular voyages | Is trade viable? |
| Explorer-looter | Ruins, wrecks, conquest | Is looting too good? |
| Missionary | Crosses, preaching, alliances | Are crosses useful? |
| Rebel | Bells, always refuses tax, early war | Is a bell rush dominant? |
| Loyalist | Few bells, large REF, assault cards | Can a loyalist win on purpose? |
| Raider | Attacks ships and colonies | Is player conflict worth it? |

### War module

The war needs its own solver, because it decides most games. Given public information and a belief about hidden cards, it picks commitments that maximise expected score, including the option to abandon a colony. The same estimate feeds evaluation earlier in the game and the player-facing forecast.

### Fair play

Bots receive only their own view. A test runs each decision twice with different hidden information and the same view, and requires identical output.

### Strength checks

- Tuned beats random in over 95% of two-player games (M2).
- Each higher level beats the one below with a 95% confidence interval above even chances.
- A personality that loses everywhere means a weak bot or a weak strategy. Search decides which.

## 3. Experiments

| Type | Question answered |
|---|---|
| Baseline | How does the current ruleset behave? |
| A/B | What does this change do? Same seeds and seats on both sides |
| Sweep | How does the outcome vary over a range? |
| Sensitivity | Which unclear rules (settings) actually matter? |
| Conversion | Does a `pc` change improve the game enough to promote to `board`? |
| Round robin | Which personality beats which? |
| Exploit hunt | What does a bot tuned only for X achieve? |
| Component | What is the peak use of each component? |

Standards:

- Rotate seats and nations so neither confounds the result.
- Report sample size and 95% intervals. No claim from a difference inside the interval.
- Correct for the number of comparisons when scanning many cards.
- Tune on one set of seeds, report on another.
- Record ruleset, data version, engine version and bot versions with each result.
- Repeat key findings with at least two bot types, and name any that hold for only one.

Sizing guide: a win rate near 25% needs about 1,800 games for ±2 points and about 7,200 for ±1.

## 4. Metrics

| Area | Metrics |
|---|---|
| Outcome | Win rate by nation, seat, role, personality; score distribution; margin; share of games with no winner |
| Length | Rounds, trigger (15 bells or round 10), card plays, decisions per player |
| Lead | When the eventual winner takes the lead; lead changes; correlation of score at round 3, 5, 7 with the result |
| Economy | Gold by source (trade, ruins, wrecks, loot, events) and by use; prices over time; unsold goods; storage waste |
| Tax | Pay or refuse by round, player count and role |
| Bells, crosses | By source and use; number of Fathers |
| Cards | For each agent, building, Father: offered, taken, when, win rate when held, plays per round |
| Map | Time to first, second, third colony; number founded; fragments revealed; blocked sites |
| Natives | Settlements, hostility, gifts, preaching, alliances, conquests, raids |
| Conflict | Attacks by type, odds, success, cost against benefit |
| War | REF size and sources; strength gap; colonies lost; miracles; loyalist captures; mercenaries and militia |
| Experience proxies | Turns with one sensible option; passes with cards left; idle opponents' time; rounds with no meaningful change |
| Components | Peak cubes by colour, tokens, card copies |

Every metric can be split by player count, nation and personality.

## 5. Balance hypotheses

These come from reading the rules and from small calculations on the data. None is proven. M2 gives each a first verdict.

| # | Hypothesis | Basis |
|---|---|---|
| H1 | Trade cannot carry the economy | Taxes total 105 gold per player. If prices only fall, the market pays roughly 38–45 per player with 3–5 players, about 48 with two, and up to 68 solo, depending on batch size. Excludes events, traders, smuggling |
| H2 | Refusing tax dominates with 3+ players | Added cubes are shared while the bell is private. Break-even tax, comparing with mercenaries: solo 25, two players 15, three 5, four about 2. Assumes equal patriots and militia capacity |
| H3 | Refusals shorten the game too much | Nine refusals give 9 of the 15 bells |
| H4 | Loyalist is weaker than the intended 15% win rate | Weaker by design **[A]**; the question is by how much. 3 points per colony against 6; capture requires matching REF strength, e.g. 14 for 7 cubes, about five dragoons |
| H5 | More REF makes captures harder | More cubes help colonies fall but raise the loyalist's threshold |
| H6 | Map is too small for 5 players | In 3,000 generated maps, 15 colonies fit in about 11% even with favourable placement, 12 in about 67%, 9 in about 98% |
| H7 | Ruins, wrecks and loot out-earn trade | About 8 sites per map, with rewards often 5–25 gold; Inca and Aztec loot 25 and 20 |
| H8 | Free preaching at hostility 0 is too strong | Cost equals hostility; Las Casas and Eliot amplify it |
| H9 | Franklin plus newspaper ends games suddenly | Newspaper 3 + Franklin 2 + politician 1 = 6 bells per action |
| H10 | Four-card nations are harder by the intended amount | Deliberate handicap **[A]**: Sweden, Denmark, Russia, Courland and Scotland start with one action fewer. Test whether the size fits their stars and whether the order of difficulty is right |
| H11 | Settlement cap makes exploration order decisive | About 12 villages are printed per map, 6 are placed, so the first explored become real |
| H12 | Colonies rarely survive a moderate gap, which rewards all-in defence | Holding chance is 67% at 1 die, 30% at 3, 13% at 5, 2% at 10 |
| H13 | Supply is never worth an action | It plays 1 card to draw 1, so it gains no action and costs 1 food |

Further questions: Is there a first-player advantage? Is early player conflict ever worth it? Does the Cossack's empty-tundra production make up for a smaller deck? How much food do ocean cells supply, and do docks pay off? Do settlement gifts make low hostility worth pursuing? Do 2-player games work with one loyalist and one patriot? Which of the 22 events matter?

### Balance targets

Agreed with the designer **[A]**, except where marked. Used to flag results, not to judge the design automatically. Chance level for one of four players is 25%.

| Target | Range |
|---|---|
| Nation win rate, 4 players, same bot | 20–30% for one-star nations; harder ones may be lower in line with stars |
| Seat win rate, 4 players | 22–28% |
| Loyalist win rate, 4 players | about 15% (flag outside 10–20%) |
| Games ending before round 8 | under 25% |
| Colonies surviving the war | 40–70% |
| Leader at round 5 also wins the game | reported without a target until Q14 is answered; designer: "very rare" |
| Any personality's win rate in mixed games | 15–35% |
| Fathers or agents never worth taking | none |

## 6. Limits

Simulations can find dominant strategies, dead cards, bad numbers, stalls and runaway leads. They cannot tell whether the game is fun, whether the theme lands, how bluffing and deals change play, or whether rules are easy to learn. Human games through the app and at the table cover those.
