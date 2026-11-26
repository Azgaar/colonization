/* The game session: the real rules engine with the player in seat 0 and test bots in the others; or a recorded game, replayed. */
import { applyInPlace, createGame, IllegalChoice, load, save, viewFor, type Choice, type Decision, type LogEntry, type State } from '@col/engine';
import { goalBot, PERSONALITIES, type Bot, type Personality } from '@col/bots';
import { loadRuleset, rulesets, type GameDef } from '@col/data';
import { exportRules, exportState, type GameView } from './view.ts';

/** A log entry or a decision as the interface reads them: the engine keeps their fields loose. */
export type Entry = LogEntry & Record<string, any>;
export type Pending = Decision & Record<string, any>;
/** A choice the engine offers, with its own fields (card, cell, building…). */
export type Opt = Choice & Record<string, any>;

/** How a new game is set up (FR-U-1). Seat 0 is the player. */
export interface Setup { nations: string[]; bots: Personality[]; ruleset: string; seed: string }
/** A recorded game: what is needed to play it again choice by choice. */
export interface Replay { ruleset: string; rulesetHash?: string; seed: string; nations: string[]; bots?: string[]; choices: Choice[] }

export const NATIONS = ['french', 'english', 'spanish', 'dutch', 'portuguese', 'swedish', 'danish', 'russian', 'curonian', 'scottish'];
export const PERSONALITY_NAMES = Object.keys(PERSONALITIES) as Personality[];
export const RULESETS = Object.keys(rulesets);
const SAVE = 'game', wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Log entries that show something hidden: dice, a new tile, a card from a deck. Undo stops there (FR-U-12). */
const REVEALS = new Set(['roll', 'combat', 'reveal', 'settlement', 'poi', 'event', 'gainAgent', 'siege', 'war']);

/** The first game, before the player sets one up. */
export const DEFAULT: Setup = { nations: ['french', 'english', 'spanish', 'dutch'], bots: ['balanced', 'trader', 'explorer'], ruleset: 'board', seed: 'start' };
let def: GameDef = loadRuleset('board'), setup: Setup = DEFAULT;
let s: State, bots: Bot[] = [], history: { json: string; placed: Placed[] }[] = [], seen = 0, busy = false, fast = localStorage.getItem('fast') === '1';
let replay: { data: Replay; at: number; marks: Map<number, string> } | null = null;
const told = new Set<LogEntry>();
/** An agent that was played on the board, shown where it went until the round ends. */
export interface Placed { card: string; space: string }

/** What the interface reads: kept as one object whose identity never changes, refreshed in place. */
export const D = exportRules(def) as GameView;
let P0: GameView['players'][number] | null = null;

/** The seat whose view is shown: the player, or any seat in a replay. */
let seat = 0;
function refresh() {
  const x = exportState(s, seat);
  if (P0) { Object.assign(P0, x.players[seat]); x.players[seat] = P0; } else P0 = x.players[seat];
  Object.assign(D, x);
}
/** A bot for every seat: the others play with it, and the player's own can play a round for them. */
const seatBots = () => { bots = s.players.map((_, i) => goalBot(`${s.seed}${i}`, PERSONALITIES[(i === 0 ? 'balanced' : setup.bots[i - 1]) ?? 'balanced'])); };
const begin = () => { s.logging = true; seen = s.log.length; history = []; Sim.placed.splice(0); seatBots(); refresh(); };
const mine = () => !replay && s.pending?.player === 0 && !s.over;

export const Sim = {
  D, placed: [] as Placed[],
  get s() { return s; }, get busy() { return busy; }, get seat() { return seat; }, get setup() { return setup; },
  get fast() { return fast; }, set fast(v: boolean) { fast = v; localStorage.setItem('fast', v ? '1' : ''); },
  get replay() { return replay; },
  /** The kind of decision the player has to make now, if any. */
  kind: (): string | null => (mine() ? s.pending!.kind : null),
  pending: () => (mine() ? (s.pending as Pending) : null),
  mine,
  refresh,
  /** A new game. */
  start(x: Setup) {
    setup = x; def = loadRuleset(x.ruleset); replay = null; seat = 0;
    s = createGame({ def, seed: x.seed, nations: x.nations, logging: true });
    Object.assign(D, exportRules(def)); begin();
  },
  /** The game saved in this browser, if there is one, taken up again. */
  resume(): boolean {
    const raw = localStorage.getItem(SAVE); if (!raw) return false;
    try { const x = JSON.parse(raw) as { setup: Setup; game: string; placed: Placed[] }; setup = x.setup; def = loadRuleset(x.setup.ruleset); replay = null; seat = 0; s = load(x.game, def); Object.assign(D, exportRules(def)); begin(); Sim.placed.push(...x.placed); return true; } catch { localStorage.removeItem(SAVE); return false; }
  },
  /** Save the game at this decision (FR-E-10). */
  keep() { if (!replay) localStorage.setItem(SAVE, JSON.stringify({ setup, game: save(s), placed: Sim.placed })); },
  hasSaved: () => !!localStorage.getItem(SAVE),
  /** Save as a file to keep or to send. */
  file: () => JSON.stringify({ setup, game: save(s), placed: Sim.placed }),
  open(text: string) { localStorage.setItem(SAVE, text); return Sim.resume(); },
  legal: (): Choice[] => (mine() ? viewFor(s, 0).legal : []),
  /** Remember this moment, so that it can be taken back. */
  mark() { history.push({ json: save(s), placed: Sim.placed.slice() }); if (history.length > 40) history.shift(); },
  canUndo: () => history.length > 0 && !busy && !replay,
  undo() { const h = history.pop(); if (!h) return; s = load(h.json, def); s.logging = true; Sim.placed.splice(0, 99, ...h.placed); seen = s.log.length; refresh(); },
  /** One choice of the player, checked against the engine's list: one that is not legal now is refused and the game is left as it was. Once something hidden shows, earlier moments cannot be taken back. */
  apply(c: Choice): boolean {
    const from = s.log.length;
    try { applyInPlace(s, c); } catch (e) { if (e instanceof IllegalChoice) { console.warn('refused', JSON.stringify(c), e.message); return false; } throw e; }
    if (s.log.slice(from).some((e) => REVEALS.has(e.e))) history = [];
    return true;
  },
  /** These entries were already told. */
  seen(l: LogEntry[]) { l.forEach((e) => told.add(e)); },
  /** News since the last look. */
  news(): Entry[] { const l = s.log.slice(seen).filter((e) => !told.has(e) || !['combat', 'attack'].includes(e.e)); seen = s.log.length; return l as Entry[]; },
  /** Everyone else plays until it is the player's decision again. `show` is called after each of their turns. What they did cannot be undone. */
  async run(show: (p: number, l: Entry[]) => void) {
    if (busy || replay) return; busy = true;
    let last: { p: number; from: number } | null = null, acted = false;
    while (!s.over && s.pending!.player !== 0) {
      const p = s.pending!.player, k = s.pending!.kind, from = s.log.length;
      applyInPlace(s, bots[p].choose(viewFor(s, p)), true); acted = true;
      if (k === 'turn') last = { p, from };
      const ended = s.over || s.pending!.kind === 'turn' || s.pending!.player === 0;
      if (last && ended) { refresh(); show(last.p, s.log.slice(last.from) as Entry[]); last = null; if (!fast) await wait(650); }
    }
    if (acted) history = [];
    busy = false; refresh();
  },
  /** Let a bot play for the player as well, up to some point. */
  async auto(until: (s: State) => boolean) {
    if (busy || replay) return; Sim.mark(); let n = 0;
    while (!s.over && !until(s) && n++ < 5000) { const p = s.pending!.player; applyInPlace(s, bots[p].choose(viewFor(s, p)), true); }
    history = []; Sim.placed.splice(0); refresh();
  },

  /* ---- replays (FR-U-17, FR-T-6) ---- */
  /** Open a recorded game at its start. */
  watch(data: Replay) {
    def = loadRuleset(data.ruleset);
    if (data.rulesetHash && data.rulesetHash !== def.rulesetHash) throw new Error(`recorded with another version of ruleset "${data.ruleset}"`);
    setup = { nations: data.nations, bots: [], ruleset: data.ruleset, seed: data.seed };
    replay = { data, at: 0, marks: new Map() }; seat = 0; Object.assign(D, exportRules(def)); Sim.seek(0);
  },
  /** Go to the moment after `at` choices, rebuilding from the nearest kept moment before it. */
  seek(at: number) {
    if (!replay) return;
    const r = replay, to = Math.max(0, Math.min(r.data.choices.length, at)), STEP = 200;
    const from = [...r.marks.keys()].filter((k) => k <= to).sort((a, b) => b - a)[0];
    let n = from ?? 0;
    s = from === undefined ? createGame({ def, seed: r.data.seed, nations: r.data.nations, logging: true }) : load(r.marks.get(from)!, def);
    s.logging = true;
    while (n < to) { applyInPlace(s, r.data.choices[n], true); n++; if (n % STEP === 0 && !r.marks.has(n)) r.marks.set(n, save(s)); }
    r.at = to; seen = s.log.length; Sim.placed.splice(0); refresh();
  },
  /** Whose view the replay shows. */
  view(p: number) { seat = p; refresh(); },
  stopWatching() { replay = null; seat = 0; if (!Sim.resume()) Sim.start(DEFAULT); },
};

// Something to show from the first moment: the saved game, or a new one.
if (!Sim.resume()) Sim.start(setup);
