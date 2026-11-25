import type { GameData, GameDef, Override, Ruleset } from './types.ts';

export class RulesetError extends Error {}

/** Apply a ruleset's overrides to imported data. The result is frozen and shared by all games that use it. */
export function compileRuleset(data: GameData, ruleset: Ruleset): GameDef {
  const def = structuredClone(data) as GameDef;
  for (const o of ruleset.overrides) {
    checkOverride(o, ruleset);
    for (const [path, value] of Object.entries(o.set)) setPath(def as unknown as Record<string, unknown>, path, value, o.id);
  }
  def.rulesetId = ruleset.id;
  def.rulesetHash = hash(JSON.stringify([data.sourceHash, data.settings, ruleset.overrides.map((o) => o.set)]));
  return deepFreeze(def);
}

function checkOverride(o: Override, r: Ruleset) {
  if (r.sandbox) return;
  if (!o.conversion || o.conversion === 'notConvertible') throw new RulesetError(`"${o.id}" is not convertible to the board game. It can only run in a sandbox ruleset`);
  if (o.conversion !== 'interface' && !o.table) throw new RulesetError(`"${o.id}" needs its table wording`);
  if (o.conversion === 'component' && !o.components?.length) throw new RulesetError(`"${o.id}" must list the components it needs`);
  if (o.conversion === 'interface' && Object.keys(o.set).length) throw new RulesetError(`"${o.id}" is marked as interface only but changes rules`);
}

function setPath(root: Record<string, unknown>, path: string, value: unknown, id: string) {
  const keys = path.split('.');
  let at = root;
  for (const k of keys.slice(0, -1)) {
    if (typeof at[k] !== 'object' || at[k] === null) throw new RulesetError(`"${id}": unknown path "${path}"`);
    at = at[k] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  if (!(last in at)) throw new RulesetError(`"${id}": unknown path "${path}"`);
  const old = at[last];
  if (old !== null && value !== null && (typeof old !== typeof value || Array.isArray(old) !== Array.isArray(value)))
    throw new RulesetError(`"${id}": "${path}" expects ${Array.isArray(old) ? 'a list' : typeof old}`);
  at[last] = structuredClone(value);
}

export function hash(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}
