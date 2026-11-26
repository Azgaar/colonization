/** One simulated game from a plain description. Pure: runs the same in Node, in worker threads and in the browser. */
import { compileRuleset, flattenRuleset, gameData, rulesets, type GameDef, type Override, type Ruleset } from '@col/data';
import { goalBot, PERSONALITIES, randomBot, searchBot, type Bot, type Personality, type Weights } from '@col/bots';
import { playGame } from './play.ts';
import { record, watch, type GameRecord } from './record.ts';

export type BotSpec = { kind: 'random' | 'eager' } | { kind: 'goal'; name: string; weights?: Partial<Weights>; personality?: Personality }
  | { kind: 'search'; name: string; iterations?: number; ms?: number; horizon?: number; width?: number; weights?: Partial<Weights>; personality?: Personality };
/** `rules` carries a ruleset that is not built in (one made in the browser's rules editor), flattened onto its base; `ruleset` names it. */
export interface GameSpec { seed: string; nations: string[]; bots: BotSpec[]; ruleset?: string; rules?: Ruleset; changes?: Override['set'] }

const weightsOf = (b: { weights?: Partial<Weights>; personality?: Personality }) => ({ ...(b.weights ?? {}), ...(b.personality ? PERSONALITIES[b.personality] : {}) });
/** Search counts iterations unless given only a time, so that batches repeat exactly. */
export const makeBot = (b: BotSpec, seed: string): Bot =>
  b.kind === 'goal' ? goalBot(seed, weightsOf(b), b.name)
    : b.kind === 'search' ? searchBot(seed, { name: b.name, weights: weightsOf(b), iterations: b.iterations ?? (b.ms === undefined ? 100 : undefined), ms: b.ms, horizon: b.horizon, width: b.width })
      : randomBot(seed, b.kind === 'eager');

const defs = new Map<string, GameDef>();
/** The compiled rules of a spec: its ruleset with the experiment's changes on top. Cached, since many games share them. */
export function defFor(g: Pick<GameSpec, 'ruleset' | 'rules' | 'changes'>): GameDef {
  const key = `${g.ruleset ?? 'board'}|${g.rules ? JSON.stringify(g.rules) : ''}|${JSON.stringify(g.changes ?? {})}`;
  let d = defs.get(key);
  if (!d) {
    const named = g.rules ?? rulesets[g.ruleset ?? 'board'];
    if (!named) throw new Error(`unknown ruleset "${g.ruleset}"`);
    // The base's changes come first (pc builds on board); the experiment's on top.
    const base = flattenRuleset(named, rulesets);
    const r: Ruleset = g.changes ? { id: `${base.id}+`, title: '', sandbox: true, overrides: [...base.overrides, { id: 'change', why: 'experiment', set: g.changes }] } : base;
    defs.set(key, (d = compileRuleset(gameData, r)));
  }
  return d;
}
export function runGame(g: GameSpec): GameRecord {
  const w = watch(g.bots.map((b, p) => makeBot(b, `${g.seed}-${p}`)));
  const { state, choices } = playGame({ def: defFor(g), seed: g.seed, nations: g.nations, bots: w.bots, logging: true });
  return record(state, choices, w.bots.map((b) => b.name), g.ruleset ?? 'board', w.seen);
}
