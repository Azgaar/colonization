/** The service worker with the list of the game's files: writes packages/web/sw.js from dist/sw.js (built from sw/sw.ts). Run last by `pnpm web:build`.
 * Each file is listed with a hash of its content: a new build changes sw.js only when a file changed, and an update downloads only those files. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const walk = (dir: string): string[] => readdirSync(join(root, dir)).flatMap((f) => (statSync(join(root, dir, f)).isDirectory() ? walk(`${dir}/${f}`) : [`${dir}/${f}`]));
const hash = (path: string) => createHash('sha256').update(readFileSync(join(root, path))).digest('base64url').slice(0, 12);
const list = (paths: string[]) => Object.fromEntries(paths.filter((p) => !p.endsWith('.DS_Store')).sort().map((p) => [p, hash(p)]));

/** Kept before the game counts as installed: everything the page loads or fetches, but the music. */
const core = list(['index.html', 'favicon.svg', 'manifest.webmanifest', ...walk('icons'), ...walk('styles'), 'dist/app.js', 'dist/lab-worker.js', 'dist/sounds.json', ...walk('art'), ...walk('sound/fx').filter((p) => p.endsWith('.ogg'))]);
/** Kept after, while the game runs or when first played. */
const later = list(walk('sound/music').filter((p) => p.endsWith('.ogg')));
const version = createHash('sha256').update(JSON.stringify([core, later])).digest('base64url').slice(0, 12);

const built = join(root, 'dist', 'sw.js');
writeFileSync(join(root, 'sw.js'), `const PWA=${JSON.stringify({ version, core, later })};\n${readFileSync(built, 'utf8')}`);
rmSync(built);
const mb = (x: Record<string, string>) => (Object.keys(x).reduce((n, p) => n + statSync(join(root, p)).size, 0) / 2 ** 20).toFixed(1);
console.log(`${relative(process.cwd(), join(root, 'sw.js'))} ${version}: ${Object.keys(core).length} files kept first (${mb(core)} MB), ${Object.keys(later).length} later (${mb(later)} MB)`);
