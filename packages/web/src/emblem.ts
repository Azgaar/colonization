/* A nation's emblem, the same everywhere: in its coloured disc as a badge (HTML) or on the map (SVG), and bare on a sail or a flag.
 * The emblem files keep their drawings in different places of a 512-unit square, so each is placed by where its drawing is:
 * centred, and as large as the others whatever its size. The disc's rim grows with the disc, so a small badge keeps its emblem. */
import { art, D } from './data.ts';

/** Where each emblem's drawing is inside its 512-unit square: left, top, right, bottom (measured from the pictures in a browser). */
const BOX: Record<string, [number, number, number, number]> = {
  curonian: [0, 16, 510, 493], danish: [46, 0, 454, 512], dutch: [29, 3, 461, 512], english: [8, 0, 507, 512], french: [26, 0, 484, 512],
  portuguese: [4, 0, 508, 512], russian: [29, 1, 481, 510], scottish: [0, 5, 512, 509], spanish: [36, 0, 477, 512], swedish: [0, 37, 512, 452],
};
const f = (v: number) => v.toFixed(2);
/** The emblem of nation `n` alone, centred on (cx, cy), its drawing `size` units at its widest or tallest. */
export function emblemArt(n: string, cx: number, cy: number, size: number, lift = true) {
  const [x0, y0, x1, y1] = BOX[n] ?? [0, 0, 512, 512], k = size / Math.max(x1 - x0, y1 - y0);
  return `<image href="${art.emblem(n)}" x="${f(cx - ((x0 + x1) / 2) * k)}" y="${f(cy - ((y0 + y1) / 2) * k)}" width="${f(512 * k)}" height="${f(512 * k)}"${lift ? ' filter="url(#lift)"' : ''}/>`;
}
/** How much of the disc the emblem takes, and how thick the white rim is for a disc of size `s`. */
const FILL = 0.6, rim = (s: number) => Math.max(1.2, s / 15);
/** The emblem in its disc, for SVG: the nation's colour, the woven cloth, a white rim; top left at (x, y), `s` across. */
export function emblemDisc(n: string, x: number, y: number, s: number, color = D.nations[n]?.color ?? '#555') {
  const r = s / 2, w = rim(s), cx = x + r, cy = y + r;
  return `<g><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - w / 2)}" fill="${color}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - w / 2)}" fill="url(#weave)" stroke="#fff" stroke-width="${f(w)}"/>${s >= 48 ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - w)}" fill="url(#gloss)" opacity=".35"/>` : ''}${emblemArt(n, cx, cy, s * FILL, s >= 20)}</g>`;
}
/** The emblem in its disc as a badge in the page, `s` pixels across. */
export const emblem = (n: string, s = 34, color?: string) => `<svg class="em" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true">${emblemDisc(n, 0, 0, s, color)}</svg>`;
/** A player's badge, in the player's colour. */
export const playerEmblem = (p: number, s = 34) => emblem(D.players[p]!.nation, s, D.players[p]!.color);
