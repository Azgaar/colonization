import type { Choice, State, View } from '@col/engine';
import { components, map } from '@col/engine';
import type { Bot } from '@col/bots';

/** What is kept of one game. Everything in reports is computed from these. */
export interface GameRecord {
  seed: string; ruleset: string; n: number; nations: string[]; bots: string[]; first: number;
  rounds: number; reason: string; choices: number; plays: number;
  winners: number[]; scores: number[]; parts: Record<string, number>[]; sides: string[]; colonies: number[]; founded: number[]; qualifies: boolean[];
  loyalist: number | null; tactic: string; pool: number; refBy: Record<string, number>;
  foundRounds: number[][]; scoreByRound: number[][]; priceEnd: Record<string, number>;
  gold: Record<string, number>[]; bells: Record<string, number>[]; crosses: Record<string, number>[];
  tax: { round: number; p: number; pay: boolean; could: boolean; rate: number }[];
  actions: Record<string, number>[]; hired: Record<string, number>[]; fathers: string[][]; buildings: string[][]; agents: string[][];
  sieges: { owner: number; cubes: number; attack: number; defence: number; dice: number; fell: boolean; takenBy: number | null; loyalist: number }[];
  attacks: { kind: string; p: number; round: number; gap: number; hits: number }[];
  settlements: { total: number; gone: number; allied: number; hostile: number };
  frags: number; events: string[]; poi: Record<string, number>; raids: number; gifts: number; passesWithCards: number;
  peak: Record<string, number>;
  /** Supply cards drawn, sales by resource. */
  sold: Record<string, number>;
  /** Per seat: decisions in which each card was on offer (`agent.x` to hire, `father.x` to take, `building.x` to build). Missing in older records. */
  offered?: Record<string, number>[];
  /** Per seat: decisions taken, and those with a single legal choice. Missing in older records. */
  decisions?: number[]; forced?: number[];
  /** Per seat: what was produced, by icon (corn, fish, leaf, fur, timber, silver). Missing in older records. */
  produced?: Record<string, number>[];
  /** Per seat: colonies founded next to the ocean. Missing in older records. */
  coastal?: number[];
}

/** What the seats saw while deciding. Filled by the bots that `watch` wraps. */
export interface Seen { offered: Record<string, number>[]; decisions: number[]; forced: number[] }
/** Wrap bots to note what each seat was offered, read from the legal choices of the views they already get. */
export function watch(bots: Bot[]): { bots: Bot[]; seen: Seen } {
  const seen: Seen = { offered: bots.map(() => ({})), decisions: bots.map(() => 0), forced: bots.map(() => 0) };
  const note = (v: View) => {
    const p = v.player, o = seen.offered[p], got = new Set<string>();
    seen.decisions[p]++;
    if (v.legal.length === 1) seen.forced[p]++;
    for (const c of v.legal) {
      const k = c.c === 'buy' && c.agent ? `agent.${c.agent}` : c.c === 'take' && c.father ? `father.${c.father}`
        : c.c === 'build' && c.b ? `building.${c.b}` : c.c === 'play' && c.a === 'build' && c.building ? `building.${c.building}` : null;
      if (k && !got.has(k)) { got.add(k); bump(o, k); }
    }
  };
  return { bots: bots.map((b) => ({ name: b.name, choose: (v: View) => { note(v); return b.choose(v); } })), seen };
}

const bump = (o: Record<string, number>, k: string, n = 1) => { o[k] = (o[k] ?? 0) + n; };

export function record(s: State, choices: Choice[], names: string[], ruleset: string, seen?: Seen): GameRecord {
  const n = s.players.length, maps = () => s.players.map(() => ({}) as Record<string, number>);
  const r: GameRecord = {
    seed: s.seed, ruleset, n, nations: s.players.map((p) => p.nation), bots: names, first: -1, rounds: s.round, reason: s.over!.reason, choices: choices.length, plays: 0,
    winners: s.over!.winners, scores: s.over!.players.map((p) => p.score), parts: s.over!.players.map((p) => Object.fromEntries(p.parts.map((x) => [x.label, x.value]))),
    sides: s.over!.players.map((p) => p.side), colonies: s.over!.players.map((p) => p.colonies), founded: s.players.map((_, p) => s.colonies.filter((c) => c.owner === p).length),
    qualifies: s.over!.players.map((p) => p.qualifies), loyalist: s.war!.loyalist, tactic: s.war!.tactic, pool: s.war!.pool, refBy: {},
    foundRounds: s.players.map(() => []), scoreByRound: [], priceEnd: { ...s.price }, gold: maps(), bells: maps(), crosses: maps(), tax: [], actions: maps(), hired: maps(),
    fathers: s.players.map((p) => [...p.fathers]), buildings: s.players.map((p) => [...p.buildings]), agents: s.players.map((p) => [...p.hand, ...p.deck, ...p.discard].sort()),
    sieges: s.war!.sieges.map((x) => ({ owner: x.owner, cubes: x.cubes, attack: x.attack ?? 0, defence: x.defence ?? 0, dice: x.dice?.length ?? 0, fell: !!x.fell, takenBy: x.takenBy ?? null, loyalist: x.loyalist.length })),
    attacks: [], settlements: { total: s.settlements.length, gone: s.settlements.filter((x) => !x.alive).length, allied: s.settlements.filter((x) => x.alive && x.ally !== null).length, hostile: s.settlements.filter((x) => x.alive && s.hostility[x.tribe] >= 4).length },
    frags: s.revealed.filter(Boolean).length, events: [], poi: {}, raids: 0, gifts: 0, passesWithCards: 0, peak: {}, sold: {}, produced: maps(), coastal: s.players.map(() => 0),
    ...(seen ? { offered: seen.offered, decisions: seen.decisions, forced: seen.forced } : {}),
  };
  let round = 0, target = '';
  const peak = (c: Record<string, number>) => { for (const [k, v] of Object.entries(c)) r.peak[k] = Math.max(r.peak[k] ?? 0, v); };
  const purse = s.players.map(() => 0);
  for (const e of s.log) {
    const p = e.p as number;
    switch (e.e) {
      case 'round': round = e.n as number; r.scoreByRound.push(e.scores as number[]); peak(e.components as Record<string, number>); break;
      case 'play': r.plays++; bump(r.actions[p], e.a as string); if (r.first < 0) r.first = p; break;
      case 'pass': if (!e.forced) r.passesWithCards++; break;
      case 'gold': purse[p] += e.n as number; bump(r.gold[p], `${(e.n as number) > 0 ? '+' : '-'}${e.why}`, Math.abs(e.n as number)); break;
      case 'bells': bump(r.bells[p], `${(e.n as number) > 0 ? '+' : '-'}${e.why}`, Math.abs(e.n as number)); break;
      case 'crosses': bump(r.crosses[p], `${(e.n as number) > 0 ? '+' : '-'}${e.why}`, Math.abs(e.n as number)); break;
      case 'tax': r.tax.push({ round, p, pay: e.pay as boolean, could: purse[p] >= (e.rate as number), rate: e.rate as number }); break;
      case 'ref': bump(r.refBy, e.why as string, e.n as number); break;
      case 'found': r.foundRounds[p].push(round); if (map.nb(s, e.cell as number).some((c) => s.map.terrain[c] === 'ocean')) r.coastal![p]!++; break;
      case 'produce': bump(r.produced![p]!, e.icon as string, e.n as number); break;
      case 'hire': bump(r.hired[p], e.agent as string); break;
      case 'attack': target = e.target as string; break;
      case 'combat': { const a = e.attack as { total: number }, d = e.defence as { total: number }; r.attacks.push({ kind: target, p, round, gap: a.total - d.total, hits: e.hits as number }); break; }
      case 'event': if (e.id) r.events.push(e.id as string); break;
      case 'poi': bump(r.poi, `${e.deck}.${e.card}`); break;
      case 'raid': r.raids++; break;
      case 'activate': if ((e.hostility as number) <= 2) r.gifts++; break;
      case 'sell': bump(r.sold, e.r as string, e.n as number); break;
    }
  }
  peak({ ...components(s), red: r.pool });
  return r;
}
