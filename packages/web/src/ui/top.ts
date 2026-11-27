/* The top line, the King's army box, the Governors sheet and the game menu. */
import { Sprite } from '../map/sprites.ts';
import { $, cap, D, me, P, t } from '../data.ts';
import type { Entry } from '../sim.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import { Dev, Sim } from '../sim.ts';
import { outlook } from '../forecast.ts';
import { S, U } from '../state.ts';
import { live, pages, year } from './notices.ts';
import { named } from './score.ts';
import { face } from './toasts.ts';
import { settings } from './settings.ts';
/** The Royal Army's sign in the top line: one of its grenadiers. */
const SOLDIER = `<svg class="ic" viewBox="0 0 64 64" width="22" height="22" aria-hidden="true">${Sprite.redcoat()}</svg>`;
export function top() {
  const A = Places.army(), f = Math.PI * 2 * (D.round / 10), who = D.over ? null : Sim.busy ? D.turnOf : D.pending ? me : D.turnOf;
  $('date').innerHTML = `<svg class="dial" viewBox="0 0 46 46"><circle cx="23" cy="23" r="18" fill="none" stroke="#ffffff38" stroke-width="7"/><path d="M23 5A18 18 0 ${D.round > 5 ? 1 : 0} 1 ${23 + 18 * Math.sin(f)} ${23 - 18 * Math.cos(f)}" fill="none" stroke="#edb443" stroke-width="7"/><text x="23" y="29" text-anchor="middle" font-size="17" font-weight="800" fill="#f7f1e1">${D.round}</text></svg><div><b>${D.year}</b></div><button class="king" data-king title="${t('ref')}">${icon('king', 30)}<span class="rl"><span>${t('top.tax_line')} <b>${D.tax}</b>${icon('gold', 17)}</span><span>${t('top.army_line')} <b>${A.ref}</b>${SOLDIER}</span></span></button>`;
  $('purse').innerHTML = (['gold', 'bells', 'crosses'] as const).map((k) => `<span title="${t(k)}">${icon(k, 26)}${P[k]}</span>`).join('');
  $('court').innerHTML = D.players.map((p, i) => `<button class="${i === me ? 'me' : ''}${i === who ? ' now' : ''}" data-sheet title="${Places.name(i)}. ${t('vp')}: ${p.score}${i === A.loyal ? `. ${t('top.likely_loyalist')}` : ''}">${Places.em(i, 38)}${i === A.loyal ? `<span class="loy">${icon('king', 11)}</span>` : ''}<b data-vp="${i}">${icon('vp', 17)}${p.score}</b></button>`).join('') + `<button class="gear" data-menu title="${t('title.options')}" aria-label="${t('title.options')}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"><path d="M4 7h9m5 0h2M4 17h2m5 0h9"/><circle cx="15.500" cy="7" r="2.500"/><circle cx="8.500" cy="17" r="2.500"/></svg></button>`;
  const mine = Places.homes();
  $('king').hidden = !U.king || S.war >= 0 || !!S.card; $('king').innerHTML = `<h3>${t('ref')}</h3><dl><dt>${t('top.barracks')}</dt><dd>${D.ref}</dd><dt>${t('top.hostile_settlements')}</dt><dd>+${A.hostile}</dd><dt class="sum">${t('forecast')}</dt><dd class="sum">${A.pool}</dd><dt>${t('top.patriot_colonies')}</dt><dd>${A.targets}</dd>${A.targets ? `<dt>${t('top.redcoats')}</dt><dd>${Math.floor(A.pool / A.targets)}–${Math.ceil(A.pool / A.targets)}</dd>` : ''}${A.loyal === me ? '' : mine.map((c) => `<dt>${t('top.colony_attack')}</dt><dd>${(A.per[c.cell] || 0) * 2} / ${c.defence}</dd>`).join('')}</dl><p>${t('loyalist')}: <b>${A.loyal === null ? t('none') : Places.name(A.loyal)}</b>${A.loyal === me ? ` (${t('you')})` : ''}. ${t('top.player_fewest')}</p>`;
  $('vpbox').hidden = U.vp === null || S.war >= 0 || !!S.card; $('vpbox').classList.toggle('by-sheet', U.sheet); if (U.vp !== null) $('vpbox').innerHTML = points(U.vp);
  $('sheet').className = `sheet${U.sheet ? ' on' : ''}`;
  $('sheet').innerHTML = `<button class="x" data-sheet>${t('close')}</button><h2>${t('rivals')}</h2>${D.players.map((p, i) => `<div class="riv${i === me ? ' me' : ''}">${Places.em(i, 44)}<span>${Places.name(i)}${i === me ? ` <small>(${t('you')})</small>` : ''}<small class="two-l"><span title="${t('top.agents')}">${icon('population', 15)}${p.agents}</span> <span title="${t('gold')}">${icon('gold', 15)}${p.gold}</span> <span title="${t('buildings')}">${icon('colony', 15)}${p.buildings.length}</span> <span title="${t('fathers')}">${icon('fathers', 15)}${p.fathers.length}</span> <span title="${t('bells')}">${icon('bells', 15)}${p.bells}</span> <span title="${t('crosses')}">${icon('crosses', 15)}${p.crosses}</span></small></span><span class="v" data-vp="${i}" title="${t('vp')}">${icon('vp', 26)}${p.score}</span></div>`).join('')}${U.sheet && Dev.forecast ? foresight() : ''}${U.sheet ? chronicle() : ''}`;
}
/** The Chronicle: the notices of the game, a page per round, the latest first shown. */
function chronicle() {
  const all = pages(Sim.s.log as Entry[], live()).filter((p, i, l) => p.notes.some((n) => n.only !== 'toast') || i === l.length - 1);
  const i = Math.max(0, U.page === null ? all.length - 1 : all.findIndex((p) => p.id === U.page)), pg = all[i];
  if (!pg) return '';
  const go = (k: number, sign: string) => `<button data-page="${k === all.length - 1 ? '' : all[k]?.id ?? ''}"${all[k] ? '' : ' disabled'} aria-label="${sign === '‹' ? t('top.earlier') : t('top.later')}">${sign}</button>`;
  const notes = pg.notes.filter((n) => n.only !== 'toast').map((n) => `<li class="toast on ${n.tone ?? ''}${n.cell === undefined ? '' : ' at'}"${n.cell === undefined ? '' : ` data-look="${n.cell}" title="${t('top.show_map')}"`}>${face(n)}</li>`).join('');
  return `<div class="chron"><h2>${t('log')}</h2><span class="pg">${go(i - 1, '‹')}<b>${pg.war ? t('war') : `${t('round')} ${pg.round}`}${pg.war ? '' : ` <small>${year(pg.round)}</small>`}</b>${go(i + 1, '›')}</span></div><ul class="news">${notes || `<li class="none">${t('top.nothing_yet')}</li>`}</ul>`;
}
/** Where a governor's victory points come from, if the game ended now: each source with its count and rate, then the total. */
function points(i: number) {
  const p = D.players[i], sc = D.settings.score, part = (l: string) => p.parts.find((x) => x.label === l)?.value ?? 0, loyal = D.war?.loyalist === i;
  const rate = loyal ? sc.loyalistColony : sc.patriotColony;
  // Fathers may change how much gold a point costs (Jakob Fugger).
  const perGold = p.fathers.flatMap((f) => Sim.s.def.fathers[f].mods).reduce((n, m) => (m.mod === 'goldPerPoint' ? Math.min(n, m.value) : n), sc.goldPerPoint);
  const row = (ic: string, l: string, calc: string) => `<dt>${icon(ic, 18)}${cap(named(l))}</dt><dd class="calc">${calc}</dd><dd>${part(l)}</dd>`;
  const own = ['colonies', 'bells', 'agents', 'gold', 'buildings', 'fathers'];
  return `<h3>${Places.em(i, 30)}${Places.name(i)}</h3><dl>${row('colony', 'colonies', `${part('colonies') / rate} × ${rate}`)}${loyal ? '' : row('bells', 'bells', `${p.bells} × ${sc.perBell}`)}${row('population', 'agents', `${p.agents} ÷ ${sc.agentsPerPoint}`)}${row('gold', 'gold', `${p.gold} ÷ ${perGold}`)}${row('colony', 'buildings', `${p.buildings.length} × ${sc.building}`)}${row('fathers', 'fathers', `${p.fathers.length} × ${sc.father}`)}
${p.parts.filter((x) => !own.includes(x.label)).map((x) => `<dt>${cap(named(x.label))}</dt><dd class="calc"></dd><dd>${x.value}</dd>`).join('')}<dt class="sum">${icon('vp', 20)}${t('vp')}</dt><dd class="sum calc"></dd><dd class="sum">${p.score}</dd></dl><p>${t('top.vp_note')}</p>`;
}
/** The forecast (FR-U-15): expected scores, the likely loyalist, and how the shown player's colonies would fare in the war. Only worked out while the sheet is open. */
function foresight() {
  const o = outlook(); if (!o) return '';
  const pc = (x: number) => `${Math.round(x * 100)}%`;
  const rows = o.players.map((x, i) => `<div class="fc"><span>${Places.em(i, 26)}${Places.name(i)}${i === o.loyalist ? `<span class="loy" title="${t('top.likely_loyalist')}">${icon('king', 18)}</span>` : ''}</span><b title="${t('top.expected_final')}">≈ ${x.points}</b><span title="${t('top.chance_keep')}">${pc(x.keeps)}</span></div>`).join('');
  const cols = o.colonies.map((c, k) => `<div class="fc col"><span>${t('colony')} ${k + 1}</span><span title="${t('top.attack_defence')}">${c.now.attack}/${c.defence} · ${pc(c.now.hold)}</span><span title="${t('top.expected_war')}">${c.then.attack}/${c.defence} · ${pc(c.then.hold)}</span></div>`).join('');
  return `<h2 style="margin-top:20px">${t('top.forecast')}</h2><p class="fnote">${o.rounds ? t('top.war_expected', { warRound: o.warRound }) : t('top.war_comes')}</p>
<div class="fc head"><span></span><span>${t('top.score')}</span><span>${t('top.keeps_colony')}</span></div>${rows}
${cols ? `<div class="fc head"><span>${t('top.colonies')}</span><span>${t('top.now')}</span><span>${t('top.war')}</span></div>${cols}<p class="fnote">${t('top.attack_defence2')}</p>` : ''}`;
}
/** The game menu (the gear, or Esc): first what is done to the game itself, then how it is shown. */
export function menu() {
  $('menu').hidden = !U.menu;
  if (!U.menu) return;
  const act = (attr: string, name: string, off = false, why = '') => `<button ${attr}${off ? ` disabled title="${why}"` : ''}>${name}</button>`;
  $('menu').innerHTML = `<div class="do">${act('data-t-open="main"', t('top.main_menu'))}
${Sim.replay ? '' : `${act('data-save-file', t('top.save_file'))}
${act('data-auto="round"', t('top.automate_round'), !!D.over, t('hand.war_over'))}`}
${act('data-guide', t('newgame.rules'))}</div>${settings(true)}`;
}
