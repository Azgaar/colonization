import type { Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Choice, State } from './types.ts';
import { ask, decision, log, push, task } from './core.ts';
import { dice, shuffle } from './rng.ts';
import {
  addBells, addCrosses, addGold, addRef, agent, building, canRemove, cardHas, changePrice, coloniesOf, combinedHostility,
  drawAgent, drawCard, fillPier, fillSalon, gainNative, has, mods, reducePopulation, removeOne, retire, setHostility, stockKinds,
  takeFromPier, total, turnOrder, uniq,
} from './util.ts';
import { adjacent, colonyProblem, shipInEurope } from './map.ts';
import { attackOptions, startAttack } from './combat.ts';
import { buildingYield, cellYields, docksYields, store } from './production.ts';
import { canMove, startMove } from './moves.ts';
import { scorePlayer } from './war.ts';

// --- Round -----------------------------------------------------------------

task('roundStart', (s) => {
  if (s.logging) log(s, { e: 'round', n: s.round, scores: s.players.map((_, p) => scorePlayer(s, p).score), price: { ...s.price }, ref: s.ref, components: components(s) });
  for (const p of turnOrder(s)) {
    s.players[p].passed = false;
    drawTo(s, p, s.def.settings.hand.size);
  }
  s.current = s.first;
  push(s, { t: 'turnLoop' });
});
/** Physical pieces in use, to know how many to print. */
export function components(s: State): Record<string, number> {
  const out: Record<string, number> = { red: s.ref, black: 0, gold: 0, damage: 0, natives: 8 - s.nativesLeft };
  for (const r of RESOURCES) out[r] = s.demand[r];
  for (const pl of s.players) { out.gold += pl.gold; out.damage += pl.damage; for (const r of RESOURCES) out[r] += pl.wh[r] + pl.hold[r]; }
  for (const x of s.settlements) if (x.alive) { out.black += x.pop; out.red += s.hostility[x.tribe]; }
  out.red += out.damage;
  out.black += Object.keys(s.poi).length;
  return out;
}
function drawTo(s: State, p: number, n: number) {
  const pl = s.players[p];
  while (pl.hand.length < n) {
    const c = drawCard(s, p);
    if (!c) return;
    pl.hand.push(c);
  }
}
task('turnLoop', (s) => {
  const n = s.players.length;
  for (let i = 0; i < n; i++) {
    const p = (s.current + i) % n, pl = s.players[p];
    if (pl.passed) continue;
    s.current = p;
    return ask(s, { kind: 'turn', player: p });
  }
  push(s, { t: 'eventPhase' });
});
task('endTurn', (s, t) => {
  const pl = s.players[t.p];
  if (pl.inPlay) { pl.discard.push(pl.inPlay); pl.inPlay = null; }
  s.current = (t.p + 1) % s.players.length;
  push(s, { t: 'turnLoop' });
});
task('taxPhase', (s) => {
  const rate = taxRate(s);
  if (rate > 0) push(s, ...turnOrder(s).map((p) => ({ t: 'tax', p })));
});
export const taxRate = (s: State) => s.def.settings.tax.track[s.round - 1];
task('tax', (s, t) => ask(s, { kind: 'tax', player: t.p }));
decision('tax', {
  options: (s, d) => [...(s.players[d.player].gold >= taxRate(s) ? [{ c: 'pay' }] : []), { c: 'refuse' }],
  resolve(s, d, c) {
    const set = s.def.settings.tax;
    log(s, { e: 'tax', p: d.player, pay: c.c === 'pay', rate: taxRate(s) });
    if (c.c === 'pay') { addGold(s, d.player, -taxRate(s), 'tax'); return addBells(s, d.player, set.payBells, 'tax'); }
    addRef(s, refuseCubes(s), 'tax');
    addBells(s, d.player, set.refuseBells, 'tax');
  },
});
/** With crosses.everyRound, the best cross building each player owns gives its ✝️ without an action. */
export function crossIncome(s: State, p: number): number {
  if (!s.def.settings.crosses.everyRound) return 0;
  return Math.max(0, ...s.players[p].buildings.map((b) => { const w = building(s, b).work; return w?.kind === 'produce' && w.icon === 'crosses' ? w.amount : 0; }));
}
task('roundEnd', (s) => {
  for (const p of turnOrder(s)) { const n = crossIncome(s, p); if (n) addCrosses(s, p, n, 'income'); }
  const { war, rounds, fathers } = s.def.settings;
  if (fathers.rotate && s.salon.length) { s.fatherDiscard.push(s.salon.shift()!); fillSalon(s); }
  const bells = s.players.some((p) => p.bells >= war.bells);
  if (bells || s.round >= rounds.max) return push(s, { t: 'warStart', reason: bells ? 'bells' : 'rounds' });
  s.round++;
  s.first = (s.first + 1) % s.players.length;
  push(s, { t: 'roundStart' });
});
export const year = (s: State) => s.def.settings.rounds.firstYear + (s.round - 1) * s.def.settings.rounds.yearStep;

// --- Turn ------------------------------------------------------------------

export const recruitCost = (s: State) => s.round * s.def.settings.crosses.recruitPerRound;
const hirePrice = (s: State, p: number, card: string, id: string) =>
  Math.max(0, mods(s, p, 'cost', card).filter((m) => m.of === 'hire').reduce((n, m) => n + m.add, agent(s, id).price!));
export const buildPrice = (s: State, p: number, card: string | null, b: string) =>
  Math.max(0, mods(s, p, 'cost', card).filter((m) => m.of === 'build').reduce((n, m) => n + m.add, building(s, b).timber));
export function canOwnBuilding(s: State, p: number, b: string): string | null {
  const pl = s.players[p], def = building(s, b);
  if (has(pl, b)) return 'already built';
  if (s.buildingsLeft[b] <= 0) return 'none left';
  if (pl.buildings.length >= s.def.settings.buildings.max) return 'no free building slot';
  if (def.requires && !has(pl, def.requires)) return `requires ${def.requires}`;
  return null;
}
export function addBuilding(s: State, p: number, b: string) {
  s.players[p].buildings.push(b);
  s.buildingsLeft[b]--;
  log(s, { e: 'build', p, building: b });
  const pl = s.players[p];
  if (s.def.settings.damage.repairOnBuild && building(s, b).work?.kind === 'repair' && pl.damage) { pl.damage = 0; log(s, { e: 'repaired', p }); }
}
/** Cubes a tax refusal adds to the barracks: more in the games with no loyalist. */
export const refuseCubes = (s: State) => { const t = s.def.settings.tax, n = s.players.length; return n === 1 ? t.refuseRefSolo : n === 2 ? t.refuseRefTwo : t.refuseRef; };
export function foundCost(s: State, p: number): { resource: Resource; value: number } | null {
  if (coloniesOf(s, p).length === 0 || (s.players[p].freeFound ?? 0) > 0) return null;
  const alt = mods(s, p, 'foundCost')[0];
  return alt ? { resource: alt.resource, value: alt.value } : s.def.settings.colony.foundCost;
}
export const fatherLimit = (s: State, p: number) => mods(s, p, 'fatherLimit').reduce((n, m) => Math.max(n, m.value), s.def.settings.fathers.max);
export const sellPrice = (s: State, p: number, card: string, r: Resource) => Math.max(0, s.price[r] + mods(s, p, 'sellPrice', card).reduce((n, m) => n + m.add, 0));
const preachCost = (s: State, p: number, tribe: string, card: string) => {
  if (mods(s, p, 'preachFree').length) return 0;
  const n = mods(s, p, 'cost', card).filter((m) => m.of === 'preach').reduce((x, m) => x + m.add, combinedHostility(s, p, tribe));
  return Math.max(s.def.settings.natives.preachMin, 0, n);
};
const allianceMax = (s: State, p: number) => mods(s, p, 'allianceMax').reduce((n, m) => Math.max(n, m.value), s.def.settings.natives.allianceMax);
const nearSettlements = (s: State, p: number) => {
  const pl = s.players[p];
  return s.settlements.filter((x) => x.alive && (adjacent(s, pl.ship, x.cell) || (typeof pl.inf === 'number' && adjacent(s, pl.inf, x.cell))));
};
/** Selling moves the price only after the whole action. */
export function demand(s: State, r: Resource, n: number) {
  const size = s.players.length;
  s.demand[r] += n;
  const steps = Math.floor(s.demand[r] / size);
  s.demand[r] -= steps * size;
  if (steps) changePrice(s, r, -steps);
}

/** Every action and why it is not available, for one card. */
export function actionsFor(s: State, p: number, card: string): { action: string; options: Choice[]; why: string | null }[] {
  const pl = s.players[p], a = agent(s, card), set = s.def.settings;
  const out: { action: string; options: Choice[]; why: string | null }[] = [];
  const add = (action: string, why: string | null, options: Record<string, unknown>[] = [{}]) =>
    out.push({ action, why: why ?? (options.length ? null : 'nothing to choose from'), options: why ? [] : options.map((o) => ({ c: 'play', card, a: action, ...o })) });

  const noColony = coloniesOf(s, p).length ? null : 'needs a colony';
  // Equal results on different cells are one option.
  const once = <T extends { icon: string; total: number }>(list: T[]) => list.filter((y, i) => list.findIndex((x) => x.icon === y.icon && x.total === y.total) === i);
  add('produce', noColony, noColony ? [] : once(cellYields(s, p, card)).map((y) => ({ cell: y.cell, icon: y.icon })));
  add('docks', has(pl, 'docks') || pl.buildings.some((b) => building(s, b).work?.kind === 'ocean') ? noColony : 'needs docks',
    once(docksYields(s, p, card)).map((y) => ({ cell: y.cell })));
  const work = pl.buildings.filter((b) => { const w = building(s, b).work; return w?.kind === 'produce' && !(w.icon === 'crosses' && s.def.settings.crosses.everyRound); });
  const can = work.filter((b) => typeof buildingYield(s, p, card, b) !== 'string');
  const whyWork = work.map((b) => buildingYield(s, p, card, b)).find((x) => typeof x === 'string') as string | undefined;
  add('work', work.length ? (can.length ? null : whyWork!) : 'no producing building', can.map((building_) => ({ building: building_ })));
  // Schooling (DD-75): the agent played goes to school and leaves as any profession the school teaches, from the agent deck, the common discard or the pier.
  // A school takes anyone, criminals and slaves too, and teaches 📖 professions; a university takes agents with 📖 or more and teaches 🎓 ones.
  const schools = pl.buildings.filter((b) => building(s, b).work?.kind === 'teach' && a.edu >= building(s, b).edu);
  // The player chooses where the new agent comes from: the agent deck, the common discard or the pier.
  const from = (x: string) => [...(s.agentDeck.includes(x) ? ['deck'] : []), ...(s.agentDiscard.includes(x) ? ['discard'] : []), ...(s.pier.some((st) => st[0] === x) ? ['pier'] : [])];
  const taught = schools.flatMap((b) => schoolProfessions(s, b).filter((x) => x !== a.base).flatMap((target) => from(target).map((f) => ({ building: b, target, from: f }))));
  add('teach', !pl.buildings.some((b) => building(s, b).work?.kind === 'teach') ? 'needs a school' : !schools.length ? 'not enough education for the university'
    : taught.length ? null : 'no profession left to learn', taught);
  if (cardHas(s, card, 'onlyProduce')) return out;

  add('moveShip', canMove(s, p, 'ship'));
  add('moveInfantry', canMove(s, p, 'infantry'));

  const cols = coloniesOf(s, p).length, cost = foundCost(s, p);
  add('found', cols >= set.colony.max ? 'the limit of colonies is reached'
    : typeof pl.inf !== 'number' ? 'infantry must be on land'
      : colonyProblem(s, pl.inf) ?? (cost && pl.wh[cost.resource] < cost.value ? `needs ${cost.value} ${cost.resource}` : null));

  const atk = attackOptions(s, p, card);
  add('attack', cardHas(s, card, 'combat') ? (atk.length ? null : 'no target in reach') : 'needs an agent with 🗡️', atk.map(({ token, mode, cell }) => ({ token, mode, cell })));

  const eu = shipInEurope(s, p) ? null : 'the ship must be in Europe';
  add('trade', eu ?? (total(pl.hold) ? null : 'the hold is empty'));
  add('hire', eu ?? (s.pier.length ? null : 'the pier is empty'));
  add('propaganda', (s.def.settings.propaganda.anywhere ? null : eu) ?? (pl.fathers.length >= fatherLimit(s, p) ? 'the limit of Founding Fathers is reached'
    : s.salon.some((f) => s.def.fathers[f].bells <= pl.bells) ? null : 'not enough bells'));
  add('repair', eu ?? (pl.damage ? null : 'the ship is not damaged'));
  const yard = pl.buildings.find((b) => building(s, b).work?.kind === 'repair');
  add('shipyard', !yard ? 'needs a shipyard' : a.edu < building(s, yard).edu ? 'not enough education' : !pl.damage ? 'the ship is not damaged'
    : coloniesOf(s, p).some((c) => adjacent(s, c.cell, pl.ship)) ? null : 'the ship must be next to an own colony');

  const buildable = Object.keys(s.def.buildings).filter((b) => !canOwnBuilding(s, p, b) && buildPrice(s, p, card, b) <= pl.wh.timber);
  add('build', noColony ?? (buildable.length ? null : 'nothing affordable to build'), buildable.map((b) => ({ building: b })));

  // A custom house sells one resource (kind sell), or like the Europe market, anything in the warehouse (kind market, DD-100).
  const customs = pl.buildings.find((b) => ['sell', 'market'].includes(building(s, b).work?.kind ?? ''));
  const market = customs && building(s, customs).work?.kind === 'market';
  add('customs', !customs ? 'needs a custom house' : a.edu < building(s, customs).edu ? 'not enough education' : total(pl.wh) ? null : 'the warehouse is empty', market ? [{}] : stockKinds(pl.wh).map((r) => ({ r })));
  if (cardHas(s, card, 'smuggle')) add('smuggle', noColony ?? (total(pl.wh) ? null : 'the warehouse is empty'), stockKinds(pl.wh).map((r) => ({ r })));

  if (set.crosses.recruitAction) {
    // Crosses spent = agents looked at, at least the round number; looking past the whole deck shows nothing more.
    const min = recruitCost(s), most = Math.min(pl.crosses, s.agentDeck.length + s.agentDiscard.length);
    add('recruit', s.agentDeck.length + s.agentDiscard.length ? (pl.crosses >= min ? null : `needs ${min} crosses`) : 'the deck is empty',
      Array.from({ length: Math.max(0, most - min + 1) }, (_, i) => ({ n: min + i })));
  }
  add('supply', noColony ?? (pl.wh.food < 1 ? 'needs 1 food' : pl.deck.length + pl.discard.length ? null : 'no card to draw'));
  const others = uniq(pl.hand.filter((_, i) => i !== pl.hand.indexOf(card)));
  add('exchange', null, others.map((other) => ({ other })));

  const near = nearSettlements(s, p);
  const natives = (f: (x: (typeof near)[number]) => boolean) => near.filter(f).map((x) => ({ settlement: x.n }));
  const none = near.length ? null : 'no settlement next to a token';
  // A gift costs 1 goods, or 1 resource of any kind (natives.giftResource): then the player picks which.
  const anyGift = s.def.settings.natives.giftResource === 'any';
  add('gift', none ?? (anyGift ? (total(pl.wh) ? null : 'needs 1 resource') : pl.wh.goods ? null : 'needs 1 goods'),
    natives((x) => s.hostility[x.tribe] > 0).flatMap((o) => (anyGift ? stockKinds(pl.wh).map((r) => ({ ...o, r })) : [o])));
  add('preach', none ?? (s.nativesLeft ? null : 'no native agents left'), natives((x) => preachCost(s, p, x.tribe, card) <= pl.crosses));
  add('alliance', none ?? (a.edu === 2 ? null : 'needs higher education'),
    natives((x) => x.ally === null && combinedHostility(s, p, x.tribe) <= allianceMax(s, p)));
  return out;
}

decision('turn', {
  always: true,
  options(s, d) {
    const pl = s.players[d.player];
    // T-3: without cards there is nothing but to pass.
    if (!pl.hand.length) return [{ c: 'pass' }];
    const out: Choice[] = uniq(pl.hand).flatMap((card) => actionsFor(s, d.player, card).flatMap((x) => x.options));
    if (!s.def.settings.crosses.recruitAction && pl.crosses >= recruitCost(s) && s.agentDeck.length + s.agentDiscard.length > 0) out.push({ c: 'recruit' });
    out.push({ c: 'pass' });
    return out;
  },
  resolve(s, d, c) {
    const p = d.player as number, pl = s.players[p];
    if (c.c === 'pass') {
      pl.passed = true;
      log(s, pl.hand.length ? { e: 'pass', p, n: pl.hand.length } : { e: 'pass', p, forced: true });
      return push(s, { t: 'discardHand', p }, { t: 'endTurn', p });
    }
    if (c.c === 'recruit') {
      addCrosses(s, p, -recruitCost(s), 'recruit');
      return push(s, { t: 'recruit', p }, { t: 'turnLoop' });
    }
    removeOne(pl.hand, c.card);
    pl.inPlay = c.card;
    log(s, { e: 'play', p, ...c });
    push(s, { t: 'endTurn', p });
    actions[c.a as string](s, p, c);
  },
});

/** The professions a school building teaches: every common agent of its level (work.maxEdu), never a nation's or a native. */
export const schoolProfessions = (s: State, b: string) => {
  const w = building(s, b).work;
  return w?.kind === 'teach' ? Object.values(s.def.agents).filter((x) => x.kind === 'common' && !x.unique && x.edu === w.maxEdu).map((x) => x.id) : [];
};

const actions: Record<string, (s: State, p: number, c: any) => void> = {
  produce(s, p, c) { store(s, p, c.icon, cellYields(s, p, c.card).find((y) => y.cell === c.cell && y.icon === c.icon)!.total); },
  docks(s, p, c) { store(s, p, 'food', docksYields(s, p, c.card).find((y) => y.cell === c.cell)!.total); },
  work(s, p, c) {
    const y = buildingYield(s, p, c.card, c.building), w = building(s, c.building).work!;
    if (typeof y === 'string' || w.kind !== 'produce') throw new Error('unreachable');
    if (w.consumes) s.players[p].wh[w.consumes.res] -= w.consumes.amount;
    store(s, p, w.icon, y.total);
  },
  moveShip: (s, p, c) => startMove(s, p, 'ship', c.card),
  moveInfantry: (s, p, c) => startMove(s, p, 'infantry', c.card),
  found(s, p) {
    const pl = s.players[p], cost = foundCost(s, p);
    if (cost) pl.wh[cost.resource] -= cost.value;
    else if (pl.freeFound && coloniesOf(s, p).length) pl.freeFound--;
    foundColony(s, p, s.players[p].inf as number);
  },
  attack: (s, p, c) => startAttack(s, p, c),
  trade: (s, p, c) => push(s, { t: 'trade', p, card: c.card, done: [], sold: {} }),
  hire: (s, p, c) => push(s, { t: 'hire', p, card: c.card, bought: [] }),
  propaganda: (s, p) => push(s, { t: 'propaganda', p, n: 0 }),
  repair(s, p) { s.players[p].damage--; },
  shipyard(s, p) { s.players[p].damage = 0; },
  build(s, p, c) { s.players[p].wh.timber -= buildPrice(s, p, c.card, c.building); addBuilding(s, p, c.building); },
  teach(s, p, c) {
    // The agent played leaves for good; the new one comes from where the player chose. A searched agent deck is shuffled.
    const pl = s.players[p];
    retire(s, pl.inPlay!);
    pl.inPlay = null;
    if (c.from === 'pier') pl.discard.push(takeFromPier(s, s.pier.findIndex((st) => st[0] === c.target)));
    else {
      const pile = c.from === 'deck' ? s.agentDeck : s.agentDiscard;
      pl.discard.push(pile.splice(pile.lastIndexOf(c.target), 1)[0]!);
      if (c.from === 'deck') s.agentDeck = shuffle(s, s.agentDeck);
    }
  },
  customs(s, p, c) {
    if (c.r === undefined) return push(s, { t: 'trade', p, card: c.card, done: [], sold: {}, from: 'wh' });
    // Up to the building's amount of the resource chosen, each at the price of the moment.
    const w = s.players[p].buildings.map((b) => building(s, b).work).find((x) => x?.kind === 'sell');
    const n = Math.min(w?.kind === 'sell' ? w.amount : 1, s.players[p].wh[c.r as Resource]);
    for (let i = 0; i < n; i++) {
      s.players[p].wh[c.r as Resource]--;
      addGold(s, p, sellPrice(s, p, c.card, c.r), 'customs');
      demand(s, c.r, 1);
    }
  },
  smuggle(s, p, c) {
    s.players[p].wh[c.r as Resource]--;
    addGold(s, p, Math.max(0, s.price[c.r as Resource] + mods(s, p, 'smuggle', c.card).reduce((n, m) => n + m.add, 0)), 'smuggle');
  },
  supply(s, p) {
    s.players[p].wh.food--;
    const x = drawCard(s, p);
    if (x) s.players[p].hand.push(x);
  },
  exchange(s, p, c) {
    const pl = s.players[p];
    removeOne(pl.hand, c.other);
    pl.discard.push(c.other, pl.inPlay!);
    pl.inPlay = null;
    const x = drawCard(s, p);
    if (x) pl.hand.push(x);
  },
  gift(s, p, c) {
    const x = s.settlements[c.settlement - 1], set = s.def.settings;
    const r = (c.r ?? 'goods') as Resource;
    s.players[p].wh[r]--;
    // By price (DD-101): hostility falls by the resource's Europe price, so goods calm more than food. Otherwise the fixed part and the dice.
    const hits = set.natives.giftByPrice ? 0 : dice(s, set.natives.giftDice).filter((d) => set.combat.successFaces.includes(d)).length;
    setHostility(s, x.tribe, s.hostility[x.tribe] - (set.natives.giftByPrice ? s.price[r] : set.natives.giftBase) - hits);
    log(s, { e: 'gift', p, settlement: x.n, hits });
  },
  preach(s, p, c) {
    const x = s.settlements[c.settlement - 1];
    addCrosses(s, p, -preachCost(s, p, x.tribe, c.card), 'preach');
    gainNative(s, p);
    if (!mods(s, p, 'preachCalm').length) setHostility(s, x.tribe, s.hostility[x.tribe] + 1);
    reducePopulation(s, x, 1);
  },
  recruit(s, p, c) {
    addCrosses(s, p, -c.n, 'recruit');
    push(s, { t: 'recruit', p, n: c.n });
  },
  alliance(s, p, c) { s.settlements[c.settlement - 1].ally = p; log(s, { e: 'alliance', p, settlement: c.settlement }); },
};

export function foundColony(s: State, p: number, cell: number) {
  s.colonies.push({ cell, owner: p });
  log(s, { e: 'found', p, cell });
}

// --- Follow-ups --------------------------------------------------------------

task('discardHand', (s, t) => { if (s.players[t.p].hand.length) ask(s, { kind: 'discardHand', player: t.p }); });
decision('discardHand', {
  options: (s, d) => [...uniq(s.players[d.player].hand).filter((c) => !d.last || c >= (d.last as string)).map((card) => ({ c: 'discard', card })), { c: 'keep' }],
  resolve(s, d, c) {
    if (c.c === 'keep') return;
    const pl = s.players[d.player];
    removeOne(pl.hand, c.card);
    pl.discard.push(c.card);
    if (pl.hand.length) ask(s, { ...d, last: c.card });
  },
});

task('trade', (s, t) => {
  const from = t.from ?? 'hold';
  if (stockKinds(s.players[t.p][from as 'hold' | 'wh']).some((r) => !t.done.includes(r))) ask(s, { kind: 'trade', player: t.p, card: t.card, done: t.done, sold: t.sold, from });
  else finishTrade(s, t.sold);
});
function finishTrade(s: State, sold: Partial<Record<Resource, number>>) { for (const [r, n] of Object.entries(sold)) demand(s, r as Resource, n!); }
decision('trade', {
  options(s, d) {
    // The Europe market sells from the hold; a custom house (DD-100) from the warehouse.
    const hold = s.players[d.player][(d.from ?? 'hold') as 'hold' | 'wh'];
    const out: Choice[] = [];
    for (const r of stockKinds(hold)) if (!(d.done as string[]).includes(r)) for (let n = 1; n <= hold[r]; n++) out.push({ c: 'sell', r, n });
    return [...out, { c: 'done' }];
  },
  resolve(s, d, c) {
    if (c.c === 'done') return finishTrade(s, d.sold);
    const r = c.r as Resource;
    s.players[d.player][(d.from ?? 'hold') as 'hold' | 'wh'][r] -= c.n;
    addGold(s, d.player, c.n * sellPrice(s, d.player, d.card, r), d.from === 'wh' ? 'customs' : 'trade');
    log(s, { e: 'sell', p: d.player, r, n: c.n, price: sellPrice(s, d.player, d.card, r) });
    push(s, { t: 'trade', p: d.player, card: d.card, done: [...d.done, r], sold: { ...d.sold, [r]: c.n }, from: d.from });
  },
});

task('hire', (s, t) => ask(s, { kind: 'hire', player: t.p, card: t.card, bought: t.bought }));
decision('hire', {
  always: true,
  options(s, d) {
    const p = d.player, bought = d.bought as string[];
    const out: Choice[] = [];
    for (const st of s.pier) if (!bought.includes(st[0]) && hirePrice(s, p, d.card as string, st[0]) <= s.players[p].gold) out.push({ c: 'buy', agent: st[0] });
    if (!bought.length) out.push({ c: 'refresh' });
    else out.push({ c: 'done' });
    return out;
  },
  resolve(s, d, c) {
    if (c.c === 'done') return;
    if (c.c === 'refresh') return refreshPier(s, () => true);
    addGold(s, d.player, -hirePrice(s, d.player, d.card, c.agent), 'hire');
    s.players[d.player].discard.push(takeFromPier(s, s.pier.findIndex((st) => st[0] === c.agent)));
    log(s, { e: 'hire', p: d.player, agent: c.agent });
    const bought = [...d.bought, c.agent];
    if (bought.length < s.def.settings.hire.max) push(s, { t: 'hire', p: d.player, card: d.card, bought });
  },
});
export function refreshPier(s: State, which: (card: string) => boolean) {
  const gone = s.pier.filter((st) => which(st[0]));
  s.pier = s.pier.filter((st) => !which(st[0]));
  fillPier(s);
  s.agentDiscard.push(...gone.flat());
  fillPier(s);
}

task('propaganda', (s, t) => {
  if (s.players[t.p].fathers.length < fatherLimit(s, t.p) && s.salon.some((f) => s.def.fathers[f].bells <= s.players[t.p].bells))
    ask(s, { kind: 'propaganda', player: t.p, n: t.n });
  else fillSalon(s);
});
decision('propaganda', {
  always: true,
  options: (s, d) => [...s.salon.filter((f) => s.def.fathers[f].bells <= s.players[d.player].bells).map((father) => ({ c: 'take', father })), ...((d.n as number) > 0 ? [{ c: 'done' }] : [])],
  resolve(s, d, c) {
    if (c.c === 'done') return fillSalon(s);
    if (!s.def.settings.fathers.keepBells) addBells(s, d.player, -s.def.fathers[c.father].bells, 'fathers');
    push(s, d.n + 1 < s.def.settings.propaganda.maxFathers ? { t: 'propaganda', p: d.player, n: d.n + 1 } : { t: 'fillSalon' });
    gainFather(s, d.player, c.father);
  },
});
task('fillSalon', (s) => fillSalon(s));
export function gainFather(s: State, p: number, f: string) {
  removeOne(s.salon, f);
  s.players[p].fathers.push(f);
  log(s, { e: 'father', p, father: f });
  push(s, { t: 'nodes', nodes: s.def.fathers[f].onGain, p });
}

task('recruit', (s, t) => {
  // As an action (recruitAction), the crosses spent are the cards looked at, and Roger Williams takes 2 of them; otherwise one look, or his 3.
  const look = t.n ?? mods(s, t.p, 'recruitLook').reduce((n, m) => Math.max(n, m.value), 1);
  // A second pick carries what is left to take (t.take); Roger Williams' 2 is counted only when the recruiting starts.
  const take = t.take ?? (t.n ? mods(s, t.p, 'recruitTake').reduce((n, m) => Math.max(n, m.value), 1) : 1);
  const cards: string[] = t.cards ?? [];
  if (!t.cards) while (cards.length < look) { const c = drawAgent(s); if (!c) break; cards.push(c); }
  if (cards.length) ask(s, { kind: 'recruit', player: t.p, cards, take, action: !!t.n });
});
decision('recruit', {
  always: true,
  options: (_, d) => {
    const cards = d.cards as string[];
    return [...uniq(cards).map((card) => ({ c: 'take', card })), ...(d.action ? [] : [{ c: 'top' }]), { c: 'bottom' }];
  },
  resolve(s, d, c) {
    const cards = [...d.cards] as string[];
    if (c.c === 'take') { removeOne(cards, c.card); s.players[d.player].discard.push(c.card); log(s, { e: 'recruit', p: d.player, agent: c.card }); }
    if (c.c === 'take' && d.action && d.take > 1 && cards.length) return push(s, { t: 'recruit', p: d.player, n: cards.length, cards, take: d.take - 1 });
    // The first card looked at was on top. As an action, the rest always go to the bottom.
    if (c.c === 'bottom' || d.action) s.agentDeck.unshift(...cards.reverse());
    else s.agentDeck.push(...cards.reverse());
  },
});

/** Remove a card from anywhere in a player's collection, if the minimum allows. */
export function removeAgent(s: State, p: number, card: string): boolean {
  const pl = s.players[p];
  if (!canRemove(s, pl)) return false;
  for (const z of [pl.discard, pl.deck, pl.hand]) { const i = z.indexOf(card); if (i >= 0) { z.splice(i, 1); retire(s, card); log(s, { e: 'removed', p, card }); return true; } }
  return false;
}
