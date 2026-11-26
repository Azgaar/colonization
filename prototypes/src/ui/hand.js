/* Below the map: the hand of agents, the doors to the Colony and Europe, the goods and the pier. */
import { $, art, D, L, P, pick, RES, t } from '../data.js';
import { icon } from '../icons.js';
import { Places } from '../places.js';
import { Sim } from '../sim.js';
import { S, U } from '../state.js';
import { trait } from '../texts.js';
import { goods, heap, hull } from './goods.js';
export function hand(sp) {
  $('dw').style.backgroundImage = `url(${art.nation(P.nation)})`; $('dw').innerHTML = `<b>${t('colony')}</b>`;
  $('de').innerHTML = `<b>${t('europe')}</b><span class="who">${Sim.placed.filter((p) => /^(eu|pier|salon):/.test(p.space || '')).map((p) => `<span class="placed"><img src="${art.agent(p.card)}" alt=""></span>`).join('')}</span>`;
  const [wh, whl] = heap(P.wh, D.cap, 'wh'), hol = goods(P.hold), h = hull(); U.last = { wh: whl, hold: hol };
  $('heaps').innerHTML = `${h}<div title="${t('warehouse')}">${wh}</div>`;
  $('side').innerHTML = `<div class="faces">${D.pier.map(([x]) => `<img src="${art.agent(x)}" alt="${pick(D.agents[x])}">`).join('')}</div><div class="prices">${RES.map((r) => `<span>${icon(r, 24)}${D.price[r]}</span>`).join('')}</div>`;
  const turn = Sim.kind() === 'turn';
  $('hand').style.setProperty('--n', P.hand.length);
  $('hand').innerHTML = (P.hand.length ? P.hand.map((c, i) => `<button style="--k:${i - (P.hand.length - 1) / 2};--k2:${(i - (P.hand.length - 1) / 2) ** 2}" class="card${S.card === c ? ' sel' : ''}${S.drag === c ? ' drag' : ''}${S.card && sp[`who:${c}`] ? ' swap' : ''}" data-agent="${c}" data-space="who:${c}"><span class="b"><span class="nm">${pick(D.agents[c])}</span><span class="tr">${trait(c)}</span></span><img src="${art.agent(c)}" alt=""><span class="tip">${L('Exchange', 'Обмен')}</span></button>`).join('') : `<span class="over1">${D.over ? L('The war is over', 'Война окончена') : turn ? L('No agents left', 'Агентов не осталось') : L('Your round is over', 'Ваш тур окончен')}</span>`) + `<div class="acts">${Sim.canUndo() ? `<button class="undo" data-undo>${t('undo')}</button>` : ''}${turn ? `<button class="pass${P.hand.length ? '' : ' now'}" data-pass>${t('pass')}</button>` : ''}${turn && P.hand.length && P.crosses >= D.recruit ? `<button class="pass" data-recruit>${L('Recruit', 'Вербовка')} ${Places.plus(-D.recruit, 'crosses', 15)}</button>` : ''}</div>`;
}
