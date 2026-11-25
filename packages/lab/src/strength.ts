/** How strong are the bots? Usage: node packages/lab/src/strength.ts [games] */
import { loadRuleset } from '@col/data';
import { PERSONALITIES, type Personality } from '@col/bots';
import { runAll, type BotSpec } from './pool.ts';
import { table } from './design.ts';
import { mean, share } from './stats.ts';

const games = Number(process.argv[2] ?? 200), def = loadRuleset();
const goal: BotSpec = { kind: 'goal', name: 'goal' };
for (const [name, foe] of [['random', { kind: 'random' }], ['eager random', { kind: 'eager' }]] as [string, BotSpec][]) {
  const rs = await runAll(table(def, { prefix: `str-${name}`, games, players: 2, bots: [goal, foe] }));
  const win = rs.filter((r) => r.winners.some((w) => r.bots[w] === 'goal')).length, lost = rs.filter((r) => r.winners.length && !r.winners.some((w) => r.bots[w] === 'goal')).length;
  console.log(`goal vs ${name}: wins ${share(win, rs.length)}, loses ${share(lost, rs.length)}, nobody ${share(rs.length - win - lost, rs.length)}; score ${mean(rs.map((r) => r.scores[r.bots.indexOf('goal')])).toFixed(1)} vs ${mean(rs.map((r) => r.scores[1 - r.bots.indexOf('goal')])).toFixed(1)}`);
}
const names = Object.keys(PERSONALITIES) as Personality[];
const rs = await runAll(table(def, { prefix: 'str-mix', games: games * 4, players: 4, bots: names.map((p) => ({ kind: 'goal', name: p, personality: p })) }));
for (const p of names) {
  let g = 0, w = 0, l = 0;
  const sc: number[] = [];
  for (const r of rs) r.bots.forEach((b, i) => { if (b === p) { g++; sc.push(r.scores[i]); if (r.winners.includes(i)) w += 1 / r.winners.length; if (r.loyalist === i) l++; } });
  console.log(`${p.padEnd(11)} wins ${share(w, g)}  loyalist ${share(l, g)}  score ${mean(sc).toFixed(1)}`);
}
console.log(`rounds ${mean(rs.map((r) => r.rounds)).toFixed(1)}, REF ${mean(rs.map((r) => r.pool)).toFixed(0)}, colonies founded ${mean(rs.flatMap((r) => r.founded)).toFixed(2)}, sieges lost ${share(rs.flatMap((r) => r.sieges).filter((x) => x.fell).length, rs.flatMap((r) => r.sieges).length)}, loyalist wins ${share(rs.filter((r) => r.loyalist !== null && r.winners.includes(r.loyalist)).length, rs.length)}, nobody ${share(rs.filter((r) => !r.winners.length).length, rs.length)}, taxes paid ${share(rs.flatMap((r) => r.tax).filter((t) => t.pay).length, rs.flatMap((r) => r.tax).length)}`);
