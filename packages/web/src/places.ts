/* What every place means for the agent in hand: the options there, or why there are none. All options come from the rules engine. */
import type { BuildingWork, Mod, Resource } from '@col/data';
import { map } from '@col/engine';
import { ACT, art, D, me, P, pick, why as reason, RES, t } from './data.ts';
import { icon } from './icons.ts';
import { Sim, type Opt } from './sim.ts';
import type { Snapshot } from './view.ts';
import { playerEmblem } from './emblem.ts';

type Settlement = Snapshot['settlements'][number];
/** What is missing for an option: amounts and icons, e.g. 2 timber. */
export type Need = [number | string, string][];
/** What a place means for the agent in hand: the engine's options there, or why there are none and what is missing. */
export interface Space {
  options?: Opt[]; why?: string; need?: Need | null; cost?: number; passive?: boolean; wants?: string | null; cell?: number;
  /** On the map: what can be gathered, a settlement to deal with, an attack, a colony site, how the token gets there. */
  gather?: Opt[]; village?: Settlement; attack?: boolean; found?: boolean; sea?: boolean; foot?: boolean; site?: boolean; own?: 'ship' | 'infantry';
}
export type Spaces = Record<string, Space>;
/** A cell a token can reach: the points left, the way there and what each step of it costs. `foot` is true once the infantry walks. */
export interface Way { c: number; left: number; path: number[]; costs: number[]; foot: boolean }
/** Modifiers of one kind, typed by their kind. */
const mods = <K extends Mod['mod']>(l: Mod[], kind: K) => l.filter((m): m is Extract<Mod, { mod: K }> => m.mod === kind);
/** The agent's own modifiers and those of the player's Fathers. */
const allMods = (card: string) => [...D.agents[card].mods, ...P.fathers.flatMap((f) => Sim.s.def.fathers[f].mods)];
/** What working in a building uses up, if anything. */
const uses = (w: BuildingWork | undefined) => (w?.kind === 'produce' ? w.consumes : undefined);
/** The pictogram of a gathered icon: its own name. */
const ico = (i: string) => i;
const homes = () => D.colonies.filter((c) => c.owner === me);
const inEurope = () => D.zone[P.ship] === 'europe';
const sum = (x: Record<string, number>) => RES.reduce((n, r) => n + x[r], 0);
const AWAY = () => t('places.ship_europe');
/* ---- ways over the map ---- */
/** Cells a token can reach with these points, with the way there. Infantry aboard may step ashore, which costs a point. */
function ways(token: 'ship' | 'infantry', points: number): Map<number, Way> {
  const s = Sim.s, start = token === 'ship' || P.inf === 'ship' ? P.ship : P.inf, best = new Map<number, Way>(), aboard = P.inf === 'ship';
  if (typeof start !== 'number') return best;
  const todo: Way[] = [{ c: start, left: points, path: [], costs: [], foot: token === 'infantry' && !aboard }], go = (n: Way, c: number, left: number, foot: boolean) => { if (left < 0) return; const old = best.get(c); if (old && old.left >= left) return; const x = { c, left, path: [...n.path, c], costs: [...n.costs, n.left - left], foot }; best.set(c, x); if (left > 0) todo.push(x); };
  while (todo.length) {
    const n = todo.shift()!;
    if (!n.foot && (token === 'ship' || aboard)) {
      if (token === 'ship') for (const c of s.map.neighbours[n.c]) if (map.canShipEnter(s, c)) { const k = map.enterCost(s, c, n.left); if (k !== null && k <= n.left) go(n, c, n.left - k, false); }
      if (aboard) for (const c of s.map.neighbours[n.c]) if (map.canInfantryEnter(s, me, c)) { const k = map.enterCost(s, c, n.left); if (k !== null) go(n, c, n.left - k, true); }
    } else if (n.foot) for (const c of s.map.neighbours[n.c]) if (c !== start && map.canInfantryEnter(s, me, c)) { const k = map.enterCost(s, c, n.left); if (k !== null) go(n, c, n.left - k, true); }
  }
  best.delete(start);
  return best;
}
const points = (card: string) => D.settings.move.points + mods(allMods(card), 'move').reduce((n, m) => n + m.add, 0);
/** The way a move option of a played agent takes, with what each step costs. */
const wayOf = (o: Opt): Way | undefined => (o.path?.length ? ways(o.a === 'moveInfantry' ? 'infantry' : 'ship', points(o.card)).get(o.cell) : undefined);
/* ---- spaces ---- */
let kept: { card: string; sp: Spaces } | null = null;
const forget = () => { kept = null; };
function spaces(card: string | null): Spaces { if (!card) return {}; if (kept?.card !== card) kept = { card, sp: work(card) }; return kept.sp; }
const price = (card: string, id: string) => Math.max(0, (D.agents[id].price ?? 0) + mods(allMods(card), 'cost').filter((m) => m.of === 'hire').reduce((n, m) => n + m.add, 0));
const worth = (card: string | null) => RES.reduce((n, r) => n + P.hold[r] * (card ? D.sell[card]?.[r] ?? D.price[r] : D.price[r]), 0);
function work(card: string): Spaces {
  const list = new Map((D.actions[card] || []).map((a) => [a.action as string, a])), has = (a: string) => (list.get(a)?.options || []) as Opt[], why = (a: string, f = '') => { const w = list.get(a)?.why; return w ? reason(w) : f; }, out: Spaces = {}, only = D.agents[card].mods.some((m) => m.mod === 'onlyProduce'), gathers = t('places.gathers');
  // Buildings that stand.
  for (const b of P.buildings) {
    const w = D.buildings[b].work, k = w?.kind, need = uses(w), act = k ? ({ produce: 'work', ocean: 'docks', sell: 'customs', repair: 'shipyard', teach: 'teach' } as Record<string, string>)[k] : undefined;
    let o: Opt[] = k === 'produce' ? has('work').filter((q) => q.building === b) : k === 'ocean' ? has('docks').map((o) => ({ ...o, n: D.docks[card]?.find((y) => y.cell === o.cell)?.n ?? 1 })).sort((a, b) => b.n - a.n).slice(0, 1) : k === 'teach' ? has('teach').filter((q) => q.building === b) : act ? has(act) : [];
    if (k === 'ocean' && !has('docks').length) o = [];
    out[`lot:${b}`] = o.length ? { options: o } : { why: !w ? t('places.works_itself') : only && k !== 'produce' && k !== 'ocean' && k !== 'teach' ? gathers : D.buildings[b].edu > D.agents[card].edu ? t('places.needs_education') : need && P.wh[need.res] < need.amount ? t('places.needs_crops') : why(act ?? '', t('why')), passive: !w, need: !w || (only && k !== 'produce' && k !== 'ocean') ? null : D.buildings[b].edu > D.agents[card].edu ? [['', D.buildings[b].edu === 2 ? 'eduHigher' : 'eduBasic']] : need && P.wh[need.res] < need.amount ? [[need.amount - P.wh[need.res], need.res]] : null };
  }
  // Buildings that could stand.
  for (const [b, def] of Object.entries(D.buildings)) if (!P.buildings.includes(b)) {
    const o = has('build').filter((q) => q.building === b), cost = D.build[card]?.[b] ?? def.timber;
    out[`build:${b}`] = o.length ? { options: o, cost } : { cost, why: only ? gathers : !homes().length ? t('places.needs_colony') : D.left[b] <= 0 ? t('places.none_left') : P.buildings.length >= D.settings.buildings.max ? t('places.no_free') : def.requires && !P.buildings.includes(def.requires) ? `${t('places.needs')}: ${pick(D.buildings[def.requires]).toLowerCase()}` : t('places.too_little'), need: !only && homes().length && D.left[b] > 0 && P.buildings.length < D.settings.buildings.max && !(def.requires && !P.buildings.includes(def.requires)) && cost > P.wh.timber ? [[cost - P.wh.timber, 'timber']] : null, wants: def.requires && !P.buildings.includes(def.requires) ? def.requires : null };
  }
  // Europe.
  const away = only ? gathers : inEurope() ? null : AWAY(), play = (a: string, x: Record<string, unknown> = {}): Opt => ({ c: 'play', card, a, ...x });
  out['eu:market'] = away ? { why: away } : sum(P.hold) ? { options: [play('trade', { all: true })] } : { why: t('places.hold_empty') };
  out['eu:some'] = away || sum(P.hold) < 2 ? { why: away || t('places.hold_empty') } : { options: [play('trade')] };
  for (const [id] of D.pier) { const p = price(card, id); out[`pier:${id}`] = away ? { why: away, cost: p } : p <= P.gold ? { cost: p, options: [play('hire', { agent: id })] } : { cost: p, why: t('places.too_little2'), need: [[p - P.gold, 'gold']] }; }
  out['pier:new'] = away ? { why: away } : { options: [play('hire', { refresh: true })] };
  const full = (!has('propaganda').length && why('propaganda')) || '';
  for (const f of D.salon) out[`salon:${f}`] = away ? { why: away } : D.fathers[f].bells > P.bells ? { why: t('places.too_few'), need: [[D.fathers[f].bells - P.bells, 'bells']] } : has('propaganda').length ? { options: [play('propaganda', { father: f })] } : { why: full };
  // Recruiting as an action works anywhere: the deck beside the pier takes the card.
  if (D.settings.crosses.recruitAction) out['eu:recruit'] = has('recruit').length ? { options: has('recruit') } : { why: only ? gathers : why('recruit', t('why')), need: !only && P.crosses < D.recruit ? [[D.recruit - P.crosses, 'crosses']] : null };
  out['eu:yard'] = away ? { why: away } : has('repair').length ? { options: has('repair') } : { why: t('places.no_damage') };
  // The map.
  const cell = (c: number, x: Space) => { const id = `cell:${c}`; out[id] = { ...(out[id] || {}), ...x, options: [...(out[id]?.options || []), ...(x.options || [])] }; };
  // Gathering: the engine's options, with the amount each would bring.
  if (has('produce').length) {
    const by = new Map<number, Opt[]>(), n = (o: Opt) => D.yields[card]?.find((y) => y.cell === o.cell && y.icon === o.icon)?.n ?? 1;
    for (const o of has('produce')) by.set(o.cell, [...(by.get(o.cell) ?? []), { ...o, n: n(o) }]);
    for (const [c, l] of by) { l.sort((a, b) => b.n - a.n); cell(c, { options: l, gather: l }); }
  }
  // A gift of any resource (a rules option) gives the one held most of: one gift per village.
  const held = (o: Opt) => (o.r ? P.wh[o.r as Resource] : 0);
  const most = (l: Opt[]) => l.filter((o) => l.find((b) => b.settlement === o.settlement && held(b) === Math.max(...l.filter((c) => c.settlement === o.settlement).map(held))) === o);
  for (const a of ['gift', 'preach', 'alliance']) for (const o of a === 'gift' ? most(has(a)) : has(a)) { const x = D.settlements[o.settlement - 1]; cell(x.cell, { village: x, options: [o] }); }
  for (const o of has('attack')) cell(o.cell, { attack: true, options: [o] });
  if (has('found').length && typeof P.inf === 'number') cell(P.inf, { found: true, options: has('found') });
  out.found = has('found').length && typeof P.inf === 'number' ? { options: has('found'), cell: P.inf } : { why: only ? gathers : why('found', t('why')) };
  if (has('moveShip').length) { for (const [c, n] of ways('ship', points(card))) cell(c, { options: [play('moveShip', { cell: c, path: n.path, foot: n.foot })], sea: !n.foot, foot: n.foot, site: n.foot && !map.colonyProblem(Sim.s, c) }); if (typeof P.ship === 'number') cell(P.ship, { own: 'ship', options: [play('moveShip', { cell: P.ship, path: [] })] }); }
  if (has('moveInfantry').length && typeof P.inf === 'number') { for (const [c, n] of ways('infantry', points(card))) cell(c, { options: [play('moveInfantry', { cell: c, path: n.path, foot: true })], foot: true, site: !map.colonyProblem(Sim.s, c) }); cell(P.inf, { own: 'infantry', options: [play('moveInfantry', { cell: P.inf, path: [] })] }); }
  // The hand and the piles.
  for (const q of has('exchange')) out[`who:${q.other}`] = { options: [q] };
  out.deck = has('supply').length ? { options: has('supply') } : { why: only ? gathers : why('supply', t('places.needs_1')), need: !only && P.wh.food < 1 ? [[1, 'food']] : null };
  if (has('smuggle').length) out.smuggle = { options: has('smuggle') };
  return out;
}
/* ---- what a choice changes, in signs ---- */
/** What a building or a Father to gain gives at the end, after the rest of what it does: "· 1 ⓥ", kept on one line. */
const gain = (n: number) => `<span class="gain" title="${t('vp')}">·&nbsp;${n}${icon('vp', 16)}</span>`;
const plus = (n: number, i: string, s = 18) => `${n > 0 ? '+' : '−'}${Math.abs(n)} ${icon(i, s)}`;
function effect(o: Opt): string[] {
  if (o.a === 'produce') return [plus(o.n, ico(o.icon))];
  if (o.a === 'docks') return [plus(o.n, 'food')];
  if (o.a === 'teach') return [o.from === 'pier' ? t('places.from_pier') : o.from === 'deck' ? t('places.from_deck') : t('places.from_discard')];
  if (o.a === 'work') { const w = D.buildings[o.building].work; if (w?.kind !== 'produce') return []; const n = D.works[o.card]?.[o.building]; return [...(w.consumes ? [plus(-w.consumes.amount, w.consumes.res)] : []), plus(typeof n === 'number' ? n : w.amount, ico(w.icon))]; }
  if (o.a === 'build') return [plus(-(D.build[o.card]?.[o.building] ?? 0), 'timber'), plus(D.settings.score.building, 'vp')];
  if (o.a === 'trade') return o.all ? [plus(worth(o.card), 'gold')] : [];
  if (o.a === 'hire') return o.refresh ? [] : [price(o.card, o.agent) ? plus(-price(o.card, o.agent), 'gold') : t('places.free')];
  if (o.a === 'propaganda') return [plus(-D.fathers[o.father].bells, 'bells'), plus(D.settings.score.father, 'vp')];
  if (o.a === 'customs') return [plus(-1, o.r), plus(D.sell[o.card][o.r], 'gold')];
  if (o.a === 'smuggle') return [plus(-1, o.r), `+ ${icon('gold', 18)}`];
  if (o.a === 'supply') return [plus(-1, 'food'), t('places.draw_1')];
  if (o.a === 'exchange') return [t('places.draw_1')];
  if (o.a === 'gift') { const n = D.settings.natives; return [plus(-1, o.r ?? 'goods'), `${icon('hostility', 17)} −${n.giftBase}${n.giftDice ? `–${n.giftBase + n.giftDice}` : ''}`]; }
  if (o.a === 'preach') return [t('places.native_agent')];
  if (o.a === 'recruit') return [plus(-o.n, 'crosses')];
  if (o.a === 'found') return [...(homes().length ? [plus(-5, 'food')] : []), plus(D.settings.score.patriotColony, 'vp')];
  const w = wayOf(o); if (w) { const spent = w.costs.reduce((n, k) => n + k, 0); return [`${spent}/${spent + w.left} ${icon('move', 18)}`]; }
  if (o.path && !o.path.length) return [];
  return [];
}
const verb = (o: Opt): string => (o.a === 'hire' ? (o.refresh ? t('places.new_agents') : pick(D.agents[o.agent])) : o.a === 'propaganda' ? pick(D.fathers[o.father]) : o.a === 'build' || o.a === 'work' ? pick(D.buildings[o.building]) : o.a === 'teach' ? pick(D.agents[o.target]) : o.a === 'recruit' ? t('places.look', { n: o.n }) : o.a === 'customs' || o.a === 'smuggle' ? pick(D.names.resources[o.r]) : o.a === 'trade' && o.all ? t('places.sell_everything') : o.path && !o.path.length ? (o.a === 'moveShip' ? t('places.load_unload') : t('places.explore_go')) : o.foot && o.a === 'moveShip' ? t('places.land_infantry') : pick(ACT[o.a] || [o.a, o.a]));
const face = (o: Opt): string | null => (o.a === 'hire' && o.agent ? art.agent(o.agent) : o.a === 'teach' && o.target ? art.agent(o.target) : o.father ? art.father(o.father) : o.building ? art.building(o.building) : o.a === 'docks' ? art.building('docks') : o.target ? art.agent(o.target) : null);
const lack = (s: Space | undefined) => (s?.need ? s.need.map(([n, i]) => `<span class="lack" title="${s.why}">${n}${icon(i, 17)}</span>`).join('') : '');
function label(s: Space | undefined): string {
  if (!s) return '';
  if (!s.options?.length && s.need) return lack(s);
  if (!s.options?.length) return s.why && s.why !== AWAY() ? `<span class="no">${s.why}</span>` : '';
  if (s.options.length === 1) return `<span class="yes">${effect(s.options[0]).join(' ') || verb(s.options[0])}</span>`;
  return `<span class="yes">${[...new Set(s.options.map((o) => pick(ACT[o.a] || ['', ''])))].join(' / ')}</span>`;
}
/* ---- the King's army, exactly ---- */
function army() {
  const hostile = D.settlements.filter((x) => x.alive && x.hostility >= 4).length, order = D.players.map((p, i) => ({ i, b: p.bells, c: p.crosses, g: p.gold })).sort((a, b) => b.b - a.b || b.c - a.c || b.g - a.g), loyal = D.loyal, targets = order.filter((x) => x.i !== loyal).flatMap((x) => D.colonies.filter((c) => c.owner === x.i)), pool = D.ref + hostile, per: Record<number, number> = {};
  targets.forEach((c, k) => { per[c.cell] = Math.floor(pool / targets.length) + (k < pool % targets.length ? 1 : 0); });
  return { ref: D.war ? D.war.pool : D.ref, hostile, pool, loyal, targets: targets.length, per };
}
const tokens = (id: string) => Sim.placed.filter((x) => x.space === id).map((x) => `<span class="placed" title="${pick(D.agents[x.card])}"><img src="${art.agent(x.card)}" alt=""></span>`).join('');
const em = playerEmblem;
const name = (p: number) => pick(D.names.nations[D.players[p].nation]);
export const Places = { spaces, forget, ways, wayOf, effect, verb, face, label, lack, army, tokens, em, name, homes, inEurope, worth, price, sum, ico, AWAY, plus, gain };
