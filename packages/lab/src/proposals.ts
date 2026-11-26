/**
 * Evidence for the proposed rule changes (M5): each package against `board` on paired seeds, at 2–5 players, with tuned and with mixed bots.
 * The packages are the overrides of `rulesets/proposed.json`. Writes out/proposals.md.
 * Usage: node packages/lab/src/proposals.ts [games=400]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadRuleset, type Ruleset } from '@col/data';
import { PERSONALITIES, type Personality, type Weights } from '@col/bots';
import { runAll, type BotSpec, type GameSpec } from './pool.ts';
import { table } from './design.ts';
import { diffTable, mdTable, values } from './metrics.ts';
import type { GameRecord } from './record.ts';
import { ci, mean, pct } from './stats.ts';

const games = Number(process.argv[2] ?? 400), def = loadRuleset(), t0 = performance.now();
const proposed = JSON.parse(readFileSync('rulesets/proposed.json', 'utf8')) as Ruleset;
const tuned: BotSpec = { kind: 'goal', name: 'tuned', weights: existsSync('out/tuned.json') ? (JSON.parse(readFileSync('out/tuned.json', 'utf8')).weights as Weights) : PERSONALITIES.balanced };
const mixed = (Object.keys(PERSONALITIES) as Personality[]).map((p): BotSpec => ({ kind: 'goal', name: p, personality: p }));
/** Packages: each override alone, and the packages named in the ruleset's `packages` (lists of override ids). */
const packages: [string, GameSpec['changes']][] = [
  ...proposed.overrides.map((o): [string, GameSpec['changes']] => [o.id, o.set]),
  ...Object.entries(proposed.packages ?? {}).map(([name, ids]): [string, GameSpec['changes']] => [name, Object.assign({}, ...ids.map((id) => proposed.overrides.find((o) => o.id === id)!.set))]),
];
const KEYS = ['loyalist wins', 'a patriot wins', 'patriot colonies that survive', 'REF cubes in the war', 'rounds played', 'ended by bells', 'taxes refused although affordable', 'leader at round 5 wins'];
/** Share of games that end before round 8 (target: under 25%). */
const early = (rs: GameRecord[]) => { const v = rs.map((r) => +(r.rounds < 8)); return `${pct(mean(v))} ±${pct(ci(v))}`; };
const out: string[] = [`# Proposed rule changes: evidence\n\n${games} paired games per cell; same seeds, nations and seats on every side. Bold: the change is outside its 95% interval. Targets (ai-and-testlab.md): loyalist wins about 15% (10–20%), colonies surviving 40–70%, games ending before round 8 under 25%.\n`];
const save = () => writeFileSync('out/proposals.md', out.join('\n'));
mkdirSync('out', { recursive: true });
for (const [label, bots] of [['tuned bots', [tuned]], ['mixed characters', mixed]] as [string, BotSpec[]][]) {
  const summary: string[][] = [];
  for (const n of [2, 3, 4, 5]) {
    const mk = (c?: GameSpec['changes']) => table(def, { prefix: `prop-${n}`, games, players: n, bots, ...(c ? { changes: c } : {}) });
    const a = await runAll(mk()), bs: [string, GameRecord[]][] = [];
    for (const [name, c] of packages) bs.push([name, await runAll(mk(c))]);
    out.push(`\n## ${n} players, ${label}\n`, diffTable(a, bs, KEYS));
    for (const [name, rs] of [['board', a] as [string, GameRecord[]], ...bs]) {
      const v = (k: string) => { const x = values(rs, k); return x.length ? `${pct(mean(x))}` : '–'; };
      summary.push([String(n), name, v('loyalist wins'), v('patriot colonies that survive'), early(rs), mean(values(rs, 'rounds played')).toFixed(1)]);
    }
    console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s: ${n} players, ${label}`);
    save();
  }
  out.push(`\n## Against the targets, ${label}\n`, mdTable(['Players', 'Rules', 'loyalist wins', 'colonies survive', 'ends before round 8', 'rounds'], summary));
  save();
}
console.log('out/proposals.md');
