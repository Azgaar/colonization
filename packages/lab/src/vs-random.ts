/** Tuned bot against random ones at two players. Usage: node packages/lab/src/vs-random.ts [weights.json] [games] */
import { readFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { runAll, type BotSpec } from './pool.ts';
import { table } from './design.ts';
import { mean, pct, share } from './stats.ts';
const file = process.argv[2] ?? 'out/tuned.json', games = Number(process.argv[3] ?? 400), def = loadRuleset();
const me: BotSpec = { kind: 'goal', name: 'me', weights: JSON.parse(readFileSync(file, 'utf8')).weights };
for (const kind of ['random', 'eager'] as const) {
  const rs = await runAll(table(def, { prefix: `vs-${kind}`, games, players: 2, bots: [me, { kind }] }));
  const i = rs.map((r) => r.bots.indexOf('me'));
  const win = rs.filter((r, k) => r.winners.includes(i[k])).length, lose = rs.filter((r, k) => r.winners.includes(1 - i[k])).length;
  console.log(`${kind}: wins ${share(win, rs.length)}, loses ${share(lose, rs.length)}, nobody ${share(rs.length - win - lose, rs.length)}; of decided games ${pct(win / (win + lose))}; higher score ${pct(mean(rs.map((r, k) => +(r.scores[i[k]] > r.scores[1 - i[k]]))))}; mine is loyalist ${pct(mean(rs.map((r, k) => +(r.loyalist === i[k]))))}, qualifies ${pct(mean(rs.map((r, k) => +r.qualifies[i[k]])))}`);
}
