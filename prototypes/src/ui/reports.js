/* What happened, as large cards and notifications. */
import { art, D, L, me, pick, t } from '../data.js';
import { icon } from '../icons.js';
import { Places } from '../places.js';
import { Sim } from '../sim.js';
import { X } from '../state.js';
import { Texts } from '../texts.js';
import { all, eventCard, lastPoi, poiCard, poiDef } from './cards.js';
import { bar, bigCard, btn, dice, name } from './kit.js';
import { Toast } from './toasts.js';
const gains = (l) => l.filter((e) => e.p === me && ['gold', 'bells', 'crosses'].includes(e.e)).map((e) => Places.plus(e.n, e.e)).concat(l.filter((e) => e.p === me && e.e === 'gainAgent').map((e) => pick(D.agents[e.agent])));
/** Who got what from a stretch of the log: per player, per settlement, and the King's army. */
function lines(l) {
  const by = new Map(), tribes = [], add = (p, x) => { if (p === undefined || p === null) return; if (!by.has(p)) by.set(p, []); by.get(p).push(x); };
  let ref = 0;
  for (const x of l) {
    if (['gold', 'bells', 'crosses'].includes(x.e)) add(x.p, Places.plus(x.n, x.e, 17));
    if (x.e === 'ref') ref += x.n;
    if (x.e === 'gainAgent') add(x.p, `+ ${pick(D.agents[x.agent])}`);
    if (x.e === 'removed') add(x.p, `− ${pick(D.agents[x.card])}`);
    if (x.e === 'build') add(x.p, `+ ${pick(D.buildings[x.building])}`);
    if (x.e === 'buildingLost') add(x.p, `− ${pick(D.buildings[x.building])}`);
    if (x.e === 'damage') add(x.p, L('ship damaged', 'корабль повреждён'));
    if (x.e === 'sell') add(x.p, `${L('sold', 'продано')} ${x.n} ${icon(x.r, 16)}`);
    if (x.e === 'raid' || x.e === 'activate') { const v = D.settlements.find((q) => q.n === x.settlement); if (!v || (x.e === 'activate' && x.hostility >= 4)) continue; tribes.push({ v, x, what: x.e === 'raid' ? L('raid', 'нападают на') : x.hostility <= 2 ? L('bring 1 food to', 'дарят 1 еду') : L('stay calm, nothing for', 'спокойны, ничего для') }); }
  }
  return { by, tribes, ref };
}
export function results(l) {
  const { by, ref } = lines(l), tribes = lines(l).tribes.map(({ v, x, what }) => `<li class="tr"><img class="chf" src="${art.tribe(v.tribe)}" alt=""><span><b>${pick(D.names.tribes[v.tribe])}</b> ${what} <span class="pl">${Places.em(x.p, 22)}<b>${name(x.p)}</b></span></span></li>`);
  const rows = [...by].map(([p, xs]) => `<li><span class="pl">${Places.em(p, 22)}<b>${name(p)}</b></span><span>${xs.join(', ')}</span></li>`).join('');
  return rows || tribes.length || ref ? `<ul class="who">${rows}${tribes.join('')}${ref ? `<li><span class="kg">${icon('ref', 22)}</span><b>${t('ref')}</b><span>${Places.plus(ref, 'ref', 17)}</span></li>` : ''}</ul>` : '';
}
/** What an event did, as notifications that stay on screen after its card is closed. */
function evToasts(id, l) {
  const { by, tribes, ref } = lines(l), head = `<b>${pick(D.names.events[id])}</b>`;
  for (const [p, xs] of by) Toast.add({ who: p, pic: `art/event/${id}.webp`, html: `${head}${name(p)}: ${xs.join(', ')}` });
  for (const { v, x, what } of tribes) Toast.add({ who: x.p, pic: art.tribe(v.tribe), tone: x.e === 'raid' ? 'bad' : '', html: `${head}${pick(D.names.tribes[v.tribe])} ${what} ${name(x.p)}` });
  if (ref) Toast.add({ pic: `art/event/${id}.webp`, tone: 'bad', html: `${head}${t('ref')} ${Places.plus(ref, 'ref', 16)}` });
}
/** Turn news from the engine into short reports. */
export function report(l) {
  // An event that asked a question collects its results until it is over.
  if (X.evt) { const stop = l.findIndex((x) => ['round', 'tax', 'event'].includes(x.e)); X.evt.l.push(...(stop < 0 ? l : l.slice(0, stop))); if (stop >= 0 || D.event !== X.evt.id) { evToasts(X.evt.id, X.evt.l); X.evt = null; } }
  l.forEach((e, i) => {
    const after = l.slice(i + 1);
    if (e.e === 'combat') Toast.add({ who: e.p, pic: art.agent(e.a[0]), ms: 10000, tone: e.hits ? 'good' : 'bad', html: `<b>${name(e.p)} ${e.hits ? L('wins the battle', 'побеждает в бою') : L('attacks in vain', 'атакует безуспешно')}</b>${bar(e.attack, 'atk')}${bar(e.defence, 'def')}<small>${e.dice.length ? `${dice(e.dice)} ` : ''}${e.hits ? L(`${e.hits} ${e.hits === 1 ? 'success' : 'successes'}`, `Успехов: ${e.hits}`) : L('No success', 'Нет успехов')}</small>` });
    // The event that is asking a question right now shows itself.
    if (e.e === 'event') { const stop = after.findIndex((x) => ['round', 'tax', 'event'].includes(x.e)), got = stop < 0 ? after : after.slice(0, stop); if (D.event === e.id && stop < 0) X.evt = { id: e.id, l: got }; if (!(Sim.mine() && D.event === e.id)) X.reports.push({ big: true, after: X.evt ? null : () => evToasts(e.id, got), html: eventCard(e.id, results(got), btn(L('Continue', 'Дальше'), 'data-ok', 'go')) }); }
    if (e.e === 'poi' && e.p === me && !after.some((x) => x.e === 'poi')) { const roll = after.find((x) => x.e === 'roll'), g = gains(after); if (Sim.kind() !== 'nodeChoice') X.reports.push({ big: true, html: poiCard(e, `<p>${all(poiDef(e).do)}</p>${g.length || roll ? `<p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${g.join(', ')}</p>` : ''}`, btn(L('Continue', 'Дальше'), 'data-ok', 'go')) }); }
    if (e.e === 'choice' && e.p === me) { const roll = after.find((x) => x.e === 'roll'), g = gains(after), q = lastPoi(), o = q && poiDef(q).do.flatMap((n) => n.options || []).find((x) => x.id === e.option), hit = roll && o?.do.find((n) => n.n === 'roll')?.table.find((x) => roll.die <= x.max), home = after.some((x) => x.e === 'toEurope' && x.p === me); if (q && o && (roll || g.length || home) && !after.some((x) => x.e === 'poi')) X.reports.push({ big: true, html: poiCard(q, `<h3>${pick([o.en, o.ru])}</h3><p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${(hit ? all(hit.do) : all(o.do)) || L('nothing', 'ничего')}</p>`, btn(L('Continue', 'Дальше'), 'data-ok', 'go')) }); }
    if (e.e === 'gift' && e.p === me) { const v = D.settlements[e.settlement - 1]; Toast.add({ pic: art.tribe(v.tribe), tone: 'good', html: `<b>${pick(D.names.tribes[v.tribe])}</b>${L('Hostility fell by', 'Враждебность упала на')} ${1 + e.hits}` }); }
    if (e.e === 'raid') { const v = D.settlements.find((q) => q.n === e.settlement); Toast.add({ who: e.p, pic: v ? art.tribe(v.tribe) : '', tone: 'bad', html: `<b>${v ? pick(D.names.tribes[v.tribe]) : ''}</b>${L('raid', 'набег на')} ${name(e.p)}` }); }
    if (e.e === 'tax') Toast.add({ who: e.p, html: `<b>${name(e.p)}</b>${e.pay ? L('paid the tax', 'платит налог') : L('refused the tax', 'отказ от налога')} ${e.rate}${icon('gold', 16)}` });
    if (e.e === 'plunder' && e.p !== me) Toast.add({ who: e.p, tone: 'bad', html: `<b>${name(e.p)}</b>${L('takes', 'забирает')} ${icon(e.r, 18)}` });
    if (e.e === 'round') Toast.add({ html: `<b>${t('round')} ${e.n}</b>${1620 + (e.n - 1) * 20}` });
    if (e.e === 'toEurope' && e.p === me) Toast.add({ who: me, html: `<b>${t(e.token)}</b>${L('was sent to Europe', 'отправлен в Европу')}` });
    if (e.e === 'war') X.reports.push({ big: true, html: bigCard('war', 'seven_years_war', t('war'), `${t('tactic')}, ${D.year}`, `<p><b>${pick(D.names.tactics[e.tactic])}.</b> ${Texts.tactic(e.tactic)}.</p><p><b>${e.pool}</b> ${t('cubes')}. ${t('loyalist')}: <b>${e.loyalist === null ? t('none') : name(e.loyalist)}</b>${e.loyalist === me ? ` (${t('you')})` : ''}</p>`, btn(L('Continue', 'Дальше'), 'data-ok', 'go')) });
  });
}
/** Reports and notifications that no longer matter: after undo, a skipped round, a new game. */
export function clearNews() { X.reports = []; X.evt = null; X.key = ''; Toast.clear(); }
