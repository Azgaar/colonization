/** The rules from the command line (FR-R-9): list the rulesets, export or report a ruleset's changes, apply or drop a change, list the printed texts to update. Run with "pnpm rules <command>". */
import type { Override } from './types.ts';
import { flattenRuleset, RulesetError } from './ruleset.ts';
import { changeList, conversionReport, toCsv, toMarkdown } from './changes.ts';
import { gameData } from './index.ts';
import { readMaster, todo } from './master.ts';
import { allRulesets as all, apply, drop } from './rulesfs.ts';

const [cmd, arg, id] = process.argv.slice(2);
const ruleset = (name: string) => { const r = all()[name]; if (!r) throw new RulesetError(`unknown ruleset "${name}"`); return r; };
try {
  if (cmd === 'list') {
    for (const r of Object.values(all())) {
      console.log(`${r.id}${r.sandbox ? ' (sandbox)' : ''}${r.base ? ` on ${r.base}` : ''}: ${r.title}, ${r.overrides.length} override(s)`);
      for (const o of r.overrides) console.log(`  ${o.id} [${o.conversion ?? 'unlabelled'}] ${o.table || o.why}`);
    }
  } else if (cmd === 'export' && arg) {
    const rows = changeList(gameData, flattenRuleset(ruleset(arg), all()));
    process.stdout.write(process.argv.includes('--csv') ? toCsv(rows) : toMarkdown(rows));
  } else if (cmd === 'report' && arg) {
    process.stdout.write(conversionReport(gameData, all().board!, { ...ruleset(arg), base: 'board' }));
  } else if (cmd === 'apply' && arg && id) {
    const o = ruleset(arg).overrides.find((x: Override) => x.id === id);
    if (!o) throw new RulesetError(`no override "${id}" in ${arg}`);
    const { message, rows } = apply(o, arg);
    console.log(message);
    process.stdout.write(toMarkdown(rows));
  } else if (cmd === 'drop' && arg && id) {
    console.log(drop(arg, id));
  } else if (cmd === 'todo') {
    const list = todo(readMaster());
    if (!list.length) console.log('Every printed text matches its effect.');
    for (const t of list) console.log(`${t.card} (${t.sheet}, row ${t.row}): print as "${t.table}"; now "${t.text}"`);
  } else {
    console.log('Usage: pnpm rules list | export <ruleset> [--csv] | report <ruleset> | apply <ruleset> <override-id> | drop <ruleset> <override-id> | todo');
    process.exitCode = cmd ? 1 : 0;
  }
} catch (e) {
  if (!(e instanceof RulesetError)) throw e;
  console.error(e.message);
  process.exitCode = 1;
}
