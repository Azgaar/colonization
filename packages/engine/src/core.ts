import type { Choice, Decision, LogEntry, State, Task } from './types.ts';

type TaskFn = (s: State, t: any) => void;
interface DecisionHandler {
  options(s: State, d: any): Choice[];
  resolve(s: State, d: any, c: any): void;
  /** Ask even when there is only one option. */
  always?: boolean;
}

export const tasks: Record<string, TaskFn> = {};
export const decisions: Record<string, DecisionHandler> = {};
export const task = (name: string, fn: TaskFn) => { tasks[name] = fn; };
export const decision = (name: string, h: DecisionHandler) => { decisions[name] = h; };

/** Queue tasks so that the first one runs first. */
export function push(s: State, ...list: Task[]) { for (let i = list.length - 1; i >= 0; i--) s.stack.push(list[i]); }

export function ask(s: State, d: Decision) {
  const h = decisions[d.kind];
  const opts = h.options(s, d);
  if (opts.length === 0) throw new Error(`decision "${d.kind}" has no options`);
  if (opts.length === 1 && !h.always) return h.resolve(s, d, opts[0]);
  s.pending = d;
}

export function log(s: State, e: LogEntry) { if (s.logging) s.log.push(e); }

export function run(s: State) {
  let guard = 0;
  while (!s.pending && !s.over) {
    const t = s.stack.pop();
    if (!t) throw new Error('game has nothing left to do');
    if (++guard > 100000) throw new Error(`endless loop at task "${t.t}"`);
    tasks[t.t](s, t);
  }
}

export const legal = (s: State): Choice[] => (s.pending ? decisions[s.pending.kind].options(s, s.pending) : []);

const canon = (v: unknown): string =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? `{${Object.keys(v).sort().map((k) => `${k}:${canon((v as Record<string, unknown>)[k])}`).join()}}`
    : Array.isArray(v) ? `[${v.map(canon).join()}]` : JSON.stringify(v);
export const choiceKey = canon;

export class IllegalChoice extends Error {}

/** Apply a choice in place. Throws IllegalChoice, leaving the state untouched, if it is not legal. */
export function applyInPlace(s: State, c: Choice, trusted = false) {
  const d = s.pending;
  if (!d) throw new IllegalChoice(s.over ? 'The game is over' : 'No decision is pending');
  if (!trusted) {
    const k = canon(c);
    if (!legal(s).some((o) => canon(o) === k)) throw new IllegalChoice(`"${k}" is not a legal choice for "${d.kind}"`);
  }
  s.pending = null;
  decisions[d.kind].resolve(s, d, c);
  run(s);
}

const SHARED = new Set(['def', 'map', 'node', 'nodes', 'rest', 'opts']);
function copy(v: unknown): unknown {
  if (Array.isArray(v)) {
    const n = v.length, a = new Array(n);
    for (let i = 0; i < n; i++) { const x = v[i]; a[i] = x !== null && typeof x === 'object' ? copy(x) : x; }
    return a;
  }
  const o: Record<string, unknown> = {};
  for (const k in v as object) {
    const x = (v as Record<string, unknown>)[k];
    o[k] = x !== null && typeof x === 'object' && !SHARED.has(k) ? (k === 'log' ? (x as unknown[]).slice() : copy(x)) : x;
  }
  return o;
}
export const clone = (s: State): State => copy(s) as State;
