import type { Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Choice, Move, State } from './types.ts';
import { ask, decision, log, push, task } from './core.ts';
import { cardHas, coloniesOf, holdFree, holdUsed, mods, stockKinds, total, warehouseCap } from './util.ts';
import { adjacent, canInfantryEnter, canShipEnter, enterCost, explorable, inEurope, nb, reveal } from './map.ts';

export function startMove(s: State, p: number, token: 'ship' | 'infantry', card: string) {
  const points = mods(s, p, 'move', card).filter((m) => m.token === token).reduce((n, m) => n + m.add, s.def.settings.move.points);
  s.move = { player: p, token, points, ended: false, scout: cardHas(s, card, 'ignoreSkull'), card };
  log(s, { e: 'move', p, token, points });
  push(s, { t: 'moveLoop' });
}

const nextToOwnColony = (s: State, p: number, cell: number) => coloniesOf(s, p).some((c) => adjacent(s, c.cell, cell));

export function moveOptions(s: State, m: Move): Choice[] {
  const pl = s.players[m.player], set = s.def.settings.move, out: Choice[] = [];
  const disembark = () => {
    if (pl.inf === 'ship' && m.points >= set.embark)
      for (const c of nb(s, pl.ship)) if (canInfantryEnter(s, m.player, c)) out.push({ c: 'disembark', cell: c });
  };
  if (m.token === 'ship') {
    if (pl.damage === 0) for (const c of nb(s, pl.ship)) if (canShipEnter(s, c) && (enterCost(s, c, m.points) ?? Infinity) <= m.points) out.push({ c: 'step', cell: c });
    if (m.points >= set.explore) for (const f of explorable(s, pl.ship)) out.push({ c: 'explore', frag: f });
    disembark();
    if (m.points >= set.embark && pl.inf !== 'ship' && holdFree(s, m.player) > 0 &&
      (pl.inf === 'europe' ? inEurope(s, pl.ship) : adjacent(s, pl.inf, pl.ship))) out.push({ c: 'embark' });
    if (m.points >= set.cargo && total(pl.hold) + total(pl.wh) > 0 && nextToOwnColony(s, m.player, pl.ship) &&
      (total(pl.hold) > 0 || holdFree(s, m.player) > 0)) out.push({ c: 'cargo' });
  } else if (pl.inf === 'ship') disembark();
  else if (typeof pl.inf === 'number') {
    for (const c of nb(s, pl.inf)) if (canInfantryEnter(s, m.player, c) && enterCost(s, c, m.points) !== null) out.push({ c: 'step', cell: c });
    if (m.points >= set.explore) for (const f of explorable(s, pl.inf)) out.push({ c: 'explore', frag: f });
    if (m.points >= set.embark && adjacent(s, pl.inf, pl.ship) && holdFree(s, m.player) > 0) out.push({ c: 'embark' });
  }
  out.push({ c: 'end' });
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
    switch (c.c) {
      case 'step':
        m.points -= enterCost(s, c.cell, m.points)!;
        arrive(s, m, c.cell);
        break;
      case 'explore':
        m.points -= set.explore;
        reveal(s, c.frag, d.player);
        break;
      case 'disembark':
        m.points -= set.embark;
        m.token = 'infantry';
        arrive(s, m, c.cell);
        break;
      case 'embark':
        m.points -= set.embark;
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

// Discarding what does not fit.
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
