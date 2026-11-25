/** Random games with every check on. Usage: pnpm fuzz [games] [ruleset] [first seed] */
import { availableParallelism } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { loadRuleset } from '@col/data';
import { choiceKey, replay } from '@col/engine';
import { randomBot } from '@col/bots';
import { GameFailure, playGame } from './play.ts';

interface Job { from: number; to: number; ruleset: string }
interface Report { games: number; choices: number; rounds: number; kinds: Record<string, number>; actions: Record<string, number>; cards: Record<string, number>; failures: string[]; winners: number; noWinner: number; byPlayers: Record<number, number> }
const empty = (): Report => ({ games: 0, choices: 0, rounds: 0, kinds: {}, actions: {}, cards: {}, failures: [], winners: 0, noWinner: 0, byPlayers: {} });
const bump = (o: Record<string, number>, k: string, n = 1) => { o[k] = (o[k] ?? 0) + n; };

function work(job: Job): Report {
  const def = loadRuleset(job.ruleset), r = empty(), all = Object.keys(def.nations);
  for (let i = job.from; i < job.to; i++) {
    const seed = `fuzz-${i}`, n = (i % 5) + 1;
    // One game in four starts rich, to reach every building and Father.
    const eager = i % 2 === 1, rich = i % 8 === 3 || i % 8 === 6;
    const nations = Array.from({ length: n }, (_, k) => all[(i * 3 + k * 7) % all.length]).filter((x, k, a) => a.indexOf(x) === k);
    try {
      const { state, choices } = playGame({ def, seed, nations, bots: nations.map((_, p) => randomBot(`${seed}-${p}`, eager)), check: true, fastView: i % 10 !== 0, rich, logging: true, onDecision: (s) => bump(r.kinds, s.pending!.kind) });
      for (const e of state.log) {
        if (e.e === 'play') bump(r.actions, e.a as string);
        if (e.e === 'event' && e.id) bump(r.cards, `event.${e.id}`);
        if (e.e === 'poi') bump(r.cards, `${e.deck}.${e.card}`);
        if (e.e === 'father') bump(r.cards, `father.${e.father}`);
        if (e.e === 'war') bump(r.cards, `tactic.${e.tactic}`);
        if (e.e === 'build') bump(r.cards, `building.${e.building}`);
      }
      if (i % 20 === 0 && !rich) {
        const again = replay({ def, seed, nations, logging: true }, choices);
        if (choiceKey(again.log) !== choiceKey(state.log)) throw new Error(`seed "${seed}": replay differs`);
      }
      r.games++; r.choices += choices.length; r.rounds += state.round; bump(r.byPlayers as Record<string, number>, String(n));
      if (state.over!.winners.length) r.winners++; else r.noWinner++;
    } catch (e) {
      r.failures.push((e as Error).message);
      if (e instanceof GameFailure && r.failures.length <= 3) {
        mkdirSync('out', { recursive: true });
        writeFileSync(`out/failure-${e.seed}.json`, JSON.stringify({ ruleset: job.ruleset, rulesetHash: def.rulesetHash, seed: e.seed, nations: e.nations, choices: e.choices }));
      }
      if (r.failures.length >= 5) break;
    }
  }
  return r;
}

if (isMainThread) {
  const games = Number(process.argv[2] ?? 1000), ruleset = process.argv[3] ?? 'board', start = Number(process.argv[4] ?? 0);
  const n = Math.min(availableParallelism(), games), t0 = performance.now();
  const per = Math.ceil(games / n);
  const parts = await Promise.all(Array.from({ length: n }, (_, k) => new Promise<Report>((ok, no) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { from: start + k * per, to: start + Math.min(games, (k + 1) * per), ruleset } satisfies Job });
    w.on('message', ok);
    w.on('error', no);
  })));
  const r = empty();
  for (const p of parts) {
    r.games += p.games; r.choices += p.choices; r.rounds += p.rounds; r.winners += p.winners; r.noWinner += p.noWinner; r.failures.push(...p.failures);
    for (const k of ['kinds', 'actions', 'cards', 'byPlayers'] as const) for (const [x, v] of Object.entries(p[k])) bump(r[k] as Record<string, number>, x, v);
  }
  const sec = (performance.now() - t0) / 1000;
  console.log(`${r.games} games, ${r.failures.length} failures, ${sec.toFixed(1)} s, ${(r.choices / r.games).toFixed(0)} choices and ${(r.rounds / r.games).toFixed(1)} rounds per game`);
  console.log('by players', r.byPlayers, 'games with a winner', r.winners, 'without', r.noWinner);
  console.log('actions', r.actions);
  console.log('decisions', r.kinds);
  const def = loadRuleset(ruleset);
  const want = [...Object.keys(def.events).map((x) => `event.${x}`), ...Object.keys(def.ruins).map((x) => `ruin.${x}`), ...Object.keys(def.wrecks).map((x) => `wreck.${x}`), ...Object.keys(def.fathers).map((x) => `father.${x}`), ...Object.keys(def.tactics).map((x) => `tactic.${x}`), ...Object.keys(def.buildings).map((x) => `building.${x}`)];
  console.log('cards never seen:', want.filter((x) => !r.cards[x]).join(', ') || 'none');
  for (const f of r.failures.slice(0, 5)) console.log('\nFAILURE', f);
  process.exit(r.failures.length ? 1 : 0);
} else parentPort!.postMessage(work(workerData as Job));
