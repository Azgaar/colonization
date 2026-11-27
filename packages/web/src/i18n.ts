/* The interface's words, from one locale file per language (`locales/<lang>.json`): flat keys, `{name}` placeholders,
 * and plurals as `{n, plural, one {# cube} few {# кубика} many {# кубиков} other {# cubes}}` (# is the number).
 * A key missing in a language falls back to English; a key missing everywhere is shown as itself.
 * Card names and printed card texts are game data, not interface words: they come from the workbook. */
import en from '../locales/en.json' with { type: 'json' };
import ru from '../locales/ru.json' with { type: 'json' };
import type { Pair } from './view.ts';

type Words = Record<string, string>;
/** Every language the interface speaks, in the order offered. English is the fallback for any missing word. */
export const LOCALES: Record<string, Words> = { en, ru };
export const lang = () => (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
const word = (key: string, l = lang()) => LOCALES[l]?.[key] ?? LOCALES.en[key];

const rules = new Map<string, Intl.PluralRules>();
const plural = (n: number, l: string, type: Intl.PluralRuleType) => { const id = `${l}:${type}`; let r = rules.get(id); if (!r) rules.set(id, (r = new Intl.PluralRules(l, { type }))); return r.select(n); };
/** Fill `{name}`, `{n, plural, …}` and `{n, selectordinal, …}` (1st, 2nd) from `vars`. A placeholder with no value stays as it is (card texts use `{icon}` tokens of their own). */
export function fill(s: string, vars: Record<string, unknown>, l = lang()): string {
  return s.replace(/\{(\w+), (plural|selectordinal),((?:[^{}]|\{[^{}]*\})*)\}|\{(\w+)\}/g, (m, pn: string | undefined, kind: string | undefined, forms: string | undefined, name: string | undefined) => {
    if (pn !== undefined) {
      const n = Number(vars[pn]), all = new Map([...forms!.matchAll(/(\w+)\s*\{([^{}]*)\}/g)].map((x) => [x[1], x[2]]));
      return (all.get(plural(n, l, kind === 'plural' ? 'cardinal' : 'ordinal')) ?? all.get('other') ?? '').replace(/#/g, String(vars[pn]));
    }
    return name! in vars ? String(vars[name!]) : m;
  });
}
/** A word or phrase in the player's language. */
export function t(key: string, vars?: Record<string, unknown>): string {
  const s = word(key);
  if (s === undefined) return key;
  return vars ? fill(s, vars) : s;
}
/** A table of words under `prefix.` (`act.produce`, …) as English and Russian pairs, for the code that still takes pairs. */
export function table(prefix: string, keys?: string[]): Record<string, Pair> {
  const p = prefix ? `${prefix}.` : '', out: Record<string, Pair> = {};
  for (const k of keys ?? Object.keys(en).filter((k) => k.startsWith(p)).map((k) => k.slice(p.length))) out[k] = [word(p + k, 'en') ?? k, word(p + k, 'ru') ?? word(p + k, 'en') ?? k];
  return out;
}
/** A phrase to say later, in whatever language is shown then: for texts kept in data (sections, steps, titles). `pick` says it. */
export type Msg = { k: string; v?: Record<string, unknown> };
export const msg = (k: string, v?: Record<string, unknown>): Msg => ({ k, v });
/** A phrase in a given language, whatever is shown: for reports that are written in English. */
export const inLang = (l: string, x: Msg) => { const s = word(x.k, l) ?? x.k; return x.v ? fill(s, x.v, l) : s; };
