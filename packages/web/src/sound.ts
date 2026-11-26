/* Sound (FR-U-21): effects for what happens in the game and music for where it stands. Files come from sound/ (docs/audio.md);
 * the build lists them in dist/sounds.json, and anything not listed is silent. Volumes and mute are kept in this browser. */

import { keepOptions, Options } from './options.ts';
/** The recordings: what each piece is, who plays it and its mood (sound/music.json). */
import MUSIC from '../sound/music.json';

type Fx = 'card' | 'dice' | 'coins' | 'sail' | 'march' | 'reveal' | 'found' | 'build' | 'bell' | 'event' | 'battle' | 'war' | 'turn' | 'win' | 'lose';
/** What the music is for: the main menu (one signature piece), the game, the War of Independence, and the end, won or lost (one piece each). */
export type Mood = 'menu' | 'game' | 'war' | 'won' | 'lost' | null;
interface Entry { e: string; p?: number; n?: number; token?: string; winners?: number[] }

/** Volumes 0–100 and mute, as Options shows them: kept with the other options. */
export const Sound = Options.sound;
export const keepSound = () => { keepOptions(); if (playing && !fading) playing.volume = level(); };

/* ---- what is there ---- */
/** Effects by name; the pieces of music there are, by file name (sound/music/*.ogg). Each piece's mood is in music.json. */
let have: { fx: string[]; music: string[] } = { fx: [], music: [] };
if (typeof fetch !== 'undefined' && typeof document !== 'undefined') void fetch('dist/sounds.json').then((r) => (r.ok ? r.json() : null)).then((x) => { if (x) have = x as typeof have; mood(want); }).catch(() => undefined);

/* ---- effects: Web Audio, decoded once, started after the first gesture (browsers allow no sound before it) ---- */
let ctx: AudioContext | null = null;
const buffers = new Map<Fx, Promise<AudioBuffer | null>>(), last = new Map<Fx, number>();
/** Relative loudness. */
const GAIN: Partial<Record<Fx, number>> = { coins: 0.6, sail: 0.7, march: 0.7, reveal: 0.6 };
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
  // The end has its own music, won or lost; the short win and lose endings are heard only when the music is not.
  if (Sound.music > 0 && !paused) { got.delete('win'); got.delete('lose'); }
  ORDER.filter((k) => got.has(k)).slice(0, 2).forEach((k, i) => fx(k, i * 0.18));
}

/* ---- music: real recordings, a playlist per mood; a piece crossfades into the next as it ends, or into another mood's ---- */
let playing: HTMLAudioElement | null = null, leaving: HTMLAudioElement | null = null, list: string[] = [], at: string | null | undefined = null, want: Mood = null, fading = 0, paused = false;
const FADE = 3; // seconds
/** Every piece, shuffled once when the page opens: each mood plays its pieces in this order, round and round. */
const DECK = (() => { const d = [...MUSIC]; for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j]!, d[i]!]; } return d; })();
/** The pieces there are, in the shuffled order; a mood's playlist is those of its mood. */
const pieces = () => DECK.filter((m) => have.music.includes(m.file));
const ofMood = (x: string) => pieces().filter((m) => m.mood === x).map((m) => m.file);
/** A mood without pieces of its own borrows another's, so the game is never silent. */
const FALLBACK: Record<Exclude<Mood, null>, string[]> = { menu: ['menu', 'game'], game: ['game'], war: ['war', 'game'], won: ['won', 'war', 'game'], lost: ['lost', 'war', 'game'] };
const level = () => (Sound.mute ? 0 : Sound.music / 100) * 0.6;
const src = (a: HTMLAudioElement | null) => a?.dataset.piece ?? '';
/** Tell the player in Options that the piece or its pause changed. */
const told = () => { if (typeof document !== 'undefined') document.dispatchEvent(new Event('music')); };
/** The music as the player shows it: the piece now (or none yet), whether it is paused, and every piece there is, to choose from.
 * Pause lasts until play is pressed, through every change of mood. A piece chosen by hand may be of any mood; when it ends, the mood's playlist goes on. */
export const Music = {
  get paused() { return paused; },
  get all() { return pieces(); },
  get file() { return src(playing); },
  get now() { const f = src(playing); return f ? MUSIC.find((m) => m.file === f) ?? { title: f, composer: '', by: '' } : null; },
  toggle() {
    paused = !paused;
    if (paused) { playing?.pause(); leaving?.pause(); leaving = null; }
    else if (playing) { if (!document.hidden) void playing.play().catch(() => undefined); }
    else if (list.length) play(pick());
    told();
  },
  /** Play this piece now, whatever its mood, with a short crossfade. */
  choose(file: string) { if (have.music.includes(file)) { paused = false; play(file, 1); } },
  /** The piece after this one in the shuffled order of all pieces, whatever its mood. */
  next() { const l = pieces().map((m) => m.file); if (l.length) Music.choose(l[(l.indexOf(src(playing)) + 1) % l.length]!); },
};
export function mood(m: Mood) {
  want = m;
  if (!ctx) return; // before the first gesture, only remember it
  const name = (m ? FALLBACK[m] : []).find((x) => ofMood(x).length);
  if (name === at) return;
  at = name; list = name ? ofMood(name) : [];
  // The piece playing goes on if the new mood has it too.
  if (!list.includes(src(playing))) play(pick());
}
/** Where each mood is in its playlist, so a mood left and come back to goes on with its next piece. */
const cursor = new Map<string, number>();
/** The mood's next piece in the shuffled order; a mood of one piece plays it again. */
const pick = () => { if (!list.length) return null; const k = at ?? '', i = ((cursor.get(k) ?? -1) + 1) % list.length; cursor.set(k, i); return list[i]!; };
function play(piece: string | null, fade = FADE) {
  const from = playing, next = piece ? new Audio(`sound/music/${piece}`) : null;
  leaving?.pause(); leaving = from;
  playing = next;
  if (next) {
    next.dataset.piece = piece!; next.volume = 0; next.preload = 'auto';
    // Crossfade before the end when the length is known; otherwise (a server without range requests) go on when it ends.
    next.addEventListener('timeupdate', () => { if (next === playing && Number.isFinite(next.duration) && next.duration - next.currentTime < FADE) play(pick()); });
    next.addEventListener('ended', () => { if (next === playing) play(pick()); });
    next.addEventListener('error', () => { if (next === playing) playing = null; });
    if (!document.hidden && !paused) void next.play().catch(() => undefined);
  }
  told();
  clearInterval(fading);
  const step = 0.06 / fade;
  fading = window.setInterval(() => {
    const to = level(); let done = true;
    if (next) { next.volume = Math.min(to, next.volume + step * Math.max(to, 0.01)); if (next.volume < to) done = false; }
    if (from) { from.volume = Math.max(0, from.volume - step * Math.max(to, 0.01)); if (from.volume > 0) done = false; else { from.pause(); if (leaving === from) leaving = null; } }
    if (done) { clearInterval(fading); fading = 0; }
  }, 60);
}

/* ---- the first gesture opens sound; buttons make no sound of their own ---- */
if (typeof document !== 'undefined') {
  const open = () => { if (ctx) return; ctx = new AudioContext(); mood(want); };
  document.addEventListener('pointerdown', open, true);
  document.addEventListener('keydown', open, true);
  // A hidden tab is silent: the music pauses where it is and goes on when the tab is back.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend(); playing?.pause();
      if (leaving) { leaving.pause(); leaving = null; } // a crossfade half done ends here
    } else {
      void ctx.resume();
      if (playing && !paused) { if (!fading) playing.volume = level(); void playing.play().catch(() => undefined); }
    }
  });
  // The player in Options: pause or play, the next piece, or any piece chosen from the list.
  document.addEventListener('click', (e) => {
    const k = (e.target as HTMLElement).closest<HTMLElement>('[data-music]')?.dataset.music;
    if (k === 'toggle') Music.toggle(); else if (k === 'next') Music.next();
  });
  document.addEventListener('change', (e) => { const el = e.target as HTMLSelectElement; if (el.dataset.musicPick !== undefined) Music.choose(el.value); });
  // Volume sliders in Options: heard as they move.
  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement, k = el.dataset.vol as 'music' | 'fx' | undefined; if (!k) return;
    Sound[k] = +el.value; el.nextElementSibling!.textContent = `${el.value}%`; keepSound();
  });
  document.addEventListener('change', (e) => { if ((e.target as HTMLElement).dataset.vol === 'fx') fx('coins'); });
}
