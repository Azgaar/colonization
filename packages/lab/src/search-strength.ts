/**
 * Does the search bot beat the goal bot? Every seed is played once per seat of the search bot, so seats and luck are paired.
 * Usage: node packages/lab/src/search-strength.ts [seeds=100] [iterations=100] [players=2,4] [horizon=1] [width=6]
 */
import { existsSync, readFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import type { Weights } from '@col/bots';
import { applyInPlace, createGame, viewFor } from '@col/engine';
import { searchBot } from '@col/bots';
import { makeBot, runAll, type BotSpec, type GameSpec } from './pool.ts';
import { table } from './design.ts';
import { ci, mean, share } from './stats.ts';

const [seeds, iterations] = [Number(process.argv[2] ?? 100), Number(process.argv[3] ?? 100)];
const counts = (process.argv[4] ?? '2,4').split(',').map(Number);
const horizon = Number(process.argv[5] ?? 1), width = Number(process.argv[6] ?? 6);
const def = loadRuleset();
const file = 'out/tuned.json', weights = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')).weights as Weights) : undefined;
const goal: BotSpec = { kind: 'goal', name: weights ? 'tuned' : 'goal', ...(weights ? { weights } : {}) };
const search: BotSpec = { kind: 'search', name: 'search', iterations, horizon, width, ...(weights ? { weights } : {}) };
console.log(`search (${iterations} iterations, horizon ${horizon}, width ${width}) vs ${goal.name} bot, ${seeds} seeds per player count`);

for (const n of counts) {
  const t0 = performance.now();
  const specs: GameSpec[] = table(def, { prefix: `ss${n}`, games: seeds, players: n, bots: [goal] })
    .flatMap((g) => Array.from({ length: n }, (_, seat) => ({ ...g, bots: g.nations.map((_x, p) => (p === seat ? search : goal)) })));
  const rs = await runAll(specs);
  let won = 0;
  const bySeed = new Map<string, number[]>();
  for (const r of rs) {
    const me = r.bots.indexOf('search'), rest = r.scores.filter((_, i) => i !== me);
    if (r.winners.includes(me)) won += 1 / r.winners.length;
    const d = r.scores[me] - mean(rest);
    bySeed.set(r.seed, [...(bySeed.get(r.seed) ?? []), d]);
  }
  const diffs = [...bySeed.values()].map(mean);
  // Time per searched decision, from one game played here.
  const g = specs[0], bot = searchBot(`${g.seed}-0`, { iterations, horizon, width, ...(weights ? { weights } : {}) });
  const bots = g.bots.map((b, p) => (p === 0 ? bot : makeBot(b, `${g.seed}-${p}`)));
  const s = createGame({ def, seed: g.seed, nations: g.nations, logging: false });
  while (!s.over) { const p = s.pending!.player; applyInPlace(s, bots[p].choose(viewFor(s, p)), true); }
  const st = bot.stats;
  console.log(`${n} players, ${rs.length} games: search wins ${share(won, rs.length)} (parity ${(100 / n).toFixed(0)}%), score ${mean(diffs) >= 0 ? '+' : ''}${mean(diffs).toFixed(2)} ±${ci(diffs).toFixed(2)} vs the others' mean;` +
    ` ${(st.ms / Math.max(1, st.searched)).toFixed(0)} ms per searched decision (${st.searched} of ${st.decisions} searched), ${((performance.now() - t0) / 1000).toFixed(0)} s`);
}
