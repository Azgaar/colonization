/* Things that stand on the map, upright: ships, infantry, ruins, wrecks; villages and colonies come from towns.ts. */
import { colony, village } from './towns.ts';
import { D } from '../data.ts';
import { SHAPES } from '../icons.ts';
import { emblemArt } from '../emblem.ts';
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
${emblemArt(D.players[p].nation, 32, 24.500, 10)}
<path d="M32 4l-9 1.600 9 1.800ZM45 13l-7 1.300 7 1.500ZM18 13l-7 1.300 7 1.500Z" fill="#fff"/>
<path d="M5 40Q8 49 13 55H48Q55 51 59 34L49 35.500V41Q36 46 22 44.500L14 43V39.500Z" fill="#5b371d"/><path d="M5 40Q7 45 9.500 49Q30 54 54.500 46Q57 41 59 34L49 35.500V41Q36 46 22 44.500L14 43V39.500Z" fill="#8a5730"/><path d="M6.500 43.500Q30 51 57 41" stroke="#e0b878" stroke-width="1.500" fill="none"/><path d="M49 35.500L59 34L58.300 37L49 38.500ZM5 40L14 39.500V42.500L6 42.500Z" fill="${c}"/><path d="M49 35.500L59 34M5 40L14 39.500" stroke="#e9c987" stroke-width="1.300"/><path d="M17 48.300h2.600v2.400H17Zm7 .9h2.600v2.400H24Zm7 .2h2.600v2.400H31Zm7-.6h2.600v2.400H38Zm7-1.600h2.600v2.400H45Z" fill="#2b1a0d"/><path d="M51.500 39.800h2v2.200h-2Zm3.200-.6h1.900v2.200h-1.900Z" fill="#ffdf8c"/>`;
  },
  /** The infantry of player `p`: the coat and the flag of the standard in the player's colour, the headgear and the belts of the nation, its emblem on the flag. */
  infantry(p: number) {
    const { color: c, nation: n } = D.players[p], belt = BELT[n] ?? '#fffaf0', arm = (d: string) => `<path d="${d}" stroke="${c}" stroke-width="3.400" stroke-linecap="round" fill="none"/>`, hand = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="1.700" fill="#e2b48b"/>`;
    // Below the coat: breeches and stockings with shoes, or for the Scots a kilt in the player's colour over socks.
    const lower = n === 'scottish'
      ? `<path d="M26.500 47v8.500h4V47Zm7 0v8.500h4V47Z" fill="#e9e2cf"/><path d="M26.500 49.500h4m3 0h4" stroke="#b8452e" stroke-width="1.100"/><path d="M26 55.500h5v1.300h-5Zm7 0h5v1.300h-5Z" fill="${INK}"/><path d="M24.500 37.500h15l2 10h-19Z" fill="${c}"/><path d="M27.500 37.500l-.8 10m5.300-10v10m4.500-10 .8 10M23.800 41h16.400M23.200 44.500h17.600" stroke="#0007" stroke-width=".9"/><path d="M29.700 37.500v10m4.600-10v10" stroke="#fff6" stroke-width=".6"/>`
      : `<path d="M26.700 43.500h4.600V55h-4.600Zm6 0h4.600V55h-4.600Z" fill="#e9e2cf"/><path d="M26.200 54.500h5.600v2h-5.600Zm6 0h5.600v2h-5.600Z" fill="${INK}"/><path d="M24.500 36.500L22.300 46H29l3-5.500 3 5.500h6.700l-2.200-9.500Z" fill="${c}"/><path d="M24.500 36.500L22.300 46H29l3-5.500 3 5.500h6.700l-2.200-9.500Z" fill="#0002"/><path d="M22.300 46l1.800-4.500L26 46ZM41.700 46l-1.800-4.500L38 46Z" fill="${belt}"/>`;
    return ring(56, 15) + lower
      + `<path d="M23 26.500q0-3.500 3.500-3.500h11q3.500 0 3.500 3.500l-1.500 12h-15Z" fill="${c}" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/><path d="M23 26.500q0-3.500 3.500-3.500h11q3.500 0 3.500 3.500l-.3 2.500H23.300Z" fill="#0002"/>`
      + `<path d="M26 24.500l11.500 12M38 24.500l-11.500 12" stroke="${belt}" stroke-width="1.800"/><path d="M24.300 35.500h15.400v2H24.300Z" fill="#3a2414"/><path d="M31 35.300h2v2.400h-2Z" fill="${BRASS}"/><path d="M29.300 22h5.400v2.200h-5.400Z" fill="#f4efe4"/>`
      + arm('M24 25.500q-3 6-2.500 12') + hand(21.500, 38.500)
      + `<path d="M46.600 56.500V8.500" stroke="#5a3a20" stroke-width="1.300" stroke-linecap="round"/><circle cx="46.600" cy="7.600" r="1.400" fill="${BRASS}"/>`
      + `<path d="M47.200 10q7.500-2.500 15 0v11q-7.500-2.500-15 0Z" fill="${c}"/><path d="M47.200 10q7.500-2.500 15 0v11q-7.500-2.500-15 0Z" fill="url(#billow)" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/>${flagEmblem(n)}`
      + arm('M40 25.500q4 2.500 6 7') + hand(46.600, 32.800)
      + `<circle cx="32" cy="18" r="5.500" fill="#e2b48b"/>${HAT[n] ?? HAT.english}`;
  },
  /** A soldier of the Royal Army: a grenadier in a tall mitre cap with the crown on it, red coat with royal-blue facings, black gaiters, musket and bayonet; no flag, so it is never taken for a player's infantry. */
  redcoat() {
    const arm = (d: string) => `<path d="${d}" stroke="${RED}" stroke-width="3.400" stroke-linecap="round" fill="none"/>`, hand = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="1.700" fill="#e2b48b"/>`;
    return ring(56, 14)
      + `<path d="M26.700 43.500h4.600V55h-4.600Zm6 0h4.600V55h-4.600Z" fill="#f4efe4"/><path d="M26.500 48h5v8.500h-5Zm6.200 0h5v8.500h-5Z" fill="${INK}"/><path d="M26.200 55h5.600v1.800h-5.600Zm6.200 0h5.600v1.800h-5.600Z" fill="#111"/>`
      + `<path d="M24.500 36.500L22.300 46H29l3-5.500 3 5.500h6.700l-2.200-9.500Z" fill="${RED}"/><path d="M22.300 46l1.800-4.500L26 46ZM41.700 46l-1.800-4.500L38 46Z" fill="${ROYAL}"/>`
      + `<path d="M23 26.500q0-3.500 3.500-3.500h11q3.500 0 3.500 3.500l-1.500 12h-15Z" fill="${RED}" stroke="#fff" stroke-opacity=".45" stroke-width=".8"/><path d="M28 23.200h8l-1 13h-6Z" fill="${ROYAL}"/><path d="M29 26h6M29.300 29h5.400M29.600 32h4.800" stroke="${BRASS}" stroke-width=".9"/>`
      + `<path d="M26 24.500l11.500 12M38 24.500l-11.500 12" stroke="#fffaf0" stroke-width="1.800"/><path d="M24.300 35.500h15.400v2H24.300Z" fill="#fffaf0"/><path d="M31 35.300h2v2.400h-2Z" fill="${BRASS}"/>`
      + arm('M24 25.500q-3 6-2.500 12') + hand(21.500, 38.500)
      // musket with bayonet, held upright on the right
      + `<path d="M45.800 55.500l1.400-8" stroke="#6b4226" stroke-width="3" stroke-linecap="round"/><path d="M47.200 47.500L46.400 12" stroke="#5a3a20" stroke-width="1.800"/><path d="M46.400 13V5" stroke="${STEEL}" stroke-width="1"/><path d="M46.400 5l-.7 2h1.400Z" fill="${STEEL}"/>`
      + arm('M40 25.500q4 2.500 6 7') + hand(46.600, 32.800)
      // face, and the mitre cap: royal-blue front edged in gold, the crown on it
      + `<circle cx="32" cy="18.500" r="5.500" fill="#e2b48b"/><path d="M25.500 16.500Q27 6 32 1.500Q37 6 38.500 16.500Z" fill="${ROYAL}"/><path d="M25.500 16.500Q27 6 32 1.500Q37 6 38.500 16.500Z" fill="none" stroke="${BRASS}" stroke-width="1"/><path d="M25.200 15.500h13.600v1.800H25.200Z" fill="${RED}"/>`
      + `<svg x="28" y="6.500" width="8" height="8" viewBox="0 0 24 24">${CROWN}</svg>`;
  },
  /** A ship of the King's navy: a dark man-of-war with a gold stripe, white sails, the crown on the mainsail and a red ensign. */
  refShip() {
    const sail = (d: string) => `<path d="${d}" fill="#f6efdc"/><path d="${d}" fill="url(#billow)" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>`;
    return `<ellipse cx="33" cy="56" rx="30" ry="5.500" fill="#06283a" fill-opacity=".42"/><path d="M1 55q8-5 15-1M22 59q16 3 34-2" stroke="#f2fbf7" stroke-opacity=".75" stroke-width="1.500" fill="none" stroke-linecap="round"/>
<path d="M9 41L-2 34.500" stroke="#3a2a1c" stroke-width="1.700" stroke-linecap="round"/><path d="M18 44V13M32 45V4M45 42V13" stroke="#3a2a1c" stroke-width="1.700"/><path d="M18 14L-1 35M32 5L52 33M32 5L12 41" stroke="#2b1c10" stroke-opacity=".5" stroke-width=".6" fill="none"/>
${sail('M17 16Q6 27 0 34Q9 33 16 34Z')}${sail('M44 15Q54 23 58 31Q50 29.500 43 32Q46 24 44 15Z')}
${sail('M12 17Q18 14.500 25 17Q23 21 24.500 25Q18 22.500 12 25Q10 21 12 17Z')}${sail('M10 26Q18 23 26.500 26Q24 33 26 39Q18 35.500 9.500 39Q7 32 10 26Z')}
${sail('M26 8Q32 5.500 39 8Q37 12 38.500 16Q32 13.500 26 16Q24.500 12 26 8Z')}${sail('M23.500 17Q32 13.500 41 17Q38.500 26 41.500 35Q32 30.500 23 35Q20 26 23.500 17Z')}
<svg x="25.500" y="18.500" width="13" height="13" viewBox="0 0 24 24">${CROWN}</svg>
<path d="M32 4l-9 1.600 9 1.800ZM45 13l-7 1.300 7 1.500Z" fill="#fff"/><path d="M18 13l-8 1.400 8 1.600Z" fill="${RED}"/>
<path d="M5 40Q8 49 13 55H48Q55 51 59 34L49 35.500V41Q36 46 22 44.500L14 43V39.500Z" fill="#1d1a17"/><path d="M5 40Q7 45 9.500 49Q30 54 54.500 46Q57 41 59 34L49 35.500V41Q36 46 22 44.500L14 43V39.500Z" fill="#2e2924"/><path d="M6 42.500Q30 50.500 57.500 40" stroke="${BRASS}" stroke-width="3.200" fill="none"/><path d="M14 45.300h2.600v2.400H14Zm6.500 1h2.600v2.400h-2.600Zm6.500.5h2.600v2.400H27Zm6.500 0h2.600v2.400h-2.600Zm6.500-.6h2.600v2.400H40Zm6.500-1.500h2.600v2.400h-2.600Z" fill="#111"/><path d="M49 35.500L59 34L58.300 37L49 38.500ZM5 40L14 39.500V42.500L6 42.500Z" fill="${RED}"/><path d="M49 35.500L59 34M5 40L14 39.500" stroke="${BRASS}" stroke-width="1.300"/><path d="M51.500 39.800h2v2.200h-2Zm3.200-.6h1.900v2.200h-1.900Z" fill="#ffdf8c"/>
<path d="M58.500 35V25.500" stroke="#3a2a1c" stroke-width="1.200"/><path d="M58.500 25.500h8l-1.200 2.300 1.200 2.300h-8Z" fill="${RED}"/><path d="M58.500 25.500h3.400v2.300h-3.400Z" fill="${ROYAL}"/>`;
  },
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
/* ---- infantry by nation ---- */
const STEEL = '#c3cad0', BRASS = '#c9a25a', INK = '#22262b';
/* The King's colours and his crown (the same crown as the Royal Army everywhere in the game). */
const RED = '#b0242a', ROYAL = '#23366e', CROWN = SHAPES.ref!;
const tricorne = (trim: string, cockade = '') => `<path d="M21 16.500q11-11 22 0-11-3.500-22 0Z" fill="${INK}"/><path d="M21.600 16.200q10.400-3.300 20.800 0" stroke="${trim}" stroke-width="1" fill="none"/>${cockade ? `<circle cx="32" cy="12.600" r="1.600" fill="${cockade}"/>` : ''}`;
const morion = `<path d="M21 13.500q11 5 22 0-2 3.500-11 3.500t-11-3.500Z" fill="#aeb6bc"/><path d="M26 15q0-7 6-7t6 7Z" fill="${STEEL}"/><path d="M28 9.500q4-5 8 0" stroke="#8d969c" stroke-width="2" fill="none"/>`;
/** The colour of the crossbelts of each nation. */
const BELT: Record<string, string> = { english: '#fffaf0', french: '#fffaf0', dutch: '#f0a64a', spanish: '#e9c987', portuguese: '#e9c987', swedish: '#f2c94c', danish: '#fffaf0', russian: '#e9c987', curonian: '#f2c94c', scottish: '#fffaf0' };
/** The headgear of each nation, over a head at (32, 18). */
const HAT: Record<string, string> = {
  english: tricorne('#fffaf0'),
  french: tricorne('#e9c987', '#fffaf0'),
  swedish: tricorne('#f2c94c', '#f2c94c'),
  danish: tricorne('#fffaf0', '#c8102e'),
  dutch: `<ellipse cx="32" cy="14.500" rx="10" ry="2.300" fill="${INK}"/><path d="M27 14.500V9.500q5-2 10 0v5Z" fill="${INK}"/><path d="M27 12.300h10v1.600H27Z" fill="#e8862a"/>`,
  spanish: morion + `<path d="M36 9.500q5-3 7 .8-3.500-1.300-7-.8Z" fill="#b8452e"/>`,
  portuguese: `<path d="M22.500 15.500q9.500 3 19 0l-1.500-1.500h-16Z" fill="#aeb6bc"/><path d="M25 14.500q0-8 7-8.500 7 .5 7 8.500Z" fill="${STEEL}"/><path d="M25.200 13h13.600" stroke="${BRASS}" stroke-width="1.200"/><path d="M31.200 6.300l.8-2.300.8 2.300Z" fill="#8d969c"/>`,
  russian: `<path d="M28 20.500q4 6.500 8 0-4 1.500-8 0Z" fill="#6b4a30"/><path d="M25.500 15.500V8q6.500-3 13 0v7.500Z" fill="#3a2c22"/><path d="M27 15V9.500m3 5.500V8.700m3 6.300V8.500m3 6.500V9" stroke="#5a4636" stroke-width=".8"/><path d="M26 8.300q6-2.200 12 0-6 1.600-12 0Z" fill="#b8452e"/>`,
  curonian: `<path d="M26.500 15.500L29 5q3-2 5 0l3.500 10.500Z" fill="#9b1212"/><path d="M26.500 15.500L29 5q3-2 5 0l3.500 10.500Z" fill="none" stroke="${BRASS}" stroke-width="1"/><path d="M27.500 13l9 0" stroke="${BRASS}" stroke-width="1.300"/><circle cx="31.500" cy="4.200" r="1.300" fill="${BRASS}"/>`,
  scottish: `<path d="M24.500 14.500q-1-5.500 7.500-5.500 8.500 0 7.500 5.500Z" fill="#2f4a7a"/><path d="M24.800 14h14.400v1.800H24.800Z" fill="#e6e0d0"/><path d="M26.500 14h2v1.800h-2Zm4 0h2v1.800h-2Zm4 0h2v1.800h-2Z" fill="#b8452e"/><circle cx="32" cy="9" r="1.500" fill="#b8452e"/>`,
};
/** The emblem of nation `n` on the infantry's flag, centred on the middle of the waving flag. */
const flagEmblem = (n: string) => emblemArt(n, 54.7, 14.3, 8);
