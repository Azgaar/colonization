/* The game as the interface sees it, the player's language and the words, where the art is. No look of its own. */
import { RESOURCES, type Resource } from '@col/data';
import type { Entry } from './sim.ts';
import type { Pair, PlayerView } from './view.ts';
import { icon } from './icons.ts';
import { Sim } from './sim.ts';

export const D = Sim.D, CELL = 64;
/** The width of the map in cells. Rulesets may change it (no open sea ring: two cells fewer), so it follows the game that is loaded: see `syncWidth`. */
export let W = D.width;
/** Take the width of the game now loaded; true when it changed. */
export function syncWidth() { if (W === D.width) return false; W = D.width; return true; }
/** The size of the map in map units. */
export const SIZE = () => W * CELL;
/** The seat whose view is shown: the player (0), or any seat while watching a replay. */
export let me = 0;
export function showSeat(p: number) { me = p; Sim.view(p); }
/** A player's record as its owner sees it: the hand and deck are cards, not counts. */
export type Own = Omit<PlayerView, 'hand' | 'deck'> & { hand: string[]; deck: string[] };
/** The shown player's own record. It keeps its identity when the game changes. */
export const P = D.players[me] as Own;
export const lang = () => document.documentElement.lang || 'en';
/** English or Russian: from a pair `[en, ru]` or from a record with `en` and `ru`. */
export const pick = (x: Pair | { en: string; ru: string }): string => (Array.isArray(x) ? x[lang() === 'ru' ? 1 : 0] : lang() === 'ru' ? x.ru : x.en);
/** A phrase in both languages, picked now. */
export const L = (en: string, ru: string) => pick([en, ru]);
/** An element of the page by id. The page always has the ones the code asks for. */
export const $ = (id: string) => document.getElementById(id)!;
const T: Record<string, Pair> = {
  round: ['Round', 'Тур'], of: ['of', 'из'], tax: ['Tax', 'Налог'], gold: ['Gold', 'Золото'], bells: ['Bells', 'Колокола'], crosses: ['Crosses', 'Кресты'], ref: ['King’s army', 'Армия короля'],
  hand: ['Your agents', 'Ваши агенты'], deck: ['deck', 'колода'], discard: ['discard', 'сброс'], pass: ['Pass', 'Пас'], warehouse: ['Warehouse', 'Склад'], hold: ['Hold', 'Трюм'], buildings: ['Buildings', 'Постройки'], fathers: ['Founding Fathers', 'Отцы-основатели'],
  colony: ['Colony', 'Колония'], europe: ['Europe', 'Европа'], market: ['Market', 'Рынок'], pier: ['Pier', 'Причал'], salon: ['Salon', 'Салон'], plans: ['Building projects', 'Проекты построек'], demand: ['demand', 'спрос'], free: ['free', 'свободно'], slot: ['Free slot', 'Свободно'],
  war: ['War of Independence', 'Война за независимость'], warshort: ['War', 'Война'], map: ['Map', 'Карта'], rivals: ['Governors', 'Губернаторы'], log: ['Chronicle', 'Хроника'], defence: ['Defence', 'Защита'], yields: ['This agent can gather', 'Этот агент может добыть'],
  settlement: ['Settlement', 'Поселение'], population: ['Population', 'Население'], hostility: ['Hostility', 'Враждебность'], loot: ['Loot', 'Добыча'], ally: ['Ally', 'Союз'], none: ['none', 'нет'], terrain: ['Terrain', 'Местность'], bonus: ['Bonus', 'Бонус'], raid: ['Raids when an event calls it', 'Набег при активации'], calm: ['Quiet', 'Спокойно'], gift: ['Brings food when an event calls it', 'Дарит еду при активации'],
  attack: ['Attack', 'Атака'], holds: ['Holds', 'Удержана'], falls: ['Falls', 'Пала'], loyalist: ['Loyalist', 'Лоялист'], patriot: ['Patriot', 'Патриот'], tactic: ['King’s tactic', 'Тактика короля'], cubes: ['redcoats', 'красные мундиры'], odds: ['Chance to hold', 'Шанс удержать'], dice: ['Dice', 'Кубики'], result: ['Final score', 'Итоговый счёт'],
  choose: ['Pick an agent, then an action', 'Выберите агента, затем действие'], why: ['Not now', 'Недоступно'], show: ['Show', 'Показать'], score: ['points', 'очков'], unexplored: ['Unexplored', 'Не исследовано'], ship: ['Ship', 'Корабль'], infantry: ['Infantry', 'Пехота'], ruin: ['Ruins', 'Руины'], wreck: ['Shipwreck', 'Кораблекрушение'], sea: ['Open sea', 'Открытое море'],
   forecast: ['If the war came now', 'Если бы война началась сейчас'], you: ['you', 'вы'], close: ['Close', 'Закрыть'], confirm: ['Do it', 'Выполнить'], back: ['Back', 'Назад'], undo: ['Undo', 'Отменить'],
};
export const t = (k: string) => (T[k] ? pick(T[k]) : k);
export const ACT: Record<string, Pair> = {
  produce: ['Gather', 'Добыча'], docks: ['Fish from the docks', 'Ловля у причала'], work: ['Work in a building', 'Работа в постройке'], moveShip: ['Sail', 'Плыть'], moveInfantry: ['March', 'Идти'], found: ['Found a colony', 'Основать колонию'], attack: ['Attack', 'Атака'], trade: ['Sell in Europe', 'Торговля'], hire: ['Hire', 'Наём'], propaganda: ['Win over a Father', 'Пропаганда'], repair: ['Repair', 'Ремонт'], shipyard: ['Repair at the shipyard', 'Ремонт на верфи'], build: ['Build', 'Строительство'], teach: ['Teach', 'Обучение'], customs: ['Sell at the custom house', 'Таможня'], supply: ['Supply', 'Снабжение'], exchange: ['Exchange agents', 'Обмен'], gift: ['Give a gift', 'Подарок'], preach: ['Preach', 'Проповедь'], alliance: ['Make an alliance', 'Союз'], smuggle: ['Smuggle', 'Контрабанда'],
};
const WHY_RU: Record<string, string> = { 'infantry must be on land': 'пехота должна быть на суше', 'not a revealed land cell': 'не открытая суша', 'on the edge of the map': 'на краю карты', 'the cell is taken': 'клетка занята', 'next to a colony': 'рядом колония', 'next to a settlement': 'рядом поселение', 'no sea passage to Europe': 'нет морского пути в Европу', 'needs 5 food': 'нужно 5 еды', 'needs 2 timber': 'нужно 2 древесины', 'the ship must be in Europe': 'корабль должен быть в Европе', 'no settlement next to a token': 'нет поселения рядом', 'needs an agent with ⚔️': 'нужен военный агент', 'no target in reach': 'нет цели рядом', 'needs a school': 'нужна школа', 'needs a custom house': 'нужна таможня', 'needs a shipyard': 'нужна верфь', 'needs 1 food': 'нужна 1 еда', 'needs higher education or a scout': 'нужно высшее образование или скаут', 'nothing to choose from': 'не из чего выбрать', 'the limit of colonies is reached': 'достигнут предел колоний' };
export const why = (s: string) => (lang() === 'ru' && WHY_RU[s] ? WHY_RU[s] : s);
export const art = {
  agent: (id: string) => `art/agent/${D.agents[id].base}.webp`,
  building: (id: string) => `art/building/${id === 'blacksmith_shop' ? 'blacksmiths_shop' : id}.webp`,
  father: (id: string) => `art/father/${id === 'benedict_arnold' ? 'edward_colston' : id}.webp`,
  tribe: (id: string) => `art/tribe/${id}.webp`, nation: (id: string) => `art/nation/${id}.webp`, emblem: (id: string) => `art/emblem/${id}.svg`,
};
/** The five resources, in the order the interface lists them. */
export const RES: Resource[] = [...RESOURCES];
export const tokenAt = (c: number) => { for (let i = 0; i < D.players.length; i++) { if (D.players[i].ship === c) return { p: i, kind: 'ship' }; if (D.players[i].inf === c) return { p: i, kind: 'infantry' }; } return null; };
export const colonyAt = (c: number) => D.colonies.find((x) => x.cell === c);
export const settlementAt = (c: number) => D.settlements.find((x) => x.alive && x.cell === c);
/** Top left corner of a cell, in map units. */
export const at = (c: number) => [(c % W) * CELL, Math.floor(c / W) * CELL];
/** Cells are named as on the grid, counted from the top left corner of Europe's ring, which is A1: a column letter, then a row number. */
/** A column's letters: A to Z, then AA, AB… as in a spreadsheet, for maps wider than 26 cells. */
export const column = (x: number): string => (x >= 26 ? column(Math.floor(x / 26) - 1) : '') + String.fromCharCode(65 + (x % 26));
export const cellName = (c: number) => `${column(c % D.width)}${Math.floor(c / D.width) + 1}`;
/** The cell a log entry is about, if any: where a colony was founded, an attack or a siege took place, a settlement acted. */
export function placeOf(e: Entry): number | null {
  if (typeof e.cell === 'number') return e.cell;
  if (typeof e.settlement === 'number') return D.settlements.find((x) => x.n === e.settlement)?.cell ?? null;
  return null;
}
/** One line of the chronicle. */
export function logLine(e: Entry) {
  const who = e.p === undefined ? '' : `<b style="--c:${D.players[e.p].color}" class="who">${pick(D.names.nations[D.players[e.p].nation])}</b> `;
  const A = (k: string) => pick(ACT[k] || [k, k]).toLowerCase();
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
export const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
