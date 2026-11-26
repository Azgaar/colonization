/* The rulesets the game knows: the built-in ones (board, pc, alternatives) and the designer's own, made in the rules editor and kept in this browser (FR-R-4). */
import { compileRuleset, gameData, rulesets, type GameDef, type Ruleset } from '@col/data';

const KEY = 'rulesets';
/** The designer's rulesets, by id. */
export function custom(): Record<string, Ruleset> { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Ruleset>; } catch { return {}; } }
export function keep(r: Ruleset) { const all = custom(); all[r.id] = r; localStorage.setItem(KEY, JSON.stringify(all)); compiled.delete(r.id); }
export function forget(id: string) { const all = custom(); delete all[id]; localStorage.setItem(KEY, JSON.stringify(all)); compiled.delete(id); }
/** Every ruleset by id; the designer's come after the built-in ones and may not take their names. */
export const all = (): Record<string, Ruleset> => ({ ...custom(), ...rulesets });
export const ids = () => Object.keys(all());
const compiled = new Map<string, GameDef>();
/** The compiled rules of a ruleset, built once. Throws when the ruleset is unknown or one of its changes is wrong. */
export function defOf(id: string): GameDef {
  let d = compiled.get(id);
  // A ruleset may build on another (its `base`), the designer's own included.
  if (!d) { const every = all(), r = every[id]; if (!r) throw new Error(`unknown ruleset "${id}"`); compiled.set(id, (d = compileRuleset(gameData, r, every))); }
  return d;
}
