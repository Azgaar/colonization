/* The tutorial (FR-U-20): part of every new game until the player turns it off (in Options, or by ending it). A coach gives one step at a time to seat 0,
 * points at what to use, and moves on by itself once the game shows the step done. Every step can be skipped; the game itself is an ordinary one. */
import type { State } from '@col/engine';
import { refuseCubes } from '@col/engine';
import { $, D, me, msg, pick, t, type Text } from '../data.ts';
import { icon } from '../icons.ts';
import { paint } from '../paint.ts';
import { Sim } from '../sim.ts';
import { U } from '../state.ts';
import { keepOptions, Options } from '../options.ts';
import { esc } from './md.ts';

/** A step: what to read (HTML: it may carry icons), what to point at, and when it is done (no test: the player moves on with Next). */
interface Step { title: Text; text: Text; done?: (s: State) => boolean; hi?: string }
const mine = (s: State, e: string) => s.log.some((x) => x.e === e && x.p === 0);
/** The steps for this game: its nation, solo or not, and the numbers of the rules being played. */
function steps(): Step[] {
  const s = D.settings, sc = s.score, ic = (n: string) => icon(n, 17), m = s.move, solo = Sim.s.players.length === 1;
  const nation = D.names.nations[Sim.s.players[0].nation] ?? ['', ''], rr = refuseCubes(Sim.s);
  return [
    { title: msg('tutorial.welcome_governor'), text: msg('tutorial.welcome', { nation: pick(nation), goal: solo ? t('tutorial.goal_solo') : t('tutorial.goal_vp', { vp: ic('vp') }) }) },
    { title: msg('tutorial.start'), text: msg('tutorial.outlined_edge'), done: (x) => x.players[0].ship >= 0 },
    { title: msg('hand'), text: msg('tutorial.agents', { others: solo ? '' : t('tutorial.others') }), hi: '#hand .card' },
    { title: msg('tutorial.talents'), text: msg('tutorial.icons_top', { move: ic('move'), ship: ic('ship'), food: ic('food'), power: ic('power') }), hi: '#hand .card' },
    { title: msg('tutorial.sail_explore'), text: msg('tutorial.drop_agent', { points: m.points }), done: (x) => mine(x, 'reveal'), hi: '#hand .card' },
    { title: msg('tutorial.found_colony'), text: msg('tutorial.infantry_rides', { pawn: ic('pawn') }), done: (x) => x.colonies.some((c) => c.owner === 0) },
    { title: msg('tutorial.gather'), text: msg('tutorial.colony_works', { food: ic('food'), timber: ic('timber'), crops: ic('crops'), silver: ic('silver'), base: s.warehouse.base }), done: (x) => mine(x, 'produce') },
    { title: msg('tutorial.colony_europe'), text: msg('tutorial.round_buttons', { timber: ic('timber') }), hi: '.door' },
    { title: msg('tutorial.natives'), text: msg('tutorial.native_villages', { crosses: ic('crosses'), anger: ic('hostility'), maxHostility: s.natives.maxHostility }) },
    { title: msg('tutorial.end_round'), text: msg('tutorial.done_want', { size: s.hand.size }), done: (x) => x.round >= 2, hi: '.acts .pass' },
    { title: msg('tutorial.king_s'), text: msg('tutorial.tax', { gold: ic('gold'), pay: s.tax.payBells ? t('tutorial.tax_pay', { n: s.tax.payBells, bells: ic('bells') }) : '', bells: s.tax.refuseBells ? t('tutorial.tax_bells', { n: s.tax.refuseBells, bells: ic('bells') }) : '', n: rr, king: ic('king') }), done: (x) => mine(x, 'tax'), hi: '.king' },
    { title: msg('guide.war_independence'), text: msg('tutorial.war', { who: t(solo ? 'tutorial.you_reach' : 'tutorial.someone_reaches'), n: s.war.bells, bells: ic('bells'), max: s.rounds.max, loyalist: solo || s.war.loyalistFrom > Sim.s.players.length ? '' : t('tutorial.loyalist'), king: ic('king'), whose: t(solo ? 'tutorial.your_colonies' : 'tutorial.their_colonies'), power: ic('power') }), hi: '.king' },
    { title: msg('tutorial.win'), text: msg('tutorial.score', { rule: t(solo ? 'tutorial.rule_solo' : 'tutorial.rule'), vp: ic('vp'), colony: sc.patriotColony, bell: sc.perBell, bpp: sc.bellsPerPoint, bells: ic('bells'), building: sc.building, father: sc.father, per: sc.goldPerPoint, gold: ic('gold'), agents: sc.agentsPerPoint, ally: solo || s.war.loyalistFrom > Sim.s.players.length ? '' : t('tutorial.ally', { n: sc.loyalistColony }) }), hi: '#court' },
    { title: msg('tutorial.over'), text: msg('tutorial.know_enough') },
  ];
}
const KEY = 'tutorial';
/** The step shown, kept in the browser with the game, so Continue goes on where the tutorial was. */
const at = () => Math.min(steps().length, Number(localStorage.getItem(KEY) ?? 0));
const go = (n: number) => localStorage.setItem(KEY, String(n));
/** Shown to seat 0 only: in a hot-seat game the others see the table without it. */
const on = () => tutorialOn() && !Sim.replay && !Sim.demo && !U.title && me === 0 && at() < steps().length;

/** Whether the tutorial is on: until the player turns it off. Turned on again, it starts over in the game being played. */
export const tutorialOn = () => Options.tutorial;
export function setTutorial(x: boolean) { Options.tutorial = x; keepOptions(); if (x) go(0); }
/** A new game: the tutorial from its first step. */
export const coachFromStart = () => go(0);

export function coach() {
  const el = $('coach');
  document.querySelectorAll('.coach-hi').forEach((x) => x.classList.remove('coach-hi'));
  if (!on()) { el.hidden = true; return; }
  // Steps already done (by playing ahead) are passed over.
  const list = steps();
  let n = at();
  while (n < list.length && list[n].done?.(Sim.s)) n++;
  if (n !== at()) go(n);
  if (n >= list.length) { el.hidden = true; return; }
  const st = list[n], last = n === list.length - 1;
  el.hidden = false;
  el.innerHTML = `<small>${t('tutorial.tutorial', { v: n + 1, length: list.length })}</small><h3>${esc(pick(st.title))}</h3><p>${pick(st.text)}</p>
<div class="cb">${st.done ? `<button data-coach="skip">${t('tutorial.skip_step')}</button>` : `<button class="go" data-coach="next">${last ? t('tutorial.play') : t('tutorial.next')}</button>`}<button data-coach="end">${t('tutorial.end_tutorial')}</button></div>`;
  if (st.hi) document.querySelectorAll(st.hi).forEach((x) => x.classList.add('coach-hi'));
  dodge();
}

/** The coach keeps off the player's ship and infantry: it moves to the other side of the screen when it would cover them. */
function dodge() {
  const el = $('coach');
  if (el.hidden) return;
  const pl = Sim.s.players[0], ids = [pl.ship >= 0 ? 's0' : '', typeof pl.inf === 'number' ? 'i0' : ''].filter(Boolean);
  const near = ids.flatMap((id) => [...document.querySelectorAll(`[data-thing="${id}"]`)].map((t) => t.getBoundingClientRect()));
  const g = 24, hits = () => { const r = el.getBoundingClientRect(); return near.some((t) => t.right > r.left - g && t.left < r.right + g && t.bottom > r.top - g && t.top < r.bottom + g); };
  if (!hits()) return;
  el.classList.toggle('east');
  // Covered on both sides: the usual place, on the left.
  if (hits()) el.classList.remove('east');
}
// The map moves under the coach when it is dragged or zoomed.
let dodgeT = 0;
for (const ev of ['pointerup', 'wheel']) addEventListener(ev, () => { clearTimeout(dodgeT); dodgeT = window.setTimeout(dodge, 250); }, { passive: true });

document.addEventListener('click', (e) => {
  const x = (e.target as HTMLElement).closest<HTMLElement>('[data-coach]');
  if (!x) return;
  // Ending the tutorial, or reading its last step, turns it off for the games to come as well.
  if (x.dataset.coach === 'end' || at() >= steps().length - 1) setTutorial(false); else go(at() + 1);
  paint();
});
