/**
 * Web Worker entry for runAllBrowser: bundled on its own (the web build serves it as dist/lab-worker.js).
 * In: { at, list: GameSpec[] }. Out: { at, list: GameRecord[] } or { at, error }.
 */
import { runGame, type GameSpec } from './game.ts';
import type { GameRecord } from './record.ts';

export type WorkerIn = { at: number; list: GameSpec[] };
export type WorkerOut = { at: number; list: GameRecord[] } | { at: number; error: string };
// Typed by hand so the file also checks against the Node library, which has no worker scope.
const scope = globalThis as unknown as { onmessage: ((e: { data: WorkerIn }) => void) | null; postMessage(m: WorkerOut): void };
scope.onmessage = ({ data: m }) => {
  try { scope.postMessage({ at: m.at, list: m.list.map(runGame) }); } catch (e) { scope.postMessage({ at: m.at, error: (e as Error).message }); }
};
