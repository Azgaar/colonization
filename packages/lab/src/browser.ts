/** The rules engine, the bots and the data for the interface prototype. Bundled with `pnpm prototype`. */
import texts from '../../data/src/reviewed-texts.json' with { type: 'json' };
export { actionsFor, applyInPlace, createGame, load, map, save, util, viewFor } from '@col/engine';
export { goalBot, PERSONALITIES } from '@col/bots';
export { loadRuleset } from '@col/data';
export { exportRules, exportState } from './export.ts';
export { texts };
