/**
 * Sweep one or two settings over ranges on paired seeds (FR-T-5). Writes out/sweep-<name>.md and .jsonl.
 * Usage: pnpm sweep <path=values> [path=values] [--games 200] [--players 4] [--bots mixed|random|eager|p1,p2] [--ruleset board] [--prefix sweep] [--name x] [--metrics "a,b"]
 * Values: 1,2,3 or from:to:step or JSON (true,false; [0,1],[1,2]).
 * Example: pnpm sweep settings.tax.refuseRef=1,2,3 settings.war.refStrength=1:3:1 --games 200 --players 4
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { runAll } from './pool.ts';
import { botsFrom, parseArgs, parseAxis } from './args.ts';
import { sweep, sweepMarkdown } from './sweeps.ts';

const { pos, opt } = parseArgs(process.argv.slice(2));
if (!pos.length) { console.log('Usage: pnpm sweep settings.tax.refuseRef=1,2,3 [settings.war.refStrength=1:3:1] [--games 200] [--players 4] [--bots mixed]'); process.exit(1); }
const paths = pos.map(parseAxis), games = Number(opt.games ?? 200), players = Number(opt.players ?? 4);
const name = (opt.name ?? paths.map((p) => p.path.split('.').slice(-1)[0]).join('-')).replace(/[^\w.-]+/g, '_');
const total = games * paths.reduce((n, p) => n * p.values.length, 1), t0 = performance.now();
let shown = 0;
const { result, records } = await sweep(
  { paths, games, players, bots: botsFrom(opt.bots), prefix: opt.prefix ?? `sweep-${players}`, ...(opt.ruleset ? { ruleset: opt.ruleset } : {}), ...(opt.metrics ? { keys: opt.metrics.split(',').map((k) => k.trim()) } : {}) },
  (specs) => runAll(specs, (done) => { if (done - shown >= total / 10 || done === total) { shown = done; console.log(`${done}/${total} games, ${((performance.now() - t0) / 1000).toFixed(0)} s`); } }),
);
const md = `# Sweep ${name}\n\n${sweepMarkdown(result)}\n`;
mkdirSync('out', { recursive: true });
writeFileSync(`out/sweep-${name}.md`, md);
// Raw records, each tagged with its point, like experiments.ts keeps them.
writeFileSync(`out/sweep-${name}.jsonl`, records.flatMap((rs, i) => rs.map((r) => JSON.stringify({ point: result.points[i].changes, ...r }))).join('\n'));
console.log(md);
console.log(`out/sweep-${name}.md, out/sweep-${name}.jsonl (${total} games, ${((performance.now() - t0) / 1000).toFixed(1)} s)`);
