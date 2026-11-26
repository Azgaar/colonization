/* Clouds over the unknown: solid inside unknown fragments, thinning over their edge. The same clouds that were once painted into the land,
   now in a layer of their own above everything that stands on the map, and a little sharper. The land under them is painted whole, so exploring redraws only them. */
import { CELL, D, W } from '../data.ts';
import { noise, wavyCell } from './terrain.ts';

/** What lay under the clouds before the land was painted there too. */
const HIDDEN = [38, 96, 120];
/** Paints the clouds at `k` times the map's size: all of them, or only those within `box` (left, top, right, bottom in map units). */
export function drawClouds(canvas: HTMLCanvasElement, k: number, box: [number, number, number, number] | null = null) {
  const N = Math.round(W * CELL * k), px = (v: number) => Math.max(0, Math.min(N, Math.round(v * k)));
  if (canvas.width !== N) { canvas.width = canvas.height = N; box = null; }
  // The part painted, inside a wider window so that distances to the unknown near its edge are still right.
  const M = 64, x0 = box ? px(box[0]) : 0, y0 = box ? px(box[1]) : 0, x1 = box ? px(box[2]) : N, y1 = box ? px(box[3]) : N;
  const ox = box ? px(box[0] - M) : 0, oy = box ? px(box[1] - M) : 0, ww = (box ? px(box[2] + M) : N) - ox, wh = (box ? px(box[3] + M) : N) - oy;
  // The unknown follows the same wavy lines as the ground.
  const fog = new Uint8Array(ww * wh);
  for (let ly = 0; ly < wh; ly++) for (let lx = 0; lx < ww; lx++) { const c = wavyCell((lx + ox) / k, (ly + oy) / k); fog[ly * ww + lx] = D.open[c] && D.terrain[c] ? 0 : 1; }
  // How far each pixel is from the unknown, in pixels.
  const d = new Float32Array(ww * wh).fill(1e4), r = 1.41;
  for (let i = 0; i < ww * wh; i++) if (fog[i]) d[i] = 0;
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const i = y * ww + x; let v = d[i]; if (x) v = Math.min(v, d[i - 1] + 1); if (y) { v = Math.min(v, d[i - ww] + 1); if (x) v = Math.min(v, d[i - ww - 1] + r); if (x < ww - 1) v = Math.min(v, d[i - ww + 1] + r); } d[i] = v; }
  for (let y = wh - 1; y >= 0; y--) for (let x = ww - 1; x >= 0; x--) { const i = y * ww + x; let v = d[i]; if (x < ww - 1) v = Math.min(v, d[i + 1] + 1); if (y < wh - 1) { v = Math.min(v, d[i + ww] + 1); if (x) v = Math.min(v, d[i + ww - 1] + r); if (x < ww - 1) v = Math.min(v, d[i + ww + 1] + r); } d[i] = v; }
  const g = canvas.getContext('2d')!, im = g.createImageData(x1 - x0, y1 - y0), o = im.data;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y - oy) * ww + x - ox, X = x / k, Y = y / k, f = fog[i], fd = f ? 99 : d[i] / k, cl = f ? 1 : Math.max(0, 1 - fd / 22);
    if (cl <= 0) continue;
    const n = noise(X / 46, Y / 34) * 0.55 + noise(X / 17 + 30, Y / 14) * 0.3 + noise(X / 7, Y / 7) * 0.15, a = Math.min(0.95, Math.max(0, f ? 0.93 : cl * 1.5 - (1 - n)));
    if (a <= 0) continue;
    const t = Math.min(1, Math.max(0, (n - 0.25) * 1.9)), p = ((y - y0) * (x1 - x0) + x - x0) * 4, r = 150 + 94 * t, gr = 178 + 68 * t, b = 190 + 50 * t;
    // Over the unknown the land is painted too, so nothing may show through: the clouds are solid there, with the dark sea they once let through mixed in.
    if (f) { o[p] = HIDDEN[0] + (r - HIDDEN[0]) * a; o[p + 1] = HIDDEN[1] + (gr - HIDDEN[1]) * a; o[p + 2] = HIDDEN[2] + (b - HIDDEN[2]) * a; o[p + 3] = 255; continue; }
    o[p] = r; o[p + 1] = gr; o[p + 2] = b; o[p + 3] = a * 255;
  }
  g.putImageData(im, x0, y0);
}
