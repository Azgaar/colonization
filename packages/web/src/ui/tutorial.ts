/* The tutorial (FR-U-20): part of every new game until the player turns it off (in Options, or by ending it). A coach gives one step at a time to seat 0,
 * points at what to use, and moves on by itself once the game shows the step done. Every step can be skipped; the game itself is an ordinary one. */
import type { State } from '@col/engine';
import { $, D, L, lang, me } from '../data.ts';
import { icon } from '../icons.ts';
import { plural } from '../plural.ts';
import { paint } from '../paint.ts';
import { Sim } from '../sim.ts';
import { U } from '../state.ts';
import { keepOptions, Options } from '../options.ts';
import { esc } from './md.ts';

type Pair = [string, string];
/** A step: what to read (HTML: it may carry icons), what to point at, and when it is done (no test: the player moves on with Next). */
interface Step { title: Pair; text: Pair; done?: (s: State) => boolean; hi?: string }
const mine = (s: State, e: string) => s.log.some((x) => x.e === e && x.p === 0);
/** The steps for this game: its nation, solo or not, and the numbers of the rules being played. */
function steps(): Step[] {
  const s = D.settings, ic = (n: string) => icon(n, 17), m = s.move, solo = Sim.s.players.length === 1;
  const nation = D.names.nations[Sim.s.players[0].nation] ?? ['', ''], rr = solo ? s.tax.refuseRefSolo : s.tax.refuseRef;
  return [
    { title: ['Welcome, governor', 'Добро пожаловать, губернатор'], text: [
      `You are the governor of ${nation[0]} in the New World. Each round you play agents to explore, found colonies, gather, build and trade; ${solo ? 'keep a colony to the end to win' : 'the most points at the end win'}. These tips show one thing at a time and move on when you have done it.`,
      `Вы губернатор колонии «${nation[1]}» в Новом Свете. Каждый тур вы разыгрываете агентов, чтобы исследовать, основывать колонии, добывать, строить и торговать; ${solo ? 'чтобы победить, удержите колонию до конца' : 'в конце побеждает тот, у кого больше очков'}. Подсказки показывают по одному шагу и идут дальше, когда вы его сделали.`] },
    { title: ['Where to start', 'Откуда начать'], text: [
      'The outlined edge of the map is Europe: your ship comes from there, and goes back there to trade. Click a cell on the edge to choose where your ship starts.',
      'Обведённый край карты — это Европа: оттуда приходит ваш корабль, туда же он возвращается торговать. Нажмите клетку на краю, чтобы выбрать, откуда начнёт корабль.'], done: (x) => x.players[0].ship >= 0 },
    { title: ['Your agents', 'Ваши агенты'], text: [
      `These cards are your agents. On your turn you play one of them for one action${solo ? '' : ', then the others take theirs'}. Any agent can take any action. Pick one up (drag it, or click it) and every place it can act lights up.`,
      `Эти карты — ваши агенты. В свой ход вы разыгрываете одного из них на одно действие${solo ? '' : ', потом ходят остальные'}. Любой агент может выполнить любое действие. Возьмите карту (перетащите или нажмите), и подсветятся все места, где она может действовать.`], hi: '#hand .card' },
    { title: ['Talents', 'Таланты'], text: [
      `The icons at the top of a picture are the agent’s talent, a bonus where the action fits: +1 ${ic('move')}${ic('ship')} sails a cell further, +1 ${ic('food')} gathers more food, +2 ${ic('sword')} fights better. Two limits: only an agent with ${ic('sword')} can attack, and the criminal and the slave can only gather.`,
      `Значки вверху картинки — талант агента, бонус там, где действие подходит: +1 ${ic('move')}${ic('ship')} плывёт на клетку дальше, +1 ${ic('food')} добывает больше еды, +2 ${ic('sword')} лучше воюет. Два ограничения: нападать может только агент с ${ic('sword')}, а преступник и раб могут только добывать.`], hi: '#hand .card' },
    { title: ['Sail and explore', 'Плывите и исследуйте'], text: [
      `Drop an agent on the sea to sail: one action gives the ship ${m.points} movement points, 1 for each sea cell. The clouds hide unknown land; sailing into them reveals a new part of the map. Sail into the clouds now.`,
      `Положите агента на море, чтобы плыть: одно действие даёт кораблю ${m.points} очков движения, по 1 за клетку моря. Облака скрывают неизвестные земли; заплыв в них открывает новую часть карты. Плывите в облака.`], done: (x) => mine(x, 'reveal'), hi: '#hand .card' },
    { title: ['Found a colony', 'Основайте колонию'], text: [
      `Your infantry ${ic('infantry')} rides aboard. Sail along a coast, then drop an agent on a land cell with a yellow flag: the infantry lands and founds a colony there. The first one is free. Grassland and forest by the sea are good land.`,
      `Ваша пехота ${ic('infantry')} плывёт на корабле. Пройдите вдоль берега и положите агента на клетку суши с жёлтым флажком: пехота высадится и основает там колонию. Первая бесплатна. Луга и лес у моря — хорошая земля.`], done: (x) => x.colonies.some((c) => c.owner === 0) },
    { title: ['Gather', 'Добывайте'], text: [
      `A colony works its own cell and the cells around it. Drop an agent on one to gather what it yields: ${ic('food')} ${ic('timber')} ${ic('crops')} ${ic('silver')} ${ic('fish')}. It goes to your warehouse, beside the hand. The warehouse holds ${s.warehouse.base}; the rest is lost.`,
      `Колония обрабатывает свою клетку и клетки вокруг. Положите агента на одну из них, чтобы добыть то, что она даёт: ${ic('food')} ${ic('timber')} ${ic('crops')} ${ic('silver')} ${ic('fish')}. Всё идёт на склад рядом с рукой. Склад вмещает ${s.warehouse.base}; лишнее теряется.`], done: (x) => mine(x, 'produce') },
    { title: ['Colony and Europe', 'Колония и Европа'], text: [
      `The round buttons at the bottom open two boards. Colony: build with ${ic('timber')}, then put agents to work in the buildings; a building needs enough education, the mark before an agent’s name. Europe: sell what your ship carries, hire agents, gain Founding Fathers. Europe needs your ship on the edge of the map.`,
      `Круглые кнопки внизу открывают два поля. Колония: стройте за ${ic('timber')}, потом ставьте агентов работать в постройках; постройке нужно достаточное образование — значок перед именем агента. Европа: продайте то, что везёт корабль, наймите агентов, получите Отцов-основателей. Для Европы корабль должен быть на краю карты.`], hi: '.door' },
    { title: ['The natives', 'Индейцы'], text: [
      `Native villages appear as you explore. Next to one you can give goods to calm its tribe, preach with ${ic('crosses')} to win a native agent, make an alliance while it is calm, or attack it. Each tribe’s hostility ${ic('anger')} runs from 0 to ${s.natives.maxHostility}: calm villages bring your colonies food, angry ones raid them.`,
      `Поселения индейцев появляются по мере исследования. Рядом с поселением можно подарить товары, чтобы успокоить племя, проповедовать за ${ic('crosses')}, чтобы получить агента-индейца, заключить союз, пока племя спокойно, или напасть. Враждебность ${ic('anger')} племени — от 0 до ${s.natives.maxHostility}: спокойные поселения приносят колониям еду, злые совершают набеги.`] },
    { title: ['End of the round', 'Конец тура'], text: [
      `When you have done what you want, Pass. When everybody has passed, the round ends: an event happens, the King asks for his tax, and you draw back up to ${s.hand.size} agents.`,
      `Когда сделаете, что хотели, нажмите «Пас». Когда спасуют все, тур заканчивается: происходит событие, король требует налог, и вы добираете агентов до ${s.hand.size}.`], done: (x) => x.round >= 2, hi: '.acts .pass' },
    { title: ['The King’s tax', 'Налог короля'], text: [
      `At the end of this round the King asks for ${ic('gold')} gold. Pay, or refuse: a refusal ${s.tax.refuseBells ? `gives you ${s.tax.refuseBells} ${ic('bells')} but ` : ''}adds ${rr} ${rr === 1 ? 'soldier' : 'soldiers'} to the King’s army ${ic('ref')}. Bells measure your rebellion and pay for Founding Fathers.`,
      `В конце этого тура король потребует ${ic('gold')} золото. Заплатите или откажитесь: отказ ${s.tax.refuseBells ? `даёт вам ${s.tax.refuseBells} ${ic('bells')}, но ` : ''}добавляет ${rr} ${plural(rr, 'солдата', 'солдат', 'солдат')} в армию короля ${ic('ref')}. Колокола — мера вашего мятежа, ими же платят за Отцов-основателей.`], done: (x) => mine(x, 'tax'), hi: '.king' },
    { title: ['The War of Independence', 'Война за независимость'], text: [
      `The game ends with a war, after the round in which ${solo ? 'you reach' : 'someone reaches'} ${s.war.bells} ${ic('bells')}, or after round ${s.rounds.max}. ${solo ? '' : 'The governor with the fewest bells joins the King; the others fight for independence. '}The King’s army ${ic('ref')}, every soldier collected plus one per hostile village, attacks ${solo ? 'your colonies' : 'their colonies'}. Defend with agents with ${ic('sword')}, militia paid in bells and mercenaries paid in gold; a colony attacked by a stronger force falls.`,
      `Игра кончается войной — после тура, в котором ${solo ? 'вы наберёте' : 'кто-то наберёт'} ${s.war.bells} ${ic('bells')}, или после ${s.rounds.max}-го тура. ${solo ? '' : 'Губернатор с наименьшим числом колоколов переходит на сторону короля; остальные воюют за независимость. '}Армия короля ${ic('ref')} — все собранные солдаты плюс по одному за враждебное поселение — нападает на ${solo ? 'ваши колонии' : 'их колонии'}. Защищайтесь агентами с ${ic('sword')}, ополчением за колокола и наёмниками за золото; колония, атакованная сильнее её защиты, падает.`], hi: '.king' },
    { title: ['How to win', 'Как победить'], text: solo ? [
      'Hold at least one colony through the war and you win; lose them all and the Crown wins. Your score counts the colonies held, bells left, agents, gold, buildings and Fathers.',
      'Удержите в войне хотя бы одну колонию — и вы победили; потеряете все — побеждает Корона. Очки дают удержанные колонии, оставшиеся колокола, агенты, золото, постройки и Отцы.'] : [
      'After the war points are counted: colonies held, bells left, agents, gold, buildings and Fathers; the King’s ally scores for colonies, those taken included. Only a governor who holds a colony can win; if nobody does, the Crown wins. The emblems at the top right show everyone’s bells and crosses.',
      'После войны считают очки: удержанные колонии, оставшиеся колокола, агенты, золото, постройки и Отцы; союзник короля получает очки за колонии, включая захваченные. Победить может только тот, кто удержал колонию; если никто — побеждает Корона. Гербы вверху справа показывают колокола и кресты каждого.'], hi: '#court' },
    { title: ['Over to you', 'Дальше сами'], text: [
      'You know enough to play. Advice, beside Pass, suggests a move when you are unsure, and F1 opens the rules at any time. The tips turn off now; Options turns them back on. Good luck, governor!',
      'Вы знаете достаточно, чтобы играть. «Совет» рядом с «Пас» подскажет ход, если вы сомневаетесь, а F1 в любой момент открывает правила. Подсказки сейчас выключатся; включить их снова можно в настройках. Удачи, губернатор!'] },
  ];
}
const KEY = 'tutorial';
/** The step shown, kept in the browser with the game, so Continue goes on where the tutorial was. */
const at = () => Math.min(steps().length, Number(localStorage.getItem(KEY) ?? 0));
const go = (n: number) => localStorage.setItem(KEY, String(n));
/** Shown to seat 0 only: in a hot-seat game the others see the table without it. */
const on = () => tutorialOn() && !Sim.replay && !Sim.demo && !U.title && me === 0 && at() < steps().length;

/** Whether the tutorial is on: until the player turns it off. Turned on again, it starts over in the game being played. */
export const tutorialOn = () => Options.tutorial;
export function setTutorial(x: boolean) { Options.tutorial = x; keepOptions(); if (x) go(0); }
/** A new game: the tutorial from its first step. */
export const coachFromStart = () => go(0);

export function coach() {
  const el = $('coach');
  document.querySelectorAll('.coach-hi').forEach((x) => x.classList.remove('coach-hi'));
  if (!on()) { el.hidden = true; return; }
  // Steps already done (by playing ahead) are passed over.
  const list = steps();
  let n = at();
  while (n < list.length && list[n].done?.(Sim.s)) n++;
  if (n !== at()) go(n);
  if (n >= list.length) { el.hidden = true; return; }
  const st = list[n], ru = lang() === 'ru' ? 1 : 0, last = n === list.length - 1;
  el.hidden = false;
  el.innerHTML = `<small>${L(`Tutorial · ${n + 1} of ${list.length}`, `Обучение · ${n + 1} из ${list.length}`)}</small><h3>${esc(st.title[ru])}</h3><p>${st.text[ru]}</p>
<div class="cb">${st.done ? `<button data-coach="skip">${L('Skip this step', 'Пропустить шаг')}</button>` : `<button class="go" data-coach="next">${last ? L('Play on', 'Играть дальше') : L('Next', 'Дальше')}</button>`}<button data-coach="end">${L('End the tutorial', 'Закончить обучение')}</button></div>`;
  if (st.hi) document.querySelectorAll(st.hi).forEach((x) => x.classList.add('coach-hi'));
  dodge();
}

/** The coach keeps off the player's ship and infantry: it moves to the other side of the screen when it would cover them. */
function dodge() {
  const el = $('coach');
  if (el.hidden) return;
  const pl = Sim.s.players[0], ids = [pl.ship >= 0 ? 's0' : '', typeof pl.inf === 'number' ? 'i0' : ''].filter(Boolean);
  const near = ids.flatMap((id) => [...document.querySelectorAll(`[data-thing="${id}"]`)].map((t) => t.getBoundingClientRect()));
  const g = 24, hits = () => { const r = el.getBoundingClientRect(); return near.some((t) => t.right > r.left - g && t.left < r.right + g && t.bottom > r.top - g && t.top < r.bottom + g); };
  if (!hits()) return;
  el.classList.toggle('east');
  // Covered on both sides: the usual place, on the left.
  if (hits()) el.classList.remove('east');
}
// The map moves under the coach when it is dragged or zoomed.
let dodgeT = 0;
for (const ev of ['pointerup', 'wheel']) addEventListener(ev, () => { clearTimeout(dodgeT); dodgeT = window.setTimeout(dodge, 250); }, { passive: true });

document.addEventListener('click', (e) => {
  const x = (e.target as HTMLElement).closest<HTMLElement>('[data-coach]');
  if (!x) return;
  // Ending the tutorial, or reading its last step, turns it off for the games to come as well.
  if (x.dataset.coach === 'end' || at() >= steps().length - 1) setTutorial(false); else go(at() + 1);
  paint();
});
