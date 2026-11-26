/* Events, ruins and wrecks: what their cards say, in words and signs. */
import type { Cost, Node, PoiCardDef } from '@col/data';
import { D, L, me, pick, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Sim, type Entry } from '../sim.ts';
import { Texts } from '../texts.ts';
import { bigCard, plus } from './kit.ts';
/* ---- ruins and wrecks: a large card with every option and everything that can come of it ---- */
/** The player's last ruin or wreck. */
export const lastPoi = (): Entry | undefined => Sim.s.log.filter((x) => x.e === 'poi' && x.p === me).at(-1);
/** The card of a ruin or wreck, from the log entry of the draw (`deck`, `card`). */
export const poiDef = (e: Entry): PoiCardDef => (e.deck === 'ruin' ? Sim.s.def.ruins : Sim.s.def.wrecks)[e.card];
const GBC = ['gold', 'bells', 'crosses'] as const;
/** Goods in a stock, with their amounts. */
const stock = (x: Partial<Record<string, number>> | undefined) => Object.entries(x || {}).filter((q): q is [string, number] => q[1] !== undefined);
/** What an effect does, in words and signs. */
function says(n: Node): string {
  const skull = 'skull' in n && n.skull ? ' 💀' : '';
  switch (n.n) {
    case 'gain': case 'lose': {
      const k = n.n === 'gain' ? 1 : -1, got = n.n === 'gain' ? n : null;
      return [...GBC.filter((q) => n[q]).map((q) => plus(k * (n[q] ?? 0), q)), ...stock(got?.wh).map(([q, v]) => plus(k * v, q)), ...stock(got?.hold).map(([q, v]) => `${plus(k * v, q)} <small>${L('into the hold', 'в трюм')}</small>`)].join(' ');
    }
    case 'endMove': return L('the move ends', 'ход фишки окончен');
    case 'moves': return `+${n.add} ${L(n.add === 1 ? 'move' : 'moves', 'хода')}`;
    case 'toEurope': return L('sent to Europe', 'отправка в Европу') + skull;
    case 'damage': return `${n.amount} ${L('damage', 'повр.')}${skull}`;
    case 'hostilityNearest': return `${n.add > 0 ? '+' : '−'}${Math.abs(n.add)} ${icon('anger', 18)} <small>${L('nearest settlement', 'ближайшее поселение')}</small>`;
    case 'discardCards': return L(`discard ${n.amount} card${n.amount > 1 ? 's' : ''}`, `сбросить карт: ${n.amount}`);
    case 'pierLeftmost': return L('the first agent from the pier joins', 'первый агент с причала ваш');
    case 'drawPoi': return L('draw another card', 'ещё одна карта');
    case 'guide': return L(`look at ${n.look} cards, play one`, `посмотреть ${n.look} карты, разыграть одну`);
    case 'revealAdjacent': return L('reveal the fragments around', 'открыть соседние фрагменты');
    case 'freeBasicBuilding': return L('a free basic building', 'базовая постройка бесплатно');
    case 'toColonyWater': return L('moved next to your colony', 'перенос к вашей колонии');
    case 'takeAgent': { const a = Object.values(D.agents).find((x) => x.base === n.agent); return `${n.amount} × ${pick(a || ['', ''])}`; }
    case 'dropHold': return L('lose the cargo', 'потеря груза');
    case 'ref': return plus(n.add ?? 0, 'ref');
    default: return '';
  }
}
export const all = (list: Node[] | undefined) => (list || []).filter((n) => n.n !== 'roll' && n.n !== 'choice').map(says).filter(Boolean).join(', ');
/** The roll among the effects, if there is one. */
export const rollOf = (list: Node[] | undefined) => (list || []).find((n): n is Extract<Node, { n: 'roll' }> => n.n === 'roll');
export const table = (list: Node[] | undefined) => { const q = rollOf(list); if (!q) return ''; let from = 1; return `<ul class="rl">${q.table.map((x) => { const span = from === x.max ? `${from}` : `${from}–${x.max}`; from = x.max + 1; return `<li><i>${span}</i>${all(x.do) || L('nothing', 'ничего')}</li>`; }).join('')}</ul>`; };
export const costs = (k: Cost = {}) => [...GBC.filter((q) => k[q]).map((q) => plus(-(k[q] ?? 0), q)), k.cards ? `−${k.cards} ${L(k.cards === 1 ? 'card from hand' : 'cards from hand', 'карт с руки')}` : '', k.anyFood ? plus(-k.anyFood, 'food') : '', k.anyResource ? L(`−${k.anyResource} any good`, `−${k.anyResource} любой товар`) : '', k.holdResource ? L(`−${k.holdResource} good from the hold`, `−${k.holdResource} товар из трюма`) : '', k.wholeHold ? L(`the whole cargo, at least ${k.wholeHold}`, `весь груз, не меньше ${k.wholeHold}`) : '', k.agent ? `${k.agent === 'scout' ? L('needs a scout', 'нужен скаут') : `${L('needs an agent with', 'нужен агент с')} ${icon('sword', 15)}`}` : ''].filter(Boolean).join(', ');
export const poiCard = (e: Entry, body: string, buttons = '') => bigCard(e.deck, e.card, pick(D.names[e.deck === 'ruin' ? 'ruins' : 'wrecks'][e.card]), t(e.deck), `${flav(e.deck, e.card)}${body}`, buttons);
export const sinceEvent = (): Entry[] => { const l = Sim.s.log, i = l.findLastIndex((x) => x.e === 'event'); return i < 0 ? [] : l.slice(i + 1); };
const flav = (k: keyof typeof D.flavor, id: string) => (D.flavor[k][id] ? `<p class="flav">${D.flavor[k][id]}</p>` : '');
export const eventCard = (id: string, more: string, buttons: string) => bigCard('event', id, pick(D.names.events[id]), '', `${flav('event', id)}<p>${Texts.event(id, 19)}</p>${more}`, buttons);
