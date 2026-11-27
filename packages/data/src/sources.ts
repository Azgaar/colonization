/** Where each value of game data is edited. Plain JSON import, so it loads in Node and in the browser bundle. */
import type { Source, SourceMap } from './types.ts';
import generated from '../generated/sources.json' with { type: 'json' };

export const sourceMap = generated as unknown as SourceMap;
export const SETTINGS_FILE = 'rules/settings.json';

/**
 * The cell to edit for `path`, from its nearest recorded parent: `fathers.x.mods.0.add` is the effect cell of that Father.
 * `copies` maps new cards to the card they were copied from; their values point at the original's column with no row yet.
 */
export function sourceOf(path: string, copies: Record<string, string> = {}, map: SourceMap = sourceMap): Source {
  if (path.startsWith('settings.')) return { sheet: SETTINGS_FILE, row: null, column: null, header: path.slice('settings.'.length) };
  const card = path.split('.').slice(0, 2).join('.');
  if (copies[card]) return { ...sourceOf(copies[card] + path.slice(card.length), copies, map), row: null };
  for (let p = path; p; p = p.includes('.') ? p.slice(0, p.lastIndexOf('.')) : '')
    if (map[p]) { const [sheet, row, column, header] = map[p]; return { sheet, row, column, header }; }
  return { sheet: '', row: null, column: null, header: '' };
}

/** "Agents, H14 (price)" or "rules/settings.json: tax.track". */
export function where(s: Source): string {
  if (s.sheet === SETTINGS_FILE) return `${s.sheet}: ${s.header}`;
  if (!s.sheet) return 'unknown';
  if (!s.row) return s.column ? `${s.sheet}, new row, column ${s.column} (${s.header})` : `${s.sheet}, new row`;
  return `${s.sheet}, ${s.column}${s.row} (${s.header})`;
}
