/**
 * Automatic detectors (FR-T-7): stalls, dead cards, runaway leaders, dominated options, and the balance targets of
 * ai-and-testlab.md §5. Every finding carries its sample size and an interval; scans over many cards widen the
 * intervals by Bonferroni's correction, so a flag is not a chance result of looking at many things. Pure.
 */
import type { GameDef } from '@col/data';
import type { GameRecord } from './record.ts';
import { leaderWins, mdTable } from './metrics.ts';
import { mean, pct, sd, wilson, zFor } from './stats.ts';

export type FindingKind = 'stall' | 'dead card' | 'runaway leader' | 'dominated option' | 'target';
export interface Finding {
  kind: FindingKind;
  /** flag: the interval lies past the threshold; watch: only the estimate does; ok: within. */
  level: 'flag' | 'watch' | 'ok';
  subject: string; claim: string;
  /** Estimate with its interval, already corrected for `tests` comparisons. A share is 0–1, a gap is a difference of shares. */
  unit: 'share' | 'number' | 'gap'; value: number; lo: number; hi: number; n: number; tests: number;
  /** The threshold or range checked against, in words. */
  against: string;
}
export interface DetectOptions {
  /** The choice cap of playGame; games past `capShare` of it count as near the cap. */
  maxChoices: number; capShare: number;
  /** Share of seat-rounds in which the seat's score did not move, above which a game is called stalled. */
  idleRounds: number;
  /** Passes with cards left per player per game. */
  passes: number;
  /** A card taken by fewer than this share of the seats it was offered to is dead. */
  deadShare: number;
  /** A final margin of this many points or more is large; flagged when more than `bigMarginShare` of games have one. */
  bigMargin: number; bigMarginShare: number;
  /** Seats needed before a card or option is tested at all. */
  minSeats: number;
}
export const DETECT_DEFAULTS: DetectOptions = { maxChoices: 20000, capShare: 0.5, idleRounds: 0.2, passes: 1, deadShare: 0.05, bigMargin: 10, bigMarginShare: 0.25, minSeats: 20 };
export interface Detection { games: number; players: number[]; findings: Finding[]; scanned: Record<FindingKind, number> }

const win = (r: GameRecord, p: number) => (r.winners.includes(p) ? 1 / r.winners.length : 0);
const seats = (rs: GameRecord[]) => rs.flatMap((r) => r.scores.map((_, p) => [r, p] as const));
/** Level from an interval and a range: flagged when the whole interval is outside. */
const judge = (v: number, lo: number, hi: number, min: number, max: number): Finding['level'] => (hi < min || lo > max ? 'flag' : v < min || v > max ? 'watch' : 'ok');
const share = (k: number, n: number, z: number) => { const [lo, hi] = wilson(k, n, z); return { unit: 'share' as const, value: n ? k / n : 0, lo, hi, n }; };
const meanZ = (a: number[], z: number, unit: 'share' | 'number' = 'number') => { const m = mean(a), h = a.length > 1 ? (z * sd(a)) / Math.sqrt(a.length) : Infinity; return { unit, value: m, lo: m - h, hi: m + h, n: a.length }; };
/** Difference of mean win share between two groups of seats, with a normal interval. */
function gap(a: number[], b: number[], z: number) {
  const d = mean(a) - mean(b), h = a.length > 1 && b.length > 1 ? z * Math.sqrt(sd(a) ** 2 / a.length + sd(b) ** 2 / b.length) : Infinity;
  return { unit: 'gap' as const, value: d, lo: d - h, hi: d + h, n: a.length + b.length };
}
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '?'), pts = (x: number) => (Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${(100 * x).toFixed(0)} pts` : '?');

export function detect(rs: GameRecord[], def: GameDef, options: Partial<DetectOptions> = {}): Detection {
  const o = { ...DETECT_DEFAULTS, ...options }, out: Finding[] = [];
  const scanned: Record<FindingKind, number> = { stall: 0, 'dead card': 0, 'runaway leader': 0, 'dominated option': 0, target: 0 };
  const add = (f: Finding) => { scanned[f.kind]++; out.push(f); };
  const multi = rs.filter((r) => r.n > 1);

  // --- Stalls: the experience proxies ---------------------------------------------------
  {
    const z = zFor(4), near = rs.filter((r) => r.choices >= o.capShare * o.maxChoices).length, s = share(near, rs.length, z);
    add({ kind: 'stall', level: near ? 'flag' : 'ok', subject: 'games near the choice cap', claim: `${near} of ${rs.length} games took ${o.capShare * o.maxChoices}+ decisions`, ...s, tests: 4, against: `none (cap ${o.maxChoices})` });
    // A seat whose score estimate did not move over a round made no meaningful change. Round starts only: final scores include the war.
    const idle = rs.map((r) => { const q = r.scoreByRound; let k = 0, n = 0; for (let i = 1; i < q.length; i++) q[i].forEach((x, p) => { n++; if (x === q[i - 1][p]) k++; }); return n ? k / n : 0; });
    const m = meanZ(idle, z, 'share'), still = rs.filter((r) => r.scoreByRound.some((q, i) => i > 0 && q.every((x, p) => x === r.scoreByRound[i - 1][p]))).length;
    add({ kind: 'stall', level: judge(m.value, m.lo, m.hi, 0, o.idleRounds), subject: 'seat-rounds with no score change', claim: `${pct(m.value)} of a seat's rounds leave its score as it was; ${idle.filter((x) => x > o.idleRounds).length} games above ${pct(o.idleRounds)}; ${still} games have a round in which no score moved`, ...m, tests: 4, against: `≤ ${pct(o.idleRounds)} of seat-rounds` });
    const pass = meanZ(rs.map((r) => r.passesWithCards / r.n), z);
    add({ kind: 'stall', level: judge(pass.value, pass.lo, pass.hi, 0, o.passes), subject: 'passes with cards left', claim: `${f1(pass.value)} per player per game`, ...pass, tests: 4, against: `≤ ${o.passes} per player per game` });
    const withD = rs.filter((r) => r.decisions && r.forced);
    if (withD.length) {
      const f = meanZ(withD.map((r) => r.forced!.reduce((a, b) => a + b, 0) / Math.max(1, r.decisions!.reduce((a, b) => a + b, 0))), z, 'share');
      add({ kind: 'stall', level: judge(f.value, f.lo, f.hi, 0, 0.5), subject: 'decisions with one legal choice', claim: `${pct(f.value)} of decisions leave no choice`, ...f, tests: 4, against: '≤ 50% (no agreed target)' });
    }
  }

  // --- Cards: offered, taken, and how holders do ------------------------------------------
  const cards = [
    ...Object.values(def.agents).filter((a) => a.kind === 'common').map((a) => `agent.${a.id}`),
    ...Object.keys(def.fathers).map((x) => `father.${x}`), ...Object.keys(def.buildings).map((x) => `building.${x}`),
  ];
  const held = (r: GameRecord, p: number, c: string) => { const [k, id] = c.split('.') as [string, string]; return k === 'agent' ? (r.hired[p][id] ?? 0) > 0 : k === 'father' ? r.fathers[p].includes(id) : r.buildings[p].includes(id); };
  // Older records lack offers: then every seat counts as offered, which can only make a card look less dead.
  const offered = (r: GameRecord, p: number, c: string) => (r.offered ? (r.offered[p][c] ?? 0) > 0 || held(r, p, c) : true);
  const stats = cards.map((c) => {
    const on = seats(rs).filter(([r, p]) => offered(r, p, c)), take = on.filter(([r, p]) => held(r, p, c));
    return { c, on, take, winH: take.filter(([r]) => r.n > 1).map(([r, p]) => win(r, p)), winN: on.filter(([r, p]) => r.n > 1 && !held(r, p, c)).map(([r, p]) => win(r, p)) };
  });
  {
    const tested = stats.filter((x) => x.on.length >= o.minSeats), z = zFor(tested.length);
    for (const x of stats) {
      if (!x.on.length) { add({ kind: 'dead card', level: 'watch', subject: x.c, claim: `never offered in ${rs.length} games`, unit: 'share', value: 0, lo: 0, hi: 1, n: 0, tests: tested.length, against: 'offered at least once' }); continue; }
      if (x.on.length < o.minSeats) continue;
      const s = share(x.take.length, x.on.length, z), level = s.hi < o.deadShare ? 'flag' : s.value < o.deadShare ? 'watch' : 'ok';
      if (level !== 'ok') add({ kind: 'dead card', level, subject: x.c, claim: `taken by ${x.take.length} of ${x.on.length} seats it was offered to`, ...s, tests: tested.length, against: `≥ ${pct(o.deadShare)} of offered seats` });
      else scanned['dead card']++;
    }
  }

  // --- Dominated options: cards, actions, tax --------------------------------------------
  {
    const acts = [...new Set(rs.flatMap((r) => r.actions.flatMap((a) => Object.keys(a))))].sort();
    const options = [
      ...stats.map((x) => ({ subject: x.c, a: x.winH, b: x.winN, what: 'holders' })),
      ...acts.map((k) => { const s = seats(multi); return { subject: `action ${k}`, a: s.filter(([r, p]) => (r.actions[p][k] ?? 0) > 0).map(([r, p]) => win(r, p)), b: s.filter(([r, p]) => !(r.actions[p][k] ?? 0)).map(([r, p]) => win(r, p)), what: 'seats that used it' }; }),
    ];
    // Tax: seats that refused every affordable tax against seats that paid every one.
    const tax = seats(multi).map(([r, p]) => { const t = r.tax.filter((x) => x.p === p && x.could); return { w: win(r, p), t: t.length, refused: t.filter((x) => !x.pay).length }; }).filter((x) => x.t > 0);
    options.push({ subject: 'tax: refuse every affordable tax vs pay every one', a: tax.filter((x) => x.refused === x.t).map((x) => x.w), b: tax.filter((x) => x.refused === 0).map((x) => x.w), what: 'refusers' });
    const tested = options.filter((x) => x.a.length >= o.minSeats && x.b.length >= o.minSeats), z = zFor(tested.length);
    for (const x of tested) {
      const g = gap(x.a, x.b, z), worse = g.hi < 0;
      if (!worse && g.lo <= 0) { scanned['dominated option']++; continue; }
      add({ kind: 'dominated option', level: worse ? 'flag' : 'watch', subject: x.subject, claim: `${x.what} win ${pct(mean(x.a))} (n ${x.a.length}) against ${pct(mean(x.b))} (n ${x.b.length}): ${worse ? 'dominated' : 'possibly dominant (or a sign of an early lead)'}`, ...g, tests: tested.length, against: 'no difference in win share' });
    }
  }

  // --- Runaway leaders --------------------------------------------------------------------
  {
    const z = zFor(3);
    for (const round of [3, 5]) {
      const v = multi.flatMap((r) => { const x = leaderWins(r, round); return x === null ? [] : [{ x, chance: 1 / r.n }]; });
      if (!v.length) continue;
      const m = meanZ(v.map((y) => y.x - y.chance), z), chance = mean(v.map((y) => y.chance)), rate = m.value + chance;
      add({ kind: 'runaway leader', level: m.lo > 0 ? 'flag' : m.value > 0 ? 'watch' : 'ok', subject: `leader at round ${round} wins`, claim: `${pct(rate)} against ${pct(chance)} by chance (${f1(rate / chance)}×)`, unit: 'share', value: rate, lo: m.lo + chance, hi: m.hi + chance, n: m.n, tests: 3, against: `chance ${pct(chance)}; designer: "very rare"` });
    }
    // Against the best other player who could have won (qualified); games where nobody else did are no contest.
    const margins = multi.filter((r) => r.winners.length).map((r) => r.scores[r.winners[0]] - Math.max(...r.scores.filter((_, p) => !r.winners.includes(p) && r.qualifies[p]), -Infinity)).filter(Number.isFinite);
    if (margins.length) {
      const big = margins.filter((x) => x >= o.bigMargin).length, s = share(big, margins.length, z);
      add({ kind: 'runaway leader', level: judge(s.value, s.lo, s.hi, 0, o.bigMarginShare), subject: 'large final margins', claim: `${big} of ${margins.length} decided games won by ${o.bigMargin}+ points over the best other qualified player; mean margin ${f1(mean(margins))}`, ...s, tests: 3, against: `≤ ${pct(o.bigMarginShare)} of games (no agreed target)` });
    }
  }

  // --- Balance targets (ai-and-testlab.md §5), four-player games --------------------------
  const four = rs.filter((r) => r.n === 4);
  if (four.length) {
    const target = (subject: string, k: number, n: number, min: number, max: number, z: number, tests: number, against: string, claim = '') => { const s = share(k, n, z); add({ kind: 'target', level: judge(s.value, s.lo, s.hi, min, max), subject, claim: claim || `${pct(s.value)} of ${n}`, ...s, tests, against }); };
    const group = (key: (r: GameRecord, p: number) => string) => { const m = new Map<string, { n: number; w: number }>(); for (const [r, p] of seats(four)) { const x = m.get(key(r, p)) ?? { n: 0, w: 0 }; x.n++; x.w += win(r, p); m.set(key(r, p), x); } return [...m].sort((a, b) => a[0].localeCompare(b[0])); };
    const bySeat = group((r, p) => String(((p - r.first + r.n) % r.n) + 1)), z1 = zFor(bySeat.length);
    for (const [k, x] of bySeat) target(`seat ${k} win rate`, Math.round(x.w), x.n, 0.22, 0.28, z1, bySeat.length, '22–28%');
    const nations = group((r, p) => r.nations[p]), z2 = zFor(nations.length);
    for (const [k, x] of nations) { const stars = def.nations[k]?.stars ?? 1; target(`nation ${k} (${stars}★) win rate`, Math.round(x.w), x.n, stars <= 1 ? 0.2 : 0, 0.3, z2, nations.length, stars <= 1 ? '20–30%' : '≤ 30% (harder nation)'); }
    const bots = group((r, p) => r.bots[p]);
    if (bots.length > 1) { const z3 = zFor(bots.length); for (const [k, x] of bots) target(`personality ${k} win rate`, Math.round(x.w), x.n, 0.15, 0.35, z3, bots.length, '15–35% in mixed games'); }
    const loyal = four.filter((r) => r.loyalist !== null), z = zFor(3);
    target('loyalist win rate', loyal.filter((r) => r.winners.includes(r.loyalist!)).length, loyal.length, 0.1, 0.2, z, 3, 'about 15% (10–20%)');
    target('games ending before round 8', four.filter((r) => r.rounds < 8).length, four.length, 0, 0.25, z, 3, 'under 25%');
    const sieges = four.flatMap((r) => r.sieges);
    target('colonies surviving the war', sieges.filter((x) => !x.fell).length, sieges.length, 0.4, 0.7, z, 3, '40–70%', `${sieges.filter((x) => !x.fell).length} of ${sieges.length} besieged colonies held`);
  }
  return { games: rs.length, players: [...new Set(rs.map((r) => r.n))].sort(), findings: out, scanned };
}

const ORDER: FindingKind[] = ['stall', 'dead card', 'runaway leader', 'dominated option', 'target'];
const TITLE: Record<FindingKind, string> = { stall: 'Stalls', 'dead card': 'Dead cards', 'runaway leader': 'Runaway leaders', 'dominated option': 'Dominated options', target: 'Balance targets (4 players)' };
const LEVEL = { flag: '**flag**', watch: 'watch', ok: 'ok' };
export function detectMarkdown(d: Detection): string {
  const fmt = (f: Finding) => (f.unit === 'share' ? [pct(f.value), `${pct(Math.max(0, f.lo))}–${pct(Math.min(1, f.hi))}`] : f.unit === 'gap' ? [pts(f.value), `${pts(f.lo)} to ${pts(f.hi)}`] : [f1(f.value), `${f1(f.lo)}–${f1(f.hi)}`]);
  const flags = d.findings.filter((f) => f.level === 'flag').length, watch = d.findings.filter((f) => f.level === 'watch').length;
  return [
    `${d.games} games (${d.players.join(', ')} players): ${flags} flagged, ${watch} to watch. Intervals are 95%, widened by Bonferroni's correction for the number of tests in each scan; a flag means the whole interval is past the threshold.`,
    ...ORDER.map((k) => {
      const fs = d.findings.filter((f) => f.kind === k).sort((a, b) => ['flag', 'watch', 'ok'].indexOf(a.level) - ['flag', 'watch', 'ok'].indexOf(b.level));
      const quiet = k === 'dead card' || k === 'dominated option' ? `\n\n${d.scanned[k]} tested in all; only those outside their threshold are listed.` : '';
      return `## ${TITLE[k]}${quiet}\n\n${fs.length ? mdTable(['', 'subject', 'finding', 'estimate', 'interval', 'n', 'tests', 'against'], fs.map((f) => [LEVEL[f.level], f.subject, f.claim, ...fmt(f), String(f.n), String(f.tests), f.against])) : 'Nothing found.'}`;
    }),
  ].join('\n\n');
}
