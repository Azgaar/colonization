import type { AgentDef, BuildingDef as Building, Mod, Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Colony, Player, Settlement, State, Stock } from './types.ts';
import { shuffle } from './rng.ts';
import { log } from './core.ts';

export const emptyStock = (): Stock => ({ food: 0, timber: 0, crops: 0, goods: 0, silver: 0 });
export const total = (x: Stock) => x.food + x.timber + x.crops + x.goods + x.silver;
export const agent = (s: State, id: string): AgentDef => s.def.agents[id];
export const building = (s: State, id: string): Building => s.def.buildings[id];
export const count = <T>(a: readonly T[], f: (x: T) => boolean) => { let n = 0; for (const x of a) if (f(x)) n++; return n; };
export const uniq = <T>(a: readonly T[]): T[] => [...new Set(a)];
export const removeOne = <T>(a: T[], x: T) => { const i = a.indexOf(x); if (i < 0) throw new Error(`missing ${String(x)}`); a.splice(i, 1); };

/** Player order for a phase, clockwise from the first player. */
export const turnOrder = (s: State, from = s.first) => s.players.map((_, i) => (from + i) % s.players.length);

export const coloniesOf = (s: State, p: number): Colony[] => s.colonies.filter((c) => c.owner === p);
export const colonyAt = (s: State, cell: number) => s.colonies.find((c) => c.cell === cell);
export const settlementAt = (s: State, cell: number): Settlement | undefined => s.settlements.find((x) => x.alive && x.cell === cell);
export const has = (p: Player, b: string) => p.buildings.includes(b);

/** Active modifiers of a player's Fathers, and of the played card if given. */
export function mods<K extends Mod['mod']>(s: State, p: number, kind: K, card?: string | null): Extract<Mod, { mod: K }>[] {
  const out: Extract<Mod, { mod: K }>[] = [];
  if (card) for (const m of s.def.agents[card].mods) if (m.mod === kind) out.push(m as Extract<Mod, { mod: K }>);
  for (const f of s.players[p].fathers) for (const m of s.def.fathers[f].mods) if (m.mod === kind) out.push(m as Extract<Mod, { mod: K }>);
  return out;
}
export const cardHas = (s: State, card: string, kind: Mod['mod']) => s.def.agents[card].mods.some((m) => m.mod === kind);
export const isMilitary = (s: State, card: string) => cardHas(s, card, 'combat');
export const baseOf = (s: State, card: string) => s.def.agents[card].base;

// Agents
export const collection = (p: Player): string[] => [...p.hand, ...p.deck, ...p.discard, ...(p.inPlay ? [p.inPlay] : [])];
export const collectionSize = (p: Player) => p.hand.length + p.deck.length + p.discard.length + (p.inPlay ? 1 : 0);
export const canRemove = (s: State, p: Player) => collectionSize(p) > s.def.settings.collection.min;

export function drawCard(s: State, p: number): string | null {
  const pl = s.players[p];
  if (!pl.deck.length) {
    if (!pl.discard.length) return null;
    pl.deck = shuffle(s, pl.discard);
    pl.discard = [];
  }
  return pl.deck.pop()!;
}
/** A card leaving a player's collection: common to the common discard, native to its pile, nation cards out of the game. */
export function retire(s: State, card: string) {
  const a = agent(s, card);
  if (a.kind === 'common') s.agentDiscard.push(card);
  else if (a.kind === 'native') s.nativesLeft++;
}
export function drawAgent(s: State): string | null {
  if (!s.agentDeck.length) {
    if (!s.agentDiscard.length) return null;
    s.agentDeck = shuffle(s, s.agentDiscard);
    s.agentDiscard = [];
  }
  return s.agentDeck.pop()!;
}
/** Find a given common agent in the deck or the common discard. */
export function takeCommon(s: State, base: string): string | null {
  for (const pile of [s.agentDeck, s.agentDiscard]) {
    const i = pile.lastIndexOf(base);
    if (i >= 0) return pile.splice(i, 1)[0];
  }
  return null;
}
export const commonAvailable = (s: State, base: string) => s.agentDeck.includes(base) || s.agentDiscard.includes(base);

export function fillPier(s: State) {
  while (s.pier.length < s.def.settings.pier.slots) {
    const c = drawAgent(s);
    if (!c) return;
    const at = s.pier.find((st) => st[0] === c);
    if (at) at.push(c); else s.pier.push([c]);
  }
}
export function takeFromPier(s: State, slot: number): string {
  const st = s.pier[slot];
  const c = st.pop()!;
  if (!st.length) s.pier.splice(slot, 1);
  fillPier(s);
  return c;
}
export function fillSalon(s: State) {
  while (s.salon.length < s.def.settings.fathers.salon) {
    if (!s.fatherDeck.length) {
      if (!s.fatherDiscard.length) return;
      s.fatherDeck = shuffle(s, s.fatherDiscard);
      s.fatherDiscard = [];
    }
    s.salon.push(s.fatherDeck.pop()!);
  }
}

// Goods
export const warehouseCap = (s: State, p: number) =>
  s.players[p].buildings.reduce((n, b) => n + (building(s, b).storage ?? 0), s.def.settings.warehouse.base);
export const holdUsed = (pl: Player) => total(pl.hold) + pl.damage + (pl.inf === 'ship' ? 1 : 0);
export const holdFree = (s: State, p: number) => Math.max(0, s.def.settings.hold.size - holdUsed(s.players[p]));
export function addHold(s: State, p: number, r: Resource, n: number): number {
  const k = Math.min(n, holdFree(s, p));
  s.players[p].hold[r] += k;
  return k;
}
/** Every gain and loss is logged with its source, for the test lab. */
export function addBells(s: State, p: number, n: number, why: string) {
  const pl = s.players[p], before = pl.bells;
  pl.bells = Math.max(0, pl.bells + n);
  if (pl.bells !== before) log(s, { e: 'bells', p, n: pl.bells - before, why });
}
export function addCrosses(s: State, p: number, n: number, why: string) {
  const pl = s.players[p], before = pl.crosses;
  pl.crosses = Math.min(s.def.settings.crosses.max, Math.max(0, pl.crosses + n));
  if (pl.crosses !== before) log(s, { e: 'crosses', p, n: pl.crosses - before, why });
}
export function addGold(s: State, p: number, n: number, why: string) {
  const pl = s.players[p], before = pl.gold;
  pl.gold = Math.max(0, pl.gold + n);
  if (pl.gold !== before) log(s, { e: 'gold', p, n: pl.gold - before, why });
}
export function addRef(s: State, n: number, why: string) { if (n) { s.ref = Math.max(0, s.ref + n); log(s, { e: 'ref', n, why }); } }
export function changePrice(s: State, r: Resource, n: number) {
  s.price[r] = Math.min(s.def.settings.market.maxPrice, Math.max(0, s.price[r] + n));
}
export const stockKinds = (x: Stock): Resource[] => RESOURCES.filter((r) => x[r] > 0);

export function combinedHostility(s: State, p: number, tribe: string) {
  return Math.max(0, Math.min(s.def.settings.natives.maxHostility, mods(s, p, 'nativeHostility').reduce((n, m) => n + m.add, s.hostility[tribe])));
}
export function setHostility(s: State, tribe: string, value: number) {
  const v = Math.max(0, Math.min(s.def.settings.natives.maxHostility, value));
  s.hostility[tribe] = v;
  for (const x of s.settlements) if (x.alive && x.tribe === tribe && x.ally !== null && combinedHostility(s, x.ally, tribe) >= s.def.settings.natives.allianceBreak) {
    log(s, { e: 'allianceLost', p: x.ally, settlement: x.n });
    x.ally = null;
  }
}
export function reducePopulation(s: State, x: Settlement, n: number) {
  x.pop = Math.max(0, x.pop - n);
  if (x.pop === 0) { x.alive = false; x.ally = null; log(s, { e: 'settlementGone', settlement: x.n }); }
}
export function gainNative(s: State, p: number): boolean {
  if (s.nativesLeft <= 0) return false;
  s.nativesLeft--;
  s.players[p].discard.push('indian');
  return true;
}
