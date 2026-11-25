/** Import Colonization.xlsx. `--review` accepts the current card texts as matching effects.ts. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import readWorkbook from 'read-excel-file/node';
import { formatIssue, importWorkbook, type RawSheet } from './import.ts';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const workbook = at('../../../Colonization.xlsx');
const reviewedPath = at('./reviewed-texts.json');
const outPath = at('../generated/gamedata.json');

const sheets = (await readWorkbook(workbook)) as unknown as RawSheet[];
let reviewed: Record<string, string> = existsSync(reviewedPath) ? JSON.parse(readFileSync(reviewedPath, 'utf8')) : {};
if (process.argv.includes('--review')) {
  const { texts } = importWorkbook(sheets, reviewed);
  for (const [k, v] of Object.entries(texts)) if (reviewed[k] !== v) console.log(`reviewed ${k}: ${v}`);
  reviewed = Object.fromEntries(Object.entries(texts).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(reviewedPath, JSON.stringify(reviewed, null, 1) + '\n');
}
const { data, issues } = importWorkbook(sheets, reviewed);
for (const i of issues) console.log(formatIssue(i));
if (!data) { console.error('Import failed. Nothing was written.'); process.exit(1); }
writeFileSync(outPath, JSON.stringify(data, null, 1) + '\n');
const n = (o: object) => Object.keys(o).length;
console.log(`Imported ${n(data.agents)} agents, ${n(data.nations)} nations, ${n(data.buildings)} buildings, ${n(data.fathers)} Fathers, ${n(data.events)} events, ` +
  `${n(data.ruins)} ruins, ${n(data.wrecks)} wrecks, ${n(data.tactics)} tactics, ${n(data.tribes)} tribes, ${data.tiles.length} tiles.`);
