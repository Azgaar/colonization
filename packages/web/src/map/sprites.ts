/* Things that stand on the map, upright: ships, infantry, ruins, wrecks; villages and colonies come from towns.ts. */
import { colony, village } from './towns.ts';
import { art, D } from '../data.ts';
/* Sprites in a 64-unit box, feet at the bottom. */
const ring = (y: number, r: number) => `<ellipse cx="32" cy="${y}" rx="${r}" ry="${r * 0.34}" fill="#0a1d1b" fill-opacity=".34"/>`;
export const Sprite = {
  village, colony,
  /** The ship of player `p`, its sails in the player's colour. */
  ship(p: number) {
    const c = D.players[p].color, sail = (d: string) => `<path d="${d}" fill="${c}"/><path d="${d}" fill="url(#billow)" stroke="#fff" stroke-opacity=".55" stroke-width=".7"/>`, light = (d: string) => `<path d="${d}" fill="#f4ead2"/><path d="${d}" fill="url(#billow)"/>`;
    return `<ellipse cx="33" cy="56" rx="30" ry="5.500" fill="#06283a" fill-opacity=".42"/><path d="M1 55q8-5 15-1M22 59q16 3 34-2" stroke="#f2fbf7" stroke-opacity=".75" stroke-width="1.500" fill="none" stroke-linecap="round"/>
<path d="M9 41L-2 34.500" stroke="#4a2f1a" stroke-width="1.700" stroke-linecap="round"/><path d="M18 44V13M32 45V4M45 42V13" stroke="#4a2f1a" stroke-width="1.700"/><path d="M18 14L-1 35M32 5L52 33M32 5L12 41" stroke="#2b1c10" stroke-opacity=".5" stroke-width=".6" fill="none"/>
${light('M17 16Q6 27 0 34Q9 33 16 34Z')}
${sail('M44 15Q54 23 58 31Q50 29.500 43 32Q46 24 44 15Z')}
${sail('M12 17Q18 14.500 25 17Q23 21 24.500 25Q18 22.500 12 25Q10 21 12 17Z')}${sail('M10 26Q18 23 26.500 26Q24 33 26 39Q18 35.500 9.500 39Q7 32 10 26Z')}
${sail('M26 8Q32 5.500 39 8Q37 12 38.500 16Q32 13.500 26 16Q24.500 12 26 8Z')}${sail('M23.500 17Q32 13.500 41 17Q38.500 26 41.500 35Q32 30.500 23 35Q20 26 23.500 17Z')}
<image href="${art.emblem(D.players[p].nation)}" x="26.750" y="19.250" width="10.500" height="10.500" filter="url(#lift)"/>
<path d="M32 4l-9 1.600 9 1.800ZM45 13l-7 1.300 7 1.500ZM18 13l-7 1.300 7 1.500Z" fill="#fff"/>
<path d="M5 40Q8 49 13 55H48Q55 51 59 34L49 35.500V41Q36 46 22 44.500L14 43V39.500Z" fill="#5b371d"/><path d="M5 40Q7 45 9.500 49Q30 54 54.500 46Q57 41 59 34L49 35.500V41Q36 46 22 44.500L14 43V39.500Z" fill="#8a5730"/><path d="M6.500 43.500Q30 51 57 41" stroke="#e0b878" stroke-width="1.500" fill="none"/><path d="M49 35.500L59 34L58.300 37L49 38.500ZM5 40L14 39.500V42.500L6 42.500Z" fill="${c}"/><path d="M49 35.500L59 34M5 40L14 39.500" stroke="#e9c987" stroke-width="1.300"/><path d="M17 48.300h2.600v2.400H17Zm7 .9h2.600v2.400H24Zm7 .2h2.600v2.400H31Zm7-.6h2.600v2.400H38Zm7-1.600h2.600v2.400H45Z" fill="#2b1a0d"/><path d="M51.500 39.800h2v2.200h-2Zm3.200-.6h1.900v2.200h-1.900Z" fill="#ffdf8c"/>`;
  },
  infantry(p: number) { const c = D.players[p].color; return ring(56, 15) + `<path d="M25 56l2-17h10l2 17h-5l-2-11-2 11Z" fill="#e9e2cf"/><path d="M22 24h20l-2 18H24Z" fill="${c}"/><path d="M22 24h20l-1 5H23Z" fill="#0003"/><path d="M27 24l10 15M37 24L27 39" stroke="#fffaf0" stroke-width="2"/><circle cx="32" cy="18" r="5.500" fill="#e2b48b"/><path d="M22 16q10-12 20 0-10-4-20 0Z" fill="#22262b"/><path d="M45 56V12l1.600-4 1.600 4v44Z" fill="#6b4526"/>`; },
  /** A ruin: one of a few pictures, always the same for the same cell. */
  ruin: (c: number) => RUINS[(Math.imul(c + 7, 0x9e3779b1) >>> 0) % RUINS.length]!,
  /** A shipwreck: one of a few pictures, always the same for the same cell. */
  wreck: (c: number) => WRECKS[(Math.imul(c + 1, 0x9e3779b1) >>> 0) % WRECKS.length]!,
};
/* ---- shipwrecks: what is left afloat, small floating parts each drawn about its own centre (x, y), turned by `a` degrees and scaled by `s` ---- */
const MAST = '#4a2f1a', SAIL = '#efe5cc', FLAG = '#2f3438';
const shade = (y: number, r: number) => `<ellipse cx="32" cy="${y}" rx="${r}" ry="${r * 0.22}" fill="#06283a" fill-opacity=".38"/>`;
const foamArc = (x: number, y: number, w: number) => `<path d="M${x - w / 2} ${y}q${w / 2} ${w * 0.18} ${w} 0" stroke="#f2fbf7" stroke-opacity=".8" stroke-width="1.300" fill="none" stroke-linecap="round"/>`;
/** Where a mast goes into the water: a crest on each side and the foam below. */
const splash = (x: number, y: number) => `<path d="M${x - 8} ${y - 0.500}q2.500-2 5 0M${x + 3} ${y - 0.500}q2.500-2 5 0" stroke="#f2fbf7" stroke-opacity=".85" stroke-width="1.300" fill="none" stroke-linecap="round"/>` + foamArc(x, y + 1.200, 10);
const part = (x: number, y: number, a: number, s: number, body: string) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${body}</g>`;
const bob = (w: number, y: number) => `<path d="M${-w} ${y}q${w} ${w * 0.35} ${w * 2} 0" stroke="#f2fbf7" stroke-opacity=".85" stroke-width="1.500" fill="none" stroke-linecap="round"/>`;
const barrel = (x: number, y: number, a = 0, s = 1) => part(x, y, a, s, `<rect x="-4.500" y="-6" width="9" height="12" rx="3.500" fill="#8a5730"/><rect x="-4.500" y="-6" width="4" height="12" rx="2" fill="#a86d3c"/><path d="M-4.500-2.500h9M-4.500 2.500h9" stroke="#3a2414" stroke-width="1.300"/><ellipse cx="0" cy="-6" rx="3.500" ry="1" fill="#6b4226"/>`) + part(x, y, 0, s, bob(7, 4.500));
const crate = (x: number, y: number, a = 0, s = 1) => part(x, y, a, s, `<path d="M-5.500-4.500h11v9h-11Z" fill="#b07a45"/><path d="M-5.500-4.500h11v2.500h-11Z" fill="#c99459"/><path d="M-5.500-4.500l11 9M5.500-4.500l-11 9" stroke="#5b371d" stroke-width="1.100"/><path d="M-5.500-4.500h11v9h-11Z" fill="none" stroke="#5b371d" stroke-width="1.400"/>`) + part(x, y, 0, s, bob(8, 5));
const plank = (x: number, y: number, a = 0, l = 14) => part(x, y, a, 1, `<rect x="${-l / 2}" y="-1.800" width="${l}" height="3.600" rx="1" fill="#7a5233"/><path d="M${-l / 2 + 1} -.4H${l / 2 - 2}" stroke="#4e3521" stroke-opacity=".7" stroke-width=".6"/><circle cx="${-l / 2 + 1.500}" cy="0" r=".5" fill="#2b1a0d"/><circle cx="${l / 2 - 1.500}" cy="0" r=".5" fill="#2b1a0d"/>`) + foamArc(x, y + 2.500, l * 0.8);
const rag = (d: string) => `<path d="${d}" fill="${SAIL}"/><path d="${d}" fill="url(#billow)"/>`;
const WRECKS = [
  // a broken mast with a scrap of sail, and what floated off
  shade(53, 20) + `<path d="M24 52L30 31" stroke="${MAST}" stroke-width="2.200" stroke-linecap="round"/><path d="M29 31.500l1-4 .7 2.200 1.300-1.200-.5 3.500Z" fill="${MAST}"/>` + rag('M29.500 33L39 36 37 42 34.500 39.500 32.500 44 31 38.500Z') + plank(40, 49, 10, 15) + crate(17, 47, -12, 0.75) + barrel(47, 46, 70, 0.7) + splash(24, 52.500),
  // a mast with its torn sail, a gull on top and another flying
  shade(53, 17) + `<path d="M29 52L35 23" stroke="${MAST}" stroke-width="2.400" stroke-linecap="round"/><path d="M24 30L45 33" stroke="${MAST}" stroke-width="1.800" stroke-linecap="round"/>` + rag('M25 30.500L44 33.500 42.500 41 39.500 37.500 37 43 34 37 30.500 41.500 28 36.500 26 39Z') + `<ellipse cx="35.300" cy="21.300" rx="2.600" ry="1.500" fill="#f7f4ec"/><circle cx="37.300" cy="20.300" r="1.100" fill="#f7f4ec"/><path d="M38.200 20.300l1.300.3-1.300.4Z" fill="#e8a23a"/><path d="M33 21.200l2.500-.6 1 1.200Z" fill="#8a9298"/><path d="M41 15q2-2 4 0 2-2 4 0" stroke="#f7f4ec" stroke-width="1.300" fill="none" stroke-linecap="round"/>` + crate(16, 49, -10, 0.75) + splash(30, 52.500),
  // a short mast with a rag and flag between barrels
  shade(53, 19) + `<path d="M31 52L33 29" stroke="${MAST}" stroke-width="2.400" stroke-linecap="round"/><path d="M25 34L40 33" stroke="${MAST}" stroke-width="1.700" stroke-linecap="round"/>` + rag('M26 34.500L39 33.500 38 40 35.500 37.500 33 41.500 30.500 37 28 40Z') + `<path d="M33 29l6 1-1.500 1.700 1.500 1.700-6-.8Z" fill="${FLAG}"/>` + barrel(19, 49, -20, 0.8) + barrel(44, 50, 15, 0.75) + crate(37, 45, 8, 0.6) + splash(31, 52.500),
  // planks, barrels, a crate and a spar with a scrap of sail
  shade(52, 19) + plank(22.900, 46.400, 13, 17) + plank(22.900, 49.300, -6, 13) + `<path d="M33.300 40.900L50.200 47.400" stroke="${MAST}" stroke-width="2" stroke-linecap="round"/>` + rag('M37.200 42.800L43.100 45.100 40.500 48.300 36.600 47Z') + barrel(22.900, 45.400, 70, 0.7) + barrel(40.500, 47.400, -10, 0.7) + crate(31.700, 43.700, 0, 0.7),
];
/* ---- ruins: what the natives left, drawn on land ---- */
const STONE = '#c4bca5', OCHRE = '#b8452e', TURQ = '#3c9a95', GRASS = '#6f8a45';
/** A standing stone with a round top: centre x, foot y, width, height; shaded on the right. */
const stone = (x: number, y: number, w: number, h: number, c = STONE) => `<path d="M${x - w / 2} ${y}V${y - h + 2}Q${x - w / 2} ${y - h} ${x} ${y - h}Q${x + w / 2} ${y - h} ${x + w / 2} ${y - h + 2}V${y}Z" fill="${c}"/><path d="M${x + w * 0.1} ${y}V${y - h}Q${x + w / 2} ${y - h} ${x + w / 2} ${y - h + 2}V${y}Z" fill="#00000024"/>`;
const RUINS = [
  // fallen columns under a lintel
  ring(54, 22) + `<path d="M12 54V28h7v26Zm16 0V24h7v30Zm16 0V32h7v22Z" fill="#cfc6ae"/><path d="M15.500 54V28H19v26Zm16 0V24H35v30Zm16 0V32H51v22Z" fill="#00000026"/><path d="M8 28l4-6h26l-2 6Z" fill="#ded6c0"/><path d="M38 54l4-5 5 5Zm-18 2 3-4 6 4Z" fill="#a89f88"/>`,
  // a carved and painted totem pole with spread wings, a broken one leaning beside it
  ring(55, 20) + `<path d="M8 53l12-3 1 3.500-12 3Z" fill="#7a4a28"/><g transform="rotate(14 46 54)"><path d="M42 54V30l2-2 1.500 2.500 1.500-2 2 1.500V54Z" fill="#7a4a28"/><path d="M42 38h7M42 46h7" stroke="#4a2f1a" stroke-width="1"/><path d="M42 33h7v1.600h-7Z" fill="${TURQ}"/><circle cx="44.300" cy="42" r="1.100" fill="#f4ead2"/><circle cx="47" cy="42" r="1.100" fill="#f4ead2"/></g><path d="M26 54V16h12v38Z" fill="#8a5730"/><path d="M32 54V16h6v38Z" fill="#00000022"/><path d="M26 28h12M26 40h12" stroke="#4a2f1a" stroke-width="1.200"/><path d="M28 11q4-3 8 0v5h-8Z" fill="#8a5730"/><path d="M18 17q7-5 14-2 7-3 14 2l-3 2.500q-5-2.500-11-1-6-1.500-11 1Z" fill="${OCHRE}"/><path d="M28 20h3v2.500h-3Zm5 0h3v2.500h-3Z" fill="#22262b"/><path d="M30.500 23h3L32 27Z" fill="#d9a13a"/><path d="M26 30.500h12v2H26Z" fill="${TURQ}"/><circle cx="29.500" cy="35.500" r="1.700" fill="#f4ead2"/><circle cx="34.500" cy="35.500" r="1.700" fill="#f4ead2"/><circle cx="29.500" cy="35.700" r=".8" fill="#22262b"/><circle cx="34.500" cy="35.700" r=".8" fill="#22262b"/><path d="M29 38.300h6" stroke="${OCHRE}" stroke-width="1.400"/><path d="M26 43h12v2H26Z" fill="${OCHRE}"/><path d="M28 48h3v2h-3Zm5 0h3v2h-3Z" fill="#22262b"/>`,
  // a ring of standing stones around a small fire
  ring(53, 26) + `<ellipse cx="32" cy="47" rx="25" ry="8" fill="${GRASS}" fill-opacity=".5"/>` + stone(17, 42, 5, 10) + stone(26, 40, 5.500, 12) + stone(38, 40, 5.500, 12) + stone(47, 42, 5, 10) + `<ellipse cx="32" cy="47" rx="4.500" ry="1.800" fill="#3a3128"/><path d="M30 46l2-4 2 4" fill="#e0893a"/>` + stone(11, 51, 6, 13) + stone(22, 55, 7, 16) + stone(42, 55, 7, 16) + stone(53, 51, 6, 13) + `<path d="M27 55.500l9-2.500 1 3-9 1.500Z" fill="#a89f88"/>`,
];
