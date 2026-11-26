/* The interface prototype: the map, the panels around it, and the real rules engine with test bots behind them. */
import { art, D, P } from './data.js';
import { commit, settle } from './flow.js';
import { onCell } from './input.js';
import { paint } from './paint.js';
import { Board } from './map/board.js';
import { Places } from './places.js';
import { Sim } from './sim.js';
import { S, X } from './state.js';
import { Toast } from './ui/toasts.js';
// Pictures that first appear when an agent is lifted or a screen opens, ready beforehand.
setTimeout(() => { for (const u of [...Object.keys(D.buildings).map(art.building), ...D.salon.map(art.father), ...D.pier.map(([x]) => art.agent(x)), 'art/crate.webp', 'art/europe.webp', art.nation(P.nation)]) { const i = new Image(); i.src = u; i.decode?.().catch(() => {}); (window.ready ||= []).push(i); } }, 400);
Board.open(onCell); paint(); Board.land(true); settle();
// For the browser console and the test scripts.
Object.assign(window, { Sim, S, X, Board, Places, Toast, Play: { commit }, paint });
