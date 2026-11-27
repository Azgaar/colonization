import type { Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Choice, Move, State } from './types.ts';
import { always, ask, decision, log, push, task } from './core.ts';
import { cardHas, coloniesOf, holdFree, holdUsed, mods, stockKinds, total, turnOrder, warehouseCap } from './util.ts';
import { adjacent, canInfantryEnter, canShipEnter, enterCost, explorable, inEurope, nb, reveal } from './map.ts';

/** One move action: its points are shared by the ship and the pawn, in any order. `token` is the one moving now; 'switch' hands the points left to the other. */
export function startMove(s: State, p: number, token: 'ship' | 'infantry', card: string) {
  const points = mods(s, p, 'move', card).reduce((n, m) => n + m.add, s.def.settings.move.points);
  s.move = { player: p, token, points, ended: false, scout: cardHas(s, card, 'ignoreSkull'), card };
  log(s, { e: 'move', p, token, points });
  push(s, { t: 'moveLoop' });
}

const nextToOwnColony = (s: State, p: number, cell: number) => coloniesOf(s, p).some((c) => adjacent(s, c.cell, cell));

export function moveOptions(s: State, m: Move): Choice[] {
  const out = tokenOptions(s, m, m.token), other = m.token === 'ship' ? 'infantry' : 'ship';
  if (!m.switched && canGoOn(s, m.player, other) && tokenOptions(s, m, other).length) out.push({ c: 'switch' });
  out.push({ c: 'end' });
  return out;
}

/** Whether the other token can take over the points: an undamaged ship, or a pawn on land (a pawn aboard lands from the ship's options). */
const canGoOn = (s: State, p: number, token: 'ship' | 'infantry') => (token === 'ship' ? s.players[p].damage === 0 : typeof s.players[p].inf === 'number');

/** The token that was moving cannot go on (sent to Europe, damaged): the other one takes the points left, or the move ends. */
export function tokenStops(s: State, p: number, token: 'ship' | 'infantry') {
  const m = s.move;
  if (!m || m.player !== p || m.token !== token) return;
  const other = token === 'ship' ? 'infantry' : 'ship';
  if (canGoOn(s, p, other)) { m.token = other; m.switched = false; } else m.ended = true;
}

function tokenOptions(s: State, m: Move, token: 'ship' | 'infantry'): Choice[] {
  const pl = s.players[m.player], set = s.def.settings.move, out: Choice[] = [];
  // Landing and boarding are plain moves: the pawn enters the target cell (land, or the ship's cell) and pays its cost.
  const disembark = () => {
    if (pl.inf === 'ship')
      for (const c of nb(s, pl.ship)) if (canInfantryEnter(s, m.player, c) && enterCost(s, c, m.points) !== null) out.push({ c: 'disembark', cell: c });
  };
  const canBoard = holdFree(s, m.player) > 0 && enterCost(s, pl.ship, m.points) !== null;
  if (token === 'ship') {
    if (pl.damage === 0) for (const c of nb(s, pl.ship)) if (canShipEnter(s, c) && (enterCost(s, c, m.points) ?? Infinity) <= m.points) out.push({ c: 'step', cell: c });
    if (m.points >= set.explore) for (const f of explorable(s, pl.ship)) out.push({ c: 'explore', frag: f });
    disembark();
    if (canBoard && pl.inf !== 'ship' &&
      (pl.inf === 'europe' ? inEurope(s, pl.ship) : adjacent(s, pl.inf, pl.ship))) out.push({ c: 'embark' });
    if (m.points >= set.cargo && total(pl.hold) + total(pl.wh) > 0 && nextToOwnColony(s, m.player, pl.ship) &&
      (total(pl.hold) > 0 || holdFree(s, m.player) > 0)) out.push({ c: 'cargo' });
  } else if (pl.inf === 'ship') disembark();
  else if (typeof pl.inf === 'number') {
    for (const c of nb(s, pl.inf)) if (canInfantryEnter(s, m.player, c) && enterCost(s, c, m.points) !== null) out.push({ c: 'step', cell: c });
    if (m.points >= set.explore) for (const f of explorable(s, pl.inf)) out.push({ c: 'explore', frag: f });
    if (canBoard && adjacent(s, pl.inf, pl.ship)) out.push({ c: 'embark' });
  }
  return out;
}

/** Whether a move action would allow anything at all. */
export function canMove(s: State, p: number, token: 'ship' | 'infantry'): string | null {
  const pl = s.players[p];
  if (token === 'ship' && pl.damage > 0) return 'the ship is damaged';
  if (token === 'infantry' && pl.inf === 'europe') return 'the infantry waits in Europe for the ship';
  const probe: Move = { player: p, token, points: s.def.settings.move.points, ended: false, scout: false, card: '' };
  return moveOptions(s, probe).length > 1 ? null : 'there is nowhere to go';
}

task('moveLoop', (s) => {
  if (!s.move || s.move.ended) { s.move = null; return; }
  ask(s, { kind: 'move', player: s.move.player });
});

decision('move', {
  options: (s) => moveOptions(s, s.move!),
  resolve(s, d, c) {
    const m = s.move!, pl = s.players[d.player], set = s.def.settings.move;
    if (c.c === 'end') { s.move = null; return; }
    push(s, { t: 'moveLoop' });
    m.switched = c.c === 'switch';
    switch (c.c) {
      case 'switch':
        m.token = m.token === 'ship' ? 'infantry' : 'ship';
        log(s, { e: 'switch', p: d.player, token: m.token });
        break;
      case 'step':
        m.points -= enterCost(s, c.cell, m.points)!;
        arrive(s, m, c.cell);
        break;
      case 'explore':
        m.points -= set.explore;
        reveal(s, c.frag, d.player);
        break;
      case 'disembark':
        m.points -= enterCost(s, c.cell, m.points)!;
        m.token = 'infantry';
        arrive(s, m, c.cell);
        break;
      case 'embark':
        m.points -= enterCost(s, pl.ship, m.points)!;
        pl.inf = 'ship';
        m.token = 'ship';
        log(s, { e: 'embark', p: d.player });
        if (pl.damage > 0) m.ended = true;
        break;
      case 'cargo':
        if (s.def.settings.cargo.costPer === 'operation') m.points -= set.cargo;
        push(s, { t: 'cargo', p: d.player, done: [] });
        break;
    }
  },
});

function arrive(s: State, m: Move, cell: number) {
  const pl = s.players[m.player];
  if (m.token === 'ship') pl.ship = cell; else pl.inf = cell;
  log(s, { e: 'step', p: m.player, token: m.token, cell });
  const poi = s.poi[cell];
  if (poi === (m.token === 'ship' ? 'wreck' : 'ruin')) {
    delete s.poi[cell];
    push(s, { t: 'poi', p: m.player, deck: poi });
  }
}

task('cargo', (s, t) => ask(s, { kind: 'cargo', player: t.p, done: t.done }));
decision('cargo', {
  options(s, d) {
    const pl = s.players[d.player], out: Choice[] = [];
    const unit = s.def.settings.cargo.costPer === 'unit';
    const pts = unit ? Math.floor(s.move!.points / s.def.settings.move.cargo) : Infinity;
    const free = holdFree(s, d.player);
    for (const r of RESOURCES) {
      if (!d.done.includes(`un${r}`)) for (let n = 1; n <= Math.min(pl.hold[r], pts); n++) out.push({ c: 'unload', r, n });
      if (!d.done.includes(r)) for (let n = 1; n <= Math.min(pl.wh[r], free, pts); n++) out.push({ c: 'load', r, n });
    }
    out.push({ c: 'done' });
    return out;
  },
  resolve(s, d, c) {
    if (c.c === 'done') return;
    const pl = s.players[d.player], r = c.r as Resource, sign = c.c === 'load' ? 1 : -1;
    pl.hold[r] += sign * c.n;
    pl.wh[r] -= sign * c.n;
    if (s.def.settings.cargo.costPer === 'unit') s.move!.points -= c.n * s.def.settings.move.cargo;
    log(s, { e: c.c, p: d.player, r, n: c.n });
    // Each resource is handled once per operation, so loading and unloading cannot loop.
    push(s, { t: 'cargo', p: d.player, done: [...d.done, r, `un${r}`] });
  },
});

// Discarding what does not fit. The warehouse never holds more than its limit (DD-71): the moment it does, its owner discards the excess, by choice, before anything else happens.
always.push((s) => {
  if (!s.players) return false;
  for (const p of turnOrder(s)) if (total(s.players[p].wh) > warehouseCap(s, p)) { ask(s, { kind: 'overflow', player: p, from: 'wh' }); return true; }
  return false;
});
task('overflow', (s, t) => {
  const pl = s.players[t.p];
  const over = t.from === 'hold' ? holdUsed(pl) - s.def.settings.hold.size : total(pl.wh) - warehouseCap(s, t.p);
  if (over > 0 && (t.from === 'wh' || total(pl.hold) > 0)) ask(s, { kind: 'overflow', player: t.p, from: t.from });
});
decision('overflow', {
  options: (s, d) => stockKinds(s.players[d.player][d.from as 'wh' | 'hold']).map((r) => ({ c: 'discard', r })),
  resolve(s, d, c) {
    s.players[d.player][d.from as 'wh' | 'hold'][c.r as Resource]--;
    log(s, { e: 'overflow', p: d.player, r: c.r });
    push(s, { t: 'overflow', p: d.player, from: d.from });
  },
});
