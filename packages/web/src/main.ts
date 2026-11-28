/* The interface prototype: the map, the panels around it, and the real rules engine with test bots behind them. */
import { art, D, P } from './data.ts';
import { commit } from './flow.ts';
import { onCell } from './input.ts';
import { paint } from './paint.ts';
import { Board } from './map/board.ts';
import { Places } from './places.ts';
import { Pwa } from './pwa.ts';
import { Sim } from './sim.ts';
import { S, X } from './state.ts';
import { takeLaunched } from './ui/setup.ts';
import { Toast } from './ui/toasts.ts';
// Pictures that first appear when an agent is lifted or a screen opens, ready beforehand. Kept here, so they stay loaded.
const ready: HTMLImageElement[] = [];
setTimeout(() => { for (const u of [...Object.keys(D.buildings).map(art.building), ...D.salon.map(art.father), ...D.pier.map(([x]) => art.agent(x)), 'art/crate.webp', 'art/europe.webp', art.nation(P.nation)]) { const i = new Image(); i.src = u; i.decode?.().catch(() => {}); ready.push(i); } }, 400);
// The title screen opens first; the game behind it starts when the player leaves it.
// Started once the loading screen is up and turning (two frames), so the heavy start never holds it still; a timer stands in where a hidden tab gets no frames.
let started = false;
function start() {
  if (started) return;
  started = true;
  Board.open(onCell); paint(); void Board.land(true);
  // Names are fitted to the cards by measuring them, so measure again once the web fonts are in.
  void document.fonts?.ready.then(() => paint());
  // Installed: offline files, install and full screen in the settings, and a saved game opened from the system's files.
  Pwa.start(); document.addEventListener('pwa', () => paint()); takeLaunched();
}
requestAnimationFrame(() => requestAnimationFrame(start));
setTimeout(start, 300);
// For the browser console and the test scripts.
Object.assign(window, { Sim, S, X, Board, Places, Toast, Play: { commit }, paint });
