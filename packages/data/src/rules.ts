/** Rulesets from the command line (FR-R-9): list, export, report, promote, drop. Run with "pnpm rules <command>". */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Ruleset } from './types.ts';
import { compileRuleset, flattenRuleset, RulesetError } from './ruleset.ts';
import { addDecision, changeList, conversionReport, decisionText, dropOverride, promoteOverride, toCsv, toMarkdown } from './changes.ts';
import { gameData } from './index.ts';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const file = (id: string) => at(`../../../rulesets/${id}.json`);
const decisionsPath = at('../../../docs/decisions.md');
// Read from disk, not the imported JSON, so promote and drop work on the current files.
const read = (id: string) => JSON.parse(readFileSync(file(id), 'utf8')) as Ruleset;
const write = (r: Ruleset) => writeFileSync(file(r.id), JSON.stringify(r, null, 2) + '\n');
const all = () => Object.fromEntries(['board', 'pc', 'alternatives'].map((id) => [id, read(id)]));
const today = () => new Date().toISOString().slice(0, 10);
const log = (entry: string) => writeFileSync(decisionsPath, addDecision(readFileSync(decisionsPath, 'utf8'), entry, today()));

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'list') {
    for (const r of Object.values(all())) {
      console.log(`${r.id}${r.sandbox ? ' (sandbox)' : ''}${r.base ? ` on ${r.base}` : ''}: ${r.title}, ${r.overrides.length} override(s)`);
      for (const o of r.overrides) console.log(`  ${o.id} [${o.conversion ?? 'unlabelled'}] ${o.table || o.why}`);
    }
  } else if (cmd === 'export' && arg) {
    const rs = all();
    if (!rs[arg]) throw new RulesetError(`unknown ruleset "${arg}"`);
    const rows = changeList(gameData, flattenRuleset(rs[arg], rs));
    process.stdout.write(process.argv.includes('--csv') ? toCsv(rows) : toMarkdown(rows));
  } else if (cmd === 'report') {
    const rs = all();
    process.stdout.write(conversionReport(gameData, rs.board, rs.pc));
  } else if (cmd === 'promote' && arg) {
    const rs = all();
    const { board, pc, override } = promoteOverride(rs.board, rs.pc, arg);
    const next = { ...rs, board, pc };
    compileRuleset(gameData, board, next); compileRuleset(gameData, pc, next);
    const rows = changeList(gameData, board).filter((r) => r.override === arg);
    write(board); write(pc); log(decisionText('promoted', override, rows));
    console.log(`Promoted "${arg}" to board and logged it in docs/decisions.md. Carry it into the workbook:`);
    process.stdout.write(toMarkdown(rows));
  } else if (cmd === 'drop' && arg) {
    const { pc, override } = dropOverride(read('pc'), arg);
    write(pc); log(decisionText('dropped', override, []));
    console.log(`Dropped "${arg}" from pc and logged it in docs/decisions.md.`);
  } else {
    console.log('Usage: pnpm rules list | export <ruleset> [--csv] | report | promote <override-id> | drop <override-id>');
    process.exitCode = cmd ? 1 : 0;
  }
} catch (e) {
  if (!(e instanceof RulesetError)) throw e;
  console.error(e.message);
  process.exitCode = 1;
}
