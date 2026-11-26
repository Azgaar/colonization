import type { Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Choice, Combat, State, View } from '@col/engine';
import { applyInPlace, clone, findLoyalist, legal, nextU32, seedRng, util } from '@col/engine';
import { goalBot, type GoalBot } from './goal.ts';
import { forecast } from './outlook.ts';
import type { Weights } from './weights.ts';

type Rng = [number, number, number, number];
const below = (r: Rng, n: number) => Math.floor((nextU32(r) / 4294967296) * n);
function shuffle<T>(r: Rng, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = below(r, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const copies = (m: Record<string, { id: string; copies?: number }>, ok: (x: any) => boolean = () => true) =>
  Object.values(m).filter(ok).flatMap((x) => Array.from({ length: x.copies ?? 1 }, () => x.id));
/** What is left of a multiset after taking out the cards seen elsewhere. */
function minus(all: string[], ...seen: string[][]): string[] {
  const n = new Map<string, number>();
  for (const a of seen) for (const x of a) if (x !== '?') n.set(x, (n.get(x) ?? 0) + 1);
  return all.filter((x) => { const k = n.get(x); if (!k) return true; n.set(x, k - 1); return false; });
}
/** `n` cards from what is unseen. If counting went wrong somewhere, pad from everything so the game stays playable. */
function deal(r: Rng, pool: string[], n: number, all: string[]): string[] {
  const out = shuffle(r, pool).slice(0, n);
  while (out.length < n && all.length) out.push(all[below(r, all.length)]);
  return out;
}

/**
 * A full state the seat cannot tell from the truth: every hidden card, deck order and map fragment is sampled from what it has not seen.
 * Known gaps: drawn events and tactics are unknown, so they may come back; cards put on the agent deck by a recruit are not remembered;
 * the size of another player's secret army and spent bells or gold in the war, and cards an attacker committed against us, read as none.
 */
export function determinize(v: View, rng: Rng): State {
  const s = clone(v.state), def = s.def, me = v.player, war = s.war;
  s.rng = [nextU32(rng), nextU32(rng), nextU32(rng), nextU32(rng) | 1];
  s.seed = 'determinized';
  s.logging = false;
  s.log = [];

  // Agents: commons are conserved, so the deck is exactly the commons nobody holds.
  const commons = copies(def.agents, (a) => a.kind === 'common');
  const recruit = s.pending?.kind === 'recruit' && s.pending.player === me ? (s.pending.cards as string[]) : [];
  s.agentDeck = deal(rng, minus(commons, s.agentDiscard, s.pier.flat(), v.collections.flat(), recruit), s.agentDeck.length, commons);
  s.players.forEach((pl, i) => {
    if (i === me) { shuffle(rng, pl.deck); return; }
    // Hand and deck together are the collection without what lies open.
    const all = v.collections[i] ?? [];
    const hidden = deal(rng, minus(all, pl.discard, pl.inPlay ? [pl.inPlay] : []), pl.hand.length + pl.deck.length, all.length ? all : commons);
    pl.hand = hidden.slice(0, pl.hand.length);
    pl.deck = hidden.slice(pl.hand.length);
  });

  const fathers = Object.keys(def.fathers);
  s.fatherDeck = deal(rng, minus(fathers, s.salon, s.fatherDiscard, s.players.flatMap((p) => p.fathers)), s.fatherDeck.length, fathers);
  const events = Object.keys(def.events);
  s.eventDeck = deal(rng, minus(events, s.event ? [s.event] : []), s.eventDeck.length, events);
  const tactics = Object.keys(def.tactics);
  s.tacticDeck = deal(rng, minus(tactics, war ? [war.tactic] : []), s.tacticDeck.length, tactics);
  // Ruins and wrecks being played are named by the task that discards them.
  const playing = (deck: string) => s.stack.filter((t) => t.t === 'poiDone' && t.deck === deck).map((t) => t.id as string);
  const ruins = Object.keys(def.ruins), wrecks = Object.keys(def.wrecks);
  s.ruinDeck = deal(rng, minus(ruins, s.ruinDiscard, playing('ruin')), s.ruinDeck.length, ruins);
  s.wreckDeck = deal(rng, minus(wrecks, s.wreckDiscard, playing('wreck')), s.wreckDeck.length, wrecks);
  const tribes = copies(def.tribes);
  s.tribeDeck = deal(rng, minus(tribes, s.settlements.map((x) => x.tribe)), s.tribeDeck.length, tribes);

  // Loyalist cards in the sieges come from the loyalist's collection, each at most once.
  if (war && war.loyalist !== null && war.loyalist !== me) {
    const pool = shuffle(rng, [...(v.collections[war.loyalist] ?? [])]);
    for (const x of war.sieges) x.loyalist = x.loyalist.map((c) => (c === '?' ? pool.pop() ?? 'colonist' : c));
  }
  // Secret fields the engine needs to go on: what others gave in a joint event is unknown, so nothing.
  const d = s.pending;
  if (d?.kind === 'joint' && !d._given) d._given = Array((d.order as number[]).indexOf(d.player)).fill(0);
  for (const t of s.stack) if (t.t === 'joint' && !t._given) t._given = [];

  // The map: unused tiles go to closed fragments, and their cells are filled in a new MapInfo, as clones share it.
  const used = new Set(s.frags.filter((f) => f >= 0));
  const spare = shuffle(rng, def.tiles.map((_, i) => i).filter((i) => !used.has(i)));
  s.frags = s.frags.map((f) => (f >= 0 ? f : spare.pop() ?? 0));
  const m = s.map, size = def.settings.map.size, edge = def.settings.ring.openSea + def.settings.ring.europe;
  const terrain = m.terrain.slice(), bonus = m.bonus.slice(), poi = m.poi.slice();
  for (let i = 0; i < m.zone.length; i++) {
    const f = m.frag[i];
    if (f < 0 || s.revealed[f]) continue;
    const mr = Math.floor(i / m.width) - edge, mc = (i % m.width) - edge;
    const cell = def.tiles[s.frags[f]].cells[(mr % 3) * 3 + (mc % 3)];
    terrain[i] = cell.terrain;
    bonus[i] = cell.bonus ?? null;
    poi[i] = cell.poi ?? null;
  }
  if (size * size !== s.frags.length) throw new Error('unexpected map size');
  s.map = { ...m, terrain, bonus, poi };
  return s;
}

// --- Search ------------------------------------------------------------------------

export interface Budget {
  /** Thinking time per decision. Used only when `iterations` is not given. */
  ms?: number;
  /** Samples per decision. When given, the bot is deterministic. */
  iterations?: number;
}
export interface SearchOptions extends Budget {
  weights?: Partial<Weights>; name?: string;
  /** How many of the goal bot's best candidates are searched. */
  width?: number;
  /** Rounds simulated: 1 stops at the end of the current round. The war is always played out. */
  horizon?: number;
  /** What the other seats are taken to value in rollouts; by default the same as this bot. */
  others?: Partial<Weights>;
  /** Noise of the goal bots in rollouts. */
  noise?: number;
  /** UCB1 exploration, in units of the spread of results. */
  explore?: number;
  /** Standard errors by which a candidate must beat the goal bot's choice on the same truths to replace it. */
  confidence?: number;
  /** Points by which it must beat it at least: small leads come from the rough worth of goods, which the goal bot judges better. */
  least?: number;
}
export interface SearchBot extends GoalBot { stats: { decisions: number; searched: number; iterations: number; ms: number; errors: number } }

/** `res[j]` is the result on the j-th sampled truth, shared by all candidates; undefined if it could not be played. */
interface Arm { choice: Choice; n: number; sum: number; tries: number; res: (number | undefined)[] }
/** Step decisions of a move follow the plan of the turn; searching each step would cost much and change little. */
const DELEGATE = new Set(['move', 'cargo']);
/** Without a colony nothing counts, so a forecast without one loses this much. */
const NO_COLONY = 10;

const collections = (s: State): string[][] => s.players.map((pl, i) => {
  const c: Combat | null = s.combat, x = util.collection(pl);
  if (c?.attacker === i) x.push(...c.a);
  else if (c && c.defender === i) x.push(...c.d, ...(c.top ? [c.top] : []));
  return x;
});
/** Rounds until the war, as the goal bot reckons them. */
function roundsLeft(s: State): number {
  const set = s.def.settings, top = Math.max(...s.players.map((p) => p.bells));
  if (top >= set.war.bells) return 0;
  return Math.min(set.rounds.max - s.round + 1, Math.max(1, Math.ceil((set.war.bells - top) / 4) + 1)) - 1;
}
/** Rough points of what the score does not count yet: goods (timber and food lead to buildings and colonies) and the remainders of gold and agents. */
function material(s: State, p: number): number {
  const pl = s.players[p], sc = s.def.settings.score;
  let v = (pl.gold % sc.goldPerPoint) / sc.goldPerPoint + (util.collectionSize(pl) % sc.agentsPerPoint) / sc.agentsPerPoint * 0.5;
  for (const r of RESOURCES) v += (pl.wh[r] + pl.hold[r]) * Math.max((s.price[r] / sc.goldPerPoint) * 0.6, GOODS[r] ?? 0);
  return v;
}
const GOODS: Partial<Record<Resource, number>> = { timber: 0.3, food: 0.2 };
/** Points ahead of the best rival (or expected points alone), counting the risk of having no colony. */
export function margin(s: State, me: number): number {
  let adj: number[];
  if (s.over) adj = s.over.players.map((x) => x.score - (x.qualifies ? 0 : NO_COLONY));
  else {
    const f = forecast(s, collections(s), s.war ? s.war.loyalist : findLoyalist(s), roundsLeft(s));
    adj = f.map((x, p) => x.points + material(s, p) - (1 - x.qualifies) * NO_COLONY);
  }
  const rivals = adj.filter((_, i) => i !== me);
  return adj[me] - (rivals.length ? Math.max(...rivals) : 0);
}

/**
 * Information-set Monte Carlo search. At each decision worth it, the goal bot proposes candidates; every sample draws a new
 * hidden truth, plays one candidate and continues with goal bots for every seat to the horizon, then scores with the forecast.
 * UCB1 shares samples out; a candidate replaces the goal bot's choice only when it does surely better on the same truths.
 */
export function searchBot(seed: string, o: SearchOptions = {}): SearchBot {
  const width = o.width ?? 6, horizon = o.horizon ?? 1, noise = o.noise ?? 0.1, explore = o.explore ?? 1, confidence = o.confidence ?? 1, least = o.least ?? 0.5;
  const guide = goalBot(seed, o.weights, o.name ?? 'search', width);
  const rng = seedRng(`search-${seed}`);
  let sample = 0;
  const bot: SearchBot = {
    name: o.name ?? 'search', last: [], stats: { decisions: 0, searched: 0, iterations: 0, ms: 0, errors: 0 },
    choose(v) {
      bot.stats.decisions++;
      const pick = guide.choose(v);
      const cands = guide.last.map((x) => x.choice);
      if (v.legal.length < 2 || DELEGATE.has(v.state.pending!.kind) || cands.length < 2) { bot.last = guide.last.slice(0, 5); return pick; }
      const t0 = performance.now(), me = v.player, round = v.state.round;
      const arms: Arm[] = cands.map((choice) => ({ choice, n: 0, sum: 0, tries: 0, res: [] }));
      // Common random numbers: candidates are compared on the same truths and dice, which removes most of the luck from the difference.
      const truths: State[] = [], base = sample;
      let total = 0, all = 0, allSq = 0, n = 0;
      const enough = () => (o.iterations !== undefined ? total >= o.iterations : performance.now() - t0 >= (o.ms ?? 3000));
      while (!enough()) {
        // Exploration scaled by how much results vary, as points differ between games and player counts.
        const spread = n > 1 ? Math.max(1, Math.sqrt(Math.max(0, allSq / n - (all / n) ** 2))) : 1;
        const ucb = (a: Arm) => (a.n ? a.sum / a.n : 0) + explore * spread * Math.sqrt(Math.log(total) / a.tries);
        let arm = arms.find((a) => !a.tries) ?? arms.reduce((b, a) => (ucb(a) > ucb(b) ? a : b));
        // Every candidate is judged against the goal bot's choice on the same truths, so that one is kept level with the most tried.
        if (arms[0].tries <= arm.tries) arm = arms[0];
        total++;
        const j = arm.tries++;
        if (j + base >= sample) sample = j + base + 1;
        try {
          const s = clone(truths[j] ??= determinize(v, rng));
          applyInPlace(s, arm.choice);
          const bots = s.players.map((_, p) => goalBot(`${seed}:${base + j}:${p}`, { ...(p === me ? o.weights : o.others ?? o.weights), noise }));
          // The war starts without a new round, so once begun it is played out.
          for (let steps = 0; !s.over && s.round - round < horizon && steps < 5000; steps++) {
            const p = s.pending!.player;
            applyInPlace(s, bots[p].choose({ player: p, state: s, legal: legal(s), collections: collections(s) }), true);
          }
          const x = margin(s, me);
          arm.res[j] = x; arm.n++; arm.sum += x; all += x; allSq += x * x; n++;
        } catch {
          // A sampled truth the engine cannot play is skipped, but counts against the budget.
          bot.stats.errors++;
        }
      }
      const ms = performance.now() - t0;
      bot.stats.searched++; bot.stats.iterations += total; bot.stats.ms += ms;
      // Leave the goal bot's choice only for a candidate that does better on the same truths by more than the noise.
      const gain = arms.map((a) => {
        const d: number[] = [];
        a.res.forEach((x, j) => { const y = arms[0].res[j]; if (x !== undefined && y !== undefined) d.push(x - y); });
        if (d.length < 2) return { mean: 0, sure: a === arms[0] ? 0 : -Infinity };
        const m = d.reduce((k, x) => k + x, 0) / d.length, sd = Math.sqrt(d.reduce((k, x) => k + (x - m) ** 2, 0) / (d.length - 1));
        return { mean: m, sure: Math.min(m - confidence * sd / Math.sqrt(d.length), m - least) };
      });
      const order = arms.map((a, i) => ({ a, i })).sort((x, y) => (y.i === 0 ? 0 : gain[y.i].sure) - (x.i === 0 ? 0 : gain[x.i].sure) || gain[y.i].mean - gain[x.i].mean || x.i - y.i);
      // The choice made first; the rest best to worst, by how they did against the goal bot's choice on the same truths.
      const [made, ...rest] = order;
      rest.sort((x, y) => gain[y.i].mean - gain[x.i].mean || x.i - y.i);
      bot.last = [made, ...rest].slice(0, 5).map(({ a, i }) => {
        const mean = a.n ? a.sum / a.n : 0, share = Math.round((100 * a.n) / Math.max(1, total));
        const vs = v.state.players.length > 1 ? ' vs the best rival' : '';
        const g = i ? `, ${gain[i].mean >= 0 ? '+' : ''}${gain[i].mean.toFixed(1)} vs the goal bot's choice` : ", the goal bot's choice";
        return { choice: a.choice, score: mean, why: `${share}% of ${total} samples, ${mean >= 0 ? '+' : ''}${mean.toFixed(1)} points${vs}${g} (${guide.last[i].why})`, goal: guide.last[i].why, to: guide.last[i].to };
      });
      return order[0].a.choice;
    },
  };
  return bot;
}
