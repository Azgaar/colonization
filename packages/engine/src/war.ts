import type { Choice, Explained, Part, PlayerResult, Siege, State } from './types.ts';
import { ask, decision, log, push, task } from './core.ts';
import { dice } from './rng.ts';
import { addBells, addGold, coloniesOf, collection, collectionSize, count, isMilitary, mods } from './util.ts';
import { distance, nb } from './map.ts';
import { buildingDefence, cardStrength } from './combat.ts';

const tactic = (s: State) => s.def.tactics[s.war!.tactic].effect;
export const attacked = (x: Siege) => x.cubes > 0 || x.loyalist.length > 0 || x.militia > 0;

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
  return rebelOrder(s).at(-1)!;
}

task('warStart', (s, t) => {
  const set = s.def.settings.war, order = rebelOrder(s), loyalist = findLoyalist(s);
  const id = s.tacticDeck.pop()!;
  s.war = { loyalist, tactic: id, pool: 0, order, sieges: [], spent: {} };
  const eff = tactic(s);
  const hostile = count(s.settlements, (x) => x.alive && s.hostility[x.tribe] >= set.hostileFrom);
  s.war.pool = s.ref + hostile * set.hostileCubes + (eff.t === 'cubes' ? eff.add : 0);
  for (const p of order) if (p !== loyalist) for (const c of coloniesOf(s, p))
    s.war.sieges.push({ owner: p, cell: c.cell, cubes: 0, loyalist: [], militia: 0, army: [], support: 0, betrayed: 0 });
  const n = s.war.sieges.length;
  if (n) for (let i = 0; i < s.war.pool; i++) s.war.sieges[i % n].cubes++;
  log(s, { e: 'war', loyalist, tactic: id, pool: s.war.pool, reason: t.reason });
  const patriots = order.filter((p) => p !== loyalist);
  push(s,
    ...(loyalist !== null ? [
      { t: 'placeCards', p: loyalist, side: 'loyalist', cards: collection(s.players[loyalist]).sort() },
      ...(eff.t === 'militiaPerCross' ? [{ t: 'placeCubes', p: loyalist, side: 'militia', left: s.players[loyalist].crosses * eff.value, i: 0 }] : []),
    ] : []),
    ...patriots.map((p) => ({ t: 'muster', p })),
    ...(loyalist !== null && mods(s, loyalist, 'betray').length ? [{ t: 'betray', p: loyalist }] : []),
    { t: 'sieges' }, { t: 'score', reason: t.reason });
});

const targets = (s: State, p: number, side: 'loyalist' | 'army' | 'militia' | 'support') =>
  s.war!.sieges.flatMap((x, i) => (side === 'loyalist' || side === 'militia' || (x.owner === p && attacked(x)) ? [i] : []));

// Cards are placed one at a time, face down.
task('placeCards', (s, t) => {
  if (!t.cards.length || !targets(s, t.p, t.side).length) return;
  ask(s, { kind: 'placeCards', player: t.p, side: t.side, _cards: t.cards });
});
decision('placeCards', {
  always: true,
  options(s, d) {
    const card = (d._cards as string[])[0];
    return [...targets(s, d.player, d.side as 'army').map((siege): Choice => ({ c: 'place', card, siege })), { c: 'keep', card }];
  },
  resolve(s, d, c) {
    if (c.c === 'place') s.war!.sieges[c.siege as number][d.side as 'loyalist' | 'army'].push(c.card);
    push(s, { t: 'placeCards', p: d.player, side: d.side, cards: d._cards.slice(1) });
  },
});
task('placeCubes', (s, t) => {
  const list = targets(s, t.p, t.side);
  if (t.left <= 0 || t.i >= list.length) return;
  if (t.i === list.length - 1) { s.war!.sieges[list[t.i]][t.side as 'militia' | 'support'] += t.left; return; }
  ask(s, { kind: 'placeCubes', player: t.p, side: t.side, _left: t.left, i: t.i });
});
decision('placeCubes', {
  options: (s, d) => Array.from({ length: (d._left as number) + 1 }, (_, n) => ({ c: 'cubes', siege: targets(s, d.player, d.side as 'militia')[d.i as number], n })),
  resolve(s, d, c) {
    s.war!.sieges[c.siege as number][d.side as 'militia' | 'support'] += c.n;
    push(s, { t: 'placeCubes', p: d.player, side: d.side, left: d._left - c.n, i: d.i + 1 });
  },
});

task('muster', (s, t) => {
  const p = t.p as number;
  s.war!.spent[p] = { bells: 0, gold: 0 };
  if (!targets(s, p, 'army').length) return;
  push(s, { t: 'placeCards', p, side: 'army', cards: collection(s.players[p]).filter((c) => isMilitary(s, c)).sort() }, { t: 'musterMilitia', p });
});
const perBell = (s: State, p: number) => mods(s, p, 'militiaPerBell').reduce((n, m) => Math.max(n, m.value), 1);
const civilians = (s: State, p: number) => count(collection(s.players[p]), (c) => !isMilitary(s, c));
task('musterMilitia', (s, t) => ask(s, { kind: 'militia', player: t.p }));
decision('militia', {
  options(s, d) {
    const max = Math.min(s.players[d.player].bells, Math.ceil(civilians(s, d.player) / perBell(s, d.player)));
    return Array.from({ length: max + 1 }, (_, n) => ({ c: 'militia', n }));
  },
  resolve(s, d, c) {
    const p = d.player as number;
    s.war!.spent[p].bells = c.n;
    const cubes = Math.min(c.n * perBell(s, p), civilians(s, p)) + mods(s, p, 'freeMilitia').reduce((n, m) => n + m.value, 0) +
      count(s.settlements, (x) => x.alive && x.ally === p) * s.def.settings.war.allyCubes;
    ask(s, { kind: 'mercenaries', player: p, _cubes: cubes });
  },
});
decision('mercenaries', {
  options: (s, d) => Array.from({ length: Math.floor(s.players[d.player].gold / s.def.settings.war.mercenaryGold) + 1 }, (_, n) => ({ c: 'mercenaries', n })),
  resolve(s, d, c) {
    s.war!.spent[d.player].gold = c.n * s.def.settings.war.mercenaryGold;
    push(s, { t: 'placeCubes', p: d.player, side: 'support', left: d._cubes + c.n, i: 0 });
  },
});
task('betray', (s, t) => { if (s.war!.sieges.some(attacked)) ask(s, { kind: 'betray', player: t.p }); });
decision('betray', {
  options: (s) => [...s.war!.sieges.flatMap((x, siege) => (attacked(x) ? [{ c: 'betray', siege }] : [])), { c: 'skip' }],
  resolve(s, d, c) { if (c.c === 'betray') s.war!.sieges[c.siege as number].betrayed = mods(s, d.player, 'betray')[0].add; },
});

export function siegeStrength(s: State, x: Siege): { attack: Explained; defence: Explained; ref: number; loyalist: number } {
  const set = s.def.settings.war, eff = tactic(s), a: Part[] = [], d: Part[] = [];
  const cubes = x.cubes * set.refStrength;
  let bonus = 0;
  if (eff.t === 'perCubes') bonus = Math.floor(x.cubes / eff.per) * eff.add;
  if (eff.t === 'perOcean') bonus = Math.floor(count(nb(s, x.cell), (c) => s.map.terrain[c] === 'ocean') / eff.per) * eff.add;
  const cards = x.loyalist.reduce((n, c) => n + cardStrength(s, c, 'best', false, x.cell), 0);
  a.push({ label: 'ref', value: cubes }, { label: 'tactic', value: bonus }, { label: 'loyalist cards', value: cards }, { label: 'loyalist militia', value: x.militia });
  d.push({ label: 'colony', value: set.baseDefence });
  if (eff.t !== 'noTerrain') d.push({ label: 'terrain', value: s.def.terrain[s.map.terrain[x.cell]!].defence });
  if (eff.t !== 'noBuildings') d.push(...buildingDefence(s, x.owner));
  const pl = s.players[x.owner];
  const near = (distance(s, pl.ship, x.cell) <= 1 ? 1 : 0) + (typeof pl.inf === 'number' && distance(s, pl.inf, x.cell) <= 1 ? 1 : 0);
  d.push({ label: 'tokens', value: near * set.tokenBonus });
  d.push({ label: 'army', value: x.army.reduce((n, c) => n + cardStrength(s, c, 'best', false, x.cell), 0) }, { label: 'support', value: x.support });
  if (x.betrayed) d.push({ label: 'benedict_arnold', value: x.betrayed });
  const ex = (parts: Part[]): Explained => ({ total: parts.reduce((n, y) => n + y.value, 0), parts: parts.filter((y) => y.value !== 0) });
  return { attack: ex(a), defence: ex(d), ref: cubes + (set.refStrengthIncludesTactic ? bonus : 0), loyalist: cards + x.militia };
}

task('sieges', (s) => {
  const set = s.def.settings, war = s.war!, eff = tactic(s);
  for (const [p, x] of Object.entries(war.spent)) { addBells(s, Number(p), -x.bells, 'militia'); addGold(s, Number(p), -x.gold, 'mercenaries'); }
  const faces = eff.t === 'successFrom' ? eff.faces : set.combat.successFaces, need = eff.t === 'minSuccesses' ? eff.value : 1;
  for (const x of war.sieges) {
    x.fell = false;
    x.takenBy = null;
    if (!attacked(x)) continue;
    const { attack, defence, ref, loyalist } = siegeStrength(s, x);
    x.attack = attack.total;
    x.defence = defence.total;
    x.dice = dice(s, Math.max(0, Math.min(set.war.diceCap, attack.total - defence.total)));
    x.fell = x.dice.filter((v) => faces.includes(v)).length >= need;
    if (x.fell && war.loyalist !== null && loyalist > 0 && loyalist >= ref) x.takenBy = war.loyalist;
    log(s, { e: 'siege', p: x.owner, cell: x.cell, attack, defence, dice: x.dice, fell: x.fell, takenBy: x.takenBy });
  }
});

export function scorePlayer(s: State, p: number): PlayerResult {
  const set = s.def.settings.score, pl = s.players[p], parts: Part[] = [], war = s.war;
  const loyal = war?.loyalist === p;
  const own = coloniesOf(s, p).length;
  const held = loyal ? own + count(war!.sieges, (x) => x.takenBy === p) : own - (war ? count(war.sieges, (x) => x.owner === p && !!x.fell) : 0);
  const add = (label: string, value: number) => { if (value) parts.push({ label, value }); };
  add('colonies', held * (loyal ? set.loyalistColony : set.patriotColony));
  if (!loyal) {
    add('bells', pl.bells * set.perBell);
    for (const m of mods(s, p, 'pointsPerPatriotColony')) add('simon_bolivar', held * m.value);
  }
  add('agents', Math.floor(collectionSize(pl) / set.agentsPerPoint));
  add('gold', Math.floor(pl.gold / mods(s, p, 'goldPerPoint').reduce((n, m) => Math.min(n, m.value), set.goldPerPoint)));
  add('buildings', pl.buildings.length * set.building);
  add('fathers', pl.fathers.length * set.father);
  for (const m of mods(s, p, 'pointsPerAlliance')) add('alliances', count(s.settlements, (x) => x.alive && x.ally === p) * m.value);
  return { player: p, score: parts.reduce((n, x) => n + x.value, 0), parts, colonies: held, side: loyal ? 'loyalist' : 'patriot', qualifies: held > 0 };
}
task('score', (s, t) => {
  const players = s.players.map((_, p) => scorePlayer(s, p));
  const ok = players.filter((x) => x.qualifies);
  const key = (x: PlayerResult) => [x.score, s.players[x.player].gold, collectionSize(s.players[x.player])];
  const cmp = (a: PlayerResult, b: PlayerResult) => { const x = key(a), y = key(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; };
  ok.sort(cmp);
  s.over = { winners: ok.filter((x) => cmp(ok[0], x) === 0).map((x) => x.player), players, reason: t.reason };
  log(s, { e: 'over', winners: s.over.winners, scores: players.map((x) => x.score) });
});
