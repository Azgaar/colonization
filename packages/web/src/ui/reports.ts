/* What happened, as large cards and notifications. */
import { art, D, me, pick, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import { Sim, type Entry } from '../sim.ts';
import { fx } from '../sound.ts';
import { X } from '../state.ts';
import { Texts } from '../texts.ts';
import type { Snapshot } from '../view.ts';
import { all, eventCard, lastPoi, poiCard, poiDef, rollOf } from './cards.ts';
import { bar, bigCard, btn, dice, name } from './kit.ts';
import { Toast } from './toasts.ts';
import { men } from './war.ts';
/** A settlement that raided or was called by an event, the log entry, and what it did. */
interface Tribe { v: Snapshot['settlements'][number]; x: Entry; p: number; what: string }
/** What the player got: gold, bells, crosses and agents. */
const gains = (l: Entry[]): string[] => l.filter((e) => e.p === me && ['gold', 'bells', 'crosses'].includes(e.e)).map((e) => Places.plus(e.n, e.e)).concat(l.filter((e) => e.p === me && e.e === 'gainAgent').map((e) => pick(D.agents[e.agent])));
/** The war begins: who sides with the King, and who rises against him. */
const warStart = (e: Entry) => {
  const patriots = D.players.map((_, p) => p).filter((p) => p !== e.loyalist), you = (p: number) => (p === me ? ` (${t('you')})` : '');
  return `<div class="wcard two"><div class="wct"><span class="wpic">${e.loyalist === null ? icon('people', 30) : Places.em(e.loyalist, 34)}</span><b>${e.loyalist === null ? t('none') : name(e.loyalist)}${e.loyalist === null ? '' : you(e.loyalist)}</b><small>${t('loyalist')}</small></div>`
    + `<div class="wct"><span class="wpic">${patriots.map((p) => Places.em(p, 30)).join('')}</span>${patriots.length === 1 ? `<b>${name(patriots[0]!)}${you(patriots[0]!)}</b><small>${t('patriot')}</small>` : `<b>${t('patriots')}</b>`}</div></div>`;
};
/** The King's tactic, drawn from its deck: the top card lifts off and turns over; under it, the army it leads. */
const tacticDraw = (e: Entry) => {
  const left = Math.min(5, Math.max(1, Object.keys(D.names.tactics).length - 1)), back = `<i class="tback">${icon('ref', 34)}</i>`;
  return `<article class="rc war tdraw"><div class="in"><div class="tstage"><div class="tdeck">${back.repeat(left)}</div>`
    + `<div class="tcard">${back}<div class="tfront"><span class="tcrown">${icon('ref', 30)}</span><b>${pick(D.names.tactics[e.tactic])}</b><span class="rule"></span><p>${Texts.tactic(e.tactic)}</p></div></div></div>`
    + `<h2>${t('tactic')}</h2><div class="rule"></div><div class="tx"><p class="tarmy">${men(Math.min(e.pool, 10))}<b>${e.pool}</b>${t('ref')}</p></div><div class="bts">${btn(t('reports.continue'), 'data-ok', 'go')}</div></div></article>`;
};
/** Who got what from a stretch of the log: per player, per settlement, and the King's army. */
function lines(l: Entry[]) {
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
export function results(l: Entry[]): string {
  const { by, ref } = lines(l), tribes = lines(l).tribes.map(({ v, p, what }) => `<li class="tr"><img class="chf" src="${art.tribe(v.tribe)}" alt=""><span><b>${pick(D.names.tribes[v.tribe])}</b> ${what} <span class="pl">${Places.em(p, 22)}<b>${name(p)}</b></span></span></li>`);
  const rows = [...by].map(([p, xs]) => `<li><span class="pl">${Places.em(p, 22)}<b>${name(p)}</b></span><span>${xs.join(', ')}</span></li>`).join('');
  return rows || tribes.length || ref ? `<ul class="who">${rows}${tribes.join('')}${ref ? `<li><span class="kg">${icon('ref', 22)}</span><b>${t('ref')}</b><span>${Places.plus(ref, 'ref', 17)}</span></li>` : ''}</ul>` : '';
}
/** What an event did, as notifications that stay on screen after its card is closed. */
function evToasts(id: string, l: Entry[]) {
  const { by, tribes, ref } = lines(l), head = `<b>${pick(D.names.events[id])}</b>`;
  for (const [p, xs] of by) Toast.add({ who: p, pic: `art/event/${id}.webp`, html: `${head}${name(p)}: ${xs.join(', ')}` });
  for (const { v, x, p, what } of tribes) Toast.add({ who: p, pic: art.tribe(v.tribe), tone: x.e === 'raid' ? 'bad' : '', html: `${head}${pick(D.names.tribes[v.tribe])} ${what} ${name(p)}` });
  if (ref) Toast.add({ pic: `art/event/${id}.webp`, tone: 'bad', html: `${head}${t('ref')} ${Places.plus(ref, 'ref', 16)}` });
}
/** Turn news from the engine into short reports. Entries about a player (combat, raid, tax, plunder) always name them in `p`. */
export function report(l: Entry[]) {
  // An event that asked a question collects its results until it is over.
  if (X.evt) { const stop = l.findIndex((x) => ['round', 'tax', 'event'].includes(x.e)); X.evt.l.push(...(stop < 0 ? l : l.slice(0, stop))); if (stop >= 0 || D.event !== X.evt.id) { evToasts(X.evt.id, X.evt.l); X.evt = null; } }
  l.forEach((e, i) => {
    const after = l.slice(i + 1);
    if (e.e === 'combat') Toast.add({ who: e.p, pic: art.agent(e.a[0]), ms: 10000, tone: e.hits ? 'good' : 'bad', html: `<b>${name(e.p!)} ${e.hits ? t('reports.wins_battle') : t('reports.attacks_vain')}</b>${bar(e.attack, 'atk')}${bar(e.defence, 'def')}<small>${e.dice.length ? `${dice(e.dice)} ` : ''}${e.hits ? t('reports.hits', { hits: e.hits }) : t('reports.no_success')}</small>` });
    // The event that is asking a question right now shows itself.
    if (e.e === 'event') { const stop = after.findIndex((x) => ['round', 'tax', 'event'].includes(x.e)), got = stop < 0 ? after : after.slice(0, stop); if (D.event === e.id && stop < 0) X.evt = { id: e.id, l: got }; if (!(Sim.mine() && D.event === e.id)) X.reports.push({ big: true, after: X.evt ? null : () => evToasts(e.id, got), html: eventCard(e.id, results(got), btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'poi' && e.p === me && !after.some((x) => x.e === 'poi')) { const roll = after.find((x) => x.e === 'roll'), g = gains(after); if (Sim.kind() !== 'nodeChoice') X.reports.push({ big: true, html: poiCard(e, `<p>${all(poiDef(e).do)}</p>${g.length || roll ? `<p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${g.join(', ')}</p>` : ''}`, btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'choice' && e.p === me) { const roll = after.find((x) => x.e === 'roll'), g = gains(after), q = lastPoi(), o = q && poiDef(q).do.flatMap((n) => (n.n === 'choice' ? n.options : [])).find((x) => x.id === e.option), hit = roll && rollOf(o?.do)?.table.find((x) => roll.die <= x.max), home = after.some((x) => x.e === 'toEurope' && x.p === me); if (q && o && (roll || g.length || home) && !after.some((x) => x.e === 'poi')) X.reports.push({ big: true, html: poiCard(q, `<h3>${pick([o.en, o.ru])}</h3><p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${(hit ? all(hit.do) : all(o.do)) || t('cards.nothing')}</p>`, btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'gift' && e.p === me) { const v = D.settlements[e.settlement - 1]; Toast.add({ pic: art.tribe(v.tribe), tone: 'good', html: `<b>${pick(D.names.tribes[v.tribe])}</b>${t('reports.hostility_fell')} ${1 + e.hits}` }); }
    if (e.e === 'raid') { const v = D.settlements.find((q) => q.n === e.settlement); Toast.add({ who: e.p, pic: v ? art.tribe(v.tribe) : '', tone: 'bad', html: `<b>${v ? pick(D.names.tribes[v.tribe]) : ''}</b>${t('reports.raid2')} ${name(e.p!)}` }); }
    if (e.e === 'tax') Toast.add({ who: e.p, html: `<b>${name(e.p!)}</b>${e.pay ? t('data.paid_tax') : t('data.refused_tax')} ${e.rate}${icon('gold', 16)}` });
    if (e.e === 'plunder' && e.p !== me) Toast.add({ who: e.p, tone: 'bad', html: `<b>${name(e.p!)}</b>${t('reports.takes')} ${icon(e.r, 18)}` });
    if (e.e === 'round') Toast.add({ html: `<b>${t('round')} ${e.n}</b>${1620 + (e.n - 1) * 20}` });
    if (e.e === 'toEurope' && e.p === me) Toast.add({ who: me, html: `<b>${t(e.token)}</b>${t('reports.sent_europe')}` });
    if (e.e === 'war') X.reports.push({ big: true, after: () => fx('reveal', 0.6), html: bigCard('war', 'seven_years_war', t('war'), `${D.year}`, warStart(e), btn(t('reports.continue'), 'data-ok', 'go')) }, { big: true, html: tacticDraw(e) });
  });
}
/** Reports and notifications that no longer matter: after undo, a skipped round, a new game. */
export function clearNews() { X.reports = []; X.evt = null; X.key = ''; Toast.clear(); }
