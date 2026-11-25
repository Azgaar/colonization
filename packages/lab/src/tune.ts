/**
 * Self-play tuning of bot weights with a simple evolution strategy.
 * Usage: node packages/lab/src/tune.ts <name> [generations] [candidates] [games] [start personality] [fixed weights json] [players] [win|patriot]
 * Training seeds and report seeds are different sets.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { BASE, PERSONALITIES, seedRandom, type Personality, type Weights } from '@col/bots';
import { runAll, type BotSpec, type GameSpec } from './pool.ts';
import { table } from './design.ts';
import { mean, share } from './stats.ts';
import type { GameRecord } from './record.ts';

const [name = 'tuned', gens = '15', cands = '16', games = '64', start = 'balanced', fixedJson = '{}', playersArg = '4', goal = 'win'] = process.argv.slice(2);
const fixed = JSON.parse(fixedJson) as Partial<Weights>, players = Number(playersArg);
const def = loadRuleset(), rnd = seedRandom(`tune-${name}`);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const keys = (Object.keys(BASE) as (keyof Weights)[]).filter((k) => k !== 'noise' && !(k in fixed));
const additive = new Set<keyof Weights>(['loyal']);
let center: Weights = { ...BASE, ...PERSONALITIES[start as Personality], ...fixed };
let sigma = 0.35;

/** Opponents: the standing personalities and the last few centres. */
const hall: BotSpec[] = (['balanced', 'loyalist', 'trader', 'explorer', 'defender', 'rebel'] as Personality[]).map((p) => ({ kind: 'goal', name: p, personality: p }));
for (const f of ['out/tuned.json', 'out/tuned-patriot.json']) if (existsSync(f)) hall.push({ kind: 'goal', name: f, weights: JSON.parse(readFileSync(f, 'utf8')).weights });

if (players === 2) hall.push({ kind: 'random' }, { kind: 'eager' }, { kind: 'random' }, { kind: 'eager' });

const mutate = (c: Weights): Weights => {
  const w = { ...c };
  for (const k of keys) w[k] = additive.has(k) ? Math.max(-1, Math.min(3, c[k] + gauss() * sigma)) : c[k] * Math.exp(gauss() * sigma);
  return w;
};
function specs(w: Weights, prefix: string, n: number): GameSpec[] {
  // The candidate takes every seat in turn; opponents come from the hall.
  const t = table(def, { prefix, games: n, players, bots: [{ kind: 'goal', name: 'me', weights: w }] });
  return t.map((g, i) => ({ ...g, bots: g.bots.map((_, p): BotSpec => (p === i % players ? { kind: 'goal', name: 'me', weights: w } : hall[(i * 7 + p * 3 + Math.floor(i / players)) % hall.length])) }));
}
/** Mostly winning, a little for being close. */
const fitness = (r: GameRecord) => {
  const me = r.bots.indexOf('me');
  // With the goal 'patriot', winning as the loyalist counts for nothing.
  if (goal === 'patriot' && r.sides[me] === 'loyalist') return 0;
  const win = r.winners.includes(me) ? 1 / r.winners.length : 0;
  return win + 0.1 * Number(r.qualifies[me]) + 0.004 * r.scores[me];
};
mkdirSync('out', { recursive: true });
for (let g = 0; g < Number(gens); g++) {
  const pop = [center, ...Array.from({ length: Number(cands) - 1 }, () => mutate(center))];
  const n = Number(games);
  const rs = await runAll(pop.flatMap((w) => specs(w, `train-${name}-${g}`, n)));
  const fit = pop.map((_, i) => mean(rs.slice(i * n, (i + 1) * n).map(fitness)));
  const order = pop.map((_, i) => i).sort((a, b) => fit[b] - fit[a]);
  const elite = order.slice(0, Math.max(2, Math.floor(pop.length / 4))), weight = elite.map((_, i) => Math.log(elite.length + 0.5) - Math.log(i + 1)), sum = weight.reduce((a, b) => a + b, 0);
  const next = { ...center };
  for (const k of keys) {
    const avg = elite.reduce((a, e, i) => a + (weight[i] / sum) * (additive.has(k) ? pop[e][k] : Math.log(Math.max(1e-6, pop[e][k]))), 0);
    next[k] = additive.has(k) ? avg : Math.exp(avg);
  }
  center = next;
  sigma *= 0.95;
  console.log(`gen ${g}: best ${fit[order[0]].toFixed(3)}, centre was ${fit[0].toFixed(3)}, mean ${mean(fit).toFixed(3)}`);
  if (g % 4 === 3) hall.push({ kind: 'goal', name: `gen${g}`, weights: center });
  writeFileSync(`out/${name}.json`, JSON.stringify({ weights: center, generations: g + 1, start, fixed, players }, null, 1));
}
const base: Weights = { ...BASE, ...PERSONALITIES[start as Personality], ...fixed };
for (const [label, w] of [['start', base], ['tuned', center]] as const) {
  const rs = await runAll(specs(w, 'held-out', 800));
  const k = rs.filter((r) => r.winners.includes(r.bots.indexOf('me'))).length;
  console.log(`${label}: wins ${share(k, rs.length)} on held-out seeds, qualifies ${share(rs.filter((r) => r.qualifies[r.bots.indexOf('me')]).length, rs.length)}, loyalist ${share(rs.filter((r) => r.loyalist === r.bots.indexOf('me')).length, rs.length)}, score ${mean(rs.map((r) => r.scores[r.bots.indexOf('me')])).toFixed(1)}, wins as patriot ${share(rs.filter((r) => { const m = r.bots.indexOf('me'); return r.sides[m] === 'patriot' && r.winners.includes(m); }).length, rs.length)}`);
}
console.log(Object.entries(center).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '));
