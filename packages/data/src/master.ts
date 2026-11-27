/**
 * The master rules, `rules/` at the root: the workbook as data, one file per sheet, plus `settings.json`.
 * Each row holds the cells as printed, keyed by the sheet's headers, and on rows that carry a card or a terrain the machine side:
 * `$fx` its effect, `$en` its English name when it differs from the nickname, `$checked` a hash of the printed text the effect was checked against,
 * and `$todo` when an applied change altered the effect and the printed text still has to follow it (the table wording to print).
 * The game data is compiled from it by the same importer that once read the workbook; the Google Sheet is published from it (sheet.ts).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Settings } from './types.ts';
import { agentBase, importWorkbook, printedText, toId, type CellValue, type ImportResult, type Machine, type RawSheet } from './import.ts';

export const RULES_DIR = fileURLToPath(new URL('../../../rules/', import.meta.url));
/** The sheets of the workbook, in its order, and the file each is kept in. */
export const SHEETS: [sheet: string, file: string][] = [
  ['Agents', 'agents'], ['Sp Agents', 'sp-agents'], ['Europeans', 'europeans'], ['Resource tokens', 'resource-tokens'], ['Buildings', 'buildings'],
  ['Fathers', 'fathers'], ['Icons', 'icons'], ['Goods', 'goods'], ['Terrain', 'terrain'], ['Tiles', 'tiles'], ['Indians', 'indians'],
  ['King Tactics', 'king-tactics'], ['Events', 'events'], ['Burial events', 'burial-events'], ['Wreck events', 'wreck-events'],
];
/** A row: printed cells by header (an empty or repeated header is kept as `#<column>`), then the machine fields. */
export type Row = { [cell: string]: CellValue | unknown; $fx?: unknown; $en?: string; $checked?: string; $todo?: string };
export interface Sheet { sheet: string; header: string[]; rows: Row[] }
export interface Master { sheets: Sheet[]; settings: Settings }

const str = (v: unknown) => String(v ?? '').trim();
/** The key a column's cells are kept under. */
export const keyOf = (header: string[], j: number) => (header[j] && header.indexOf(header[j]) === j ? header[j] : `#${j}`);
export const checkHash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 10);

/** Rows whose printed text describes an effect: what the text check calls them, and which cells the text is. */
export const CHECKED: Record<string, { kind: string; id: (r: Row) => string; parts: (r: Row) => string[] }> = {
  Terrain: { kind: 'terrain', id: (r) => toId(str(r.nickname)), parts: (r) => [str(r.production)] },
  Agents: { kind: 'agent', id: (r) => toId(str(r.nickname)), parts: (r) => [str(r.effect), str(r.comment)] },
  'Sp Agents': { kind: 'agent', id: (r) => agentBase(str(r.nickname)), parts: (r) => [str(r.effect), str(r.comment)] },
  Buildings: { kind: 'building', id: (r) => toId(str(r.nickname)), parts: (r) => [str(r.effect)] },
  Fathers: { kind: 'father', id: (r) => toId(str(r.nickname)), parts: (r) => [str(r.effect)] },
  Events: { kind: 'event', id: (r) => toId(str(r.nickname)), parts: (r) => [1, 2, 3, 4].map((i) => str(r[`effect ${i}`])) },
  'Burial events': { kind: 'ruin', id: (r) => toId(str(r.nickname)), parts: (r) => [str(r['effect 1'])] },
  'Wreck events': { kind: 'wreck', id: (r) => toId(str(r.nickname)), parts: (r) => [str(r['effect 1'])] },
  'King Tactics': { kind: 'tactic', id: (r) => toId(str(r.nickname)), parts: (r) => [str(r.effect)] },
};
/** The printed text of a row that carries an effect, as checked. */
export const textOf = (sheet: string, r: Row) => printedText(...CHECKED[sheet]!.parts(r));

export function readMaster(dir = RULES_DIR): Master {
  const sheets = SHEETS.map(([, file]) => JSON.parse(readFileSync(`${dir}${file}.json`, 'utf8')) as Sheet);
  return { sheets, settings: JSON.parse(readFileSync(`${dir}settings.json`, 'utf8')) as Settings };
}
/** Each file as the sheet's name, its header and its rows; a stable form, one key per line, so changes read well in a diff. */
export function writeMaster(m: Master, dir = RULES_DIR) {
  for (const s of m.sheets) writeFileSync(`${dir}${SHEETS.find(([n]) => n === s.sheet)![1]}.json`, JSON.stringify(s, null, 2) + '\n');
  writeFileSync(`${dir}settings.json`, JSON.stringify(m.settings, null, 2) + '\n');
}
/** A sheet as the grid of cells it is printed as: the header row, then each row's cells in the header's order. */
export const grid = (s: Sheet): CellValue[][] => [s.header, ...s.rows.map((r) => s.header.map((_, j) => (r[keyOf(s.header, j)] ?? null) as CellValue))];

/** The machine side of the rules, gathered from the rows. */
export function machine(m: Master): Machine {
  const out: Machine = { agents: {}, buildings: {}, fathers: {}, events: {}, ruins: {}, wrecks: {}, tactics: {}, yields: {}, settings: m.settings, names: {}, checked: () => false };
  const into: Record<string, Record<string, unknown>> = { Terrain: out.yields, Agents: out.agents, 'Sp Agents': out.agents, Buildings: out.buildings, Fathers: out.fathers, Events: out.events, 'Burial events': out.ruins, 'Wreck events': out.wrecks, 'King Tactics': out.tactics };
  const hashes: Record<string, string> = {};
  for (const s of m.sheets) {
    const c = CHECKED[s.sheet];
    if (!c) continue;
    for (const r of s.rows) {
      if (!str(r.nickname)) continue;
      const id = c.id(r);
      if (r.$fx !== undefined) into[s.sheet]![id] = r.$fx;
      if (r.$en) out.names[id] = r.$en;
      if (r.$checked) hashes[`${c.kind}.${id}`] = r.$checked;
    }
  }
  out.checked = (key, text) => hashes[key] === checkHash(text);
  return out;
}
/** The game data, compiled from the master. A row whose printed text still has to follow its effect is a warning, not an error. */
export function compileMaster(m: Master = readMaster()): ImportResult {
  const sheets: RawSheet[] = m.sheets.map((s) => ({ sheet: s.sheet, data: grid(s) }));
  const out = importWorkbook(sheets, machine(m));
  for (const t of todo(m)) out.issues.push({ level: 'warning', sheet: t.sheet, row: t.row, column: 'effect', message: `print "${t.card}" as: ${t.table} (now: "${t.text}"), then run "pnpm rules:review"` });
  return out;
}
/** Cards whose printed text still has to follow a change applied to their effect. */
export function todo(m: Master): { sheet: string; row: number; card: string; text: string; table: string }[] {
  return m.sheets.flatMap((s) => s.rows.flatMap((r, i) => (r.$todo ? [{ sheet: s.sheet, row: i + 2, card: CHECKED[s.sheet] ? `${CHECKED[s.sheet]!.kind}.${CHECKED[s.sheet]!.id(r)}` : str(r.nickname), text: CHECKED[s.sheet] ? textOf(s.sheet, r) : '', table: r.$todo }] : [])));
}
const GENERATED = fileURLToPath(new URL('../generated/', import.meta.url));
/** Write what the game reads: gamedata.json, sources.json (where each value is printed) and texts.json (the printed card texts). */
export function writeGenerated(r: ImportResult) {
  if (!r.data) throw new Error('the rules do not compile');
  writeFileSync(`${GENERATED}gamedata.json`, JSON.stringify(r.data, null, 1) + '\n');
  // One path per line keeps the changes readable in a diff.
  writeFileSync(`${GENERATED}sources.json`, '{\n' + Object.entries(r.sources).map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
  writeFileSync(`${GENERATED}texts.json`, JSON.stringify(Object.fromEntries(Object.entries(r.texts).sort(([a], [b]) => (a < b ? -1 : 1))), null, 1) + '\n');
}
/** Accept every printed text as checked against its effect (after the effects were looked at). Returns the cards whose texts were new. */
export function review(m: Master): string[] {
  const changed: string[] = [];
  for (const s of m.sheets) {
    const c = CHECKED[s.sheet];
    if (c) for (const r of s.rows) if (r.$fx !== undefined) {
      const h = checkHash(textOf(s.sheet, r));
      // An edited text settles what an applied change asked of it.
      if (r.$checked !== h) { changed.push(`${c.kind}.${c.id(r)}: ${textOf(s.sheet, r)}`); r.$checked = h; delete r.$todo; }
    }
  }
  return changed;
}
