import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Choice, State } from '../src/index.ts';
import { actionsFor, apply, applyInPlace, choiceKey, clone, createGame, legal, load, problems, replay, save, viewFor } from '../src/index.ts';
import { shuffle } from '../src/rng.ts';
import { at, colony, def, game, NATIONS, P, turn, world } from './h.ts';

const config = (seed: string, n: number) => ({ def, seed, nations: NATIONS.slice(0, n) });
/** Play with a simple deterministic picker, stopping after some choices. */
function wander(seed: string, n: number, steps: number): { s: State; choices: Choice[] } {
  const s = createGame(config(seed, n));
  const choices: Choice[] = [];
  let h = seed.length * 7 + 1;
  while (!s.over && choices.length < steps) {
    const o = legal(s);
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const c = o[(h >>> 8) % o.length];
    choices.push(c);
    applyInPlace(s, c);
  }
  return { s, choices };
}
const bare = (s: State) => { const { def: _d, map: _m, ...rest } = s; return choiceKey(rest); };

describe('determinism and replay', () => {
  it('same seed and choices give the same game', () => {
    fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 8 }), fc.integer({ min: 1, max: 5 }), fc.integer({ min: 0, max: 250 }), (seed, n, steps) => {
      const { s, choices } = wander(seed, n, steps);
      expect(bare(replay(config(seed, n), choices))).toBe(bare(s));
    }), { numRuns: 25 });
  });
  it('replay can stop anywhere, which is how undo works', () => {
    const { choices } = wander('undo', 2, 60);
    expect(bare(replay(config('undo', 2), choices, 30))).toBe(bare(wander('undo', 2, 30).s));
  });
  it('invariants hold throughout', () => {
    fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 8 }), fc.integer({ min: 1, max: 5 }), (seed, n) => {
      const s = createGame(config(seed, n));
      let h = 5;
      for (let i = 0; i < 300 && !s.over; i++) {
        expect(problems(s)).toEqual([]);
        const o = legal(s);
        h = (Math.imul(h, 69069) + 1) >>> 0;
        applyInPlace(s, o[(h >>> 9) % o.length]);
      }
    }), { numRuns: 15 });
  });
  it('clones are independent and behave the same', () => {
    const { s } = wander('clone', 3, 80);
    const a = clone(s), before = bare(s);
    const c = legal(a)[0];
    applyInPlace(a, c);
    expect(bare(s)).toBe(before);
    expect(bare(apply(s, c))).toBe(bare(a));
  });
  it('saving and loading keeps the game', () => {
    for (const steps of [0, 40, 150]) {
      const { s } = wander('save', 3, steps);
      const t = load(save(s), def);
      expect(bare(t)).toBe(bare(s));
      for (let i = 0; i < 40 && !s.over; i++) { const c = legal(s)[0]; applyInPlace(s, c); applyInPlace(t, c); }
      expect(bare(t)).toBe(bare(s));
    }
    expect(() => load(save(wander('x', 1, 3).s), { ...def, rulesetHash: 'other' })).toThrow(/another version/);
  });
});

describe('hidden information', () => {
  /** Reshuffle everything seat p cannot see. The view must not change. */
  function scramble(s: State, p: number): State {
    const t = clone(s);
    t.rng = [9, 8, 7, 6];
    for (const k of ['agentDeck', 'fatherDeck', 'eventDeck', 'tribeDeck', 'tacticDeck', 'ruinDeck', 'wreckDeck'] as const) shuffle(t, t[k]);
    t.players.forEach((pl, i) => {
      if (i === p) { shuffle(t, pl.deck); return; }
      const all = shuffle(t, [...pl.hand, ...pl.deck]);
      pl.hand = all.slice(0, pl.hand.length);
      pl.deck = all.slice(pl.hand.length);
    });
    t.map = { ...t.map, terrain: t.map.terrain.map((x, i) => (t.map.frag[i] < 0 || t.revealed[t.map.frag[i]] ? x : 'desert')) };
    return t;
  }
  it('a view does not depend on what the seat cannot know', () => {
    for (let k = 0; k < 40; k++) {
      const n = 2 + (k % 4);
      const { s } = wander(`view${k}`, n, 10 + k * 12);
      if (s.over) continue;
      for (let p = 0; p < n; p++) {
        const show = (x: State) => { const v = viewFor(x, p); return choiceKey({ ...v, state: { ...v.state, def: 0 } }); };
        expect(show(scramble(s, p))).toBe(show(s));
      }
    }
  });
  it('views hide hands, decks, the map and other seats\' decisions', () => {
    const s = createGame(config('hide', 3));
    while (s.pending!.kind === 'startCell') applyInPlace(s, legal(s)[0]);
    const me = s.pending!.player, other = (me + 1) % 3;
    const v = viewFor(s, other);
    expect(v.legal).toEqual([]);
    expect(v.state.players[me].hand.every((c) => c === '?')).toBe(true);
    expect(v.state.players[other].hand).toEqual(s.players[other].hand);
    expect(v.state.agentDeck.every((c) => c === '?')).toBe(true);
    expect(v.state.map.terrain.filter((t, i) => s.map.zone[i] === 'map').every((t) => t === null)).toBe(true);
    expect(v.state.frags.every((f) => f === -1)).toBe(true);
    expect([v.state.seed, v.state.stack, v.state.log]).toEqual(['', [], []]);
  });
  it('cards committed to a battle stay hidden until it is resolved', () => {
    const s = game(2);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    P(s).inf = at(5, 5);
    P(s, 1).inf = at(5, 6);
    P(s, 1).hand = ['dragoon', 'colonist'];
    turn(s, 0, 'soldier', 'captain', 'sailor');
    applyInPlace(s, legal(s).find((c) => c.a === 'attack' && c.card === 'soldier')!);
    applyInPlace(s, { c: 'add', card: 'captain' });
    applyInPlace(s, { c: 'done' });
    const v = viewFor(s, 1);
    expect(v.state.combat!.a).toEqual([]);
    expect(v.state.players[0].hand.length).toBe(2);
  });
});

describe('explanations', () => {
  it('says why an action is not available', () => {
    const s = game(1);
    const why = Object.fromEntries(actionsFor(s, 0, 'colonist').map((a) => [a.action, a.why]));
    expect(why).toMatchObject({ produce: 'needs a colony', found: 'infantry must be on land', attack: 'needs an agent with ⚔️', trade: 'the hold is empty', moveShip: null });
    colony(s, 0, at(5, 5));
    P(s).ship = at(3, 3);
    expect(actionsFor(s, 0, 'colonist').find((a) => a.action === 'hire')!.why).toBe('the ship must be in Europe');
  });
});
