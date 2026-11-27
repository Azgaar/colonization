import { expect } from 'vitest';
import type { Icon, Poi, Resource, TerrainId } from '@col/data';
import { compileRuleset, gameData, loadRuleset } from '@col/data';
import type { Choice, State, Task } from '../src/index.ts';
import { applyInPlace, createGame, legal, seedRng } from '../src/index.ts';
import { decision, push, run, task } from '../src/core.ts';
import { die } from '../src/rng.ts';
import { emptyStock } from '../src/util.ts';

export const def = loadRuleset('board');
export const defWith = (set: Record<string, unknown>) => compileRuleset(gameData, { id: 'test', title: '', sandbox: true, overrides: [{ id: 'x', why: 'test', set }] });
/** `board` with more changes on top. */
export const boardWith = (set: Record<string, unknown>) => compileRuleset(gameData, { id: 'test', title: '', base: 'board', sandbox: true, overrides: [{ id: 'x', why: 'test', set }] });
export const at = (r: number, c: number) => r * 16 + c;
export const NATIONS = ['english', 'french', 'dutch', 'spanish', 'portuguese'];

task('stop', (s) => { s.pending = { kind: 'stop', player: -1 }; });
decision('stop', { options: () => [], resolve: () => {} });

/** A game at player 0's first turn, on an all-ocean revealed map, ships in Europe at (0,0), (0,2)... */
export function game(n = 2, d = def): State {
  const s = createGame({ def: d, seed: 'test', nations: NATIONS.slice(0, n) });
  while (s.pending!.kind === 'startCell') applyInPlace(s, { c: 'start', cell: at(0, 2 * s.pending!.player) });
  s.first = 0;
  s.current = 0;
  world(s, {});
  turn(s, 0);
  return s;
}
type Spec = TerrainId | { t: TerrainId; bonus?: Icon; poi?: Poi };
export function world(s: State, land: Record<number, Spec>) {
  const n = s.map.zone.length;
  s.map = { ...s.map, terrain: Array(n).fill('ocean'), bonus: Array(n).fill(null), poi: Array(n).fill(null) };
  for (const [k, v] of Object.entries(land)) {
    const x = typeof v === 'string' ? { t: v } : v;
    s.map.terrain[+k] = x.t;
    s.map.bonus[+k] = (x as { bonus?: Icon }).bonus ?? null;
    s.map.poi[+k] = (x as { poi?: Poi }).poi ?? null;
  }
  s.revealed = s.revealed.map(() => true);
  s.poi = {};
  s.settlements = [];
  s.hostility = {};
}
export function settle(s: State, tribe: string, cell: number, o: { pop?: number; hostility?: number; ally?: number | null } = {}) {
  const t = s.def.tribes[tribe];
  s.settlements.push({ n: s.settlements.length + 1, cell, tribe, pop: o.pop ?? t.population, ally: o.ally ?? null, alive: true });
  s.hostility[tribe] = o.hostility ?? s.hostility[tribe] ?? t.hostility;
  return s.settlements.at(-1)!;
}
export const colony = (s: State, p: number, cell: number) => { s.colonies.push({ cell, owner: p }); };
export const stock = (x: Partial<Record<Resource, number>>) => ({ ...emptyStock(), ...x });
export function build(s: State, p: number, ...b: string[]) { for (const x of b) { s.players[p].buildings.push(x); s.buildingsLeft[x]--; } }
export function father(s: State, p: number, ...f: string[]) {
  for (const x of f) {
    for (const z of [s.salon, s.fatherDeck]) { const i = z.indexOf(x); if (i >= 0) z.splice(i, 1); }
    s.players[p].fathers.push(x);
  }
}
/** Give a player exactly this hand, and make it their turn. */
export function turn(s: State, p: number, ...hand: string[]) {
  s.stack = [];
  s.over = null;
  s.move = null;
  s.combat = null;
  s.current = p;
  if (hand.length) s.players[p].hand = [...hand];
  s.pending = { kind: 'turn', player: p };
}
const matches = (c: Choice, m: Record<string, unknown>) => Object.entries(m).every(([k, v]) => c[k] === v);
export const can = (s: State, m: Record<string, unknown>) => legal(s).some((c) => matches(c, m));
export function act(s: State, ...list: Record<string, unknown>[]): State {
  for (const m of list) {
    const c = legal(s).find((x) => matches(x, m));
    if (!c) throw new Error(`not legal at "${s.pending?.kind}": ${JSON.stringify(m)}; options: ${JSON.stringify(legal(s)).slice(0, 600)}`);
    applyInPlace(s, c);
  }
  return s;
}
export const play = (s: State, card: string, a: string, o: object = {}) => act(s, { c: 'play', card, a, ...o });
export const canPlay = (s: State, card: string, a: string, o: object = {}) => can(s, { c: 'play', card, a, ...o });
export function runTasks(s: State, ...list: Task[]): State {
  s.pending = null;
  s.stack = [];
  push(s, ...list, { t: 'stop' });
  run(s);
  return s;
}
export function event(s: State, id: string): State {
  s.event = id;
  return runTasks(s, { t: 'nodes', nodes: s.def.events[id].do, p: s.first });
}
/** Make the next dice come up as given. */
export function rig(s: State, ...want: number[]) {
  for (let i = 0; ; i++) {
    s.rng = seedRng(`rig${i}`);
    if (want.every((w) => die(s) === w)) { s.rng = seedRng(`rig${i}`); return; }
  }
}
/** Resolve a ruin or wreck as if the token had just entered it. */
export function poi(s: State, deck: 'ruin' | 'wreck', id: string, card = 'colonist'): State {
  (deck === 'ruin' ? s.ruinDeck : s.wreckDeck).push(id);
  s.move = { player: 0, token: deck === 'ruin' ? 'infantry' : 'ship', points: 3, ended: false, scout: card === 'scout', card };
  if (deck === 'ruin' && typeof s.players[0].inf !== 'number') { s.map.terrain[at(6, 6)] = 'grassland'; s.players[0].inf = at(6, 6); }
  if (deck === 'wreck' && s.map.zone[s.players[0].ship] === 'europe') s.players[0].ship = at(6, 5);
  return runTasks(s, { t: 'poi', p: 0, deck });
}
export const opt = (s: State, id: string, o: object = {}) => act(s, { c: 'option', id, ...o });
export const P = (s: State, p = 0) => s.players[p];
export const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
export { expect };
