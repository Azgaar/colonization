/**
 * Overnight balance batch: the shipped levels at every player count, nations, seats, personalities, Fathers, buildings and the map.
 * Usage: node packages/lab/src/playtest/balance.ts <tag> [scale=1] [level=normal]
 * Writes out/playtest/<tag>-balance.md and the raw records next to it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PERSONALITIES, type Level, type Personality } from '@col/bots';
import { loadRuleset } from '@col/data';
import { runAll, type BotSpec } from '../pool.ts';
import { table } from '../design.ts';
import type { GameRecord } from '../record.ts';
import { compareTable, mdTable, seatTable } from '../metrics.ts';
import { mean, share } from '../stats.ts';

const [tag = 'night', sc = '1', lv = 'normal'] = process.argv.slice(2);
const scale = Number(sc), level = lv as Level, def = loadRuleset(), t0 = performance.now();
const N = (n: number) => Math.max(8, Math.round(n * scale));
mkdirSync('out/playtest', { recursive: true });
const out: string[] = [`# Balance batch "${tag}", ${level} bots\n`];
const section = (t: string, ...body: string[]) => { out.push(`\n## ${t}\n`, ...body.map((b) => b + '\n')); writeFileSync(`out/playtest/${tag}-balance.md`, out.join('\n')); console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s: ${t}`); };
const keep = (name: string, rs: GameRecord[]) => writeFileSync(`out/playtest/${tag}-${name}.jsonl`, rs.map((r) => JSON.stringify(r)).join('\n'));
const bot = (p: Personality = 'balanced'): BotSpec => ({ kind: 'level', name: p, level, personality: p });

const base: Record<number, GameRecord[]> = {};
for (const n of [1, 2, 3, 4, 5]) { base[n] = await runAll(table(def, { prefix: `${tag}-${n}`, games: N(n === 4 ? 1200 : 500), players: n, bots: [bot()] })); keep(`base-${n}`, base[n]); }
section('By player count', compareTable([1, 2, 3, 4, 5].map((n) => [`${n} players`, base[n]])));

const nation = (r: GameRecord, p: number) => `${def.nations[r.nations[p]].en} (${def.nations[r.nations[p]].stars}★, ${def.nations[r.nations[p]].deck.length} cards)`;
for (const n of [2, 4]) section(`Nations, ${n} players`, seatTable(base[n], 'Nation', nation));
for (const n of [3, 4, 5]) section(`Seats, ${n} players`, seatTable(base[n], 'Seat (0 plays first in round 1)', (_r, p) => `seat ${p}`));

const people = (Object.keys(PERSONALITIES) as Personality[]).map((p) => bot(p));
const mixed = await runAll(table(def, { prefix: `${tag}-mix`, games: N(1200), players: 4, bots: people }));
keep('mixed-4', mixed);
section('Personalities, 4 players, mixed tables', seatTable(mixed, 'Personality', (r, p) => r.bots[p]));

// Fathers and buildings: how often taken, and the takers' results against everyone's.
const four = base[4];
const holders = (pick: (r: GameRecord, p: number) => string[]) => {
  const m = new Map<string, { n: number; win: number; score: number[] }>();
  let seats = 0, wins = 0;
  const all: number[] = [];
  for (const r of four) r.scores.forEach((sc, p) => {
    seats++; all.push(sc); const w = r.winners.includes(p) ? 1 / r.winners.length : 0; wins += w;
    for (const k of new Set(pick(r, p))) { const e = m.get(k) ?? { n: 0, win: 0, score: [] }; e.n++; e.win += w; e.score.push(sc); m.set(k, e); }
  });
  const avg = mean(all), wr = wins / seats;
  return mdTable(['', 'taken by (share of seats)', 'takers win', 'win rate ratio', 'takers score vs mean'],
    [...m.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, e]) => [k, share(e.n, seats), share(e.win, e.n), (e.win / e.n / wr).toFixed(2), `${mean(e.score) - avg >= 0 ? '+' : ''}${(mean(e.score) - avg).toFixed(1)}`]));
};
section('Fathers, 4 players', holders((r, p) => r.fathers[p].map((f) => def.fathers[f]?.en ?? f)));
section('Buildings, 4 players', holders((r, p) => r.buildings[p].map((b) => def.buildings[b]?.en ?? b)));
section('Hired agents, 4 players', holders((r, p) => Object.keys(r.hired[p]).map((a) => def.agents[a]?.en ?? a)));

// The map and the opening: when colonies come, and how a slow start ends.
const map = (rs: GameRecord[]) => {
  const first = rs.flatMap((r) => r.foundRounds.map((f) => f[0] ?? 99)), second = rs.flatMap((r) => r.foundRounds.map((f) => f[1] ?? 99));
  const none = rs.flatMap((r) => r.founded.map((f) => f === 0)).filter(Boolean).length, seats = rs.length * rs[0].n;
  return [
    `first colony by round 1: ${share(first.filter((x) => x <= 1).length, seats)}, by round 2: ${share(first.filter((x) => x <= 2).length, seats)}, never: ${share(none, seats)}`,
    `second colony by round 4: ${share(second.filter((x) => x <= 4).length, seats)}, never: ${share(second.filter((x) => x === 99).length, seats)}`,
    `three colonies: ${share(rs.flatMap((r) => r.founded).filter((f) => f >= 3).length, seats)}`,
    `raids per player: ${(mean(rs.map((r) => r.raids)) / rs[0].n).toFixed(2)}; settlements per map ${mean(rs.map((r) => r.settlements.total)).toFixed(1)}, hostile at the end ${mean(rs.map((r) => r.settlements.hostile)).toFixed(1)}`,
  ].join('\n\n');
};
section('Map and opening', ...[2, 3, 4, 5].map((n) => `**${n} players**\n\n${map(base[n])}`));

// The winner's shape: wide or tall, bells or colonies.
const shape = (rs: GameRecord[]) => {
  const rows: string[][] = [];
  for (const k of [0, 1, 2, 3]) {
    const seats = rs.flatMap((r) => r.founded.map((f, p) => ({ f, w: r.winners.includes(p) ? 1 / r.winners.length : 0, sc: r.scores[p] }))).filter((x) => Math.min(3, x.f) === k);
    if (seats.length) rows.push([`${k} colonies founded`, share(seats.length, rs.length * rs[0].n), share(seats.reduce((n, x) => n + x.w, 0), seats.length), mean(seats.map((x) => x.sc)).toFixed(1)]);
  }
  return mdTable(['', 'seats', 'win', 'score'], rows);
};
section('Wide or tall, 4 players', shape(base[4]));
section('Wide or tall, 2 players', shape(base[2]));
console.log(`done in ${((performance.now() - t0) / 60000).toFixed(1)} min`);
