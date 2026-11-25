import './nodes.ts';
import './war.ts';
import type { Choice, State } from './types.ts';
import { applyInPlace, clone } from './core.ts';
import { createGame, type GameConfig } from './setup.ts';

export * from './types.ts';
export { nextU32, seedRng } from './rng.ts';
export { createGame, type GameConfig } from './setup.ts';
export { applyInPlace, choiceKey, clone, IllegalChoice, legal } from './core.ts';
export { viewFor, type View } from './view.ts';
export { actionsFor, buildPrice, fatherLimit, foundCost, recruitCost, sellPrice, taxRate, year } from './turn.ts';
export { attackOptions, buildingDefence, cardStrength, combatStrength } from './combat.ts';
export { buildingYield, cellYield, cellYields, docksYields, workableCells } from './production.ts';
export { attacked, findLoyalist, rebelOrder, scorePlayer, siegeStrength } from './war.ts';
export * as map from './map.ts';
export * as util from './util.ts';

/** Apply a choice and return a new state. */
export function apply(s: State, c: Choice): State {
  const n = clone(s);
  applyInPlace(n, c);
  return n;
}
export interface Replay { ruleset: string; rulesetHash: string; seed: string; nations: string[]; choices: Choice[] }
export function replay(config: GameConfig, choices: Choice[], upTo = choices.length): State {
  const s = createGame(config);
  for (let i = 0; i < upTo; i++) applyInPlace(s, choices[i]);
  return s;
}
/** Save at any decision. The state is plain JSON apart from the shared definition and map. */
export function save(s: State): string {
  const { def, ...rest } = s;
  return JSON.stringify({ ruleset: def.rulesetId, rulesetHash: def.rulesetHash, state: rest });
}
export function load(json: string, def: GameConfig['def']): State {
  const x = JSON.parse(json);
  if (x.rulesetHash !== def.rulesetHash) throw new Error(`saved with another version of ruleset "${x.ruleset}"`);
  return { ...x.state, def };
}
export { problems } from './invariants.ts';
