/**
 * Evidence for one product per terrain (DD-63 to DD-67 in docs/decisions.md): grassland gives crops only (forest is timber only since DD-56),
 * alone and with the farmer on crops, Squanto and the Indian on fish; against `board` on paired seeds, at 3 and 4 players, with tuned and with mixed bots. Writes out/terrain.md.
 * Usage: node packages/lab/src/terrain.ts [games=400]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadRuleset, type Ruleset } from '@col/data';
import { PERSONALITIES, type Personality, type Weights } from '@col/bots';
import { runAll, type BotSpec, type GameSpec } from './pool.ts';
import { table } from './design.ts';
import { mdTable } from './metrics.ts';
import type { GameRecord } from './record.ts';
import { ci, mean } from './stats.ts';

const games = Number(process.argv[2] ?? 400), def = loadRuleset(), t0 = performance.now();
const proposed = JSON.parse(readFileSync('rulesets/proposed.json', 'utf8')) as Ruleset;
const set = (id: string) => proposed.overrides.find((o) => o.id === id)!.set!;
const pack = (name: string) => Object.assign({}, ...proposed.packages![name]!.map(set)) as GameSpec['changes'];
const variants: [string, GameSpec['changes']][] = [['grassland crops only', set('grassland-crops-only')], ['with farmer, Squanto, Indian', pack('one-product-per-terrain')]];


const tuned: BotSpec = { kind: 'goal', name: 'tuned', weights: existsSync('out/tuned.json') ? (JSON.parse(readFileSync('out/tuned.json', 'utf8')).weights as Weights) : PERSONALITIES.balanced };
const mixed = (Object.keys(PERSONALITIES) as Personality[]).map((p): BotSpec => ({ kind: 'goal', name: p, personality: p }));
const sum = (r: GameRecord, f: (p: number) => number) => r.scores.reduce((n, _, p) => n + f(p), 0);
const got = (r: GameRecord, p: number, ...icons: string[]) => icons.reduce((n, i) => n + (r.produced?.[p]?.[i] ?? 0), 0);
/** What each game says, per player where it is a per-player count. */
const METRICS: [string, (r: GameRecord) => number][] = [
  ['food produced per player', (r) => sum(r, (p) => got(r, p, 'fish')) / r.n],
  ['crops produced per player', (r) => sum(r, (p) => got(r, p, 'crops')) / r.n],
  ['timber produced per player', (r) => sum(r, (p) => got(r, p, 'timber')) / r.n],
  ['colonies founded per player', (r) => sum(r, (p) => r.foundRounds[p]!.length) / r.n],
  ['round of the first colony', (r) => mean(r.foundRounds.filter((x) => x.length).map((x) => x[0]!))],
  ['farmers hired per player', (r) => sum(r, (p) => r.hired[p]!.farmer ?? 0) / r.n],
  ['Squanto taken', (r) => +r.fathers.some((f) => f.includes('squanto'))],
  ['Indians per player at the end', (r) => sum(r, (p) => r.agents[p]!.filter((a) => a === 'indian').length) / r.n],
  ['coastal share of colonies', (r) => { const all = sum(r, (p) => r.foundRounds[p]!.length); return all ? sum(r, (p) => r.coastal?.[p] ?? 0) / all : 0; }],
  ['supply actions per player', (r) => sum(r, (p) => r.actions[p]!.supply ?? 0) / r.n],
  ['buildings per player', (r) => sum(r, (p) => r.buildings[p]!.length) / r.n],
  ['mean score', (r) => mean(r.scores)],
  ['loyalist wins', (r) => +(r.loyalist !== null && r.winners.includes(r.loyalist))],
  ['rounds played', (r) => r.rounds],
];
const f = (v: number, share: boolean) => (share ? `${(v * 100).toFixed(0)}%` : v.toFixed(1));
/** Board's mean, then each variant's mean and its paired change (bold when the 95% interval of the change excludes 0). */
function compare(a: GameRecord[], bs: [string, GameRecord[]][]) {
  return mdTable(['', 'board', ...bs.map(([n]) => n)], METRICS.map(([k, m]) => {
    const share = k.includes('share') || k.includes('wins') || k.includes('taken'), base = a.map(m);
    return [k, f(mean(base), share), ...bs.map(([, b]) => { const v = b.map(m), d = v.map((x, i) => x - base[i]!), c = `${mean(d) >= 0 ? '+' : ''}${f(mean(d), share)}`; return `${f(mean(v), share)} (${Math.abs(mean(d)) > ci(d) ? `**${c}**` : c})`; })];
  }));
}
const out: string[] = [`# One product per terrain: evidence\n\n${games} paired games per cell (same seeds, nations and seats). In brackets: the change against board; bold when its 95% interval excludes 0.`];
mkdirSync('out', { recursive: true });
for (const [label, bots] of [['tuned bots', [tuned]], ['mixed characters', mixed]] as [string, BotSpec[]][]) for (const n of [3, 4]) {
  const mk = (c?: GameSpec['changes']) => table(def, { prefix: `terrain-${n}`, games, players: n, bots, ...(c ? { changes: c } : {}) });
  const a = await runAll(mk()), bs: [string, GameRecord[]][] = [];
  for (const [name, c] of variants) bs.push([name, await runAll(mk(c))]);
  out.push(`\n## ${n} players, ${label}\n`, compare(a, bs));
  writeFileSync('out/terrain.md', out.join('\n'));
  console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s: ${n} players, ${label}`);
}
console.log('out/terrain.md');
