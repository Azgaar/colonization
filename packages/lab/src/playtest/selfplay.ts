/** Every seat plays the same weights (W='{...}' on top of BASE): does the table still play a sensible game? Usage: W=... node packages/lab/src/playtest/selfplay.ts [games=300] */
import type { Weights } from '@col/bots';
import { loadRuleset } from '@col/data';
import { runAll, type BotSpec } from '../pool.ts';
import { table } from '../design.ts';
import { mean } from '../stats.ts';
const def = loadRuleset(), games = Number(process.argv[2] ?? 300), w = (process.env.W ? JSON.parse(process.env.W) : {}) as Partial<Weights>;
const bot: BotSpec = { kind: 'goal', name: 'w', weights: w };
const out: string[] = [];
for (const n of [1, 2, 4]) {
  const rs = await runAll(table(def, { prefix: `self-${n}`, games: n === 1 ? games * 2 : games, players: n, bots: [bot] }));
  const pat = rs.flatMap((r) => r.qualifies.filter((_, i) => i !== r.loyalist));
  out.push(`${n}p: colonies founded ${mean(rs.flatMap((r) => r.founded)).toFixed(2)}, patriots destroyed ${(100 * pat.filter((q) => !q).length / pat.length).toFixed(0)}%, no winner ${(100 * rs.filter((r) => !r.winners.length).length / rs.length).toFixed(0)}%, mean score ${mean(rs.flatMap((r) => r.scores)).toFixed(1)}, rounds ${mean(rs.map((r) => r.rounds)).toFixed(1)}${n > 2 ? `, loyalist wins ${(100 * rs.filter((r) => r.loyalist !== null && r.winners.includes(r.loyalist)).length / rs.length).toFixed(0)}%` : ''}`);
}
console.log(out.join('\n'));
