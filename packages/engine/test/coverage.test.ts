import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const here = fileURLToPath(new URL('.', import.meta.url));
it('every rule in docs/rules-spec.md has a test, and every tested rule exists', () => {
  const spec = new Set([...readFileSync(`${here}../../../docs/rules-spec.md`, 'utf8').matchAll(/^\| ([A-Z]-\d+) \|/gm)].map((m) => m[1]));
  const tests = new Set(readdirSync(here).filter((f) => f.endsWith('.test.ts')).flatMap((f) => [...readFileSync(here + f, 'utf8').matchAll(/it\('\[([A-Z]-\d+)\]/g)].map((m) => m[1])));
  expect([...spec].filter((x) => !tests.has(x))).toEqual([]);
  expect([...tests].filter((x) => !spec.has(x))).toEqual([]);
  expect(spec.size).toBeGreaterThan(120);
});
