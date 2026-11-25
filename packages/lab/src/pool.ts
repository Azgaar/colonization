/** Run many games on all cores. */
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { compileRuleset, gameData, rulesets, type GameDef, type Override, type Ruleset } from '@col/data';
import { goalBot, PERSONALITIES, randomBot, type Bot, type Personality, type Weights } from '@col/bots';
import { playGame } from './play.ts';
import { record, type GameRecord } from './record.ts';

export type BotSpec = { kind: 'random' | 'eager' } | { kind: 'goal'; name: string; weights?: Partial<Weights>; personality?: Personality };
export interface GameSpec { seed: string; nations: string[]; bots: BotSpec[]; ruleset?: string; changes?: Override['set'] }

export const makeBot = (b: BotSpec, seed: string): Bot =>
  b.kind === 'goal' ? goalBot(seed, { ...(b.weights ?? {}), ...(b.personality ? PERSONALITIES[b.personality] : {}) }, b.name) : randomBot(seed, b.kind === 'eager');

const defs = new Map<string, GameDef>();
function defOf(g: GameSpec): GameDef {
  const key = `${g.ruleset ?? 'board'}|${JSON.stringify(g.changes ?? {})}`;
  let d = defs.get(key);
  if (!d) {
    const base = rulesets[g.ruleset ?? 'board'];
    const r: Ruleset = g.changes ? { id: `${base.id}+`, title: '', sandbox: true, overrides: [...base.overrides, { id: 'change', why: 'experiment', set: g.changes }] } : base;
    defs.set(key, (d = compileRuleset(gameData, r)));
  }
  return d;
}
export function runGame(g: GameSpec): GameRecord {
  const bots = g.bots.map((b, p) => makeBot(b, `${g.seed}-${p}`));
  const { state, choices } = playGame({ def: defOf(g), seed: g.seed, nations: g.nations, bots, logging: true });
  return record(state, choices, bots.map((b) => b.name), g.ruleset ?? 'board');
}

export async function runAll(specs: GameSpec[], onProgress?: (done: number) => void): Promise<GameRecord[]> {
  const n = Math.min(availableParallelism(), Math.max(1, Math.ceil(specs.length / 4)));
  const out: GameRecord[] = new Array(specs.length);
  let next = 0, done = 0;
  const chunk = Math.max(1, Math.min(16, Math.ceil(specs.length / n / 8)));
  await Promise.all(Array.from({ length: n }, () => new Promise<void>((ok, no) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: 'games' });
    const give = () => {
      if (next >= specs.length) { void w.terminate(); ok(); return; }
      const at = next;
      next += chunk;
      w.postMessage({ at, list: specs.slice(at, at + chunk) });
    };
    w.on('message', (m: { at: number; list: GameRecord[] } | { error: string }) => {
      if ('error' in m) { void w.terminate(); no(new Error(m.error)); return; }
      m.list.forEach((r, i) => { out[m.at + i] = r; });
      done += m.list.length;
      onProgress?.(done);
      give();
    });
    w.on('error', no);
    give();
  })));
  return out;
}
if (!isMainThread && workerData === 'games') parentPort!.on('message', (m: { at: number; list: GameSpec[] }) => {
  try { parentPort!.postMessage({ at: m.at, list: m.list.map(runGame) }); } catch (e) { parentPort!.postMessage({ error: (e as Error).message }); }
});
