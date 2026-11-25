import type { ChoiceOption, Cost, Node, Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Choice, State } from './types.ts';
import { ask, decision, log, push, task } from './core.ts';
import { die, shuffle } from './rng.ts';
import {
  addBells, addCrosses, addGold, addHold, addRef, agent, baseOf, building, canRemove, cardHas, changePrice, coloniesOf, collection, colonyAt,
  combinedHostility, commonAvailable, drawAgent, drawCard, fillSalon, isMilitary, reducePopulation, removeOne, retire, setHostility,
  takeCommon, takeFromPier, total, turnOrder, uniq,
} from './util.ts';
import { colonyProblem, colonyWater, distance, explorable, inEurope, nearestColony, reveal, tokenAt } from './map.ts';
import { loseBuilding, shipToEurope } from './combat.ts';
import { addBuilding, canOwnBuilding, foundColony, gainFather, refreshPier, removeAgent } from './turn.ts';

interface Ctx { p: number; cell?: number }
type Fn<K extends Node['n']> = (s: State, n: Extract<Node, { n: K }>, x: Ctx) => void;

task('nodes', (s, t) => {
  if (!t.nodes.length) return;
  push(s, { t: 'node', node: t.nodes[0], p: t.p, cell: t.cell }, { t: 'nodes', nodes: t.nodes.slice(1), p: t.p, cell: t.cell });
});
task('node', (s, t) => (nodes[t.node.n as Node['n']] as (s: State, n: Node, x: Ctx) => void)(s, t.node, { p: t.p, cell: t.cell }));
const then = (s: State, list: Node[], x: Ctx) => push(s, { t: 'nodes', nodes: list, p: x.p, cell: x.cell });
const eachPlayer = (s: State, t: string, args: object, ok: (p: number) => boolean = () => true) =>
  push(s, ...turnOrder(s).filter(ok).map((p) => ({ t, p, ...args })));
/** Player with the most of something, closest to the first player on ties. Null if everyone has none. */
export function most(s: State, f: (p: number) => number): number | null {
  let best: number | null = null, v = 0;
  for (const p of turnOrder(s)) if (f(p) > v) { v = f(p); best = p; }
  return best;
}
export function fewest(s: State, f: (p: number) => number): number {
  let best = s.first;
  for (const p of turnOrder(s)) if (f(p) < f(best)) best = p;
  return best;
}

// --- Ruins and wrecks --------------------------------------------------------

const pile = (s: State, deck: 'ruin' | 'wreck') => (deck === 'ruin' ? { d: s.ruinDeck, x: s.ruinDiscard, all: s.def.ruins } : { d: s.wreckDeck, x: s.wreckDiscard, all: s.def.wrecks });
function drawPoi(s: State, deck: 'ruin' | 'wreck'): string | null {
  const z = pile(s, deck);
  if (!z.d.length) { z.d.push(...shuffle(s, z.x.splice(0))); }
  return z.d.pop() ?? null;
}
function playPoi(s: State, deck: 'ruin' | 'wreck', id: string, x: Ctx) {
  const z = pile(s, deck);
  log(s, { e: 'poi', p: x.p, deck, card: id });
  push(s, { t: 'nodes', nodes: z.all[id].do, p: x.p, cell: x.cell }, { t: 'poiDone', deck, id });
}
task('poi', (s, t) => {
  const id = drawPoi(s, t.deck);
  const pl = s.players[t.p];
  const cell = t.cell ?? (t.deck === 'wreck' ? pl.ship : pl.inf);
  if (id) playPoi(s, t.deck, id, { p: t.p, cell });
});
task('poiDone', (s, t) => { pile(s, t.deck).x.push(t.id); });
const deckOf = (s: State): 'ruin' | 'wreck' => (s.move?.token === 'infantry' ? 'ruin' : 'wreck');
const scoutIgnores = (s: State, n: { skull?: boolean }) => !!n.skull && !!s.move?.scout;

// --- Paying ------------------------------------------------------------------

const qualifies = (s: State, card: string, what: 'military' | 'scout') => (what === 'military' ? isMilitary(s, card) : cardHas(s, card, 'ignoreSkull'));
function affordable(s: State, p: number, c: Cost): boolean {
  const pl = s.players[p];
  return (c.gold ?? 0) <= pl.gold && (c.bells ?? 0) <= pl.bells && (c.crosses ?? 0) <= pl.crosses && (c.cards ?? 0) <= pl.hand.length &&
    (!c.anyFood || pl.wh.food + pl.hold.food >= c.anyFood) && (!c.anyResource || total(pl.wh) + total(pl.hold) >= c.anyResource) &&
    (!c.holdResource || total(pl.hold) >= c.holdResource) && (!c.wholeHold || total(pl.hold) >= c.wholeHold) &&
    (!c.agent || (!!s.move && qualifies(s, s.move.card, c.agent)) || pl.hand.some((h) => qualifies(s, h, c.agent!)));
}
export function optionChoices(s: State, p: number, opts: ChoiceOption[]): Choice[] {
  const out: Choice[] = [];
  for (const o of opts) {
    if (o.needs && (o.needs === 'colony' ? !coloniesOf(s, p).length : !colonyWater(s, p).length)) continue;
    if (o.cost && !affordable(s, p, o.cost)) continue;
    if (o.cost?.agent && !(s.move && qualifies(s, s.move.card, o.cost.agent)))
      for (const card of uniq(s.players[p].hand).filter((h) => qualifies(s, h, o.cost!.agent!))) out.push({ c: 'option', id: o.id, card });
    else out.push({ c: 'option', id: o.id });
  }
  return out;
}
decision('nodeChoice', {
  always: true,
  options: (s, d) => optionChoices(s, d.player, d.opts),
  resolve(s, d, c) {
    const o = (d.opts as ChoiceOption[]).find((x) => x.id === c.id)!, pl = s.players[d.player], k = o.cost ?? {};
    log(s, { e: 'choice', p: d.player, id: d.id, option: c.id });
    addGold(s, d.player, -(k.gold ?? 0));
    if (k.bells) addBells(s, d.player, -k.bells);
    if (k.crosses) addCrosses(s, d.player, -k.crosses);
    if (k.wholeHold) for (const r of RESOURCES) pl.hold[r] = 0;
    if (c.card) { removeOne(pl.hand, c.card); pl.discard.push(c.card); }
    then(s, o.do, { p: d.player, cell: d.cell });
    if (k.cards) push(s, { t: 'discardCards', p: d.player, n: k.cards });
    if (k.anyFood) push(s, { t: 'payResource', p: d.player, n: k.anyFood, from: ['hold', 'wh'], res: ['food'] });
    if (k.anyResource) push(s, { t: 'payResource', p: d.player, n: k.anyResource, from: ['hold', 'wh'], res: RESOURCES });
    if (k.holdResource) push(s, { t: 'payResource', p: d.player, n: k.holdResource, from: ['hold'], res: RESOURCES });
  },
});
task('discardCards', (s, t) => { if (t.n > 0 && s.players[t.p].hand.length) ask(s, { kind: 'discardCards', player: t.p, n: t.n }); });
decision('discardCards', {
  options: (s, d) => uniq(s.players[d.player].hand).map((card) => ({ c: 'discard', card })),
  resolve(s, d, c) {
    removeOne(s.players[d.player].hand, c.card);
    s.players[d.player].discard.push(c.card);
    push(s, { t: 'discardCards', p: d.player, n: d.n - 1 });
  },
});
const payOptions = (s: State, d: { player: number; from: ('hold' | 'wh')[]; res: Resource[] }): Choice[] =>
  d.from.flatMap((from) => d.res.filter((r) => s.players[d.player][from][r] > 0).map((r) => ({ c: 'pay', from, r })));
task('payResource', (s, t) => {
  const d = { kind: 'payResource', player: t.p, n: t.n, from: t.from, res: t.res };
  if (t.n > 0 && payOptions(s, d).length) ask(s, d);
});
decision('payResource', {
  options: (s, d) => payOptions(s, d),
  resolve(s, d, c) {
    s.players[d.player][c.from as 'hold' | 'wh'][c.r as Resource]--;
    push(s, { t: 'payResource', p: d.player, n: d.n - 1, from: d.from, res: d.res });
  },
});

// --- Nodes -------------------------------------------------------------------

const nodes: { [K in Node['n']]: Fn<K> } = {
  gain(s, n, { p }) {
    addGold(s, p, n.gold ?? 0);
    addBells(s, p, n.bells ?? 0);
    addCrosses(s, p, n.crosses ?? 0);
    for (const r of RESOURCES) {
      if (n.wh?.[r]) s.players[p].wh[r] += n.wh[r];
      if (n.hold?.[r]) addHold(s, p, r, n.hold[r]);
    }
  },
  lose(s, n, { p }) {
    addGold(s, p, -(n.gold ?? 0));
    addBells(s, p, -(n.bells ?? 0));
    addCrosses(s, p, -(n.crosses ?? 0));
  },
  endMove(s) { if (s.move) s.move.ended = true; },
  moves(s, n) { if (s.move && !s.move.ended) s.move.points += n.add; },
  toEurope(s, n, { p }) {
    if (scoutIgnores(s, n)) return;
    if (s.move?.token === 'infantry') { s.players[p].inf = 'europe'; s.move.ended = true; log(s, { e: 'toEurope', p, token: 'infantry' }); }
    else shipToEurope(s, p);
  },
  toColonyWater(s, _, { p }) { if (s.move) s.move.ended = true; ask(s, { kind: 'colonyWater', player: p }); },
  damage(s, n, { p }) { if (!scoutIgnores(s, n)) push(s, { t: 'damage', p, amount: n.amount }); },
  dropHold(s, _, { p }) { for (const r of RESOURCES) s.players[p].hold[r] = 0; },
  choice(s, n, { p, cell }) {
    if (optionChoices(s, p, n.options).length) ask(s, { kind: 'nodeChoice', player: p, id: n.id, opts: n.options, cell });
  },
  roll(s, n, x) {
    const d = die(s);
    log(s, { e: 'roll', p: x.p, die: d });
    then(s, n.table.find((r) => d <= r.max)!.do, x);
  },
  hostilityNearest(s, n, { p, cell }) {
    const alive = s.settlements.filter((x) => x.alive);
    if (!alive.length) return;
    const from = cell ?? s.players[p].ship;
    const min = Math.min(...alive.map((x) => distance(s, from, x.cell)));
    ask(s, { kind: 'nearestSettlement', player: p, list: alive.filter((x) => distance(s, from, x.cell) === min).map((x) => x.n), add: n.add });
  },
  pierLeftmost(s, _, { p }) { if (s.pier.length) s.players[p].discard.push(takeFromPier(s, 0)); },
  drawPoi(s, _, { p, cell }) { push(s, { t: 'poi', p, deck: deckOf(s), cell }); },
  guide(s, n, x) {
    const deck = deckOf(s), cards: string[] = [];
    while (cards.length < n.look) { const c = drawPoi(s, deck); if (!c) break; cards.push(c); }
    if (cards.length) ask(s, { kind: 'guide', player: x.p, cards, deck, cell: x.cell });
  },
  revealAdjacent(s, _, { p, cell }) { for (const f of explorable(s, cell ?? s.players[p].ship)) reveal(s, f, p); },
  discardCards(s, n, { p }) { push(s, { t: 'discardCards', p, n: n.amount }); },
  freeBasicBuilding(s, _, { p }) {
    push(s, { t: 'freeBuilding', p, options: Object.values(s.def.buildings).filter((b) => !b.improvement).map((b) => b.id) });
  },
  ref(s, n) {
    const bells = s.players.reduce((k, x) => k + x.bells, 0);
    addRef(s, n.perBells ? (n.add ?? 0) * Math.floor(bells / n.perBells) : (n.add ?? 0) + (n.perPlayer ?? 0) * s.players.length, s.event ?? 'card');
  },
  // Fathers
  takeFromPier(s, n, { p }) { push(s, { t: 'takeFromPier', p, n: n.amount, to: n.to }); },
  takeAgent(s, n, { p }) {
    for (let i = 0; i < n.amount; i++) { const c = takeCommon(s, n.agent); if (c) { s.players[p].discard.push(c); log(s, { e: 'gainAgent', p, agent: c }); } }
  },
  freeColony(s, _, { p }) {
    if (coloniesOf(s, p).length < s.def.settings.colony.max) ask(s, { kind: 'freeColony', player: p });
  },
  freeBuilding(s, n, { p }) { push(s, { t: 'freeBuilding', p, options: n.options }); },
  convertCrosses(s, n, { p }) { ask(s, { kind: 'convertCrosses', player: p, max: n.max }); },
  cheapestFather(s, _, { p }) { if (s.salon.length) ask(s, { kind: 'cheapestFather', player: p }); },
  replaceAgents(s, n, { p }) {
    for (const c of collection(s.players[p]).filter((x) => baseOf(s, x) === n.agent)) {
      if (!removeAgent(s, p, c)) return;
      const x = drawAgent(s);
      if (x) s.players[p].discard.push(x);
    }
  },
  // Events
  price(s, n) { for (const r of n.res) changePrice(s, r, n.add); },
  priceReset(s, n) { for (const r of n.res) s.price[r] = s.def.resources[r].price; },
  gainIfStock(s, n) { for (const p of turnOrder(s)) if (s.players[p].wh[n.res] > 0) addBells(s, p, n.bells); },
  gainPerBuilding(s, n) {
    for (const p of turnOrder(s)) {
      const v = s.players[p].buildings.map((b) => n.buildings[b] ?? 0);
      const k = n.once ? Math.max(0, ...v) : v.reduce((a, b) => a + b, 0);
      if (n.what === 'bells') addBells(s, p, k); else addCrosses(s, p, k);
    }
  },
  sellOff(s, n) { eachPlayer(s, 'sellOff', { node: n, done: [], any: false }); },
  firstMayTake(s, n) {
    if (commonAvailable(s, n.agent) && s.players[s.first].gold >= n.gold) ask(s, { kind: 'mayTake', player: s.first, agent: n.agent, gold: n.gold });
  },
  mostPays(s, n) {
    const p = most(s, (x) => s.players[x].wh[n.res]);
    if (p !== null) ask(s, { kind: 'payOrRef', player: p, gold: (n.goldPerUnit ?? 0) * s.players[p].wh[n.res] + (n.gold ?? 0), ref: n.ref, bells: n.bells ?? 0 });
  },
  refreshPier(s, n) { refreshPier(s, (c) => n.which === 'all' || isMilitary(s, c)); },
  refreshSalon(s) { const old = s.salon; s.salon = []; fillSalon(s); s.fatherDiscard.push(...old); fillSalon(s); },
  sellAgents(s, n) { eachPlayer(s, 'sellAgents', { node: n, left: n.max }); },
  jointCrosses(s, n) { push(s, { t: 'joint', order: turnOrder(s), _given: [], node: n }); },
  populationAll(s, n) { for (const x of s.settlements) if (x.alive) reducePopulation(s, x, -n.add); },
  hostilityAll(s, n) { for (const t of uniq(s.settlements.filter((x) => x.alive).map((x) => x.tribe))) setHostility(s, t, s.hostility[t] + n.add); },
  payPerBuilding(s, n) { eachPlayer(s, 'payPerBuilding', { gold: n.gold, ref: n.ref }, (p) => s.players[p].buildings.length > 0); },
  storm(s) {
    const hit: number[] = [];
    for (const p of turnOrder(s)) {
      const pl = s.players[p];
      if (inEurope(s, pl.ship)) continue;
      if (total(pl.hold)) for (const r of RESOURCES) pl.hold[r] = 0; else hit.push(p);
    }
    push(s, ...hit.map((p) => ({ t: 'damage', p, amount: 1 })));
  },
  fewestColoniesGain(s, n) {
    const p = fewest(s, (x) => coloniesOf(s, x).length);
    for (const r of RESOURCES) s.players[p].wh[r] += n.wh[r] ?? 0;
  },
  raidAll(s) { push(s, ...s.settlements.filter((x) => x.alive).map((x) => ({ t: 'raid', n: x.n }))); },
  breakAlliances(s, n) { for (const x of s.settlements) if (x.alive && x.ally !== null && combinedHostility(s, x.ally, x.tribe) >= n.min) x.ally = null; },
  nativeGifts(s, n) {
    for (const x of s.settlements) if (x.alive) {
      const col = nearestColony(s, x.cell);
      if (!col) continue;
      const h = combinedHostility(s, col.owner, x.tribe);
      if (h >= n.min && h <= n.max) s.players[col.owner].wh.food += n.food;
    }
  },
  winter(s, n) {
    for (const p of turnOrder(s)) for (const _ of coloniesOf(s, p)) {
      const pl = s.players[p];
      if (pl.wh.food >= n.food) pl.wh.food -= n.food;
      else loseTopCard(s, p);
    }
  },
  cheapBuild(s, n) { eachPlayer(s, 'cheapBuild', { options: n.options, timber: n.timber }); },
  witchTrial(s, n) {
    const p = most(s, (x) => s.players[x].crosses);
    if (p !== null) ask(s, { kind: 'accuse', player: p, crosses: n.crosses });
  },
  payOrRemove(s, n) {
    for (const p of [...turnOrder(s)].reverse()) {
      const cards = collection(s.players[p]).filter((c) => (n.which === 'slave' ? baseOf(s, c) === 'slave' : isMilitary(s, c))).sort();
      push(s, ...cards.map((card) => ({ t: 'payOrRemove', p, card, gold: n.gold, ref: n.refEach })));
    }
  },
  sacredForest(s, n) {
    const p = most(s, (x) => s.players[x].wh.timber) ?? most(s, (x) => s.players[x].buildings.length);
    if (p !== null) ask(s, { kind: 'sacredForest', player: p, goods: n.goods, gold: n.gold, hostility: n.hostility });
  },
  boycott(s, n) { eachPlayer(s, 'boycott', { res: n.res, gold: n.goldPerUnit, ref: n.refPerUnit }, (p) => s.players[p].wh[n.res] > 0); },
  blockade(s, n) { eachPlayer(s, 'blockade', { gold: n.gold, ref: n.refEach }, (p) => !inEurope(s, s.players[p].ship)); },
  activate(s, n) { push(s, { t: 'activate', n: n.settlement }); },
};

function loseTopCard(s: State, p: number): string | null {
  if (!canRemove(s, s.players[p])) return null;
  const c = drawCard(s, p);
  if (c) { retire(s, c); log(s, { e: 'removed', p, card: c }); }
  return c;
}

// --- Event phase -------------------------------------------------------------

task('eventPhase', (s) => {
  const id = s.eventDeck.pop() ?? null;
  s.event = id;
  log(s, { e: 'event', id });
  push(s,
    ...(id ? [{ t: 'nodes', nodes: s.def.events[id].do, p: s.first }] : []),
    { t: 'eventDone' }, ...turnOrder(s).map((p) => ({ t: 'overflow', p, from: 'wh' })), { t: 'taxPhase' }, { t: 'roundEnd' });
});
task('eventDone', (s) => { s.event = null; });

// --- Natives: activation and raids ---------------------------------------------

task('activate', (s, t) => {
  const x = s.settlements[t.n - 1], set = s.def.settings.activation;
  if (!x?.alive) return;
  const col = nearestColony(s, x.cell);
  if (!col) return;
  const h = combinedHostility(s, col.owner, x.tribe);
  log(s, { e: 'activate', settlement: x.n, p: col.owner, hostility: h });
  if (h <= set.giftMaxHostility) s.players[col.owner].wh.food += set.gift;
  else if (h >= set.raidMinHostility) push(s, { t: 'raid', n: x.n });
});
task('raid', (s, t) => {
  const x = s.settlements[t.n - 1];
  if (!x?.alive) return;
  const col = nearestColony(s, x.cell);
  if (!col || combinedHostility(s, col.owner, x.tribe) < s.def.settings.activation.raidMinHostility) return;
  const pl = s.players[col.owner];
  log(s, { e: 'raid', settlement: x.n, p: col.owner });
  if (pl.buildings.includes('fort')) return;
  if (total(pl.wh) || pl.buildings.length) ask(s, { kind: 'raid', player: col.owner });
});
decision('raid', {
  options(s, d) {
    const pl = s.players[d.player], need = s.def.settings.raid.resources;
    const b = pl.buildings.filter((x) => !pl.buildings.some((y) => building(s, y).requires === x)).map((x) => ({ c: 'destroy', b: x }));
    return [...(total(pl.wh) >= need || !b.length ? [{ c: 'resources' }] : []), ...b];
  },
  resolve(s, d, c) {
    if (c.c === 'destroy') loseBuilding(s, d.player, c.b);
    else push(s, { t: 'payResource', p: d.player, n: s.def.settings.raid.resources, from: ['wh'], res: RESOURCES });
  },
});

// --- Small decisions -----------------------------------------------------------

decision('colonyWater', {
  options: (s, d) => colonyWater(s, d.player).map((cell) => ({ c: 'cell', cell })),
  resolve(s, d, c) { s.players[d.player].ship = c.cell; },
});
decision('nearestSettlement', {
  options: (_, d) => (d.list as number[]).map((settlement) => ({ c: 'settlement', settlement })),
  resolve(s, d, c) { const t = s.settlements[c.settlement - 1].tribe; setHostility(s, t, s.hostility[t] + d.add); },
});
decision('guide', {
  options: (_, d) => uniq(d.cards as string[]).map((card) => ({ c: 'play', card })),
  resolve(s, d, c) {
    const rest = [...d.cards] as string[];
    removeOne(rest, c.card);
    pile(s, d.deck).x.push(...rest);
    playPoi(s, d.deck, c.card, { p: d.player, cell: d.cell });
  },
});
task('freeBuilding', (s, t) => {
  if (t.options.some((b: string) => !canOwnBuilding(s, t.p, b))) ask(s, { kind: 'freeBuilding', player: t.p, options: t.options });
});
decision('freeBuilding', {
  options: (s, d) => [...(d.options as string[]).filter((b) => !canOwnBuilding(s, d.player, b)).map((b) => ({ c: 'build', b })), { c: 'skip' }],
  resolve(s, d, c) { if (c.c === 'build') addBuilding(s, d.player, c.b); },
});
task('takeFromPier', (s, t) => { if (t.n > 0 && s.pier.length) ask(s, { kind: 'takeFromPier', player: t.p, n: t.n, to: t.to }); });
decision('takeFromPier', {
  options: (s) => s.pier.map((st) => ({ c: 'take', agent: st[0] })),
  resolve(s, d, c) {
    s.players[d.player][d.to as 'discard' | 'hand'].push(takeFromPier(s, s.pier.findIndex((st) => st[0] === c.agent)));
    push(s, { t: 'takeFromPier', p: d.player, n: d.n - 1, to: d.to });
  },
});
decision('freeColony', {
  options(s, d) {
    const out: Choice[] = [];
    for (let cell = 0; cell < s.map.zone.length; cell++) {
      if (s.map.zone[cell] !== 'map' || s.poi[cell] || colonyAt(s, cell) || colonyProblem(s, cell)) continue;
      const t = tokenAt(s, cell);
      if (!t || t.p === d.player) out.push({ c: 'cell', cell });
    }
    return [...out, { c: 'skip' }];
  },
  resolve(s, d, c) { if (c.c === 'cell') foundColony(s, d.player, c.cell); },
});
decision('convertCrosses', {
  options: (s, d) => Array.from({ length: Math.min(d.max as number, s.players[d.player].crosses) + 1 }, (_, n) => ({ c: 'convert', n })),
  resolve(s, d, c) { addCrosses(s, d.player, -c.n); addBells(s, d.player, c.n); },
});
decision('cheapestFather', {
  options(s) {
    const min = Math.min(...s.salon.map((f) => s.def.fathers[f].bells));
    return s.salon.filter((f) => s.def.fathers[f].bells === min).map((father) => ({ c: 'take', father }));
  },
  resolve(s, d, c) { gainFather(s, d.player, c.father); },
});
task('sellOff', (s, t) => {
  if ((t.node.res as Resource[]).some((r) => !t.done.includes(r) && s.players[t.p].wh[r] > 0)) ask(s, { kind: 'sellOff', player: t.p, node: t.node, done: t.done, any: t.any });
  else if (t.any) addRef(s, t.node.refPerSeller ?? 0, 'smuggling');
});
decision('sellOff', {
  options(s, d) {
    const out: Choice[] = [];
    for (const r of (d.node as { res: Resource[] }).res) if (!(d.done as string[]).includes(r)) for (let n = 1; n <= s.players[d.player].wh[r]; n++) out.push({ c: 'sell', r, n });
    return [...out, { c: 'done' }];
  },
  resolve(s, d, c) {
    if (c.c === 'done') { if (d.any) addRef(s, d.node.refPerSeller ?? 0, 'smuggling'); return; }
    s.players[d.player].wh[c.r as Resource] -= c.n;
    addGold(s, d.player, c.n * Math.max(0, s.price[c.r as Resource] + d.node.priceAdd));
    addRef(s, c.n * (d.node.refPerUnit ?? 0), 'smuggling');
    push(s, { t: 'sellOff', p: d.player, node: d.node, done: [...d.done, c.r], any: true });
  },
});
decision('mayTake', {
  always: true,
  options: () => [{ c: 'yes' }, { c: 'no' }],
  resolve(s, d, c) {
    if (c.c === 'no') return;
    addGold(s, d.player, -d.gold);
    s.players[d.player].discard.push(takeCommon(s, d.agent)!);
  },
});
decision('payOrRef', {
  options: (s, d) => [...(s.players[d.player].gold >= (d.gold as number) ? [{ c: 'pay' }] : []), { c: 'refuse' }],
  resolve(s, d, c) {
    if (c.c === 'pay') return addGold(s, d.player, -d.gold);
    addRef(s, d.ref, s.event ?? 'event');
    addBells(s, d.player, d.bells);
  },
});
task('sellAgents', (s, t) => {
  const pl = s.players[t.p];
  if (t.left > 0 && canRemove(s, pl) && pl.deck.length + pl.discard.length > 0) ask(s, { kind: 'sellAgents', player: t.p, node: t.node, left: t.left });
});
decision('sellAgents', {
  options: () => [{ c: 'remove' }, { c: 'stop' }],
  resolve(s, d, c) {
    if (c.c === 'stop') return;
    loseTopCard(s, d.player);
    addGold(s, d.player, d.node.gold);
    addRef(s, d.node.refEach, s.event ?? 'event');
    push(s, { t: 'sellAgents', p: d.player, node: d.node, left: d.left - 1 });
  },
});
task('joint', (s, t) => {
  const i = t._given.length;
  if (i < t.order.length) return ask(s, { kind: 'joint', player: t.order[i], order: t.order, _given: t._given, node: t.node });
  const sum = t._given.reduce((a: number, b: number) => a + b, 0);
  t.order.forEach((p: number, k: number) => addCrosses(s, p, -t._given[k]));
  addRef(s, -Math.min(t.node.max, Math.floor(sum / t.node.per)), 'the_great_awakening');
});
decision('joint', {
  options: (s, d) => Array.from({ length: s.players[d.player].crosses + 1 }, (_, n) => ({ c: 'give', n })),
  resolve(s, d, c) { push(s, { t: 'joint', order: d.order, _given: [...d._given, c.n], node: d.node }); },
});
task('payPerBuilding', (s, t) => ask(s, { kind: 'payPerBuilding', player: t.p, gold: t.gold, ref: t.ref }));
decision('payPerBuilding', {
  options(s, d) {
    const pl = s.players[d.player];
    return Array.from({ length: Math.min(pl.buildings.length, Math.floor(pl.gold / (d.gold as number))) + 1 }, (_, n) => ({ c: 'payFor', n }));
  },
  resolve(s, d, c) {
    addGold(s, d.player, -c.n * d.gold);
    addRef(s, (s.players[d.player].buildings.length - c.n) * d.ref, 'stamp_act');
  },
});
task('cheapBuild', (s, t) => {
  if (s.players[t.p].wh.timber >= t.timber && coloniesOf(s, t.p).length && t.options.some((b: string) => !canOwnBuilding(s, t.p, b)))
    ask(s, { kind: 'cheapBuild', player: t.p, options: t.options, timber: t.timber });
});
decision('cheapBuild', {
  options: (s, d) => [...(d.options as string[]).filter((b) => !canOwnBuilding(s, d.player, b)).map((b) => ({ c: 'build', b })), { c: 'skip' }],
  resolve(s, d, c) { if (c.c === 'build') { s.players[d.player].wh.timber -= d.timber; addBuilding(s, d.player, c.b); } },
});
decision('accuse', {
  options: (s) => s.players.map((_, player) => ({ c: 'accuse', player })),
  resolve(s, d, c) {
    const pl = s.players[c.player], learned = uniq(collection(pl).filter((x) => agent(s, x).edu === 2));
    if (!learned.length) addCrosses(s, c.player, d.crosses);
    else if (canRemove(s, pl)) ask(s, { kind: 'loseLearned', player: c.player });
  },
});
decision('loseLearned', {
  options: (s, d) => uniq(collection(s.players[d.player]).filter((x) => agent(s, x).edu === 2)).map((card) => ({ c: 'remove', card })),
  resolve(s, d, c) { removeAgent(s, d.player, c.card); },
});
task('payOrRemove', (s, t) => {
  const pl = s.players[t.p];
  if (pl.gold >= t.gold || canRemove(s, pl)) ask(s, { kind: 'payOrRemove', player: t.p, card: t.card, gold: t.gold, ref: t.ref });
});
decision('payOrRemove', {
  options: (s, d) => [...(s.players[d.player].gold >= (d.gold as number) ? [{ c: 'pay' }] : []), ...(canRemove(s, s.players[d.player]) ? [{ c: 'remove' }] : [])],
  resolve(s, d, c) {
    if (c.c === 'pay') return addGold(s, d.player, -d.gold);
    if (removeAgent(s, d.player, d.card)) addRef(s, d.ref, s.event ?? 'event');
  },
});
decision('sacredForest', {
  options(s, d) {
    const pl = s.players[d.player];
    return [...(pl.wh.goods >= (d.goods as number) ? [{ c: 'goods' }] : []), ...(pl.gold >= (d.gold as number) ? [{ c: 'gold' }] : []), { c: 'anger' }];
  },
  resolve(s, d, c) {
    if (c.c === 'goods') s.players[d.player].wh.goods -= d.goods;
    else if (c.c === 'gold') addGold(s, d.player, -d.gold);
    else for (const t of uniq(s.settlements.filter((x) => x.alive).map((x) => x.tribe))) setHostility(s, t, s.hostility[t] + d.hostility);
  },
});
task('boycott', (s, t) => ask(s, { kind: 'boycott', player: t.p, res: t.res, gold: t.gold, ref: t.ref }));
decision('boycott', {
  options: (s, d) => [...(s.players[d.player].gold >= (d.gold as number) * s.players[d.player].wh[d.res as Resource] ? [{ c: 'pay' }] : []), { c: 'boycott' }],
  resolve(s, d, c) {
    const pl = s.players[d.player], n = pl.wh[d.res as Resource];
    if (c.c === 'pay') return addGold(s, d.player, -d.gold * n);
    pl.wh[d.res as Resource] = 0;
    addBells(s, d.player, n);
    addRef(s, n * d.ref, 'the_boston_tea_party');
  },
});
task('blockade', (s, t) => ask(s, { kind: 'blockade', player: t.p, gold: t.gold, ref: t.ref }));
decision('blockade', {
  options: (s, d) => [...(s.players[d.player].gold >= (d.gold as number) ? [{ c: 'pay' }] : []), { c: 'refuse' }],
  resolve(s, d, c) {
    if (c.c === 'pay') return addGold(s, d.player, -d.gold);
    for (const r of RESOURCES) s.players[d.player].hold[r] = 0;
    addRef(s, d.ref, 'pirate_blockade');
    push(s, { t: 'damage', p: d.player, amount: 1 });
  },
});
