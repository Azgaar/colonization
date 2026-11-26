// Checks the prototype's JavaScript for missing, unused and duplicate names and wrong argument counts, with the TypeScript compiler.
// Type errors are left out: the prototype is plain JavaScript without type notes. Run: node prototypes/tools/check.mjs
import { spawnSync } from 'node:child_process';
const KEEP = new Set([1117, 2300, 2304, 2305, 2307, 2440, 2448, 2451, 2552, 2554, 2592, 6133, 6192, 18004]);
const run = spawnSync('npx', ['tsc', '-p', new URL('..', import.meta.url).pathname], { encoding: 'utf8' });
const found = run.stdout.split('\n').filter((l) => KEEP.has(+(l.match(/error TS(\d+)/)?.[1] ?? 0)));
for (const l of found) console.log(l);
if (run.status !== 0 && !run.stdout.includes('error TS')) { console.error(run.stdout, run.stderr); process.exit(1); }
process.exit(found.length ? 1 : 0);
