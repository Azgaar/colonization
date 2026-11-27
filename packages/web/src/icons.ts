/* Small flat pictograms and nation emblems, drawn as SVG. */
import { emblemDisc } from './emblem.ts';
import { D } from './data.ts';
import { SHAPES } from './shapes.ts';

export { SHAPES };
export const icon = (n: string, size = 18) => `<svg class="ic ic-${n}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${SHAPES[n] || ''}</svg>`;
export const eduIcon = (e: number) => icon(['eduNone', 'eduBasic', 'eduHigher'][e], 16);
/* Cloth texture and shadow for nation emblems: white charge on the nation's colour. */
export const DEFS = '<defs><radialGradient id="gloss" cx=".35" cy=".25" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".4" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient><linearGradient id="billow"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient><pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 .5H4M0 2.5H4" stroke="#fff" stroke-opacity=".1"/><path d="M.5 0V4M2.5 0V4" stroke="#000" stroke-opacity=".13"/></pattern><filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="#000" flood-opacity=".55"/></filter></defs>';
/** A player's emblem in its disc on the map: top left at (x, y), `s` across (see emblem.ts). */
export const roundel = (x: number, y: number, p: number, s: number) => emblemDisc(D.players[p]!.nation, x, y, s, D.players[p]!.color);
