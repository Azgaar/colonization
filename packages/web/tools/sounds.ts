/** List the sound files there are, for the game to play only those (docs/audio.md): writes dist/sounds.json. Run by `pnpm web:build`. */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = join(import.meta.dirname, '..'), list = (d: string) => { try { return readdirSync(join(root, 'sound', d)).filter((f) => f.endsWith('.ogg')).map((f) => f.slice(0, -4)).sort(); } catch { return []; } };
/** Music by mood: the pieces in sound/music/<mood>/, as paths under sound/music. */
const dirs = (() => { try { return readdirSync(join(root, 'sound', 'music'), { withFileTypes: true }); } catch { return []; } })();
const music = Object.fromEntries(dirs.filter((d) => d.isDirectory()).map((d) => [d.name, list(`music/${d.name}`).map((f) => `${d.name}/${f}.ogg`)]).filter(([, l]) => l.length));
const out = { fx: list('fx'), music };
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'sounds.json'), JSON.stringify(out) + '\n');
console.log(`sounds: ${out.fx.length} effects, music: ${Object.entries(music).map(([k, l]) => `${k} ${l.length}`).join(', ') || 'none'}`);
