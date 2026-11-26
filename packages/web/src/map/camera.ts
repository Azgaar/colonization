/* Pan, zoom and tilt of the map plane. */
import { at, CELL, W } from '../data.ts';

/** Degrees of tilt for a zoom, between the zoom limits. */
export type Pitch = (z: number, min: number, max: number) => number;
/** How a stage starts and what it reports: the first zoom, a cell in the middle (or the whole map), the zoom limits (the lower one may follow the window), a click on a cell, any move, and the tilt for a zoom. */
interface StageOptions { zoom?: number; center?: number | null; min?: number | (() => number); max?: number; onCell: (c: number) => void; onMove?: () => void; pitch?: Pitch | null }
/** A point on the screen with the local scale there. */
type Point = [x: number, y: number, scale: number];
/** Where the flat stage lies on the screen, and its zoom. */
type Pan = [x: number, y: number, zoom: number];

/** Pan and zoom a map stage. */
export function stage(el: HTMLElement, { zoom = 1, center = null, min = 0.45, max = 2.2, onCell, onMove, pitch = null }: StageOptions) {
  // The zoom-out limit may follow the window size.
  const lo = () => (typeof min === 'function' ? min() : min);
  // The map plane, and any plane over it that moves with it (the clouds, above everything that stands on the map).
  const planes = el.querySelectorAll<HTMLElement>('.map-inner,.map-over'); let z = zoom, x = 0, y = 0, drag: [number, number, number, number] | null = null, moved = 0;
  // A tilted plane moves by its transform alone, so nothing is painted again. `un` goes from the screen to the flat stage, `proj` back with the local scale.
  const T = { a: 0, d: 1500, up: 0 }, R = () => ({ left: 0, top: 0, width: innerWidth, height: innerHeight });
  const un = (cx: number, cy: number): [number, number] => { const r = R(), w = r.width / 2, h = r.height / 2, sx = cx - r.left - w, sy = cy - r.top - h - T.up, c = Math.cos(T.a), s = Math.sin(T.a), py = (sy * T.d) / (T.d * c + sy * s), k = T.d / (T.d - py * s); return [w + sx / k, h + py]; };
  const proj = (px: number, py: number): Point => { const r = R(), w = r.width / 2, h = r.height / 2, v = py - h, k = T.d / (T.d - v * Math.sin(T.a)); return [r.left + w + (px - w) * k, r.top + h + v * Math.cos(T.a) * k + T.up, k * z]; };
  const cell = (cx: number, cy: number) => { const [a, b] = un(cx, cy), i = Math.floor((a - x) / z / CELL), j = Math.floor((b - y) / z / CELL); return i >= 0 && j >= 0 && i < W && j < W ? j * W + i : null; };
  // The tilt is either fixed, or follows the zoom through `pitch`, which gives degrees for a zoom.
  let fixed = 0;
  const aim = () => { T.a = ((pitch ? pitch(z, lo(), max) : fixed) * Math.PI) / 180; };
  const tilt = (deg: number, d = 1500, up = 0, follow: Pitch | null = null) => { fixed = deg; pitch = follow; T.d = d; T.up = up; put(); };
  /** Zoom to `n` keeping the map point under (cx, cy) where it is, also when the tilt changes with it. */
  const zoomAt = (n: number, cx: number, cy: number) => { const [mx, my] = un(cx, cy), wx = (mx - x) / z, wy = (my - y) / z; z = n; aim(); const [ax, ay] = un(cx, cy); x = ax - wx * z; y = ay - wy * z; put(); };
  const put = () => {
    aim();
    const w = innerWidth / 2, h = innerHeight / 2;
    const tf = `translate(${w}px,${h + T.up}px) perspective(${T.d}px) rotateX(${T.a}rad) translate(${x - w}px,${y - h}px) scale(${z})`;
    for (const p of planes) p.style.transform = tf;
    onMove?.();
  };
  const look = (c: number) => { const [a, b] = at(c), r = R(); x = r.width / 2 - (a + 32) * z; y = r.height / 2 - (b + 32) * z; put(); };
  el.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.min(max, Math.max(lo(), z * Math.exp(-e.deltaY * 0.0015))), e.clientX, e.clientY); }, { passive: false });
  el.addEventListener('pointerdown', (e) => { const [a, b] = un(e.clientX, e.clientY); drag = [a - x, b - y, e.clientX, e.clientY]; moved = 0; });
  window.addEventListener('pointermove', (e) => { if (!drag) return; moved = Math.max(moved, Math.abs(e.clientX - drag[2]) + Math.abs(e.clientY - drag[3])); if (moved > 5) { const [a, b] = un(e.clientX, e.clientY); x = a - drag[0]; y = b - drag[1]; put(); } });
  window.addEventListener('pointerup', () => { drag = null; });
  el.addEventListener('click', (e) => { if (moved > 5) return; const c = cell(e.clientX, e.clientY); if (c !== null) onCell(c); });
  const fit = () => { const r = R(); z = Math.min(r.width, r.height) / (W * CELL); x = (r.width - W * CELL * z) / 2; y = (r.height - W * CELL * z) / 2; put(); };
  if (center !== null) look(center); else fit();
  const frame = (x0: number, y0: number, x1: number, y1: number, pad = [0, 0, 0, 0]) => { const r = R(), w = r.width - pad[1] - pad[3], h = r.height - pad[0] - pad[2]; z = Math.min(max, Math.max(lo(), Math.min(w / (x1 - x0), h / (y1 - y0)))); x = pad[3] + w / 2 - ((x0 + x1) / 2) * z; y = pad[0] + h / 2 - ((y0 + y1) / 2) * z; put(); };
  return {
    tilt, cell, point: (mx: number, my: number) => proj(x + mx * z, y + my * z), frame, get: (): Pan => [x, y, z], set: (v: Pan) => { [x, y, z] = v; put(); }, look, fit,
    zoomBy: (k: number) => zoomAt(Math.min(max, Math.max(lo(), z * k)), innerWidth / 2, innerHeight / 2), angle: () => (T.a * 180) / Math.PI,
  };
}
/** A map stage, as made by `stage`. */
export type Stage = ReturnType<typeof stage>;
