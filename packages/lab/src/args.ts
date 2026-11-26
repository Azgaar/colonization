/** Small command-line helpers shared by the lab's scripts. */
import { PERSONALITIES, type Personality } from '@col/bots';
import type { BotSpec } from './game.ts';
import type { SweepAxis } from './sweeps.ts';

/** Positional arguments and `--name value` options. */
export function parseArgs(argv: string[]): { pos: string[]; opt: Record<string, string> } {
  const pos: string[] = [], opt: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const [k, v] = a.slice(2).split('=', 2); opt[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'); } else pos.push(a);
  }
  return { pos, opt };
}
/** `mixed` (every personality, the default), `random`, `eager`, or a comma list of personalities and those two. */
export function botsFrom(s = 'mixed'): BotSpec[] {
  const names = s === 'mixed' ? Object.keys(PERSONALITIES) : s.split(',');
  return names.map((n): BotSpec => {
    if (n === 'random' || n === 'eager') return { kind: n };
    if (!(n in PERSONALITIES)) throw new Error(`unknown bot "${n}": use mixed, random, eager or ${Object.keys(PERSONALITIES).join(', ')}`);
    return { kind: 'goal', name: n, personality: n as Personality };
  });
}
/** Split on commas outside brackets, so lists can be values: `a=[1,2],[3,4]`. */
const split = (s: string) => { const out: string[] = []; let depth = 0, at = 0; [...s].forEach((ch, i) => { if (ch === '[' || ch === '{') depth++; else if (ch === ']' || ch === '}') depth--; else if (ch === ',' && !depth) { out.push(s.slice(at, i)); at = i + 1; } }); out.push(s.slice(at)); return out; };
const value = (s: string): unknown => { try { return JSON.parse(s); } catch { return s; } };
/** `path=1,2,3`, `path=from:to:step` or JSON values such as `path=true,false` and `path=[0,1],[1,2]`. */
export function parseAxis(arg: string): SweepAxis {
  const eq = arg.indexOf('=');
  if (eq < 1) throw new Error(`"${arg}": expected path=values`);
  const path = arg.slice(0, eq), v = arg.slice(eq + 1), range = /^(-?[\d.]+):(-?[\d.]+)(?::(-?[\d.]+))?$/.exec(v);
  if (range) {
    const [a, b, step = 1] = [Number(range[1]), Number(range[2]), Number(range[3] ?? 1)];
    if (!(step > 0)) throw new Error(`"${arg}": the step must be positive`);
    const values: number[] = [];
    // Rounding keeps decimal steps such as 0.1 from drifting.
    for (let x = a; x <= b + step / 1e6; x += step) values.push(Math.round(x * 1e6) / 1e6);
    return { path, values };
  }
  return { path, values: split(v).map(value) };
}
