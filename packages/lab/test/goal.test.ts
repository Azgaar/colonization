import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@col/data';
import { applyInPlace, choiceKey, clone, createGame, legal, viewFor, type State } from '@col/engine';
import { goalBot, holdChance, PERSONALITIES, planDefence, randomBot, type Personality } from '@col/bots';
import { playGame } from '../src/play.ts';
import { runGame } from '../src/pool.ts';
import { table } from '../src/design.ts';
import { leaderWins, PER_GAME } from '../src/metrics.ts';
import { mean, wilson } from '../src/stats.ts';

const def = loadRuleset(), all = Object.keys(def.nations);
const names = Object.keys(PERSONALITIES) as Personality[];

describe('goal-driven bot', () => {
  it('finishes checked games at every player count and personality', () => {
    for (let n = 1; n <= 5; n++) for (let k = 0; k < 2; k++) {
      const nations = all.slice(k * 5, k * 5 + n);
      const bots = nations.map((_, p) => goalBot(`${n}${k}${p}`, PERSONALITIES[names[(p + k * 4 + n) % names.length]]));
      expect(playGame({ def, seed: `g${n}${k}`, nations, bots, check: true, logging: true }).state.over).not.toBe(null);
    }
  });
  it('is deterministic', () => {
    const run = () => playGame({ def, seed: 'det', nations: all.slice(0, 3), bots: [0, 1, 2].map((p) => goalBot(`d${p}`)) }).choices;
    expect(choiceKey(run())).toBe(choiceKey(run()));
  });
  it('decides the same when only hidden things differ', () => {
    const s: State = createGame({ def, seed: 'fair', nations: all.slice(0, 3) });
    const drive = [0, 1, 2].map((p) => goalBot(`f${p}`));
    let checked = 0;
    for (let i = 0; i < 260 && !s.over; i++) {
      const p = s.pending!.player;
      if (i % 5 === 0) {
        const t = clone(s);
        t.rng = [1, 2, 3, 4];
        for (const k of ['agentDeck', 'fatherDeck', 'eventDeck', 'tribeDeck', 'tacticDeck', 'ruinDeck', 'wreckDeck'] as const) t[k].reverse();
        t.players.forEach((pl, q) => { if (q !== p) { const cards = [...pl.deck, ...pl.hand].sort(); pl.hand = cards.slice(0, pl.hand.length); pl.deck = cards.slice(pl.hand.length); } else pl.deck.reverse(); });
        t.map = { ...t.map, terrain: t.map.terrain.map((x, c) => (t.map.frag[c] < 0 || t.revealed[t.map.frag[c]] ? x : 'mountains')), poi: t.map.poi.map((x, c) => (t.map.frag[c] < 0 || t.revealed[t.map.frag[c]] ? x : 'village')) };
        expect(choiceKey(goalBot('same').choose(viewFor(t, p)))).toBe(choiceKey(goalBot('same').choose(viewFor(s, p))));
        checked++;
      }
      applyInPlace(s, drive[p].choose(viewFor(s, p)));
    }
    expect(checked).toBeGreaterThan(20);
  });
  it('says why it chose', () => {
    const s = createGame({ def, seed: 'why', nations: all.slice(0, 2) });
    while (s.pending!.kind !== 'turn') applyInPlace(s, legal(s)[0]);
    const b = goalBot('w'), c = b.choose(viewFor(s, s.pending!.player));
    expect(b.last[0].choice).toEqual(c);
    expect(b.last[0].why.length).toBeGreaterThan(0);
    expect(b.last[0].score).toBeGreaterThanOrEqual(b.last[1].score);
  });
  it('scores far above a random player', () => {
    const mine: number[] = [], his: number[] = [];
    for (let i = 0; i < 12; i++) {
      const { state } = playGame({ def, seed: `r${i}`, nations: all.slice(i % 8, (i % 8) + 2), bots: [goalBot(`a${i}`), randomBot(`b${i}`)] });
      mine.push(state.over!.players[0].score);
      his.push(state.over!.players[1].score);
    }
    expect(mean(mine)).toBeGreaterThan(mean(his) + 4);
  });
});

describe('war planning', () => {
  it('chance to hold', () => {
    expect(holdChance(0)).toBe(1);
    expect(holdChance(-3)).toBe(1);
    expect(holdChance(3)).toBeCloseTo((2 / 3) ** 3);
    expect(holdChance(30)).toBeCloseTo((2 / 3) ** 10);
    expect(holdChance(2, 2, 2)).toBeCloseTo(1 - 1 / 9);
  });
  it('concentrates on what can be held instead of spreading thin', () => {
    const s = createGame({ def, seed: 'plan', nations: all.slice(0, 2) });
    const land = [5 * 16 + 5, 5 * 16 + 9];
    s.map = { ...s.map, terrain: s.map.terrain.map((_, c) => (land.includes(c) ? 'grassland' : 'ocean')) };
    s.revealed = s.revealed.map(() => true);
    s.colonies = land.map((cell) => ({ cell, owner: 0 }));
    s.players[0].inf = 'europe';
    s.war = { loyalist: 1, tactic: 'gentlemans_war', pool: 16, order: [0, 1], turn: [1, 0], hands: { 0: ['dragoon', 'dragoon', 'soldier'], 1: [] }, gained: { 0: [], 1: [] }, swapped: { 0: [], 1: [] }, supply: { militia: 18, mercenary: 18 }, sieges: land.map((cell, k) => ({ owner: 0, cell, slot: k + 1, cubes: 8, stacks: {}, betrayed: 0 })) };
    s.pending = { kind: 'militia', player: 0 };
    const r = planDefence(viewFor(s, 0), ['dragoon', 'dragoon', 'soldier'], { freeCubes: 0, maxMilitia: 0, perBell: 1, maxMercs: 0, bellCost: 1, goldCost: 0.5 });
    // One colony is brought up to holding for sure; the other gets what is left.
    expect(Math.max(...r.plan.cubes)).toBe(7);
  });
});

describe('lab', () => {
  it('plans balanced tables', () => {
    const t = table(def, { prefix: 'x', games: 100, players: 4, bots: [{ kind: 'random' }, { kind: 'eager' }] });
    const count: Record<string, number> = {};
    for (const g of t) { expect(new Set(g.nations).size).toBe(4); for (const n of g.nations) count[n] = (count[n] ?? 0) + 1; }
    expect(Math.max(...Object.values(count)) - Math.min(...Object.values(count))).toBeLessThanOrEqual(12);
  });
  it('records add up', () => {
    const r = runGame({ seed: 'rec', nations: all.slice(0, 4), bots: Array(4).fill({ kind: 'goal', name: 'g' }) });
    r.parts.forEach((x, p) => expect(Object.values(x).reduce((a, b) => a + b, 0)).toBe(r.scores[p]));
    r.bells.forEach((b, p) => {
      const net = Object.entries(b).reduce((n, [k, v]) => n + (k.startsWith('+') ? v : -v), 0);
      // A destroyed nation scores nothing (DD-147).
      if (r.sides[p] === 'patriot' && r.qualifies[p]) expect(r.parts[p].bells ?? 0).toBe(Math.floor(net / def.settings.score.bellsPerPoint) * def.settings.score.perBell);
    });
    for (const f of Object.values(PER_GAME)) { const v = f(r); expect(v === null || Number.isFinite(v)).toBe(true); }
    expect(leaderWins(r, 99)).toBe(null);
  });
  it('changes apply to one experiment only', () => {
    const spec = { seed: 'chg', nations: all.slice(0, 3), bots: Array(3).fill({ kind: 'goal', name: 'g' }) };
    const a = runGame(spec), b = runGame({ ...spec, changes: { 'settings.tax.refuseRef': 0 } }), c = runGame(spec);
    expect(b.pool).toBeLessThan(a.pool);
    expect(c.scores).toEqual(a.scores);
  });
  it('intervals', () => { const [a, b] = wilson(25, 100); expect(a).toBeLessThan(0.25); expect(b).toBeGreaterThan(0.25); expect(b - a).toBeCloseTo(0.17, 1); });
});
