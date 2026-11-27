import type { State } from '@col/engine';
import { buildingDefence, findLoyalist, hasLoyalist, rebelOrder, scorePlayer, util } from '@col/engine';
import { holdChance } from './war.ts';

export interface Change { strength?: number; ref?: number; gold?: number; /** Defence of one more colony. */ colony?: number }
export interface Forecast {
  points: number; qualifies: number;
  /** How far the easiest colony is from being safe, 0 to 1. Building a defence pays off only at the end. */
  progress: number;
}

export function cardPower(s: State, card: string) {
  let inf = 0, ship = 0;
  if (card === '?') return 0.6;
  for (const m of s.def.agents[card].mods) if (m.mod === 'combat' && !m.vs && !m.terrain) { if (m.token === 'infantry') inf += m.add; else ship += m.add; }
  return Math.max(inf, ship);
}

/** Who would side with the King, seen from a player that does or does not want to. */
export function expectedLoyalist(s: State, me: number, wants: boolean): number | null {
  if (!hasLoyalist(s)) return null;
  const l = findLoyalist(s);
  if (wants) return me;
  if (l === me && s.round < 7) return rebelOrder(s).at(-2)!;
  return l;
}

const NOISE = [-4, -2, 0, 2, 4];
/**
 * Points a player can expect from colonies in the war, and the chance to keep at least one.
 * `rounds` is how many more rounds are expected before the war.
 */
export function outlook(s: State, collections: string[][], p: number, loyalist: number | null, rounds: number, o: Change = {}): Forecast {
  const set = s.def.settings, pl = s.players[p], n = s.players.length;
  const mine = s.colonies.filter((c) => c.owner === p);
  const rate = Math.max(n * 0.7, s.ref / Math.max(1, s.round));
  const hostile = s.settlements.reduce((k, z) => k + (z.alive && s.hostility[z.tribe] >= set.war.hostileFrom ? set.war.hostileCubes : 0), 0);
  const pool = Math.max(0, s.ref + hostile + (o.ref ?? 0) + rate * rounds);
  const targets = s.colonies.filter((c) => c.owner !== loyalist).length + (o.colony !== undefined && p !== loyalist ? 1 : 0);
  const power = (q: number) => (collections[q] ?? []).reduce((k, c) => k + cardPower(s, c), 0);
  const cubes = pool / Math.max(1, targets);
  const gold = Math.max(0, pl.gold + (o.gold ?? 0));

  if (p === loyalist) {
    const army = power(p) + (o.strength ?? 0) + rounds;
    const taken = targets ? Math.min(targets, army / Math.max(1, cubes * set.war.refStrength)) * 0.6 : 0;
    const own = mine.length + (o.colony !== undefined ? 1 : 0);
    return { points: set.score.loyalistColony * (own + taken), qualifies: own > 0 ? 1 : Math.min(1, taken), progress: own > 0 ? 1 : 0 };
  }
  const per = set.score.patriotColony + util.mods(s, p, 'pointsPerPatriotColony').reduce((k, m) => k + m.value, 0);
  const foe = loyalist === null ? 0 : power(loyalist) * 0.6;
  const build = buildingDefence(s, p).reduce((k, b) => k + b.value, 0);
  const base = mine.map((c) => set.war.baseDefence + s.def.terrain[s.map.terrain[c.cell]!].defence + build);
  if (o.colony !== undefined) base.push(set.war.baseDefence + build + o.colony);
  if (!base.length) return { points: 0, qualifies: 0, progress: 0 };
  const civ = (collections[p] ?? []).filter((c) => c !== '?' && !util.isMilitary(s, c)).length;
  const allies = s.settlements.filter((z) => z.alive && z.ally === p).length * set.war.allyCubes;
  const free = power(p) + allies + util.mods(s, p, 'freeMilitia').reduce((k, m) => k + m.value, 0) + (o.strength ?? 0) + 1 + rounds * 1.2;
  const paid = Math.floor(gold / set.war.mercenaryGold) + Math.min(civ, pl.bells) * 0.6;
  let points = 0, qualifies = 0;
  // One clear colony to save: the sum of what it has against what comes.
  const strongest = Math.max(...base), threat = Math.max(1, cubes * set.war.refStrength + (foe / Math.max(1, targets)) * 1.5 + 0.7);
  const progress = Math.min(1, (strongest + free + paid) / threat);
  for (const e of NOISE) {
    const attack = cubes * set.war.refStrength + foe / Math.max(1, targets) * 1.5 + 0.7 + e * (0.4 + cubes * 0.12);
    const needs = base.map((b) => Math.max(0, attack - b)).sort((a, b) => a - b);
    let best = -1, bq = 0;
    for (let h = 0; h <= needs.length; h++) {
      // Defend the h easiest colonies; the rest are left to luck.
      let left = free + paid, v = 0, lose = 1;
      needs.forEach((q, i) => {
        const use = i < h ? Math.min(left, q) : 0;
        left -= use;
        const c = holdChance(q - use);
        v += per * c;
        lose *= 1 - c;
      });
      const total = v + 6 * (1 - lose);
      if (total > best) { best = total; bq = 1 - lose; }
      if (h === needs.length) { points += best - 6 * bq; qualifies += bq; }
    }
  }
  return { points: points / NOISE.length, qualifies: qualifies / NOISE.length, progress };
}

/** Expected final score of everybody, and how likely each may win at all. */
export function forecast(s: State, collections: string[][], loyalist: number | null, rounds: number): Forecast[] {
  return s.players.map((_, p) => {
    const f = outlook(s, collections, p, loyalist, rounds);
    const rest = scorePlayer(s, p).parts.filter((x) => x.label !== 'colonies' && x.label !== 'simon_bolivar' && !(p === loyalist && x.label === 'bells')).reduce((n, x) => n + x.value, 0);
    return { ...f, points: rest + f.points };
  });
}
