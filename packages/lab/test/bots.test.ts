import { expect, it } from 'vitest';
import { loadRuleset } from '@col/data';
import { randomBot } from '@col/bots';
import { playGame } from '../src/play.ts';

it('random bots finish games at every player count, from their views alone', () => {
  const def = loadRuleset();
  const all = Object.keys(def.nations);
  for (let n = 1; n <= 5; n++) for (const eager of [false, true]) {
    const nations = all.slice(n, 2 * n);
    const { state } = playGame({ def, seed: `b${n}${eager}`, nations, bots: nations.map((_, p) => randomBot(`${n}-${p}`, eager)), check: true });
    expect(state.over).not.toBe(null);
    expect(state.round).toBeLessThanOrEqual(10);
  }
});
