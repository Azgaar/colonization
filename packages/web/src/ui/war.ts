/* The war, colony by colony, on the map. */
import { scoreParts } from './score.ts';
import { $, D, L, pick, t } from '../data.ts';
import { Places } from '../places.ts';
import { S } from '../state.ts';
import type { Snapshot } from '../view.ts';
import { bar, dice } from './kit.ts';
type Siege = NonNullable<Snapshot['war']>['sieges'][number];
/** The chance that a colony holds, from the gap in strength and the King's tactic. */
const odds = (x: Siege, tactic: string) => { const n = Math.min(10, Math.max(0, x.attack.total - x.defence.total)), q = 2 / 3; return n === 0 ? 1 : tactic === 'extended_supply_lines' ? q ** n + (n * q ** (n - 1)) / 3 : tactic === 'surprise_assault' ? 0.5 ** n : q ** n; };
const kept = (n: number) => L(`${n} ${n === 1 ? 'colony' : 'colonies'} kept`, `колоний удержано: ${n}`);
export function war() {
  const w = D.war, over = D.over;
  if (S.war < 0 || !w) { $('war').innerHTML = ''; return; }
  const n = w.sieges.length, x = w.sieges[S.war], nav = `<nav class="wnav"><button data-war="${Math.max(0, S.war - 1)}">◂</button>${w.sieges.map((q, k) => `<button class="wd${k === S.war ? ' on' : ''}${k <= S.war && q.fell ? ' fell' : ''}" data-war="${k}">${Places.em(q.owner, 28)}</button>`).join('')}<button class="wd tx${S.war >= n ? ' on' : ''}" data-war="${n}">${t('result')}</button><button data-war="${Math.min(n, S.war + 1)}">▸</button><button class="tx" data-peace>${t('close')}</button></nav>`;
  const body = x ? `<div class="wl"><header>${Places.em(x.owner, 40)}<h3>${Places.name(x.owner)}</h3><span>${x.cubes} ${t('cubes')}</span><span class="dim">${t('odds')} ${(odds(x, w.tactic) * 100).toFixed(0)}%</span>${dice(x.dice || [])}<b class="out ${x.fell ? 'fell' : ''}">${x.fell ? (x.takenBy !== null && x.takenBy !== undefined ? `${L('Taken by', 'Захвачена')} ${Places.name(x.takenBy)}` : t('falls')) : t('holds')}</b></header>${bar(x.attack, 'atk')}${bar(x.defence, 'def')}</div>` : !over ? '' : `<div class="wscore">${over.players.slice().sort((a, b) => Number(b.qualifies) - Number(a.qualifies) || b.score - a.score).map((r) => `<div class="${r.qualifies ? '' : 'lost'}">${Places.em(r.player, 34)}<b>${Places.name(r.player)}${over.winners.includes(r.player) ? ' ♛' : ''}</b><span class="dim">${t(r.side).toLowerCase()}, ${kept(r.colonies)}</span><strong>${r.score}</strong><span class="parts">${scoreParts(r.parts)}</span></div>`).join('')}</div>${over.winners.length ? '' : `<p>${L('Nobody kept a colony. The Crown wins.', 'Никто не удержал колонию. Победила Корона.')}</p>`}`;
  $('war').innerHTML = `<p>${t('tactic')}: <b>${pick(D.names.tactics[w.tactic])}</b>. <b>${w.pool}</b> ${t('cubes')}. ${t('loyalist')}: <b>${w.loyalist === null ? t('none') : Places.name(w.loyalist)}</b></p>${body}${nav}`;
}
