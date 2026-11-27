import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import readWorkbook from 'read-excel-file/node';
import { describe, expect, it } from 'vitest';
import { importWorkbook, type RawSheet } from '../src/import.ts';
import {
  addDecision, changeList, compileRuleset, conversionReport, dropOverride, editable, flattenRuleset, gameData, loadRuleset, promoteOverride, rulesets, sourceMap, sourceOf,
  toCsv, validateChange, type Override, type Ruleset,
} from '../src/index.ts';

const rs = (overrides: Partial<Override>[], sandbox = false, id = 't'): Ruleset => ({ id, title: '', sandbox, overrides: overrides.map((o, i) => ({ id: `o${i}`, why: '', ...o })) });
const compile = (o: Partial<Override>, sandbox = true) => compileRuleset(gameData, rs([o], sandbox));

describe('adding and removing cards', () => {
  it('copies a card, changes the copy and removes another', () => {
    const d = compile({ copy: { 'fathers.my_father': 'fathers.peter_minuit' }, set: { 'fathers.my_father.bells': 9 }, remove: ['events.stamp_act'] });
    expect(d.fathers.my_father).toMatchObject({ id: 'my_father', en: gameData.fathers.peter_minuit.en, bells: 9 });
    expect(d.fathers.peter_minuit.bells).toBe(gameData.fathers.peter_minuit.bells);
    expect(d.events.stamp_act).toBeUndefined();
    expect(d.rulesetHash).not.toBe(compile({ copy: { 'fathers.my_father': 'fathers.peter_minuit' } }).rulesetHash);
  });
  it('rejects bad copies and removals with a reason', () => {
    expect(() => compile({ copy: { 'events.x': 'fathers.peter_minuit' } })).toThrow(/same collection/);
    expect(() => compile({ copy: { 'fathers.peter_minuit': 'fathers.simon_bolivar' } })).toThrow(/already exists/);
    expect(() => compile({ remove: ['agents.slave'] })).toThrow(/still used by fathers.juan_de_sepulveda/);
    expect(() => compile({ remove: ['agents.indian'] })).toThrow(/the engine/);
    expect(() => compile({ remove: ['agents.colonist_french'] })).toThrow(/nations.french.deck/);
    const french = Object.values(gameData.agents).filter((a) => a.nation === 'french').map((a) => `agents.${a.id}`);
    expect(Object.keys(compile({ remove: ['nations.french', ...french] }).nations)).not.toContain('french');
  });
  it('needs the right label outside a sandbox', () => {
    const copy = { 'fathers.my_father': 'fathers.peter_minuit' };
    expect(() => compile({ copy, conversion: 'direct', table: 'x' }, false)).toThrow(/component/);
    expect(compile({ copy, conversion: 'component', table: 'New Father card', components: ['1 Father card'] }, false).fathers.my_father).toBeTruthy();
    expect(() => compile({ remove: ['events.stamp_act'], conversion: 'interface' }, false)).toThrow(/interface only/);
    expect(compile({ remove: ['events.stamp_act'], conversion: 'direct', table: 'Take Stamp Act out of the event deck' }, false).events.stamp_act).toBeUndefined();
  });
  it('pc is board plus its own changes', () => { expect(flattenRuleset(rulesets.pc, rulesets).overrides).toEqual([...rulesets.board.overrides, ...rulesets.pc.overrides]); });
});

describe('sources and change lists', () => {
  it('maps values to workbook cells, and the stored map is up to date', async () => {
    expect(sourceOf('agents.priest.price')).toEqual({ sheet: 'Agents', row: 14, column: 'H', header: 'price' });
    expect(sourceOf('fathers.francis_drake.mods.0.add').header).toBe('effect');
    expect(sourceOf('settings.tax.track')).toEqual({ sheet: 'packages/data/src/settings.ts', row: null, column: null, header: 'tax.track' });
    const sheets = (await readWorkbook(fileURLToPath(new URL('../../../Colonization.xlsx', import.meta.url)))) as unknown as RawSheet[];
    const reviewed = JSON.parse(readFileSync(fileURLToPath(new URL('../src/reviewed-texts.json', import.meta.url)), 'utf8'));
    expect(importWorkbook(sheets, reviewed).sources).toEqual(sourceMap);
  });
  const pc = rs([
    { id: 'cheap_priest', conversion: 'direct', table: 'The priest costs 5 gold', set: { 'agents.priest.price': 5 } },
    { id: 'new_father', conversion: 'component', table: 'A second Minuit', components: ['1 Father card'], copy: { 'fathers.minuit_2': 'fathers.peter_minuit' }, set: { 'fathers.minuit_2.bells': 3 } },
  ], false, 'pc');
  it('lists each change with the cell to edit', () => {
    const rows = changeList(gameData, pc);
    expect(rows[0]).toEqual({ override: 'cheap_priest', path: 'agents.priest.price', sheet: 'Agents', row: 14, column: 'H', header: 'price', from: 6, to: 5, conversion: 'direct', table: 'The priest costs 5 gold' });
    expect(rows.map((r) => [r.path, r.row])).toEqual([['agents.priest.price', 14], ['fathers.minuit_2', null], ['fathers.minuit_2.bells', null]]);
    expect(rows[1].to).toMatch(/copy of "Peter Minuit"/);
    expect(toCsv(rows).split('\n')[1]).toBe('cheap_priest,agents.priest.price,Agents,14,H,price,6,5,direct,The priest costs 5 gold');
  });
  it('reports what differs from board', () => {
    const report = conversionReport(gameData, rs([], false, 'board'), { ...pc, base: 'board' });
    expect(report).toContain('2 change(s) in pc: direct 1, component 1.');
    expect(report).toContain('| agents.priest.price | Agents, H14 (price) | 6 | 5 |');
    expect(report).toContain('Components needed: 1 Father card.');
  });
});

describe('promote and drop', () => {
  const board = rs([], false, 'board');
  const pc = rs([{ id: 'a', conversion: 'direct', table: 'A', set: {} }, { id: 'b', conversion: 'notConvertible', set: {} }, { id: 'c', conversion: 'direct', set: {} }], false, 'pc');
  it('moves a convertible change to board and refuses the others', () => {
    const r = promoteOverride(board, pc, 'a');
    expect([r.board.overrides.map((o) => o.id), r.pc.overrides.map((o) => o.id)]).toEqual([['a'], ['b', 'c']]);
    expect(() => promoteOverride(board, pc, 'b')).toThrow(/not convertible/);
    expect(() => promoteOverride(board, pc, 'c')).toThrow(/table wording/);
    expect(dropOverride(pc, 'b').pc.overrides.map((o) => o.id)).toEqual(['a', 'c']);
  });
  it('appends a dated decision', () => {
    const log = '# D\n\n## Decided by the designer (2026-11-25)\n\n| # | Decision |\n|---|---|\n| DD-1 | x |\n| DD-2 | y |\n\n## Open\n\ntext\n';
    const once = addDecision(log, 'promoted a', '2026-11-27');
    expect(once).toContain('| DD-2 | y |\n\n## Decided by the designer (2026-11-27)\n\n| # | Decision |\n|---|---|\n| DD-3 | promoted a |\n\n## Open');
    expect(addDecision(once, 'dropped b', '2026-11-27')).toContain('| DD-3 | promoted a |\n| DD-4 | dropped b |\n\n## Open');
  });
});

describe('editor values', () => {
  it('lists editable values and checks new ones', () => {
    const list = editable(gameData);
    expect(list.find((e) => e.path === 'agents.priest.price')).toMatchObject({ value: 6, type: 'number', min: 0, group: 'agents' });
    expect(list.find((e) => e.path === 'settings.tax.track')).toMatchObject({ type: 'number[]' });
    expect(list.some((e) => e.path.endsWith('.ru') || e.path.startsWith('tiles'))).toBe(false);
    expect(validateChange(gameData, 'agents.priest.price', -1)).toMatch(/0 or more/);
    expect(validateChange(gameData, 'agents.priest.price', 1.5)).toMatch(/whole/);
    expect(validateChange(gameData, 'nations.french.deck', ['priest'])).toMatch(/one of/);
    expect(validateChange(gameData, 'settings.combat.diceCap', 8)).toBe(null);
    expect(validateChange(gameData, 'agents.priest.price', 4)).toBe(null);
  });
});
