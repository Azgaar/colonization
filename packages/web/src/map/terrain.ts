/* The painted map: ground, relief, coasts and sea. The clouds over the unknown are painted apart, above everything (see clouds.ts). */
import type { TerrainId } from '@col/data';
import { CELL, colonyAt, D, settlementAt, W } from '../data.ts';
import TEXTURES from '../generated/textures.json';
function rnd(x: number, y: number) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function noise(x: number, y: number) { const a = Math.floor(x), b = Math.floor(y), u = x - a, v = y - b, s = u * u * (3 - 2 * u), q = v * v * (3 - 2 * v); return (rnd(a, b) * (1 - s) + rnd(a + 1, b) * s) * (1 - q) + (rnd(a, b + 1) * (1 - s) + rnd(a + 1, b + 1) * s) * q; }
/** The cell a point of the map (map units) belongs to, with cells meeting on wavy lines: the ground and the clouds over the unknown follow them alike. */
export function wavyCell(X: number, Y: number) {
  const wx = X + (noise(X / 26, Y / 26) - 0.5) * 40 + (noise(X / 8 + 50, Y / 8) - 0.5) * 13, wy = Y + (noise(X / 26 + 90, Y / 26 + 40) - 0.5) * 40 + (noise(X / 8, Y / 8 + 70) - 0.5) * 13;
  return Math.min(W - 1, Math.max(0, Math.floor(wy / CELL))) * W + Math.min(W - 1, Math.max(0, Math.floor(wx / CELL)));
}
/** The pixels of every ground texture, 224 by 224. */
async function textures() {
  const out: Record<string, Uint8ClampedArray> = {};
  await Promise.all(Object.entries(TEXTURES).map(([k, src]) => new Promise<void>((ok) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 224; const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(im, 0, 0); out[k] = g.getImageData(0, 0, 224, 224).data; ok(); }; im.src = src; })));
  return out;
}

const KINDS: TerrainId[] = ['ocean', 'forest', 'grassland', 'mountains', 'desert', 'tundra'];
const mix = (a: number[], b: number[], k: number) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** How to paint the map: `K` times the base size, trees `tall` times higher, the open cells (`seen`, kept as the key of the last whole picture), and only a part of it (`box`: left, top, right, bottom in map units). */
export interface Plan { K?: number; tall?: number; seen?: string; box?: [number, number, number, number] | null; truth?: Truth }
/** The land of every cell as dealt, explored or not, and what stands on it (villages, ruins, wrecks): with it the whole map is painted once, under the clouds,
 * so that exploring only opens the clouds. Without it only the explored land is painted. */
export interface Truth { terrain: readonly (TerrainId | null)[]; poi: readonly (string | null)[] }
/** Which land is painted and where trees keep clear: everything as dealt, or the explored part as the player knows it. */
interface Land { terrain: readonly (TerrainId | null)[]; open: (c: number) => boolean; busy: (c: number) => boolean }
const landOf = (t?: Truth): Land => {
  const known = (c: number) => !!(colonyAt(c) || settlementAt(c) || D.poi[c]);
  return t ? { terrain: t.terrain, open: () => true, busy: (c) => (D.open[c] ? known(c) : !!t.poi[c]) } : { terrain: D.terrain, open: (c) => D.open[c], busy: known };
};
/** The last whole picture with the terrain kinds of its pixels, to draw it again at once. */
let kept: { key: string; im: ImageData; f: Uint8Array } | null = null;
/** Whether the whole picture for these settings is at hand, to be drawn again at once. */
export const isKept = (K: number, seen: string) => kept?.key === `${K} ${seen}`;
/** Painted map at `K` times the base size: blended ground, lit relief, beaches, shallows. */
export async function drawRich(canvas: HTMLCanvasElement, { K = 1.5, tall = 1, seen = '', box = null, truth }: Plan = {}) {
  const tex = await textures(), C = CELL * K, N = Math.round(W * C), sea = true, L = landOf(truth), open = L.open, key = `${K} ${seen}`;
  if (!box && kept?.key === key) { const q = kept; canvas.width = canvas.height = N; const g = canvas.getContext('2d')!; g.putImageData(q.im, 0, 0); scatter(g, K, (x, y) => q.f[y * N + x], tall, L); return canvas; }
  // A part of the map is painted inside a wider window, so that distances near its edge are still right.
  const M = 240, px = (v: number) => Math.max(0, Math.min(N, Math.round(v * K)));
  const ox = box ? px(box[0] - M) : 0, oy = box ? px(box[1] - M) : 0, ww = box ? px(box[2] + M) - ox : N, wh = box ? px(box[3] + M) - oy : N, f = new Uint8Array(ww * wh);
  for (let ly = 0; ly < wh; ly++) for (let lx = 0; lx < ww; lx++) {
    const x = lx + ox, y = ly + oy, c = wavyCell(x / K, y / K), t = L.terrain[c];
    f[ly * ww + lx] = open(c) && t ? KINDS.indexOf(t) : 255;
  }
  const field = async (goal: (v: number) => boolean) => {
    const d = new Float32Array(ww * wh).fill(1e4), r = 1.41;
    for (let i = 0; i < ww * wh; i++) if (goal(f[i])) d[i] = 0;
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const i = y * ww + x; let v = d[i]; if (x) v = Math.min(v, d[i - 1] + 1); if (y) { v = Math.min(v, d[i - ww] + 1); if (x) v = Math.min(v, d[i - ww - 1] + r); if (x < ww - 1) v = Math.min(v, d[i - ww + 1] + r); } d[i] = v; }
    for (let y = wh - 1; y >= 0; y--) for (let x = ww - 1; x >= 0; x--) { const i = y * ww + x; let v = d[i]; if (x < ww - 1) v = Math.min(v, d[i + 1] + 1); if (y < wh - 1) { v = Math.min(v, d[i + ww] + 1); if (x) v = Math.min(v, d[i + ww - 1] + r); if (x < ww - 1) v = Math.min(v, d[i + ww + 1] + r); } d[i] = v; }
    return d;
  };
  const land = (v: number) => v > 0 && v < 6, toLand = await field(land), toSea = await field((v) => v === 0);
  const im = new ImageData(ww, wh), o = im.data;
  const sw = sea ? calm(tex.ocean) : null;
  const TINT: Record<number, number[]> = { 2: [128, 168, 62], 1: [58, 96, 48], 3: [150, 140, 122], 4: [226, 190, 122], 5: [196, 206, 200] };
  const ground = (v: number, x: number, y: number, s: number) => { const k = tex[KINDS[v]], i = ((((y / K) * s) | 0) % 224) * 224 + ((((x / K) * s) | 0) % 224); return [k[i * 4], k[i * 4 + 1], k[i * 4 + 2]]; };
  const J = [[0, 0], [7, 2], [-7, -2], [2, 8], [-3, -8]].map(([a, b]) => [Math.round(a * K), Math.round(b * K)]);
  for (let ly = 0; ly < wh; ly++) for (let lx = 0; lx < ww; lx++) {
    const i = ly * ww + lx, v = f[i], x = lx + ox, y = ly + oy, X = x / K, Y = y / K;
    let c: number[];
    if (land(v)) {
      let n = 0, acc = [0, 0, 0];
      for (const [a, b] of J) { const qx = lx + a, qy = ly + b, u = qx >= 0 && qy >= 0 && qx < ww && qy < wh ? f[qy * ww + qx] : v, w = land(u) ? u : v, t = mix(ground(w, x, y, 1.15), TINT[w], w === 3 || w === 1 ? 0.62 : 0.42); acc[0] += t[0]; acc[1] += t[1]; acc[2] += t[2]; n++; }
      c = [acc[0] / n, acc[1] / n, acc[2] / n];
      const h = (noise(X / 30, Y / 30) - noise((X + 5) / 30, (Y + 5) / 30)) * 1.5 + (noise(X / 11, Y / 11) - noise((X + 2) / 11, (Y + 2) / 11)) * 0.5;
      c = mix(c, h > 0 ? [255, 244, 206] : [24, 44, 40], Math.min(0.4, Math.abs(h)));
      const d = toSea[i] / K, u = 4 + noise(X / 14, Y / 14) * 4;
      if (d < u) c = mix(c, [236, 214, 160], 0.88 - (d / u) * 0.5);
      if (d < 1.1) c = mix(c, [120, 96, 60], 0.45);
    } else if (v === 0) {
      let t = ground(0, x, y, 0.9); const d = toLand[i] / K;
      c = mix(t, [22, 92, 138], 0.55);
      c = mix(c, [10, 52, 92], Math.min(0.5, Math.max(0, d - 40) / 260));
      if (sea && sw) { const q = (((Y * 0.9) | 0) % SW * SW + ((X * 0.9) | 0) % SW) * 3; t = [sw[q], sw[q + 1], sw[q + 2]]; } if (sea) c = mix(mix(t, [22, 92, 138], 0.55), [10, 52, 92], Math.max(Math.min(0.5, Math.max(0, d - 40) / 260), 0.5 * Math.max(0, 1 - Math.min(X, Y, W * CELL - X, W * CELL - Y) / 170)));
      if (d < 60) c = mix(c, [92, 190, 184], 0.8 * (1 - d / 60) ** 1.4);
      const wave = Math.sin(d / 2.6 + noise(X / 16, Y / 16) * 5);
      if (d < 22 && wave > 0.86) c = mix(c, [236, 248, 242], 0.5 * (1 - d / 22));
      if (d < 2.4) c = mix(c, [246, 250, 240], 0.85);
      // Land throws a shadow on the water.
      const sx = lx - Math.round(4 * K), sy = ly - Math.round(5 * K);
      if (sx >= 0 && sy >= 0 && land(f[sy * ww + sx])) c = mix(c, [8, 40, 60], 0.4);
    } else c = [38, 96, 120];
    o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = sea ? Math.min(255, Math.min(X, Y, W * CELL - X, W * CELL - Y) * 5) : 255;
  }
  const at = (x: number, y: number) => (x >= ox && y >= oy && x < ox + ww && y < oy + wh ? f[(y - oy) * ww + x - ox] : 255);
  if (!box) {
    canvas.width = canvas.height = N;
    const g = canvas.getContext('2d')!;
    g.putImageData(im, 0, 0);
    kept = { key, im, f };
    scatter(g, K, at, tall, L);
    return canvas;
  }
  // Only the middle of the window is put back, and the trees there drawn again.
  const g = canvas.getContext('2d')!, dx = px(box[0] - 64), dy = px(box[1] - 64), dw = px(box[2] + 64) - dx, dh = px(box[3] + 64) - dy;
  g.putImageData(im, ox, oy, dx - ox, dy - oy, dw, dh);
  g.save(); g.beginPath(); g.rect(dx, dy, dw, dh); g.clip(); scatter(g, K, at, tall, L, [dx / K, dy / K, (dx + dw) / K, (dy + dh) / K]); g.restore();
  kept = null;
  return canvas;
}
/** The same deep water as a repeating tile for everything beyond the map. */
const SW = 176;
/** The water texture with its edges blended into each other, so that repeats do not show. */
function calm(t: Uint8ClampedArray) {
  const O = 224 - SW, a = new Float32Array(224 * SW * 3), out = new Float32Array(SW * SW * 3);
  for (let y = 0; y < 224; y++) for (let x = 0; x < SW; x++) for (let k = 0; k < 3; k++) { const w = Math.min(1, x / O); a[(y * SW + x) * 3 + k] = t[(y * 224 + x) * 4 + k] * w + (w < 1 ? t[(y * 224 + x + SW) * 4 + k] * (1 - w) : 0); }
  for (let y = 0; y < SW; y++) for (let x = 0; x < SW; x++) for (let k = 0; k < 3; k++) { const w = Math.min(1, y / O); out[(y * SW + x) * 3 + k] = a[(y * SW + x) * 3 + k] * w + (w < 1 ? a[((y + SW) * SW + x) * 3 + k] * (1 - w) : 0); }
  return out;
}
/** Paints `size` map units of it, centred on the map and fading out at the edges. Returns the mean colour. */
export async function drawSea(canvas: HTMLCanvasElement, size: number, K: number) {
  const t = calm((await textures()).ocean), c = document.createElement('canvas'), g = c.getContext('2d')!, sum = [0, 0, 0];
  c.width = c.height = SW;
  const im = new ImageData(SW, SW);
  for (let i = 0; i < SW * SW; i++) { const v = mix(mix([t[i * 3], t[i * 3 + 1], t[i * 3 + 2]], [22, 92, 138], 0.55), [10, 52, 92], 0.5); im.data.set([...v, 255], i * 4); for (let k = 0; k < 3; k++) sum[k] += v[k]; }
  g.putImageData(im, 0, 0);
  const N = canvas.width = canvas.height = Math.round(size * K), q = canvas.getContext('2d')!, p = q.createPattern(c, 'repeat')!, o = ((size - W * CELL) / 2) * K, z = K / 0.9;
  p.setTransform(new DOMMatrix([z, 0, 0, z, o, o])); q.fillStyle = p; q.fillRect(0, 0, N, N);
  q.globalCompositeOperation = 'destination-in';
  for (const [x, y] of [[N, 0], [0, N]]) { const l = q.createLinearGradient(0, 0, x, y); for (const [k, v] of [[0, 0], [0.14, 1], [0.86, 1], [1, 0]]) l.addColorStop(k, `rgba(0,0,0,${v})`); q.fillStyle = l; q.fillRect(0, 0, N, N); }
  return `rgb(${sum.map((v) => Math.round(v / SW / SW))})`;
}
/** How many trees, peaks, tufts or dunes a land cell has. */
const TREES: Record<Exclude<TerrainId, 'ocean'>, number> = { forest: 22, mountains: 5, grassland: 7, desert: 5, tundra: 8 };
/** Trees, peaks, tufts and dunes, drawn back to front so that the ground reads at a glance. */
function scatter(g: CanvasRenderingContext2D, K: number, fAt: (x: number, y: number) => number, tall: number, L: Land, only: number[] | null = null) {
  const items: [y: number, x: number, t: TerrainId, r: number][] = [];
  for (let c = 0; c < W * W; c++) {
    const t = L.terrain[c];
    if (!L.open(c) || !t || t === 'ocean') continue;
    const x0 = (c % W) * CELL, y0 = Math.floor(c / W) * CELL, busy = L.busy(c);
    const n = TREES[t];
    for (let k = 0; k < n; k++) {
      const x = x0 + 4 + rnd(c * 3 + 1, k * 7) * 56, y = y0 + 8 + rnd(k * 5, c * 3 + 2) * 54;
      if (busy && Math.hypot(x - x0 - 32, y - y0 - 34) < (t === 'forest' ? 23 : 25)) continue;
      if (only && (x < only[0] - 30 || y < only[1] - 30 || x > only[2] + 30 || y > only[3] + 40)) continue;
      if (fAt(Math.round(x * K), Math.round(y * K)) !== KINDS.indexOf(t)) continue;
      items.push([y, x, t, rnd(k, c)]);
    }
  }
  items.sort((a, b) => a[0] - b[0]);
  g.save();
  g.scale(K, K);
  for (const [y, x, t, r] of items) {
    g.save(); g.translate(x, y); g.scale(1, tall); g.translate(-x, -y);
    if (t === 'forest') {
      const s = 4.6 + r * 2.6, pine = r > 0.45;
      g.fillStyle = '#0c241c66'; g.beginPath(); g.ellipse(x + 2.5, y + 1.5, s, s * 0.45, 0, 0, 7); g.fill();
      g.fillStyle = pine ? ['#274f33', '#2f5c38', '#1f4630'][(r * 9 | 0) % 3] : ['#4d7a34', '#5d8a3a', '#416d33'][(r * 9 | 0) % 3];
      if (pine) { g.beginPath(); g.moveTo(x - s * 0.75, y + 1); g.lineTo(x, y - s * 2.2); g.lineTo(x + s * 0.75, y + 1); g.fill(); g.fillStyle = '#ffffff1f'; g.beginPath(); g.moveTo(x - s * 0.75, y + 1); g.lineTo(x, y - s * 2.2); g.lineTo(x - s * 0.1, y + 1); g.fill(); }
      else { g.beginPath(); g.arc(x, y - s * 0.7, s, 0, 7); g.fill(); g.fillStyle = '#e8f0a82e'; g.beginPath(); g.arc(x - s * 0.3, y - s * 1.05, s * 0.5, 0, 7); g.fill(); }
    } else if (t === 'mountains') {
      const s = 12 + r * 9;
      g.fillStyle = '#1c28283d'; g.beginPath(); g.ellipse(x + 6, y + 2, s * 1.1, s * 0.3, 0, 0, 7); g.fill();
      g.fillStyle = '#8d8676'; g.beginPath(); g.moveTo(x - s, y + 3); g.lineTo(x - s * 0.2, y - s * 1.25); g.lineTo(x + s * 0.3, y - s * 0.85); g.lineTo(x + s, y + 3); g.fill();
      g.fillStyle = '#5c584f'; g.beginPath(); g.moveTo(x - s * 0.2, y - s * 1.25); g.lineTo(x + s * 0.3, y - s * 0.85); g.lineTo(x + s, y + 3); g.lineTo(x + s * 0.05, y + 3); g.lineTo(x + s * 0.12, y - s * 0.5); g.fill();
      g.fillStyle = '#fbfaf4'; g.beginPath(); g.moveTo(x - s * 0.5, y - s * 0.72); g.lineTo(x - s * 0.2, y - s * 1.25); g.lineTo(x + s * 0.3, y - s * 0.85); g.lineTo(x + s * 0.08, y - s * 0.66); g.lineTo(x - s * 0.12, y - s * 0.84); g.lineTo(x - s * 0.28, y - s * 0.6); g.fill();
    } else if (t === 'grassland') { g.strokeStyle = r > 0.5 ? '#5d862f' : '#8fb04a'; g.lineWidth = 1.3; g.beginPath(); for (const k of [-2.4, 0, 2.4]) { g.moveTo(x + k * 0.5, y); g.lineTo(x + k, y - 4.6); } g.stroke(); }
    else if (t === 'desert') { g.strokeStyle = '#b98c4a88'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y + 5, 9 + r * 5, 3.7, 5.6); g.stroke(); }
    else { g.fillStyle = r > 0.5 ? '#ffffffb0' : '#8a9a8ea0'; g.beginPath(); g.ellipse(x, y, 5 + r * 5, 2.4, 0, 0, 7); g.fill(); }
    g.restore();
  }
  g.restore();
}

