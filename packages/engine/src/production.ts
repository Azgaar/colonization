import type { Icon } from '@col/data';
import { ICON_RESOURCE } from '@col/data';
import type { Explained, Part, State } from './types.ts';
import { log } from './core.ts';
import { addBells, addCrosses, agent, building, coloniesOf, colonyAt, has, settlementAt } from './util.ts';
import { isOpen, islandSize, nb, tokenAt } from './map.ts';

export interface Yield extends Explained { cell: number; icon: Icon }

const sum = (parts: Part[]): Explained => ({ total: parts.reduce((n, x) => n + x.value, 0), parts });

/** Bonuses of the played card and Fathers for one production. `cell` is null in buildings. */
function bonuses(s: State, p: number, card: string, icon: Icon, cell: number | null): { parts: Part[]; enabled: boolean } {
  const parts: Part[] = [];
  let enabled = false;
  for (const [label, list] of [[card, agent(s, card).mods], ...s.players[p].fathers.map((f) => [f, s.def.fathers[f].mods] as const)] as const)
    for (const m of list) {
      if (m.mod !== 'production' || (m.icons && !m.icons.includes(icon))) continue;
      if (m.terrain && (cell === null || s.map.terrain[cell] !== m.terrain)) continue;
      if (m.island && (cell === null || s.map.terrain[cell] === 'ocean' || islandSize(s, cell, m.island) > m.island)) continue;
      parts.push({ label, value: m.add });
      if (m.enables) enabled = true;
    }
  return { parts, enabled };
}

/** Cells a player can work: own colony cells and their empty neighbours. */
export function workableCells(s: State, p: number): number[] {
  const out = new Set<number>();
  for (const col of coloniesOf(s, p)) {
    out.add(col.cell);
    for (const c of nb(s, col.cell)) {
      if (!isOpen(s, c) || s.map.zone[c] !== 'map' || colonyAt(s, c) || settlementAt(s, c)) continue;
      const t = tokenAt(s, c);
      if (t && (s.def.settings.production.emptyMeans === 'noToken' || t.p !== p)) continue;
      out.add(c);
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function cellYield(s: State, p: number, card: string, cell: number, icon: Icon, docks = 0): Yield | null {
  const terrain = s.def.terrain[s.map.terrain[cell]!];
  const base = terrain.yields.includes(icon), bonus = s.map.bonus[cell] === icon;
  const b = bonuses(s, p, card, icon, cell);
  if (!base && !bonus && !b.enabled) return null;
  const parts: Part[] = [];
  if (base) parts.push({ label: terrain.id, value: 1 });
  if (bonus) parts.push({ label: 'bonus', value: 1 });
  if (docks) parts.push({ label: 'docks', value: docks });
  parts.push(...b.parts);
  return { cell, icon, ...sum(parts) };
}

const CELL_ICONS: Icon[] = ['fish', 'timber', 'crops', 'silver'];
/** Every production a card can make on cells. */
export function cellYields(s: State, p: number, card: string): Yield[] {
  const out: Yield[] = [];
  for (const cell of workableCells(s, p)) for (const icon of CELL_ICONS) {
    const y = cellYield(s, p, card, cell, icon);
    if (y && y.total > 0) out.push(y);
  }
  return out;
}
/** Ocean cells worked through docks. */
export function docksYields(s: State, p: number, card: string): Yield[] {
  const pl = s.players[p];
  const out: Yield[] = [];
  for (const id of pl.buildings) {
    const w = building(s, id).work;
    if (w?.kind !== 'ocean' || agent(s, card).edu < building(s, id).edu) continue;
    for (const cell of workableCells(s, p)) if (s.map.terrain[cell] === 'ocean') {
      const y = cellYield(s, p, card, cell, 'fish', w.add);
      if (y) out.push(y);
    }
  }
  return out;
}
/** Output of working in a producing building, or null with the reason it is not possible. */
export function buildingYield(s: State, p: number, card: string, id: string): Explained | string {
  const b = building(s, id), w = b.work;
  if (!has(s.players[p], id)) return 'not built';
  if (w?.kind !== 'produce') return 'nothing is produced there';
  if (agent(s, card).edu < b.edu) return 'not enough education';
  if (w.consumes && s.players[p].wh[w.consumes.res] < w.consumes.amount) return `needs ${w.consumes.amount} ${w.consumes.res}`;
  return sum([{ label: id, value: w.amount }, ...bonuses(s, p, card, w.icon, null).parts]);
}

export function store(s: State, p: number, icon: Icon, n: number) {
  log(s, { e: 'produce', p, icon, n });
  if (icon === 'bells') addBells(s, p, n, 'production');
  else if (icon === 'crosses') addCrosses(s, p, n, 'production');
  else s.players[p].wh[ICON_RESOURCE[icon]] += n;
}
