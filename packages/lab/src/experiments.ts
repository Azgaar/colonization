/**
 * The experiments behind the balance report. Writes raw results and tables to out/.
 * Usage: node packages/lab/src/experiments.ts [scale] [only,...]   (scale 1 is the full size)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { PERSONALITIES, type Personality, type Weights } from '@col/bots';
import { runAll, type BotSpec, type GameSpec } from './pool.ts';
import { table } from './design.ts';
import type { GameRecord } from './record.ts';
import { compareTable, diffTable, mdTable, peaks, seatTable, values } from './metrics.ts';
import { ci, mean, pct, share } from './stats.ts';

const scale = Number(process.argv[2] ?? 1), only = process.argv[3]?.split(',');
const def = loadRuleset(), N = (n: number) => Math.max(20, Math.round(n * scale));
// Tuned weights if `pnpm tune` has produced them, otherwise the hand-set personality.
const tunedBot = (name: string, file: string, p: Personality): BotSpec => ({ kind: 'goal', name, weights: existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')).weights as Weights) : PERSONALITIES[p] });
const tuned = tunedBot('tuned', 'out/tuned.json', 'balanced'), patriot = tunedBot('tuned patriot', 'out/tuned-patriot.json', 'defender'), duel = tunedBot('tuned-2p', 'out/tuned-2p.json', 'balanced');
const people = (Object.keys(PERSONALITIES) as Personality[]).map((p): BotSpec => ({ kind: 'goal', name: p, personality: p }));
const mixed = [...people, tuned, patriot];
const out: string[] = [], section = (t: string, ...body: string[]) => { out.push(`\n## ${t}\n`, ...body.map((b) => b + '\n')); writeFileSync('out/tables.md', out.join('\n')); console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s: ${t}`); };
const t0 = performance.now();
const want = (id: string) => !only || only.includes(id);
mkdirSync('out', { recursive: true });
const keep = (name: string, rs: GameRecord[]) => writeFileSync(`out/${name}.jsonl`, rs.map((r) => JSON.stringify(r)).join('\n'));

// --- 1. Baseline by player count, two kinds of table ------------------------------------
const base: Record<string, GameRecord[]> = {};
if (want('base')) {
  for (const n of [1, 2, 3, 4, 5]) {
    base[`t${n}`] = await runAll(table(def, { prefix: `base-${n}`, games: N(n === 4 ? 2000 : 800), players: n, bots: [n === 2 ? duel : tuned] }));
    base[`m${n}`] = await runAll(table(def, { prefix: `base-${n}`, games: N(n === 4 ? 2400 : 800), players: n, bots: mixed }));
    keep(`base-tuned-${n}`, base[`t${n}`]);
    keep(`base-mixed-${n}`, base[`m${n}`]);
  }
  section('Baseline, tuned bots', compareTable([1, 2, 3, 4, 5].map((n) => [`${n} players`, base[`t${n}`]])));
  section('Baseline, mixed personalities', compareTable([1, 2, 3, 4, 5].map((n) => [`${n} players`, base[`m${n}`]])));
  section('Personalities, 4 players', seatTable(base.m4, 'Personality', (r, p) => r.bots[p]));
  for (const k of ['t4', 'm4']) {
    section(`Nations, 4 players, ${k}`, seatTable(base[k], 'Nation', (r, p) => `${r.nations[p]} (${def.nations[r.nations[p]].stars}★, ${def.nations[r.nations[p]].deck.length} cards)`));
    section(`Turn order, 4 players, ${k}`, seatTable(base[k], 'Seat from first player', (r, p) => String((p - r.first + r.n) % r.n + 1)));
    section(`Side, 4 players, ${k}`, seatTable(base[k], 'Side', (r, p) => r.sides[p]));
    section(`Colonies founded, 4 players, ${k}`, seatTable(base[k], 'Colonies', (r, p) => String(r.founded[p])));
    section(`Fathers, 4 players, ${k}`, seatTable(base[k].flatMap((r) => [r]), 'Number of Fathers', (r, p) => String(r.fathers[p].length)));
    section(`Final bells, 4 players, ${k}`, seatTable(base[k], 'Bells in the end', (r, p) => { const b = Object.entries(r.bells[p]).reduce((n, [x, v]) => n + (x.startsWith('+') ? v : x === '-militia' ? 0 : -v), 0); return b < 3 ? '0-2' : b < 6 ? '3-5' : b < 10 ? '6-9' : b < 15 ? '10-14' : '15+'; }));
    for (const [what, all] of [['Father', Object.keys(def.fathers)], ['Building', Object.keys(def.buildings)]] as const) {
      const rs = base[k], get = (r: GameRecord, p: number) => (what === 'Father' ? r.fathers[p] : r.buildings[p]);
      const avg = rs.length * 4;
      const rows = all.map((c) => { let n = 0, w = 0; for (const r of rs) for (let p = 0; p < r.n; p++) if (get(r, p).includes(c)) { n++; if (r.winners.includes(p)) w += 1 / r.winners.length; } return [c, pct(n / avg, 1), n ? share(Math.round(w), n) : '–', String(n)]; }).sort((a, b) => Number(b[3]) - Number(a[3]));
      section(`${what}s, 4 players, ${k}`, mdTable([what, 'share of seats', 'wins when held', 'n'], rows.map((r) => r)));
    }
    const hired: Record<string, number> = {};
    for (const r of base[k]) for (const h of r.hired) for (const [a, v] of Object.entries(h)) hired[a] = (hired[a] ?? 0) + v;
    section(`Hired agents, 4 players, ${k}`, mdTable(['Agent', 'copies', 'hired per game'], Object.values(def.agents).filter((a) => a.kind === 'common').map((a) => [a.id, String(a.copies), ((hired[a.id] ?? 0) / base[k].length).toFixed(2)]).sort((a, b) => Number(b[2]) - Number(a[2]))));
    const acts: Record<string, number> = {};
    for (const r of base[k]) for (const h of r.actions) for (const [a, v] of Object.entries(h)) acts[a] = (acts[a] ?? 0) + v;
    section(`Actions, 4 players, ${k}`, mdTable(['Action', 'per player per game'], Object.entries(acts).map(([a, v]) => [a, (v / base[k].length / 4).toFixed(2)]).sort((a, b) => Number(b[1]) - Number(a[1]))));
    const ref: Record<string, number> = {};
    for (const r of base[k]) for (const [a, v] of Object.entries(r.refBy)) ref[a] = (ref[a] ?? 0) + v;
    section(`REF sources, 4 players, ${k}`, mdTable(['Source', 'cubes per game'], Object.entries(ref).map(([a, v]) => [a, (v / base[k].length).toFixed(1)]).sort((a, b) => Number(b[1]) - Number(a[1]))));
    const byGap = new Map<number, [number, number]>();
    for (const r of base[k]) for (const x of r.sieges) { const g = Math.max(0, Math.min(10, x.attack - x.defence)); const y = byGap.get(g) ?? [0, 0]; y[0]++; y[1] += +!x.fell; byGap.set(g, y); }
    section(`Siege gap, 4 players, ${k}`, mdTable(['attack minus defence', 'sieges', 'held'], [...byGap].sort((a, b) => a[0] - b[0]).map(([g, [n, h]]) => [g === 10 ? '10+' : String(g), pct(n / base[k].flatMap((r) => r.sieges).length), pct(h / n)])));
  }
  for (const n of [2, 3, 4, 5]) {
    const t = base[`t${n}`];
    const rows = Array.from({ length: 9 }, (_, i) => i + 2).map((rd) => { const x = t.flatMap((r) => r.tax.filter((y) => y.round === rd)); const c = x.filter((y) => y.could); return [String(rd), String(def.settings.tax.track[rd - 1]), pct(c.length / Math.max(1, x.length)), c.length ? pct(mean(c.map((y) => +y.pay))) : '–']; });
    section(`Taxes by round, ${n} players, tuned`, mdTable(['Round', 'Rate', 'could pay', 'paid, if able'], rows));
  }
  section('Colonies by player count', mdTable(['Players', 'bots', 'founded per player', 'seats with 3', 'seats with 0', 'first colony, round', 'third colony, round'], [2, 3, 4, 5].flatMap((n) => ['t', 'm'].map((k) => { const rs = base[`${k}${n}`], f = rs.flatMap((r) => r.founded), rd = rs.flatMap((r) => r.foundRounds); return [String(n), k === 't' ? 'tuned' : 'mixed', mean(f).toFixed(2), pct(mean(f.map((x) => +(x === 3)))), pct(mean(f.map((x) => +(x === 0)))), mean(rd.filter((x) => x.length > 0).map((x) => x[0])).toFixed(1), mean(rd.filter((x) => x.length > 2).map((x) => x[2])).toFixed(1)]; }))));
  section('Peak components, 5 players', mdTable(['Component', 'typical', '95% of games', 'most'], peaks([...base.t5, ...base.m5]).map(([k, a, b, c]) => [k, String(a), String(b), String(c)])));
}

// --- 2. What-if changes on paired seeds -------------------------------------------------
const KEYS = ['loyalist wins', 'a patriot wins', 'patriot colonies that survive', 'REF cubes in the war', 'rounds played', 'ended by bells', 'taxes refused although affordable', 'gold from trade per player', 'leader at round 5 wins'];
const compare = async (id: string, title: string, players: number, games: number, changes: [string, GameSpec['changes']][], bots: BotSpec[]) => {
  if (!want(id)) return;
  const mk = (c?: GameSpec['changes']) => table(def, { prefix: `ab-${players}`, games: N(games), players, bots, ...(c ? { changes: c } : {}) });
  const a = await runAll(mk());
  const bs: [string, GameRecord[]][] = [];
  for (const [name, c] of changes) bs.push([name, await runAll(mk(c))]);
  section(`${title} (${players} players, ${a.length} paired games, ${bots.length > 1 ? 'mixed' : 'tuned'} bots; bold = outside the 95% interval)`, diffTable(a, bs, KEYS));
};
const S = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`settings.${k}`, v]));
const TAX: [string, GameSpec['changes']][] = [
  ['refusal adds 1 cube', S({ 'tax.refuseRef': 1 })],
  ['refusal gives no bell', S({ 'tax.refuseBells': 0 })],
  ['1 cube and no bell', S({ 'tax.refuseRef': 1, 'tax.refuseBells': 0 })],
  ['taxes halved', S({ 'tax.track': [0, 1, 2, 3, 5, 5, 7, 7, 10, 12] })],
  ['taxes a third', S({ 'tax.track': [0, 0, 1, 2, 3, 3, 5, 5, 6, 8] })],
];
const WAR: [string, GameSpec['changes']][] = [
  ['a cube is 1 🗡️', S({ 'war.refStrength': 1 })],
  ['a cube is 1 🗡️, refusal adds 1', S({ 'war.refStrength': 1, 'tax.refuseRef': 1 })],
  ['mercenary 3 gold', S({ 'war.mercenaryGold': 3 })],
  ['dice cap 5', S({ 'war.diceCap': 5 })],
  ['ally gives 5', S({ 'war.allyCubes': 5 })],
  ['base defence 4', S({ 'war.baseDefence': 4 })],
  ['loyalist colony 2 points', S({ 'score.loyalistColony': 2 })],
  ['loyalist colony 6 points', S({ 'score.loyalistColony': 6 })],
  ['war at 20 bells', S({ 'war.bells': 20 })],
];
const ECON: [string, GameSpec['changes']][] = [
  ['start prices +2 for goods and silver, cap 7', { ...S({ 'market.maxPrice': 7 }), 'resources.goods.price': 7, 'resources.silver.price': 7 }],
  ['Franklin +1', { 'fathers.benjamin_franklin.mods.0.add': 1 }],
  ['preaching costs at least 1', S({ 'natives.preachMin': 1 })],
  ['hold 6', S({ 'hold.size': 6 })],
];
const READ: [string, GameSpec['changes']][] = [
  ['raids from hostility 3', S({ 'activation.raidMinHostility': 3 })], ['no settlement gifts', S({ 'activation.gift': 0 })], ['damage leaves the ship where it is', S({ 'damage.sendsToEurope': false })],
  ['one Father per action', S({ 'propaganda.maxFathers': 1 })], ['cargo costs per unit', S({ 'cargo.costPer': 'unit' })],
  ['combat dice capped at 10', S({ 'combat.diceCap': 10 })], ['explore diagonally', S({ 'explore.diagonal': true })], ['own tokens do not block cells', S({ 'production.emptyMeans': 'noForeignToken' })],
  ['REF strength without tactic', S({ 'war.refStrengthIncludesTactic': false })], ['no open-sea ring', S({ 'ring.openSea': 0 })], ['forest gives timber only', { 'terrain.forest.yields': ['timber'] }],
];
for (const bots of [[tuned], mixed]) {
  const k = bots.length > 1 ? 'm' : 't';
  await compare(`tax`, `Taxes ${k}`, 4, 600, TAX, bots);
  await compare(`war`, `War ${k}`, 4, 600, WAR, bots);
  await compare(`econ`, `Economy and cards ${k}`, 4, 600, ECON, bots);
}
await compare('read', 'Unclear rules read differently', 4, 600, READ, mixed);
for (const n of [2, 3]) await compare(`tax${n}`, 'Taxes', n, 600, TAX, mixed);
await compare('solo', 'Solo', 1, 600, [...TAX.slice(0, 3), ['refusal adds 2', S({ 'tax.refuseRefSolo': 2 })], ['a cube is 1 🗡️', S({ 'war.refStrength': 1 })]], [patriot]);

// --- 3. Combined proposal -----------------------------------------------------------------
if (want('seek')) {
  // A small search for settings that bring the loyalist near 15% and let colonies survive.
  const rows: string[][] = [];
  for (const cube of [1, 2]) for (const ref of [1, 2]) for (const bells of [0, 1]) for (const bd of [1, 4]) {
    const rs = await runAll(table(def, { prefix: 'seek', games: N(320), players: 4, bots: mixed, changes: S({ 'war.refStrength': cube, 'tax.refuseRef': ref, 'tax.refuseBells': bells, 'war.baseDefence': bd }) }));
    rows.push([String(cube), String(ref), String(bells), String(bd), ...['loyalist wins', 'patriot colonies that survive', 'rounds played', 'attack per colony', 'defence per colony', 'taxes refused although affordable'].map((k) => { const v = values(rs, k); return /wins|survive|refused/.test(k) ? `${pct(mean(v))} ±${pct(ci(v))}` : mean(v).toFixed(1); })]);
  }
  section('Search over four settings (4 players, mixed bots)', mdTable(['cube 🗡️', 'refusal cubes', 'refusal bells', 'base defence', 'loyalist wins', 'survive', 'rounds', 'attack', 'defence', 'refused though able'], rows));
}
