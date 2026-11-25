import type { State } from '@col/engine';
import { map } from '@col/engine';

export interface Paths { dist: Float64Array; from: Int32Array }

function search(s: State, start: number[], cost: (c: number) => number): Paths {
  const n = s.map.zone.length;
  const dist = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1);
  // Costs are 1 to 3, so a few buckets do.
  const buckets: number[][] = [[...start]];
  for (const c of start) dist[c] = 0;
  for (let d = 0; d < buckets.length; d++) {
    const b = buckets[d];
    if (!b) continue;
    for (const c of b) {
      if (dist[c] !== d) continue;
      for (const x of s.map.neighbours[c]) {
        const k = cost(x);
        if (!(d + k < dist[x])) continue;
        dist[x] = d + k;
        from[x] = c;
        (buckets[d + k] ??= []).push(x);
      }
    }
  }
  return { dist, from };
}
export const shipPaths = (s: State, start: number): Paths => search(s, [start], (c) => (map.canShipEnter(s, c) ? 1 : Infinity));
export const landPaths = (s: State, p: number, start: number[]): Paths =>
  search(s, start, (c) => {
    if (!map.canInfantryEnter(s, p, c)) return Infinity;
    const mv = s.def.terrain[s.map.terrain[c]!].move;
    return mv === 'all' ? 3 : mv;
  });
/** First step from the start towards a cell. */
export function firstStep(p: Paths, to: number): number {
  let c = to;
  while (p.from[c] >= 0 && p.dist[p.from[c]] > 0) c = p.from[c];
  return c;
}
