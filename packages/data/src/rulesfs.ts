/**
 * Accepting and dropping rule changes on disk, shared by `pnpm rules` and the local dev server (Node only).
 * A change is tried in a sandbox ruleset (`rulesets/proposed.json`, `alternatives.json`, or the designer's own in the browser), then applied:
 * its values are written into the master rules (`rules/`, master.ts) and the game data is rebuilt; or dropped. Both are logged in docs/decisions.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Override, Ruleset } from './types.ts';
import { RulesetError, rulesets } from './ruleset.ts';
import { addDecision, changeList, decisionText, dropOverride, promoteProblem, type ChangeRow } from './changes.ts';
import { gameData } from './index.ts';
import { agentBase, toId } from './import.ts';
import { compileMaster, readMaster, writeGenerated, writeMaster, type Master, type Row } from './master.ts';
import { sourceOf } from './sources.ts';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const file = (id: string) => at(`../../../rulesets/${id}.json`);
const decisionsPath = at('../../../docs/decisions.md');
/** The sandbox rulesets kept as files. */
export const RULESET_IDS = ['alternatives', 'proposed'];
/** Read from disk, not the imported JSON, so each step works on the current files. */
export const readRuleset = (id: string) => JSON.parse(readFileSync(file(id), 'utf8')) as Ruleset;
const write = (r: Ruleset) => writeFileSync(file(r.id), JSON.stringify(r, null, 2) + '\n');
/** The rules (board, the master itself) and the sandbox rulesets on disk. */
export const allRulesets = (): Record<string, Ruleset> => ({ board: rulesets.board!, ...Object.fromEntries(RULESET_IDS.map((id) => [id, readRuleset(id)])) });
const today = () => new Date().toISOString().slice(0, 10);
const log = (entry: string) => writeFileSync(decisionsPath, addDecision(readFileSync(decisionsPath, 'utf8'), entry, today()));

/** Where an effect field is kept: the sheet and the row of the card whose `$fx` holds it, and the field inside `$fx`. */
const FX: Record<string, { sheet: string; field: (f: string) => string[] | null }> = {
  terrain: { sheet: 'Terrain', field: (f) => (f === 'yields' ? [] : null) },
  agents: { sheet: 'Agents', field: (f) => (f === 'mods' ? [] : null) },
  fathers: { sheet: 'Fathers', field: (f) => (f === 'mods' || f === 'onGain' ? [f] : null) },
  buildings: { sheet: 'Buildings', field: (f) => (['work', 'storage', 'defence'].includes(f) ? [f] : null) },
  events: { sheet: 'Events', field: (f) => (f === 'do' ? [] : null) },
  ruins: { sheet: 'Burial events', field: (f) => (f === 'do' ? [] : null) },
  wrecks: { sheet: 'Wreck events', field: (f) => (f === 'do' ? [] : null) },
  tactics: { sheet: 'King Tactics', field: (f) => (f === 'effect' ? [] : null) },
};
const EDU = ['🚫', '📖', '🎓'];
const str = (v: unknown) => String(v ?? '').trim();
function setIn(root: Record<string, unknown>, keys: string[], value: unknown) {
  let o = root;
  for (const k of keys.slice(0, -1)) { if (o[k] === undefined || o[k] === null) throw new RulesetError(`cannot set "${keys.join('.')}": "${k}" does not exist`); o = o[k] as Record<string, unknown>; }
  o[keys[keys.length - 1]!] = structuredClone(value);
}
/** The row that carries a card's effect: an agent's is its base card's (a nation's copy of a common agent has none of its own). */
function effectRow(m: Master, collection: string, id: string): Row {
  const sheet = (n: string) => m.sheets.find((s) => s.sheet === n)!;
  if (collection === 'agents') {
    const base = gameData.agents[id]?.base ?? id;
    const own = sheet('Agents').rows.find((r) => toId(str(r.nickname)) === base) ?? sheet('Sp Agents').rows.find((r) => r.$fx !== undefined && agentBase(str(r.nickname)) === base);
    if (own) return own;
  } else {
    const r = sheet(FX[collection]!.sheet).rows.find((x) => toId(str(x.nickname)) === id);
    if (r) return r;
  }
  throw new RulesetError(`no row in rules/ for ${collection}.${id}`);
}
/** Write one override's values into the master. Effects go into `$fx` and leave a `$todo` for the printed text; printed values go into their cells. */
export function applyToMaster(m: Master, o: Override): string[] {
  if (Object.keys(o.copy ?? {}).length || o.remove?.length) throw new RulesetError(`"${o.id}" adds or removes cards: add or delete their rows in rules/ by hand`);
  const todo: string[] = [];
  for (const [path, value] of Object.entries(o.set ?? {})) {
    const keys = path.split('.');
    if (keys[0] === 'settings') { setIn(m.settings as unknown as Record<string, unknown>, keys.slice(1), value); continue; }
    const [collection, id, field, ...rest] = keys as [string, string, string, ...string[]];
    const inner = FX[collection]?.field(field);
    if (inner) {
      const row = effectRow(m, collection, id);
      const sub = [...inner, ...rest];
      if (!sub.length) row.$fx = structuredClone(value); else setIn(row as Record<string, unknown>, ['$fx', ...sub], value);
      if (o.conversion !== 'interface') { row.$todo = o.table?.trim() || o.id; todo.push(`${collection}.${id}`); }
      continue;
    }
    // A printed value: its cell, as the importer read it; a number keeps the text around it ("3 🟡" → "4 🟡").
    const src = sourceOf(path), sh = m.sheets.find((s) => s.sheet === src.sheet);
    const row = src.row ? sh?.rows[src.row - 2] : undefined;
    if (!sh || !row || !src.header) throw new RulesetError(`"${path}" has no cell in rules/: edit it by hand`);
    const old = row[src.header];
    if (field === 'edu' && typeof value === 'number') row[src.header] = EDU[value];
    else if (typeof value === 'number') row[src.header] = typeof old === 'string' && /\d/.test(old) ? old.replace(/\d+(?:[.,]\d+)?/, String(value)) : value;
    else if (typeof value === 'string') row[src.header] = value;
    else throw new RulesetError(`"${path}" (${JSON.stringify(value)}) cannot be written into its cell: edit ${src.sheet}, ${src.header} in rules/ by hand`);
  }
  return todo;
}
/** Apply a change: into rules/, rebuilt, logged. `from` is the sandbox ruleset on disk it leaves, if any. Nothing is written if the rules then fail. */
export function apply(o: Override, from?: string): { message: string; todo: string[]; rows: ChangeRow[] } {
  const problem = promoteProblem(o);
  if (problem) throw new RulesetError(`cannot apply "${o.id}": ${problem}`);
  const m = readMaster(), rows = changeList(gameData, { id: 'change', title: '', overrides: [o] }), todo = applyToMaster(m, o);
  const built = compileMaster(m);
  if (!built.data) throw new RulesetError(`"${o.id}" would break the rules: ${built.issues.filter((i) => i.level === 'error').map((i) => i.message).join('; ')}`);
  writeMaster(m); writeGenerated(built);
  if (from) { const r = readRuleset(from); write({ ...r, overrides: r.overrides.filter((x) => x.id !== o.id) }); }
  log(decisionText('applied', o));
  return { message: `Applied "${o.id}" to the rules (rules/) and logged it in docs/decisions.md.${todo.length ? ` Printed text to update: ${todo.join(', ')} (pnpm rules todo).` : ''}`, todo, rows };
}
/** Take a change out of a sandbox ruleset on disk and log the decision. */
export function drop(rulesetId: string, id: string): string {
  const { ruleset: r, override } = dropOverride(readRuleset(rulesetId), id);
  write(r); log(decisionText('dropped', override));
  return `Dropped "${id}" from ${rulesetId} and logged it in docs/decisions.md.`;
}
