import type { Icon, Node, Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { State, View } from '@col/engine';
import { canOwnBuilding, fatherLimit, refuseCubes, foundCost, map, recruitCost, util } from '@col/engine';
import { cardPower, expectedLoyalist, forecast, outlook, type Change } from './outlook.ts';
import type { Weights } from './weights.ts';

/** A player's reading of the situation, built once per decision. */
export interface Situation {
  v: View; s: State; me: number; w: Weights; cards: string[];
  /** Rounds left, the current one included. */
  left: number; last: boolean;
  /** 0 patriot, 1 loyalist. */
  loyal: number;
  loyalist: number | null;
  bell: number; gold: number; strength: number;
  /** Points lost per REF cube added. Negative for the loyalist. */
  ref: number;
  res: Record<Resource, number>;
  colonies: number; sites: number[]; canFound: boolean;
  /** Expected raids on this player per round. */
  raids: number;
  /** Worth of one cross: what recruiting makes of it now (see crossWorth). */
  cross: number;
  target: string | null;
}

/** How much this player means to be the loyalist, from 0 to 1. */
function leaning(v: View, w: Weights, left: number): number {
  const s = v.state, me = v.player, n = s.players.length;
  if (n === 1 || w.loyal <= -1) return 0;
  const bells = s.players.map((p) => p.bells);
  const rounds = left - 1;
  const other = expectedLoyalist(s, me, false);
  const pat = outlook(s, v.collections, me, other === me ? null : other, rounds);
  const loy = outlook(s, v.collections, me, me, rounds);
  // Points without a colony win nothing.
  const asPatriot = (pat.points + bells[me] + rounds * 2) * (0.15 + 0.85 * pat.qualifies);
  const asLoyalist = loy.points * (0.15 + 0.85 * loy.qualifies) + 3 * loy.qualifies;
  const want = (asLoyalist * (1 + Math.max(-0.9, w.loyal))) / Math.max(0.1, asPatriot + asLoyalist);
  // Only one player becomes the loyalist, and everyone may be trying: the chance of ending with the fewest bells.
  // Each rival is below us by the end with a chance that follows the bell gap, blurred by the rounds left, so early in the game it is about one in the number of players.
  const blur = 0.8 + 0.6 * Math.max(0, rounds);
  const can = bells.reduce((p, b, i) => (i === me ? p : p / (1 + Math.exp(-(b - bells[me]) / blur))), 1);
  const x = want * can;
  return x > 0.5 ? Math.min(1, 0.5 + x * 0.5) : 0;
}

export function read(v: View, w: Weights): Situation {
  const s = v.state, me = v.player, pl = s.players[me], set = s.def.settings;
  const bells = s.players.map((p) => p.bells), top = Math.max(...bells);
  const done = top >= set.war.bells;
  const left = done ? 1 : Math.min(set.rounds.max - s.round + 1, Math.max(1, Math.ceil((set.war.bells - top) / 4) + 1));
  const last = left <= 1;
  const loyal = leaning(v, w, left);
  const colonies = s.colonies.filter((c) => c.owner === me).length;
  const sites: number[] = [];
  if (colonies < set.colony.max) for (let c = 0; c < s.map.zone.length; c++)
    if (s.map.zone[c] === 'map' && map.isLand(s, c) && map.colonyProblem(s, c) === null) { const t = map.tokenAt(s, c); if (!t || t.p === me) sites.push(c); }
  const cost = foundCost(s, me);
  const canFound = colonies < set.colony.max && (!cost || pl.wh[cost.resource] >= cost.value);
  const bell = w.bell * (1 - loyal) * set.score.perBell / set.score.bellsPerPoint - w.shun * loyal;
  const loyalist = expectedLoyalist(s, me, loyal > 0.4);
  const x: Situation = {
    v, s, me, w, cards: v.collections[me] ?? util.collection(pl), left, last, loyal, loyalist, bell, gold: w.gold, strength: 0, ref: 0, res: {} as Record<Resource, number>,
    colonies, sites, canFound, raids: 0, target: null, cross: w.cross,
  };
  const here = warPoints(x);
  // The forecast is flat when the war looks lost or won, so both have a floor.
  const mineShare = colonies / Math.max(1, s.colonies.filter((c) => c.owner !== loyalist).length);
  x.strength = Math.max(0.5 * (1 - loyal * 0.5), (warPoints(x, { strength: 4 }) - here) / 4) * w.strength;
  // The war is near: arm before it comes.
  if (loyal < 0.5 && top >= set.war.bells * 0.5 && colonies) x.strength *= 1 + 0.8 * (1 - outlook(s, v.collections, me, loyalist, left - 1).qualifies);
  x.ref = loyal > 0.4 ? -0.3 : Math.max(1.2 * Math.max(0.2, mineShare), (here - warPoints(x, { ref: 4 })) / 4) * w.ref;
  // Gold is worth at least what it scores at the end (score.goldPerPoint); the weights were tuned at 10 gold a point.
  const end = 1 / set.score.goldPerPoint, scale = 10 * end;
  x.gold = Math.max(end, last ? end + x.strength * 0.15 : w.gold * scale, (x.strength / s.def.settings.war.mercenaryGold) * 1.2);
  // Gold that will pay a tax saves the cubes of a refusal.
  const tax = s.def.settings.tax, refuse = refuseCubes(s) * x.ref + (tax.payBells - tax.refuseBells) * bell;
  for (let r = s.round, sum = 0; r <= Math.min(set.rounds.max, s.round + left - 1); r++) {
    const rate = tax.track[r - 1];
    sum += rate;
    if (sum > pl.gold && rate > 0) { x.gold = Math.max(x.gold, Math.min(0.6, (0.7 * refuse) / rate)); break; }
  }
  x.raids = raidRisk(x);
  const gold = x.gold;
  // Resources at their market worth first: the buildings wanted are priced by what working them makes.
  for (const r of RESOURCES) x.res[r] = last ? 0 : gold * s.price[r] * 0.5 * Math.min(1.5, w.trade);
  x.cross = crossWorth(x);
  x.target = wantedBuilding(x);
  const build = x.target ? s.def.buildings[x.target].timber : 0;
  // Timber and food are worth their share of what they lead to.
  const timberWorth = x.target ? Math.min(2.5, buildingValue(x, x.target) / (build + 1)) : 0;
  const wantsSite = colonies > 0 && colonies < set.colony.max && left > 1;
  if (!last) {
    if (pl.wh.timber < build) x.res.timber = w.timber * timberWorth;
    else if (pl.wh.timber < build + 2) x.res.timber = Math.max(x.res.timber, 0.35 * w.timber);
    if (wantsSite && cost && pl.wh[cost.resource] < cost.value) {
      const gain = Math.max(1, warPoints(x, { colony: 0.5 }) - here) * w.colony;
      x.res[cost.resource] = Math.max(x.res[cost.resource], w.food * Math.min(1.2, gain / (cost.value + 3)) * (sites.length ? 1 : 0.7));
    }
    if (util.has(pl, 'blacksmith_shop') || util.has(pl, 'factory')) x.res.crops = Math.max(x.res.crops, w.crops, gold * s.price.goods * 0.35);
    // Two spare resources keep a raid from taking a building.
    if (util.total(pl.wh) < set.raid.resources && x.raids > 0.2 && pl.buildings.length) for (const r of RESOURCES) x.res[r] = Math.max(x.res[r], x.raids * 1.1);
    // Goods buy gifts that calm a tribe about to raid us.
    if (s.def.settings.natives.giftResource === 'goods' && pl.wh.goods < 1) x.res.goods = Math.max(x.res.goods, 0.8 * bestGift(x));
  } else if (pl.wh.timber < build) x.res.timber = 0.3;
  // 🔔 also buy Fathers: with room for one, a 🔔 is worth part of what the best one on show gives per 🔔 (at 2 🔔 a 🏅, DD-106, only the bell leader still made them).
  if (!last && loyal < 0.5 && pl.fathers.length < fatherLimit(s, me) && s.salon.length) {
    const per = Math.max(0, ...s.salon.map((f) => (fatherValue(x, f) + (set.fathers.keepBells ? 0 : s.def.fathers[f].bells * x.bell)) / Math.max(1, s.def.fathers[f].bells)));
    x.bell = Math.max(x.bell, (1 - loyal) * 0.6 * per);
  }
  return x;
}

/* ---- Raids: the settlements whose nearest colony is ours raid it when angry enough (6 of 22 events call a given number or all of them). ---- */
const RAID_ODDS = 6 / 22;
/** Points one raid takes: two of our cheapest resources, or our cheapest building that nothing needs, whichever we give up. */
export function raidLoss(x: Situation): number {
  const { s, me } = x, pl = s.players[me], n = s.def.settings.raid.resources;
  const vals = RESOURCES.flatMap((r) => Array<number>(pl.wh[r]).fill((x.res[r] ?? 0) + 0.05)).sort((a, b) => a - b);
  const blds = pl.buildings.filter((b) => !pl.buildings.some((o) => s.def.buildings[o].requires === b)).map((b) => x.w.building + s.def.buildings[b].timber * 0.3);
  const res = vals.length >= n ? vals.slice(0, n).reduce((a, b) => a + b, 0) : blds.length ? Infinity : vals.reduce((a, b) => a + b, 0);
  return Math.min(res, blds.length ? Math.min(...blds) + 0.2 : Infinity);
}
/**
 * Points we may lose to raids before the war: from every settlement that would raid us, its tribe at hostility `h` if given (stored value)
 * and, with `site`, as if we had a colony there too, and without settlement number `gone`. A fort stops all raids.
 */
export function raidExposure(x: Situation, tribe?: string, h?: number, site?: number, minLoss = 0, gone?: number): number {
  const { s, me } = x, min = s.def.settings.activation.raidMinHostility;
  if (s.players[me].buildings.includes(s.def.settings.raid.stoppedBy) || x.last) return 0;
  let n = 0;
  for (const z of s.settlements) {
    if (!z.alive || z.n === gone) continue;
    const now = util.combinedHostility(s, me, z.tribe), hz = z.tribe === tribe && h !== undefined ? Math.max(0, h - (s.hostility[z.tribe] - now)) : now;
    if (hz < min) continue;
    const near = map.nearestColony(s, z.cell);
    if (near?.owner === me || (site !== undefined && (!near || map.distance(s, site, z.cell) < map.distance(s, near.cell, z.cell)))) n++;
  }
  return n ? n * RAID_ODDS * Math.max(0.5, x.left - 1) * Math.max(minLoss, raidLoss(x)) : 0;
}
/** Raids a gift would spare us: hostility falls by 1 and by each success of 3 dice, about 2 in all. */
/** How much hostility a gift takes away on average: the fixed part and the dice that succeed. */
export const giftDrop = (s: State, r: Resource = 'goods') => { const n = s.def.settings.natives; return n.giftByPrice ? s.price[r] : n.giftBase + (n.giftDice * s.def.settings.combat.successFaces.length) / 6; };
export const giftGain = (x: Situation, tribe: string, r: Resource = 'goods') => Math.max(0, raidExposure(x) - raidExposure(x, tribe, Math.max(0, Math.round(x.s.hostility[tribe] - giftDrop(x.s, r)))));
const bestGift = (x: Situation) => Math.max(0, ...x.s.settlements.filter((z) => z.alive).map((z) => giftGain(x, z.tribe)));

/* ---- Crosses and the buildings that make things ---- */
/** Expected worth of the best of `n` common agents seen when recruiting. */
export function recruitPick(x: Situation, n: number): number {
  const vals = Object.values(x.s.def.agents).filter((a) => a.kind === 'common').flatMap((a) => Array<number>(a.copies).fill(agentValue(x, a.id))).sort((p, q) => p - q);
  return vals[Math.min(vals.length - 1, Math.floor((vals.length * n) / (n + 1)))] ?? 0;
}
/** One cross is worth its share of a recruit: crosses at least the round look at that many agents and keep the best. Never below the weight. */
export function crossWorth(x: Situation): number {
  const r = recruitCost(x.s);
  return Math.max(x.w.cross, Math.min(0.5, (recruitPick(x, r) * 0.9) / r));
}
/** With crosses every round (crosses.everyRound): what a cross building gives without an action for the rounds that are left. */
function crossGain(x: Situation, b: string): number {
  const w = x.s.def.buildings[b]?.work;
  return w?.kind === 'produce' ? w.amount * x.cross * Math.max(0, x.left - 1) : 0;
}
/** Points from working a building for the rest of the game: what one action there makes above an ordinary action, about every other round. */
function workGain(x: Situation, b: string): number {
  const w = x.s.def.buildings[b]?.work;
  if (w?.kind !== 'produce') return 0;
  const unit = w.icon === 'bells' ? Math.max(0, x.bell) : w.icon === 'crosses' ? x.cross : Math.max(x.res.goods, x.gold * x.s.price.goods * 0.6);
  const per = w.amount * unit - (w.consumes ? w.consumes.amount * x.res[w.consumes.res] * 0.5 : 0);
  const ordinary = Math.max(0.3, x.res.timber, x.res.food) * 1.5;
  return Math.max(0, per - ordinary) * Math.max(0, x.left - 1) * 0.6;
}

/** Points expected from owning a building, apart from its price. */
export function buildingValue(x: Situation, b: string): number {
  const { w, s } = x, left = x.left - 1;
  const extra: Record<string, () => number> = {
    warehouse: () => 0.1 * left,
    docks: () => (x.colonies < s.def.settings.colony.max ? 0.15 * left : 0.02 * left),
    blacksmith_shop: () => workGain(x, 'blacksmith_shop'),
    town_hall: () => 0.9 * left * Math.max(0, x.bell) * 1.4,
    chapel: () => (s.def.settings.crosses.everyRound ? crossGain(x, 'chapel') : workGain(x, 'chapel')),
    school: () => schoolGain(x, 'school') * w.teach,
    stockade: () => defenceGain(x, 'stockade') + (s.def.settings.raid.stoppedBy === 'stockade' ? raidExposure(x) : 0),
    // Given one at round 3, a bot sells about 19 🟡 with it over the game, roughly 3.5 🟡 a round.
    custom_house: () => (s.def.buildings.custom_house?.work?.kind === 'market' ? 3.5 / s.def.settings.score.goldPerPoint : 0.15) * left * w.trade,
    // About 0.6 damages a player a game (0.07 a round): a refuge by the colony saves the voyage home, and the repair actions when the shipyard repairs at once.
    shipyard: () => 0.07 * Math.max(0, left) * (s.def.settings.damage.shipyardRepairs ? 2.5 : 1) + (s.def.settings.damage.repairOnBuild ? x.s.players[x.me].damage * 0.8 : 0),
    factory: () => Math.max(0, workGain(x, 'factory') - workGain(x, 'blacksmith_shop')),
    newspaper: () => {
      const higher = x.cards.filter((c) => s.def.agents[c].edu === 2).length;
      return higher * 2 * left * Math.max(0, x.bell) * Math.min(1, 5 / Math.max(5, x.cards.length));
    },
    church: () => (s.def.settings.crosses.everyRound ? crossGain(x, 'church') - crossGain(x, 'chapel') : Math.max(0, workGain(x, 'church') - workGain(x, 'chapel'))),
    fort: () => defenceGain(x, 'fort') + (s.def.settings.raid.stoppedBy === 'fort' ? raidExposure(x) : 0),
    university: () => schoolGain(x, 'university') * w.teach,
  };
  // A basic building also opens the way to its unique upgrade (the warehouse to the custom house): half of what that upgrade would add, while one is left,
  // shared with the rivals who could already build it.
  const pl = s.players[x.me], rivals = s.players.filter((q, i) => i !== x.me && q.buildings.includes(b)).length;
  const next = Object.values(s.def.buildings).filter((u) => u.requires === b && s.buildingsLeft[u.id] > 0 && !util.has(pl, u.id) && pl.buildings.length < s.def.settings.buildings.max - 1);
  const opens = Math.max(0, ...next.map((u) => (0.5 * (extra[u.id]?.() ?? 0)) / (1 + rivals)));
  return w.building + (extra[b]?.() ?? 0) + (util.has(pl, b) ? 0 : opens);
}
/** What a defence building is worth: the war points it adds to every colony's defence, as the forecast of the war sees them. Small but not nothing before the first colony. */
function defenceGain(x: Situation, b: string): number {
  const add = x.s.def.buildings[b]!.defence ?? 0;
  if (x.loyal > 0.5 || add <= 0) return 0;
  return Math.max(0.1 * add, warPoints(x, { defence: add }) - warPoints(x));
}
/**
 * What a school is worth: each use swaps one of the weakest agents a player has for the best profession it teaches (DD-75),
 * and a building gets about one use every other round that is left.
 */
function schoolGain(x: Situation, b: string): number {
  const { s } = x, w = s.def.buildings[b].work;
  if (w?.kind !== 'teach') return 0;
  const best = Math.max(0, ...Object.values(s.def.agents).filter((a) => a.kind === 'common' && !a.unique && a.edu === w.maxEdu).map((a) => agentValue(x, a.id)));
  const students = x.cards.filter((c) => c !== '?' && s.def.agents[c].edu >= s.def.buildings[b].edu).map((c) => agentValue(x, c)).sort((p, q) => p - q);
  return students.slice(0, Math.ceil(Math.max(0, x.left - 1) / 2)).reduce((v, a) => v + Math.max(0, best - a), 0);
}
function wantedBuilding(x: Situation): string | null {
  const { s, me } = x, pl = s.players[me];
  if (!x.colonies || pl.buildings.length >= s.def.settings.buildings.max) return null;
  let best: string | null = null, bv = 0;
  for (const b of Object.values(s.def.buildings)) {
    if (util.has(pl, b.id) || s.buildingsLeft[b.id] <= 0 || (b.requires && !util.has(pl, b.requires))) continue;
    const v = buildingValue(x, b.id) / (1 + b.timber);
    if (v > bv) { bv = v; best = b.id; }
  }
  return best;
}

/** Expected points from the war, counting the need to keep at least one colony. */
export function warPoints(x: Situation, o: Change = {}, rounds = x.left - 1): number {
  const f = outlook(x.s, x.v.collections, x.me, x.loyalist, rounds, o);
  return f.points + x.w.qualify * (0.6 * f.qualifies + 0.4 * f.progress ** 2);
}

function raidRisk(x: Situation): number {
  if (!x.colonies || x.s.players[x.me].buildings.includes(x.s.def.settings.raid.stoppedBy)) return 0;
  let n = 0;
  for (const z of x.s.settlements) if (z.alive && util.combinedHostility(x.s, x.me, z.tribe) >= x.s.def.settings.activation.raidMinHostility && map.nearestColony(x.s, z.cell)?.owner === x.me) n++;
  return n * (6 / 22);
}
export function ownTimber(x: Situation): boolean {
  return x.s.colonies.some((c) => c.owner === x.me && [c.cell, ...x.s.map.neighbours[c.cell]].some((n) => x.s.map.zone[n] === 'map' && map.isOpen(x.s, n) && x.s.def.terrain[x.s.map.terrain[n]!].yields.includes('timber')));
}

export function siteValue(x: Situation, c: number): number {
  const { s, w } = x;
  const icons = new Set<Icon>();
  let bonus = 0;
  for (const n of [c, ...s.map.neighbours[c]]) {
    if (!map.isOpen(s, n) || s.map.zone[n] !== 'map') continue;
    for (const i of s.def.terrain[s.map.terrain[n]!].yields) icons.add(i);
    if (s.map.bonus[n]) bonus++;
  }
  const first = x.colonies === 0;
  // Without timber nothing can be built.
  const timber = icons.has('timber'), had = ownTimber(x);
  const need = timber || had ? 0 : first ? -9 : -2;
  const gain = Math.max(0.5, warPoints(x, { colony: s.def.terrain[s.map.terrain[c]!].defence }) - warPoints(x));
  // A colony that becomes the nearest to an angry tribe will be raided: a new colony has little to lose yet, but will.
  const raided = raidExposure(x, undefined, undefined, c, 1) - raidExposure(x, undefined, undefined, undefined, 1);
  return gain * w.colony + (first ? w.firstColony : 0) + need - raided + (timber && !had ? 4 : timber ? 0.4 : 0) +
    (icons.has('silver') ? 0.4 : 0) + icons.size * 0.1 + bonus * 0.15;
}

/** Long-run worth of one agent in the collection. */
export function agentValue(x: Situation, card: string): number {
  const { s, w, me } = x, a = s.def.agents[card], pl = s.players[me];
  const plays = (x.left - (x.last ? 1 : 0)) * Math.min(1, 5 / Math.max(5, x.cards.length + 1));
  let per = 0;
  for (const m of a.mods) {
    if (m.mod === 'production') {
      const i = m.icons?.[0];
      if (!i) per += m.add * 0.3;
      else if (i === 'bells') per += m.add * Math.max(0, x.bell) * (util.has(pl, 'town_hall') ? 1 : 0.4);
      else if (i === 'crosses') per += m.add * (w.cross + 0.05) * (util.has(pl, 'chapel') ? 1 : 0.2);
      else if (i === 'goods') per += m.add * x.gold * 3 * (util.has(pl, 'blacksmith_shop') ? 1 : 0.2);
      else per += m.add * 0.25;
    } else if (m.mod === 'move') per += 0.1;
    else if (m.mod === 'sellPrice') per += 0.1 * w.trade;
    else if (m.mod === 'cost') per += 0.15;
    else if (m.mod === 'onlyProduce') per -= 0.3;
  }
  if (a.edu === 0) per -= 0.25;
  if (a.edu === 2 && util.has(pl, 'newspaper')) per += 1.5 * Math.max(0, x.bell);
  return 1 / s.def.settings.score.agentsPerPoint + cardPower(s, card) * x.strength + per * plays;
}
export const hireValue = (x: Situation, card: string, price: number) => (agentValue(x, card) + 0.1 * x.left * (x.cards.length < 8 ? 1 : 0)) * x.w.hire - price * x.gold;

export function fatherValue(x: Situation, f: string): number {
  const { s, w, me } = x, pl = s.players[me], left = x.left - (x.last ? 0.5 : 0);
  const pat = 1 - x.loyal, allies = s.settlements.filter((z) => z.alive && z.ally === me).length;
  const own = Math.max(1, x.colonies);
  const t: Record<string, () => number> = {
    christopher_columbus: () => 0.15 * left * w.explore,
    // Read from the card's data, so a changed effect is valued as it is.
    thomas_hooker: () => fxValue(x, f), eli_whitney: () => fxValue(x, f), john_rolfe: () => fxValue(x, f), squanto: () => fxValue(x, f), pedro_cabral: () => fxValue(x, f), francis_drake: () => fxValue(x, f), jakob_fugger: () => pl.gold * Math.max(0, 1 / (s.def.fathers.jakob_fugger!.mods.find((m) => m.mod === 'goldPerPoint')?.value ?? s.def.settings.score.goldPerPoint) - 1 / s.def.settings.score.goldPerPoint), 
    ponce_de_leon: () => 1.4 * w.hire, francisco_pizarro: () => (s.def.fathers[f].mods.some((m) => m.mod === 'lootGold') ? fxValue(x, f) : 0.4 * w.native), bartolome_de_las_casas: () => 0.25 * left * w.native, hernan_cortes: () => 0.2 * left * w.native,
    juan_de_sepulveda: () => 0.6, francisco_de_orellana: () => 0.25 * left * w.explore, walter_raleigh: () => 1 * w.hire,
    henry_hudson: () => agentValue(x, 'captain'), samuel_de_champlain: () => !s.def.fathers[f].onGain.some((n) => n.n === 'freeColony') ? fxValue(x, f) : (x.sites.length && x.colonies < s.def.settings.colony.max ? Math.max(0.5, warPoints(x, { colony: 0.5 }) - warPoints(x)) * w.colony + (x.colonies ? 1.5 : 4) : 0),
    john_smith: () => (s.def.fathers[f].onGain.length ? fxValue(x, f) : 0.3 * w.alliance),
    peter_minuit: () => allies + 0.2 * w.alliance, william_bradford: () => Math.min(5, pl.crosses) * Math.max(0, x.bell), pocahontas: () => 0.3 * w.alliance, roger_williams: () => left * w.cross * 0.5,
    john_eliot: () => 0.2 * left * w.native, michiel_de_ruyter: () => 0.2 * w.raid,
    robert_de_la_salle: () => ((!util.has(pl, 'stockade') || !util.has(pl, 'fort')) && pl.buildings.length < 6 ? buildingValue(x, 'stockade') : 0),
    william_penn: () => (x.colonies < 3 ? 0.8 : 0), benjamin_franklin: () => 2 * Math.max(0, x.bell) * left * 2.5 * (util.has(pl, 'town_hall') ? 1 : 0.2),
    george_washington: () => pat * x.strength * Math.min(4, pl.bells / 2), paul_revere: () => pat * 4 * x.strength, thomas_jefferson: () => {
      // The cheapest Fathers on show come free, as many as his card says.
      const k = s.def.fathers[f].onGain.filter((n) => n.n === 'cheapestFather').length;
      const cheap = s.salon.filter((c) => c !== f).sort((a, b) => s.def.fathers[a].bells - s.def.fathers[b].bells).slice(0, k);
      return 0.5 + cheap.reduce((n, c) => n + Math.max(0, fatherValue(x, c) + s.def.fathers[c].bells * x.bell), 0);
    },
    olaudah_equiano: () => x.cards.filter((c) => s.def.agents[c].base === 'slave').length * 0.6, thaddeus_kosciuszko: () => pat * own * x.strength * (util.has(pl, 'fort') ? 2 : util.has(pl, 'stockade') ? 1 : 0),
    simon_bolivar: () => pat * own * 3 * 0.6, benedict_arnold: () => x.loyal * 3 * x.strength,
  };
  const set = s.def.settings, price = s.def.fathers[f].bells;
  return ((set.score.fatherByPrice ? price : set.score.father) + (t[f]?.() ?? 0)) * w.father - (set.fathers.keepBells ? 0 : price * x.bell);
}

/** Worth of a Father's effects read from its data: what it gives at once and what its lasting bonuses bring over the rounds left. */
function fxValue(x: Situation, f: string): number {
  const { s, w, me } = x, pl = s.players[me], def = s.def.fathers[f], left = x.left - (x.last ? 0.5 : 0);
  let v = 0;
  for (const n of def.onGain) {
    if (n.n === 'takeAgent') v += agentValue(x, n.agent) * n.amount;
    else if (n.n === 'freeBuilding') v += Math.max(0, ...n.options.filter((b) => !canOwnBuilding(s, me, b) && pl.buildings.length < s.def.settings.buildings.max).map((b) => buildingValue(x, b)));
    else v += nodesValue(x, [n]);
  }
  // A production bonus needs something that makes that resource: ✝️ a chapel, 📦 a blacksmith's shop.
  const makes = (i: string) => (i === 'crosses' ? util.has(pl, 'chapel') || util.has(pl, 'church') : i === 'goods' ? util.has(pl, 'blacksmith_shop') || util.has(pl, 'factory') : true);
  for (const m of def.mods) {
    if (m.mod === 'production') v += 0.1 * left * m.add * ((m.icons ?? []).every(makes) ? (m.icons?.includes('crosses') ? 15 * w.cross : 1) : 0);
    else if (m.mod === 'move') v += 0.05 * left * m.add;
    else if (m.mod === 'battle' && m.token === 'ship') v += 0.1 * m.add * w.raid;
    else if (m.mod === 'sellPrice') v += 1.2 * left * m.add * x.gold;
    // No more trips to Europe to sell and hire.
    else if (m.mod === 'europeAnywhere') v += 0.5 * left * w.trade;
    else if (m.mod === 'lootGold') v += 0.1 * left * m.add * x.gold * w.native;
  }
  return v;
}

/** Rough worth of one-off effects, averaging dice. */
export function nodesValue(x: Situation, list: Node[]): number {
  const { w, s, me } = x;
  let v = 0;
  for (const n of list) switch (n.n) {
    case 'gain': v += (n.gold ?? 0) * x.gold + (n.bells ?? 0) * x.bell + (n.crosses ?? 0) * (x.loyal > 0.5 ? -0.15 : w.cross);
      for (const r of RESOURCES) v += ((n.wh?.[r] ?? 0) + (n.hold?.[r] ?? 0) * 0.9) * x.res[r]; break;
    case 'lose': v -= Math.min(n.crosses ?? 0, s.players[me].crosses) * w.cross + (n.bells ?? 0) * x.bell; break;
    case 'endMove': v -= 0.15 * Math.max(0, s.move?.points ?? 0); break;
    case 'moves': v += 0.1 * n.add; break;
    case 'toEurope': v -= n.skull && s.move?.scout ? 0 : s.move?.token === 'infantry' ? 1.2 : 0.4; break;
    case 'damage': v -= n.skull && s.move?.scout ? 0 : 1.1 * n.amount; break;
    case 'roll': { let prev = 0; for (const r of n.table) { v += ((r.max - prev) / 6) * nodesValue(x, r.do); prev = r.max; } break; }
    case 'hostilityNearest': v -= 0.15 * n.add; break;
    case 'pierLeftmost': v += s.pier[0] ? agentValue(x, s.pier[0][0]) : 0; break;
    case 'takeAgent': v += 0.5 * n.amount; break;
    // Hurting a rival's ship is worth about half a point to us.
    case 'damageShips': { const away = s.players.filter((pl, q) => q !== me && !map.shipInEurope(s, q)).length; v += 0.5 * n.amount * (n.who === 'away' ? away : Math.min(1, away)); break; }
    case 'allyFriendly': v += s.settlements.filter((z) => z.alive && z.ally === null && map.isOpen(s, z.cell) && util.combinedHostility(s, me, z.tribe) <= n.max).length * 1.5 * w.alliance; break;
    case 'nextColonyFree': { const c = s.def.settings.colony.foundCost; v += x.colonies < s.def.settings.colony.max && x.sites.length ? c.value * x.res[c.resource] + 0.5 : 0; break; }
    case 'drawPoi': case 'guide': v += 0.8; break;
    case 'revealAdjacent': v += 0.8 * w.explore; break;
    case 'ref': v -= (n.add ?? 0) * x.ref; break;
    case 'dropHold': v -= RESOURCES.reduce((k, r) => k + s.players[me].hold[r] * x.gold * s.price[r], 0); break;
    case 'discardCards': v -= 0.6 * n.amount; break;
    case 'loseTopAgent': v -= n.skull && s.move?.scout ? 0 : 1.2; break;
    case 'discardHand': v -= n.skull && s.move?.scout ? 0 : 0.6 * s.players[me].hand.length; break;
    case 'toColonyWater': v += 0.1; break;
    default: break;
  }
  return v;
}

/** Points ahead of the best rival if the war came in so many rounds, counting who may win at all. */
export function lead(x: Situation, rounds: number): number {
  const f = forecast(x.s, x.v.collections, x.loyalist, rounds).map((y) => y.points * (0.3 + 0.7 * y.qualifies));
  return f[x.me] - Math.max(0, ...f.filter((_, p) => p !== x.me));
}
