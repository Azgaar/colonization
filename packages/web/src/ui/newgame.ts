/* The new game screen (FR-U-1): the player's nation, the rivals and their characters, the rules and the seed. */
import { emblem } from '../emblem.ts';
import type { Personality } from '@col/bots';
import { art, D, msg, pick, t, type Text } from '../data.ts';
import { icon } from '../icons.ts';
import { paint } from '../paint.ts';
import { NATIONS, PERSONALITY_NAMES, RULESETS, Sim } from '../sim.ts';
import { U } from '../state.ts';
import { traits } from '../texts.ts';
import { startGame } from './setup.ts';
import { coachFromStart } from './tutorial.ts';

/** Who plays a rival seat: a person at this screen (hot-seat), or a bot at a difficulty that changes how well it thinks, never what it gets (FR-A-6). */
export const WHO: Record<string, Text> = { person: msg('sandbox.person'), easy: msg('newgame.easy'), normal: msg('newgame.normal'), hard: msg('newgame.hard'), expert: msg('newgame.expert') };
/** The form as it is filled in. The rules are board's unless the design bench opened the screen with others. */
const form = { nation: 'french', n: 4, rivals: [] as { nation: string; bot: Personality; who: string }[], ruleset: 'board', seed: '' };

/** A nation's emblem in its colour, for a nation that may not be in the game yet. */
export const crest = (nation: string, size = 40) => emblem(nation, size);
const name = (k: string) => pick(D.names.nations[k] ?? [k, k]);
/** The nations from the easiest to the hardest. */
const byStars = () => [...NATIONS].sort((a, b) => (D.nations[a]?.stars ?? 0) - (D.nations[b]?.stars ?? 0));
const stars = (n: number) => `<span class="stars" title="${t('newgame.difficulty')} ${n}/5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
const hardness = (n: number) => pick(n <= 1 ? msg('newgame.regular_game') : n === 2 ? msg('newgame.little_harder') : n === 3 ? msg('newgame.hard2') : msg('newgame.experienced_governors'));
/** Keep the rivals to the number of players, each with a nation of its own. */
function fit() {
  const used = new Set([form.nation]);
  form.rivals = form.rivals.filter((r) => r.nation !== form.nation && !used.has(r.nation) && used.add(r.nation)).slice(0, form.n - 1);
  for (const k of NATIONS) { if (form.rivals.length >= form.n - 1) break; if (!used.has(k)) { used.add(k); form.rivals.push({ nation: k, bot: PERSONALITY_NAMES[form.rivals.length % 4], who: 'normal' }); } }
}
/** Open the screen, starting from the last game's setup; the design bench passes the rules to play. */
export function openNewGame(ruleset = 'board') {
  const s = Sim.lastSetup();
  form.nation = s.nations[0] ?? 'french'; form.n = Math.max(1, s.nations.length);
  form.rivals = s.nations.slice(1).map((k, i) => ({ nation: k, bot: s.bots[i] ?? 'balanced', who: s.humans?.includes(i + 1) ? 'person' : (s.levels?.[i] ?? 'normal') }));
  form.ruleset = ruleset; form.seed = ''; fit();
  if (!RULESETS().includes(form.ruleset)) form.ruleset = 'board';
  U.title = 'new'; U.menu = false; paint();
}
/* The screen is drawn once when it opens; a choice redraws only the part it changes. */
const heroHtml = () => {
  const k = form.nation, deck = D.nations[k]?.deck ?? [];
  const agents = deck.map((a) => `<div class="ag"><img src="${art.agent(a)}" alt=""><b>${pick(D.agents[a])}</b><small>${traits(a).join(' ') || '&nbsp;'}</small></div>`).join('');
  return `<div class="ph" style="background-image:url(${art.nation(k)})"></div><div class="hx">${crest(k, 84)}<div><h3>${name(k)}</h3><p>${stars(D.nations[k].stars)} <span>${hardness(D.nations[k].stars)}</span></p></div></div>
<div class="deck"><h4>${t('newgame.starting_agents')}${deck.length < 5 ? `<small>${t('newgame.four_agents')}</small>` : ''}</h4><div class="ags">${agents}</div></div>`;
};
const rivalsHtml = () => {
  const taken = new Set([form.nation, ...form.rivals.map((r) => r.nation)]);
  const rows = form.rivals.map((r, i) => `<div class="rv">${crest(r.nation, 34)}<select data-ng-rival="${i}">${byStars().filter((n) => n === r.nation || !taken.has(n)).map((n) => `<option value="${n}"${n === r.nation ? ' selected' : ''}>${name(n)}</option>`).join('')}</select><select data-ng-who="${i}">${Object.entries(WHO).map(([k, n]) => `<option value="${k}"${k === r.who ? ' selected' : ''}>${pick(n)}</option>`).join('')}</select>${r.who === 'person' ? '<span></span>' : `<select data-ng-bot="${i}" title="${t(`bot.${r.bot}_about`)}">${PERSONALITY_NAMES.map((p) => `<option value="${p}"${p === r.bot ? ' selected' : ''}>${t(`bot.${p}`)}</option>`).join('')}</select>`}</div>`).join('');
  return `<h4>${t('newgame.rivals')}</h4>${rows || `<p class="note">${t('newgame.no_rivals')}</p>`}`;
};
const playersNote = () => (form.n === 1 ? t('newgame.alone_against') : form.rivals.some((r) => r.who === 'person') ? t('newgame.several_people') : t('newgame.rivals_played'));
/** The whole screen, when it opens. */
export function newGame(): string {
  const k = form.nation;
  const tiles = byStars().map((n) => `<button class="nt${n === k ? ' on' : ''}" data-ng-nation="${n}" style="--c:${D.nations[n].color}"><span class="ph" style="background-image:url(${art.nation(n)})"></span>${crest(n, 38)}<b>${name(n)}</b>${stars(D.nations[n].stars)}</button>`).join('');
  return `<div class="ng" style="--c:${D.nations[k]?.color}">
<header><button class="pback" data-t-page="main">← ${t('back')}</button><h2>${t('newgame.new_game')}</h2></header>
<div class="ng-body"><section class="nations">${tiles}</section><section class="hero">${heroHtml()}</section></div>
<section class="table">
<div class="col"><h4>${t('newgame.players')}</h4><div class="set">${[1, 2, 3, 4, 5].map((n) => `<button class="${form.n === n ? 'on' : ''}" data-ng-n="${n}">${n === 1 ? t('newgame.solo') : n}</button>`).join('')}</div><p class="note pn">${playersNote()}</p>
<h4>${t('newgame.seed')}</h4><div class="seed"><input data-ng-seed value="${form.seed}" placeholder="${t('newgame.random')}" spellcheck="false"><button data-ng-dice title="${t('newgame.random_seed')}">${icon('die', 20)}</button></div>
${form.ruleset === 'board' ? '' : `<p class="note">${t('newgame.rules')}: ${form.ruleset}</p>`}</div>
<div class="col rivals">${rivalsHtml()}</div>
<button class="sail" data-ng-start><span>${t('newgame.set_sail')}</span><small>1620</small></button>
</section></div>`;
}
const box = () => document.querySelector<HTMLElement>('#title .ng');
/** The chosen buttons of a row, by the attribute that holds their value. */
const mark = (attr: string, value: string) => box()?.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((b) => b.classList.toggle('on', b.getAttribute(attr) === value));
function changed(part: 'nation' | 'players' | 'rivals') {
  const el = box(); if (!el) return;
  if (part === 'nation') { mark('data-ng-nation', form.nation); el.style.setProperty('--c', D.nations[form.nation]?.color ?? ''); el.querySelector('.hero')!.innerHTML = heroHtml(); }
  if (part === 'players') { mark('data-ng-n', `${form.n}`); el.querySelector('.pn')!.textContent = playersNote(); }
  if (part === 'nation' || part === 'players' || part === 'rivals') { el.querySelector('.rivals')!.innerHTML = rivalsHtml(); el.querySelector('.pn')!.textContent = playersNote(); }
}

document.addEventListener('click', (e) => {
  if (U.title !== 'new') return;
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if ((x = q('[data-ng-nation]'))) { if (form.nation !== x.dataset.ngNation) { form.nation = x.dataset.ngNation!; fit(); changed('nation'); } }
  else if ((x = q('[data-ng-n]'))) { form.n = +x.dataset.ngN!; fit(); changed('players'); }
  else if (q('[data-ng-dice]')) { form.seed = Math.random().toString(36).slice(2, 8); const i = box()?.querySelector<HTMLInputElement>('[data-ng-seed]'); if (i) i.value = form.seed; }
  else if (q('[data-ng-start]')) { coachFromStart(); startGame({ nations: [form.nation, ...form.rivals.map((r) => r.nation)], bots: form.rivals.map((r) => r.bot), ruleset: form.ruleset, seed: form.seed.trim() || `g${Date.now().toString(36)}`, humans: [0, ...form.rivals.flatMap((r, i) => (r.who === 'person' ? [i + 1] : []))], levels: form.rivals.map((r) => (r.who === 'person' ? 'normal' : r.who)) }); }
});
document.addEventListener('change', (e) => {
  if (U.title !== 'new') return;
  const t = e.target as HTMLSelectElement;
  if (t.dataset.ngRival !== undefined) { form.rivals[+t.dataset.ngRival].nation = t.value; fit(); changed('rivals'); }
  else if (t.dataset.ngBot !== undefined) { form.rivals[+t.dataset.ngBot].bot = t.value as Personality; changed('rivals'); }
  else if (t.dataset.ngWho !== undefined) { form.rivals[+t.dataset.ngWho].who = t.value; changed('rivals'); }
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (U.title === 'new' && t.dataset.ngSeed !== undefined) form.seed = t.value;
});
