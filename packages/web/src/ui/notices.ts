/* Notices: what happened, read from the game's log. Each shows once as a toast and stays in the Chronicle, on the page of its round.
 * Read again from the log every time, so they survive a reload, an undo and a change of language. */
import { art, D, pick, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import { Sim, type Entry } from '../sim.ts';
import { X } from '../state.ts';
import { bar, dice, name } from './kit.ts';
import { doing, foe } from './news.ts';
import { Toast, type Notice } from './toasts.ts';

/** A notice with its place in the log (`key`), the cell it is about, where it shows (both, only as a toast, or only in the Chronicle), and whether it tells what an event card shows. */
export interface Note extends Notice { key: string; at: number; cell?: number; only?: 'toast' | 'page'; card?: boolean }
/** A page of the Chronicle: a round, or the war. */
export interface Page { id: string; round: number; war: boolean; notes: Note[] }
/** What is still going on in the game: a stretch of the log that is not over yet tells nothing until it is. */
interface Live { pending: string | null; event: boolean }
/** A stretch of the log told together: a player's turn, an event and what it did, the tax. */
interface Part { kind: 'turn' | 'event' | 'tax'; at: number; p?: number; l: Entry[] }

/** A settlement that raided or was called by an event, the log entry, and what it did. */
interface Tribe { v: (typeof D.settlements)[number]; x: Entry; p: number; what: string }
/** Who got what from a stretch of the log: per player, per settlement, and the King's army. */
export function lines(l: Entry[]) {
  const by = new Map<number, string[]>(), tribes: Tribe[] = [], add = (p: number | null | undefined, x: string) => { if (p === undefined || p === null) return; if (!by.has(p)) by.set(p, []); by.get(p)!.push(x); };
  let ref = 0;
  for (const x of l) {
    if (['gold', 'bells', 'crosses'].includes(x.e)) add(x.p, Places.plus(x.n, x.e, 17));
    if (x.e === 'ref') ref += x.n;
    if (x.e === 'gainAgent') add(x.p, `+ ${pick(D.agents[x.agent])}`);
    if (x.e === 'removed') add(x.p, `− ${pick(D.agents[x.card])}`);
    if (x.e === 'build') add(x.p, `+ ${pick(D.buildings[x.building])}`);
    if (x.e === 'buildingLost') add(x.p, `− ${pick(D.buildings[x.building])}`);
    if (x.e === 'damage') add(x.p, t('reports.ship_damaged'));
    if (x.e === 'sell') add(x.p, `${t('reports.sold')} ${x.n} ${icon(x.r, 16)}`);
    if (x.e === 'raid' || x.e === 'activate') { const v = D.settlements.find((q) => q.n === x.settlement); if (!v || (x.e === 'activate' && x.hostility >= 4)) continue; tribes.push({ v, x, p: x.p!, what: x.e === 'raid' ? t('reports.raid') : x.hostility <= 2 ? t('reports.bring_1') : t('reports.stay_calm') }); }
  }
  return { by, tribes, ref };
}

/** The year a round is played in. */
export const year = (n: number) => D.settings.rounds.firstYear + (n - 1) * D.settings.rounds.yearStep;
/** A new turn begins: an agent played, a pass, or crosses spent to recruit before playing. */
const turnStart = (x: Entry, cur: Part | null) => x.e === 'play' || x.e === 'pass'
  || (x.e === 'crosses' && x.why === 'recruit' && !(cur?.kind === 'turn' && cur.p === x.p && cur.l[0]?.e === 'play' && cur.l[0].a === 'recruit'));
/** Is this stretch still going on (the last one of the log)? */
const going = (k: Part['kind'], live: Live) => (k === 'turn' ? live.pending !== null && live.pending !== 'turn' : k === 'event' ? live.event : live.pending === 'tax');

/** Notices told at once, from one entry. */
function single(x: Entry, at: number): Omit<Note, 'key'>[] {
  if (x.e === 'combat') {
    const d = foe(x), head = d ? t(x.hits ? 'notes.won' : 'notes.lost', { a: name(x.p!), d }) : `${name(x.p!)} ${x.hits ? t('reports.wins_battle') : t('reports.attacks_vain')}`;
    return [{ at, who: x.p, pic: art.agent(x.a[0]), ms: 10000, tone: x.hits ? 'good' : 'bad', cell: x.cell, html: `<b>${head}</b>${bar(x.attack, 'atk')}${bar(x.defence, 'def')}<small>${x.dice.length ? `${dice(x.dice)} ` : ''}${x.hits ? t('reports.hits', { hits: x.hits }) : t('reports.no_success')}</small>` }];
  }
  if (x.e === 'plunder') return [{ at, who: x.p, tone: 'bad', html: `<b>${name(x.p!)}</b>${typeof x.from === 'number' ? t('notes.plunder', { from: name(x.from) }) : t('reports.takes')} ${icon(x.r, 18)}` }];
  if (x.e === 'toEurope') return [{ at, who: x.p, html: `<b>${name(x.p!)}</b>${t(x.token)} ${t('reports.sent_europe')}` }];
  if (x.e === 'round') return [{ at, only: 'toast', html: `<b>${t('round')} ${x.n}</b>${year(x.n)}` }];
  if (x.e === 'war') return [{ at, who: x.loyalist, pic: 'art/event/seven_years_war.webp', tone: 'bad', html: `<b>${t('war')}</b>${t('loyalist')}: ${x.loyalist === null ? t('none') : name(x.loyalist)}` }];
  // The war screen shows each siege as it is fought; the Chronicle keeps them.
  if (x.e === 'siege') return [{ at, who: x.p, only: 'page', tone: x.fell ? 'bad' : 'good', cell: x.cell, html: `<b>${name(x.p!)}: ${x.fell ? t('notes.fell') : t('notes.held')}</b>${bar(x.attack, 'atk')}${bar(x.defence, 'def')}${x.dice.length ? `<small>${dice(x.dice)}</small>` : ''}` }];
  return [];
}
/** Notices told once a stretch is over. */
function whole(g: Part): Omit<Note, 'key'>[] {
  const at = g.at;
  if (g.kind === 'turn') {
    const p = g.p!, line = doing(p, g.l), play = g.l.find((x) => x.e === 'play'), spot = g.l.findLast((x) => (x.e === 'found' || x.e === 'step') && x.p === p);
    return line ? [{ at, who: p, pic: play ? art.agent(play.card) : '', cell: spot?.cell, html: `<b>${name(p)}</b>${line}` }] : [];
  }
  if (g.kind === 'tax') {
    const paid = g.l.filter((x) => x.e === 'tax');
    return paid.length ? [{ at, pic: 'art/europe.webp', html: `<b>${t('tax')} ${paid[0].rate}${icon('gold', 16)}</b>${paid.map((x) => `${name(x.p!)} ${x.pay ? t('notes.paid') : t('notes.refused')}`).join(', ')}` }] : [];
  }
  const id = g.l[0].id as string | null;
  if (!id) return [];
  // What an event did is told once its card is read.
  const { by, tribes, ref } = lines(g.l.slice(1)), head = `<b>${pick(D.names.events[id])}</b>`, pic = `art/event/${id}.webp`, out: Omit<Note, 'key'>[] = [];
  for (const [p, xs] of by) out.push({ at, who: p, pic, html: `${head}${name(p)}: ${xs.join(', ')}` });
  for (const { v, x, p, what } of tribes) out.push({ at, who: p, pic: art.tribe(v.tribe), tone: x.e === 'raid' ? 'bad' : '', cell: v.cell, html: `${head}${pick(D.names.tribes[v.tribe])} ${what} ${name(p)}` });
  if (ref) out.push({ at, pic, tone: 'bad', html: `${head}${t('ref')} ${Places.plus(ref, 'ref', 16)}` });
  // An event that did nothing is not news when it happens, but the Chronicle keeps it.
  if (!out.length) out.push({ at, pic, only: 'page', html: `${head}${t('notes.no_effect')}` });
  return out.map((n) => ({ ...n, card: true }));
}

/** Every notice of the game, page by page. */
export function pages(log: Entry[], live: Live): Page[] {
  const out: Page[] = [], start = (round: number, war: boolean) => { out.push({ id: war ? 'war' : `${round}`, round, war, notes: [] }); };
  let cur: Part | null = null;
  const put = (l: Omit<Note, 'key'>[]) => { if (!out.length) start(0, false); out.at(-1)!.notes.push(...l.map((n, i) => ({ ...n, key: `${n.at}.${i}` }))); };
  const end = (open = false) => { if (cur && !open) put(whole(cur)); cur = null; };
  log.forEach((x, at) => {
    if (turnStart(x, cur)) { end(); cur = { kind: 'turn', at, p: x.p, l: [] }; }
    else if (x.e === 'event') { end(); cur = { kind: 'event', at, l: [] }; }
    else if (x.e === 'tax' && cur?.kind !== 'tax') { end(); cur = { kind: 'tax', at, l: [] }; }
    else if (x.e === 'round' || x.e === 'war') { end(); start(x.e === 'round' ? x.n : out.at(-1)?.round ?? 0, x.e === 'war'); }
    cur?.l.push(x);
    put(single(x, at));
  });
  if (cur) end(going((cur as Part).kind, live));
  for (const p of out) p.notes.sort((a, b) => a.at - b.at);
  return out;
}
/** What is going on now in the game being played. */
export const live = (): Live => ({ pending: Sim.s.over ? null : Sim.s.pending?.kind ?? null, event: !!Sim.s.event });

const shown = new Set<string>();
let game: unknown = null;
/** Toast what has not been told yet, in order. A game just loaded, started or taken back has no news: what is in its log was told before.
 * A card being read goes first; while the bots play (`cards` false), an event's card is still to come, so the telling stops there. */
export function tell(cards = true) {
  const all = pages(Sim.s.log as Entry[], live()).flatMap((p) => p.notes);
  if (game !== Sim.s) { game = Sim.s; shown.clear(); for (const n of all) shown.add(n.key); return; }
  if (X.reports.length) return;
  for (const n of all) {
    if (shown.has(n.key)) continue;
    if (n.card && !cards) break;
    shown.add(n.key); if (n.only !== 'page') Toast.add(n);
  }
}
/** Old news: after undo, a skipped round, a new game. */
export function hush() { game = null; }
