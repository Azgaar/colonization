/** Play one game with the bots and save it as a replay that the interface can open (FR-T-6).
 * Usage: node packages/lab/src/replay.ts [seed] [players] [personality,...] [ruleset]  → out/replays/<seed>.json */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { goalBot, PERSONALITIES, type Personality } from '@col/bots';
import { playGame } from './play.ts';

const seed = process.argv[2] ?? `replay${Date.now()}`, n = Number(process.argv[3] ?? 4);
const kinds = (process.argv[4] ?? 'balanced,trader,explorer,missionary,rebel').split(',') as Personality[];
const ruleset = process.argv[5] ?? 'board', def = loadRuleset(ruleset);
const nations = Object.keys(def.nations).slice(0, n), names = nations.map((_, p) => kinds[p % kinds.length]);
const { state, choices } = playGame({ def, seed, nations, bots: names.map((k, p) => goalBot(`${seed}${p}`, PERSONALITIES[k])) });
const file = `out/replays/${seed}.json`;
mkdirSync('out/replays', { recursive: true });
writeFileSync(file, JSON.stringify({ ruleset, rulesetHash: def.rulesetHash, seed, nations, bots: names, choices }));
console.log(`${file}: ${choices.length} choices, round ${state.round}, winners ${state.over!.winners.map((p) => nations[p]).join(', ') || 'none'}`);
