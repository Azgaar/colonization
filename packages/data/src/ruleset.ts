import type { GameData, GameDef, Override, Ruleset } from './types.ts';
import { COLLECTIONS, validateChange } from './values.ts';
import alternatives from '../../../rulesets/alternatives.json' with { type: 'json' };
import proposed from '../../../rulesets/proposed.json' with { type: 'json' };

export class RulesetError extends Error {}

/** The rules themselves: the master (`rules/`), compiled to the game data, with nothing on top. Saves, replays and lab records name it `board`. */
const board: Ruleset = { id: 'board', title: 'The rules (rules/)', overrides: [] };
export const rulesets: Record<string, Ruleset> = { board, alternatives: alternatives as unknown as Ruleset, proposed: proposed as unknown as Ruleset };
/** Rulesets made before the master built on `pc`, which played as `board`. */
const LEGACY: Record<string, string> = { pc: 'board' };

/** Apply a ruleset's overrides, after those of its base, to imported data. The result is frozen and shared by all games that use it. */
export function compileRuleset(data: GameData, rules: Ruleset, all: Record<string, Ruleset> = rulesets): GameDef {
  const ruleset = flattenRuleset(rules, all);
  const def = structuredClone(data) as GameDef;
  for (const o of ruleset.overrides) { checkOverride(o, ruleset); applyOverride(def, o); }
  def.rulesetId = ruleset.id;
  // Overrides with only `set` hash as before, so recorded replays keep their ruleset hash.
  const parts = ruleset.overrides.map((o) => (o.copy || o.remove ? [o.copy ?? {}, o.set ?? {}, o.remove ?? []] : o.set ?? {}));
  def.rulesetHash = hash(JSON.stringify([data.sourceHash, data.settings, parts]));
  return deepFreeze(def);
}

/** A ruleset with the overrides of its `base` in front. */
export function flattenRuleset(r: Ruleset, all: Record<string, Ruleset>, seen: string[] = []): Ruleset {
  if (!r.base) return r;
  const base = all[r.base] ?? all[LEGACY[r.base] ?? ''];
  if (!base || seen.includes(r.base)) throw new RulesetError(`ruleset "${r.id}": cannot use "${r.base}" as its base`);
  return { ...r, base: undefined, overrides: [...flattenRuleset(base, all, [...seen, r.id]).overrides, ...r.overrides] };
}

export function checkOverride(o: Override, r: Ruleset) {
  if (r.sandbox) return;
  const changes = Object.keys(o.set ?? {}).length + Object.keys(o.copy ?? {}).length + (o.remove?.length ?? 0);
  if (!o.conversion || o.conversion === 'notConvertible') throw new RulesetError(`"${o.id}" is not convertible to the board game. It can only run in a sandbox ruleset`);
  if (o.conversion !== 'interface' && !o.table) throw new RulesetError(`"${o.id}" needs its table wording`);
  if (o.conversion === 'component' && !o.components?.length) throw new RulesetError(`"${o.id}" must list the components it needs`);
  if (o.conversion === 'interface' && changes) throw new RulesetError(`"${o.id}" is marked as interface only but changes rules`);
  if (Object.keys(o.copy ?? {}).length && o.conversion !== 'component') throw new RulesetError(`"${o.id}" adds a card, so it must be labelled component and list the new card`);
}

/** Copy, then set, then remove, so `set` can change a new card and free a card from its references before it goes. */
export function applyOverride(root: GameData, o: Override, before?: (path: string, old: unknown) => void) {
  const r = root as unknown as Record<string, Record<string, { id: string }>>;
  for (const [to, from] of Object.entries(o.copy ?? {})) {
    const [c, id] = entity(to, o.id), [fc, fid] = entity(from, o.id);
    if (c !== fc) throw new RulesetError(`"${o.id}": "${to}" must be copied from the same collection, not from "${from}"`);
    if (!r[fc][fid]) throw new RulesetError(`"${o.id}": cannot copy "${from}", it does not exist`);
    if (r[c][id]) throw new RulesetError(`"${o.id}": "${to}" already exists; a copy needs a new id`);
    if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new RulesetError(`"${o.id}": "${id}" is not a valid id (lower case letters, digits and _)`);
    r[c][id] = { ...structuredClone(r[fc][fid]), id };
  }
  for (const [path, value] of Object.entries(o.set ?? {})) {
    const err = validateChange(root, path, value);
    if (err) throw new RulesetError(`"${o.id}": ${err}`);
    const keys = path.split('.'), last = keys.pop()!;
    let at = root as unknown as Record<string, unknown>;
    for (const k of keys) at = at[k] as Record<string, unknown>;
    before?.(path, at[last]);
    at[last] = structuredClone(value);
  }
  // References are checked once all are gone, so a nation and its own cards can leave together.
  for (const path of o.remove ?? []) {
    const [c, id] = entity(path, o.id);
    if (!r[c][id]) throw new RulesetError(`"${o.id}": cannot remove "${path}", it does not exist`);
    delete r[c][id];
  }
  for (const path of o.remove ?? []) {
    const by = [...new Set(references(root).filter(([, to]) => to === path).map(([from]) => from))];
    if (by.length) throw new RulesetError(`"${o.id}": cannot remove "${path}", it is still used by ${by.join(', ')}`);
  }
}

function entity(path: string, id: string): [string, string] {
  const [c, e, ...rest] = path.split('.');
  if (!(COLLECTIONS as readonly string[]).includes(c) || !e || rest.length)
    throw new RulesetError(`"${id}": "${path}" is not a card; use a path like "fathers.peter_minuit" in ${COLLECTIONS.join(', ')}`);
  return [c, e];
}

/** Entities the engine names in its code. */
const ENGINE_NEEDS: Record<string, string> = { 'agents.indian': 'the engine (native agents are dealt from it)' };

/** Every place that names another entity: [where, entity path]. */
export function references(data: GameData): [string, string][] {
  const out: [string, string][] = Object.entries(ENGINE_NEEDS).map(([to, by]) => [by, to]);
  for (const n of Object.values(data.nations)) for (const a of n.deck) out.push([`nations.${n.id}.deck`, `agents.${a}`]);
  for (const a of Object.values(data.agents)) if (a.nation) out.push([`agents.${a.id}.nation`, `nations.${a.nation}`]);
  for (const b of Object.values(data.buildings)) if (b.requires) out.push([`buildings.${b.id}.requires`, `buildings.${b.requires}`]);
  // Effect blocks that name cards.
  const walk = (v: unknown, at: string) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x, at));
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if (o.n === 'takeAgent' || o.n === 'replaceAgents' || o.n === 'firstMayTake') out.push([at, `agents.${o.agent}`]);
    if (o.n === 'freeBuilding' || o.n === 'cheapBuild') for (const b of o.options as string[]) out.push([at, `buildings.${b}`]);
    if (o.n === 'gainPerBuilding') for (const b of Object.keys(o.buildings as object)) out.push([at, `buildings.${b}`]);
    if (o.mod === 'colonyDefence') out.push([at, `buildings.${o.building}`]);
    for (const x of Object.values(o)) walk(x, at);
  };
  for (const c of ['agents', 'buildings', 'fathers', 'events', 'ruins', 'wrecks'] as const)
    for (const e of Object.values(data[c])) walk(e, `${c}.${e.id}`);
  return out;
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
