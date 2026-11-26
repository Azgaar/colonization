/* The game as the interface sees it, the player's language and the words, where the art is. No look of its own. */
import { icon } from './icons.js';
import { Sim } from './sim.js';

export const D = Sim.D, W = D.width, CELL = 64, me = D.me;
export const P = D.players[me];
export const lang = () => document.documentElement.lang || 'en';
/** English or Russian: from a pair `[en, ru]` or from a record with `en` and `ru`. */
export const pick = (x) => (Array.isArray(x) ? x[lang() === 'ru' ? 1 : 0] : lang() === 'ru' ? x.ru : x.en);
/** A phrase in both languages, picked now. */
export const L = (en, ru) => pick([en, ru]);
export const $ = (id) => document.getElementById(id);
const T = {
  round: ['Round', 'Тур'], of: ['of', 'из'], tax: ['Tax', 'Налог'], gold: ['Gold', 'Золото'], bells: ['Bells', 'Колокола'], crosses: ['Crosses', 'Кресты'], ref: ['King’s army', 'Армия короля'],
  hand: ['Your agents', 'Ваши агенты'], deck: ['deck', 'колода'], discard: ['discard', 'сброс'], pass: ['Pass', 'Пас'], warehouse: ['Warehouse', 'Склад'], hold: ['Hold', 'Трюм'], buildings: ['Buildings', 'Постройки'], fathers: ['Founding Fathers', 'Отцы-основатели'],
  colony: ['Colony', 'Колония'], europe: ['Europe', 'Европа'], market: ['Market', 'Рынок'], pier: ['Pier', 'Причал'], salon: ['Salon', 'Салон'], plans: ['Building projects', 'Проекты построек'], demand: ['demand', 'спрос'], free: ['free', 'свободно'], slot: ['Free slot', 'Свободно'],
  war: ['War of Independence', 'Война за независимость'], warshort: ['War', 'Война'], map: ['Map', 'Карта'], rivals: ['Governors', 'Губернаторы'], log: ['Chronicle', 'Хроника'], defence: ['Defence', 'Защита'], yields: ['This agent can gather', 'Этот агент может добыть'],
  settlement: ['Settlement', 'Поселение'], population: ['Population', 'Население'], hostility: ['Hostility', 'Враждебность'], loot: ['Loot', 'Добыча'], ally: ['Ally', 'Союз'], none: ['none', 'нет'], terrain: ['Terrain', 'Местность'], bonus: ['Bonus', 'Бонус'], raid: ['Raids when an event calls it', 'Набег при активации'], calm: ['Quiet', 'Спокойно'], gift: ['Brings food when an event calls it', 'Дарит еду при активации'],
  attack: ['Attack', 'Атака'], holds: ['Holds', 'Удержана'], falls: ['Falls', 'Пала'], loyalist: ['Loyalist', 'Лоялист'], patriot: ['Patriot', 'Патриот'], tactic: ['King’s tactic', 'Тактика короля'], cubes: ['redcoats', 'красные мундиры'], odds: ['Chance to hold', 'Шанс удержать'], dice: ['Dice', 'Кубики'], result: ['Final score', 'Итоговый счёт'],
  choose: ['Pick an agent, then an action', 'Выберите агента, затем действие'], why: ['Not now', 'Недоступно'], show: ['Show', 'Показать'], score: ['points', 'очков'], unexplored: ['Unexplored', 'Не исследовано'], ship: ['Ship', 'Корабль'], infantry: ['Infantry', 'Пехота'], ruin: ['Ruins', 'Руины'], wreck: ['Shipwreck', 'Кораблекрушение'], sea: ['Open sea', 'Открытое море'],
   forecast: ['If the war came now', 'Если бы война началась сейчас'], you: ['you', 'вы'], close: ['Close', 'Закрыть'], confirm: ['Do it', 'Выполнить'], back: ['Back', 'Назад'], undo: ['Undo', 'Отменить'],
};
for (const [k, en] of Object.entries({ french: 'New France', english: 'New England', dutch: 'New Netherland', spanish: 'New Spain', portuguese: 'Portuguese Brazil', swedish: 'New Sweden', danish: 'Danish West Indies', russian: 'Russian America', curonian: 'New Courland', scottish: 'New Caledonia' })) if (D.names.nations[k]) D.names.nations[k][0] = en;
export const t = (k) => (T[k] ? pick(T[k]) : k);
export const ACT = {
  produce: ['Gather', 'Добыча'], docks: ['Fish from the docks', 'Ловля у причала'], work: ['Work in a building', 'Работа в постройке'], moveShip: ['Sail', 'Плыть'], moveInfantry: ['March', 'Идти'], found: ['Found a colony', 'Основать колонию'], attack: ['Attack', 'Атака'], trade: ['Sell in Europe', 'Торговля'], hire: ['Hire', 'Наём'], propaganda: ['Win over a Father', 'Пропаганда'], repair: ['Repair', 'Ремонт'], shipyard: ['Repair at the shipyard', 'Ремонт на верфи'], build: ['Build', 'Строительство'], teach: ['Teach', 'Обучение'], customs: ['Sell at the custom house', 'Таможня'], supply: ['Supply', 'Снабжение'], exchange: ['Exchange agents', 'Обмен'], gift: ['Give a gift', 'Подарок'], preach: ['Preach', 'Проповедь'], alliance: ['Make an alliance', 'Союз'], smuggle: ['Smuggle', 'Контрабанда'],
};
const WHY_RU = { 'infantry must be on land': 'пехота должна быть на суше', 'not a revealed land cell': 'не открытая суша', 'on the edge of the map': 'на краю карты', 'the cell is taken': 'клетка занята', 'next to a colony': 'рядом колония', 'next to a settlement': 'рядом поселение', 'no sea passage to Europe': 'нет морского пути в Европу', 'needs 5 food': 'нужно 5 еды', 'needs 2 timber': 'нужно 2 древесины', 'the ship must be in Europe': 'корабль должен быть в Европе', 'no settlement next to a token': 'нет поселения рядом', 'needs an agent with ⚔️': 'нужен военный агент', 'no target in reach': 'нет цели рядом', 'needs a school': 'нужна школа', 'needs a custom house': 'нужна таможня', 'needs a shipyard': 'нужна верфь', 'needs 1 food': 'нужна 1 еда', 'needs higher education or a scout': 'нужно высшее образование или скаут', 'nothing to choose from': 'не из чего выбрать', 'the limit of colonies is reached': 'достигнут предел колоний' };
export const why = (s) => (lang() === 'ru' && WHY_RU[s] ? WHY_RU[s] : s);
export const art = {
  agent: (id) => `art/agent/${D.agents[id].base}.webp`,
  building: (id) => `art/building/${({ blacksmith_shop: 'blacksmiths_shop' })[id] || id}.webp`,
  father: (id) => `art/father/${id === 'benedict_arnold' ? 'edward_colston' : id}.webp`,
  tribe: (id) => `art/tribe/${id}.webp`, nation: (id) => `art/nation/${id}.webp`, emblem: (id) => `art/emblem/${id}.svg`,
};
export const RES = ['food', 'timber', 'crops', 'goods', 'silver'];
export const tokenAt = (c) => { for (let i = 0; i < D.players.length; i++) { if (D.players[i].ship === c) return { p: i, kind: 'ship' }; if (D.players[i].inf === c) return { p: i, kind: 'infantry' }; } return null; };
export const colonyAt = (c) => D.colonies.find((x) => x.cell === c);
export const settlementAt = (c) => D.settlements.find((x) => x.alive && x.cell === c);
/** Top left corner of a cell, in map units. */
export const at = (c) => [(c % W) * CELL, Math.floor(c / W) * CELL];
/** One line of the chronicle. */
export function logLine(e) {
  const who = e.p === undefined ? '' : `<b style="--c:${D.players[e.p].color}" class="who">${pick(D.names.nations[D.players[e.p].nation])}</b> `;
  const A = (k) => pick(ACT[k] || [k, k]).toLowerCase();
  if (e.e === 'play') return `${who}${pick(D.agents[e.card])}: ${A(e.a)}`;
  if (e.e === 'event') return `<em>${pick(D.names.events[e.id])}</em>`;
  if (e.e === 'build') return `${who}${pick(['built', 'строит'])}: ${pick(D.buildings[e.building])}`;
  if (e.e === 'found') return `${who}${pick(['founded a colony', 'основывает колонию'])}`;
  if (e.e === 'raid') return `${who}${pick(['raided by natives', 'набег индейцев'])}`;
  if (e.e === 'tax') return `${who}${e.pay ? pick(['paid the tax', 'платит налог']) : pick(['refused the tax', 'отказ от налога'])} (${e.rate})`;
  if (e.e === 'father') return `${who}${pick(D.fathers[e.father])}`;
  if (e.e === 'hire') return `${who}${pick(['hired', 'нанимает'])}: ${pick(D.agents[e.agent])}`;
  if (e.e === 'reveal') return `${who}${pick(['charted new waters', 'открывает карту'])}`;
  if (e.e === 'poi') return `${who}${pick(['explored', 'исследует'])}: ${e.deck === 'ruin' ? t('ruin') : t('wreck')}`;
  if (e.e === 'sell') return `${who}${pick(['sold', 'продаёт'])} ${e.n} ${icon(e.r, 14)} × ${e.price}`;
  return '';
}
export const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
