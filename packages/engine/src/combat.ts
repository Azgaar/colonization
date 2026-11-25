import type { Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { AttackMode, Choice, Combat, Explained, Part, Player, State } from './types.ts';
import { ask, decision, log, push, task } from './core.ts';
import { dice } from './rng.ts';
import {
  addBells, addGold, agent, building, cardHas, colonyAt, drawCard, gainNative, holdFree, mods, reducePopulation, setHostility,
  settlementAt, stockKinds, total, uniq,
} from './util.ts';
import { colonyWater, inEurope, nb, nearestColony, nearestEurope, tokenAt } from './map.ts';

type Kind = 'infantry' | 'ship' | 'best';
const terrainOf = (s: State, c: number) => s.def.terrain[s.map.terrain[c]!];

/** ⚔️ of one card for a token type, where it stands and whom it fights. */
export function cardStrength(s: State, card: string, kind: Kind, vsNative: boolean, cell: number): number {
  const by = { infantry: 0, ship: 0 };
  for (const m of agent(s, card).mods) {
    if (m.mod !== 'combat' || (m.vs === 'native' && !vsNative) || (m.terrain && s.map.terrain[cell] !== m.terrain)) continue;
    by[m.token] += m.add;
  }
  return kind === 'best' ? Math.max(by.infantry, by.ship) : by[kind];
}
export const canBombard = (s: State, p: number, card: string, token: 'ship' | 'infantry') =>
  cardHas(s, card, 'bombard') || (token === 'ship' && mods(s, p, 'bombardAny').length > 0 && cardHas(s, card, 'combat'));

/** Defence of a player's colonies from buildings and Fathers. */
export function buildingDefence(s: State, p: number): Part[] {
  const pl = s.players[p];
  let list = pl.buildings.filter((b) => building(s, b).defence);
  if (s.def.settings.fort.replacesStockade) list = list.filter((b) => !list.some((x) => building(s, x).requires === b));
  const parts = list.map((b) => ({ label: b, value: building(s, b).defence! }));
  for (const m of mods(s, p, 'colonyDefence')) if (list.includes(m.building)) parts.push({ label: `fathers:${m.building}`, value: m.add });
  return parts;
}

export interface AttackOption { card: string; token: 'ship' | 'infantry'; mode: AttackMode; cell: number }
export function attackOptions(s: State, p: number, card: string): AttackOption[] {
  const pl = s.players[p], out: AttackOption[] = [];
  if (!cardHas(s, card, 'combat') || cardHas(s, card, 'onlyProduce')) return out;
  const noNatives = mods(s, p, 'noAttackNatives').length > 0;
  const target = (c: number): Combat['target'] | null => {
    const col = colonyAt(s, c);
    if (col) return col.owner === p ? null : 'colony';
    if (settlementAt(s, c)) return noNatives ? null : 'settlement';
    const t = tokenAt(s, c);
    return t && t.p !== p ? t.kind : null;
  };
  const safe = (c: number) => s.def.settings.europe.safe && inEurope(s, c);
  const vs = (t: Combat['target']) => t === 'settlement';
  // Infantry, on land or aboard.
  if (pl.inf !== 'europe') {
    const from = pl.inf === 'ship' ? pl.ship : pl.inf;
    for (const c of nb(s, from)) {
      const t = target(c);
      if (!t || safe(c)) continue;
      if (t === 'ship') {
        if (pl.inf === 'ship') continue;
        if (canBombard(s, p, card, 'infantry')) out.push({ card, token: 'infantry', mode: 'bombard', cell: c });
        if (cardStrength(s, card, 'infantry', false, from) > 0) out.push({ card, token: 'infantry', mode: 'shore', cell: c });
      } else if (cardStrength(s, card, 'infantry', vs(t), from) > 0) out.push({ card, token: 'infantry', mode: pl.inf === 'ship' ? 'landing' : 'land', cell: c });
    }
  }
  if (pl.damage === 0) for (const c of nb(s, pl.ship)) {
    const t = target(c);
    if (!t || safe(c)) continue;
    if (t === 'ship') { if (cardStrength(s, card, 'ship', false, pl.ship) > 0) out.push({ card, token: 'ship', mode: 'naval', cell: c }); }
    else if (canBombard(s, p, card, 'ship')) out.push({ card, token: 'ship', mode: 'bombard', cell: c });
  }
  return out;
}

export function startAttack(s: State, p: number, o: AttackOption) {
  const pl = s.players[p], col = colonyAt(s, o.cell), st = settlementAt(s, o.cell), tok = tokenAt(s, o.cell);
  const target: Combat['target'] = col ? 'colony' : st ? 'settlement' : tok!.kind;
  s.combat = {
    attacker: p, defender: col ? col.owner : st ? null : tok!.p, token: o.token, mode: o.mode, target, cell: o.cell, card: o.card, a: [], d: [], top: null,
    from: o.token === 'ship' || pl.inf === 'ship' ? pl.ship : (pl.inf as number), bombard: o.mode === 'bombard',
  };
  log(s, { e: 'attack', p, target, mode: o.mode, cell: o.cell, card: o.card });
  push(s, { t: 'commit', side: 'a' }, { t: 'commit', side: 'd' }, { t: 'resolveCombat' });
}

const commitable = (s: State, pl: Player) =>
  uniq(pl.hand).filter((c) => s.def.settings.combat.supportFromCriminalSlave || !cardHas(s, c, 'onlyProduce'));
task('commit', (s, t) => {
  const c = s.combat!, p = t.side === 'a' ? c.attacker : c.defender;
  if (p === null) return;
  ask(s, { kind: 'commit', player: p, side: t.side, top: false });
});
decision('commit', {
  options(s, d) {
    const pl = s.players[d.player];
    const out: Choice[] = commitable(s, pl)
      .filter((c) => !d.last || c >= d.last) // one order per set of cards
      .map((card) => ({ c: 'add', card }));
    if (d.side === 'd' && !d.top && pl.deck.length + pl.discard.length > 0) out.push({ c: 'top' });
    out.push({ c: 'done' });
    return out;
  },
  resolve(s, d, c) {
    const pl = s.players[d.player], mine = s.combat![d.side as 'a' | 'd'];
    if (c.c === 'done') return;
    if (c.c === 'top') { s.combat!.top = drawCard(s, d.player)!; return; }
    pl.hand.splice(pl.hand.indexOf(c.card), 1);
    mine.push(c.card);
    ask(s, { ...d, last: c.card });
  },
});

export function combatStrength(s: State, c: Combat): { attack: Explained; defence: Explained } {
  const set = s.def.settings.combat, native = c.target === 'settlement';
  const a: Part[] = [], d: Part[] = [];
  const kindA: Kind = c.bombard ? 'best' : c.token;
  if (set.countPlayedCard) a.push({ label: 'played card', value: 1 });
  if (c.a.length) a.push({ label: 'cards', value: c.a.length });
  for (const x of [c.card, ...c.a]) { const v = cardStrength(s, x, kindA, native, c.from); if (v) a.push({ label: x, value: v }); }
  for (const m of mods(s, c.attacker, 'battle')) if ((!m.vs || native) && (!m.token || m.token === c.token)) a.push({ label: 'fathers', value: m.add });
  if (c.mode === 'landing') a.push({ label: 'landing', value: set.landingPenalty });
  if (c.mode === 'shore') a.push({ label: 'against ship', value: set.infantryVsShipPenalty });
  const terrain = terrainOf(s, c.cell).defence;
  if (terrain) d.push({ label: 'terrain', value: terrain });
  if (native) d.push({ label: 'population', value: settlementAt(s, c.cell)!.pop });
  else {
    const p = c.defender!, kindD: Kind = c.target === 'ship' ? 'ship' : 'infantry';
    if (c.d.length) d.push({ label: 'cards', value: c.d.length });
    for (const x of c.d) { const v = cardStrength(s, x, kindD, false, c.cell); if (v) d.push({ label: x, value: v }); }
    for (const m of mods(s, p, 'battle')) if (!m.vs && m.role !== 'attack' && (!m.token || m.token === kindD)) d.push({ label: 'fathers', value: m.add });
    if (c.target === 'colony') { d.push({ label: 'colony', value: set.colonyDefence }); d.push(...buildingDefence(s, p)); }
  }
  const ex = (parts: Part[]): Explained => ({ parts, total: parts.reduce((n, x) => n + x.value, 0) });
  return { attack: ex(a), defence: ex(d) };
}

task('resolveCombat', (s) => {
  const c = s.combat!, set = s.def.settings.combat, st = settlementAt(s, c.cell);
  if (c.top) { c.d.push(c.top); c.top = null; }
  const { attack, defence } = combatStrength(s, c);
  const gap = attack.total - defence.total;
  const n = Math.max(0, set.diceCap === null ? gap : Math.min(gap, set.diceCap));
  const rolled = dice(s, n);
  const hits = rolled.filter((x) => set.successFaces.includes(x)).length;
  log(s, { e: 'combat', p: c.attacker, attack, defence, dice: rolled, hits, a: [c.card, ...c.a], d: c.d });
  s.players[c.attacker].discard.push(...c.a);
  if (c.defender !== null) s.players[c.defender].discard.push(...c.d);
  s.combat = null;
  if (st) setHostility(s, st.tribe, s.def.settings.natives.afterAttack);
  if (hits === 0) return;
  addBells(s, c.attacker, set.victoryBells, 'victory');
  const p = c.attacker;
  if (c.target === 'settlement') {
    const loot = s.def.tribes[st!.tribe].loot, f = mods(s, p, 'lootFactor').reduce((n2, m) => Math.max(n2, m.value), 1);
    reducePopulation(s, st!, 1);
    if (!st!.alive) {
      if (loot.gold) addGold(s, p, loot.gold * f, 'loot');
      if (loot.res) s.players[p].wh[loot.res] += loot.amount! * f;
      log(s, { e: 'loot', p, tribe: st!.tribe });
    }
    if (s.nativesLeft > 0) push(s, { t: 'ask', d: { kind: 'takeNative', player: p } });
  } else if (c.target === 'infantry') {
    s.players[c.defender!].inf = 'europe';
    log(s, { e: 'routed', p: c.defender! });
  } else if (c.target === 'ship') push(s, { t: 'shipLost', winner: p, loser: c.defender!, hits, token: c.token });
  else {
    const plunder = Array.from({ length: hits }, () => ({ t: 'plunder', p, from: c.defender! }));
    push(s, ...plunder, ...(c.token === 'infantry' ? [{ t: 'sendHome', p, cell: c.cell }] : []));
  }
});
task('ask', (s, t) => ask(s, t.d));
decision('takeNative', {
  options: () => [{ c: 'yes' }, { c: 'no' }],
  resolve: (s, d, c) => { if (c.c === 'yes') gainNative(s, d.player); },
});
task('sendHome', (s, t) => {
  const home = nearestColony(s, t.cell, t.p);
  s.players[t.p].inf = home ? home.cell : 'europe';
});

// Plundering a colony: one resource or one of the cheapest buildings per success.
const destroyable = (s: State, p: number) => {
  const own = s.players[p].buildings.filter((b) => !s.players[p].buildings.some((x) => building(s, x).requires === b));
  const min = Math.min(...own.map((b) => building(s, b).timber));
  return own.filter((b) => building(s, b).timber === min);
};
export function loseBuilding(s: State, p: number, b: string) {
  const pl = s.players[p];
  pl.buildings.splice(pl.buildings.indexOf(b), 1);
  s.buildingsLeft[b]++;
  log(s, { e: 'buildingLost', p, building: b });
}
task('plunder', (s, t) => {
  const v = s.players[t.from];
  if (total(v.wh) === 0 && v.buildings.length === 0) return;
  ask(s, { kind: 'plunder', player: t.p, from: t.from });
});
decision('plunder', {
  options: (s, d) => [...stockKinds(s.players[d.from as number].wh).map((r) => ({ c: 'take', r })), ...destroyable(s, d.from as number).map((b) => ({ c: 'destroy', b }))],
  resolve(s, d, c) {
    if (c.c === 'destroy') return loseBuilding(s, d.from, c.b);
    s.players[d.from].wh[c.r as Resource]--;
    s.players[d.player].wh[c.r as Resource]++;
    log(s, { e: 'plunder', p: d.player, r: c.r });
  },
});

// Ships.
task('shipLost', (s, t) => {
  push(s, ...(t.token === 'ship' ? [{ t: 'lootHold', p: t.winner, from: t.loser }] : []), { t: 'damage', p: t.loser, amount: t.hits, forced: true });
});
task('lootHold', (s, t) => {
  if (total(s.players[t.from].hold) === 0) return;
  ask(s, { kind: 'lootHold', player: t.p, from: t.from });
});
decision('lootHold', {
  options(s, d) {
    const v = s.players[d.from as number];
    const out: Choice[] = holdFree(s, d.player) > 0 ? stockKinds(v.hold).map((r) => ({ c: 'take', r })) : [];
    return [...out, { c: 'leave' }, { c: 'sink' }];
  },
  resolve(s, d, c) {
    const v = s.players[d.from];
    if (c.c === 'leave') return;
    if (c.c === 'sink') { for (const r of RESOURCES) v.hold[r] = 0; return; }
    v.hold[c.r as Resource]--;
    s.players[d.player].hold[c.r as Resource]++;
    push(s, { t: 'lootHold', p: d.player, from: d.from });
  },
});
/** Ship damage. The ship then goes to a shipyard to be repaired. */
task('damage', (s, t) => {
  const pl = s.players[t.p], set = s.def.settings;
  pl.damage = Math.min(set.hold.maxDamage, pl.damage + t.amount);
  log(s, { e: 'damage', p: t.p, n: t.amount });
  if (s.move && s.move.player === t.p && s.move.token === 'ship') s.move.ended = true;
  push(s, { t: 'overflow', p: t.p, from: 'hold' }, ...(t.forced || set.damage.sendsToEurope ? [{ t: 'refuge', p: t.p }] : []));
});
task('refuge', (s, t) => {
  if (inEurope(s, s.players[t.p].ship)) return;
  if (s.players[t.p].buildings.some((b) => building(s, b).work?.kind === 'repair') && colonyWater(s, t.p).length) ask(s, { kind: 'refuge', player: t.p });
  else shipToEurope(s, t.p);
});
decision('refuge', {
  options: (s, d) => [{ c: 'europe' }, ...colonyWater(s, d.player).map((cell) => ({ c: 'cell', cell }))],
  resolve(s, d, c) { if (c.c === 'europe') shipToEurope(s, d.player); else s.players[d.player].ship = c.cell; },
});
export function shipToEurope(s: State, p: number) {
  const pl = s.players[p];
  if (!inEurope(s, pl.ship)) pl.ship = nearestEurope(s, pl.ship);
  if (s.move && s.move.player === p && s.move.token === 'ship') s.move.ended = true;
  log(s, { e: 'toEurope', p, token: 'ship' });
}
