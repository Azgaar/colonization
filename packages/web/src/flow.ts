/* The flow of the game: the player's choices go to the engine, then the others play until it is the player's turn again. */
import type { Choice } from '@col/engine';
import { doing } from './ui/news.ts';
import { art, D, P, RES, showSeat, W } from './data.ts';
import { bub } from './input.ts';
import { Board } from './map/board.ts';
import { paint } from './paint.ts';
import { Places } from './places.ts';
import { Sim, type Entry, type Opt } from './sim.ts';
import { S, U, X } from './state.ts';
import { paintStep } from './ui/decisions.ts';
import { report } from './ui/reports.ts';
import { Toast } from './ui/toasts.ts';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** The fields of an option that the engine takes with each action. */
const KEEP: Record<string, string[]> = { produce: ['cell', 'icon'], docks: ['cell'], work: ['building'], build: ['building'], customs: ['r'], smuggle: ['r'], exchange: ['other'], teach: ['target'], attack: ['token', 'mode', 'cell'], gift: ['settlement'], preach: ['settlement'], alliance: ['settlement'] };
const clean = (o: Opt): Choice => { const keep = KEEP[o.a] || []; return { c: 'play', card: o.card, a: o.a, ...Object.fromEntries(keep.map((k) => [k, o[k]])) }; };
export async function commit(o: Opt, space: string) {
  if (Sim.busy) return;
  Sim.mark(); S.card = S.over = S.pickAt = null; U.peek = null; bub().hidden = true;
  Sim.placed.push({ card: o.card, space: o.path ? `cell:${o.cell}` : space });
  Sim.apply(clean(o));
  if (o.a === 'hire') Sim.apply(o.refresh ? { c: 'refresh' } : { c: 'buy', agent: o.agent });
  if (o.a === 'propaganda' && o.father) Sim.apply({ c: 'take', father: o.father });
  if (o.a === 'trade' && o.all) sellAll();
  if (o.path) return go(o.path, true);
  return settle();
}
function sellAll() { while (Sim.kind() === 'trade') { const l: Opt[] = Sim.legal().filter((c) => c.c === 'sell'); if (!Sim.apply(l.length ? l.reduce((a, b) => (b.r === l[0].r && b.n > a.n ? b : a), l[0]) : { c: 'done' })) break; } }
/** Walk the token along a way, one cell at a time. */
export async function go(path: number[], first = false) {
  for (const c of path) {
    if (Sim.kind() !== 'move') break;
    const s = Sim.legal().find((x) => (x.c === 'step' || x.c === 'disembark') && x.cell === c);
    if (!s) break;
    if (!Sim.apply(s)) break;
    Sim.refresh(); Places.forget(); Board.draw(); await wait(110);
  }
  // Nothing else to do there: the move is over.
  if (first && path.length && Sim.kind() === 'move' && !Sim.legal().some((c) => ['cargo', 'embark', 'disembark', 'explore'].includes(c.c))) Sim.apply({ c: 'end' });
  return settle();
}
export async function act(c: Choice) { if (!['move', 'cargo'].includes(Sim.kind() ?? '')) Sim.mark(); Sim.apply(c); return settle(); }
/** After any choice: show what happened, and let the others play until it is our decision again. */
/** Hot-seat: the person whose decision it is takes the screen. Hands are no secret between people at one table; bots still see only their own. */
const take = () => { const p = Sim.waiting(); if (p !== null) showSeat(p); };
export async function settle() {
  take();
  const round = D.round;
  // Nothing left to choose: go on.
  while (['hire', 'propaganda'].includes(Sim.kind() ?? '')) { const l = Sim.legal(); if (!(l.length === 1 && l[0].c === 'done' && Sim.apply(l[0]))) break; }
  Sim.refresh(); report(Sim.news());
  const pass = () => { if (D.round !== round) Sim.placed.splice(0); paint(); Board.land(); };
  pass();
  if (X.reports.length && !Sim.mine() && !D.over) return; // read first, the others wait
  if (!Sim.mine() && !D.over && Sim.waiting() === null) { const run = Sim.run(note); paint(); await run; take(); report(Sim.news()); pass(); }
  if (D.over && S.war < 0 && !X.reports.length) { S.war = 0; S.view = 'map'; focus(); paint(); }
  // Saved at every decision of the player, so a reload goes on from here.
  Sim.keep();
}
/** A turn of another player. */
function note(p: number, l: Entry[]) {
  const play = l.find((x) => x.e === 'play'), line = doing(p, l);
  // Passing tells the others nothing.
  if (line) Toast.add({ who: p, pic: play ? art.agent(play.card) : '', html: `<b>${Places.name(p)}</b>${line}` });
  report(l.filter((x) => x.e === 'combat' || x.e === 'attack')); Sim.seen(l);
  paint(); Board.land();
}
export const focus = () => { const x = D.war?.sieges[S.war]; if (x) Board.stage.look(x.cell + W); };
export function read() { X.reports.shift()?.after?.(); if (X.reports.length) return paint(); if (!Sim.mine() && !D.over) return settle(); if (D.over && S.war < 0) { S.war = 0; S.view = 'map'; focus(); } paint(); }
export function cargo(to: string, r: string) {
  const c = X.cargo; if (!c) return;
  if (to === 'ok') {
    const diff = Object.fromEntries(RES.map((k) => [k, c.hold[k] - c.was[k]]));
    for (const k of RES) if (diff[k] < 0 && Sim.kind() === 'cargo') Sim.apply({ c: 'unload', r: k, n: -diff[k] });
    for (const k of RES) if (diff[k] > 0 && Sim.kind() === 'cargo') Sim.apply({ c: 'load', r: k, n: diff[k] });
    if (Sim.kind() === 'cargo') Sim.apply({ c: 'done' });
    X.cargo = null; return settle();
  }
  const room = () => 4 - Places.sum(c.hold) - P.damage - (P.inf === 'ship' ? 1 : 0), move = (k: string, a: 'wh' | 'hold', b: 'wh' | 'hold') => { c[a][k]--; c[b][k]++; };
  if (to === 'none') for (const k of RES) while (c.hold[k]) move(k, 'hold', 'wh');
  else if (to === 'all') { for (const k of RES.slice().sort((a, b) => D.price[b] - D.price[a])) while (c.wh[k] && room() > 0) move(k, 'wh', 'hold'); }
  else if (to === 'hold') { if (room() > 0) move(r, 'wh', 'hold'); } else move(r, 'hold', 'wh');
  paintStep();
}
