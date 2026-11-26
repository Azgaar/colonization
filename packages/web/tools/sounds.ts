/** List the sound files there are, for the game to play only those (docs/audio.md): writes dist/sounds.json. Run by `pnpm web:build`. */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = join(import.meta.dirname, '..'), list = (d: string) => { try { return readdirSync(join(root, 'sound', d)).filter((f) => f.endsWith('.ogg')).map((f) => f.slice(0, -4)).sort(); } catch { return []; } };
/** Music: the pieces in sound/music/, by file name; their moods are in sound/music.json. */
const music = list('music').map((f) => `${f}.ogg`);
const out = { fx: list('fx'), music };
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'sounds.json'), JSON.stringify(out) + '\n');
console.log(`sounds: ${out.fx.length} effects, ${music.length} pieces of music`);
