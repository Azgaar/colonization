/* Events, ruins and wrecks: what their cards say, in words and signs. */
import { D, L, me, pick, t } from '../data.js';
import { icon } from '../icons.js';
import { Sim } from '../sim.js';
import { Texts } from '../texts.js';
import { bigCard, plus } from './kit.js';
/* ---- ruins and wrecks: a large card with every option and everything that can come of it ---- */
export const lastPoi = () => Sim.s.log.filter((x) => x.e === 'poi' && x.p === me).at(-1);
export const poiDef = (e) => (e.deck === 'ruin' ? Sim.s.def.ruins : Sim.s.def.wrecks)[e.card];
/** What an effect does, in words and signs. */
function says(n) {
  if (n.n === 'gain' || n.n === 'lose') { const k = n.n === 'gain' ? 1 : -1; return [...['gold', 'bells', 'crosses'].filter((q) => n[q]).map((q) => plus(k * n[q], q)), ...Object.entries(n.wh || {}).map(([q, v]) => plus(k * v, q)), ...Object.entries(n.hold || {}).map(([q, v]) => `${plus(k * v, q)} <small>${L('into the hold', 'в трюм')}</small>`)].join(' '); }
  const skull = n.skull ? ' 💀' : '', w = { endMove: L('the move ends', 'ход фишки окончен'), moves: `+${n.add} ${L(n.add === 1 ? 'move' : 'moves', 'хода')}`, toEurope: L('sent to Europe', 'отправка в Европу') + skull, damage: `${n.amount} ${L('damage', 'повр.')}${skull}`, hostilityNearest: `${n.add > 0 ? '+' : '−'}${Math.abs(n.add)} ${icon('anger', 18)} <small>${L('nearest settlement', 'ближайшее поселение')}</small>`, discardCards: L(`discard ${n.amount} card${n.amount > 1 ? 's' : ''}`, `сбросить карт: ${n.amount}`), pierLeftmost: L('the first agent from the pier joins', 'первый агент с причала ваш'), drawPoi: L('draw another card', 'ещё одна карта'), guide: L(`look at ${n.look} cards, play one`, `посмотреть ${n.look} карты, разыграть одну`), revealAdjacent: L('reveal the fragments around', 'открыть соседние фрагменты'), freeBasicBuilding: L('a free basic building', 'базовая постройка бесплатно'), toColonyWater: L('moved next to your colony', 'перенос к вашей колонии'), takeAgent: `${n.amount} × ${pick(Object.values(D.agents).find((a) => a.base === n.agent) || ['', ''])}`, dropHold: L('lose the cargo', 'потеря груза'), ref: plus(n.add, 'ref') };
  return w[n.n] || '';
}
export const all = (list) => (list || []).filter((n) => n.n !== 'roll' && n.n !== 'choice').map(says).filter(Boolean).join(', ');
export const table = (list) => { const q = (list || []).find((n) => n.n === 'roll'); if (!q) return ''; let from = 1; return `<ul class="rl">${q.table.map((x) => { const span = from === x.max ? `${from}` : `${from}–${x.max}`; from = x.max + 1; return `<li><i>${span}</i>${all(x.do) || L('nothing', 'ничего')}</li>`; }).join('')}</ul>`; };
export const costs = (k = {}) => [...['gold', 'bells', 'crosses'].filter((q) => k[q]).map((q) => plus(-k[q], q)), k.cards ? `−${k.cards} ${L(k.cards === 1 ? 'card from hand' : 'cards from hand', 'карт с руки')}` : '', k.anyFood ? plus(-k.anyFood, 'food') : '', k.anyResource ? L(`−${k.anyResource} any good`, `−${k.anyResource} любой товар`) : '', k.holdResource ? L(`−${k.holdResource} good from the hold`, `−${k.holdResource} товар из трюма`) : '', k.wholeHold ? L(`the whole cargo, at least ${k.wholeHold}`, `весь груз, не меньше ${k.wholeHold}`) : '', k.agent ? `${k.agent === 'scout' ? L('needs a scout', 'нужен скаут') : `${L('needs an agent with', 'нужен агент с')} ${icon('sword', 15)}`}` : ''].filter(Boolean).join(', ');
export const poiCard = (e, body, buttons = '') => bigCard(e.deck, e.card, pick(D.names[e.deck === 'ruin' ? 'ruins' : 'wrecks'][e.card]), t(e.deck), `${flav(e.deck, e.card)}${body}`, buttons);
export const sinceEvent = () => { const l = Sim.s.log, i = l.findLastIndex((x) => x.e === 'event'); return i < 0 ? [] : l.slice(i + 1); };
const flav = (k, id) => (D.flavor[k][id] ? `<p class="flav">${D.flavor[k][id]}</p>` : '');
export const eventCard = (id, more, buttons) => bigCard('event', id, pick(D.names.events[id]), '', `${flav('event', id)}<p>${Texts.event(id, 19)}</p>${more}`, buttons);
