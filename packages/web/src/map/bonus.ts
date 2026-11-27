/* Bonus resources, painted on the ground of their cell and tilted with the map. x and y is the middle of the cell. */
import { colonyAt, settlementAt } from '../data.ts';
import type { GameView } from '../view.ts';
const P = (d: string, f: string, o = '') => `<path d="${d}" fill="${f}" ${o}/>`, many = (pts: number[][], f: (...p: number[]) => string) => pts.map((p) => f(...p)).join('');
const at = (x: number, y: number, k: number, r: number, body: string) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${k})">${body}</g>`;
const shade = (rx: number) => `<ellipse cx="1" cy="1" rx="${rx}" ry="${rx * 0.36}" fill="#0a1d1b" fill-opacity=".26"/>`;
/** Wild crops: a low rosette of broad leaves, a couple of pale flowers on top. */
const LEAF = 'M0 0q-5.500-4 0-11 5.500 7 0 11Z';
const bush = shade(8) + [[-80, '#4a8a37', 0.8], [80, '#4a8a37', 0.8], [-45, '#5e9f44', 1], [45, '#5e9f44', 1], [-15, '#4a8a37', 1.1], [15, '#579a40', 1.05]].map(([r, c, k]) => `<g transform="rotate(${r}) scale(${k})"><path d="${LEAF}" fill="${c}"/><path d="M0 -1v-8" stroke="#a5d07c" stroke-width=".6"/></g>`).join('')
  + [[-3, -11], [3.500, -10]].map(([a, b]) => `<path d="M${a} ${b + 4}v-4" stroke="#579a40" stroke-width=".8"/><circle cx="${a}" cy="${b}" r="1.700" fill="#f4e6ee"/><circle cx="${a}" cy="${b}" r=".7" fill="#d58aae"/>`).join('');
/** Silver ore: a faceted nugget, bluish and outlined dark so that it stands apart from the snow on the peaks. */
const NUGGET = '<path d="M-5 1-4-3 0-5 4-3 5 1 1 3.500-3 3Z" fill="#a7bccd" stroke="#222a31" stroke-width="1.300" stroke-linejoin="round"/><path d="M-4-3 0-5 1-1-2.500 0Z" fill="#e8f1f8"/><path d="M1-1 4-3 5 1 1 3.500Z" fill="#687d90"/>';
const GROUND: Record<string, (x: number, y: number) => string> = {
  fish: (x, y) => many([[-7, -4, 1], [6, -1, 0.9], [-2, 6, 1.05], [10, 8, 0.8]], (a, b, k) => `<g transform="translate(${x + a} ${y + b}) scale(${k})">${P('M-7 0q4-4.600 9.500-1.200l3.700-2.800v8l-3.700-2.800Q-3 4.600-7 0Z', '#06364f', 'fill-opacity=".6"')}</g>`),
  crops: (x, y) => many([[-9, 8, 1, -8], [5, 11, 0.9, 10], [12, 0, 0.95, 4], [-3, -4, 0.8, -4]], (a, b, k, r) => at(x + a, y + b, k, r, bush)),
  timber: (x, y) => many([[-10, 5], [2, -5], [10, 6], [-2, 10], [-9, -6]], (a, b) => `<ellipse cx="${x + a + 1}" cy="${y + b + 3}" rx="5.200" ry="2.200" fill="#0a1d1b" fill-opacity=".33"/>` + P(`M${x + a - 4} ${y + b - 2}v4q4 2.200 8 0v-4Z`, '#71472a') + `<ellipse cx="${x + a}" cy="${y + b - 2}" rx="4" ry="2" fill="#e0b986"/><ellipse cx="${x + a}" cy="${y + b - 2}" rx="1.800" ry=".9" fill="none" stroke="#a9794a" stroke-width=".7"/>`) + P(`M${x + 3} ${y + 12}l14-5 1.500 3.500-14 5Z`, '#8a5a33') + `<ellipse cx="${x + 18}" cy="${y + 8.700}" rx="1.700" ry="2.200" fill="#e0b986" transform="rotate(-20 ${x + 18} ${y + 8.700})"/>`,
  /* Crops on forest or tundra are fur, and are drawn so here only; the board game always shows the crops icon. */
  fur: (x, y) => many([[-13, 9], [-7, 3], [-1, 7], [5, 0], [11, 4], [15, -3]], (a, b) => `<ellipse cx="${x + a}" cy="${y + b}" rx="2.300" ry="1.800" fill="#3d2616" fill-opacity=".72"/>` + many([[-2.200, -2.300], [0, -3.200], [2.200, -2.300]], (p, q) => `<ellipse cx="${x + a + p}" cy="${y + b + q}" rx=".95" ry=".8" fill="#3d2616" fill-opacity=".72"/>`)) + P(`M${x - 9} ${y - 7}q3-6 9-4 5 2 3 6-6 3-9 1Z`, '#7d5535', 'fill-opacity=".85"') + P(`M${x + 2.500} ${y - 6}q3 0 4 3-3 1-4-3Z`, '#4f3320'),
  silver: (x, y) => `<ellipse cx="${x + 1}" cy="${y + 5}" rx="16" ry="5" fill="#0a1d1b" fill-opacity=".45"/>` + many([[-1, -4, 1], [10, -4, 0.75], [-8, 2, 1.1], [6, 3, 1.25]], (a, b, k) => at(x + a, y + b, k, 0, NUGGET)),
};
/** Where a crops bonus is drawn as fur. */
const FUR = new Set(['forest', 'tundra']);
/** Every bonus of the open map as one picture for the ground layer. */
function picture(D: GameView, at: (c: number) => number[], size: number) {
  const out: string[] = [];
  D.bonus.forEach((b, c) => { const k = b === 'crops' && FUR.has(D.terrain[c] ?? '') ? 'fur' : b; if (!k || !GROUND[k] || colonyAt(c) || settlementAt(c)) return; const [x, y] = at(c); out.push(GROUND[k](x + 32, y + 34)); });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 2}" height="${size * 2}">${out.join('')}</svg>`;
}
export const Bonus = { picture };
