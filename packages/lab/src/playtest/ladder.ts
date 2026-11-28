/**
 * Difficulty ladder: each level against another on paired seeds, the tested level taking every seat in turn.
 * Usage: node packages/lab/src/playtest/ladder.ts <tag> <players> <seeds> <level-vs-level,...>
 *   e.g. ladder.ts base 2 60 easy-normal,hard-normal,expert-normal,expert-hard
 * Writes out/playtest/<tag>-<players>p-<a>-<b>.jsonl and prints wins, score margin and 95% intervals.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Level } from '@col/bots';
import { loadRuleset } from '@col/data';
import { runAll, type BotSpec, type GameSpec } from '../pool.ts';
import { table } from '../design.ts';
import { ci, mean } from '../stats.ts';

const [tag = 'base', ps = '2', ss = '60', pairs = 'easy-normal,hard-normal,expert-normal'] = process.argv.slice(2);
const players = Number(ps), seeds = Number(ss), def = loadRuleset();
mkdirSync('out/playtest', { recursive: true });
const spec = (l: Level, name: string): BotSpec => ({ kind: 'level', name, level: l });

for (const pair of pairs.split(',')) {
  const [a, b] = pair.split('-') as [Level, Level];
  const t0 = performance.now();
  const A = spec(a, `A:${a}`), B = spec(b, `B:${b}`);
  const specs: GameSpec[] = table(def, { prefix: `lad-${players}`, games: seeds, players, bots: [B] })
    .flatMap((g) => Array.from({ length: players }, (_, seat) => ({ ...g, bots: g.nations.map((_x, p) => (p === seat ? A : B)) })));
  const rs = await runAll(specs);
  writeFileSync(`out/playtest/${tag}-${players}p-${a}-${b}.jsonl`, rs.map((r) => JSON.stringify(r)).join('\n'));
  let won = 0;
  const diffs: number[] = [], wins: number[] = [];
  for (const r of rs) {
    const me = r.bots.indexOf('A:' + a), rest = r.scores.filter((_, i) => i !== me);
    const w = r.winners.includes(me) ? 1 / r.winners.length : 0;
    won += w; wins.push(w);
    diffs.push(r.scores[me] - mean(rest));
  }
  const p = won / rs.length, half = 1.96 * Math.sqrt((p * (1 - p)) / rs.length);
  console.log(`${players}p ${a} vs ${b}: ${rs.length} games, ${a} wins ${(100 * p).toFixed(0)}% ±${(100 * half).toFixed(0)} (parity ${(100 / players).toFixed(0)}%), margin ${mean(diffs) >= 0 ? '+' : ''}${mean(diffs).toFixed(1)} ±${ci(diffs).toFixed(1)} vs the others' mean, ${((performance.now() - t0) / 60000).toFixed(1)} min`);
}
