import type { Choice, View } from '@col/engine';
import { nextU32, seedRng } from '@col/engine';

/** A player. It sees only its own view and returns one of the legal choices. */
export interface Bot { name: string; choose(v: View): Choice }

/** Weights that make a random player actually settle, so that fuzzing reaches the later game. */
const EAGER: Record<string, number> = {
  'play:found': 60, 'play:build': 12, 'play:work': 8, 'play:produce': 4, 'play:docks': 4, 'play:trade': 12, 'play:teach': 6, 'play:attack': 3, 'play:alliance': 4,
  'play:hire': 0.5, 'play:exchange': 0.1, 'play:supply': 0.3, 'play:moveInfantry': 2, 'disembark:': 5, 'explore:': 3, 'cargo:': 4, 'end:': 0.3, 'pass:': 0.1, 'recruit:': 2,
};
/** Uniform over kinds of action first, so rare actions are exercised as often as common ones. */
export function randomBot(seed: string, eager = false): Bot {
  const rng = seedRng(seed);
  const pick = <T>(a: T[]): T => a[Math.floor((nextU32(rng) / 4294967296) * a.length)];
  return {
    name: eager ? 'random-eager' : 'random',
    choose(v) {
      const groups = new Map<string, Choice[]>();
      for (const c of v.legal) {
        const k = `${c.c}:${c.a ?? ''}`;
        const g = groups.get(k);
        if (g) g.push(c); else groups.set(k, [c]);
      }
      const keys = [...groups.keys()];
      if (eager) {
        const w = keys.map((k) => EAGER[k] ?? 1);
        let x = (nextU32(rng) / 4294967296) * w.reduce((m, y) => m + y, 0);
        const i = w.findIndex((y) => (x -= y) < 0);
        return pick(groups.get(keys[i < 0 ? 0 : i])!);
      }
      // Passing early would hide most of the game.
      const some = v.state.pending?.kind === 'turn' && keys.length > 1 ? keys.filter((k) => k !== 'pass:' || nextU32(rng) % 8 === 0) : keys;
      return pick(groups.get(pick(some.length ? some : keys))!);
    },
  };
}

/** A seeded source of numbers from 0 to 1. */
export function seedRandom(seed: string): () => number {
  const r = seedRng(seed);
  return () => nextU32(r) / 4294967296;
}
