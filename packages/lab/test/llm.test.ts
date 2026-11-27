import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@col/data';
import { randomBot } from '@col/bots';
import { applyInPlace, createGame, viewFor } from '@col/engine';
import { decisionPrompt } from '../src/llm/describe.ts';

describe('llm prompt', () => {
  it('numbers every legal choice at every kind of decision', () => {
    const def = loadRuleset(), nations = Object.keys(def.nations).slice(0, 3), kinds = new Set<string>();
    for (const seed of ['p1', 'p2']) {
      const s = createGame({ def, seed, nations, logging: false }), bots = nations.map((_, p) => randomBot(`${seed}${p}`, true));
      while (!s.over) {
        const p = s.pending!.player, v = viewFor(s, p);
        if (v.legal.length > 1) {
          const text = decisionPrompt(v, { plan: 'x' });
          expect(text).toContain(`\n${v.legal.length - 1}: `);
          expect(text).not.toContain(`\n${v.legal.length}: `);
          kinds.add(s.pending!.kind);
        }
        applyInPlace(s, bots[p].choose(v));
      }
    }
    expect(kinds.size).toBeGreaterThan(8);
  });
});
