/* Sound (FR-U-21): effects for what happens in the game and music for where it stands. Files come from sound/ (docs/audio.md);
 * the build lists them in dist/sounds.json, and anything not listed is silent. Volumes and mute are kept in this browser. */

import { keepOptions, Options } from './options.ts';

type Fx = 'click' | 'card' | 'dice' | 'coins' | 'sail' | 'march' | 'reveal' | 'found' | 'build' | 'bell' | 'event' | 'battle' | 'war' | 'turn' | 'win' | 'lose';
export type Mood = 'title' | 'explore' | 'colony' | 'tension' | 'war' | null;
interface Entry { e: string; p?: number; n?: number; token?: string; winners?: number[] }

/** Volumes 0–100 and mute, as Options shows them: kept with the other options. */
export const Sound = Options.sound;
export const keepSound = () => { keepOptions(); if (playing && !fading) playing.volume = level(); };

/* ---- what is there ---- */
/** Effects by name; music by mood, each a list of pieces (sound/music/<mood>/*.ogg). */
let have: { fx: string[]; music: Record<string, string[]> } = { fx: [], music: {} };
if (typeof fetch !== 'undefined' && typeof document !== 'undefined') void fetch('dist/sounds.json').then((r) => (r.ok ? r.json() : null)).then((x) => { if (x) have = x as typeof have; mood(want); }).catch(() => undefined);

/* ---- effects: Web Audio, decoded once, started after the first gesture (browsers allow no sound before it) ---- */
let ctx: AudioContext | null = null;
const buffers = new Map<Fx, Promise<AudioBuffer | null>>(), last = new Map<Fx, number>();
/** Relative loudness: the button click is kept faint, as it is heard most. */
const GAIN: Partial<Record<Fx, number>> = { click: 0.1, coins: 0.6, sail: 0.7, march: 0.7, reveal: 0.6 };
const buffer = (k: Fx) => {
  if (!buffers.has(k)) buffers.set(k, fetch(`sound/fx/${k}.ogg`).then((r) => r.arrayBuffer()).then((b) => ctx!.decodeAudioData(b)).catch(() => null));
  return buffers.get(k)!;
};
export function fx(k: Fx, delay = 0) {
  if (Sound.mute || !Sound.fx || !ctx || document.hidden || !have.fx.includes(k)) return;
  const now = performance.now(); if (now - (last.get(k) ?? 0) < 250) return; last.set(k, now);
  void buffer(k).then((b) => {
    if (!b || !ctx) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; g.gain.value = (Sound.fx / 100) * (GAIN[k] ?? 1); src.connect(g).connect(ctx.destination); src.start(ctx.currentTime + delay);
  });
}

/** What the new log entries sound like, most telling first; at most two at once. Other players' turns sound only their main moments. */
const ORDER: Fx[] = ['win', 'lose', 'war', 'battle', 'found', 'build', 'bell', 'reveal', 'event', 'dice', 'coins', 'sail', 'march', 'card'];
const QUIET = new Set<Fx>(['war', 'battle', 'found', 'win', 'lose', 'card', 'sail', 'march']);
export function hear(l: Entry[], seat: number, own: boolean) {
  const got = new Set<Fx>();
  for (const x of l) {
    const k: Fx | null = x.e === 'over' ? (x.winners?.includes(seat) ? 'win' : 'lose')
      : x.e === 'war' ? 'war'
      : ['combat', 'attack', 'siege', 'bombard', 'raid'].includes(x.e) ? 'battle'
      : x.e === 'found' ? 'found' : x.e === 'build' ? 'build'
      : x.e === 'bells' && (x.n ?? 0) > 0 && x.p === seat ? 'bell'
      : x.e === 'reveal' ? 'reveal' : x.e === 'event' ? 'event' : x.e === 'roll' ? 'dice'
      : x.e === 'gold' && x.p === seat ? 'coins'
      : x.e === 'move' ? (x.token === 'ship' ? 'sail' : 'march')
      : ['play', 'gainAgent', 'recruit'].includes(x.e) ? 'card' : null;
    if (k && (own || QUIET.has(k))) got.add(k);
  }
  ORDER.filter((k) => got.has(k)).slice(0, 2).forEach((k, i) => fx(k, i * 0.18));
  if (got.has('win') || got.has('lose')) mood(null);
}

/* ---- music: real recordings, a playlist per mood; a piece crossfades into the next as it ends, or into another mood's ---- */
let playing: HTMLAudioElement | null = null, leaving: HTMLAudioElement | null = null, list: string[] = [], want: Mood = null, fading = 0;
const FADE = 3, NONE: string[] = []; // seconds
/** A mood without its own pieces borrows a neighbour's, so the game is not silent while music arrives piece by piece. */
const FALLBACK: Record<Exclude<Mood, null>, string[]> = { title: ['title', 'explore'], explore: ['explore', 'colony', 'title'], colony: ['colony', 'explore', 'title'], tension: ['tension', 'colony', 'explore'], war: ['war', 'tension'] };
const level = () => (Sound.mute ? 0 : Sound.music / 100) * 0.6;
const src = (a: HTMLAudioElement | null) => a?.dataset.piece ?? '';
export function mood(m: Mood) {
  want = m;
  if (!ctx) return; // before the first gesture, only remember it
  const name = (m ? FALLBACK[m] : []).find((x) => have.music[x]?.length);
  const next = name ? have.music[name]! : NONE;
  if (next === list) return;
  list = next;
  // The piece playing goes on if the new mood has it too.
  if (!list.includes(src(playing))) play(pick());
}
/** The next piece of the list, never the one just played if there is another. */
const pick = () => { const rest = list.filter((x) => x !== src(playing)); return rest.length ? rest[Math.floor(Math.random() * rest.length)] : list[0] ?? null; };
function play(piece: string | null) {
  const from = playing, next = piece ? new Audio(`sound/music/${piece}`) : null;
  leaving?.pause(); leaving = from;
  playing = next;
  if (next) {
    next.dataset.piece = piece!; next.volume = 0; next.preload = 'auto';
    // Crossfade before the end when the length is known; otherwise (a server without range requests) go on when it ends.
    next.addEventListener('timeupdate', () => { if (next === playing && Number.isFinite(next.duration) && next.duration - next.currentTime < FADE) play(pick()); });
    next.addEventListener('ended', () => { if (next === playing) play(pick()); });
    next.addEventListener('error', () => { if (next === playing) playing = null; });
    if (!document.hidden) void next.play().catch(() => undefined);
  }
  clearInterval(fading);
  const step = 0.06 / FADE;
  fading = window.setInterval(() => {
    const to = level(); let done = true;
    if (next) { next.volume = Math.min(to, next.volume + step * Math.max(to, 0.01)); if (next.volume < to) done = false; }
    if (from) { from.volume = Math.max(0, from.volume - step * Math.max(to, 0.01)); if (from.volume > 0) done = false; else { from.pause(); if (leaving === from) leaving = null; } }
    if (done) { clearInterval(fading); fading = 0; }
  }, 60);
}

/* ---- the first gesture opens sound; every button clicks ---- */
if (typeof document !== 'undefined') {
  const open = () => { if (ctx) return; ctx = new AudioContext(); mood(want); };
  document.addEventListener('pointerdown', (e) => { open(); if ((e.target as HTMLElement).closest('button:not(:disabled)')) fx('click'); }, true);
  document.addEventListener('keydown', open, true);
  // A hidden tab is silent: the music pauses where it is and goes on when the tab is back.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend(); playing?.pause();
      if (leaving) { leaving.pause(); leaving = null; } // a crossfade half done ends here
    } else {
      void ctx.resume();
      if (playing) { if (!fading) playing.volume = level(); void playing.play().catch(() => undefined); }
    }
  });
  // Volume sliders in Options: heard as they move.
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement, k = el.dataset.vol as 'music' | 'fx' | undefined; if (!k) return;
    Sound[k] = +el.value; el.nextElementSibling!.textContent = `${el.value}%`; keepSound();
  });
  document.addEventListener('change', (e) => { if ((e.target as HTMLElement).dataset.vol === 'fx') fx('coins'); });
}
