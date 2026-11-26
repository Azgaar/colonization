import { beforeAll, describe, expect, it } from 'vitest';
import { applyInPlace, choiceKey, createGame, replay, viewFor, type Choice } from '@col/engine';
import { goalBot, PERSONALITIES } from '@col/bots';
import { loadRuleset } from '@col/data';
import { exportState } from '../src/view.ts';
import { plural } from '../src/plural.ts';

// The session keeps its saved game in the browser's storage; a map stands in for it here.
const store = new Map<string, string>();
beforeAll(() => { (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }; });
const session = async () => (await import('../src/sim.ts')).Sim;

describe('what the interface shows', () => {
  it('shows only the viewer\'s own hand and deck', () => {
    const s = createGame({ def: loadRuleset('board'), seed: 'view', nations: ['french', 'english', 'spanish'] });
    const v = exportState(s, 1);
    expect(v.players[1].hand).toEqual(s.players[1].hand);
    expect(v.players[0].hand).toBe(s.players[0].hand.length);
    expect(v.players[2].deck).toBe(s.players[2].deck.length);
  });
});

describe('the game session', () => {
  it('starts a game from a setup and can take back a choice, but not the others\' turns', async () => {
    const Sim = await session();
    Sim.start({ nations: ['french', 'english'], bots: ['balanced'], ruleset: 'board', seed: 'undo' });
    expect(Sim.D.players).toHaveLength(2);
    // Through the setup decisions (start cells) to the player's first turn.
    for (let i = 0; i < 20 && Sim.kind() !== 'turn'; i++) { if (Sim.mine()) Sim.apply(Sim.legal()[0]); await Sim.run(() => {}); }
    expect(Sim.kind()).toBe('turn');
    Sim.mark(); Sim.apply({ c: 'pass' });
    expect(Sim.canUndo()).toBe(true);
    // Once the bots have played, what they did is known: nothing before it can be taken back.
    while (Sim.mine()) Sim.apply(Sim.legal()[0]);
    Sim.mark();
    expect(Sim.canUndo()).toBe(true);
    await Sim.run(() => {});
    expect(Sim.canUndo()).toBe(false);
  });
  it('replays a recorded game to any choice exactly as the engine does', async () => {
    const def = loadRuleset('board'), seed = 'watch', nations = ['french', 'english', 'dutch'];
    const bots = nations.map((_, p) => goalBot(`${seed}${p}`, PERSONALITIES.balanced)), s = createGame({ def, seed, nations }), choices: Choice[] = [];
    while (!s.over) { const c = bots[s.pending!.player].choose(viewFor(s, s.pending!.player)); choices.push(c); applyInPlace(s, c); }
    const Sim = await session();
    Sim.watch({ ruleset: 'board', rulesetHash: def.rulesetHash, seed, nations, choices });
    for (const at of [choices.length >> 1, 10, choices.length]) {
      Sim.seek(at);
      expect(choiceKey(Sim.s.log)).toBe(choiceKey(replay({ def, seed, nations, logging: true }, choices, at).log));
    }
    expect(Sim.mine()).toBe(false);
  });
});

describe('words', () => {
  it('picks the Russian form for a number', () => {
    expect([1, 2, 5, 11, 21, 23, 112].map((n) => plural(n, 'клетка', 'клетки', 'клеток'))).toEqual(['клетка', 'клетки', 'клеток', 'клеток', 'клетка', 'клетки', 'клеток']);
  });
});
