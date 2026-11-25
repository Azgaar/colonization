/** Show one game in text. Usage: node packages/lab/src/watch.ts [seed] [players] [personality,...] */
import { loadRuleset } from '@col/data';
import { goalBot, PERSONALITIES, type Personality } from '@col/bots';
import { playGame } from './play.ts';

const seed = process.argv[2] ?? 'watch', n = Number(process.argv[3] ?? 2);
const kinds = (process.argv[4] ?? 'balanced').split(',') as Personality[];
const def = loadRuleset('board');
const nations = Object.keys(def.nations).slice(0, n);
const bots = nations.map((_, p) => goalBot(`${seed}${p}`, PERSONALITIES[kinds[p % kinds.length]]));
const t0 = performance.now();
const { state, choices } = playGame({ def, seed, nations, bots, check: true, logging: true });
console.log(`${choices.length} choices, ${(performance.now() - t0).toFixed(0)} ms`);
for (const e of state.log) {
  const p = e.p === undefined ? '' : `P${e.p} `;
  const { e: kind, p: _p, ...rest } = e;
  if (kind === 'step') continue;
  if (kind === 'round') console.log(`\n== ROUND ${e.n} scores ${e.scores} ref ${e.ref}`);
  else console.log(`${p}${kind} ${JSON.stringify(rest, (k, v) => (k === 'parts' ? undefined : v)).replace(/["{}]/g, ' ')}`.slice(0, 190));
}
for (const r of state.over!.players) console.log(`P${r.player} ${nations[r.player]} ${r.side} ${r.score}`, r.parts.map((x) => `${x.label} ${x.value}`).join(', '));
