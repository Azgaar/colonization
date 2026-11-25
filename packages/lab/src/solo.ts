/** Solo results, to compare with the designer's recorded games. Usage: node packages/lab/src/solo.ts [games] [weights.json|personality] */
import { readFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import type { Personality } from '@col/bots';
import { runAll, type BotSpec } from './pool.ts';
import { table } from './design.ts';
import { mean, pct, quantile, share } from './stats.ts';
const games = Number(process.argv[2] ?? 200), what = process.argv[3] ?? 'balanced';
const bot: BotSpec = what.endsWith('.json') ? { kind: 'goal', name: 'x', weights: JSON.parse(readFileSync(what, 'utf8')).weights } : { kind: 'goal', name: what, personality: what as Personality };
const rs = await runAll(table(loadRuleset(), { prefix: 'solo', games, players: 1, bots: [bot] }));
const sc = rs.map((r) => r.scores[0]);
console.log(`${what}: won ${share(rs.filter((r) => r.winners.length).length, rs.length)}; score ${mean(sc).toFixed(1)} (10% ${quantile(sc, 0.1)}, median ${quantile(sc, 0.5)}, 90% ${quantile(sc, 0.9)}, best ${Math.max(...sc)}); 28+ in ${pct(mean(sc.map((x) => +(x >= 28))))}; rounds ${mean(rs.map((r) => r.rounds)).toFixed(1)}; REF ${mean(rs.map((r) => r.pool)).toFixed(1)}; colonies ${mean(rs.map((r) => r.founded[0])).toFixed(1)} kept ${mean(rs.map((r) => r.colonies[0])).toFixed(1)}; attack ${mean(rs.flatMap((r) => r.sieges.map((x) => x.attack))).toFixed(1)} defence ${mean(rs.flatMap((r) => r.sieges.map((x) => x.defence))).toFixed(1)}; buildings ${mean(rs.map((r) => r.buildings[0].length)).toFixed(1)}; town hall ${pct(mean(rs.map((r) => +r.buildings[0].includes('town_hall'))))}; taxes paid ${pct(mean(rs.flatMap((r) => r.tax.map((t) => +t.pay))))}; gold ${mean(rs.map((r) => Object.entries(r.gold[0]).reduce((n, [k, v]) => n + (k[0] === '+' ? v : 0), 0))).toFixed(0)}`);
