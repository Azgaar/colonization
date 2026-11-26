/** Run many games in the browser on Web Workers (FR-T-8): the counterpart of runAll in pool.ts, same order and results. */
import type { GameSpec } from './game.ts';
import type { GameRecord } from './record.ts';
import type { WorkerIn, WorkerOut } from './worker.ts';

export * from './index.ts';
export type { WorkerIn, WorkerOut } from './worker.ts';

export interface BrowserRunOptions {
  /** Where the bundled worker.ts is served; resolved against the page. */
  url?: string | URL;
  /** Stops the batch: the workers are terminated and the promise rejects with the signal's reason. */
  signal?: AbortSignal;
}
interface LabWorker { postMessage(m: WorkerIn): void; terminate(): void; onmessage: ((e: { data: WorkerOut }) => void) | null; onerror: ((e: { message?: string }) => void) | null }
// Typed by hand so that the Node typecheck, which has no DOM, accepts the file too.
const spawn = (url: string | URL, name: string) => new (globalThis as unknown as { Worker: new (url: string | URL, o: { type: 'module'; name?: string }) => LabWorker }).Worker(url, { type: 'module', name });

export function runAllBrowser(specs: GameSpec[], onProgress?: (done: number) => void, workers = navigator.hardwareConcurrency || 4, o: BrowserRunOptions = {}): Promise<GameRecord[]> {
  const n = Math.max(1, Math.min(workers, Math.ceil(specs.length / 4)));
  const out: GameRecord[] = new Array(specs.length), pool: LabWorker[] = [];
  // Small chunks keep progress smooth and the load even; the worker pays no start-up per chunk.
  const chunk = Math.max(1, Math.min(8, Math.ceil(specs.length / n / 8)));
  let next = 0, done = 0, over = false;
  return new Promise<GameRecord[]>((ok, no) => {
    if (!specs.length) { ok(out); return; }
    const stop = (e?: unknown) => { if (over) return; over = true; pool.forEach((w) => w.terminate()); if (e === undefined) ok(out); else no(e instanceof Error ? e : new Error(String(e))); };
    if (o.signal?.aborted) { stop(o.signal.reason ?? new Error('aborted')); return; }
    o.signal?.addEventListener('abort', () => stop(o.signal!.reason ?? new Error('aborted')), { once: true });
    let idle = 0;
    for (let i = 0; i < n; i++) {
      const w = spawn(o.url ?? 'dist/lab-worker.js', `lab-${i}`);
      pool.push(w);
      const give = () => {
        if (next >= specs.length) { if (++idle === n) stop(); return; }
        const at = next;
        next += chunk;
        w.postMessage({ at, list: specs.slice(at, at + chunk) });
      };
      w.onmessage = ({ data: m }) => {
        if (over) return;
        if ('error' in m) { stop(new Error(m.error)); return; }
        m.list.forEach((r, k) => { out[m.at + k] = r; });
        done += m.list.length;
        onProgress?.(done);
        give();
      };
      w.onerror = (e) => stop(new Error(`lab worker failed${e.message ? `: ${e.message}` : ''} (is ${String(o.url ?? 'dist/lab-worker.js')} served?)`));
      give();
    }
  });
}
