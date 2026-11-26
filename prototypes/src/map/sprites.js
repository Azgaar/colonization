/* Things that stand on the map, upright: ships, infantry, ruins, wrecks; villages and colonies come from towns.js. */
import { colony, village } from './towns.js';
import { art, D } from '../data.js';
/* Sprites in a 64-unit box, feet at the bottom. */
const ring = (y, r) => `<ellipse cx="32" cy="${y}" rx="${r}" ry="${r * 0.34}" fill="#0a1d1b" fill-opacity=".34"/>`;
export const Sprite = {
  village, colony,
  ship(p) {
    const c = D.players[p].color, sail = (d) => `<path d="${d}" fill="${c}"/><path d="${d}" fill="url(#billow)" stroke="#fff" stroke-opacity=".55" stroke-width=".7"/>`, light = (d) => `<path d="${d}" fill="#f4ead2"/><path d="${d}" fill="url(#billow)"/>`;
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
  infantry(p) { const c = D.players[p].color; return ring(56, 15) + `<path d="M25 56l2-17h10l2 17h-5l-2-11-2 11Z" fill="#e9e2cf"/><path d="M22 24h20l-2 18H24Z" fill="${c}"/><path d="M22 24h20l-1 5H23Z" fill="#0003"/><path d="M27 24l10 15M37 24L27 39" stroke="#fffaf0" stroke-width="2"/><circle cx="32" cy="18" r="5.500" fill="#e2b48b"/><path d="M22 16q10-12 20 0-10-4-20 0Z" fill="#22262b"/><path d="M45 56V12l1.600-4 1.600 4v44Z" fill="#6b4526"/>`; },
  ruin: () => ring(54, 22) + `<path d="M12 54V28h7v26Zm16 0V24h7v30Zm16 0V32h7v22Z" fill="#cfc6ae"/><path d="M15.500 54V28H19v26Zm16 0V24H35v30Zm16 0V32H51v22Z" fill="#00000026"/><path d="M8 28l4-6h26l-2 6Z" fill="#ded6c0"/><path d="M38 54l4-5 5 5Zm-18 2 3-4 6 4Z" fill="#a89f88"/>`,
  wreck: () => `<path d="M8 46q20 10 48-2l-8 12q-18 5-32 0Z" fill="#6b4a30"/><path d="M20 46l8-28 4 2-7 28Zm16 0 12-20 3 2-10 18Z" fill="#4e3521"/><path d="M28 20q10 2 12 14l-9 2Z" fill="#e4dcc6" fill-opacity=".85"/><path d="M2 52q16 8 30 3t30 1" stroke="#eef8f2" stroke-opacity=".7" stroke-width="2" fill="none"/>`,
};
