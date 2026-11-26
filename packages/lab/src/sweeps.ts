/** Sweeps (FR-T-5): one or two settings over ranges, every point on the same paired seeds. Pure, so the browser can run it too. */
import { defFor, type BotSpec, type GameSpec } from './game.ts';
import { table } from './design.ts';
import type { GameRecord } from './record.ts';
import { isShare, mdTable, PER_GAME } from './metrics.ts';
import { ci, mean, paired } from './stats.ts';

export interface SweepAxis { path: string; values: unknown[] }
export interface SweepOptions {
  paths: SweepAxis[]; games: number; players: number; bots: BotSpec[];
  ruleset?: string; prefix?: string; nations?: string[];
  /** Changes held fixed at every point. */
  base?: GameSpec['changes'];
  /** Metrics from PER_GAME to report; a short default list otherwise. */
  keys?: string[];
}
export interface SweepPoint { label: string; values: unknown[]; changes: Record<string, unknown> }
export interface SweepPlan { o: SweepOptions; points: SweepPoint[]; specs: GameSpec[][] }
export interface Stat { mean: number; half: number; n: number }
/** Paired difference against the first point: games where both sides have a value. */
export interface Diff { diff: number; diffHalf: number; pairs: number; significant: boolean }
export interface SweepResult {
  paths: SweepAxis[]; games: number; players: number; ruleset: string; prefix: string; bots: string[]; keys: string[];
  points: (SweepPoint & { metrics: Record<string, Stat & Diff> })[];
}

export const SWEEP_KEYS = ['loyalist wins', 'a patriot wins', 'patriot colonies that survive', 'REF cubes in the war', 'rounds played', 'ended by bells', 'taxes refused although affordable', 'gold from trade per player', 'leader at round 5 wins', 'winner score'];
const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
const botName = (b: BotSpec) => (b.kind === 'goal' ? b.name : b.kind);

/** Every point of the grid (cartesian product for two paths), each with the same seeds, nations and seats. */
export function planSweep(o: SweepOptions): SweepPlan {
  if (o.paths.length < 1 || o.paths.length > 2) throw new Error('a sweep takes one or two paths');
  const grid: unknown[][] = o.paths.length === 1 ? o.paths[0].values.map((v) => [v]) : o.paths[0].values.flatMap((a) => o.paths[1].values.map((b) => [a, b]));
  const points = grid.map((values): SweepPoint => ({
    label: values.map((v, i) => `${o.paths[i].path.split('.').slice(-1)[0]}=${show(v)}`).join(', '), values,
    changes: { ...(o.base ?? {}), ...Object.fromEntries(values.map((v, i) => [o.paths[i].path, v])) },
  }));
  // Compiling each point here turns a wrong path or value into one clear error before any game runs.
  for (const p of points) defFor({ ruleset: o.ruleset, changes: p.changes });
  const def = defFor({ ruleset: o.ruleset });
  const specs = points.map((p) => table(def, { prefix: o.prefix ?? 'sweep', games: o.games, players: o.players, bots: o.bots, changes: p.changes, ...(o.nations ? { nations: o.nations } : {}), ...(o.ruleset ? { ruleset: o.ruleset } : {}) }));
  return { o, points, specs };
}

function metric(f: (r: GameRecord) => number | null, first: GameRecord[], rs: GameRecord[], compare: boolean): Stat & Diff {
  const v = rs.map(f).filter((x): x is number => x !== null), x: number[] = [], y: number[] = [];
  first.forEach((r, g) => { const a = f(r), b = f(rs[g]); if (a !== null && b !== null) { x.push(a); y.push(b); } });
  const d = paired(x, y);
  return { mean: mean(v), half: ci(v), n: v.length, diff: d.diff, diffHalf: d.half, pairs: x.length, significant: compare && Math.abs(d.diff) > d.half };
}
export function aggregateSweep(plan: SweepPlan, records: GameRecord[][]): SweepResult {
  const keys = plan.o.keys ?? SWEEP_KEYS, first = records[0];
  for (const k of keys) if (!PER_GAME[k]) throw new Error(`unknown metric "${k}"`);
  return {
    paths: plan.o.paths, games: plan.o.games, players: plan.o.players, ruleset: plan.o.ruleset ?? 'board', prefix: plan.o.prefix ?? 'sweep',
    bots: [...new Set(plan.o.bots.map(botName))], keys,
    points: plan.points.map((pt, i) => ({ ...pt, metrics: Object.fromEntries(keys.map((k) => [k, metric(PER_GAME[k], first, records[i], i > 0)])) })),
  };
}

/** Plan, run on the given runner (`runAll` in Node, `runAllBrowser` in the browser) in one batch, aggregate. */
export async function sweep(o: SweepOptions, run: (specs: GameSpec[]) => Promise<GameRecord[]>): Promise<{ result: SweepResult; records: GameRecord[][] }> {
  const plan = planSweep(o), all = await run(plan.specs.flat()), records = plan.specs.map((_, i) => all.slice(i * o.games, (i + 1) * o.games));
  return { result: aggregateSweep(plan, records), records };
}

const num = (k: string, z: number, sign = false) => (isShare(k) ? `${sign && z >= 0 ? '+' : ''}${(100 * z).toFixed(0)}${sign ? ' pts' : '%'}` : `${sign && z >= 0 ? '+' : ''}${z.toFixed(1)}`);
/** "mean ±half", then the paired change against the first point, bold when outside its 95% interval. */
function sweepCell(k: string, m: Stat & Diff, i: number): string {
  if (!m.n) return '–';
  const base = `${num(k, m.mean)} ±${num(k, m.half)}`;
  if (i === 0) return base;
  const d = num(k, m.diff, true);
  return `${base} (${m.significant ? `**${d}**` : d})`;
}
export function sweepMarkdown(r: SweepResult): string {
  const head = `Sweep of ${r.paths.map((p) => `\`${p.path}\``).join(' × ')}: ${r.points.length} points, ${r.games} paired games each, ${r.players} players, bots ${r.bots.join(', ')}, ruleset ${r.ruleset}, seeds \`${r.prefix}-*\`. Each cell: mean ±95% interval, then the paired change against the first point (${r.points[0].label}); bold = outside its 95% interval.`;
  if (r.paths.length === 1) return [head, mdTable([r.paths[0].path, ...r.keys], r.points.map((p, i) => [show(p.values[0]), ...r.keys.map((k) => sweepCell(k, p.metrics[k], i))]))].join('\n\n');
  const [a, b] = r.paths, cols = b.values.length;
  return [head, ...r.keys.map((k) => `### ${k}\n\n${mdTable([`${a.path} \\ ${b.path}`, ...b.values.map(show)], a.values.map((va, i) => [show(va), ...b.values.map((_, j) => sweepCell(k, r.points[i * cols + j].metrics[k], i * cols + j))]))}`)].join('\n\n');
}
