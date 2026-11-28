/** The generated maps with everything revealed: room for colonies, settlements and their hostility, timber and fish near sites. Usage: node packages/lab/src/playtest/mapgen.ts [maps] */
import { loadRuleset } from '@col/data';
import { createGame, map, nationsApart, nextU32, seedRng, util } from '@col/engine';
import { mean, quantile } from '../stats.ts';
const def = loadRuleset(), maps = Number(process.argv[2] ?? 2000), all = Object.keys(def.nations);
for (const n of [2, 3, 4, 5]) {
  const sites: number[] = [], packed: number[] = [], villages: number[] = [], hostile: number[] = [], forest: number[] = [], fit: number[] = [], noTimber: number[] = [];
  for (let i = 0; i < maps; i++) {
    const s = createGame({ def, seed: `map-${n}-${i}`, nations: nationsApart(def, all, n), logging: false });
    const rng = seedRng(`order-${i}`), order = s.revealed.map((_, k) => k).sort(() => (nextU32(rng) % 3) - 1);
    for (const f of order) map.reveal(s, f, 0);
    const legal: number[] = [];
    for (let c = 0; c < s.map.zone.length; c++) if (map.colonyProblem(s, c) === null) legal.push(c);
    sites.push(legal.length);
    // Greedy packing: colonies may not touch each other.
    const used: number[] = [];
    for (const c of legal) if (!used.some((u) => u === c || s.map.neighbours[u].includes(c))) used.push(c);
    packed.push(used.length);
    fit.push(used.length >= 3 * n ? 1 : 0);
    villages.push(s.settlements.length);
    hostile.push(s.settlements.filter((z) => s.hostility[z.tribe] >= def.settings.activation.raidMinHostility).length);
    const timber = legal.filter((c) => [c, ...s.map.neighbours[c]].some((x) => s.map.terrain[x] === 'forest'));
    forest.push(timber.length / Math.max(1, legal.length));
    noTimber.push(timber.length < n ? 1 : 0);
    void util;
  }
  console.log(`${n} players, ${maps} maps: legal sites ${mean(sites).toFixed(1)} (10th pct ${quantile(sites, 0.1)}), colonies that fit apart ${mean(packed).toFixed(1)} (10th pct ${quantile(packed, 0.1)}), maps where ${3 * n} fit ${(100 * mean(fit)).toFixed(0)}%, settlements ${mean(villages).toFixed(1)}, raiding at start ${mean(hostile).toFixed(1)}, sites by a forest ${(100 * mean(forest)).toFixed(0)}%, maps with fewer forest sites than players ${(100 * mean(noTimber)).toFixed(1)}%`);
}
