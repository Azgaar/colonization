/* What happened, as large cards to read. */
import { art, D, me, pick, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import { Sim, type Entry } from '../sim.ts';
import { fx } from '../sound.ts';
import { X } from '../state.ts';
import { Texts } from '../texts.ts';
import { all, eventCard, lastPoi, poiCard, poiDef, rollOf } from './cards.ts';
import { bigCard, btn, dice, name } from './kit.ts';
import { Toast } from './toasts.ts';
import { hush, lines } from './notices.ts';
import { men } from './war.ts';
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
export function results(l: Entry[]): string {
  const { by, ref } = lines(l), tribes = lines(l).tribes.map(({ v, p, what }) => `<li class="tr"><img class="chf" src="${art.tribe(v.tribe)}" alt=""><span><b>${pick(D.names.tribes[v.tribe])}</b> ${what} <span class="pl">${Places.em(p, 22)}<b>${name(p)}</b></span></span></li>`);
  const rows = [...by].map(([p, xs]) => `<li><span class="pl">${Places.em(p, 22)}<b>${name(p)}</b></span><span>${xs.join(', ')}</span></li>`).join('');
  return rows || tribes.length || ref ? `<ul class="who">${rows}${tribes.join('')}${ref ? `<li><span class="kg">${icon('ref', 22)}</span><b>${t('ref')}</b><span>${Places.plus(ref, 'ref', 17)}</span></li>` : ''}</ul>` : '';
}
/** Turn news from the engine into large cards to read. The short notices are told apart (notices.ts). */
export function report(l: Entry[]) {
  l.forEach((e, i) => {
    const after = l.slice(i + 1);
    // The event that is asking a question right now shows itself.
    if (e.e === 'event') { const stop = after.findIndex((x) => ['round', 'tax', 'event'].includes(x.e)), got = stop < 0 ? after : after.slice(0, stop); if (!(Sim.mine() && D.event === e.id)) X.reports.push({ big: true, html: eventCard(e.id, results(got), btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'poi' && e.p === me && !after.some((x) => x.e === 'poi')) { const roll = after.find((x) => x.e === 'roll'), g = gains(after); if (Sim.kind() !== 'nodeChoice') X.reports.push({ big: true, html: poiCard(e, `<p>${all(poiDef(e).do)}</p>${g.length || roll ? `<p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${g.join(', ')}</p>` : ''}`, btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'choice' && e.p === me) { const roll = after.find((x) => x.e === 'roll'), g = gains(after), q = lastPoi(), o = q && poiDef(q).do.flatMap((n) => (n.n === 'choice' ? n.options : [])).find((x) => x.id === e.option), hit = roll && rollOf(o?.do)?.table.find((x) => roll.die <= x.max), home = after.some((x) => x.e === 'toEurope' && x.p === me); if (q && o && (roll || g.length || home) && !after.some((x) => x.e === 'poi')) X.reports.push({ big: true, html: poiCard(q, `<h3>${pick([o.en, o.ru])}</h3><p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${(hit ? all(hit.do) : all(o.do)) || t('cards.nothing')}</p>`, btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'war') X.reports.push({ big: true, after: () => fx('reveal', 0.6), html: bigCard('war', 'seven_years_war', t('war'), `${D.year}`, warStart(e), btn(t('reports.continue'), 'data-ok', 'go')) }, { big: true, html: tacticDraw(e) });
  });
}
/** Reports and notifications that no longer matter: after undo, a skipped round, a new game. */
export function clearNews() { X.reports = []; X.key = ''; hush(); Toast.clear(); }
