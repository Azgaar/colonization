/** Run many games on all cores (Node only; the browser counterpart is browser.ts). */
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { runGame, type GameSpec } from './game.ts';
import type { GameRecord } from './record.ts';

export * from './game.ts';

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
