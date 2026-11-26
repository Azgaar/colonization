import type { State } from './types.ts';

/** sfc32 seeded from a string. All randomness in the game goes through here. */
export function seedRng(seed: string): [number, number, number, number] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  const next = () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
  const r: [number, number, number, number] = [next(), next(), next(), next()];
  for (let i = 0; i < 12; i++) nextU32(r);
  return r;
}
export function nextU32(r: [number, number, number, number]): number {
  const t = (((r[0] + r[1]) | 0) + r[3]) | 0;
  r[3] = (r[3] + 1) | 0;
  r[0] = r[1] ^ (r[1] >>> 9);
  r[1] = (r[2] + (r[2] << 3)) | 0;
  r[2] = (r[2] << 21) | (r[2] >>> 11);
  r[2] = (r[2] + t) | 0;
  return t >>> 0;
}
export const below = (s: State, n: number): number => Math.floor((nextU32(s.rng) / 4294967296) * n);
/** A die. In a sandbox, forced results come first. */
export const die = (s: State): number => s.forced?.dice?.length ? s.forced.dice.shift()! : below(s, 6) + 1;
export const dice = (s: State, n: number): number[] => Array.from({ length: n }, () => die(s));
export function shuffle<T>(s: State, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = below(s, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
