/* The living map behind the title screen: bots play a game of their own while the camera glides from colony to ship to village. */
import { D } from '../data.ts';
import { Board } from '../map/board.ts';
import { Sim } from '../sim.ts';

const STEP_MS = 650, MOVE_MS = 7000, HOLD_MS = 4500;
let tick: ReturnType<typeof setInterval> | null = null, frame = 0, opened = '';
/** The current camera move: from where, to where, when it began; `wide` for the view of the whole map. */
let move: { from: [number, number, number]; to: [number, number, number]; t0: number } | null = null, shots = 0, most: number | null = null;

/** Somewhere worth looking at: a colony, a ship at sea, a village. */
function sight(): number | null {
  const ships = D.players.map((p) => p.ship).filter((c): c is number => typeof c === 'number' && D.zone[c] !== 'europe');
  // Only inland of the outer rings, so that a close view never shows the edge of the board.
  const inner = (c: number) => { const W = D.width, x = c % W, y = Math.floor(c / W); return x > 3 && y > 3 && x < W - 4 && y < W - 4; };
  const l = [...D.colonies.map((c) => c.cell), ...ships, ...ships, ...D.settlements.filter((v) => v.alive && D.open[v.cell]).map((v) => v.cell)].filter(inner);
  return l.length ? l[Math.floor(Math.random() * l.length)] : null;
}
/** Where the camera should be to show cell `c` at zoom `z`, a little right of the middle, beside the menu. */
function aim(c: number, z: number): [number, number, number] {
  const st = Board.stage, was = st.get();
  st.set([was[0], was[1], z]); st.look(c);
  const [x, y] = st.get(); st.set(was);
  return [x + innerWidth * 0.1, y + innerHeight * 0.04, z];
}
/** The whole map, seen from high up. */
function wide(): [number, number, number] {
  // The middle of the board in the middle of the open water right of the menu, a little closer than the whole board.
  const st = Board.stage, was = st.get(), W = D.width, mid = Math.floor(W / 2) * W + Math.floor(W / 2);
  Board.fit(); const z = st.get()[2] * 1.24; st.set(was);
  const [x, y] = aim(mid, z);
  return [x + innerWidth * 0.13, y - innerHeight * 0.03, z];
}
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
/** One step of the bots' game: play until the next player's turn, then show it. */
function play() {
  if (!Sim.demo) return;
  let n = 0;
  do { if (!Sim.demoStep()) break; n++; } while (n < 300 && Sim.s.pending?.kind !== 'turn');
  if (Sim.s.over) { Sim.startDemo(); void Board.land(true); }
  Sim.refresh(); Board.draw();
  const seen = D.revealed.join('');
  if (seen !== opened) { opened = seen; void Board.land(); }
}
/** The camera: an eased glide to a sight, a slow drift while it stays there, then the next. Every fifth sight is the whole map. */
function glide(t: number) {
  frame = requestAnimationFrame(glide);
  if (!move || t - move.t0 > MOVE_MS + HOLD_MS) {
    // Close shots keep the same size on screen at any window size, as the board's home view does, short of where the terrain blurs.
    const near = Math.min(3, (2.2 + Math.random() * 0.5) * Math.min(innerWidth / 1600, innerHeight / 900)), from = Board.stage.get();
    let next = shots++ % 5 === 0 ? null : (() => {
      // Somewhere visibly elsewhere: a sight next to the last one would make a glide of a few pixels.
      let best: [number, number, number] | null = null, far = -1;
      for (let i = 0; i < 12; i++) {
        const c = sight(); if (c === null) break;
        const to = aim(c, near), d = Math.hypot(to[0] - from[0], to[1] - from[1]);
        if (d > far) { best = to; far = d; }
        if (d > innerWidth / 3) break;
      }
      return best;
    })();
    next ??= wide();
    move = { from, to: next, t0: t };
  }
  const k = Math.min(1, (t - move.t0) / MOVE_MS), e = ease(k), drift = Math.max(0, (t - move.t0 - MOVE_MS) / 1000) * 6;
  const [a, b, z] = move.from, [x, y, w] = move.to;
  Board.stage.set([a + (x - a) * e - drift, b + (y - b) * e, z + (w - z) * e]);
}
/** Start the bots' game and the camera, if they are not running. */
export function startAttract() {
  if (tick) return;
  // The player's game is already saved at each of their decisions; the bots' game is never saved.
  if (!Sim.demo) { Sim.startDemo(); opened = D.revealed.join(''); void Board.land(true); }
  move = null; shots = 0;
  // A flatter view than in play, so the horizon stays on the water.
  most = Board.view.most; Board.view.most = 42;
  tick = setInterval(play, STEP_MS);
  frame = requestAnimationFrame(glide);
}
export function stopAttract() {
  if (tick) clearInterval(tick);
  cancelAnimationFrame(frame);
  tick = null; move = null;
  if (most !== null) { Board.view.most = most; most = null; Board.look(); }
}
