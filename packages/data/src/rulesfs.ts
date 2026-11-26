/** Rulesets on disk: the steps from an idea to the board game, shared by `pnpm rules` and the local dev server (Node only).
 * A change goes into `pc` (add), then to `board` (promote) or away (drop); promote and drop are logged in docs/decisions.md. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Override, Ruleset } from './types.ts';
import { compileRuleset, RulesetError } from './ruleset.ts';
import { addDecision, changeList, decisionText, dropOverride, promoteOverride, type ChangeRow } from './changes.ts';
import { gameData } from './index.ts';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const file = (id: string) => at(`../../../rulesets/${id}.json`);
const decisionsPath = at('../../../docs/decisions.md');
export const RULESET_IDS = ['board', 'pc', 'alternatives', 'proposed'];
/** Read from disk, not the imported JSON, so each step works on the current files. */
export const readRuleset = (id: string) => JSON.parse(readFileSync(file(id), 'utf8')) as Ruleset;
const write = (r: Ruleset) => writeFileSync(file(r.id), JSON.stringify(r, null, 2) + '\n');
export const allRulesets = () => Object.fromEntries(RULESET_IDS.map((id) => [id, readRuleset(id)]));
const today = () => new Date().toISOString().slice(0, 10);
const log = (entry: string) => writeFileSync(decisionsPath, addDecision(readFileSync(decisionsPath, 'utf8'), entry, today()));

/** Put a change into `pc`, where it is played and tested before a decision. It must compile there (labelled and worded for the table). */
export function addToPc(o: Override): string {
  const rs = allRulesets(), pc = rs.pc;
  if (pc.overrides.some((x) => x.id === o.id) || rs.board.overrides.some((x) => x.id === o.id)) throw new RulesetError(`"${o.id}" is already in pc or board`);
  const next = { ...pc, overrides: [...pc.overrides, o] };
  compileRuleset(gameData, next, { ...rs, pc: next });
  write(next);
  return `Added "${o.id}" to pc.`;
}
/** Move a change from `pc` to `board`, log the decision, and say which cells or settings to edit. */
export function promote(id: string): { message: string; rows: ChangeRow[] } {
  const rs = allRulesets(), { board, pc, override } = promoteOverride(rs.board, rs.pc, id), next = { ...rs, board, pc };
  compileRuleset(gameData, board, next); compileRuleset(gameData, pc, next);
  const rows = changeList(gameData, board).filter((r) => r.override === id);
  write(board); write(pc); log(decisionText('promoted', override, rows));
  return { message: `Promoted "${id}" to board and logged it in docs/decisions.md.`, rows };
}
/** Take a change out of `pc` and log the decision. */
export function drop(id: string): string {
  const { pc, override } = dropOverride(readRuleset('pc'), id);
  write(pc); log(decisionText('dropped', override, []));
  return `Dropped "${id}" from pc and logged it in docs/decisions.md.`;
}
