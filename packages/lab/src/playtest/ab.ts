/**
 * The bots as changed against the bots as they were: one seat plays the current code at a level, the others the frozen copy
 * of packages/bots given by OLD_BOTS (a directory holding src/levels.ts), every seat in turn, on paired seeds.
 * Usage: OLD_BOTS=<dir> node packages/lab/src/playtest/ab.ts <players> <seeds> <level> [oldLevel=level] [prefix=ab]
 */
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { botForLevel, goalBot, LEVELS, searchBot, type Bot, type Level, type Weights } from '@col/bots';
import { createGame, applyInPlace, viewFor, nationsApart } from '@col/engine';
import { loadRuleset } from '@col/data';
import { ci, mean } from '../stats.ts';

interface Job { seed: string; nations: string[]; seat: number; level: Level; old: Level }
interface Out { seed: string; seat: number; scores: number[]; winners: number[]; rounds: number; reason: string; loyalist: number | null }
/** W='{"bell":1.6}' gives the new seat these weights on top of the level's, to try a change of weights alone. */
const extra = process.env.W ? (JSON.parse(process.env.W) as Partial<Weights>) : null;
/** SEARCH='{"horizon":2}' changes the new seat's search options. */
const more = process.env.SEARCH ? (JSON.parse(process.env.SEARCH) as Record<string, number>) : null;
function newBot(l: Level, seed: string): Bot {
  if (more && LEVELS[l].search) return searchBot(seed, { ...LEVELS[l].search, ms: undefined, weights: { ...LEVELS[l].weights, ...(extra ?? {}) }, ...more });
  if (!extra) return botForLevel(l, seed, 'balanced', budget(l));
  const L = LEVELS[l], weights = { ...L.weights, ...extra };
  return L.search ? searchBot(seed, { ...L.search, iterations: L.search.iterations, ms: undefined, weights }) : goalBot(seed, weights);
}
const budget = (l: Level) => (LEVELS[l].search ? { iterations: LEVELS[l].search!.iterations } : undefined);

async function play(jobs: Job[]): Promise<Out[]> {
  const old = (await import(pathToFileURL(`${process.env.OLD_BOTS}/src/levels.ts`).href)) as { botForLevel: typeof botForLevel };
  const def = loadRuleset();
  return jobs.map((j) => {
    const bots: Bot[] = j.nations.map((_, p) => (p === j.seat ? newBot(j.level, `${j.seed}-${p}`) : old.botForLevel(j.old, `${j.seed}-${p}`, 'balanced', budget(j.old))));
    const s = createGame({ def, seed: j.seed, nations: j.nations, logging: false });
    while (!s.over) { const p = s.pending!.player; applyInPlace(s, bots[p].choose(viewFor(s, p)), true); }
    return { seed: j.seed, seat: j.seat, scores: s.over.players.map((x) => x.score), winners: s.over.winners, rounds: s.round, reason: s.over.reason, loyalist: s.war?.loyalist ?? null };
  });
}

if (!isMainThread && workerData === 'ab') parentPort!.on('message', async (m: Job[]) => { try { parentPort!.postMessage(await play(m)); } catch (e) { parentPort!.postMessage({ error: String((e as Error).stack) }); } });
else if (isMainThread) {
  if (!process.env.OLD_BOTS) throw new Error('set OLD_BOTS to the frozen bots directory');
  const [ps = '2', ss = '60', lv = 'normal', ol, prefix = 'ab'] = process.argv.slice(2);
  const players = Number(ps), seeds = Number(ss), level = lv as Level, old = (ol ?? lv) as Level, def = loadRuleset();
  const all = Object.keys(def.nations);
  const jobs: Job[] = [];
  for (let i = 0; i < seeds; i++) {
    const order = [...all].sort((a, b) => ((a.charCodeAt(0) * 31 + i * 17 + a.length * 7) % 97) - ((b.charCodeAt(0) * 31 + i * 17 + b.length * 7) % 97));
    const nations = nationsApart(def, order.slice(i % all.length).concat(order.slice(0, i % all.length)), players);
    for (let seat = 0; seat < players; seat++) jobs.push({ seed: `${prefix}-${players}-${i}`, nations, seat, level, old });
  }
  const t0 = performance.now(), res: Out[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(availableParallelism(), jobs.length) }, () => new Promise<void>((ok, no) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: 'ab', env: process.env });
    const give = () => { if (next >= jobs.length) { void w.terminate(); ok(); return; } w.postMessage(jobs.slice(next, next + 2)); next += 2; };
    w.on('message', (m: Out[] | { error: string }) => { if ('error' in m) { void w.terminate(); no(new Error(m.error)); return; } res.push(...m); give(); });
    w.on('error', no);
    give();
  })));
  let won = 0;
  const diffs = new Map<string, number[]>();
  for (const r of res) {
    if (r.winners.includes(r.seat)) won += 1 / r.winners.length;
    const d = r.scores[r.seat] - mean(r.scores.filter((_, i) => i !== r.seat));
    diffs.set(r.seed, [...(diffs.get(r.seed) ?? []), d]);
  }
  const ds = [...diffs.values()].map(mean), p = won / res.length;
  const zero = res.filter((r) => r.scores[r.seat] === 0).length / res.length, zeroOld = mean(res.map((r) => r.scores.filter((x, i) => i !== r.seat && x === 0).length / (players - 1)));
  const loyal = res.filter((r) => r.loyalist === r.seat), lw = loyal.filter((r) => r.winners.includes(r.seat)).length;
  console.log(`${players}p new ${level} vs old ${old}: ${res.length} games, new wins ${(100 * p).toFixed(0)}% ±${(196 * Math.sqrt((p * (1 - p)) / res.length)).toFixed(0)} (parity ${(100 / players).toFixed(0)}%), margin ${mean(ds) >= 0 ? '+' : ''}${mean(ds).toFixed(2)} ±${ci(ds).toFixed(2)}, rounds ${mean(res.map((r) => r.rounds)).toFixed(1)}, destroyed new ${(100 * zero).toFixed(0)}% old ${(100 * zeroOld).toFixed(0)}%, new was loyalist ${loyal.length} and won ${lw}, ${((performance.now() - t0) / 60000).toFixed(1)} min`);
}
