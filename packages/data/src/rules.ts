/** Rulesets from the command line (FR-R-9): list, export, report, add to pc, promote, drop. Run with "pnpm rules <command>". */
import type { Override } from './types.ts';
import { flattenRuleset, RulesetError } from './ruleset.ts';
import { changeList, conversionReport, toCsv, toMarkdown } from './changes.ts';
import { gameData } from './index.ts';
import { addToPc, allRulesets as all, drop, promote } from './rulesfs.ts';

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
  } else if (cmd === 'add' && arg && process.argv[4]) {
    // From another ruleset (proposed, or one exported from the design bench) into pc.
    const from = all()[arg], o = from?.overrides.find((x: Override) => x.id === process.argv[4]);
    if (!o) throw new RulesetError(`no override "${process.argv[4]}" in ${arg}`);
    console.log(addToPc(o));
  } else if (cmd === 'promote' && arg) {
    const { message, rows } = promote(arg);
    console.log(`${message} Carry it into the workbook:`);
    process.stdout.write(toMarkdown(rows));
  } else if (cmd === 'drop' && arg) {
    console.log(drop(arg));
  } else {
    console.log('Usage: pnpm rules list | export <ruleset> [--csv] | report | add <ruleset> <override-id> | promote <override-id> | drop <override-id>');
    process.exitCode = cmd ? 1 : 0;
  }
} catch (e) {
  if (!(e instanceof RulesetError)) throw e;
  console.error(e.message);
  process.exitCode = 1;
}
