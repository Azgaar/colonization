import { describe, expect, it } from 'vitest';
import { fill, LOCALES } from '../src/i18n.ts';

/** The placeholders of a phrase: `{name}`, and the number of a plural or ordinal (its forms are words, not placeholders). */
const names = (s: string) => [...s.replace(/\{(\w+), (?:plural|selectordinal),(?:[^{}]|\{[^{}]*\})*\}/g, '{$1}').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
// The interface compiles without Node's types; the test runs in Node, so it takes the file system this way.
type Fs = { readdirSync(p: string, o: { recursive: true }): string[]; readFileSync(p: string, e: 'utf8'): string };
const fs = (globalThis as unknown as { process: { getBuiltinModule(m: 'node:fs'): Fs } }).process.getBuiltinModule('node:fs');
const src = new URL('../src/', import.meta.url).pathname;
const code = () => fs.readdirSync(src, { recursive: true }).filter((f) => f.endsWith('.ts')).map((f) => fs.readFileSync(src + f, 'utf8'));

describe('locales', () => {
  it('every language has every English key, with the same placeholders', () => {
    // Card texts in Russian are the printed ones, from the workbook (texts.ts); every other language has them here.
    const printed = (l: string, k: string) => l === 'ru' && /^(father|event|flavor)\./.test(k);
    for (const [l, words] of Object.entries(LOCALES)) for (const [k, s] of Object.entries(LOCALES.en)) {
      if (printed(l, k)) continue;
      expect(words[k], `${l}: ${k}`).toBeTypeOf('string');
      expect(names(words[k]), `${l}: ${k}`).toEqual(names(s));
    }
  });
  it('every key the code asks for by name exists', () => {
    const asked = code().flatMap((s) => [...s.matchAll(/\bt\('([a-z][\w.]*\.[\w.]+)'/g)].map((m) => m[1]));
    expect(asked.filter((k) => !(k in LOCALES.en))).toEqual([]);
  });
  it('fills names and plurals', () => {
    expect(fill('{n, plural, one {# cube} other {# cubes}} at {at}', { n: 2, at: 'Boston' }, 'en')).toBe('2 cubes at Boston');
    expect(fill('{n, plural, one {# кубик} few {# кубика} many {# кубиков} other {# кубика}}', { n: 5 }, 'ru')).toBe('5 кубиков');
    expect(fill('{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}', { n: 22 }, 'en')).toBe('22nd');
    expect(fill('{crops} stays', {}, 'en')).toBe('{crops} stays');
    expect([1, 2, 5, 11, 21, 23, 112].map((n) => fill(LOCALES.ru['news.cells'], { n }, 'ru'))).toEqual(['1 клетка', '2 клетки', '5 клеток', '11 клеток', '21 клетка', '23 клетки', '112 клеток']);
  });
});

describe('first language', () => {
  it('follows the browser until one is picked', async () => {
    const store = new Map<string, string>(), g = globalThis as unknown as Record<string, unknown>;
    g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    Object.defineProperty(globalThis, 'navigator', { value: { languages: ['de-DE', 'ru-RU', 'en'], language: 'de-DE' }, configurable: true });
    const { Options, shownLang } = await import('../src/options.ts');
    expect([Options.lang, shownLang()]).toEqual(['', 'ru']);
    Options.lang = 'en';
    expect(shownLang()).toBe('en');
  });
});
