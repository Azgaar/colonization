/* One panel for every decision that is not placing an agent. */
import { RESOURCES, type ChoiceOption, type Node, type Resource } from '@col/data';
import { $, art, cap, cellName, colonyName, D, me, P, pick, settlementAt, t, table as words } from '../data.ts';
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
import { holdChance as holdOdds } from './war.ts';
import { back, banner, card, chance, colorOf, crest, fight, frontLines, isAgents, lines, men, odds, stage, strongest, warPower } from './siege.ts';
/** How a choice looks on a button: a picture, a title and a line under it. */
interface Face { img?: string; title: string; sub?: string }
/** What a decision shows: a panel, a bar over the map, or a large card. */
type Shown = string | { bar: true; html: string } | { big: true; html: string };
type Combat = NonNullable<Snapshot['combat']>;
const mods = (card: string) => D.agents[card].mods;
export const deciding = () => X.reports.length > 0 || (Sim.mine() && !Sim.busy && Sim.kind() !== 'turn') || false;
/* ---- generic choices ---- */
const ASK: Record<string, Pair> = words('ask');
const WORD: Record<string, Pair> = words('word');
/** The options of a ruin or wreck that asks for a choice. */
const optsOf = (d: Pending): ChoiceOption[] => d.opts;
export const where = cellName;
/** How a choice looks in a decision panel. */
export function look(c: Opt, d: Pending): Face {
  if (c.c === 'option') { const o = optsOf(d).find((x) => x.id === c.id)!, k = o.cost || {}; return { title: pick([o.en, o.ru]) + (c.card ? `: ${pick(D.agents[c.card])}` : ''), sub: (['gold', 'bells', 'crosses'] as const).filter((q) => k[q]).map((q) => Places.plus(-(k[q] ?? 0), q, 16)).join(' ') + (k.agent && !c.card ? t('decisions.agent') : '') }; }
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
    const l = legal.filter((c) => c.id === o.id), cost = costs(o.cost), inner = `<span class="nm"><b>${pick([o.en, o.ru])}</b>${cost ? `<small class="cst">${cost}</small>` : ''}${o.needs ? `<small class="cst">${t('decisions.needs_colony')}</small>` : ''}</span><span class="res">${all(o.do) || (table(o.do) ? '' : cost ? t('decisions.nothing') : t('decisions.nothing_happens'))}${table(o.do)}</span>`;
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
  if (D.event) { const most = Sim.s.def.events[D.event]?.do.find((n): n is Extract<Node, { n: 'mostPays' }> => n.n === 'mostPays'), faces = facesOf(d, legal), q = `${d.kind === 'payOrRef' && most ? `<p><b>${t('decisions.you_have')} ${icon(most.res, 19)}</b></p>` : ''}<h3>${pick(ASK[d.kind] || ['', ''])}${d.kind === 'mayTake' ? `: ${pick(D.agents[d.agent])} ${Places.plus(-d.gold, 'gold', 17)}` : d.kind === 'payOrRemove' ? `: ${pick(D.agents[d.card])}` : ''}</h3>${faces.some(([, f]) => f.img) ? `<div class="cds">${faces.filter(([, f]) => f.img).map(([c, f]) => `<button class="cd" ${choice(c)}><img src="${f.img}" alt=""><b>${f.title}</b><small>${f.sub || ''}</small></button>`).join('')}</div>` : ''}`; return { big: true, html: eventCard(D.event, results(sinceEvent()) + q, faces.filter(([, f]) => !f.img).map(([c, f]) => btn(`${f.title}${f.sub ? ` <small>${f.sub}</small>` : ''}`, choice(c))).join('')) }; }
  const ev = D.event ? `<p class="ev"><b>${pick(D.names.events[D.event])}.</b> ${Texts.event(D.event, 15)}</p>` : '';
  let title = pick(ASK[d.kind] || [d.kind, d.kind]), img = '', body = ev;
  if (d.kind === 'nodeChoice') { const e = lastPoi(); if (e) return poiChoice(e, d, legal); }
  if (d.kind === 'mayTake') { body += `<p>${pick(D.agents[d.agent])}${d.gold ? `, ${d.gold} ${icon('gold', 16)}` : ''}</p>`; img = art.agent(d.agent); }
  if (d.kind === 'payOrRemove') { img = art.agent(d.card); body += `<p>${pick(D.agents[d.card])}</p>`; }
  if (d.kind === 'overflow') body += `<p>${t(d.from === 'wh' ? 'warehouse' : 'hold')}</p>`;
  if (d.kind === 'recruit' && d.action) title = d.take > 1 ? t('decisions.take_up', { take: d.take }) : t('decisions.take_one');
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
    return { bar: true, html: `<span class="ttl">${t(ship ? 'ship' : 'infantry')}: <b>${m.points}</b> ${t('decisions.points_left', { n: m.points })}</span><span class="tip">${[t('decisions.click_lit'), has('explore') ? t('decisions.click_clouds') : ''].filter(Boolean).join(', ')}</span>${has('cargo') ? btn(t('decisions.load_unload'), choice({ c: 'cargo' }), 'hot') : ''}${has('embark') ? btn(t('decisions.take_infantry'), choice({ c: 'embark' })) : ''}${has('switch') ? btn(t(ship ? 'act.moveInfantry' : 'act.moveShip'), choice({ c: 'switch' })) : ''}${btn(t('decisions.end_move'), choice({ c: 'end' }), 'go')}` };
  },
  cargo() {
    X.cargo ??= { wh: { ...P.wh }, hold: { ...P.hold }, was: { ...P.hold } };
    const c = X.cargo, free = 4 - Places.sum(c.hold) - P.damage - (P.inf === 'ship' ? 1 : 0), over = Places.sum(c.wh) - D.cap, list = (x: Record<string, number>, to: 'hold' | 'wh') => goods(x).map((r) => `<button data-cargo="${to}" data-r="${r}" ${to === 'hold' && free <= 0 ? 'disabled' : ''} aria-label="${pick(D.names.resources[r])}">${icon(r, 34)}</button>`).join('') || `<span class="dim">${t('none')}</span>`;
    return panel(t('decisions.load_unload2'), `<p>${t('decisions.click_good')}</p><div class="crg"><div><h4>${t('warehouse')} ${Places.sum(c.wh)}/${D.cap}</h4><div class="gs">${list(c.wh, 'hold')}</div></div><div><h4>${t('hold')} ${4 - free}/4</h4><div class="gs">${list(c.hold, 'wh')}</div></div></div>${over > 0 ? `<p class="warn">${t('decisions.too_many', { over })}</p>` : ''}`, btn(t('decisions.load'), 'data-cargo="all"') + btn(t('decisions.unload'), 'data-cargo="none"') + btn(t('word.done'), 'data-cargo="ok"', 'go'));
  },
  trade(d) {
    // Europe sells the hold, all of it by default; a custom house sells the warehouse, nothing by default.
    const from = d.from === 'wh' ? P.wh : P.hold;
    const sell = (X.sell ??= Object.fromEntries(RESOURCES.map((r) => [r, d.done.includes(r) || d.from === 'wh' ? 0 : from[r]])));
    const gold = RESOURCES.reduce((n, r) => n + sell[r] * sellAt(d.card, r), 0);
    return panel(t('market'), `<div class="sl">${RESOURCES.filter((r) => from[r]).map((r) => `<span>${icon(r, 28)}</span><span>${pick(D.names.resources[r])}, ${sellAt(d.card, r)} ${icon('gold', 16)}</span><span class="stp"><button data-sell="${r}" data-n="-1" ${sell[r] <= 0 ? 'disabled' : ''}>−</button><b>${sell[r]}</b>/${from[r]}<button data-sell="${r}" data-n="1" ${sell[r] >= from[r] ? 'disabled' : ''}>+</button></span><span class="dim">${t('demand')} ${D.demand[r]}/${D.players.length}</span>`).join('')}</div>`, btn(`${t('decisions.sell')} <small>${Places.plus(gold, 'gold', 16)}</small>`, 'data-sell="ok"', 'go'));
  },
  hire(d, legal) { return panel(d.bought.length ? t('decisions.hire_one') : t('act.hire'), `<div class="cds">${legal.filter((c) => c.agent).map((c) => `<button class="cd" ${choice(c)}><img src="${art.agent(c.agent)}" alt=""><b>${pick(D.agents[c.agent])}</b><small>${trait(c.agent)}</small><em>${Places.price(d.card, c.agent)}${icon('gold', 15)}</em></button>`).join('') || `<p>${t('decisions.cannot_afford')}</p>`}</div>`, legal.filter((c) => !c.agent).map((c) => btn(c.c === 'refresh' ? t('places.new_agents') : t('decisions.enough'), choice(c), 'go')).join('')); },
  propaganda(d, legal) { return panel(t('decisions.win_over'), `<div class="cds">${legal.filter((c) => c.father).map((c) => `<button class="cd fa" ${choice(c)}><img src="${art.father(c.father)}" alt=""><b>${pick(D.fathers[c.father])}</b><small>${Texts.father(c.father, 14)}</small><em>${D.fathers[c.father].bells}${icon('bells', 15)}</em></button>`).join('')}</div>`, legal.filter((c) => !c.father).map((c) => btn(t('decisions.enough'), choice(c), 'go')).join('')); },
  discardHand() { return panel(t('pass'), `<p>${t('decisions.unused_agents')}</p><div class="cds">${P.hand.map((c, i) => `<button class="cd${X.sel.includes(i) ? ' off' : ''}" data-sel="${i}" aria-pressed="${X.sel.includes(i)}"><img src="${art.agent(c)}" alt=""><b>${pick(D.agents[c])}</b><small>${X.sel.includes(i) ? t('decisions.discard') : t('decisions.keep')}</small></button>`).join('')}</div>`, btn(t('pass'), 'data-sel="ok"', 'go')); },
  tax(d, legal) { const can = legal.some((c) => c.c === 'pay'), set = D.settings.tax, paid = Sim.s.log.slice(Sim.s.log.findLastIndex((x) => x.e === 'event' || x.e === 'round') + 1).filter((x) => x.e === 'tax'); return { big: true, html: bigCard('tax', 'art/europe.webp', `${t('decisions.king_demands')} ${D.tax} ${icon('gold', 34)}`, '', `<p>${t('decisions.you_have')} ${P.gold} ${icon('gold', 19)}. ${set.refuseBells ? t('decisions.refusing_gives') : t('decisions.refuse_king')}</p>${paid.length ? `<ul class="who">${paid.map((x) => `<li><span class="pl">${Places.em(x.p!, 22)}<b>${name(x.p!)}</b></span><span>${x.pay ? t('decisions.paid') : t('decisions.refused')}</span></li>`).join('')}</ul>` : ''}`, btn(`${t('word.pay')} <small>${Places.plus(-D.tax, 'gold', 17)}${set.payBells ? ` ${Places.plus(set.payBells, 'bells', 17)}` : ''}</small>`, can ? choice({ c: 'pay' }) : 'disabled') + btn(`${t('decisions.refuse')} <small>${Places.plus(set.refuseRef, 'ref', 17)}${set.refuseBells ? ` ${Places.plus(set.refuseBells, 'bells', 17)}` : ''}</small>`, choice({ c: 'refuse' }), 'go')) }; },
  // A battle: your banner against theirs, your agents face up, theirs face down (they add theirs unseen), the chance as a range.
  commit(d, legal) {
    const c = D.combat; if (!c) return '';
    const side = d.side as 'a' | 'd', foe = side === 'a' ? c.defender : c.attacker, set = D.settings.combat;
    const mine = c.strength[side === 'a' ? 'attack' : 'defence'], theirs = c.strength[side === 'a' ? 'defence' : 'attack'], picked = X.sel.map((i) => P.hand[i]!);
    // Seen of the other side: its effects and, of an attacker, the agent it played; the agents it adds are not seen.
    const played = side === 'd' ? might(c.card, c, 'a') : 0, known = theirs.parts.filter((p) => !isAgents(p) && p.label !== 'cards').reduce((n, p) => n + p.value, 0) + played;
    const agents = (side === 'a' ? might(c.card, c, 'a') : 0) + picked.reduce((n, k) => n + might(k, c, side), 0), total = mine.total + picked.reduce((n, k) => n + 1 + might(k, c, side), 0);
    const fp = foe === null ? null : D.players[foe]!, count = (v: string[] | number) => (typeof v === 'number' ? v : v.length);
    const unseen = !fp ? 0 : side === 'a' ? count(fp.hand) + (count(fp.deck) + fp.discard.length > 0 ? 1 : 0) : count(fp.hand) + c.a.length, most = unseen * (1 + strongest());
    const win = (gap: number) => chance(gap, set.successFaces.length, 1, set.diceCap ?? 30);
    const [lo, hi] = side === 'a' ? [win(total - known - most), win(total - known)] : [1 - win(known + most - total), 1 - win(known - total)];
    const myLines = [...lines([...mine.parts.filter((p) => !isAgents(p)), ...(picked.length ? [{ label: 'cards', value: picked.length }] : [])]), ...(agents ? [{ label: t('battle.agents'), value: agents }] : [])];
    const theirLines = [...lines(theirs.parts.filter((p) => !isAgents(p) && p.label !== 'cards')), ...(played ? [{ label: t('battle.agents'), value: played }] : []), ...(unseen ? [{ label: t('battle.agents'), value: `+0–${most}`, hid: true }] : [])];
    const tribe = c.target === 'settlement' ? settlementAt(c.cell)?.tribe : undefined;
    const left = banner(colorOf(me), crest(me), name(me), total, false, myLines);
    const right = banner(foe === null ? '#6b4a2b' : colorOf(foe), foe === null ? `<img class="screst" src="${tribe ? art.tribe(tribe) : ''}" alt="">` : crest(foe), foe === null ? (tribe ? pick(D.names.tribes[tribe]) : '') : name(foe), known, unseen > 0, theirLines);
    const mineRow = [...(side === 'a' ? [c.card] : []), ...picked].map((k) => card(k, { w: 62, power: might(k, c, side) })).join('');
    const theirRow = (side === 'd' ? card(c.card, { w: 62, power: played }) : '') + Array.from({ length: Math.min(unseen, 6) }, () => back(foe, 50)).join('');
    const hand = P.hand.map((h, i) => (legal.some((q) => q.card === h) ? card(h, { button: true, power: might(h, c, side), cls: X.sel.includes(i) ? ' sel' : '', attrs: `data-sel="${i}" aria-pressed="${X.sel.includes(i)}"` }) : '')).join('');
    const center = `${odds(lo, hi, t(side === 'a' ? 'battle.to_win' : 'war.to_hold'))}${btn(side === 'a' ? t('decisions.attack') : t('decisions.defend'), 'data-sel="ok"', 'go')}${legal.some((q) => q.c === 'top') ? btn(t('decisions.add_top'), 'data-sel="top"') : ''}`;
    return { big: true, html: stage(fight(c.target, c.cell, c.defender), left, mineRow, center, right, theirRow, hand) };
  },
  // W-7, the front lines: a lane for each colony, the attackers above and the defenders below; pick a card, then a lane.
  deploy(d, legal) {
    const w = D.war!, cards = [...new Set(legal.filter((c) => c.c === 'place').map((c) => c.card as string))], card0 = cards.includes(X.deploy ?? '') ? X.deploy! : cards[0];
    const have = (k: string) => w.hand.filter((c) => c === k).length, place = (i: number) => legal.find((c) => c.c === 'place' && c.card === card0 && c.siege === i);
    const hand = cards.map((k) => card(k, { button: true, power: D.agents[k] ? warPower(k) : 0, n: have(k), cls: k === card0 ? ' sel' : '', attrs: `data-deploy="${k}" aria-pressed="${k === card0}"` })).join('');
    const bts = d.siege !== undefined ? btn(t('decisions.done_placing'), choice({ c: 'done' }), 'go') : btn(t('decisions.pass_war'), choice({ c: 'pass' }));
    // The King's tactic changes this war: it is told under the colonies, where the cards go.
    const tac = `<p class="stac">${icon('king', 16)}<b>${pick(D.names.tactics[w.tactic])}.</b> ${Texts.tactic(w.tactic)}</p>`;
    return { big: true, html: `<div class="siege front"><h2>${t('war.front')}</h2>${frontLines(w.sieges, (i) => { const c = place(i); return c ? choice(c) : null; }, false)}${tac}<div class="shand">${hand}</div><div class="bts">${bts}</div></div>` };
  },
  militia(d, legal) { return muster('militia', legal); },
  mercenaries(d, legal) { return muster('mercenaries', legal); },
  betray(d, legal) { return panel(pick(ASK.betray), `<div class="sgs">${legal.filter((c) => c.c === 'betray').map((c) => siege(c.siege, choice(c), true)).join('')}</div>`, btn(pick(WORD.skip), choice({ c: 'skip' }))); },
  startCell() { return { bar: true, html: `<span class="ttl">${pick(ASK.startCell)}</span>` }; },
};
/** A besieged colony as a small battle: whose it is, the King's soldiers there, the colony's strength against theirs, and its chance to hold (or, for the loyalist, to fall). */
function siege(i: number, act: string, fall = false) {
  const x = D.war?.sieges[i]; if (!x) return '';
  const a = x.attack.total, d = x.defence.total, share = a + d ? (d / (a + d)) * 100 : 50;
  return `<button class="sg" ${act || 'disabled'} style="--pc:${D.players[x.owner]!.color}">${Places.em(x.owner, 34)}<span class="sgn"><b>${name(x.owner)}</b><small>${colonyName(x)}</small>${cards(x)}</span>${men(x.cubes, 10)}<span class="sgv"><span class="nums"><b>${d}</b><i>${a}</i></span><span class="wtug"><i style="width:${share.toFixed(1)}%"></i><i></i></span><small>${fall ? t('decisions.chance_to_fall') : t('odds')} ${((fall ? 1 - holdOdds(x, x.counter ? '' : D.war!.tactic) : holdOdds(x, x.counter ? '' : D.war!.tactic)) * 100).toFixed(0)}%</small></span></button>`;
}
/** How many cards lie face down on a colony, defending and attacking: everyone sees the counts, not the cards (DD-123). */
function cards(x: NonNullable<typeof D.war>['sieges'][number]) {
  const all = Object.entries(x.stacks), d = all.filter(([q]) => Number(q) === x.owner).reduce((n, [, c]) => n + c.length, 0), a = all.filter(([q]) => Number(q) !== x.owner).reduce((n, [, c]) => n + c.length, 0);
  return d || a ? `<small>${t('decisions.cards_on', { d, a })}</small>` : '';
}
/** War cards, which no agent can be swapped for. */
const WAR = ['brave', 'militia', 'mercenary'];
/** The muster (W-6): militia for bells, then mercenaries for gold, each chosen with a stepper and taken with one button; your war army as it will be; what the others raised, in the open. */
function muster(kind: 'militia' | 'mercenaries', legal: Opt[]): Shown {
  const w = D.war!, most = Math.max(0, ...legal.map((c) => c.n as number)), n = (X.muster = Math.min(most, Math.max(0, X.muster)));
  const pick0 = legal.find((c) => c.n === n), gold = D.settings.war.mercenaryGold, count = (k: string, l: readonly string[]) => l.filter((c) => c === k).length;
  // A militia takes the place of an agent without 🗡️, the first of them in the hand, as the engine does.
  const civil = w.hand.filter((k) => !WAR.includes(k) && !D.agents[k]!.mods.some((m) => m.mod === 'combat')), out = kind === 'militia' ? civil.slice(0, n) : [];
  const after = w.hand.slice();
  for (const o of out) after.splice(after.indexOf(o), 1);
  after.push(...Array<string>(n).fill(kind === 'militia' ? 'militia' : 'mercenary'));
  const power = (l: readonly string[]) => l.reduce((m, k) => m + warPower(k), 0);
  const offer = (k: 'militia' | 'mercenaries') => {
    const on = k === kind, done = kind === 'mercenaries' && k === 'militia', card0 = k === 'militia' ? 'militia' : 'mercenary';
    const cost = k === 'militia' ? `${pick0?.bells ? `−${pick0.bells}` : '0'}${icon('bells', 16)}` : `${n ? `−${n * gold}` : '0'}${icon('gold', 16)}`;
    const step = on ? `<div class="mstep"><button data-muster="-1" ${n <= 0 ? 'disabled' : ''} aria-label="−">−</button><b>${n}</b><button data-muster="1" ${n >= most ? 'disabled' : ''} aria-label="+">+</button><span class="mcost">${cost}</span></div>${btn(n ? t(k === 'militia' ? 'war.call_n' : 'war.hire_n', { n }) : t(k === 'militia' ? 'war.no_militia' : 'war.no_mercenaries'), pick0 ? choice(pick0) : 'disabled', 'go')}` : '';
    const got = done ? count('militia', w.gained[me] ?? []) : 0;
    return `<section class="moffer${on ? ' on' : ''}">${card(card0, { w: 84, power: 1 })}<div><h3>${t(k === 'militia' ? 'decisions.call_militia' : 'decisions.hire_mercenaries')}<small class="shave">${k === 'militia' ? `${P.bells}${icon('bells', 15)}` : `${P.gold}${icon('gold', 15)}`}</small></h3>`
      + `<p>${t(k === 'militia' ? 'war.militia_rule' : 'war.mercenary_rule', { gold: `${gold} ${icon('gold', 14)}`, bells: icon('bells', 14), power: icon('power', 14) })}</p>${step}${done ? `<p class="mgot">${got ? `+${got} ${pick(D.agents.militia!)}` : t('war.no_militia')}</p>` : ''}</div></section>`;
  };
  // Your army: each kind once with how many, the agents a militia replaces struck out, the new cards lit.
  const kinds = [...new Set([...w.hand, ...after])];
  const army = kinds.map((k) => { const was = count(k, w.hand), now = count(k, after); return (now ? card(k, { w: 66, power: warPower(k), n: now, cls: now > was ? ' new' : '' }) : '') + (was > now ? card(k, { w: 66, power: warPower(k), n: was - now, cls: ' out' }) : ''); }).join('');
  const others = D.players.map((_, p) => p).filter((p) => p !== me && (w.gained[p] ?? []).length).map((p) => `<div class="sother">${Places.em(p, 26)}${[...new Set(w.gained[p]!)].map((k) => card(k, { w: 40, n: count(k, w.gained[p]!) })).join('')}</div>`).join('');
  return { big: true, html: `<div class="siege muster"><h2>${t('war.muster')}</h2><div class="mgrid"><div class="moffers">${w.loyalist === me ? '' : offer('militia')}${offer('mercenaries')}</div>`
    + `<aside class="marmy"><h3>${t('war.your_army')}<span class="sbn">${power(after)}${icon('power', 22)}</span>${power(after) > power(w.hand) ? `<em>+${power(after) - power(w.hand)}</em>` : ''}</h3><div class="mcards">${army}</div></aside></div>${others ? `<div class="sothers"><small>${t('war.others_raised')}</small>${others}</div>` : ''}</div>` };
}
/* ---- showing ---- */
export function paintStep() {
  const el = $('step'), d: Pending | null = D.pending, key = d ? `${d.kind}${Sim.s.log.length}${P.hand.length}` : '';
  if (key !== X.key) { X.key = key; X.sel = []; if (d?.kind !== 'cargo') X.cargo = null; if (d?.kind !== 'trade') X.sell = null; if (d?.kind !== 'deploy') X.deploy = null; X.muster = 0; }
  let html = '', isBar = false, big = false;
  if (Sim.busy || S.war >= 0) html = '';
  else if (X.reports.length) { big = !!X.reports[0].big; html = big ? X.reports[0].html : X.reports[0].html.replace('<div class="bts">', `<div class="bts">${btn('OK', 'data-ok', 'go')}`); }
  else if (Sim.mine() && d && d.kind !== 'turn') { const l = Sim.legal(), v = V[d.kind] ? V[d.kind](d, l) : generic(d, l); if (typeof v === 'string') html = v; else if ('bar' in v) { html = v.html; isBar = true; } else { html = v.html; big = true; } }
  el.className = `step${html ? ' on' : ''}${isBar ? ' bar' : ''}${big ? ' evt' : ''}`; document.body.classList.toggle('shaded', big); if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  document.body.classList.toggle('step-on', !!html); document.body.classList.toggle('moving', isBar);
}
/** The cards picked in a panel, sorted. */
export function pickedCards(): string[] { return X.sel.map((i) => P.hand[i]).sort(); }
