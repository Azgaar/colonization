/* One panel for every decision that is not placing an agent. */
import { RESOURCES, type ChoiceOption, type Node, type Resource } from '@col/data';
import { $, art, cap, cellName, D, L, P, pick, settlementAt, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import { Sim, type Entry, type Opt, type Pending } from '../sim.ts';
import { S, X } from '../state.ts';
import { Texts, trait } from '../texts.ts';
import type { Pair, Snapshot } from '../view.ts';
import { all, costs, eventCard, lastPoi, poiCard, poiDef, sinceEvent, table } from './cards.ts';
import { goods } from './goods.ts';
import { bigCard, btn, choice, name, panel, res } from './kit.ts';
import { results } from './reports.ts';
/** How a choice looks on a button: a picture, a title and a line under it. */
interface Face { img?: string; title: string; sub?: string }
/** What a decision shows: a panel, a bar over the map, or a large card. */
type Shown = string | { bar: true; html: string } | { big: true; html: string };
type Combat = NonNullable<Snapshot['combat']>;
const mods = (card: string) => D.agents[card].mods;
export const deciding = () => X.reports.length > 0 || (Sim.mine() && !Sim.busy && Sim.kind() !== 'turn') || false;
/* ---- generic choices ---- */
const ASK: Record<string, Pair> = {
  startCell: ['Choose where your ship starts, on the edge of the map', 'Выберите, откуда начнёт корабль, на краю карты'], overflow: ['No room for everything. Discard:', 'Не хватает места. Сбросьте:'], recruit: ['Top agent of the deck: take it, or put it back', 'Верхний агент колоды: взять или вернуть'], takeNative: ['Take a native agent?', 'Взять агента-индейца?'], plunder: ['Plunder: take a good or destroy a building', 'Грабёж: возьмите товар или разрушьте постройку'], lootHold: ['The hold of the beaten ship', 'Трюм побеждённого корабля'], refuge: ['Where does your ship take shelter?', 'Где укроется ваш корабль?'], discardCards: ['Discard an agent', 'Сбросьте агента'], payResource: ['Pay with', 'Заплатите'], raid: ['Natives raid your colony. You lose:', 'Набег на вашу колонию. Вы теряете:'], colonyWater: ['Move your ship to', 'Переместите корабль'], nearestSettlement: ['Which settlement?', 'Какое поселение?'], guide: ['Choose what to explore', 'Выберите, что исследовать'], freeBuilding: ['A free building', 'Бесплатная постройка'], takeFromPier: ['Take an agent from the pier', 'Возьмите агента с причала'], freeColony: ['Found a colony free', 'Основать колонию бесплатно'], convertCrosses: ['Turn crosses into bells', 'Обменять кресты на колокола'], cheapestFather: ['Take the cheapest Father', 'Возьмите самого дешёвого отца'], mayTake: ['An agent offers to join', 'Агент готов присоединиться'], payOrRef: ['Pay the King, or his army grows', 'Заплатите королю, или его армия вырастет'], sellAgents: ['Sell the top agent of your deck?', 'Продать верхнего агента колоды?'], joint: ['How many crosses do you give up?', 'Сколько крестов отдать?'], payPerBuilding: ['For how many buildings do you pay?', 'За сколько построек заплатить?'], cheapBuild: ['Build for 2 timber', 'Построить за 2 древесины'], accuse: ['Whom do you accuse?', 'Кого обвинить?'], loseLearned: ['You lose a learned agent', 'Вы теряете образованного агента'], payOrRemove: ['Pay, or the agent leaves', 'Заплатите, или агент уйдёт'], sacredForest: ['What do you give the natives?', 'Что отдать индейцам?'], boycott: ['Pay for the goods or throw them away', 'Заплатить за товары или выбросить'], blockade: ['Pirates demand a ransom', 'Пираты требуют выкуп'], betray: ['Benedict Arnold betrays a colony', 'Бенедикт Арнольд предаёт колонию'],
};
const WORD: Record<string, Pair> = { pay: ['Pay', 'Заплатить'], refuse: ['Refuse', 'Отказаться'], yes: ['Yes', 'Да'], no: ['No', 'Нет'], done: ['Done', 'Готово'], skip: ['Skip', 'Пропустить'], keep: ['Keep', 'Оставить'], leave: ['Leave it', 'Оставить'], sink: ['Sink it', 'Потопить'], stop: ['Stop', 'Хватит'], top: ['Back on top', 'Вернуть наверх'], bottom: ['Under the deck', 'Под колоду'], europe: ['Europe', 'Европа'], resources: ['2 goods', '2 товара'], anger: ['Nothing: they grow angrier', 'Ничего: враждебность растёт'], goods: ['1 goods', '1 товары'], gold: ['5 gold', '5 золота'], boycott: ['Throw away', 'Выбросить'], remove: ['Let go', 'Отпустить'] };
/** The options of a ruin or wreck that asks for a choice. */
const optsOf = (d: Pending): ChoiceOption[] => d.opts;
export const where = cellName;
/** How a choice looks in a decision panel. */
export function look(c: Opt, d: Pending): Face {
  if (c.c === 'option') { const o = optsOf(d).find((x) => x.id === c.id)!, k = o.cost || {}; return { title: pick([o.en, o.ru]) + (c.card ? `: ${pick(D.agents[c.card])}` : ''), sub: (['gold', 'bells', 'crosses'] as const).filter((q) => k[q]).map((q) => Places.plus(-(k[q] ?? 0), q, 16)).join(' ') + (k.agent && !c.card ? L('your agent can', 'агент подходит') : '') }; }
  if (c.card && D.agents[c.card]) return { img: art.agent(c.card), title: pick(D.agents[c.card]), sub: trait(c.card) };
  if (c.card) return { title: pick(D.names.ruins[c.card] || D.names.wrecks[c.card] || [c.card, c.card]) };
  if (c.agent) return { img: art.agent(c.agent), title: pick(D.agents[c.agent]), sub: trait(c.agent) };
  if (c.father) return { img: art.father(c.father), title: pick(D.fathers[c.father]), sub: Texts.father(c.father, 14) };
  if (c.b) return { img: art.building(c.b), title: cap(pick(D.buildings[c.b])) };
  if (c.r) return { title: `${c.n ? `${c.n} × ` : ''}${res(c.r)}`, sub: c.from ? t(c.from === 'wh' ? 'warehouse' : 'hold') : '' };
  if (c.settlement) return { img: art.tribe(D.settlements[c.settlement - 1].tribe), title: pick(D.names.tribes[D.settlements[c.settlement - 1].tribe]) };
  if (c.cell !== undefined) return { title: where(c.cell) };
  if (c.player !== undefined) return { title: `${Places.em(c.player, 24)} ${name(c.player)}` };
  if (c.n !== undefined) return { title: String(c.n) };
  if (c.c === 'pay' && d.gold !== undefined) { const r: Resource = d.res; return { title: pick(WORD.pay), sub: Places.plus(-(d.kind === 'boycott' ? d.gold * P.wh[r] : d.gold), 'gold', 16) }; }
  if (c.c === 'refuse' && d.ref) return { title: pick(WORD.refuse), sub: `${Places.plus(d.ref, 'ref', 16)}${d.bells ? ` ${Places.plus(d.bells, 'bells', 16)}` : ''}` };
  return { title: pick(WORD[c.c] || [c.c, c.c]) };
}
function poiChoice(e: Entry, d: Pending, legal: Opt[]): Shown {
  const always = all(poiDef(e).do), rows = optsOf(d).map((o) => {
    const l = legal.filter((c) => c.id === o.id), cost = costs(o.cost), inner = `<span class="nm"><b>${pick([o.en, o.ru])}</b>${cost ? `<small class="cst">${cost}</small>` : ''}${o.needs ? `<small class="cst">${L('needs a colony', 'нужна колония')}</small>` : ''}</span><span class="res">${all(o.do) || (table(o.do) ? '' : cost ? L('nothing more', 'больше ничего') : L('nothing happens', 'ничего'))}${table(o.do)}</span>`;
    if (l.length === 1 && !l[0].card) return `<button class="opt" ${choice(l[0])}>${inner}</button>`;
    if (!l.length) return `<div class="opt no">${inner}</div>`;
    return `<div class="opt">${inner}<span class="ag">${l.map((c) => `<button ${choice(c)} title="${c.card ? pick(D.agents[c.card]) : ''}">${c.card ? `<img src="${art.agent(c.card)}" alt="">${pick(D.agents[c.card])}` : pick([o.en, o.ru])}</button>`).join('')}</span></div>`;
  }).join('');
  return { big: true, html: poiCard(e, `${always ? `<p class="alw">${always}</p>` : ''}<div class="opts">${rows}</div>`) };
}
/** Both kinds of choice: those with a picture (cards) and the rest (buttons). */
const facesOf = (d: Pending, legal: Opt[]) => legal.map((c): [Opt, Face] => [c, look(c, d)]);
function generic(d: Pending, legal: Opt[]): Shown {
  // A question an event asks is part of its card.
  if (D.event) { const most = Sim.s.def.events[D.event]?.do.find((n): n is Extract<Node, { n: 'mostPays' }> => n.n === 'mostPays'), faces = facesOf(d, legal), q = `${d.kind === 'payOrRef' && most ? `<p><b>${L('You have the most', 'У вас больше всех:')} ${icon(most.res, 19)}</b></p>` : ''}<h3>${pick(ASK[d.kind] || ['', ''])}${d.kind === 'mayTake' ? `: ${pick(D.agents[d.agent])} ${Places.plus(-d.gold, 'gold', 17)}` : d.kind === 'payOrRemove' ? `: ${pick(D.agents[d.card])}` : ''}</h3>${faces.some(([, f]) => f.img) ? `<div class="cds">${faces.filter(([, f]) => f.img).map(([c, f]) => `<button class="cd" ${choice(c)}><img src="${f.img}" alt=""><b>${f.title}</b><small>${f.sub || ''}</small></button>`).join('')}</div>` : ''}`; return { big: true, html: eventCard(D.event, results(sinceEvent()) + q, faces.filter(([, f]) => !f.img).map(([c, f]) => btn(`${f.title}${f.sub ? ` <small>${f.sub}</small>` : ''}`, choice(c))).join('')) }; }
  const ev = D.event ? `<p class="ev"><b>${pick(D.names.events[D.event])}.</b> ${Texts.event(D.event, 15)}</p>` : '';
  let title = pick(ASK[d.kind] || [d.kind, d.kind]), img = '', body = ev;
  if (d.kind === 'nodeChoice') { const e = lastPoi(); if (e) return poiChoice(e, d, legal); }
  if (d.kind === 'mayTake') { body += `<p>${pick(D.agents[d.agent])}${d.gold ? `, ${d.gold} ${icon('gold', 16)}` : ''}</p>`; img = art.agent(d.agent); }
  if (d.kind === 'payOrRemove') { img = art.agent(d.card); body += `<p>${pick(D.agents[d.card])}</p>`; }
  if (d.kind === 'overflow') body += `<p>${t(d.from === 'wh' ? 'warehouse' : 'hold')}</p>`;
  const faces = facesOf(d, legal), cards = faces.some(([, f]) => f.img);
  return panel(title, `${body}${cards ? `<div class="cds">${faces.filter(([, f]) => f.img).map(([c, f]) => `<button class="cd" ${choice(c)}><img src="${f.img}" alt=""><b>${f.title}</b><small>${f.sub || ''}</small></button>`).join('')}</div>` : ''}`, faces.filter(([, f]) => !f.img).map(([c, f]) => btn(`${f.title}${f.sub ? ` <small>${f.sub}</small>` : ''}`, choice(c))).join(''), img);
}
/* ---- the special ones ---- */
const sellAt = (card: string, r: Resource) => Math.max(0, D.price[r] + [...mods(card), ...P.fathers.flatMap((f) => Sim.s.def.fathers[f].mods)].filter((m) => m.mod === 'sellPrice').reduce((n, m) => n + m.add, 0));
/** The swords an agent adds in this battle: for the attacker's token when attacking, for the attacked ship or infantry when defending. */
const might = (card: string, c: Combat, side: 'a' | 'd') => { const kind = side === 'd' ? (c.target === 'ship' ? 'ship' : 'infantry') : c.token, v = { infantry: 0, ship: 0 }; for (const m of mods(card)) if (m.mod === 'combat' && (m.vs !== 'native' || c.target === 'settlement') && (!m.terrain || D.terrain[c.from] === m.terrain)) v[m.token] += m.add; return c.bombard ? Math.max(v.infantry, v.ship) : v[kind]; };
/** The decisions with a panel of their own. */
const V: Record<string, (d: Pending, legal: Opt[]) => Shown> = {
  move(d, legal) {
    const m = D.move; if (!m) return '';
    const ship = m.token === 'ship', has = (k: string) => legal.some((c) => c.c === k);
    return { bar: true, html: `<span class="ttl">${t(ship ? 'ship' : 'infantry')}: <b>${m.points}</b> ${L(m.points === 1 ? 'point left' : 'points left', 'очк. хода')}</span><span class="tip">${[L('Click a lit cell to go on', 'Клик по клетке: плыть дальше'), has('explore') ? L('click the clouds to explore', 'по облакам: разведать') : ''].filter(Boolean).join(', ')}</span>${has('cargo') ? btn(L('Load and unload', 'Погрузка'), choice({ c: 'cargo' }), 'hot') : ''}${has('embark') ? btn(L('Take infantry aboard', 'Взять пехоту на борт'), choice({ c: 'embark' })) : ''}${btn(L('End move', 'Закончить'), choice({ c: 'end' }), 'go')}` };
  },
  cargo() {
    X.cargo ??= { wh: { ...P.wh }, hold: { ...P.hold }, was: { ...P.hold } };
    const c = X.cargo, free = 4 - Places.sum(c.hold) - P.damage - (P.inf === 'ship' ? 1 : 0), over = Places.sum(c.wh) - D.cap, list = (x: Record<string, number>, to: 'hold' | 'wh') => goods(x).map((r) => `<button data-cargo="${to}" data-r="${r}" ${to === 'hold' && free <= 0 ? 'disabled' : ''} aria-label="${pick(D.names.resources[r])}">${icon(r, 34)}</button>`).join('') || `<span class="dim">${t('none')}</span>`;
    return panel(L('Load and unload', 'Погрузка и разгрузка'), `<p>${L('Click a good to move it to the other side.', 'Клик по товару переносит его на другую сторону.')}</p><div class="crg"><div><h4>${t('warehouse')} ${Places.sum(c.wh)}/${D.cap}</h4><div class="gs">${list(c.wh, 'hold')}</div></div><div><h4>${t('hold')} ${4 - free}/4</h4><div class="gs">${list(c.hold, 'wh')}</div></div></div>${over > 0 ? `<p class="warn">${L(`${over} too many for the warehouse. You will discard them at the end of your turn.`, `На складе лишних: ${over}. Их придётся сбросить в конце хода.`)}</p>` : ''}`, btn(L('Load all', 'Загрузить всё'), 'data-cargo="all"') + btn(L('Unload all', 'Разгрузить всё'), 'data-cargo="none"') + btn(L('Done', 'Готово'), 'data-cargo="ok"', 'go'));
  },
  trade(d) {
    const sell = (X.sell ??= Object.fromEntries(RESOURCES.map((r) => [r, d.done.includes(r) ? 0 : P.hold[r]])));
    const gold = RESOURCES.reduce((n, r) => n + sell[r] * sellAt(d.card, r), 0);
    return panel(t('market'), `<div class="sl">${RESOURCES.filter((r) => P.hold[r]).map((r) => `<span>${icon(r, 28)}</span><span>${pick(D.names.resources[r])}, ${sellAt(d.card, r)} ${icon('gold', 16)}</span><span class="stp"><button data-sell="${r}" data-n="-1" ${sell[r] <= 0 ? 'disabled' : ''}>−</button><b>${sell[r]}</b>/${P.hold[r]}<button data-sell="${r}" data-n="1" ${sell[r] >= P.hold[r] ? 'disabled' : ''}>+</button></span><span class="dim">${t('demand')} ${D.demand[r]}/${D.players.length}</span>`).join('')}</div>`, btn(`${L('Sell', 'Продать')} <small>${Places.plus(gold, 'gold', 16)}</small>`, 'data-sell="ok"', 'go'));
  },
  hire(d, legal) { return panel(d.bought.length ? L('Hire one more?', 'Нанять ещё одного?') : L('Hire', 'Наём'), `<div class="cds">${legal.filter((c) => c.agent).map((c) => `<button class="cd" ${choice(c)}><img src="${art.agent(c.agent)}" alt=""><b>${pick(D.agents[c.agent])}</b><small>${trait(c.agent)}</small><em>${Places.price(d.card, c.agent)}${icon('gold', 15)}</em></button>`).join('') || `<p>${L('You cannot afford anyone else.', 'Больше никто не по карману.')}</p>`}</div>`, legal.filter((c) => !c.agent).map((c) => btn(c.c === 'refresh' ? L('New agents on the pier', 'Обновить причал') : L('Enough', 'Достаточно'), choice(c), 'go')).join('')); },
  propaganda(d, legal) { return panel(L('Win over one more?', 'Склонить ещё одного?'), `<div class="cds">${legal.filter((c) => c.father).map((c) => `<button class="cd fa" ${choice(c)}><img src="${art.father(c.father)}" alt=""><b>${pick(D.fathers[c.father])}</b><small>${Texts.father(c.father, 14)}</small><em>${D.fathers[c.father].bells}${icon('bells', 15)}</em></button>`).join('')}</div>`, legal.filter((c) => !c.father).map((c) => btn(L('Enough', 'Достаточно'), choice(c), 'go')).join('')); },
  discardHand() { return panel(t('pass'), `<p>${L('Unused agents stay in your hand. Click those you would rather discard.', 'Неиспользованные агенты останутся на руке. Отметьте тех, кого сбросить.')}</p><div class="cds">${P.hand.map((c, i) => `<button class="cd${X.sel.includes(i) ? ' off' : ''}" data-sel="${i}" aria-pressed="${X.sel.includes(i)}"><img src="${art.agent(c)}" alt=""><b>${pick(D.agents[c])}</b><small>${X.sel.includes(i) ? L('discard', 'сбросить') : L('keep', 'оставить')}</small></button>`).join('')}</div>`, btn(t('pass'), 'data-sel="ok"', 'go')); },
  tax(d, legal) { const can = legal.some((c) => c.c === 'pay'), set = D.settings.tax, paid = Sim.s.log.slice(Sim.s.log.findLastIndex((x) => x.e === 'event' || x.e === 'round') + 1).filter((x) => x.e === 'tax'); return { big: true, html: bigCard('tax', 'art/europe.webp', `${L('The King demands', 'Король требует')} ${D.tax} ${icon('gold', 34)}`, '', `<p>${L('You have', 'У вас')} ${P.gold} ${icon('gold', 19)}. ${set.refuseBells ? L('Refusing gives you a bell, and the King sends more soldiers to the war.', 'Отказ даёт колокол, а король пошлёт на войну больше солдат.') : L('If you refuse, the King sends more soldiers to the war.', 'Если откажете, король пошлёт на войну больше солдат.')}</p>${paid.length ? `<ul class="who">${paid.map((x) => `<li><span class="pl">${Places.em(x.p!, 22)}<b>${name(x.p!)}</b></span><span>${x.pay ? L('paid', 'заплатили') : L('refused', 'отказались')}</span></li>`).join('')}</ul>` : ''}`, btn(`${L('Pay', 'Заплатить')} <small>${Places.plus(-D.tax, 'gold', 17)}</small>`, can ? choice({ c: 'pay' }) : 'disabled') + btn(`${L('Refuse', 'Отказать')} <small>${Places.plus(set.refuseRef, 'ref', 17)}${set.refuseBells ? ` ${Places.plus(set.refuseBells, 'bells', 17)}` : ''}</small>`, choice({ c: 'refuse' }), 'go')) }; },
  commit(d, legal) {
    const c = D.combat; if (!c) return '';
    const side = d.side, my = c.strength[side === 'a' ? 'attack' : 'defence'].total, their = c.strength[side === 'a' ? 'defence' : 'attack'].total, add = X.sel.reduce((n, i) => n + 1 + might(P.hand[i], c, side), 0), what = c.target === 'settlement' ? pick(D.names.tribes[settlementAt(c.cell)!.tribe]) : name(side === 'a' ? c.defender! : c.attacker);
    const unknown = side === 'a' && c.target !== 'settlement', gap = side === 'a' ? my + add - their : their - my - add;
    return panel(side === 'a' ? `${L('Attack', 'Атака')}: ${what}` : `${what} ${L('attacks you', 'атакует вас')}`, `<div class="vs"><div><b>${my + add}</b><small>${L('your strength', 'ваша сила')}</small></div><span>${L('against', 'против')}</span><div><b>${their}${unknown ? '+' : ''}</b><small>${L('theirs', 'их сила')}${unknown ? `, ${L('they may add cards', 'могут добавить карты')}` : ''}</small></div></div><p>${gap > 0 ? L(`${gap} dice, success on 4 and 5.`, `Кубиков: ${gap}, успех на 4 и 5.`) : side === 'a' ? L('Not stronger: the attack would fail.', 'Не сильнее: атака провалится.') : L('Not weaker: the attack would fail.', 'Не слабее: атака провалится.')} ${L('Click agents to send them in. Each adds 1 and its swords.', 'Клик отправляет агента в бой: +1 и его мечи.')}</p><div class="cds">${P.hand.map((h, i) => (legal.some((q) => q.card === h) ? `<button class="cd${X.sel.includes(i) ? ' on' : ''}" data-sel="${i}" aria-pressed="${X.sel.includes(i)}"><img src="${art.agent(h)}" alt=""><b>${pick(D.agents[h])}</b><small>+${1 + might(h, c, side)} ${icon('sword', 14)}</small></button>` : '')).join('')}</div>`, (legal.some((q) => q.c === 'top') ? btn(L('Add the top of my deck, unseen', 'Добавить верхнюю карту колоды'), 'data-sel="top"') : '') + btn(side === 'a' ? L('Attack', 'В атаку') : L('Defend', 'Защищаться'), 'data-sel="ok"', 'go'));
  },
  placeCards(d, legal) { const card = legal[0].card, left = d._cards.length; return panel(`${pick(D.agents[card])} <small>${left} ${L('left to place', 'осталось')}</small>`, `<p>${d.side === 'loyalist' ? L('Where does this agent fight for the King?', 'Где этот агент сражается за короля?') : L('Which colony does this agent defend?', 'Какую колонию защищает этот агент?')} ${trait(card)}</p><div class="sgs">${legal.filter((c) => c.c === 'place').map((c) => siege(c.siege, choice(c))).join('')}</div>`, btn(L('Keep out of the war', 'Не участвует'), choice({ c: 'keep', card })) + btn(L('Keep all the rest', 'Остальных не ставить'), 'data-rest'), art.agent(card)); },
  placeCubes(d, legal) { const i = legal[0].siege; return panel(`${d.side === 'support' ? L('Militia, mercenaries and allies', 'Ополчение, наёмники и союзники') : L('Loyalist militia', 'Ополчение лоялиста')}: ${d._left}`, `<p>${L('How many here? The rest go to the next colony.', 'Сколько сюда? Остальные пойдут дальше.')}</p><div class="sgs">${siege(i, '')}</div>`, legal.map((c) => btn(String(c.n), choice(c), 'num')).join('')); },
  militia(d, legal) { return panel(L('Call the militia', 'Созвать ополчение'), `<p>${L('Each bell gives 1 strength. Unspent bells are 1 point each.', 'Каждый колокол даёт 1 силу. Оставшиеся колокола дают по 1 очку.')}</p>`, legal.map((c) => btn(`${c.n} ${icon('bells', 16)}`, choice(c), 'num')).join('')); },
  mercenaries(d, legal) { return panel(L('Hire mercenaries', 'Нанять наёмников'), `<p>${L(`5 gold for 1 strength. You also have ${d._cubes} from militia and allies.`, `5 золота за 1 силу. Ополчение и союзники дают: ${d._cubes}.`)}</p>`, legal.map((c) => btn(`${c.n} <small>${Places.plus(-c.n * D.settings.war.mercenaryGold, 'gold', 15)}</small>`, choice(c), 'num')).join('')); },
  betray(d, legal) { return panel(pick(ASK.betray), `<div class="sgs">${legal.filter((c) => c.c === 'betray').map((c) => siege(c.siege, choice(c))).join('')}</div>`, btn(pick(WORD.skip), choice({ c: 'skip' }))); },
  startCell() { return { bar: true, html: `<span class="ttl">${pick(ASK.startCell)}</span>` }; },
};
function siege(i: number, act: string) { const x = D.war?.sieges[i]; if (!x) return ''; return `<button class="sg" ${act || 'disabled'}>${Places.em(x.owner, 34)}<span><b>${name(x.owner)}, ${where(x.cell)}</b><small>${x.cubes} ${t('cubes')}</small></span><span class="nums"><i>${x.attack.total}</i> / <b>${x.defence.total}</b></span></button>`; }
/* ---- showing ---- */
export function paintStep() {
  const el = $('step'), d: Pending | null = D.pending, key = d ? `${d.kind}${Sim.s.log.length}${P.hand.length}` : '';
  if (key !== X.key) { X.key = key; X.sel = []; if (d?.kind !== 'cargo') X.cargo = null; if (d?.kind !== 'trade') X.sell = null; }
  let html = '', isBar = false, big = false;
  if (Sim.busy || S.war >= 0) html = '';
  else if (X.reports.length) { big = !!X.reports[0].big; html = big ? X.reports[0].html : X.reports[0].html.replace('<div class="bts">', `<div class="bts">${btn('OK', 'data-ok', 'go')}`); }
  else if (Sim.mine() && d && d.kind !== 'turn') { const l = Sim.legal(), v = V[d.kind] ? V[d.kind](d, l) : generic(d, l); if (typeof v === 'string') html = v; else if ('bar' in v) { html = v.html; isBar = true; } else { html = v.html; big = true; } }
  el.className = `step${html ? ' on' : ''}${isBar ? ' bar' : ''}${big ? ' evt' : ''}`; document.body.classList.toggle('shaded', big); if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  document.body.classList.toggle('step-on', !!html); document.body.classList.toggle('moving', isBar);
}
/** The cards picked in a panel, sorted. */
export function pickedCards(): string[] { return X.sel.map((i) => P.hand[i]).sort(); }
