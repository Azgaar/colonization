import type { GameData, Ruleset } from './types.ts';
import generated from '../generated/gamedata.json' with { type: 'json' };
import board from '../../../rulesets/board.json' with { type: 'json' };
import pc from '../../../rulesets/pc.json' with { type: 'json' };
import alternatives from '../../../rulesets/alternatives.json' with { type: 'json' };
import { compileRuleset } from './ruleset.ts';

export * from './types.ts';
export { compileRuleset, hash, RulesetError } from './ruleset.ts';
export const gameData = generated as unknown as GameData;
export const rulesets: Record<string, Ruleset> = { board: board as unknown as Ruleset, pc: pc as unknown as Ruleset, alternatives: alternatives as unknown as Ruleset };
export const loadRuleset = (id = 'board') => {
  if (!rulesets[id]) throw new Error(`unknown ruleset "${id}"`);
  return compileRuleset(gameData, rulesets[id]);
};
