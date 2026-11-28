import { describe, expect, it } from 'vitest';
import { formatIssue, importWorkbook, toId, type RawSheet } from '../src/import.ts';
import { grid, machine, readMaster } from '../src/master.ts';
import { compileRuleset, gameData, loadRuleset, RulesetError } from '../src/index.ts';

/** The master rules as the sheets they are printed as, and their machine side. */
const master = readMaster(), mx = machine(master);
const sheets: RawSheet[] = master.sheets.map((s) => ({ sheet: s.sheet, data: grid(s) }));

/** Compile with one cell changed. */
function broken(sheet: string, row: number, column: string, value: unknown) {
  const copy = structuredClone(sheets);
  const sh = copy.find((s) => s.sheet === sheet)!;
  sh.data[row - 1]![sh.data[0]!.indexOf(column)] = value as string;
  return importWorkbook(copy, mx);
}
const errors = (r: ReturnType<typeof importWorkbook>) => r.issues.filter((i) => i.level === 'error').map(formatIssue);

describe('import', () => {
  it('compiles the master rules without errors, and the generated data is up to date', () => {
    const r = importWorkbook(sheets, mx);
    expect(errors(r)).toEqual([]);
    expect(r.data).toEqual(gameData);
  });
  it('has the expected content', () => {
    expect(Object.keys(gameData.nations).length).toBe(10);
    expect(gameData.agents.priest).toMatchObject({ price: 6, edu: 2 });
    expect(gameData.nations.swedish.deck.length).toBe(4);
    expect(gameData.terrain.mountains).toMatchObject({ move: 'all', defence: 2 });
    expect(gameData.tribes.inca.loot).toEqual({ gold: 25 });
    expect(gameData.tribes.mapuche.loot).toEqual({ res: 'silver', amount: 3 });
    expect(gameData.tiles.length).toBe(74);
    expect(toId('Gentleman’s War')).toBe('gentlemans_war');
  });
  it('every entity has a Russian and an English name', () => {
    for (const k of ['agents', 'nations', 'buildings', 'fathers', 'events', 'ruins', 'wrecks', 'tactics', 'tribes', 'terrain', 'resources'] as const)
      for (const x of Object.values(gameData[k])) { expect(x.ru, x.id).toBeTruthy(); expect(x.en, x.id).toBeTruthy(); }
  });
  it.each([
    ['Tiles', 5, 'cell 3', 'lava.png', /Tiles, row 5, column "cell 3": unknown terrain "lava"/],
    ['Tiles', 5, 'bonus 2', '🪵', /not a village, ruin or wreck/],
    ['Tiles', 5, 'resource 2', 'village.png', /not a resource icon/],
    ['Tiles', 21, 'nickname', 21, /expected tile 20, got 21/],
    ['Agents', 5, 'price', 'three', /cannot read price/],
    ['Agents', 5, 'copies', -1, /expected a number/],
    ['Agents', 5, 'education', '🧠', /unknown education/],
    ['Agents', 5, 'nickname', 'Slave', /duplicate id "slave"/],
    ['Agents', 5, 'effect', 'производство: +2 🐟', /text of "fisherman".*was not checked/],
    ['Buildings', 9, 'requires', 'сарай', /unknown building "сарай"/],
    ['Europeans', 2, 'starting units', 'Траппер\nКороль', /no card "Король"/],
    ['Indians', 2, 'loot', '5 🍌', /unknown loot/],
    ['Fathers', 3, 'price', '3 🟡', /cannot read price/],
    ['Events', 3, 'nickname', 'New Event', /no effect defined for "new_event"/],
  ])('reports a bad cell in %s, row %i, %s', (sheet, row, col, value, message) => {
    const r = broken(sheet, row, col, value);
    expect(r.data).toBe(null);
    expect(errors(r).some((e) => message.test(e)), errors(r).join('\n')).toBe(true);
  });
  it('reports a missing sheet', () => {
    expect(errors(importWorkbook(sheets.filter((s) => s.sheet !== 'Fathers'), mx))).toContain('ERROR: Fathers: sheet is missing');
  });
  it('warns when an effect needs more copies than exist', () => {
    const r = broken('Agents', 3, 'copies', 1);
    expect(r.issues.some((i) => i.level === 'warning' && /sepulveda/.test(i.message))).toBe(true);
  });
});

describe('rulesets', () => {
  const rs = (o: object, sandbox = false) => ({ id: 't', title: '', sandbox, overrides: [{ id: 'x', why: '', set: {}, ...o }] }) as never;
  it('a ruleset on board without changes plays as board, also one made on the old pc', () => {
    expect(compileRuleset(gameData, { id: 'mine', title: '', base: 'board', overrides: [] }).rulesetHash).toBe(loadRuleset('board').rulesetHash);
    expect(compileRuleset(gameData, { id: 'old', title: '', base: 'pc', overrides: [] }).rulesetHash).toBe(loadRuleset('board').rulesetHash);
  });
  it('overrides numbers, lists and card values', () => {
    const d = compileRuleset(gameData, rs({ set: { 'agents.priest.price': 5, 'settings.tax.track': [0, 0], 'fathers.hernan_cortes.mods.0.add': 3 } }, true));
    expect([d.agents.priest.price, d.settings.tax.track, (d.fathers.hernan_cortes.mods[0] as { add: number }).add]).toEqual([5, [0, 0], 3]);
    expect(gameData.agents.priest.price).toBe(6);
    expect(Object.isFrozen(d.settings.tax)).toBe(true);
    expect(d.rulesetHash).not.toBe(loadRuleset('board').rulesetHash);
  });
  it('rejects unknown paths and wrong types', () => {
    expect(() => compileRuleset(gameData, rs({ set: { 'agents.wizard.price': 5 } }, true))).toThrow(/unknown path/);
    expect(() => compileRuleset(gameData, rs({ set: { 'agents.priest.cost': 5 } }, true))).toThrow(/unknown path/);
    expect(() => compileRuleset(gameData, rs({ set: { 'agents.priest.price': 'five' } }, true))).toThrow(/expects number/);
  });
  it('changes must be convertible to the table unless in a sandbox', () => {
    const set = { 'agents.priest.price': 5 };
    expect(() => compileRuleset(gameData, rs({ set }))).toThrow(RulesetError);
    expect(() => compileRuleset(gameData, rs({ set, conversion: 'notConvertible' }))).toThrow(/sandbox/);
    expect(() => compileRuleset(gameData, rs({ set, conversion: 'direct' }))).toThrow(/table wording/);
    expect(() => compileRuleset(gameData, rs({ set, conversion: 'component', table: 'x' }))).toThrow(/components/);
    expect(() => compileRuleset(gameData, rs({ set, conversion: 'interface' }))).toThrow(/interface only/);
    expect(compileRuleset(gameData, rs({ set, conversion: 'direct', table: 'Priest costs 5 gold' })).agents.priest.price).toBe(5);
  });
});
