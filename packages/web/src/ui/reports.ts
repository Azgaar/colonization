/* What happened, as large cards to read. */
import { art, D, me, pick, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import { Sim, type Entry } from '../sim.ts';
import { lang } from '../i18n.ts';
import { seal } from '../emblem.ts';
import { fx } from '../sound.ts';
import { X } from '../state.ts';
import { Texts } from '../texts.ts';
import { all, eventCard, lastPoi, poiCard, poiDef, rollOf } from './cards.ts';
import { bigCard, btn, dice, name } from './kit.ts';
import { Toast } from './toasts.ts';
import { hush, lines } from './notices.ts';
import { banner, card, colorOf, crest, fight, flip, lines as sides, men, stage } from './siege.ts';
/** What the player got: gold, bells, crosses and agents. */
const gains = (l: Entry[]): string[] => l.filter((e) => e.p === me && ['gold', 'bells', 'crosses'].includes(e.e)).map((e) => Places.plus(e.n, e.e)).concat(l.filter((e) => e.p === me && e.e === 'gainAgent').map((e) => pick(D.agents[e.agent])));
/** The war begins: who sides with the King, and who rises against him. */
const warStart = (e: Entry) => {
  const patriots = D.players.map((_, p) => p).filter((p) => p !== e.loyalist), you = (p: number) => (p === me ? ` (${t('you')})` : '');
  // Why the war began: a governor rang the bells of liberty, or the King would wait no longer; and why the loyalist sides with him.
  const rebels: number[] = e.rebels ?? [], bells: number[] = e.bells ?? [], list = (l: string[]) => new Intl.ListFormat(lang(), { type: 'conjunction' }).format(l);
  const why = e.reason === 'bells' && rebels.length ? t('war.declared', { who: list(rebels.map((p) => name(p))), n: `${Math.max(...rebels.map((p) => bells[p] ?? 0))} ${icon('bells', 16)}` }) : t('war.king_moves', { year: D.year });
  const side = e.loyalist === null ? t(e.tie ? 'war.no_loyalist_tie' : 'war.no_loyalist') : t('war.loyalist_why', { who: name(e.loyalist), n: `${bells[e.loyalist] ?? 0} ${icon('bells', 16)}` });
  // The two sides, each its emblems and its name on one line; who they are is said just above.
  const tile = (pics: string, role: string) => `<div class="wct"><span class="wpic">${pics}</span><b>${role}</b></div>`;
  return `<p class="wwhy">${why}</p><p class="wwhy">${side}</p><div class="wcard two">${tile(e.loyalist === null ? seal('king', 30) : Places.em(e.loyalist, 30), e.loyalist === null ? t('battle.king') : `${t('loyalist')}${you(e.loyalist)}`)}${tile(patriots.map((p) => Places.em(p, 30)).join(''), `${t(patriots.length === 1 ? 'patriot' : 'patriots')}${patriots.includes(me) ? ` (${t('you')})` : ''}`)}</div>`;
};
/** The King's tactic, drawn from its deck: the top card lifts off and turns over; under it, the army it leads. */
const tacticDraw = (e: Entry) => {
  const left = Math.min(5, Math.max(1, Object.keys(D.names.tactics).length - 1)), back = `<i class="tback">${icon('king', 34)}</i>`;
  return `<article class="rc war tdraw"><div class="in"><div class="tstage"><div class="tdeck">${back.repeat(left)}</div>`
    + `<div class="tcard">${back}<div class="tfront"><span class="tcrown">${icon('king', 30)}</span><b>${pick(D.names.tactics[e.tactic])}</b><span class="rule"></span><p>${Texts.tactic(e.tactic)}</p></div></div></div>`
    + `<h2>${t('tactic')}</h2><div class="rule"></div><div class="tx"><p class="tarmy">${men(Math.min(e.pool, 10))}<b>${e.pool}</b>${t('war.redcoats_n', { n: e.pool })}</p></div><div class="bts">${btn(t('reports.continue'), 'data-ok', 'go')}</div></div></article>`;
};
/** A fight the player was in, after the dice: the other side's agents turn over one by one, then the dice and what came of it. */
const fought = (e: Entry) => {
  const att = e.p === me, foe: number | null = att ? e.defender : e.p, my: string[] = att ? e.a : e.d, their: string[] = att ? e.d : e.a;
  const mine = att ? e.attack : e.defence, theirs = att ? e.defence : e.attack;
  // An agent's strength in this fight, as the engine counted it.
  const power = (ex: typeof mine, k: string) => ex.parts.find((q: { label: string }) => q.label === k)?.value ?? 0;
  const v = e.target === 'settlement' ? D.settlements.find((q) => q.cell === e.cell) : undefined;
  // The attacker's agent was seen when the attack began; the rest turn over.
  const seen = att ? 0 : 1, turning = their.length - seen, late = `style="--late:${(turning * 0.26 + 0.5).toFixed(2)}s"`;
  const won = e.hits > 0, word = att ? (won ? 'battle.won' : 'battle.repulsed') : won ? 'battle.lost' : 'battle.held';
  const left = banner(colorOf(me), crest(me), name(me), mine.total, false, sides(mine));
  const right = banner(foe === null ? '#6b4a2b' : colorOf(foe), foe === null ? `<img class="screst" src="${v ? art.tribe(v.tribe) : ''}" alt="">` : crest(foe), foe === null ? (v ? pick(D.names.tribes[v.tribe]) : '') : name(foe), theirs.total, false, sides(theirs), turning ? late : '', {
    // Before their cards turn: their effects and the agent seen, the rest still a question.
    total: theirs.parts.filter((q: { label: string }) => !D.agents[q.label] && q.label !== 'cards').reduce((n: number, q: { value: number }) => n + q.value, 0) + (seen ? power(theirs, their[0]!) : 0),
    hidden: true, lines: sides(theirs.parts.filter((q: { label: string }) => !D.agents[q.label] && q.label !== 'cards')),
  });
  const center = `<div class="slate" ${late}>${e.dice.length ? dice(e.dice) : ''}<b class="sverd ${(att ? won : !won) ? 'good' : 'bad'}">${t(word)}</b></div>${btn(t('reports.continue'), 'data-ok', 'go')}`;
  return stage(fight(e.target, e.cell, e.defender), left, my.map((k) => card(k, { w: 62, power: power(mine, k) })).join(''), center, right, their.map((k, i) => (i < seen ? card(k, { w: 62, power: power(theirs, k) }) : flip(foe, k, 62, power(theirs, k), 'turn', i - seen))).join(''));
};
export function results(l: Entry[]): string {
  const { by, ref } = lines(l), tribes = lines(l).tribes.map(({ v, p, what }) => `<li class="tr"><img class="chf" src="${art.tribe(v.tribe)}" alt=""><span><b>${pick(D.names.tribes[v.tribe])}</b> ${what} <span class="pl">${Places.em(p, 22)}<b>${name(p)}</b></span></span></li>`);
  const rows = [...by].map(([p, xs]) => `<li><span class="pl">${Places.em(p, 22)}<b>${name(p)}</b></span><span>${xs.join(', ')}</span></li>`).join('');
  return rows || tribes.length || ref ? `<ul class="who">${rows}${tribes.join('')}${ref ? `<li><span class="kg">${icon('king', 22)}</span><b>${t('ref')}</b><span>${Places.plus(ref, 'ref', 17)}</span></li>` : ''}</ul>` : '';
}
/** Turn news from the engine into large cards to read. The short notices are told apart (notices.ts). */
export function report(l: Entry[]) {
  l.forEach((e, i) => {
    const after = l.slice(i + 1);
    // The event that is asking a question right now shows itself.
    if (e.e === 'event') { const stop = after.findIndex((x) => ['round', 'tax', 'event'].includes(x.e)), got = stop < 0 ? after : after.slice(0, stop); if (!(Sim.mine() && D.event === e.id)) X.reports.push({ big: true, html: eventCard(e.id, results(got), btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'poi' && e.p === me && !after.some((x) => x.e === 'poi')) { const roll = after.find((x) => x.e === 'roll'), g = gains(after); if (Sim.kind() !== 'nodeChoice') X.reports.push({ big: true, html: poiCard(e, `<p>${all(poiDef(e).do)}</p>${g.length || roll ? `<p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${g.join(', ')}</p>` : ''}`, btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'choice' && e.p === me) { const roll = after.find((x) => x.e === 'roll'), g = gains(after), q = lastPoi(), o = q && poiDef(q).do.flatMap((n) => (n.n === 'choice' ? n.options : [])).find((x) => x.id === e.option), hit = roll && rollOf(o?.do)?.table.find((x) => roll.die <= x.max), home = after.some((x) => x.e === 'toEurope' && x.p === me); if (q && o && (roll || g.length || home) && !after.some((x) => x.e === 'poi')) X.reports.push({ big: true, html: poiCard(q, `<h3>${pick([o.en, o.ru])}</h3><p class="bigp">${roll ? `${dice([roll.die], [])} ` : ''}${(hit ? all(hit.do) : all(o.do)) || t('cards.nothing')}</p>`, btn(t('reports.continue'), 'data-ok', 'go')) }); }
    if (e.e === 'combat' && (e.p === me || e.defender === me)) X.reports.push({ big: true, after: null, html: fought(e) });
    if (e.e === 'war') X.reports.push({ big: true, after: () => fx('reveal', 0.6), html: bigCard('war', e.reason === 'bells' ? 'art/role/rivalry.webp' : 'art/role/royalist.webp', t('war'), `${D.year}`, warStart(e), btn(t('reports.continue'), 'data-ok', 'go')) }, { big: true, html: tacticDraw(e) });
  });
}
/** Reports and notifications that no longer matter: after undo, a skipped round, a new game. */
export function clearNews() { X.reports = []; X.key = ''; hush(); Toast.clear(); }
