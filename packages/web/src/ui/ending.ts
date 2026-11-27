/* The end of the game: one of four endings (a patriot or the loyalist, who won or lost), the player's own game in numbers, and the final standings. */
import { $, art, D, me, msg, pick, t, type Text } from '../data.ts';
import { icon, SHAPES } from '../icons.ts';
import { Places } from '../places.ts';
import { Sim, type Entry } from '../sim.ts';
import { S } from '../state.ts';
import { named } from './score.ts';
type Ending = 'patriotWon' | 'patriotLost' | 'loyalistWon' | 'loyalistLost';
/** Each ending: its picture, its title and the line under it. */
const ENDINGS: Record<Ending, { pic: string; title: Text; line: Text }> = {
  patriotWon: { pic: 'common_sense', title: msg('ending.independence'), line: msg('ending.colonies_stood') },
  patriotLost: { pic: 'prison_ships', title: msg('ending.rebellion_fails'), line: msg('ending.others_lead') },
  loyalistWon: { pic: 'seven_years_war', title: msg('ending.long_live'), line: msg('ending.colonies_stay') },
  loyalistLost: { pic: 'abandoned_fort', title: msg('ending.crown_s'), line: msg('ending.loyalty_went') },
};
const ordinal = (n: number) => t('ending.place', { n });
/** A building, for the column of points from buildings (the icons have none). */
const BUILDING = '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 21V11l5-3.500V11l5-3.500V11l5-3.500V4h3v17Z" fill="currentColor"/></svg>';
/** An alliance with a village: its tipi. */
const TIPI = '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3 3.500 21h17Z" fill="currentColor"/><path d="M12 13l-2.500 8h5Z" fill="#0f3436"/><path d="M10 3l2 3 2-3" stroke="currentColor" stroke-width="1.500" fill="none"/></svg>';
/** Where points come from, in the order of the standings' columns, each with its sign. A Father's own bonus (Bolívar) gets his portrait. */
const ORDER = ['colonies', 'bells', 'agents', 'gold', 'buildings', 'fathers', 'alliances'];
const sign = (l: string) => (l === 'buildings' ? BUILDING : l === 'colonies' ? icon('house', 18) : l === 'agents' ? icon('people', 18) : l === 'alliances' ? TIPI : D.fathers[l] ? `<img class="efather" src="${art.father(l)}" alt="">` : icon(l === 'fathers' ? 'father' : l, 18));
/** The player's game as a history: everyone's score round by round (the player's line in front), the war at the end,
 * and under the rounds what the player did in them: colonies founded, buildings built, Fathers won. */
function history(p: number) {
  const log = Sim.s.log as Entry[], rounds = log.filter((x) => x.e === 'round') as (Entry & { n: number; scores: number[] })[];
  const final = D.over!.players, n = rounds.length + 1, W = 560, H = 120, L = 6, R = 10, top = 10, bot = 22;
  const most = Math.max(1, ...final.map((x) => x.score), ...rounds.flatMap((r) => r.scores));
  const X = (k: number) => L + (k / (n - 1 || 1)) * (W - L - R), Y = (v: number) => top + (1 - v / most) * (H - top - bot);
  const line = (q: number) => [...rounds.map((r, k) => `${X(k).toFixed(1)},${Y(r.scores[q] ?? 0).toFixed(1)}`), `${X(n - 1).toFixed(1)},${Y(final.find((x) => x.player === q)!.score).toFixed(1)}`].join(' ');
  const others = D.players.map((_, q) => (q === p ? '' : `<polyline points="${line(q)}" fill="none" stroke="${D.players[q]!.color}" stroke-width="2" stroke-opacity=".45" stroke-linejoin="round"/>`)).join('');
  const yr = (k: number) => D.settings.rounds.firstYear + (rounds[k]!.n - 1) * D.settings.rounds.yearStep;
  const ticks = rounds.map((_, k) => (k % 2 === 0 ? `<text x="${X(k).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#f7f1e1" fill-opacity=".6">${yr(k)}</text>` : '')).join('') + `<svg x="${(X(n - 1) - 14).toFixed(1)}" y="${H - 18}" width="14" height="14" viewBox="0 0 24 24" color="#ff9a82"><title>${t('war')}</title>${SHAPES.sword}</svg>`;
  const mine = `<polyline points="${line(p)}" fill="none" stroke="${D.players[p]!.color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${line(p)}" fill="none" stroke="#fff" stroke-width="1" stroke-opacity=".6" stroke-linejoin="round"/>`;
  // What the player did, round by round.
  const acts: string[][] = rounds.map(() => []); let k = -1;
  for (const x of log) {
    if (x.e === 'round') k++;
    else if (k >= 0 && x.p === p && x.e === 'found') acts[k]!.push(`<i title="${t('ending.colonies_founded')}">${icon('house', 15)}</i>`);
    else if (k >= 0 && x.p === p && x.e === 'build') acts[k]!.push(`<img src="${art.building(String(x.building))}" alt="" title="${pick(D.buildings[String(x.building)] ?? ['', ''])}">`);
    else if (k >= 0 && x.p === p && x.e === 'father') acts[k]!.push(`<img class="f" src="${art.father(String(x.father))}" alt="" title="${pick(D.fathers[String(x.father)] ?? ['', ''])}">`);
  }
  const marks = acts.map((l, q) => (l.length ? `<span class="emark" style="left:${((X(q) / W) * 100).toFixed(2)}%">${l.join('')}</span>` : '')).join('');
  return `<div class="ehist"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${rounds.map((_, q) => `<line x1="${X(q).toFixed(1)}" x2="${X(q).toFixed(1)}" y1="${top}" y2="${H - bot}" stroke="#fff" stroke-opacity=".07"/>`).join('')}<line x1="${X(n - 1).toFixed(1)}" x2="${X(n - 1).toFixed(1)}" y1="${top}" y2="${H - bot}" stroke="#ff9a82" stroke-opacity=".5" stroke-dasharray="3 3"/>${others}${mine}${ticks}</svg><div class="emarks">${marks}</div></div>`;
}
/** Everyone's points by where they came from: a column for each source anyone scored from, the best in each lit, the total last. */
function standings(ranked: NonNullable<typeof D.over>['players']) {
  const over = D.over!, labels = [...new Set(ranked.flatMap((x) => x.parts.map((q) => q.label)))].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  const val = (x: (typeof ranked)[number], l: string) => x.parts.find((q) => q.label === l)?.value ?? 0, best = labels.map((l) => Math.max(...ranked.map((x) => val(x, l))));
  const cols = `grid-template-columns:30px minmax(0,1fr) repeat(${labels.length},40px) 64px`;
  const head = `<li class="ehead" style="${cols}"><span></span><span></span>${labels.map((l) => `<span title="${named(l)}">${sign(l)}</span>`).join('')}<span>${icon('vp', 20)}</span></li>`;
  return `<ol class="erank">${head}${ranked.map((x) => `<li class="${x.qualifies ? '' : 'out'}${x.player === me ? ' me' : ''}" style="${cols}"><span class="eem">${Places.em(x.player, 28)}${x.side === 'loyalist' ? `<span class="loy" title="${t('loyalist')}">${icon('ref', 11)}</span>` : ''}</span><b>${Places.name(x.player)}${over.winners.includes(x.player) ? ` <span title="${t('ending.winner')}">${icon('cup', 17)}</span>` : ''}</b>${labels.map((l, q) => { const v = val(x, l); return `<span class="${v && v === best[q] ? 'best' : ''}">${v || '–'}</span>`; }).join('')}<strong>${x.score}</strong></li>`).join('')}</ol>`;
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
${history(me)}
${standings(ranked)}
<div class="eacts"><button data-war="0">${t('ending.review_war')}</button><button class="go" data-t-open="main">${t('top.main_menu')}</button></div></div></div>`;
}
