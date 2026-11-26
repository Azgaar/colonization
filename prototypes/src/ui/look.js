/* What a clicked cell is and gives. */
import { $, art, cap, colonyAt, D, L, pick, settlementAt, t, tokenAt } from '../data.js';
import { icon } from '../icons.js';
import { Board } from '../map/board.js';
import { Places } from '../places.js';
import { Sim } from '../sim.js';
import { S } from '../state.js';
import { deciding } from './decisions.js';
import { goods } from './goods.js';
/** What a cell is and gives, for any open cell that is clicked. */
function ground(c) {
  const tr = D.terrain[c], def = Sim.s.def.terrain[tr], b = D.bonus[c], RES = { corn: 'food', fish: 'food', timber: 'timber', leaf: 'crops', fur: 'crops', silver: 'silver' };
  const gives = [...new Set([...def.yields, ...(b ? [b] : [])])].map((i) => `<span>${icon(Places.ico(i), 18)}${(def.yields.includes(i) ? 1 : 0) + (b === i ? 1 : 0) || 1}</span>`).join('');
  return `<dl><dt>${L('Gives', 'Даёт')}</dt><dd class="gv">${gives || L('nothing', 'ничего')}</dd>${b ? `<dt>${L('Bonus', 'Бонус')}</dt><dd>+1 ${icon(Places.ico(b), 17)} ${pick(D.names.resources[RES[b]])}</dd>` : ''}<dt>${L('Moving in', 'Вход')}</dt><dd>${def.move === 'all' ? L('all points', 'все очки') : `${def.move} ${icon('move', 15)}`}</dd>${def.defence ? `<dt>${t('defence')}</dt><dd>+${def.defence} ${icon('sword', 14)}</dd>` : ''}</dl>`;
};
export function details() {
  const lk = $('look'), c0 = S.look, can = c0 !== null && !S.card && S.war < 0 && S.view === 'map' && !deciding(), v = can && settlementAt(c0), c = can && colonyAt(c0), tok = can && tokenAt(c0), A = Places.army(), zone = can && D.zone[c0], open = can && D.open[c0];
  lk.hidden = !can;
  if (!can) return;
  const tr = D.terrain[c0], ter = open && tr ? cap(pick(D.names.terrain[tr])) : '', poi = D.poi[c0];
  const head = (pic, title, sub) => `<div class="lh">${pic}<span><h3>${title}</h3><small>${sub}</small></span></div>`;
  if (v) lk.innerHTML = head(`<img class="chf" src="${art.tribe(v.tribe)}" alt="">`, pick(D.names.tribes[v.tribe]), ter) + `<dl><dt>${t('population')}</dt><dd>${icon('people', 16)} ${v.pop}</dd><dt>${t('hostility')}</dt><dd>${icon('anger', 16)} ${v.hostility}</dd><dt>${t('loot')}</dt><dd>${v.loot.gold ? v.loot.gold + icon('gold', 17) : v.loot.amount + icon(v.loot.res, 17)}</dd>${v.ally !== null ? `<dt>${t('ally')}</dt><dd>${Places.name(v.ally)}</dd>` : ''}</dl><p>${v.hostility >= 4 ? t('raid') : v.hostility === 3 ? t('calm') : t('gift')}</p>`;
  else if (c) lk.innerHTML = head(Places.em(c.owner, 44), Places.name(c.owner), `${t('colony')}, ${ter.toLowerCase()}`) + `<dl><dt>${t('defence')}</dt><dd>${c.defence} ${icon('sword', 14)}</dd><dt>${L('Redcoats, if war now', 'Красных, если война')}</dt><dd>${A.per[c.cell] ?? 0}</dd><dt>${t('warehouse')}</dt><dd>${goods(D.players[c.owner].wh).map((r) => icon(r, 17)).join('') || '0'}</dd></dl>`;
  else if (!open) lk.innerHTML = head('', t('unexplored'), L('A ship or infantry next to it can explore it for 1 point', 'Корабль или пехота рядом могут разведать за 1 очко'));
  else lk.innerHTML = head(tok ? Places.em(tok.p, 40) : '', zone === 'europe' ? t('europe') : ter || t('sea'), [zone === 'europe' ? L('A ship here can trade, hire and win over Fathers', 'Корабль здесь торгует, нанимает и склоняет отцов') : zone === 'sea' ? L('Open sea between the land and Europe', 'Открытое море между землёй и Европой') : '', tok ? `${Places.name(tok.p)}: ${t(tok.kind).toLowerCase()}${tok.kind === 'ship' ? ` ${goods(D.players[tok.p].hold).map((r) => icon(r, 17)).join('')}` : ''}` : '', poi ? t(poi) : ''].filter(Boolean).join('. ')) + (zone === 'map' ? ground(c0) : '');
  Board.bubble();
}
