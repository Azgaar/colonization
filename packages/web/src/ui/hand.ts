/* Below the map: the hand of agents, the doors to the Colony and Europe, the goods and the pier. */
import { $, art, D, L, P, pick, RES, t } from '../data.ts';
import { eduIcon, icon } from '../icons.ts';
import type { Spaces } from '../places.ts';
import { Sim } from '../sim.ts';
import { S, U } from '../state.ts';
import { traits } from '../texts.ts';
import { goods, heap } from './goods.ts';
/** A long name or talent (Russian ones often are) gets smaller until it fits its card, down to `least` pixels. */
/** Small marks on the action buttons: a turning arrow for undo, the compass star for advice. */
const UNDO = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M9 14 4 9l5-5" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/></svg>';
const STAR = '<svg viewBox="-12 -12 24 24" width="17" height="17" aria-hidden="true"><path d="M0-11 2.500-2.500 11 0 2.500 2.500 0 11-2.500 2.500-11 0-2.500-2.500Z" fill="#edb443"/></svg>';
function fit(el: HTMLElement, least = el.classList.contains('nm') ? 9.5 : 10.5) {
  el.style.fontSize = ''; el.classList.remove('two');
  // Not laid out (the table is covered): nothing to measure, so the name keeps its size until the next drawing.
  if (!el.clientWidth) return;
  // The width of the text itself, not of its box: a line that fills its box exactly reports the box's width, and would shrink for nothing.
  // Measured on the screen, where the card may be turned a little, then scaled back to the box.
  const need = () => { const r = document.createRange(); r.selectNodeContents(el); const a = r.getBoundingClientRect().width, b = el.getBoundingClientRect().width; return b ? (a / b) * el.offsetWidth : 0; };
  // A pixel to spare: widths are rounded, and a clipped name shows an ellipsis.
  const room = el.clientWidth - 1;
  // Icons keep their size, so a second or third try may be needed.
  for (let i = 0; i < 3 && need() > room; i++) {
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size <= least) break;
    el.style.fontSize = `${Math.max(least, Math.floor(size * (room / need()) * 10) / 10)}px`;
  }
  // A talent that still does not fit takes two lines.
  if (need() > room && el.classList.contains('tr')) { el.classList.add('two'); el.style.fontSize = '12px'; }
}
export function hand(sp: Spaces) {
  $('dw').style.backgroundImage = `url(${art.nation(P.nation)})`; $('dw').innerHTML = `<b>${t('colony')}</b>`;
  $('de').innerHTML = `<b>${t('europe')}</b><span class="who">${Sim.placed.filter((p) => /^(eu|pier|salon):/.test(p.space || '')).map((p) => `<span class="placed"><img src="${art.agent(p.card)}" alt=""></span>`).join('')}</span>`;
  // The hold is shown when the ship is hovered; beside the door only the warehouse.
  const [wh, whl] = heap(P.wh, D.cap, 'wh'); U.last = { wh: whl, hold: goods(P.hold) };
  $('heaps').innerHTML = `<div title="${t('warehouse')}">${wh}</div>`;
  $('side').innerHTML = `<div class="faces">${D.pier.map(([x]) => `<img src="${art.agent(x)}" alt="${pick(D.agents[x])}">`).join('')}</div><div class="prices">${RES.map((r) => `<span>${icon(r, 24)}${D.price[r]}</span>`).join('')}</div>`;
  const turn = Sim.kind() === 'turn';
  $('hand').style.setProperty('--n', `${P.hand.length}`); $('hand').style.setProperty('--pc', P.color);
  $('hand').innerHTML = (P.hand.length ? P.hand.map((c, i) => `<button style="--k:${i - (P.hand.length - 1) / 2};--k2:${(i - (P.hand.length - 1) / 2) ** 2}" class="card${S.card === c ? ' sel' : ''}${S.drag === c ? ' drag' : ''}${S.card && sp[`who:${c}`] ? ' swap' : ''}" data-agent="${c}" data-space="who:${c}"><span class="b"><span class="nm"><span class="edu">${eduIcon(D.agents[c].edu)}</span>${pick(D.agents[c])}</span></span><span class="pic"><img src="${art.agent(c)}" alt=""><span class="tr">${traits(c).map((x) => `<i>${x}</i>`).join(' ')}</span></span><span class="tip">${L('Exchange', 'Обмен')}</span></button>`).join('') : `<span class="over1">${D.over ? L('The war is over', 'Война окончена') : turn ? L('No agents left', 'Агентов не осталось') : L('Your round is over', 'Ваш тур окончен')}</span>`) + `<div class="acts">${Sim.canUndo() ? `<button class="undo" data-undo>${UNDO}${t('undo')}</button>` : ''}${turn && P.hand.length ? `<button class="advise" data-advise title="${L('Ask the advisor for its best move; it can play the whole action', 'Спросить совета: советник может сыграть всё действие')}">${STAR}${L('Advice', 'Совет')}</button>` : ''}${turn ? `<button class="pass${P.hand.length ? '' : ' now'}" data-pass>${t('pass')}</button>` : ''}</div>`;
  $('hand').querySelectorAll<HTMLElement>('.card .nm, .card .tr').forEach((el) => fit(el));
}
