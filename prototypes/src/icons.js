/* Small flat pictograms and nation emblems, drawn as SVG. */
import { art, D } from './data.js';

/* Small pictograms, drawn once, coloured by CSS custom properties where a design wants to. */
export const SHAPES = {
  food: '<path d="M12 2c4 3 5 8 3 14l-3 6-3-6C7 10 8 5 12 2Z" fill="#f2c230"/><path d="M12 22c-5-1-8-5-8-10 4 1 7 4 8 10Zm0 0c5-1 8-5 8-10-4 1-7 4-8 10Z" fill="#6d9b3a"/><path d="M12 5v10M10 8h4M9.6 11h4.8" stroke="#b98a12" stroke-width="1.1"/>',
  fish: '<path d="M3 12c4-6 11-6 15-1l4-4v10l-4-4c-4 5-11 5-15-1Z" fill="#5c93bd"/><circle cx="8" cy="11" r="1.2" fill="#12324a"/>',
  timber: '<rect x="2" y="13" width="20" height="7" rx="3.5" fill="#8a5a33"/><rect x="5" y="5" width="17" height="7" rx="3.5" fill="#a06c40"/><circle cx="5.5" cy="16.5" r="2.3" fill="#d9ae7c"/><circle cx="8.5" cy="8.5" r="2.3" fill="#e3bd8f"/>',
  crops: '<path d="M4 20C4 9 10 3 20 3c1 10-4 16-13 16" fill="#4f9a45"/><path d="M3 21 15 9" stroke="#2d6a2e" stroke-width="1.6"/>',
  fur: '<path d="M4 15c0-6 4-9 9-9 4 0 7 3 7 7 0 5-4 7-8 7-5 0-8-2-8-5Z" fill="#7d5535"/><circle cx="16" cy="11" r="1.1" fill="#1d120a"/><path d="M4 16c-2 1-2 4 0 4l5-1" fill="#5d3d25"/>',
  goods: '<path d="M3 7l9-4 9 4v10l-9 4-9-4Z" fill="#3f86c6"/><path d="M3 7l9 4 9-4M12 11v10" stroke="#1f4e7d" stroke-width="1.4" fill="none"/>',
  silver: '<path d="M5 8h14l3 10H2Z" fill="#c3c9cf"/><path d="M5 8h14l1 3H4Z" fill="#eef1f3"/>',
  gold: '<circle cx="12" cy="12" r="9" fill="#e8b923"/><circle cx="12" cy="12" r="6" fill="none" stroke="#a97c0b" stroke-width="1.5"/>',
  bells: '<path d="M12 3c5 0 6 4 6 8l2 6H4l2-6c0-4 1-8 6-8Z" fill="#d79a2b"/><rect x="3" y="16.5" width="18" height="2.4" rx="1.2" fill="#a86f13"/><circle cx="12" cy="20.6" r="1.8" fill="#a86f13"/>',
  crosses: '<path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6Z" fill="#a673d6"/>',
  ref: '<path d="M3 8l4.500 4L12 4l4.500 8L21 8l-2 9H5Z" fill="#d9a05b"/><path d="M5 18.500h14v2.700H5Z" fill="#b97b34"/><circle cx="3" cy="7" r="1.700" fill="#d9a05b"/><circle cx="21" cy="7" r="1.700" fill="#d9a05b"/><circle cx="12" cy="3.300" r="1.900" fill="#c8553f"/>',
  sword: '<path d="M22.500 1.500l-.8 5L11 17.200l-4.200-4.200L17.500 2.300Z" fill="currentColor"/><path d="M4.800 9.800l9.400 9.400-2 2-9.400-9.400Z" fill="currentColor"/><path d="M6.500 15.500l2 2-3.300 3.300a2.300 2.300 0 1 1-2-2Z" fill="currentColor"/>',
  anger: '<path d="M12 2l2.4 6L20 6l-2 5 5 2-5 2 2 5-5.6-2L12 23l-2.4-5L4 20l2-5-5-2 5-2-2-5 5.600 2Z" fill="#c8442f"/>',
  people: '<circle cx="8" cy="8" r="3.4" fill="currentColor"/><circle cx="16.500" cy="9" r="2.800" fill="currentColor"/><path d="M2 20c0-5 3-7 6-7s6 2 6 7Zm11.500 0c0-2-.4-4-1.500-5.500 1-.800 2.500-1.200 4.500-1.200 3 0 5.500 2 5.500 6.700Z" fill="currentColor"/>',
  house: '<path d="M12 2.500 22 11h-3v10.500h-5V15h-4v6.500H5V11H2Z" fill="currentColor"/>', father: '<circle cx="12" cy="7.200" r="4.700" fill="currentColor"/><path d="M3 22c0-6 4-9.500 9-9.500s9 3.500 9 9.500Z" fill="currentColor"/><path d="M10 13l2 4 2-4" fill="#0000" stroke="#0f3436" stroke-width="1.300"/>',
  move: '<path d="M2.500 8.200h9.700a2.700 2.700 0 1 0-2.500-3.700M2.500 12.400h15.700a3 3 0 1 0-2.800-4.100M2.500 16.600h11.200a2.700 2.700 0 1 1-2.500 3.700" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round"/>', book: '<path d="M3 5c4-1.500 7-1 9 1 2-2 5-2.500 9-1v14c-4-1.500-7-1-9 1-2-2-5-2.500-9-1Z" fill="currentColor"/>', cap: '<path d="M12 4 1 9l11 5 9-4.100V17h2V9Z" fill="currentColor"/><path d="M5 12.500V17c2 2 5 3 7 3s5-1 7-3v-4.500l-7 3.200Z" fill="currentColor"/>', bar: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.500"/><path d="M6 18 18 6" stroke="currentColor" stroke-width="2.500"/>',
};
export const icon = (n, size = 18) => `<svg class="ic ic-${n}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${SHAPES[n] || ''}</svg>`;
export const eduIcon = (e) => icon(['bar', 'book', 'cap'][e], 16);
/* Cloth texture and shadow for nation emblems: white charge on the nation's colour. */
export const DEFS = '<defs><radialGradient id="gloss" cx=".35" cy=".25" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".4" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient><linearGradient id="billow"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient><pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 .5H4M0 2.5H4" stroke="#fff" stroke-opacity=".1"/><path d="M.5 0V4M2.5 0V4" stroke="#000" stroke-opacity=".13"/></pattern><filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="#000" flood-opacity=".55"/></filter></defs>';
export const roundel = (x, y, p, s, r = s / 2) => `<g><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${D.players[p].color}"/><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="url(#weave)" stroke="#fff" stroke-width="${Math.max(1.5, s / 14)}"/><image filter="url(#lift)" href="${art.emblem(D.players[p].nation)}" x="${x + s * 0.14}" y="${y + s * 0.14}" width="${s * 0.72}" height="${s * 0.72}"/></g>`;
