/* The war, colony by colony, on the map. */
import { $, D, L, pick, t } from '../data.js';
import { Places } from '../places.js';
import { S } from '../state.js';
import { bar, dice } from './kit.js';
const odds = (x) => { const n = Math.min(10, Math.max(0, x.attack.total - x.defence.total)), q = 2 / 3; return n === 0 ? 1 : D.war.tactic === 'extended_supply_lines' ? q ** n + (n * q ** (n - 1)) / 3 : D.war.tactic === 'surprise_assault' ? 0.5 ** n : q ** n; };
const kept = (n) => L(`${n} ${n === 1 ? 'colony' : 'colonies'} kept`, `колоний удержано: ${n}`);
export function war() {
  if (S.war < 0) { $('war').innerHTML = ''; return; }
  const n = D.war.sieges.length, x = D.war.sieges[S.war], nav = `<nav class="wnav"><button data-war="${Math.max(0, S.war - 1)}">◂</button>${D.war.sieges.map((q, k) => `<button class="wd${k === S.war ? ' on' : ''}${k <= S.war && q.fell ? ' fell' : ''}" data-war="${k}">${Places.em(q.owner, 28)}</button>`).join('')}<button class="wd tx${S.war >= n ? ' on' : ''}" data-war="${n}">${t('result')}</button><button data-war="${Math.min(n, S.war + 1)}">▸</button><button class="tx" data-peace>${t('close')}</button></nav>`;
  const body = x ? `<div class="wl"><header>${Places.em(x.owner, 40)}<h3>${Places.name(x.owner)}</h3><span>${x.cubes} ${t('cubes')}</span><span class="dim">${t('odds')} ${(odds(x) * 100).toFixed(0)}%</span>${dice(x.dice || [])}<b class="out ${x.fell ? 'fell' : ''}">${x.fell ? (x.takenBy !== null && x.takenBy !== undefined ? `${L('Taken by', 'Захвачена')} ${Places.name(x.takenBy)}` : t('falls')) : t('holds')}</b></header>${bar(x.attack, 'atk')}${bar(x.defence, 'def')}</div>` : `<div class="wscore">${D.over.players.slice().sort((a, b) => b.qualifies - a.qualifies || b.score - a.score).map((r) => `<div class="${r.qualifies ? '' : 'lost'}">${Places.em(r.player, 34)}<b>${Places.name(r.player)}${D.over.winners.includes(r.player) ? ' ♛' : ''}</b><span class="dim">${t(r.side).toLowerCase()}, ${kept(r.colonies)}</span><strong>${r.score}</strong></div>`).join('')}</div>${D.over.winners.length ? '' : `<p>${L('Nobody kept a colony. The Crown wins.', 'Никто не удержал колонию. Победила Корона.')}</p>`}`;
  $('war').innerHTML = `<p>${t('tactic')}: <b>${pick(D.names.tactics[D.war.tactic])}</b>. <b>${D.war.pool}</b> ${t('cubes')}. ${t('loyalist')}: <b>${D.war.loyalist === null ? t('none') : Places.name(D.war.loyalist)}</b></p>${body}${nav}`;
}
