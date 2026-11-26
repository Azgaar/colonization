/* The rules reference (FR-U-20): the board game's rules in short, in both languages, from the goal to the score.
 * Every number comes from the rules being played, so a changed ruleset reads true here as well. Source: docs/rules-spec.md (rule IDs in brackets). */
import { $, D, L, lang } from '../data.ts';
import { icon } from '../icons.ts';
import { esc } from './md.ts';

type Pair = [string, string];
interface Section { id: string; title: Pair; items: Pair[] }

/** Open, and on which section. */
const G = { open: false, at: 'goal' };
export const openGuide = (at = G.at) => { G.open = true; G.at = at; guide(); };
export const guideOpen = () => G.open;

function sections(): Section[] {
  const s = D.settings, tax = s.tax.track, ic = (n: string) => icon(n, 17);
  return [
    { id: 'goal', title: ['The goal', 'Цель'], items: [
      [`You govern a colony of a European power in the New World, from ${s.rounds.firstYear} to ${s.rounds.firstYear + (s.rounds.max - 1) * s.rounds.yearStep}. Explore, found up to ${s.colony.max} colonies, trade, grow.`, `Вы правите колонией европейской державы в Новом Свете с ${s.rounds.firstYear} по ${s.rounds.firstYear + (s.rounds.max - 1) * s.rounds.yearStep} год. Исследуйте, основывайте до ${s.colony.max} колоний, торгуйте, развивайтесь.`],
      [`The game ends with the War of Independence, when someone has ${s.war.bells} ${ic('bells')} or after round ${s.rounds.max}. The least rebellious governor sides with the King; the others defend their colonies.`, `Игра заканчивается Войной за независимость: когда у кого-то ${s.war.bells} ${ic('bells')} или после ${s.rounds.max}-го тура. Наименее мятежный губернатор встаёт на сторону короля, остальные защищают колонии.`],
      ['To win you must hold at least one colony after the war and have the most points. Nobody holds one: the Crown wins.', 'Чтобы победить, нужно удержать хотя бы одну колонию после войны и набрать больше всех очков. Никто не удержал: побеждает Корона.'],
    ] },
    { id: 'round', title: ['A round', 'Тур'], items: [
      [`Draw up to ${s.hand.size} agents. An empty deck is refilled by shuffling your discard.`, `Доберите агентов до ${s.hand.size}. Пустая колода пополняется перемешанным сбросом.`],
      ['In turn, each player plays one agent for one action. Passing ends your round; the others go on until all have passed.', 'По очереди каждый разыгрывает одного агента на одно действие. Пас заканчивает ваш тур; остальные продолжают, пока не спасуют все.'],
      ['Then the top event happens, and the King asks for his tax.', 'Затем срабатывает верхнее событие, и король требует налог.'],
      [`Tax by round: ${tax.join(', ')} ${ic('gold')}. Pay in full, or refuse: +${s.tax.refuseRef} cubes to the King’s army (solo +${s.tax.refuseRefSolo}) and +${s.tax.refuseBells} ${ic('bells')}. Who cannot pay must refuse.`, `Налог по турам: ${tax.join(', ')} ${ic('gold')}. Заплатите полностью или откажитесь: +${s.tax.refuseRef} кубика в армию короля (соло +${s.tax.refuseRefSolo}) и +${s.tax.refuseBells} ${ic('bells')}. Кто не может заплатить, обязан отказаться.`],
      [`Free on your turn: recruit with crosses ${ic('crosses')} (as many as the round number) to look at the top agent of the Europe deck and take it, or put it back.`, `Бесплатно в свой ход: вербовка за кресты ${ic('crosses')} (столько, какой идёт тур): посмотрите верхнего агента колоды Европы и возьмите его или верните.`],
    ] },
    { id: 'agents', title: ['Agents', 'Агенты'], items: [
      ['Any agent can take any action; its talent adds where it fits (a sailor sails further, a farmer grows more food, a soldier fights better).', 'Любой агент может выполнить любое действие; его талант добавляется, где подходит (моряк плывёт дальше, фермер растит больше еды, солдат лучше воюет).'],
      ['Education 🚫 / 📖 / 🎓 decides which buildings an agent can work in and what can be taught.', 'Образование 🚫 / 📖 / 🎓 определяет, в каких постройках агент может работать и чему можно научить.'],
      ['The criminal and the slave may only produce (and support in battle).', 'Преступник и раб могут только производить (и поддерживать в бою).'],
      ['A played agent goes to your discard.', 'Разыгранный агент уходит в ваш сброс.'],
    ] },
    { id: 'move', title: ['Moving and exploring', 'Движение и исследование'], items: [
      [`One action moves your ship ${ic('ship')} or your infantry ${ic('infantry')}: ${s.move.points} points. Ocean and grassland cost 1, forest, desert and tundra 2; mountains take all that remain.`, `Одно действие двигает корабль ${ic('ship')} или пехоту ${ic('infantry')}: ${s.move.points} очков. Океан и луг стоят 1, лес, пустыня и тундра 2; горы забирают все оставшиеся.`],
      [`Moving into the clouds explores (${s.move.explore} point): a 3×3 part of the map appears, with its land, native villages, ruins and wrecks.`, `Движение в облака исследует (${s.move.explore} очко): открывается часть карты 3×3 с землёй, поселениями, руинами и обломками.`],
      [`The infantry rides aboard. Going ashore or aboard costs ${s.move.embark} point and lets one action move both.`, `Пехота плывёт на корабле. Высадка или посадка стоит ${s.move.embark} очко и позволяет одним действием двигать обоих.`],
      [`The hold has ${s.hold.size} places: one per resource kind, one for the infantry, one per damage. Loading and unloading at your colony cost ${s.move.cargo} point.`, `В трюме ${s.hold.size} места: одно на вид ресурса, одно на пехоту, одно на повреждение. Погрузка и выгрузка у своей колонии стоят ${s.move.cargo} очко.`],
      ['The edge of the map is Europe. Ruins (infantry) and wrecks (ship) give a card with a choice when first entered.', 'Край карты — Европа. Руины (пехота) и обломки (корабль) при первом заходе дают карту с выбором.'],
    ] },
    { id: 'colony', title: ['Colonies', 'Колонии'], items: [
      [`Your infantry founds a colony on its own land cell: not on the map’s outer edge, not next to a colony or village, with sea leading to Europe. The first is free, the others cost ${s.colony.foundCost.value} ${ic(s.colony.foundCost.resource)}.`, `Пехота основывает колонию на своей клетке суши: не на внешнем краю карты, не рядом с колонией или поселением, с морем, ведущим в Европу. Первая бесплатна, остальные стоят ${s.colony.foundCost.value} ${ic(s.colony.foundCost.resource)}.`],
      [`Produce: take 1 resource from the colony’s cell or an empty neighbour; a bonus icon on the cell adds 1. Forest ${ic('timber')} or ${ic('fur')}, grassland ${ic('food')} or crops, mountains ${ic('silver')}, ocean ${ic('fish')}; desert and tundra give nothing.`, `Производство: 1 ресурс с клетки колонии или пустой соседней; значок бонуса добавляет 1. Лес ${ic('timber')} или ${ic('fur')}, луг ${ic('food')} или урожай, горы ${ic('silver')}, океан ${ic('fish')}; пустыня и тундра ничего не дают.`],
      [`Build with timber: up to ${s.buildings.max} buildings, one of each. Work in a building with an agent educated enough: workshops turn crops into goods, schools teach, docks work the sea, and so on.`, `Стройте за древесину: до ${s.buildings.max} построек, по одной каждого вида. Работайте в постройке агентом с достаточным образованием: мастерские делают из урожая товары, школы учат, причал работает с морем и так далее.`],
      [`Warehouse: ${s.warehouse.base} resources (more with the warehouse building); the excess is lost at the end of your turn. Your warehouse, buildings and Fathers serve all your colonies.`, `Склад: ${s.warehouse.base} ресурсов (больше с постройкой «склад»); лишнее теряется в конце хода. Склад, постройки и Отцы служат всем вашим колониям.`],
      ['Supply: 1 food, draw 1 agent. Exchange: discard 2 agents, draw 1.', 'Снабжение: 1 еда, возьмите 1 агента. Обмен: сбросьте 2 агентов, возьмите 1.'],
    ] },
    { id: 'europe', title: ['Europe', 'Европа'], items: [
      ['With your ship on the map’s edge you can act in Europe.', 'Когда корабль на краю карты, можно действовать в Европе.'],
      [`Trade: sell your hold at today’s prices (up to ${s.market.maxPrice}). Sales fill a demand track as long as the number of players; each time it fills, that price falls by 1.`, `Торговля: продайте трюм по текущим ценам (до ${s.market.maxPrice}). Продажи заполняют трек спроса длиной в число игроков; каждый раз, когда он заполнен, цена падает на 1.`],
      [`Hire: buy up to ${s.hire.max} different agents from the pier with gold, or clear the pier for new ones.`, `Найм: купите до ${s.hire.max} разных агентов с причала за золото или очистите причал.`],
      [`Propaganda: take up to ${s.propaganda.maxFathers} Founding Fathers from the salon, paying bells; at most ${s.fathers.max} in all.`, `Пропаганда: возьмите до ${s.propaganda.maxFathers} Отцов-основателей из салона, платя колоколами; всего не больше ${s.fathers.max}.`],
      ['Repair: remove a damage from your ship.', 'Ремонт: уберите повреждение корабля.'],
    ] },
    { id: 'natives', title: ['Natives', 'Индейцы'], items: [
      [`Villages appear as the map is explored. A tribe’s hostility ${ic('anger')} runs from 0 to ${s.natives.maxHostility}, shared by its villages.`, `Поселения появляются по мере исследования. Враждебность ${ic('anger')} племени — от 0 до ${s.natives.maxHostility}, общая для его поселений.`],
      ['Next to a village: give goods (hostility falls), preach (pay crosses equal to hostility, gain a native agent), attack, or make an alliance at low hostility.', 'Рядом с поселением: подарите товары (враждебность падает), проповедуйте (платите кресты по враждебности, получите агента-индейца), нападите или заключите союз при низкой враждебности.'],
      ['Events activate villages: a friendly one gives food to the nearest colony, a hostile one raids it.', 'События активируют поселения: дружелюбное даёт еду ближайшей колонии, враждебное совершает на неё набег.'],
    ] },
    { id: 'combat', title: ['Combat', 'Бой'], items: [
      ['Attack a neighbouring cell with an agent that has a ⚔️ for your token (infantry or ship). Both sides then add cards from hand in secret.', 'Атакуйте соседнюю клетку агентом с ⚔️ для вашей фишки (пехота или корабль). Затем обе стороны тайно добавляют карты с руки.'],
      [`Strength is the number of cards plus their ⚔️ and bonuses. If the attack is stronger, roll as many dice as the difference: each ${s.combat.successFaces.join(' or ')} is a success. Any win gives +${s.combat.victoryBells} ${ic('bells')}.`, `Сила — число карт плюс их ⚔️ и бонусы. Если атака сильнее, бросьте кубиков по разнице: каждая ${s.combat.successFaces.join(' или ')} — успех. Любая победа даёт +${s.combat.victoryBells} ${ic('bells')}.`],
      ['A beaten token goes to Europe; tokens are never destroyed. Against a colony each success takes a resource or a building. Colonies can only be taken in the war.', 'Побеждённая фишка уходит в Европу; фишки не уничтожаются. Против колонии каждый успех забирает ресурс или постройку. Захватить колонию можно только в войне.'],
    ] },
    { id: 'events', title: ['Events, ruins, wrecks', 'События, руины, обломки'], items: [
      [`One event a round, from a shuffled deck: storms, wars, prices, the King’s demands. At most ${s.rounds.max} are seen.`, `Одно событие за тур из перемешанной колоды: шторма, войны, цены, требования короля. Видно не больше ${s.rounds.max}.`],
      ['Ruins and wrecks offer choices with costs and dice: gold, agents, cargo, or trouble.', 'Руины и обломки предлагают выбор с ценой и кубиками: золото, агентов, груз или неприятности.'],
    ] },
    { id: 'war', title: ['The War of Independence', 'Война за независимость'], items: [
      [`It begins after the tax of a round in which someone reaches ${s.war.bells} ${ic('bells')}, or after round ${s.rounds.max}.`, `Начинается после налога тура, в котором кто-то набрал ${s.war.bells} ${ic('bells')}, или после ${s.rounds.max}-го тура.`],
      ['The governor with the fewest bells becomes the loyalist and fights for the King (not in solo).', 'Губернатор с наименьшим числом колоколов становится лоялистом и воюет за короля (кроме соло).'],
      [`The King’s army: every cube collected, plus 1 per hostile village and the King’s tactic. Its cubes are dealt to the patriots’ colonies; each cube attacks with ${s.war.refStrength}.`, `Армия короля: все собранные кубики, плюс 1 за каждое враждебное поселение и тактика короля. Кубики раздаются колониям патриотов; каждый атакует с силой ${s.war.refStrength}.`],
      [`Patriots defend in secret with military agents, militia (1 ${ic('bells')} each), mercenaries (${s.war.mercenaryGold} ${ic('gold')} each) and allies (${s.war.allyCubes} each). A colony attacked by more than it can hold rolls dice; any success takes it.`, `Патриоты тайно защищаются военными агентами, ополчением (1 ${ic('bells')} за каждого), наёмниками (${s.war.mercenaryGold} ${ic('gold')} за каждого) и союзниками (по ${s.war.allyCubes}). Колония, атакованная сильнее её защиты, бросает кубики; любой успех её захватывает.`],
    ] },
    { id: 'score', title: ['Scoring', 'Подсчёт очков'], items: [
      [`Patriot: ${s.score.patriotColony} per colony held, ${s.score.perBell} per bell left. Loyalist: ${s.score.loyalistColony} per colony, those taken included.`, `Патриот: ${s.score.patriotColony} за удержанную колонию, ${s.score.perBell} за оставшийся колокол. Лоялист: ${s.score.loyalistColony} за колонию, включая захваченные.`],
      [`Everybody: 1 per ${s.score.agentsPerPoint} agents, 1 per ${s.score.goldPerPoint} ${ic('gold')}, ${s.score.building} per building, ${s.score.father} per Father, and the cards’ own bonuses.`, `Все: 1 за каждые ${s.score.agentsPerPoint} агентов, 1 за ${s.score.goldPerPoint} ${ic('gold')}, ${s.score.building} за постройку, ${s.score.father} за Отца и бонусы самих карт.`],
      ['Ties go to gold, then to the number of agents.', 'При равенстве решает золото, затем число агентов.'],
    ] },
    { id: 'icons', title: ['Icons', 'Значки'], items: [
      [`${ic('food')} food · ${ic('timber')} timber · ${ic('crops')} crops · ${ic('goods')} goods · ${ic('silver')} silver`, `${ic('food')} еда · ${ic('timber')} древесина · ${ic('crops')} урожай · ${ic('goods')} товары · ${ic('silver')} серебро`],
      [`${ic('gold')} gold · ${ic('bells')} bells (rebellion) · ${ic('crosses')} crosses (faith) · ${ic('ref')} the King’s army`, `${ic('gold')} золото · ${ic('bells')} колокола (мятеж) · ${ic('crosses')} кресты (вера) · ${ic('ref')} армия короля`],
      [`${ic('ship')} ship · ${ic('infantry')} infantry · ${ic('anger')} hostility · ⚔️ strength`, `${ic('ship')} корабль · ${ic('infantry')} пехота · ${ic('anger')} враждебность · ⚔️ сила`],
    ] },
  ];
}

/** The rules over the table: an index of sections on the left, the chosen section on the right. Esc or the cross closes it. */
export function guide() {
  const el = $('guide');
  el.hidden = !G.open;
  if (!G.open) return;
  const all = sections(), sec = all.find((x) => x.id === G.at) ?? all[0], ru = lang() === 'ru';
  el.innerHTML = `<div class="gd"><nav>${all.map((x) => `<button class="${x.id === sec.id ? 'on' : ''}" data-guide-at="${x.id}">${esc(x.title[ru ? 1 : 0])}</button>`).join('')}</nav>
<article><h2>${esc(sec.title[ru ? 1 : 0])}</h2>${sec.items.map((p) => `<p>${p[ru ? 1 : 0]}</p>`).join('')}
<p class="gnote">${L('The full rules are the board game’s rulebook; here each rule is in short, with the numbers of the rules being played.', 'Полные правила — в книге правил настольной игры; здесь каждое правило кратко, с числами текущего набора правил.')}</p></article>
<button class="x" data-guide-close>${L('Close', 'Закрыть')}</button></div>`;
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if ((x = q('[data-guide]'))) { e.stopPropagation(); openGuide(x.dataset.guide || undefined); }
  else if ((x = q('[data-guide-at]'))) { G.at = x.dataset.guideAt!; guide(); }
  else if (q('[data-guide-close]') || (G.open && t === $('guide'))) { G.open = false; guide(); }
}, true);
// F1 opens and closes the rules anywhere; Esc closes them first.
document.addEventListener('keydown', (e) => {
  if (e.key === 'F1') { e.preventDefault(); G.open = !G.open; guide(); }
  else if (e.key === 'Escape' && G.open) { e.stopImmediatePropagation(); G.open = false; guide(); }
}, true);
