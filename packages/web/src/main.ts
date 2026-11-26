/* The interface prototype: the map, the panels around it, and the real rules engine with test bots behind them. */
import { art, D, P } from './data.ts';
import { commit, settle } from './flow.ts';
import { onCell } from './input.ts';
import { paint } from './paint.ts';
import { Board } from './map/board.ts';
import { Places } from './places.ts';
import { Sim } from './sim.ts';
import { S, X } from './state.ts';
import { Toast } from './ui/toasts.ts';
// Pictures that first appear when an agent is lifted or a screen opens, ready beforehand. Kept here, so they stay loaded.
const ready: HTMLImageElement[] = [];
setTimeout(() => { for (const u of [...Object.keys(D.buildings).map(art.building), ...D.salon.map(art.father), ...D.pier.map(([x]) => art.agent(x)), 'art/crate.webp', 'art/europe.webp', art.nation(P.nation)]) { const i = new Image(); i.src = u; i.decode?.().catch(() => {}); ready.push(i); } }, 400);
// Names are fitted to the cards by measuring them, so measure again once the web fonts are in.
document.fonts?.ready.then(() => paint());
Board.open(onCell); paint(); Board.land(true); settle();
// For the browser console and the test scripts.
Object.assign(window, { Sim, S, X, Board, Places, Toast, Play: { commit }, paint });
