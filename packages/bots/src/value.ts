import type { Icon, Node, Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { State, View } from '@col/engine';
import { foundCost, map, util } from '@col/engine';
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
  target: string | null;
}

/** How much this player means to be the loyalist, from 0 to 1. */
function leaning(v: View, w: Weights, left: number): number {
  const s = v.state, me = v.player, n = s.players.length;
  if (n === 1 || w.loyal <= -1) return 0;
  const bells = s.players.map((p) => p.bells);
  const gap = bells[me] - Math.min(...bells.filter((_, i) => i !== me));
  const rounds = left - 1;
  const other = expectedLoyalist(s, me, false);
  const pat = outlook(s, v.collections, me, other === me ? null : other, rounds);
  const loy = outlook(s, v.collections, me, me, rounds);
  // Points without a colony win nothing.
  const asPatriot = (pat.points + bells[me] + rounds * 2) * (0.15 + 0.85 * pat.qualifies);
  const asLoyalist = loy.points * (0.15 + 0.85 * loy.qualifies) + 3 * loy.qualifies;
  const want = (asLoyalist * (1 + Math.max(-0.9, w.loyal))) / Math.max(0.1, asPatriot + asLoyalist);
  // Others may be ahead in having fewer bells; Fathers can still be bought to get rid of some.
  const can = gap <= 0 ? 1 : Math.max(0, 1 - gap / (2 + 2 * rounds));
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
  const bell = w.bell * (1 - loyal) - w.shun * loyal;
  const loyalist = expectedLoyalist(s, me, loyal > 0.4);
  const x: Situation = {
    v, s, me, w, cards: v.collections[me] ?? util.collection(pl), left, last, loyal, loyalist, bell, gold: w.gold, strength: 0, ref: 0, res: {} as Record<Resource, number>,
    colonies, sites, canFound, raids: 0, target: null,
  };
  const here = warPoints(x);
  // The forecast is flat when the war looks lost or won, so both have a floor.
  const mineShare = colonies / Math.max(1, s.colonies.filter((c) => c.owner !== loyalist).length);
  x.strength = Math.max(0.5 * (1 - loyal * 0.5), (warPoints(x, { strength: 4 }) - here) / 4) * w.strength;
  // The war is near: arm before it comes.
  if (loyal < 0.5 && top >= set.war.bells * 0.5 && colonies) x.strength *= 1 + 0.8 * (1 - outlook(s, v.collections, me, loyalist, left - 1).qualifies);
  x.ref = loyal > 0.4 ? -0.3 : Math.max(1.2 * Math.max(0.2, mineShare), (here - warPoints(x, { ref: 4 })) / 4) * w.ref;
  x.gold = Math.max(0.1, last ? 0.1 + x.strength * 0.15 : w.gold, (x.strength / s.def.settings.war.mercenaryGold) * 1.2);
  // Gold that will pay a tax saves the cubes of a refusal.
  const tax = s.def.settings.tax, refuse = (s.players.length === 1 ? tax.refuseRefSolo : tax.refuseRef) * x.ref - tax.refuseBells * bell;
  for (let r = s.round, sum = 0; r <= Math.min(set.rounds.max, s.round + left - 1); r++) {
    const rate = tax.track[r - 1];
    sum += rate;
    if (sum > pl.gold && rate > 0) { x.gold = Math.max(x.gold, Math.min(0.6, (0.7 * refuse) / rate)); break; }
  }
  x.raids = raidRisk(x);
  const gold = x.gold;
  x.target = wantedBuilding(x);
  const build = x.target ? s.def.buildings[x.target].timber : 0;
  // Timber and food are worth their share of what they lead to.
  const timberWorth = x.target ? Math.min(2.5, buildingValue(x, x.target) / (build + 1)) : 0;
  const wantsSite = colonies > 0 && colonies < set.colony.max && left > 1;
  for (const r of RESOURCES) x.res[r] = last ? 0 : gold * s.price[r] * 0.5 * Math.min(1.5, w.trade);
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
  } else if (pl.wh.timber < build) x.res.timber = 0.3;
  return x;
}

/** Points expected from owning a building, apart from its price. */
export function buildingValue(x: Situation, b: string): number {
  const { w, s } = x, left = x.left - 1;
  const own = Math.max(1, x.colonies);
  const extra: Record<string, () => number> = {
    warehouse: () => 0.1 * left,
    docks: () => (x.colonies < s.def.settings.colony.max ? 0.15 * left : 0.02 * left),
    blacksmith_shop: () => 0.2 * left * w.trade * x.gold * 8,
    town_hall: () => 0.9 * left * Math.max(0, x.bell) * 1.4,
    chapel: () => left * (0.2 + 2 * w.cross),
    school: () => 0.1 * left * w.teach,
    stockade: () => own * x.strength * (1 - x.loyal),
    custom_house: () => 0.15 * left * w.trade,
    shipyard: () => 0.05,
    factory: () => 0.2 * left * w.trade * x.gold * 12,
    newspaper: () => {
      const higher = x.cards.filter((c) => s.def.agents[c].edu === 2).length;
      return higher * 2 * left * Math.max(0, x.bell) * Math.min(1, 5 / Math.max(5, x.cards.length));
    },
    church: () => left * (0.1 + 3 * w.cross),
    fort: () => own * x.strength * 1.2 * (1 - x.loyal) + x.raids * left * 0.8,
    university: () => 0.1 * left * w.teach,
  };
  return w.building + (extra[b]?.() ?? 0);
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
  if (!x.colonies || x.s.players[x.me].buildings.includes('fort')) return 0;
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
  return gain * w.colony + (first ? w.firstColony : 0) + need + (timber && !had ? 4 : timber ? 0.4 : 0) +
    (icons.has('corn') ? 0.3 : 0) + (icons.has('silver') ? 0.4 : 0) + icons.size * 0.1 + bonus * 0.15;
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
    christopher_columbus: () => 0.15 * left * w.explore, jakob_fugger: () => pl.gold * 0.045, pedro_cabral: () => 0.1 * left,
    ponce_de_leon: () => 1.4 * w.hire, francisco_pizarro: () => 0.4 * w.native, bartolome_de_las_casas: () => 0.25 * left * w.native, hernan_cortes: () => 0.2 * left * w.native,
    juan_de_sepulveda: () => 0.6, francisco_de_orellana: () => 0.25 * left * w.explore, francis_drake: () => 0.2 * w.raid, walter_raleigh: () => 1 * w.hire,
    henry_hudson: () => agentValue(x, 'captain'), samuel_de_champlain: () => (x.sites.length && x.colonies < s.def.settings.colony.max ? Math.max(0.5, warPoints(x, { colony: 0.5 }) - warPoints(x)) * w.colony + (x.colonies ? 1.5 : 4) : 0),
    john_smith: () => 0.3 * w.alliance, squanto: () => 0.1 * left, john_rolfe: () => 0.1 * left, thomas_hooker: () => left * w.cross * (util.has(pl, 'chapel') ? 1.5 : 0),
    peter_minuit: () => allies + 0.2 * w.alliance, william_bradford: () => Math.min(5, pl.crosses) * Math.max(0, x.bell), pocahontas: () => 0.3 * w.alliance, roger_williams: () => left * w.cross * 0.5,
    john_eliot: () => 0.2 * left * w.native, michiel_de_ruyter: () => 0.2 * w.raid,
    robert_de_la_salle: () => ((!util.has(pl, 'stockade') || !util.has(pl, 'fort')) && pl.buildings.length < 6 ? buildingValue(x, 'stockade') : 0),
    william_penn: () => (x.colonies < 3 ? 0.8 : 0), benjamin_franklin: () => 2 * Math.max(0, x.bell) * left * 2.5 * (util.has(pl, 'town_hall') ? 1 : 0.2),
    george_washington: () => pat * x.strength * Math.min(4, pl.bells / 2), paul_revere: () => pat * 4 * x.strength, thomas_jefferson: () => 1.5,
    olaudah_equiano: () => x.cards.filter((c) => s.def.agents[c].base === 'slave').length * 0.6, thaddeus_kosciuszko: () => pat * own * x.strength * (util.has(pl, 'fort') ? 2 : util.has(pl, 'stockade') ? 1 : 0),
    eli_whitney: () => (util.has(pl, 'blacksmith_shop') ? 0.15 * left * w.trade : 0), simon_bolivar: () => pat * own * 3 * 0.6, benedict_arnold: () => x.loyal * 3 * x.strength,
  };
  return (s.def.settings.score.father + (t[f]?.() ?? 0)) * w.father - s.def.fathers[f].bells * x.bell;
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
    case 'drawPoi': case 'guide': v += 0.8; break;
    case 'revealAdjacent': v += 0.8 * w.explore; break;
    case 'ref': v -= (n.add ?? 0) * x.ref; break;
    case 'dropHold': v -= RESOURCES.reduce((k, r) => k + s.players[me].hold[r] * x.gold * s.price[r], 0); break;
    case 'discardCards': v -= 0.6 * n.amount; break;
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
