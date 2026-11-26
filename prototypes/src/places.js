/* What every place means for the agent in hand: the options there, or why there are none. All options come from the rules engine. */
import { ACT, art, D, L, me, P, pick, RES, why as reason } from './data.js';
import { icon } from './icons.js';
import { Sim } from './sim.js';
const E = window.Engine;
/** The resource a gathered icon becomes: corn is food, leaf and fur are crops. Fish keeps its own sign (food from water). */
const ico = (i) => ({ corn: 'food', leaf: 'crops', fur: 'crops' })[i] || i;
const homes = () => D.colonies.filter((c) => c.owner === me);
const inEurope = () => D.zone[P.ship] === 'europe';
const sum = (x) => RES.reduce((n, r) => n + x[r], 0);
const AWAY = () => L('The ship must be in Europe', 'Корабль должен быть в Европе');
/* ---- ways over the map ---- */
/** Cells a token can reach with these points, with the way there. Infantry aboard may step ashore, which costs a point. */
function ways(token, points) {
  const s = Sim.s, map = E.map, start = token === 'ship' || P.inf === 'ship' ? P.ship : P.inf, best = new Map(), aboard = P.inf === 'ship';
  if (typeof start !== 'number') return best;
  const todo = [{ c: start, left: points, path: [], foot: token === 'infantry' && !aboard }], go = (n, c, left, foot) => { if (left < 0) return; const old = best.get(c); if (old && old.left >= left) return; const x = { c, left, path: [...n.path, c], foot }; best.set(c, x); if (left > 0) todo.push(x); };
  while (todo.length) {
    const n = todo.shift();
    if (!n.foot && (token === 'ship' || aboard)) {
      if (token === 'ship') for (const c of s.map.neighbours[n.c]) if (map.canShipEnter(s, c)) { const k = map.enterCost(s, c, n.left); if (k !== null && k <= n.left) go(n, c, n.left - k, false); }
      if (aboard && n.left >= 1) for (const c of s.map.neighbours[n.c]) if (map.canInfantryEnter(s, me, c)) go(n, c, n.left - 1, true);
    } else if (n.foot) for (const c of s.map.neighbours[n.c]) if (c !== start && map.canInfantryEnter(s, me, c)) { const k = map.enterCost(s, c, n.left); if (k !== null) go(n, c, n.left - k, true); }
  }
  best.delete(start);
  return best;
}
const points = (card, token) => D.settings.move.points + [...D.agents[card].mods, ...P.fathers.flatMap((f) => Sim.s.def.fathers[f].mods)].filter((m) => m.mod === 'move' && m.token === token).reduce((n, m) => n + m.add, 0);
/* ---- spaces ---- */
let kept = null;
const forget = () => { kept = null; };
function spaces(card) { if (!card) return {}; if (kept?.card !== card) kept = { card, sp: work(card) }; return kept.sp; }
const price = (card, id) => Math.max(0, D.agents[id].price + [...D.agents[card].mods, ...P.fathers.flatMap((f) => Sim.s.def.fathers[f].mods)].filter((m) => m.mod === 'cost' && m.of === 'hire').reduce((n, m) => n + m.add, 0));
const worth = (card) => RES.reduce((n, r) => n + P.hold[r] * (card ? D.sell[card]?.[r] ?? D.price[r] : D.price[r]), 0);
function work(card) {
  const list = Object.fromEntries((D.actions[card] || []).map((a) => [a.action, a])), has = (a) => list[a]?.options || [], why = (a, f = '') => (list[a]?.why ? reason(list[a].why) : f), out = {}, only = D.agents[card].mods.some((m) => m.mod === 'onlyProduce'), gathers = L('Gathers only', 'Только добыча');
  // Buildings that stand.
  for (const b of P.buildings) {
    const w = D.buildings[b].work, k = w?.kind, act = { produce: 'work', ocean: 'docks', sell: 'customs', repair: 'shipyard', teach: 'teach' }[k];
    let o = k === 'produce' ? has('work').filter((q) => q.building === b) : k === 'ocean' ? (D.docks[card] || []).slice(0, 1).map((y) => ({ c: 'play', card, a: 'docks', cell: y.cell, n: y.n })) : act ? has(act) : [];
    if (k === 'ocean' && !has('docks').length) o = [];
    out[`lot:${b}`] = o.length ? { options: o } : { why: !w ? L('Works by itself', 'Работает само') : only && k !== 'produce' && k !== 'ocean' ? gathers : D.buildings[b].edu > D.agents[card].edu ? L('Needs more education', 'Нужно образование') : w.consumes && P.wh[w.consumes.res] < w.consumes.amount ? L('Needs crops', 'Нужно сырьё') : why(act, L('Not now', 'Недоступно')), passive: !w, need: !w || (only && k !== 'produce' && k !== 'ocean') ? null : D.buildings[b].edu > D.agents[card].edu ? [['', D.buildings[b].edu === 2 ? 'cap' : 'book']] : w.consumes && P.wh[w.consumes.res] < w.consumes.amount ? [[w.consumes.amount - P.wh[w.consumes.res], w.consumes.res]] : null };
  }
  // Buildings that could stand.
  for (const [b, def] of Object.entries(D.buildings)) if (!P.buildings.includes(b)) {
    const o = has('build').filter((q) => q.building === b), cost = D.build[card]?.[b] ?? def.timber;
    out[`build:${b}`] = o.length ? { options: o, cost } : { cost, why: only ? gathers : !homes().length ? L('Needs a colony', 'Нужна колония') : D.left[b] <= 0 ? L('None left', 'Больше нет') : P.buildings.length >= D.settings.buildings.max ? L('No free place', 'Нет места') : def.requires && !P.buildings.includes(def.requires) ? `${L('Needs', 'Нужно')}: ${pick(D.buildings[def.requires]).toLowerCase()}` : L('Too little timber', 'Мало древесины'), need: !only && homes().length && D.left[b] > 0 && P.buildings.length < D.settings.buildings.max && !(def.requires && !P.buildings.includes(def.requires)) && cost > P.wh.timber ? [[cost - P.wh.timber, 'timber']] : null, wants: def.requires && !P.buildings.includes(def.requires) ? def.requires : null };
  }
  // Europe.
  const away = only ? gathers : inEurope() ? null : AWAY(), play = (a, x = {}) => ({ c: 'play', card, a, ...x });
  out['eu:market'] = away ? { why: away } : sum(P.hold) ? { options: [play('trade', { all: true })] } : { why: L('The hold is empty', 'Трюм пуст') };
  out['eu:some'] = away || sum(P.hold) < 2 ? { why: away || L('The hold is empty', 'Трюм пуст') } : { options: [play('trade')] };
  for (const [id] of D.pier) { const p = price(card, id); out[`pier:${id}`] = away ? { why: away, cost: p } : p <= P.gold ? { cost: p, options: [play('hire', { agent: id })] } : { cost: p, why: L('Too little gold', 'Мало золота'), need: [[p - P.gold, 'gold']] }; }
  out['pier:new'] = away ? { why: away } : { options: [play('hire', { refresh: true })] };
  const full = !has('propaganda').length && why('propaganda');
  for (const f of D.salon) out[`salon:${f}`] = away ? { why: away } : D.fathers[f].bells > P.bells ? { why: L('Too few bells', 'Мало колоколов'), need: [[D.fathers[f].bells - P.bells, 'bells']] } : has('propaganda').length ? { options: [play('propaganda', { father: f })] } : { why: full };
  out['eu:yard'] = away ? { why: away } : has('repair').length ? { options: has('repair') } : { why: L('No damage', 'Нет повреждений') };
  // The map.
  const cell = (c, x) => { const id = `cell:${c}`; out[id] = { ...(out[id] || {}), ...x, options: [...(out[id]?.options || []), ...(x.options || [])] }; };
  if (has('produce').length) { const by = {}; for (const y of D.yields[card] || []) (by[y.cell] ??= []).push(play('produce', { cell: y.cell, icon: y.icon, n: y.n })); for (const [c, l] of Object.entries(by)) { l.sort((a, b) => b.n - a.n); cell(c, { options: l, gather: l }); } }
  for (const a of ['gift', 'preach', 'alliance']) for (const o of has(a)) { const x = D.settlements[o.settlement - 1]; cell(x.cell, { village: x, options: [o] }); }
  for (const o of has('attack')) cell(o.cell, { attack: true, options: [o] });
  if (has('found').length) cell(P.inf, { found: true, options: has('found') });
  out.found = has('found').length ? { options: has('found'), cell: P.inf } : { why: only ? gathers : why('found', L('Not now', 'Недоступно')) };
  if (has('moveShip').length) { for (const [c, n] of ways('ship', points(card, 'ship'))) cell(c, { options: [play('moveShip', { cell: c, path: n.path, foot: n.foot })], sea: !n.foot, foot: n.foot, site: n.foot && !E.map.colonyProblem(Sim.s, c) }); cell(P.ship, { own: 'ship', options: [play('moveShip', { cell: P.ship, path: [] })] }); }
  if (has('moveInfantry').length && typeof P.inf === 'number') { for (const [c, n] of ways('infantry', points(card, 'infantry'))) cell(c, { options: [play('moveInfantry', { cell: c, path: n.path, foot: true })], foot: true, site: !E.map.colonyProblem(Sim.s, c) }); cell(P.inf, { own: 'infantry', options: [play('moveInfantry', { cell: P.inf, path: [] })] }); }
  // The hand and the piles.
  for (const q of has('exchange')) out[`who:${q.other}`] = { options: [q] };
  out.deck = has('supply').length ? { options: has('supply') } : { why: only ? gathers : why('supply', L('Needs 1 food', 'Нужна 1 еда')), need: !only && P.wh.food < 1 ? [[1, 'food']] : null };
  if (has('smuggle').length) out.smuggle = { options: has('smuggle') };
  return out;
}
/* ---- what a choice changes, in signs ---- */
const plus = (n, i, s = 18) => `${n > 0 ? '+' : '−'}${Math.abs(n)} ${icon(i, s)}`;
function effect(o) {
  if (o.a === 'produce') return [plus(o.n, ico(o.icon))];
  if (o.a === 'docks') return [plus(o.n, 'fish')];
  if (o.a === 'work') { const w = D.buildings[o.building].work; return [...(w.consumes ? [plus(-w.consumes.amount, w.consumes.res)] : []), plus(D.works[o.card]?.[o.building] ?? w.amount, ico(w.icon))]; }
  if (o.a === 'build') return [plus(-(D.build[o.card]?.[o.building] ?? 0), 'timber')];
  if (o.a === 'trade') return o.all ? [plus(worth(o.card), 'gold')] : [];
  if (o.a === 'hire') return o.refresh ? [] : [price(o.card, o.agent) ? plus(-price(o.card, o.agent), 'gold') : L('free', 'даром')];
  if (o.a === 'propaganda') return [plus(-D.fathers[o.father].bells, 'bells')];
  if (o.a === 'customs') return [plus(-1, o.r), plus(D.sell[o.card][o.r], 'gold')];
  if (o.a === 'smuggle') return [plus(-1, o.r), `+ ${icon('gold', 18)}`];
  if (o.a === 'supply') return [plus(-1, 'food'), L('draw 1', 'взять 1')];
  if (o.a === 'exchange') return [L('draw 1', 'взять 1')];
  if (o.a === 'gift') return [plus(-1, 'goods'), `${icon('anger', 17)} −1–4`];
  if (o.a === 'preach') return [L('native agent', 'агент-индеец')];
  if (o.a === 'found') return homes().length ? [plus(-5, 'food')] : [L('free', 'даром')];
  if (o.path && !o.path.length) return [];
  return [];
}
const verb = (o) => (o.a === 'hire' ? (o.refresh ? L('New agents on the pier', 'Обновить причал') : pick(D.agents[o.agent])) : o.a === 'propaganda' ? pick(D.fathers[o.father]) : o.a === 'build' || o.a === 'work' ? pick(D.buildings[o.building]) : o.a === 'teach' ? pick(D.agents[o.target]) : o.a === 'customs' || o.a === 'smuggle' ? pick(D.names.resources[o.r]) : o.a === 'trade' && o.all ? L('Sell everything', 'Продать всё') : o.path && !o.path.length ? (o.a === 'moveShip' ? L('Load, unload, explore', 'Погрузка, разведка') : L('Explore, go aboard', 'Разведка, посадка')) : o.foot && o.a === 'moveShip' ? L('Land the infantry', 'Высадить пехоту') : pick(ACT[o.a] || [o.a, o.a]));
const face = (o) => (o.a === 'hire' && o.agent ? art.agent(o.agent) : o.father ? art.father(o.father) : o.building ? art.building(o.building) : o.a === 'docks' ? art.building('docks') : o.target ? art.agent(o.target) : null);
const lack = (s) => (s?.need ? s.need.map(([n, i]) => `<span class="lack" title="${s.why}">${n}${icon(i, 17)}</span>`).join('') : '');
function label(s) {
  if (!s) return '';
  if (!s.options?.length && s.need) return lack(s);
  if (!s.options?.length) return s.why && s.why !== AWAY() ? `<span class="no">${s.why}</span>` : '';
  if (s.options.length === 1) return `<span class="yes">${effect(s.options[0]).join(' ') || verb(s.options[0])}</span>`;
  return `<span class="yes">${[...new Set(s.options.map((o) => pick(ACT[o.a] || ['', ''])))].join(' / ')}</span>`;
}
/* ---- the King's army, exactly ---- */
function army() {
  const hostile = D.settlements.filter((x) => x.alive && x.hostility >= 4).length, order = D.players.map((p, i) => ({ i, b: p.bells, c: p.crosses, g: p.gold })).sort((a, b) => b.b - a.b || b.c - a.c || b.g - a.g), loyal = D.loyal, targets = order.filter((x) => x.i !== loyal).flatMap((x) => D.colonies.filter((c) => c.owner === x.i)), pool = D.ref + hostile, per = {};
  targets.forEach((c, k) => { per[c.cell] = Math.floor(pool / targets.length) + (k < pool % targets.length ? 1 : 0); });
  return { ref: D.war ? D.war.pool : D.ref, hostile, pool, loyal, targets: targets.length, per };
}
const tokens = (id) => Sim.placed.filter((x) => x.space === id).map((x) => `<span class="placed" title="${pick(D.agents[x.card])}"><img src="${art.agent(x.card)}" alt=""></span>`).join('');
const em = (p, s = 34) => `<span class="em" style="--c:${D.players[p].color};width:${s}px;height:${s}px"><img src="${art.emblem(D.players[p].nation)}" alt=""></span>`;
const name = (p) => pick(D.names.nations[D.players[p].nation]);
export const Places = { spaces, forget, ways, effect, verb, face, label, lack, army, tokens, em, name, homes, inEurope, worth, price, sum, ico, AWAY, plus };
