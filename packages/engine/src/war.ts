import type { Choice, Explained, Part, PlayerResult, Siege, State } from './types.ts';
import { ask, decision, log, push, task } from './core.ts';
import { dice } from './rng.ts';
import { addBells, addGold, coloniesOf, collection, collectionSize, count, isMilitary, mods } from './util.ts';
import { distance, nb } from './map.ts';
import { buildingDefence, cardStrength } from './combat.ts';

const tactic = (s: State) => s.def.tactics[s.war!.tactic].effect;

/** Cards that exist only in the war (DD-123): a Brave for each ally, militia and mercenaries bought. */
export const WAR_CARDS = ['brave', 'militia', 'mercenary'] as const;
export const isWarCard = (card: string) => (WAR_CARDS as readonly string[]).includes(card);
/** A card's 🗡️ in the war: a war card's printed value, or an agent's best combat bonus. A face-down card ('?') counts 0. */
export function warStrength(s: State, card: string, cell: number): number {
  if (card === 'brave') return s.def.settings.war.allyCubes;
  if (card === 'militia' || card === 'mercenary') return 1;
  return cardStrength(s, card, 'best', false, cell);
}
const strengthOf = (s: State, cards: string[], cell: number) => cards.reduce((n, c) => n + warStrength(s, c, cell), 0);

/** Whether a colony is the loyalist's, besieged by the patriots. */
export const loyalistColony = (s: State, x: Siege) => s.war!.loyalist === x.owner;
/** Cards on a slot that are not the owner's: the attack. */
export const enemyCards = (x: Siege) => Object.entries(x.stacks).flatMap(([q, c]) => (Number(q) === x.owner ? [] : c));
export const attacked = (x: Siege) => x.cubes > 0 || enemyCards(x).length > 0;
/** Strength each patriot brings to a siege of a loyalist colony. */
export function raidersBy(s: State, x: Siege): Record<number, number> {
  return Object.fromEntries(Object.entries(x.stacks).filter(([q]) => Number(q) !== x.owner).map(([q, c]) => [Number(q), strengthOf(s, c, x.cell)]));
}

/** Players from most to least rebellious. */
export function rebelOrder(s: State): number[] {
  const seat = (p: number) => (p - s.first + s.players.length) % s.players.length;
  return s.players.map((_, p) => p).sort((a, b) => {
    const x = s.players[a], y = s.players[b];
    return y.bells - x.bells || y.crosses - x.crosses || y.gold - x.gold || seat(a) - seat(b);
  });
}
/** Whether this game can have a loyalist at all: not solo, and not below `war.loyalistFrom` players (W-2). */
export const hasLoyalist = (s: State) => s.players.length > 1 && s.players.length >= s.def.settings.war.loyalistFrom;
export function findLoyalist(s: State): number | null {
  if (!hasLoyalist(s) || s.players.every((p) => p.bells >= s.def.settings.war.bells)) return null;
  const order = rebelOrder(s), last = order.at(-1)!;
  return s.def.settings.war.noLoyalistOnTie && loyalistTie(s, order) ? null : last;
}
/** Whether the two least rebellious players tie on 🔔, ✝️ and 🟡 alike, so that only the turn order would tell them apart (W-2). */
export function loyalistTie(s: State, order = rebelOrder(s)): boolean {
  const a = s.players[order.at(-1)!], b = s.players[order.at(-2)!];
  return a.bells === b.bells && a.crosses === b.crosses && a.gold === b.gold;
}

task('warStart', (s, t) => {
  const set = s.def.settings.war, order = rebelOrder(s), loyalist = findLoyalist(s), n = s.players.length;
  const id = s.tacticDeck.pop()!, first = loyalist ?? order[0];
  const turn = s.players.map((_, k) => (first + k) % n);
  s.war = { loyalist, tactic: id, pool: 0, order, turn, sieges: [], hands: {}, gained: {}, swapped: {}, supply: { militia: set.militiaCards, mercenary: set.mercenaryCards } };
  const eff = tactic(s);
  const hostile = count(s.settlements, (x) => x.alive && s.hostility[x.tribe] >= set.hostileFrom);
  s.war.pool = s.ref + hostile * set.hostileCubes + (eff.t === 'cubes' ? eff.add : 0);
  // Every colony has its slot, numbered in founding order: the patriots' from the most rebellious, then the loyalist's.
  // The table plays the sieges from the loyalist's colony 1, clockwise; no siege changes another, so the order changes no result.
  for (const p of [...order.filter((q) => q !== loyalist), ...(loyalist !== null ? [loyalist] : [])])
    coloniesOf(s, p).forEach((c, k) => s.war!.sieges.push({ owner: p, cell: c.cell, slot: k + 1, cubes: 0, stacks: {}, betrayed: 0 }));
  // W-5: the Royal Army shared out evenly among the patriot colonies; the rest one each, the most rebellious patriot's colony 1 first.
  const targets = order.filter((p) => p !== loyalist).flatMap((p) => s.war!.sieges.filter((x) => x.owner === p));
  if (targets.length) {
    const each = Math.floor(s.war.pool / targets.length), rest = s.war.pool % targets.length;
    targets.forEach((x, k) => { x.cubes = each + (k < rest ? 1 : 0); });
  }
  // Who declared independence (20 🔔 or more) and everyone's bells, for telling why the war began and why the loyalist sides with the King.
  // `tie`: the fewest 🔔, ✝️ and 🟡 were tied, so nobody sides with the King.
  const tie = loyalist === null && hasLoyalist(s) && !s.players.every((p) => p.bells >= set.bells);
  log(s, { e: 'war', loyalist, tie, tactic: id, pool: s.war.pool, reason: t.reason, rebels: s.players.flatMap((p, k) => (p.bells >= set.bells ? [k] : [])), bells: s.players.map((p) => p.bells) });
  push(s, ...turn.map((p) => ({ t: 'raise', p })), { t: 'deploy', i: 0, stopped: [] },
    ...(loyalist !== null && mods(s, loyalist, 'betray').length ? [{ t: 'betray', p: loyalist }] : []),
    { t: 'sieges' }, { t: 'score', reason: t.reason });
});

/** Take war cards into a player's hand, as many as the box still holds. */
function give(s: State, p: number, card: 'brave' | 'militia' | 'mercenary', n: number) {
  for (let k = 0; k < n; k++) { s.war!.hands[p].push(card); s.war!.gained[p].push(card); }
}
// W-6: everyone takes their whole agent pool as one hand, then their Braves; the loyalist may get militia from the King's tactic.
task('raise', (s, t) => {
  const p = t.p as number, war = s.war!, eff = tactic(s);
  war.hands[p] = collection(s.players[p]).sort();
  war.gained[p] = [];
  war.swapped[p] = [];
  const braves = count(s.settlements, (x) => x.alive && x.ally === p);
  give(s, p, 'brave', braves);
  let free = 0;
  if (p === war.loyalist && eff.t === 'militiaPerCross') {
    free = Math.min(war.supply.militia, s.players[p].crosses * eff.value);
    war.supply.militia -= free;
    give(s, p, 'militia', free);
  }
  log(s, { e: 'troops', p, braves, militia: free });
  push(s, ...(p !== war.loyalist ? [{ t: 'askMilitia', p }] : []), { t: 'askMercenaries', p });
});

const perBell = (s: State, p: number) => mods(s, p, 'militiaPerBell').reduce((n, m) => Math.max(n, m.value), 1);
const freeSwaps = (s: State, p: number) => mods(s, p, 'freeMilitia').reduce((n, m) => n + m.value, 0);
/** Agents in a player's war hand that can be swapped for militia: those without 🗡️. */
export const civilians = (s: State, p: number) => s.war!.hands[p].filter((c) => !isWarCard(c) && !isMilitary(s, c));
/** Bells that `n` swaps cost: Revere's free ones first, then Washington's two per bell. */
export const militiaCost = (s: State, p: number, n: number) => Math.ceil(Math.max(0, n - freeSwaps(s, p)) / perBell(s, p));
export function militiaMax(s: State, p: number): number {
  return Math.min(s.war!.supply.militia, civilians(s, p).length, freeSwaps(s, p) + s.players[p].bells * perBell(s, p));
}
task('askMilitia', (s, t) => { if (militiaMax(s, t.p as number) > 0) ask(s, { kind: 'militia', player: t.p as number }); });
decision('militia', {
  options: (s, d) => Array.from({ length: militiaMax(s, d.player) + 1 }, (_, n) => ({ c: 'militia', n, bells: militiaCost(s, d.player, n) })),
  resolve(s, d, c) {
    const p = d.player, n = c.n as number, war = s.war!;
    if (!n) return;
    const out = civilians(s, p).slice(0, n);
    for (const a of out) war.hands[p].splice(war.hands[p].indexOf(a), 1);
    war.swapped[p].push(...out);
    war.supply.militia -= n;
    give(s, p, 'militia', n);
    addBells(s, p, -militiaCost(s, p, n), 'militia');
    log(s, { e: 'militia', p, n, swapped: out });
  },
});
export const mercenaryMax = (s: State, p: number) => Math.min(s.war!.supply.mercenary, Math.floor(s.players[p].gold / s.def.settings.war.mercenaryGold));
task('askMercenaries', (s, t) => { if (mercenaryMax(s, t.p as number) > 0) ask(s, { kind: 'mercenaries', player: t.p as number }); });
decision('mercenaries', {
  options: (s, d) => Array.from({ length: mercenaryMax(s, d.player) + 1 }, (_, n) => ({ c: 'mercenaries', n })),
  resolve(s, d, c) {
    const p = d.player, n = c.n as number;
    if (!n) return;
    s.war!.supply.mercenary -= n;
    give(s, p, 'mercenary', n);
    addGold(s, p, -n * s.def.settings.war.mercenaryGold, 'mercenaries');
    log(s, { e: 'mercenaries', p, n });
  },
});

/** Where a player may place cards (W-7): the loyalist on their own colonies or any patriot's; a patriot on their own or the loyalist's, never another patriot's. */
export const deployTargets = (s: State, p: number) =>
  s.war!.sieges.flatMap((x, i) => (x.owner === p || p === s.war!.loyalist || x.owner === s.war!.loyalist ? [i] : []));
// W-7: clockwise from the loyalist, each turn one or more cards face down on one slot, or a pass for good; until everyone has passed.
task('deploy', (s, t) => {
  const q = s.war!.turn, n = q.length;
  for (let k = 0; k < n; k++) {
    const i = (t.i + k) % n, p = q[i];
    if (!t.stopped.includes(p) && s.war!.hands[p].length && deployTargets(s, p).length) return ask(s, { kind: 'deploy', player: p, i, stopped: t.stopped });
  }
});
decision('deploy', {
  always: true,
  options(s, d) {
    const cards = [...new Set(s.war!.hands[d.player])], at = d.siege === undefined ? deployTargets(s, d.player) : [d.siege as number];
    return [...cards.flatMap((card) => at.map((siege): Choice => ({ c: 'place', card, siege }))), { c: d.siege === undefined ? 'pass' : 'done' }];
  },
  resolve(s, d, c) {
    const p = d.player, war = s.war!, next = (stopped: number[]) => push(s, { t: 'deploy', i: (d.i as number) + 1, stopped });
    if (c.c === 'pass') return next([...(d.stopped as number[]), p]);
    if (c.c === 'done') return next(d.stopped as number[]);
    const x = war.sieges[c.siege as number], card = c.card as string, hand = war.hands[p];
    (x.stacks[p] ??= []).push(card);
    hand.splice(hand.indexOf(card), 1);
    log(s, { e: 'deploy', p, cell: x.cell, n: x.stacks[p].length });
    if (hand.length) return ask(s, { kind: 'deploy', player: p, i: d.i, stopped: d.stopped, siege: c.siege });
    next(d.stopped as number[]);
  },
});
task('betray', (s, t) => { if (s.war!.sieges.some((x) => attacked(x) && !loyalistColony(s, x))) ask(s, { kind: 'betray', player: t.p }); });
decision('betray', {
  options: (s) => [...s.war!.sieges.flatMap((x, siege) => (attacked(x) && !loyalistColony(s, x) ? [{ c: 'betray', siege }] : [])), { c: 'skip' }],
  resolve(s, d, c) { if (c.c === 'betray') s.war!.sieges[c.siege as number].betrayed = mods(s, d.player, 'betray')[0].add; },
});

/** A siege's two sides (W-9, W-10). `ref` is the Royal Army's strength and `loyalist` the loyalist's cards there, compared when a patriot colony falls (W-13). */
export function siegeStrength(s: State, x: Siege): { attack: Explained; defence: Explained; ref: number; loyalist: number } {
  const set = s.def.settings.war, eff = tactic(s), a: Part[] = [], d: Part[] = [], war = s.war!;
  const ex = (parts: Part[]): Explained => ({ total: parts.reduce((n, y) => n + y.value, 0), parts: parts.filter((y) => y.value !== 0) });
  const pl = s.players[x.owner];
  const near = (distance(s, pl.ship, x.cell) <= 1 ? 1 : 0) + (typeof pl.inf === 'number' && distance(s, pl.inf, x.cell) <= 1 ? 1 : 0);
  const own = strengthOf(s, x.stacks[x.owner] ?? [], x.cell);
  if (loyalistColony(s, x)) {
    // Patriots against a loyalist colony: their cards against the colony, its terrain and buildings, the loyalist's tokens and guard; the King's tactic plays no part.
    a.push({ label: 'patriot cards', value: strengthOf(s, enemyCards(x), x.cell) });
    d.push({ label: 'colony', value: set.baseDefence }, { label: 'terrain', value: s.def.terrain[s.map.terrain[x.cell]!].defence }, ...buildingDefence(s, x.owner));
    d.push({ label: 'tokens', value: near * set.tokenBonus }, { label: 'army', value: own });
    return { attack: ex(a), defence: ex(d), ref: 0, loyalist: 0 };
  }
  const cubes = x.cubes * set.refStrength;
  let bonus = 0;
  if (eff.t === 'perCubes') bonus = Math.floor(x.cubes / eff.per) * eff.add;
  if (eff.t === 'perOcean') bonus = Math.floor(count(nb(s, x.cell), (c) => s.map.terrain[c] === 'ocean') / eff.per) * eff.add;
  const cards = war.loyalist === null ? 0 : strengthOf(s, x.stacks[war.loyalist] ?? [], x.cell);
  a.push({ label: 'ref', value: cubes }, { label: 'tactic', value: bonus }, { label: 'loyalist cards', value: cards });
  d.push({ label: 'colony', value: set.baseDefence });
  if (eff.t !== 'noTerrain') d.push({ label: 'terrain', value: s.def.terrain[s.map.terrain[x.cell]!].defence });
  // Siege Artillery takes away the buildings' defence, not a Father's bonus for them (Kościuszko).
  d.push(...buildingDefence(s, x.owner).filter((y) => eff.t !== 'noBuildings' || y.label.startsWith('fathers:')));
  d.push({ label: 'tokens', value: near * set.tokenBonus }, { label: 'army', value: own });
  if (x.betrayed) d.push({ label: 'benedict_arnold', value: x.betrayed });
  return { attack: ex(a), defence: ex(d), ref: cubes + (set.refStrengthIncludesTactic ? bonus : 0), loyalist: cards };
}

/** Each side rolls a die until one is higher; returns the index of the winner. */
function rollOff(s: State, cell: number, players: (number | 'king')[]): number {
  let tied = players.map((_, k) => k);
  while (tied.length > 1) {
    const roll = dice(s, tied.length), top = Math.max(...roll);
    log(s, { e: 'siegeTie', cell, players: tied.map((k) => players[k]), dice: roll });
    tied = tied.filter((_, k) => roll[k] === top);
  }
  return tied[0];
}

task('sieges', (s) => {
  const set = s.def.settings, war = s.war!, eff = tactic(s);
  const faces = eff.t === 'successFrom' ? eff.faces : set.combat.successFaces, need = eff.t === 'minSuccesses' ? eff.value : 1;
  for (const x of war.sieges) {
    x.fell = false;
    x.takenBy = null;
    if (!attacked(x)) continue;
    const { attack, defence, ref, loyalist } = siegeStrength(s, x), counter = loyalistColony(s, x);
    x.attack = attack.total;
    x.defence = defence.total;
    x.dice = dice(s, Math.max(0, Math.min(set.war.diceCap, attack.total - defence.total)));
    // A loyalist colony falls on the board's faces; the King's tactic is for his army.
    x.fell = counter ? x.dice.some((v) => set.combat.successFaces.includes(v)) : x.dice.filter((v) => faces.includes(v)).length >= need;
    if (x.fell && counter) {
      // W-13: taken by the patriot with the most strength there; tied patriots each roll a die, the highest wins, again on a tie.
      const by = raidersBy(s, x), most = Math.max(0, ...Object.values(by));
      const tied = war.order.filter((p) => most > 0 && (by[p] ?? 0) === most);
      x.takenBy = tied.length ? tied[rollOff(s, x.cell, tied)] : null;
    } else if (x.fell && war.loyalist !== null && loyalist > 0) {
      // W-13: the loyalist takes it if their cards beat the King's army; a tie is a die each, the next player rolling for the King; else the colony is lost.
      if (loyalist > ref) x.takenBy = war.loyalist;
      else if (loyalist === ref) x.takenBy = rollOff(s, x.cell, [war.loyalist, 'king']) === 0 ? war.loyalist : null;
    }
    log(s, { e: 'siege', p: x.owner, cell: x.cell, attack, defence, dice: x.dice, fell: x.fell, takenBy: x.takenBy });
  }
});

export function scorePlayer(s: State, p: number): PlayerResult {
  const set = s.def.settings.score, pl = s.players[p], parts: Part[] = [], war = s.war;
  const loyal = war?.loyalist === p;
  const own = coloniesOf(s, p).length;
  // A colony that fell is lost to its owner; one taken is scored by its taker. A colony the King takes scores for nobody (DD-123).
  const held = own - (war ? count(war.sieges, (x) => x.owner === p && !!x.fell) : 0) + (war ? count(war.sieges, (x) => x.owner !== p && x.takenBy === p) : 0);
  // A nation left with no colony after the war is destroyed: no points at all.
  if (set.destroyedScoresZero && war && held <= 0) return { player: p, score: 0, parts, colonies: 0, side: loyal ? 'loyalist' : 'patriot', qualifies: false };
  const add = (label: string, value: number) => { if (value) parts.push({ label, value }); };
  add('colonies', held * (loyal ? set.loyalistColony : set.patriotColony));
  if (!loyal) {
    add('bells', Math.floor(pl.bells / set.bellsPerPoint) * set.perBell);
    for (const m of mods(s, p, 'pointsPerPatriotColony')) add('simon_bolivar', held * m.value);
  }
  // War cards join the agent pool (DD-123); swapped agents never left it.
  add('agents', Math.floor((collectionSize(pl) + (war?.gained[p]?.length ?? 0)) / set.agentsPerPoint));
  add('gold', Math.floor(pl.gold / mods(s, p, 'goldPerPoint').reduce((n, m) => Math.min(n, m.value), set.goldPerPoint)));
  add('buildings', pl.buildings.length * set.building);
  add('fathers', set.fatherByPrice ? pl.fathers.reduce((n, f) => n + s.def.fathers[f].bells, 0) : pl.fathers.length * set.father);
  for (const m of mods(s, p, 'pointsPerAlliance')) add('alliances', count(s.settlements, (x) => x.alive && x.ally === p) * m.value);
  return { player: p, score: parts.reduce((n, x) => n + x.value, 0), parts, colonies: held, side: loyal ? 'loyalist' : 'patriot', qualifies: held > 0 };
}
task('score', (s, t) => {
  const players = s.players.map((_, p) => scorePlayer(s, p));
  const ok = players.filter((x) => x.qualifies);
  const key = (x: PlayerResult) => [x.score, s.players[x.player].gold, collectionSize(s.players[x.player]) + (s.war?.gained[x.player]?.length ?? 0)];
  const cmp = (a: PlayerResult, b: PlayerResult) => { const x = key(a), y = key(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; };
  ok.sort(cmp);
  s.over = { winners: ok.filter((x) => cmp(ok[0], x) === 0).map((x) => x.player), players, reason: t.reason };
  log(s, { e: 'over', winners: s.over.winners, scores: players.map((x) => x.score) });
});
