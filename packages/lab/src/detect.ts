/**
 * Automatic detectors (FR-T-7) on a fresh batch or on saved records. Writes out/detect-<name>.md (and .jsonl for a fresh batch).
 * Usage: pnpm detect [games=400] [--players 4] [--bots mixed|random|eager|p1,p2] [--ruleset board] [--prefix detect] [--from out/x.jsonl] [--name x]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { runAll } from './pool.ts';
import { defFor } from './game.ts';
import { table } from './design.ts';
import { botsFrom, parseArgs } from './args.ts';
import { detect, detectMarkdown } from './detectors.ts';
import type { GameRecord } from './record.ts';

const { pos, opt } = parseArgs(process.argv.slice(2));
const games = Number(pos[0] ?? 400), players = Number(opt.players ?? 4), ruleset = opt.ruleset ?? 'board', def = defFor({ ruleset }), t0 = performance.now();
let rs: GameRecord[];
const name = opt.name ?? (opt.from ? opt.from.replace(/^.*\//, '').replace(/\.jsonl$/, '') : `${players}p`);
mkdirSync('out', { recursive: true });
if (opt.from) rs = readFileSync(opt.from, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as GameRecord);
else {
  let shown = 0;
  rs = await runAll(table(def, { prefix: opt.prefix ?? `detect-${players}`, games, players, bots: botsFrom(opt.bots), ...(opt.ruleset ? { ruleset } : {}) }), (done) => { if (done - shown >= games / 10) { shown = done; console.log(`${done}/${games} games, ${((performance.now() - t0) / 1000).toFixed(0)} s`); } });
  writeFileSync(`out/detect-${name}.jsonl`, rs.map((r) => JSON.stringify(r)).join('\n'));
}
const md = `# Detectors, ${name}\n\n${detectMarkdown(detect(rs, def, opt['max-choices'] ? { maxChoices: Number(opt['max-choices']) } : {}))}\n`;
writeFileSync(`out/detect-${name}.md`, md);
console.log(md);
console.log(`out/detect-${name}.md (${rs.length} games, ${((performance.now() - t0) / 1000).toFixed(1)} s)`);
