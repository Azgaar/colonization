/* Below the map: the hand of agents, the doors to the Colony and Europe, the goods and the pier. */
import { $, art, D, L, P, pick, RES, t } from '../data.ts';
import { eduIcon, icon } from '../icons.ts';
import { Places, type Spaces } from '../places.ts';
import { Sim } from '../sim.ts';
import { S, U } from '../state.ts';
import { traits } from '../texts.ts';
import { goods, heap } from './goods.ts';
/** A long name or talent (Russian ones often are) gets smaller until it fits its card, down to `least` pixels. */
function fit(el: HTMLElement, least = el.classList.contains('nm') ? 9.5 : 10.5) {
  el.style.fontSize = ''; el.classList.remove('two');
  // Icons keep their size, so a second or third try may be needed.
  // A pixel to spare: widths are rounded, and a clipped name shows an ellipsis.
  for (let i = 0; i < 3 && el.scrollWidth >= el.clientWidth; i++) {
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size <= least) break;
    el.style.fontSize = `${Math.max(least, Math.floor(size * ((el.clientWidth - 2) / el.scrollWidth) * 10) / 10)}px`;
  }
  // A talent that still does not fit takes two lines.
  if (el.scrollWidth >= el.clientWidth && el.classList.contains('tr')) { el.classList.add('two'); el.style.fontSize = '12px'; }
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
  $('hand').innerHTML = (P.hand.length ? P.hand.map((c, i) => `<button style="--k:${i - (P.hand.length - 1) / 2};--k2:${(i - (P.hand.length - 1) / 2) ** 2}" class="card${S.card === c ? ' sel' : ''}${S.drag === c ? ' drag' : ''}${S.card && sp[`who:${c}`] ? ' swap' : ''}" data-agent="${c}" data-space="who:${c}"><span class="b"><span class="nm"><span class="edu">${eduIcon(D.agents[c].edu)}</span>${pick(D.agents[c])}</span></span><span class="pic"><img src="${art.agent(c)}" alt=""><span class="tr">${traits(c).map((x) => `<i>${x}</i>`).join(' ')}</span></span><span class="tip">${L('Exchange', 'Обмен')}</span></button>`).join('') : `<span class="over1">${D.over ? L('The war is over', 'Война окончена') : turn ? L('No agents left', 'Агентов не осталось') : L('Your round is over', 'Ваш тур окончен')}</span>`) + `<div class="acts">${Sim.canUndo() ? `<button class="undo" data-undo>${t('undo')}</button>` : ''}${turn ? `<button class="pass${P.hand.length ? '' : ' now'}" data-pass>${t('pass')}</button>` : ''}${turn && P.hand.length && P.crosses >= D.recruit ? `<button class="pass" data-recruit>${L('Recruit', 'Вербовка')} ${Places.plus(-D.recruit, 'crosses', 15)}</button>` : ''}</div>`;
  $('hand').querySelectorAll<HTMLElement>('.card .nm, .card .tr').forEach((el) => fit(el));
}
