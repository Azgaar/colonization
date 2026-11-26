/** Browser-safe entry: JSON imports and plain functions only. The importer (node:crypto) and the CLIs stay out of it. */
import type { GameData } from './types.ts';
import generated from '../generated/gamedata.json' with { type: 'json' };
import { compileRuleset, rulesets } from './ruleset.ts';

export * from './types.ts';
export { applyOverride, compileRuleset, flattenRuleset, hash, references, rulesets, RulesetError } from './ruleset.ts';
export { editable, getPath, validateChange, COLLECTIONS, type Editable, type Collection } from './values.ts';
export { sourceMap, sourceOf, where, SETTINGS_FILE } from './sources.ts';
export { addDecision, changeList, conversionReport, decisionText, dropOverride, promoteOverride, promoteProblem, toCsv, toMarkdown, type ChangeRow } from './changes.ts';
export const gameData = generated as unknown as GameData;
export const loadRuleset = (id = 'board') => {
  if (!rulesets[id]) throw new Error(`unknown ruleset "${id}"`);
  return compileRuleset(gameData, rulesets[id]);
};
