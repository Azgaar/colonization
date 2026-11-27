/* What a clicked cell is and gives. */
import { $, ACT, art, cap, colonyAt, colonyName, D, pick, settlementAt, t, tokenAt } from '../data.ts';
import { icon } from '../icons.ts';
import { Board } from '../map/board.ts';
import { Places } from '../places.ts';
import { Sim } from '../sim.ts';
import { S } from '../state.ts';
import { deciding } from './decisions.ts';
import { goods } from './goods.ts';
/** What can be done with a settlement, at what cost and with what chance (FR-U-7). */
function dealings(hostility: number, ally: number | null) {
  const n = D.settings.natives, hit = D.settings.combat.successFaces.length / 6, more = Math.round((1 - (1 - hit) ** n.giftDice) * 100), rows: string[] = [];
  // A gift costs 1 resource of any kind (DD-78); without dice its result is fixed (DD-86).
  if (hostility > 0) rows.push(`<b>${pick(ACT.gift)}</b> ${Places.plus(-1, 'goods', 15)}: ${icon('hostility', 14)} ${n.giftDice ? `−${n.giftBase}…−${n.giftBase + n.giftDice}, ${t('look.for_or', { more, v: n.giftBase + 1 })}` : `−${n.giftBase}`}`);
  rows.push(`<b>${pick(ACT.preach)}</b> ${hostility ? Places.plus(-hostility, 'crosses', 15) : t('places.free')}: ${t('look.native_agent')}`);
  if (ally === null) rows.push(`<b>${pick(ACT.alliance)}</b> ${hostility <= n.allianceMax ? t('look.educated_agent') : t('look.hostility_less', { allianceMax: n.allianceMax })}`);
  return `<ul class="deals">${rows.map((r) => `<li>${r}</li>`).join('')}</ul>`;
}
/** What a cell is and gives, for any open cell that is clicked. */
function ground(c: number) {
  const tr = D.terrain[c]; if (!tr) return '';
  const def = Sim.s.def.terrain[tr], b = D.bonus[c], RES: Record<string, string> = { food: 'food', timber: 'timber', crops: 'crops', silver: 'silver' };
  const gives = [...new Set([...def.yields, ...(b ? [b] : [])])].map((i) => `<span>${icon(Places.ico(i), 18)}${(def.yields.includes(i) ? 1 : 0) + (b === i ? 1 : 0) || 1}</span>`).join('');
  return `<dl><dt>${t('look.gives')}</dt><dd class="gv">${gives || t('cards.nothing')}</dd>${b ? `<dt>${t('bonus')}</dt><dd>+1 ${icon(Places.ico(b), 17)} ${pick(D.names.resources[RES[b]])}</dd>` : ''}<dt>${t('look.moving')}</dt><dd>${def.move === 'all' ? t('look.points') : `${def.move} ${icon('move', 15)}`}</dd>${def.defence ? `<dt>${t('defence')}</dt><dd>+${def.defence} ${icon('power', 14)}</dd>` : ''}</dl>`;
}
export function details() {
  const lk = $('look'), c0 = S.look, can = c0 !== null && !S.card && S.war < 0 && S.view === 'map' && !deciding(), v = can && settlementAt(c0), c = can && colonyAt(c0), tok = can && tokenAt(c0), A = Places.army(), zone = can && D.zone[c0], open = can && D.open[c0];
  lk.hidden = !can;
  if (!can) return;
  const tr = D.terrain[c0], ter = open && tr ? cap(pick(D.names.terrain[tr])) : '', poi = D.poi[c0];
  const head = (pic: string, title: string, sub: string) => `<div class="lh">${pic}<span><h3>${title}</h3><small>${sub}</small></span></div>`;
  if (v) lk.innerHTML = head(`<img class="chf" src="${art.tribe(v.tribe)}" alt="">`, pick(D.names.tribes[v.tribe]), ter) + `<dl><dt>${t('population')}</dt><dd>${icon('population', 16)} ${v.pop}</dd><dt>${t('hostility')}</dt><dd>${icon('hostility', 16)} ${v.hostility}</dd><dt>${t('loot')}</dt><dd>${v.loot.gold ? v.loot.gold + icon('gold', 17) : v.loot.amount + icon(v.loot.res!, 17)}</dd>${v.ally !== null ? `<dt>${t('ally')}</dt><dd>${Places.name(v.ally)}</dd>` : ''}</dl><p>${v.hostility >= 4 ? t('raid') : v.hostility === 3 ? t('calm') : t('gift')}</p>${dealings(v.hostility, v.ally)}`;
  else if (c) lk.innerHTML = head(Places.em(c.owner, 44), colonyName(c), `${Places.name(c.owner)}, ${ter.toLowerCase()}`) + `<dl><dt>${t('defence')}</dt><dd>${c.defence} ${icon('power', 14)}</dd><dt>${t('look.redcoats_war')}</dt><dd>${A.per[c.cell] ?? 0}</dd><dt>${t('warehouse')}</dt><dd>${goods(D.players[c.owner].wh).map((r) => icon(r, 17)).join('') || '0'}</dd></dl>`;
  else if (!open) lk.innerHTML = head('', t('unexplored'), t('look.ship_infantry'));
  else lk.innerHTML = head(tok ? Places.em(tok.p, 40) : '', zone === 'europe' ? t('europe') : ter || t('sea'), [zone === 'europe' ? t('look.ship_trade') : zone === 'sea' ? t('look.open_sea') : '', tok ? `${Places.name(tok.p)}: ${t(tok.kind).toLowerCase()}${tok.kind === 'ship' ? ` ${goods(D.players[tok.p].hold).map((r) => icon(r, 17)).join('')}` : ''}` : '', poi ? t(poi) : ''].filter(Boolean).join('. ')) + (zone === 'map' ? ground(c0) : '');
  Board.bubble();
}
