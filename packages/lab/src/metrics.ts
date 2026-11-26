import type { GameRecord } from './record.ts';
import { ci, mean, paired, pct, quantile, share } from './stats.ts';

/** Named numbers computed from one game; each can be averaged, split and compared. */
export const PER_GAME: Record<string, (r: GameRecord) => number | null> = {
  'rounds played': (r) => r.rounds,
  'ended by bells': (r) => +(r.reason === 'bells'),
  'REF cubes in the war': (r) => r.pool,
  'colonies founded per player': (r) => mean(r.founded),
  'cubes per attacked colony': (r) => (r.sieges.length ? mean(r.sieges.map((x) => x.cubes)) : null),
  'attack per colony': (r) => (r.sieges.length ? mean(r.sieges.map((x) => x.attack)) : null),
  'defence per colony': (r) => (r.sieges.length ? mean(r.sieges.map((x) => x.defence)) : null),
  'patriot colonies that survive': (r) => (r.sieges.length ? mean(r.sieges.map((x) => +!x.fell)) : null),
  'colonies taken by the loyalist': (r) => (r.sieges.length ? mean(r.sieges.map((x) => +(x.takenBy !== null))) : null),
  'loyalist wins': (r) => (r.loyalist === null ? null : +r.winners.includes(r.loyalist)),
  'a patriot wins': (r) => +r.winners.some((w) => w !== r.loyalist),
  'nobody wins': (r) => +(r.winners.length === 0),
  'no loyalist (all patriots)': (r) => (r.n === 1 ? null : +(r.loyalist === null)),
  'taxes refused although affordable': (r) => { const t = r.tax.filter((x) => x.could); return t.length ? mean(t.map((x) => +!x.pay)) : null; },
  'taxes that could be paid': (r) => (r.tax.length ? mean(r.tax.map((x) => +x.could)) : null),
  'winner score': (r) => (r.winners.length ? r.scores[r.winners[0]] : null),
  'mean score': (r) => mean(r.scores),
  'leader at round 5 wins': (r) => leaderWins(r, 5),
  'gold earned per player': (r) => mean(r.gold.map(income)),
  'gold from trade per player': (r) => mean(r.gold.map((g) => (g['+trade'] ?? 0) + (g['+customs'] ?? 0) + (g['+smuggle'] ?? 0))),
  'gold from ruins, wrecks, loot per player': (r) => mean(r.gold.map((g) => (g['+poi'] ?? 0) + (g['+loot'] ?? 0) + (g['+explore'] ?? 0))),
  'gold from events per player': (r) => mean(r.gold.map((g) => g['+event'] ?? 0)),
  'bells from refusing taxes per player': (r) => mean(r.bells.map((b) => b['+tax'] ?? 0)),
  'bells from production per player': (r) => mean(r.bells.map((b) => b['+production'] ?? 0)),
  'Fathers per player': (r) => mean(r.fathers.map((f) => f.length)),
  'buildings per player': (r) => mean(r.buildings.map((f) => f.length)),
  'agents per player': (r) => mean(r.agents.map((f) => f.length)),
  'fragments revealed': (r) => r.frags,
  'settlements allied at the end': (r) => r.settlements.allied,
  'settlements destroyed': (r) => r.settlements.gone,
  'raids per game': (r) => r.raids,
  'attacks on players per game': (r) => r.attacks.filter((a) => a.kind !== 'settlement').length,
  'attacks on settlements per game': (r) => r.attacks.filter((a) => a.kind === 'settlement').length,
  'decisions per player': (r) => r.choices / r.n,
  'cards played per player': (r) => r.plays / r.n,
};
export const income = (g: Record<string, number>) => Object.entries(g).reduce((n, [k, v]) => n + (k.startsWith('+') ? v : 0), 0);
export function leaderWins(r: GameRecord, round: number): number | null {
  const s = r.scoreByRound[round - 1];
  if (!s || r.n === 1 || !r.winners.length) return null;
  const top = Math.max(...s), lead = s.flatMap((x, p) => (x === top ? [p] : []));
  return mean(lead.map((p) => +r.winners.includes(p)));
}
export const isShare = (k: string) => /^(ended|patriot col|colonies taken|loyalist wins|a patriot|nobody|no loyalist|taxes|leader)/.test(k);
export const values = (rs: GameRecord[], k: string) => rs.map(PER_GAME[k]).filter((x): x is number => x !== null);
export function cell(rs: GameRecord[], k: string): string {
  const v = values(rs, k);
  if (!v.length) return '–';
  return isShare(k) ? `${pct(mean(v))} ±${pct(ci(v))}` : `${mean(v).toFixed(1)} ±${ci(v).toFixed(1)}`;
}
export const mdTable = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
export const compareTable = (groups: [string, GameRecord[]][], keys = Object.keys(PER_GAME)) => mdTable(['', ...groups.map(([n]) => n)], keys.map((k) => [k, ...groups.map(([, rs]) => cell(rs, k))]));
/** Paired differences on the same seeds, marking those outside their interval. */
export function diffTable(a: GameRecord[], bs: [string, GameRecord[]][], keys: string[]): string {
  return mdTable(['Change', ...keys], [['(board)', ...keys.map((k) => cell(a, k))], ...bs.map(([n, b]) => [n, ...keys.map((k) => {
    const x: number[] = [], y: number[] = [];
    a.forEach((r, i) => { const p = PER_GAME[k](r), q = PER_GAME[k](b[i]); if (p !== null && q !== null) { x.push(p); y.push(q); } });
    const { diff, half } = paired(x, y), f = (z: number) => (isShare(k) ? `${z >= 0 ? '+' : ''}${(100 * z).toFixed(0)} pts` : `${z >= 0 ? '+' : ''}${z.toFixed(1)}`);
    return Math.abs(diff) > half ? `**${f(diff)}**` : f(diff);
  })])]);
}
/** Win share by something each seat has. */
export function bySeat(rs: GameRecord[], key: (r: GameRecord, p: number) => string | null): Map<string, { n: number; wins: number; score: number[]; loyal: number; qual: number }> {
  const m = new Map<string, { n: number; wins: number; score: number[]; loyal: number; qual: number }>();
  for (const r of rs) for (let p = 0; p < r.n; p++) {
    const k = key(r, p);
    if (k === null) continue;
    const x = m.get(k) ?? { n: 0, wins: 0, score: [], loyal: 0, qual: 0 };
    x.n++;
    if (r.winners.includes(p)) x.wins += 1 / r.winners.length;
    x.score.push(r.scores[p]);
    if (r.loyalist === p) x.loyal++;
    if (r.qualifies[p]) x.qual++;
    m.set(k, x);
  }
  return m;
}
export const seatTable = (rs: GameRecord[], title: string, key: (r: GameRecord, p: number) => string | null) =>
  mdTable([title, 'games', 'wins', 'was loyalist', 'kept a colony', 'score'], [...bySeat(rs, key)].sort((a, b) => b[1].wins / b[1].n - a[1].wins / a[1].n)
    .map(([k, x]) => [k, String(x.n), share(Math.round(x.wins), x.n), pct(x.loyal / x.n), pct(x.qual / x.n), mean(x.score).toFixed(1)]));
export const peaks = (rs: GameRecord[]) => {
  const keys = [...new Set(rs.flatMap((r) => Object.keys(r.peak)))];
  return keys.map((k) => { const v = rs.map((r) => r.peak[k] ?? 0); return [k, quantile(v, 0.5), quantile(v, 0.95), Math.max(...v)] as const; });
};
