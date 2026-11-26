/* The top line, the King's army box, the Governors sheet and the game menu. */
import { $, D, L, lang, logLine, me, P, placeOf, t } from '../data.ts';
import type { Entry } from '../sim.ts';
import { icon } from '../icons.ts';
import { Board } from '../map/board.ts';
import { Places } from '../places.ts';
import { Sim } from '../sim.ts';
import { S, U } from '../state.ts';
export function top() {
  const A = Places.army(), f = Math.PI * 2 * (D.round / 10), who = D.over ? null : Sim.busy ? D.turnOf : D.pending ? me : D.turnOf;
  $('date').innerHTML = `<svg class="dial" viewBox="0 0 46 46"><circle cx="23" cy="23" r="18" fill="none" stroke="#ffffff38" stroke-width="7"/><path d="M23 5A18 18 0 ${D.round > 5 ? 1 : 0} 1 ${23 + 18 * Math.sin(f)} ${23 - 18 * Math.cos(f)}" fill="none" stroke="#edb443" stroke-width="7"/><text x="23" y="29" text-anchor="middle" font-size="17" font-weight="800" fill="#f7f1e1">${D.round}</text></svg><div><b>${D.year}</b><small>${t('tax')} ${D.tax} ${icon('gold', 15)}</small></div><button class="king" data-king title="${t('ref')}">${icon('ref', 30)}<span><b>${A.ref}</b><small>${t('ref')}</small></span></button>`;
  $('purse').innerHTML = (['gold', 'bells', 'crosses'] as const).map((k) => `<span title="${t(k)}">${icon(k, 26)}${P[k]}</span>`).join('');
  $('court').innerHTML = D.players.map((p, i) => `<button class="${i === me ? 'me' : ''}${i === who ? ' now' : ''}" data-sheet title="${Places.name(i)}: ${p.bells} ${t('bells').toLowerCase()}, ${p.crosses} ${t('crosses').toLowerCase()}${i === A.loyal ? `, ${t('loyalist').toLowerCase()}` : ''}">${Places.em(i, 38)}<span><b>${icon('bells', 18)}${p.bells}</b><small>${icon('crosses', 14)}${p.crosses}</small></span></button>`).join('') + `<button class="gear" data-menu title="${L('Options', 'Настройки')}" aria-label="${L('Options', 'Настройки')}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"><path d="M4 7h9m5 0h2M4 17h2m5 0h9"/><circle cx="15.500" cy="7" r="2.500"/><circle cx="8.500" cy="17" r="2.500"/></svg></button>`;
  const mine = Places.homes();
  $('king').hidden = !U.king || S.war >= 0 || !!S.card; $('king').innerHTML = `<h3>${t('ref')}</h3><dl><dt>${L('In the barracks', 'В казармах')}</dt><dd>${D.ref}</dd><dt>${L('Hostile settlements', 'Враждебные поселения')}</dt><dd>+${A.hostile}</dd><dt class="sum">${L('If the war came now', 'Если бы война началась сейчас')}</dt><dd class="sum">${A.pool}</dd><dt>${L('Patriot colonies', 'Колоний патриотов')}</dt><dd>${A.targets}</dd>${A.targets ? `<dt>${L('Redcoats on each', 'Красных на каждую')}</dt><dd>${Math.floor(A.pool / A.targets)}–${Math.ceil(A.pool / A.targets)}</dd>` : ''}${A.loyal === me ? '' : mine.map((c) => `<dt>${L('Your colony: attack / defence', 'Ваша колония: атака / защита')}</dt><dd>${(A.per[c.cell] || 0) * 2} / ${c.defence}</dd>`).join('')}</dl><p>${t('loyalist')}: <b>${A.loyal === null ? t('none') : Places.name(A.loyal)}</b>${A.loyal === me ? ` (${t('you')})` : ''}. ${L('It is the player with the fewest bells.', 'Это игрок с наименьшим числом колоколов.')}</p>`;
  $('sheet').className = `sheet${U.sheet ? ' on' : ''}`;
  $('sheet').innerHTML = `<button class="x" data-sheet>${t('close')}</button><h2>${t('rivals')}</h2>${D.players.map((p, i) => `<div class="riv${i === me ? ' me' : ''}">${Places.em(i, 44)}<span>${Places.name(i)}${i === me ? ` <small>(${t('you')})</small>` : ''}<small class="two-l"><span title="${L('Agents', 'Агенты')}">${icon('people', 15)}${p.agents}</span> <span title="${t('gold')}">${icon('gold', 15)}${p.gold}</span> <span title="${t('buildings')}">${icon('house', 15)}${p.buildings.length}</span> <span title="${t('fathers')}">${icon('father', 15)}${p.fathers.length}</span></small></span><span class="v" title="${t('bells')}">${icon('bells', 18)}${p.bells}</span><span class="v" title="${t('crosses')}">${icon('crosses', 18)}${p.crosses}</span></div>`).join('')}<h2 style="margin-top:20px">${t('log')}</h2><ul class="log">${D.log.slice().reverse().map((e) => { const l = logLine(e as Entry), at = placeOf(e as Entry); return l ? `<li${at === null ? '' : ` class="at" data-look="${at}" title="${L('Show on the map', 'Показать на карте')}"`}>${l}</li>` : ''; }).join('')}</ul>`;
}
/** The game menu (the gear, or Esc): first what is done to the game itself, then how it is shown. */
export function menu() {
  $('menu').hidden = !U.menu;
  if (!U.menu) return;
  const v = Board.view;
  const act = (attr: string, name: string, off = false, why = '') => `<button class="act" ${attr}${off ? ` disabled title="${why}"` : ''}>${name}</button>`;
  const seg = (name: string, list: [k: string, n: string, on?: boolean][]) => `<div class="row"><span>${name}</span><span class="set">${list.map(([k, n, on]) => `<button class="${on ? 'on' : ''}" ${on ? '' : k}>${n}</button>`).join('')}</span></div>`;
  const slide = ([k, n, lo, hi, u]: [keyof typeof v, string, number, number, string]) => `<label class="row"><span>${n}</span><input type="range" data-view-set="${k}" data-unit="${u}" min="${lo}" max="${hi}" value="${v[k]}"><output>${v[k]}${u}</output></label>`;
  $('menu').innerHTML = `${act('data-t-open="main"', L('Main menu', 'Главное меню'))}
${Sim.replay ? '' : `${act('data-save-file', L('Save to a file', 'Сохранить в файл'))}
${act('data-auto="round"', L('Automate round', 'Автоматизировать тур'), !!D.over, L('The war is over', 'Война окончена'))}`}
<h4>${L('Settings', 'Настройки')}</h4>
${seg(L('Language', 'Язык'), [['data-lang="en"', 'English', lang() === 'en'], ['data-lang="ru"', 'Русский', lang() === 'ru']])}
${seg(L('Other players', 'Другие игроки'), [['data-fast=""', L('Show each', 'Показывать'), !Sim.fast], ['data-fast="1"', L('At once', 'Сразу'), Sim.fast]])}
<h4>${L('Map', 'Карта')}</h4>
${seg(L('Camera', 'Камера'), [['data-cam="out" aria-label="−"', '−'], ['data-cam="in" aria-label="+"', '+'], ['data-cam="home"', L('Start', 'Начало')], ['data-cam="fit"', L('All', 'Всё')]])}
${seg(L('Tilt follows zoom', 'Наклон по масштабу'), [['data-follow="1"', L('On', 'Да'), !!v.auto], ['data-follow=""', L('Off', 'Нет'), !v.auto]])}
${slide(v.auto ? ['most', L('Closest tilt', 'Наклон вблизи'), 20, 70, '°'] : ['tilt', L('Tilt', 'Наклон'), 0, 45, '°'])}
${slide(['depth', L('Perspective', 'Перспектива'), 0, 100, '%'])}
${slide(['shift', L('Shift', 'Сдвиг'), -25, 25, '%'])}
${seg(L('Cell grid', 'Сетка'), [['data-grid=""', L('Off', 'Нет'), !Board.grid], ['data-grid="1"', L('On', 'Да'), Board.grid]])}
<button class="reset" data-reset>${L('Reset the map view', 'Сбросить вид карты')}</button>`;
}
