/**
 * Weights that beat the Normal bot as players meet it: the candidate takes one seat, every other seat is the Normal bot (BASE weights),
 * at 2, 3 and 4 players in turn. A simple evolution strategy on win share; training and report seeds differ.
 * Usage: node packages/lab/src/playtest/tune-level.ts <name> [generations=10] [candidates=12] [games=144]
 * ROBUST=1: half the other seats play the generation's centre (self-play), solo games count, and the fitness adds keeping a colony
 * and the score, so that weights cannot win only by exploiting the fixed Normal bot (which made bots found fewer colonies and lose them all).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { BASE, seedRandom, type Weights } from '@col/bots';
import { loadRuleset } from '@col/data';
import { runAll, type BotSpec, type GameSpec } from '../pool.ts';
import { table } from '../design.ts';
import type { GameRecord } from '../record.ts';
import { mean } from '../stats.ts';

const [name = 'level', gens = '10', cands = '12', games = '144'] = process.argv.slice(2);
const def = loadRuleset(), rnd = seedRandom(`tune-${name}`);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const keys = (Object.keys(BASE) as (keyof Weights)[]).filter((k) => k !== 'noise');
const additive = new Set<keyof Weights>(['loyal']);
const normal: BotSpec = { kind: 'goal', name: 'normal' }, robust = process.env.ROBUST === '1';
let center: Weights = { ...BASE }, sigma = 0.3;
const mutate = (c: Weights): Weights => {
  const w = { ...c };
  for (const k of keys) w[k] = additive.has(k) ? Math.max(-1, Math.min(3, c[k] + gauss() * sigma)) : c[k] * Math.exp(gauss() * sigma);
  return w;
};
function specs(w: Weights, prefix: string, n: number, centre: Weights): GameSpec[] {
  const out: GameSpec[] = [], counts = robust ? [1, 2, 3, 4] : [2, 3, 4];
  for (const players of counts) {
    const t = table(def, { prefix: `${prefix}-${players}`, games: Math.ceil(n / counts.length / players), players, bots: [normal] });
    for (const g of t) for (let seat = 0; seat < players; seat++)
      out.push({ ...g, bots: g.bots.map((b, p): BotSpec => (p === seat ? { kind: 'goal', name: 'me', weights: w } : robust && (p + seat) % 2 ? { kind: 'goal', name: 'centre', weights: centre } : b)) });
  }
  return out;
}
const share = (rs: GameRecord[]) => mean(rs.map((r) => {
  const me = r.bots.indexOf('me'), win = (r.winners.includes(me) ? 1 / r.winners.length : 0) * Math.max(1, r.n);
  return robust ? win + 0.5 * Number(r.qualifies[me]) + 0.02 * r.scores[me] : win;
}));
mkdirSync('out/playtest', { recursive: true });
const t0 = performance.now();
for (let g = 0; g < Number(gens); g++) {
  const pop = [center, ...Array.from({ length: Number(cands) - 1 }, () => mutate(center))];
  // Every candidate on the same seeds this generation.
  const prefix = `tl-${name}-${g}`;
  const scores: number[] = [];
  for (const w of pop) scores.push(share(await runAll(specs(w, prefix, Number(games), center))));
  const order = pop.map((w, i) => ({ w, s: scores[i] })).sort((a, b) => b.s - a.s);
  const elite = order.slice(0, Math.max(2, Math.floor(pop.length / 4)));
  const next = { ...center };
  for (const k of keys) next[k] = additive.has(k) ? mean(elite.map((e) => e.w[k])) : Math.exp(mean(elite.map((e) => Math.log(e.w[k]))));
  center = next;
  sigma *= 0.92;
  console.log(`gen ${g}: centre ${scores[0].toFixed(3)}, best ${order[0].s.toFixed(3)} (1 is parity), ${((performance.now() - t0) / 60000).toFixed(1)} min`);
  writeFileSync(`out/playtest/tuned-${name}.json`, JSON.stringify({ weights: center, generation: g }, null, 1));
}
// Report on fresh seeds.
const report = share(await runAll(specs(center, `tl-${name}-report`, 1200, center)));
console.log(`report, 1200 fresh games: ${report.toFixed(3)} of parity`);
