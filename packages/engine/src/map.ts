import type { GameDef } from '@col/data';
import type { MapInfo, State, Zone } from './types.ts';
import { log } from './core.ts';
import { addGold, addHold, colonyAt, mods, settlementAt } from './util.ts';

export function buildMap(def: GameDef, frags: number[]): MapInfo {
  const { map, ring } = def.settings;
  const edge = ring.openSea + ring.europe, inner = map.size * 3, width = inner + 2 * edge, n = width * width;
  const m: MapInfo = { width, zone: [], frag: [], terrain: [], bonus: [], poi: [], neighbours: [] };
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / width), c = i % width, d = Math.min(r, c, width - 1 - r, width - 1 - c);
    const zone: Zone = d < ring.europe ? 'europe' : d < edge ? 'sea' : 'map';
    m.zone.push(zone);
    const mr = r - edge, mc = c - edge;
    const f = zone === 'map' ? Math.floor(mr / 3) * map.size + Math.floor(mc / 3) : -1;
    m.frag.push(f);
    const cell = f >= 0 ? def.tiles[frags[f]].cells[(mr % 3) * 3 + (mc % 3)] : null;
    m.terrain.push(zone === 'map' ? cell!.terrain : 'ocean');
    m.bonus.push(cell?.bonus ?? null);
    m.poi.push(cell?.poi ?? null);
    const nb: number[] = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++)
      if ((a || b) && r + a >= 0 && r + a < width && c + b >= 0 && c + b < width) nb.push((r + a) * width + c + b);
    m.neighbours.push(nb);
  }
  return m;
}

export const nb = (s: State, cell: number) => s.map.neighbours[cell];
export const adjacent = (s: State, a: number, b: number) => s.map.neighbours[a].includes(b);
export function distance(s: State, a: number, b: number) {
  const w = s.map.width;
  return Math.max(Math.abs(Math.floor(a / w) - Math.floor(b / w)), Math.abs((a % w) - (b % w)));
}
export const isOpen = (s: State, c: number) => s.map.frag[c] < 0 || s.revealed[s.map.frag[c]];
export const isWater = (s: State, c: number) => isOpen(s, c) && s.map.terrain[c] === 'ocean';
export const isLand = (s: State, c: number) => isOpen(s, c) && s.map.terrain[c] !== 'ocean';
export const inEurope = (s: State, c: number) => s.map.zone[c] === 'europe';

export function tokenAt(s: State, c: number): { p: number; kind: 'ship' | 'infantry' } | null {
  for (let p = 0; p < s.players.length; p++) {
    if (s.players[p].ship === c) return { p, kind: 'ship' };
    if (s.players[p].inf === c) return { p, kind: 'infantry' };
  }
  return null;
}
export const canShipEnter = (s: State, c: number) => isWater(s, c) && !tokenAt(s, c);
export function canInfantryEnter(s: State, p: number, c: number) {
  if (!isLand(s, c) || tokenAt(s, c) || settlementAt(s, c)) return false;
  const col = colonyAt(s, c);
  return !col || col.owner === p;
}
/** Movement points to enter, given those left. Null if it cannot be entered. */
export function enterCost(s: State, c: number, left: number): number | null {
  const mv = s.def.terrain[s.map.terrain[c]!].move;
  if (mv === 'all') return left >= 1 ? left : null;
  return mv <= left ? mv : null;
}

/** Closed fragments a token on this cell may reveal. */
export function explorable(s: State, c: number): number[] {
  const out = new Set<number>();
  const size = s.def.settings.map.size, f = s.map.frag[c];
  if (f < 0) { for (const x of nb(s, c)) { const g = s.map.frag[x]; if (g >= 0 && !s.revealed[g]) out.add(g); } }
  else {
    const r = Math.floor(f / size), k = f % size;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if ((!a && !b) || (a && b && !s.def.settings.explore.diagonal)) continue;
      const x = r + a, y = k + b;
      if (x >= 0 && y >= 0 && x < size && y < size && !s.revealed[x * size + y]) out.add(x * size + y);
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function fragCells(s: State, f: number): number[] {
  const out: number[] = [];
  s.map.frag.forEach((x, i) => { if (x === f) out.push(i); });
  return out;
}

export function reveal(s: State, f: number, p: number) {
  if (s.revealed[f]) return;
  s.revealed[f] = true;
  log(s, { e: 'reveal', p, frag: f });
  const cells = fragCells(s, f);
  for (const c of cells) {
    const poi = s.map.poi[c];
    if (poi === 'ruin' || poi === 'wreck') s.poi[c] = poi;
    else if (poi === 'village') placeSettlement(s, c);
  }
  for (const m of mods(s, p, 'onReveal')) {
    if (m.ifLand && cells.every((c) => s.map.terrain[c] === 'ocean')) continue;
    if (m.gold) addGold(s, p, m.gold, 'explore');
    for (const [r, n] of Object.entries(m.hold ?? {})) addHold(s, p, r as 'crops', n!);
  }
}

function placeSettlement(s: State, cell: number) {
  if (s.settlements.length >= s.def.settings.natives.maxSettlements) return;
  let i = s.tribeDeck.length - 1;
  while (i >= 0 && s.def.tribes[s.tribeDeck[i]].terrain !== s.map.terrain[cell]) i--;
  if (i < 0) return;
  const tribe = s.tribeDeck.splice(i, 1)[0];
  const t = s.def.tribes[tribe];
  if (!(tribe in s.hostility)) s.hostility[tribe] = t.hostility;
  s.settlements.push({ n: s.settlements.length + 1, cell, tribe, pop: t.population, ally: null, alive: true });
  log(s, { e: 'settlement', cell, tribe, n: s.settlements.length });
}

/** Adjacent ocean that connects through revealed water to Europe. */
export function hasSeaPassage(s: State, cell: number): boolean {
  const seen = new Set<number>();
  const todo = nb(s, cell).filter((c) => isWater(s, c));
  todo.forEach((c) => seen.add(c));
  while (todo.length) {
    const c = todo.pop()!;
    if (s.map.zone[c] !== 'map') return true;
    for (const x of nb(s, c)) if (!seen.has(x) && isWater(s, x)) { seen.add(x); todo.push(x); }
  }
  return false;
}
/** Why a colony cannot be founded here, or null if it can. Who stands there is checked by the caller. */
export function colonyProblem(s: State, cell: number): string | null {
  if (s.map.zone[cell] !== 'map' || !isLand(s, cell)) return 'not a revealed land cell';
  const w = s.map.width, e = s.def.settings.ring.openSea + s.def.settings.ring.europe;
  const r = Math.floor(cell / w), c = cell % w;
  if (Math.min(r, c, w - 1 - r, w - 1 - c) === e) return 'on the edge of the map';
  if (settlementAt(s, cell) || colonyAt(s, cell)) return 'the cell is taken';
  for (const x of nb(s, cell)) {
    if (colonyAt(s, x)) return 'next to a colony';
    if (settlementAt(s, x)) return 'next to a settlement';
  }
  if (!hasSeaPassage(s, cell)) return 'no sea passage to Europe';
  return null;
}

/** Size of the land group, stopping once it exceeds `limit`. */
export function islandSize(s: State, cell: number, limit: number): number {
  const seen = new Set([cell]), todo = [cell];
  while (todo.length && seen.size <= limit) {
    const c = todo.pop()!;
    for (const x of nb(s, c)) if (!seen.has(x) && s.map.zone[x] === 'map' && isLand(s, x)) { seen.add(x); todo.push(x); }
  }
  return seen.size;
}

export function nearestEurope(s: State, from: number): number {
  let best = -1, d = Infinity;
  for (let c = 0; c < s.map.zone.length; c++) if (s.map.zone[c] === 'europe' && !tokenAt(s, c)) {
    const x = distance(s, from, c);
    if (x < d) { d = x; best = c; }
  }
  return best;
}
/** Owner's colony nearest to a cell, earliest founded on ties. */
export function nearestColony(s: State, cell: number, owner?: number) {
  let best = null, d = Infinity;
  const order = (p: number) => (p - s.first + s.players.length) % s.players.length;
  for (const c of s.colonies) if (owner === undefined || c.owner === owner) {
    const x = distance(s, cell, c.cell);
    if (x < d || (x === d && best && order(c.owner) < order(best.owner))) { d = x; best = c; }
  }
  return best;
}
export const colonyWater = (s: State, p: number): number[] =>
  [...new Set(s.colonies.filter((c) => c.owner === p).flatMap((c) => nb(s, c.cell)))].filter((c) => canShipEnter(s, c)).sort((a, b) => a - b);
