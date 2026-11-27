/** What a ruleset changes against the rules, where each value is printed, and the decision-log lines for applied and dropped changes. No node: imports. */
import type { Conversion, GameData, Override, Ruleset } from './types.ts';
import { applyOverride, checkOverride, RulesetError } from './ruleset.ts';
import { sourceOf, where } from './sources.ts';
import { getPath } from './values.ts';

export interface ChangeRow {
  override: string; path: string;
  sheet: string; row: number | null; column: string | null; header: string;
  from: unknown; to: unknown;
  conversion: Conversion | ''; table: string;
}

const name = (v: unknown) => { const o = v as { en?: string; id?: string } | undefined; return o?.en ?? o?.id ?? '?'; };

/** One row per value the ruleset changes, in order; new and removed cards are rows described in words. */
export function changeList(data: GameData, ruleset: Ruleset): ChangeRow[] {
  const work = structuredClone(data);
  const copies: Record<string, string> = {};
  const rows: ChangeRow[] = [];
  for (const o of ruleset.overrides) {
    const row = (path: string, from: unknown, to: unknown, src = sourceOf(path, copies)): ChangeRow =>
      ({ override: o.id, path, ...src, from, to, conversion: o.conversion ?? '', table: o.table ?? '' });
    const removed = (o.remove ?? []).map((p) => [p, name(getPath(work, p)), sourceOf(p, copies)] as const);
    const old: Record<string, unknown> = {};
    applyOverride(work, o, (p, v) => { old[p] = v; });
    for (const [to, from] of Object.entries(o.copy ?? {})) {
      copies[to] = copies[from] ?? from;
      const s = sourceOf(from, copies);
      rows.push(row(to, '', `new card, a copy of "${name(getPath(work, from))}" (${from}): add a row to ${s.sheet} like row ${s.row ?? '?'}`, { ...s, row: null, column: null, header: '' }));
    }
    for (const [p, v] of Object.entries(o.set ?? {})) rows.push(row(p, old[p], v));
    for (const [p, n, s] of removed) rows.push(row(p, `card "${n}"`, `removed: delete row ${s.row ?? '?'} of ${s.sheet} or set its copies to 0`, s));
  }
  return rows;
}

const text = (v: unknown) => (v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v));
const COLUMNS = ['override', 'path', 'sheet', 'row', 'column', 'header', 'from', 'to', 'conversion', 'table'] as const;

export function toCsv(rows: ChangeRow[]): string {
  const cell = (v: unknown) => { const s = text(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}

const md = (v: unknown) => text(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function toMarkdown(rows: ChangeRow[]): string {
  if (!rows.length) return 'No changes.\n';
  return ['| Override | Path | Edit | From | To | Label | Table wording |', '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${[r.override, r.path, where(r), r.from, r.to, r.conversion, r.table].map(md).join(' | ')} |`)].join('\n') + '\n';
}

/** Why an override cannot be applied to the rules, or null. The rules must be playable at the table and worded for it. */
export function promoteProblem(o: Override): string | null {
  if (!o.conversion || o.conversion === 'notConvertible') return 'it is not convertible to the board game';
  if (o.conversion === 'interface') return 'it is interface only, so there is no rule to apply';
  if (!o.table?.trim()) return 'it has no table wording';
  try { checkOverride(o, { id: 'board', title: '', overrides: [] }); } catch (e) { return (e as Error).message; }
  return null;
}

/** Every change a ruleset makes to the rules (`board`): what to print, which components to make, and where each value is printed. */
export function conversionReport(data: GameData, board: Ruleset, pc: Ruleset): string {
  const pcAll = pc.base === board.id ? [...board.overrides, ...pc.overrides] : pc.overrides;
  const same = (a: Override, b: Override) => JSON.stringify(a) === JSON.stringify(b);
  const extra = pcAll.filter((o) => !board.overrides.some((b) => b.id === o.id && same(b, o)));
  const missing = board.overrides.filter((b) => !pcAll.some((o) => o.id === b.id && same(b, o)));
  // Rows come from pc applied on its own, so "from" is the board value whenever pc layers on board.
  const rows = changeList(data, { ...pc, overrides: pcAll });
  const out = [`# Conversion report: ${pc.id} vs ${board.id}`, ''];
  if (!extra.length && !missing.length) return [...out, `${pc.id} plays exactly as ${board.id}.`, ''].join('\n');
  const count = (l: string) => extra.filter((o) => (o.conversion ?? 'unlabelled') === l).length;
  const labels = ['interface', 'direct', 'component', 'notConvertible', 'unlabelled'].filter(count).map((l) => `${l} ${count(l)}`);
  const components = [...new Set(extra.flatMap((o) => o.components ?? []))];
  out.push(`${extra.length} change(s) in ${pc.id}: ${labels.join(', ')}.`, `Components needed: ${components.length ? components.join('; ') : 'none'}.`, '');
  for (const o of extra) {
    const problem = promoteProblem(o);
    out.push(`## ${o.id} (${o.conversion ?? 'unlabelled'})`, '', `- Why: ${o.why || '-'}`, `- Table wording: ${o.table || '-'}`,
      `- Components: ${o.components?.length ? o.components.join('; ') : 'none'}`, `- Ready to apply: ${problem ? `no, ${problem}` : 'yes'}`, '');
    const own = rows.filter((r) => r.override === o.id);
    if (own.length) out.push('| Path | Edit | From | To |', '|---|---|---|---|', ...own.map((r) => `| ${[r.path, where(r), r.from, r.to].map(md).join(' | ')} |`), '');
  }
  if (missing.length) out.push(`## In ${board.id} but not in ${pc.id}`, '', ...missing.map((o) => `- ${o.id}: ${o.table || o.why}`), '');
  return out.join('\n');
}

/** A ruleset without one of its overrides. */
export function dropOverride(ruleset: Ruleset, id: string): { ruleset: Ruleset; override: Override } {
  const o = ruleset.overrides.find((x) => x.id === id);
  if (!o) throw new RulesetError(`no override "${id}" in ${ruleset.id}`);
  return { ruleset: { ...ruleset, overrides: ruleset.overrides.filter((x) => x !== o) }, override: o };
}

/** One brief decision-log line for an applied or dropped change: its id and English table wording (or why it was tried). */
export function decisionText(action: 'applied' | 'dropped', o: Override): string {
  const brief = (s: string) => s.split(' / ')[0]!.trim().replace(/\.$/, '');
  return action === 'applied' ? `Applied \`${o.id}\`: ${brief(o.table!)}` : `Dropped \`${o.id}\`: ${brief(o.why || '-')}`;
}

/** Append a row to the "Decided by the designer (date)" table, creating that section after the last such one. */
export function addDecision(log: string, entry: string, date: string): string {
  const next = Math.max(0, ...[...log.matchAll(/\| DD-(\d+) \|/g)].map((m) => Number(m[1]))) + 1;
  const line = `| DD-${next} | ${entry.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`;
  const lines = log.split('\n');
  const heads = lines.flatMap((l, i) => (/^## Decided by the designer/.test(l) ? [i] : []));
  const own = lines.findIndex((l) => l === `## Decided by the designer (${date})`);
  const endOf = (h: number) => { let i = h + 1; while (i < lines.length && !lines[i].startsWith('## ')) i++; return i; };
  if (own >= 0) {
    let i = endOf(own);
    while (i > own && !lines[i - 1].startsWith('|')) i--;
    lines.splice(i, 0, line);
  } else {
    const at = heads.length ? endOf(heads[heads.length - 1]) : lines.length;
    lines.splice(at, 0, `## Decided by the designer (${date})`, '', '| # | Decision |', '|---|---|', line, '');
  }
  return lines.join('\n');
}
