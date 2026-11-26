import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@col/data';
import { applyInPlace, choiceKey, clone, createGame, legal, problems, seedRng, viewFor, type State } from '@col/engine';
import { advise, botForLevel, determinize, goalBot, LEVELS, randomBot, searchBot, type Level } from '../src/index.ts';

const def = loadRuleset(), all = Object.keys(def.nations);
/** Positions from a goal-bot game: every k-th decision with 2+ options that the search does not hand to the goal bot. */
function positions(seed: string, n: number, k: number): State[] {
  const s = createGame({ def, seed, nations: all.slice(0, n), logging: false });
  const bots = s.players.map((_, p) => goalBot(`${seed}${p}`));
  const out: State[] = [];
  for (let i = 0; !s.over; i++) {
    const p = s.pending!.player;
    if (i % k === 0 && legal(s).length > 1 && s.pending!.kind !== 'move' && s.pending!.kind !== 'cargo') out.push(clone(s));
    applyInPlace(s, bots[p].choose(viewFor(s, p)), true);
  }
  return out;
}
/** The same view with another hidden truth. */
function scramble(s: State, p: number): State {
  const t = clone(s);
  t.rng = [1, 2, 3, 4];
  for (const k of ['agentDeck', 'fatherDeck', 'eventDeck', 'tribeDeck', 'tacticDeck', 'ruinDeck', 'wreckDeck'] as const) t[k].reverse();
  t.players.forEach((pl, q) => {
    if (q === p) { pl.deck.reverse(); return; }
    const cards = [...pl.deck, ...pl.hand].reverse();
    pl.hand = cards.slice(0, pl.hand.length);
    pl.deck = cards.slice(pl.hand.length);
  });
  const closed = (c: number) => t.map.frag[c] >= 0 && !t.revealed[t.map.frag[c]];
  t.map = { ...t.map, terrain: t.map.terrain.map((x, c) => (closed(c) ? 'mountains' : x)), poi: t.map.poi.map((x, c) => (closed(c) ? null : x)) };
  return t;
}
const key = (s: State, seed: string) => { const b = searchBot(seed, { iterations: 10 }); const c = b.choose(viewFor(s, s.pending!.player)); return { c: choiceKey(c), b }; };

describe('search bot', () => {
  const list = positions('srch', 2, 25).slice(0, 8);
  it('chooses a legal option, repeatably, within the budget and only from the view', () => {
    expect(list.length).toBeGreaterThan(4);
    for (const s of list) {
      const { c, b } = key(s, 'a');
      expect(legal(s).map(choiceKey)).toContain(c);
      expect(b.stats.errors).toBe(0);
      expect(b.stats.iterations).toBe(b.stats.searched * 10);
      expect(key(s, 'a').c).toBe(c);
      const p = s.pending!.player, t = scramble(s, p), show = (x: State) => { const v = viewFor(x, p); return choiceKey({ ...v, state: { ...v.state, def: 0 } }); };
      expect(show(t)).toBe(show(s));
      expect(key(t, 'a').c).toBe(c);
    }
  });
  it('samples hidden truths the engine can play to the end', () => {
    const rng = seedRng('det');
    for (const s of positions('det', 3, 29)) {
      const t = determinize(viewFor(s, s.pending!.player), rng);
      expect(problems(t)).toEqual([]);
      const r = randomBot('r');
      for (let i = 0; i < 20000 && !t.over; i++) applyInPlace(t, r.choose({ player: t.pending!.player, state: t, legal: legal(t), collections: [] }));
      expect(t.over).not.toBe(null);
    }
  });
  it('advises and plays at every level', () => {
    const s = list[2], v = viewFor(s, s.pending!.player), ok = legal(s).map(choiceKey);
    const tips = advise(v, { iterations: 8 });
    expect(tips.length).toBe(Math.min(3, ok.length));
    for (const x of tips) { expect(ok).toContain(choiceKey(x.choice)); expect(x.why).toMatch(/% of 8 samples/); }
    for (const l of Object.keys(LEVELS) as Level[]) expect(ok).toContain(choiceKey(botForLevel(l, 'x', 'trader', { iterations: 4 }).choose(v)));
  });
});
