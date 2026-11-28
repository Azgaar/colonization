/**
 * The rulebook's ornaments, drawn as SVG in the manner of an 18th-century sea chart and printed manual:
 * a compass rose, corner brackets for pictures, a knotted rule under titles, a chapter medallion and the box emblems.
 * build.ts writes them into dist/ornaments.css as data URIs, so the pages stay plain HTML.
 */
const TEAL = '#0f3436', TEAL2 = '#1d5556', OCHRE = '#c8902c', PAPER = '#fbf6ea', SCARLET = '#b0242a';
const f = (n: number) => +n.toFixed(2);
const polar = (cx: number, cy: number, r: number, deg: number) => [f(cx + r * Math.sin((deg * Math.PI) / 180)), f(cy - r * Math.cos((deg * Math.PI) / 180))];

/** A compass rose: rings with degree ticks, eight long and eight short points, each split into a dark and a light half. */
export function compass(ink = TEAL, light = PAPER, accent = OCHRE): string {
  const c = 100, out: string[] = [];
  out.push(`<circle cx="${c}" cy="${c}" r="96" fill="none" stroke="${ink}" stroke-width="1.2"/><circle cx="${c}" cy="${c}" r="90" fill="none" stroke="${ink}" stroke-width=".6"/><circle cx="${c}" cy="${c}" r="70" fill="none" stroke="${ink}" stroke-width=".5" stroke-dasharray="1.5 2.5"/>`);
  for (let d = 0; d < 360; d += 5) { const [x1, y1] = polar(c, c, d % 45 ? 93 : 88, d), [x2, y2] = polar(c, c, 96, d); out.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${ink}" stroke-width="${d % 45 ? 0.5 : 1}"/>`); }
  const point = (deg: number, r: number, w: number, dark: string, pale: string) => {
    const [tx, ty] = polar(c, c, r, deg), [lx, ly] = polar(c, c, w, deg - 45), [rx, ry] = polar(c, c, w, deg + 45);
    return `<path d="M${c} ${c}L${lx} ${ly}L${tx} ${ty}Z" fill="${dark}" stroke="${ink}" stroke-width=".6" stroke-linejoin="round"/><path d="M${c} ${c}L${rx} ${ry}L${tx} ${ty}Z" fill="${pale}" stroke="${ink}" stroke-width=".6" stroke-linejoin="round"/>`;
  };
  for (let d = 22.5; d < 360; d += 45) out.push(point(d, 56, 9, accent, light));
  for (let d = 45; d < 360; d += 90) out.push(point(d, 70, 13, ink, light));
  for (let d = 0; d < 360; d += 90) out.push(point(d, 88, 16, ink, light));
  out.push(`<circle cx="${c}" cy="${c}" r="7" fill="${light}" stroke="${ink}" stroke-width="1"/><circle cx="${c}" cy="${c}" r="2.6" fill="${accent}"/>`);
  // A fleur-de-lis marks the north.
  out.push(`<path d="M100 1.5c-3 4-4.5 7-2.5 11-4-1-6.5 1-6 4 2.5-2 5-1.5 6.5 1H97v2h6v-2h-1c1.5-2.5 4-3 6.5-1 .5-3-2-5-6-4 2-4 .5-7-2.5-11Z" fill="${accent}" stroke="${ink}" stroke-width=".5"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${out.join('')}</svg>`;
}

/** The knot set on the rule under a chapter title: a diamond between two scrolls, on a paper ground so the rule's lines stop at its edge. */
export const knot = (ink = TEAL, accent = OCHRE, light = PAPER) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 12"><rect x="13" y="0" width="34" height="12" fill="${light}"/><path d="M16 6c3-5 7-5 8 0-1 5-5 5-8 0ZM44 6c-3-5-7-5-8 0 1 5 5 5 8 0Z" fill="${light}" stroke="${ink}" stroke-width=".9"/><path d="M30 1 35 6 30 11 25 6Z" fill="${accent}" stroke="${ink}" stroke-width=".8"/><circle cx="30" cy="6" r="1.2" fill="${ink}"/></svg>`;

/** One corner bracket for a picture: an L of two rules ending in a dot, with a small scroll in the angle. Drawn for the top left; the others are turned. */
export function corner(turn: 0 | 90 | 180 | 270, ink = PAPER): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g transform="rotate(${turn} 20 20)" fill="none" stroke="${ink}" stroke-linecap="round"><path d="M5 34V8a3 3 0 0 1 3-3h26" stroke-width="1.4"/><path d="M10 26V13a3 3 0 0 1 3-3h13" stroke-width=".7"/><path d="M5 5c4 0 7 2 7 6-3 0-4-2-3-4" stroke-width=".9"/></g><g transform="rotate(${turn} 20 20)" fill="${ink}"><circle cx="5" cy="35" r="1.6"/><circle cx="35" cy="5" r="1.6"/></g></svg>`;
}

/** The chapter medallion: a paper disc in a double ring with four ochre studs; the number is written over it by CSS. */
export const medal = (ink = TEAL, accent = OCHRE, light = PAPER) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="${light}" stroke="${ink}" stroke-width="2"/><circle cx="30" cy="30" r="23.5" fill="none" stroke="${ink}" stroke-width=".7"/><circle cx="30" cy="30" r="21" fill="none" stroke="${accent}" stroke-width=".7" stroke-dasharray="1 2.2"/>${[0, 90, 180, 270].map((d) => { const [x, y] = polar(30, 30, 25.8, d); return `<circle cx="${x}" cy="${y}" r="1.6" fill="${accent}"/>`; }).join('')}</svg>`;

/** Box emblems: a compass needle for examples, a wax seal for rules to remember, a quill for fine points. */
export const needle = (ink = TEAL2, accent = OCHRE) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="${ink}" stroke-width="1.2"/><path d="M12 3.5 14.6 12 12 20.5 9.4 12Z" fill="${PAPER}" stroke="${ink}" stroke-width=".9"/><path d="M12 3.5 14.6 12H9.4Z" fill="${accent}" stroke="${ink}" stroke-width=".9"/><circle cx="12" cy="12" r="1.3" fill="${ink}"/></svg>`;
export const seal = (wax = SCARLET) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 1.5l2 1.6 2.5-.5 1 2.4 2.4 1-.5 2.5 1.6 2-1.6 2 .5 2.5-2.4 1-1 2.4-2.5-.5-2 1.6-2-1.6-2.5.5-1-2.4-2.4-1 .5-2.5-1.6-2 1.6-2-.5-2.5 2.4-1 1-2.4 2.5.5Z" fill="${wax}"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#7d151a" stroke-width="1"/><path d="M8.6 14.2 7.8 9.6l2.3 1.6L12 8l1.9 3.2 2.3-1.6-.8 4.6Z" fill="#f3dca5"/></svg>`;
export const quill = (ink = '#7a6c4e') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 2.5C13 4 7.5 9.5 5.5 18.5l1.6.4c.6-2.5 1.6-4.6 2.9-6.4 3.5-.4 6.5-2.2 8.3-5.3-1.3.3-2.6.3-3.8 0 2.4-1.2 4.4-2.9 5.5-4.7Z" fill="${ink}"/><path d="M5.5 18.5 4 22" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/></svg>`;

/** A small fleuron for the running head. */
export const fleuron = (ink = '#b9a77f') => `<svg xmlns="http://www.w3.org/2000/svg" width="28mm" height="3.5mm" viewBox="0 0 80 10"><path d="M2 5h26M52 5h26" stroke="${ink}" stroke-width=".6"/><path d="M40 1 44 5 40 9 36 5Z" fill="${ink}"/><circle cx="31" cy="5" r="1.2" fill="${ink}"/><circle cx="49" cy="5" r="1.2" fill="${ink}"/></svg>`;

const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;

/** The stylesheet that places the ornaments; linked by every built page after rulebook.css. */
export function ornamentsCss(): string {
  return `/* Generated by rulebook/build.ts from rulebook/ornaments.ts. Do not edit. */
:root { --orn-compass: ${uri(compass())}; --orn-compass-light: ${uri(compass(PAPER, '#ffffff10', '#f3dca5'))}; --orn-knot: ${uri(knot())}; --orn-medal: ${uri(medal())}; --orn-needle: ${uri(needle())}; --orn-seal: ${uri(seal())}; --orn-quill: ${uri(quill())}; --orn-fleuron: ${uri(fleuron())};
  --orn-c1: ${uri(corner(0))}; --orn-c2: ${uri(corner(90))}; --orn-c3: ${uri(corner(180))}; --orn-c4: ${uri(corner(270))}; }
@page { @top-center { content: ${uri(fleuron())}; vertical-align: bottom; padding-bottom: 3mm; } }
@page cover { @top-center { content: none; } }
`;
}
