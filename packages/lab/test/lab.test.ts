import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@col/data';
import { runGame, type BotSpec } from '../src/game.ts';
import { planSweep, sweep, sweepMarkdown } from '../src/sweeps.ts';
import { detect, detectMarkdown } from '../src/detectors.ts';
import type { GameRecord } from '../src/record.ts';
import { mean } from '../src/stats.ts';

const bots: BotSpec[] = [{ kind: 'random' }, { kind: 'eager' }];

describe('sweep', () => {
  it('plays the same seeds, nations and seats at every point of the grid', () => {
    const plan = planSweep({ paths: [{ path: 'settings.tax.refuseRef', values: [1, 2] }, { path: 'settings.war.refStrength', values: [1, 2, 3] }], games: 3, players: 2, bots });
    expect(plan.points.map((p) => p.label)).toEqual(['refuseRef=1, refStrength=1', 'refuseRef=1, refStrength=2', 'refuseRef=1, refStrength=3', 'refuseRef=2, refStrength=1', 'refuseRef=2, refStrength=2', 'refuseRef=2, refStrength=3']);
    const seats = plan.specs.map((s) => s.map((g) => [g.seed, g.nations, g.bots]));
    for (const s of seats) expect(s).toEqual(seats[0]);
    expect(plan.specs[4][0].changes).toEqual({ 'settings.tax.refuseRef': 2, 'settings.war.refStrength': 2 });
    expect(() => planSweep({ paths: [{ path: 'settings.nope', values: [1] }], games: 1, players: 2, bots })).toThrow(/unknown path/);
  });
  it('aggregates means and paired differences against the first point', async () => {
    const key = 'REF cubes in the war';
    // The first two points are the same rules, so their games must be identical.
    const { result, records } = await sweep({ paths: [{ path: 'settings.tax.refuseRef', values: [2, 2, 0] }], games: 4, players: 2, bots, keys: [key, 'rounds played'] }, async (specs) => specs.map(runGame));
    expect(records.map((r) => r.length)).toEqual([4, 4, 4]);
    expect(records[1]).toEqual(records[0]);
    expect(result.points[1].metrics[key]).toMatchObject({ diff: 0, significant: false, pairs: 4 });
    const a = records[0].map((r) => r.pool), c = records[2].map((r) => r.pool);
    expect(result.points[2].metrics[key].mean).toBeCloseTo(mean(c));
    expect(result.points[2].metrics[key].diff).toBeCloseTo(mean(c.map((x, i) => x - a[i])));
    expect(sweepMarkdown(result)).toContain('| settings.tax.refuseRef |');
  });
});

describe('detect', () => {
  const def = loadRuleset(), [bad, dead, fine] = Object.keys(def.fathers);
  const nations = Object.keys(def.nations).slice(0, 4), m = () => [{}, {}, {}, {}] as Record<string, number>[];
  // Seat i % 4 wins and led at round 3; the seat after it always holds `bad`; nobody takes `dead`; `fine` goes round all seats.
  const synth = (i: number): GameRecord => {
    const w = i % 4, scores = [10, 10, 10, 10].map((x, p) => (p === w ? x + 3 : x));
    return {
      seed: `s${i}`, ruleset: 'board', n: 4, nations, bots: ['a', 'b', 'c', 'd'], first: 0, rounds: 9, reason: 'round', choices: 400, plays: 60,
      winners: [w], scores, parts: m(), sides: ['patriot', 'patriot', 'patriot', 'patriot'], colonies: [2, 2, 2, 2], founded: [2, 2, 2, 2], qualifies: [true, true, true, true],
      loyalist: null, tactic: '', pool: 20, refBy: {}, foundRounds: [[], [], [], []], scoreByRound: Array.from({ length: 9 }, (_, r) => scores.map((_x, p) => r + (p === w && r >= 2 ? 2 : 0))),
      priceEnd: {}, gold: m(), bells: m(), crosses: m(), tax: [], actions: m(), hired: m(),
      fathers: [0, 1, 2, 3].map((p) => [...(p === (w + 1) % 4 ? [bad] : []), ...(p === (i + Math.floor(i / 4)) % 4 ? [fine] : [])]), buildings: [[], [], [], []], agents: [[], [], [], []],
      sieges: [], attacks: [], settlements: { total: 6, gone: 0, allied: 0, hostile: 0 }, frags: 10, events: [], poi: {}, raids: 0, gifts: 0, passesWithCards: 0, peak: {}, sold: {},
      offered: [0, 1, 2, 3].map(() => ({ [`father.${bad}`]: 1, [`father.${dead}`]: 1, [`father.${fine}`]: 1 })), decisions: [100, 100, 100, 100], forced: [5, 5, 5, 5],
    };
  };
  it('finds a planted dead card, a dominated card and a runaway leader', () => {
    const d = detect(Array.from({ length: 400 }, (_, i) => synth(i)), def);
    const flagged = (kind: string, subject: string) => d.findings.find((f) => f.kind === kind && f.subject === subject)?.level;
    expect(flagged('dead card', `father.${dead}`)).toBe('flag');
    expect(flagged('dominated option', `father.${bad}`)).toBe('flag');
    expect(flagged('runaway leader', 'leader at round 3 wins')).toBe('flag');
    expect(flagged('dominated option', `father.${fine}`)).toBeUndefined();
    expect(flagged('stall', 'passes with cards left')).toBe('ok');
    expect(detectMarkdown(d)).toContain(`father.${dead}`);
  });
});
