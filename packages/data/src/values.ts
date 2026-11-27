/** Single values of game data: reading by path, the editable list for the rules panel, and checking a new value. No node: imports. */
import type { GameData } from './types.ts';

export const COLLECTIONS = ['agents', 'nations', 'buildings', 'fathers', 'events', 'ruins', 'wrecks', 'tactics', 'tribes'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export function getPath(root: unknown, path: string): unknown {
  let at = root;
  for (const k of path.split('.')) {
    if (typeof at !== 'object' || at === null || !Object.hasOwn(at, k)) return undefined;
    at = (at as Record<string, unknown>)[k];
  }
  return at;
}

export interface Editable {
  path: string; value: unknown;
  type: 'number' | 'boolean' | 'string' | 'number[]' | 'string[]';
  /** `agents`, `settings`, ... */
  group: string;
  label: { en: string; ru: string };
  min?: number; max?: number;
  /** For numbers that may also be empty, such as `settings.combat.diceCap`. */
  nullable?: boolean;
  options?: readonly string[];
}

/** Effect blocks: only their numbers and switches are offered, the structure stays as checked in the rules ($fx);
 * the one exception is which resources a talent works on (`icons`), the symbol printed on the card. */
const EFFECT = new Set(['mods', 'onGain', 'do', 'work', 'effect']);
const SKIP = new Set(['id', 'ru', 'en', 'flavor', 'color', 'base', 'kind', 'nation', 'unique', 'improvement', 'category']);
const LAND = ['forest', 'grassland', 'mountains', 'desert', 'tundra'];
const ICONS = ['food', 'timber', 'crops', 'goods', 'silver', 'bells', 'crosses'];
const SETTING_OPTIONS: Record<string, readonly string[]> = {
  'settings.cargo.costPer': ['operation', 'unit'],
  'settings.production.emptyMeans': ['noToken', 'noForeignToken'],
  'settings.colony.foundCost.resource': ['food', 'timber', 'crops', 'goods', 'silver'],
};

/** Limits a value must keep. Entity numbers outside effect blocks are counts and prices; penalties are the only negative settings. */
function limits(data: GameData, path: string): Pick<Editable, 'min' | 'max' | 'options'> {
  const keys = path.split('.');
  const last = keys[keys.length - 1];
  if (keys[0] === 'settings') {
    if (SETTING_OPTIONS[path]) return { options: SETTING_OPTIONS[path] };
    if (path === 'settings.combat.successFaces') return { min: 1, max: 6 };
    return /penalty/i.test(last) ? {} : { min: 0 };
  }
  if (last === 'icons') return { options: ICONS };
  if (keys.slice(2).some((k) => EFFECT.has(k))) return {};
  if (last === 'edu') return { min: 0, max: 2 };
  if (last === 'requires') return { options: Object.keys(data.buildings).filter((b) => b !== keys[1]) };
  if (keys[0] === 'tribes' && last === 'terrain') return { options: LAND };
  if (keys[0] === 'terrain' && last === 'yields') return { options: ICONS };
  if (keys[0] === 'nations' && last === 'deck') return { options: Object.values(data.agents).filter((a) => a.nation === keys[1]).map((a) => a.id) };
  return { min: 0 };
}

/** Every value the rules panel may change, flat, in data order. Tiles and names are left out. */
export function editable(data: GameData): Editable[] {
  const out: Editable[] = [];
  const kindOf = (v: unknown) => {
    const o = v as Record<string, unknown>;
    return typeof o === 'object' && o ? String(o.n ?? o.mod ?? o.t ?? o.kind ?? o.id ?? '') : '';
  };
  const push = (path: string, value: unknown, label: Editable['label'], inEffect: boolean) => {
    const group = path.split('.')[0];
    const base = { path, value, group, label, ...limits(data, path) };
    if (typeof value === 'number' || typeof value === 'boolean') out.push({ ...base, type: typeof value as 'number' });
    else if (value === null && group === 'settings') out.push({ ...base, type: 'number', nullable: true });
    else if (inEffect && path.endsWith('.icons') && Array.isArray(value) && value.every((x) => typeof x === 'string')) out.push({ ...base, type: 'string[]' });
    else if (inEffect) return;
    else if (typeof value === 'string' && (base.options || group === 'settings')) out.push({ ...base, type: 'string' });
    else if (Array.isArray(value) && value.every((x) => typeof x === 'number')) out.push({ ...base, type: 'number[]' });
    else if (Array.isArray(value) && value.every((x) => typeof x === 'string')) out.push({ ...base, type: 'string[]' });
  };
  const walk = (v: unknown, path: string, name: { en: string; ru: string }, field: string[], inEffect: boolean) => {
    const isList = Array.isArray(v) && v.some((x) => typeof x === 'object' && x !== null);
    if (v && typeof v === 'object' && (isList || !Array.isArray(v))) {
      for (const [k, x] of Object.entries(v)) {
        if (!inEffect && SKIP.has(k)) continue;
        const kind = isList ? kindOf(x) : '';
        walk(x, `${path}.${k}`, name, [...field, kind ? `${k} ${kind}` : k], inEffect || EFFECT.has(k));
      }
    } else {
      const f = field.join(' · ');
      push(path, v, { en: name.en ? `${name.en}: ${f}` : f, ru: name.ru ? `${name.ru}: ${f}` : f }, inEffect);
    }
  };
  for (const c of ['resources', 'terrain', ...COLLECTIONS] as const)
    for (const e of Object.values(data[c] as Record<string, { id: string; en: string; ru: string }>)) walk(e, `${c}.${e.id}`, e, [], false);
  walk(data.settings, 'settings', { en: '', ru: '' }, [], false);
  return out;
}

/** Why `value` cannot replace the value at `path`, or null if it can. Board numbers are whole. */
export function validateChange(data: GameData, path: string, value: unknown): string | null {
  const old = getPath(data, path);
  if (old === undefined) return `unknown path "${path}"`;
  const kind = (v: unknown) => (Array.isArray(v) ? 'a list' : v === null ? 'nothing' : typeof v);
  if (old === null) { if (value !== null && typeof value !== 'number') return `"${path}" expects a number or nothing`; }
  else if (kind(old) !== kind(value)) return `"${path}" expects ${kind(old)}`;
  const { min, max, options } = limits(data, path);
  const check = (v: unknown, at: string): string | null => {
    if (typeof v === 'number') {
      if (!Number.isInteger(v)) return `"${at}" must be a whole number`;
      if (min !== undefined && v < min) return `"${at}" must be ${min} or more`;
      if (max !== undefined && v > max) return `"${at}" must be ${max} or less`;
    }
    if (typeof v === 'string' && options && !options.includes(v)) return `"${at}" must be one of: ${options.join(', ')}`;
    return null;
  };
  if (Array.isArray(old) && Array.isArray(value)) {
    const t = old.length ? kind(old[0]) : null;
    if (t && value.some((x) => kind(x) !== t)) return `"${path}" expects a list of ${t === 'number' ? 'numbers' : t === 'string' ? 'texts' : 'items like the current ones'}`;
    if (!value.length && (path.startsWith('settings.') || path.endsWith('.deck'))) return `"${path}" cannot be empty`;
    for (const [i, x] of value.entries()) { const e = check(x, `${path}.${i}`); if (e) return e; }
    return null;
  }
  return check(value, path);
}
