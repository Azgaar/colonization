/* The living map behind the title screen: bots play a game of their own under a still camera, one chosen view of one chosen map. */
import { D } from '../data.ts';
import { Board } from '../map/board.ts';
import { Sim } from '../sim.ts';

/** The title screen's game and view: its seed and nations, the map point (in map units) shown right of the menu, and the zoom, in times the whole board's. */
export const TITLE = { seed: 'meridian', nations: ['french', 'english', 'spanish', 'dutch'], at: [480, 512] as [number, number], zoom: 2.1 };
const STEP_MS = 650;
/** Where on the screen the chosen point stands: right of the menu, a little below the middle. */
const SPOT: [number, number] = [0.62, 0.52];
let tick: ReturnType<typeof setInterval> | null = null, opened = '', most: number | null = null;

/** Put the camera on the title view. It does not move after that: only a new window size frames it again. */
function frame() {
  const st = Board.stage, was = st.get();
  Board.fit(); const z = st.get()[2] * TITLE.zoom; st.set(was);
  st.set([innerWidth * SPOT[0] - TITLE.at[0] * z, innerHeight * SPOT[1] - TITLE.at[1] * z, z]);
}
/** One step of the bots' game: play until the next player's turn, then show it. The same seed plays the same game again when it ends. */
function play() {
  if (!Sim.demo) return;
  let n = 0;
  do { if (!Sim.demoStep()) break; n++; } while (n < 300 && Sim.s.pending?.kind !== 'turn');
  // The same seed again: the same map, so the picture already painted stays.
  if (Sim.s.over) { Sim.startDemo(TITLE.seed, TITLE.nations); void Board.land(); }
  Sim.refresh(); Board.draw();
  const seen = D.revealed.join('');
  if (seen !== opened) { opened = seen; void Board.land(); }
}
/** Start the bots' game and the camera, if they are not running. */
export function startAttract() {
  if (tick) return;
  // The player's game is already saved at each of their decisions; the bots' game is never saved.
  if (!Sim.demo) { Sim.startDemo(TITLE.seed, TITLE.nations); opened = D.revealed.join(''); void Board.land(true); }
  // A flatter view than in play, so the horizon stays on the water.
  most = Board.view.most; Board.view.most = 42;
  frame();
  addEventListener('resize', frame);
  tick = setInterval(play, STEP_MS);
}
export function stopAttract() {
  if (tick) clearInterval(tick);
  removeEventListener('resize', frame);
  tick = null;
  if (most !== null) { Board.view.most = most; most = null; Board.look(); }
}
