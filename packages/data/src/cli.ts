/**
 * Build the game data from the master rules (`rules/`, see master.ts): generated/gamedata.json, sources.json (where each value is printed in
 * the sheet) and texts.json (the printed card texts). `--review` first accepts every printed text as checked against its effect (`$fx`).
 * Usage: pnpm rules:build, pnpm rules:review
 */
import { formatIssue } from './import.ts';
import { compileMaster, readMaster, review, writeGenerated, writeMaster } from './master.ts';

const master = readMaster();
if (process.argv.includes('--review')) {
  const changed = review(master);
  for (const c of changed) console.log(`checked ${c}`);
  if (changed.length) writeMaster(master);
}
const { data, issues, sources, texts } = compileMaster(master);
for (const i of issues) console.log(formatIssue(i));
if (!data) { console.error('The rules do not compile. Nothing was written.'); process.exit(1); }
writeGenerated({ data, issues, sources, texts });
const n = (o: object) => Object.keys(o).length;
console.log(`Built ${n(data.agents)} agents, ${n(data.nations)} nations, ${n(data.buildings)} buildings, ${n(data.fathers)} Fathers, ${n(data.events)} events, ` +
  `${n(data.ruins)} ruins, ${n(data.wrecks)} wrecks, ${n(data.tactics)} tactics, ${n(data.tribes)} tribes, ${data.tiles.length} tiles.`);
