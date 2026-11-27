/* The end of the game: one of four endings (a patriot or the loyalist, who won or lost), the player's own game in numbers, and the final standings. */
import { $, D, me, msg, pick, t, type Text } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import { Sim, type Entry } from '../sim.ts';
import { S } from '../state.ts';
import { scoreTip } from './score.ts';
type Ending = 'patriotWon' | 'patriotLost' | 'loyalistWon' | 'loyalistLost';
/** Each ending: its picture, its title and the line under it. */
const ENDINGS: Record<Ending, { pic: string; title: Text; line: Text }> = {
  patriotWon: { pic: 'common_sense', title: msg('ending.independence'), line: msg('ending.colonies_stood') },
  patriotLost: { pic: 'prison_ships', title: msg('ending.rebellion_fails'), line: msg('ending.others_lead') },
  loyalistWon: { pic: 'seven_years_war', title: msg('ending.long_live'), line: msg('ending.colonies_stay') },
  loyalistLost: { pic: 'abandoned_fort', title: msg('ending.crown_s'), line: msg('ending.loyalty_went') },
};
const ordinal = (n: number) => t('ending.place', { n });
/** What the player did over the game, counted from the log. */
function stats(p: number) {
  const log = Sim.s.log as Entry[], mine = (e: string) => log.filter((x) => x.e === e && x.p === p);
  const sum = (e: string) => mine(e).reduce((n, x) => n + Math.max(0, Number(x.n) || 0), 0), pl = D.players[p]!;
  return [
    ['house', t('ending.colonies_founded'), mine('found').length],
    ['house', t('ending.buildings'), pl.buildings.length],
    ['father', t('ending.founding_fathers'), pl.fathers.length],
    ['bells', t('ending.bells_gained'), sum('bells')],
    ['gold', t('ending.gold_earned'), sum('gold')],
    ['people', t('ending.agents'), pl.agents],
    ['move', t('ending.lands_explored'), mine('reveal').length],
    ['sword', t('ending.attacks_made'), mine('attack').length],
  ] as const;
}
/** Shown once the sieges are told (the war box's last step). */
export function ending() {
  const el = $('ending'), over = D.over, w = D.war, open = !!over && !!w && S.war >= w.sieges.length;
  el.hidden = !open; if (!open || !over) { el.innerHTML = ''; return; }
  const r = over.players.find((x) => x.player === me)!, won = over.winners.includes(me);
  const kind: Ending = `${r.side}${won ? 'Won' : 'Lost'}` as Ending, e = ENDINGS[kind];
  const ranked = over.players.slice().sort((a, b) => Number(b.qualifies) - Number(a.qualifies) || b.score - a.score), place = ranked.findIndex((x) => x.player === me) + 1;
  const why = !r.qualifies ? t('ending.kept_no') : '';
  el.className = `ending ${kind}`;
  el.innerHTML = `<div class="ebox"><figure class="epic"><img src="art/event/${e.pic}.webp" alt=""></figure><div class="etext">
<p class="eside">${Places.em(me, 30)}${Places.name(me)} · ${t(r.side)}</p><h2>${pick(e.title)}</h2><p class="eline">${pick(e.line)}${why ? ` ${why}` : ''}</p>
<div class="escore"><strong>${r.score}${icon('vp', 30)}</strong><span>${ordinal(place)} ${t('ending.of', { length: ranked.length })}<small>${D.year}, ${t('ending.rounds', { round: D.round })}</small></span></div>
<ul class="estats">${stats(me).filter(([, , n]) => n > 0).map(([ic, name, n]) => `<li>${icon(ic, 22)}<b>${n}</b><span>${name}</span></li>`).join('')}</ul>
<ol class="erank">${ranked.map((x) => `<li class="${x.qualifies ? '' : 'out'}${x.player === me ? ' me' : ''}" title="${t(x.side)}, ${t('ending.kept', { n: x.colonies })}: ${scoreTip(x.parts)}">${Places.em(x.player, 28)}<b>${Places.name(x.player)}${over.winners.includes(x.player) ? ` ${icon('vp', 16)}` : ''}</b><span class="eic">${icon(x.side === 'loyalist' ? 'ref' : 'bells', 17)}</span><span class="eic">${icon('house', 17)}${x.colonies}</span><strong>${x.score}</strong></li>`).join('')}</ol>
<div class="eacts"><button data-war="0">${t('ending.review_war')}</button><button data-t-open="new">${t('newgame.new_game')}</button><button class="go" data-t-open="main">${t('top.main_menu')}</button></div></div></div>`;
}
