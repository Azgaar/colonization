import type { ChoiceOption, Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Choice } from '@col/engine';
import {
  buildingYield, buildPrice, cardStrength, refuseCubes, cellYield, fatherLimit, foundCost, map, mercenaryMax, militiaMax, nextU32, recruitCost, scorePlayer, seedRng, sellPrice, siegeStrength, taxRate, util, warStrength,
} from '@col/engine';
import type { Bot } from './random.ts';
import { firstStep, landPaths, shipPaths, type Paths } from './paths.ts';
import { agentValue, buildingValue, fatherValue, giftGain, hireValue, lead, nodesValue, raidExposure, read, recruitPick, siteValue, warPoints, type Situation } from './value.ts';
import { cardPower, outlook } from './outlook.ts';
import { deployGain, planDefence } from './war.ts';
import { BASE, type Weights } from './weights.ts';

/** A choice weighed: its score and why; the goal bot's own reason when `why` holds more (the search bot's), and for a move the cell the token heads for. */
export interface Considered { choice: Choice; score: number; why: string; goal?: string; to?: number }
export interface GoalBot extends Bot { last: Considered[] }

interface Goal { name: string; value: number; dist: number; extra: number; to: number; then?: 'explore' | 'cargo' | 'disembark' | 'embark'; cell?: number }
/** Value per action: spread over the actions the goal still takes. */
const worth = (g: Goal, points: number) => g.value / (Math.max(1, Math.ceil(g.dist / points)) + g.extra);

const success = (gap: number) => (gap <= 0 ? 0 : 1 - (2 / 3) ** gap);

/** `keep` is how many of the best candidates stay in `last`, for the search bot and the advisor. */
export function goalBot(seed: string, weights: Partial<Weights> = {}, name = 'goal', keep = 5): GoalBot {
  const w: Weights = { ...BASE, ...weights };
  const rng = seedRng(`bot-${seed}`);
  const random = () => nextU32(rng) / 4294967296;
  // What the current move is for, so that a bot does not change its mind at every step.
  const intent: Intent = { goal: null };
  const bot: GoalBot = {
    name, last: [],
    choose(v) {
      const s = v.state, d = s.pending!;
      if (v.legal.length === 1) return v.legal[0];
      const x = read(v, w);
      if (d.kind === 'turn') intent.goal = null;
      const scored: Considered[] = d.kind === 'turn' ? scoreTurn(x) : d.kind === 'move' ? scoreMove(x, intent) : v.legal.map((c) => ({ choice: c, score: scoreSmall(x, c), why: d.kind }));
      for (const c of scored) c.score += (random() - 0.5) * 2 * w.noise;
      scored.sort((a, b) => b.score - a.score);
      bot.last = scored.slice(0, keep);
      return scored[0].choice;
    },
  };
  return bot;
}

// --- Goals on the map ------------------------------------------------------------

/** Points for selling what is in the hold, and what could be loaded. */
const cargoValue = (x: Situation, hold: Record<Resource, number>, card?: string) => RESOURCES.reduce((n, r) => n + hold[r] * (card ? sellPrice(x.s, x.me, card, r) : x.s.price[r]), 0) * x.gold * x.w.trade;
/** Warehouse goods worth shipping, best first. */
function shippable(x: Situation): Resource[] {
  const pl = x.s.players[x.me], out: Resource[] = [];
  const cost = foundCost(x.s, x.me);
  const keep: Record<string, number> = { timber: x.target ? x.s.def.buildings[x.target].timber : 0 };
  if (cost && x.colonies < x.s.def.settings.colony.max) keep[cost.resource] = Math.max(keep[cost.resource] ?? 0, cost.value);
  if (util.has(pl, 'blacksmith_shop') && !x.last) keep.crops = 99;
  for (const r of RESOURCES) for (let i = keep[r] ?? 0; i < pl.wh[r]; i++) out.push(r);
  return out.filter((r) => x.s.price[r] > 0).sort((a, b) => x.s.price[b] - x.s.price[a]);
}

function europeValue(x: Situation): number {
  const { s, me } = x, pl = s.players[me];
  let v = 0;
  const hires = s.pier.map((st) => hireValue(x, st[0], s.def.agents[st[0]].price!)).filter((_, i) => s.def.agents[s.pier[i][0]].price! <= pl.gold);
  if (pl.gold > 0 && hires.length) v += Math.max(0, ...hires);
  if (pl.fathers.length < fatherLimit(s, me)) for (const f of s.salon) if (s.def.fathers[f].bells <= pl.bells) v = Math.max(v, fatherValue(x, f));
  return v;
}

function shipGoals(x: Situation, start: number, paths: Paths): Goal[] {
  const { s, me, w } = x, pl = s.players[me], out: Goal[] = [];
  const adjacentWater = (cell: number): { to: number; dist: number } | null => {
    let best = -1, d = Infinity;
    for (const c of s.map.neighbours[cell]) if (paths.dist[c] < d) { d = paths.dist[c]; best = c; }
    return best < 0 ? null : { to: best, dist: d };
  };
  let europe = -1, ed = Infinity;
  for (let c = 0; c < s.map.zone.length; c++) if (s.map.zone[c] === 'europe' && paths.dist[c] < ed) { ed = paths.dist[c]; europe = c; }

  if (pl.inf === 'ship') {
    if (x.canFound && x.left > 1) for (const c of x.sites) {
      const t = adjacentWater(c);
      if (t && map.canInfantryEnter(s, me, c)) out.push({ name: 'settle', value: siteValue(x, c), dist: t.dist + 1, extra: 1, to: t.to, then: 'disembark', cell: c });
    }
    for (const [k, kind] of Object.entries(s.poi)) if (kind === 'ruin' && x.left > 1) {
      const t = adjacentWater(Number(k));
      if (t && map.canInfantryEnter(s, me, Number(k))) out.push({ name: 'ruin', value: w.poi * 0.9, dist: t.dist + 1, extra: 0, to: t.to, then: 'disembark', cell: Number(k) });
    }
  } else if (pl.inf === 'europe' && europe >= 0) out.push({ name: 'fetch', value: x.canFound ? 3 : 0.6, dist: ed + 1, extra: 1, to: europe, then: 'embark' });
  else if (typeof pl.inf === 'number' && x.canFound && x.left > 1 && util.holdFree(s, me) > 0 && !landReach(x)) {
    const t = adjacentWater(pl.inf);
    if (t) out.push({ name: 'pick up', value: 3, dist: t.dist + 1, extra: 1, to: t.to, then: 'embark' });
  }
  if (!x.last) {
    const good = x.sites.filter((c) => siteValue(x, c) > 3).length;
    const need = x.colonies === 0 && !good ? 25 : x.colonies < s.def.settings.colony.max && !good ? 5 : 1;
    let best = -1, d = Infinity;
    for (let c = 0; c < s.map.zone.length; c++) if (paths.dist[c] < d && map.explorable(s, c).length) { d = paths.dist[c]; best = c; }
    if (best >= 0) out.push({ name: 'explore', value: w.explore * need, dist: d + 1, extra: 0, to: best, then: 'explore' });
  }
  for (const [k, kind] of Object.entries(s.poi)) if (kind === 'wreck' && paths.dist[Number(k)] < Infinity) out.push({ name: 'wreck', value: w.poi, dist: paths.dist[Number(k)], extra: 0, to: Number(k) });

  if (europe >= 0 && !util.mods(s, me, 'europeAnywhere').length) {
    const held = cargoValue(x, pl.hold), there = europeValue(x);
    if (held + there > 0.3 && !map.inEurope(s, start)) out.push({ name: 'to Europe', value: held + there, dist: ed, extra: 1, to: europe });
    const goods = shippable(x).slice(0, util.holdFree(s, me));
    if (goods.length && x.left > 1) {
      let to = -1, dd = Infinity;
      for (const c of s.colonies) if (c.owner === me) { const t = adjacentWater(c.cell); if (t && t.dist < dd) { dd = t.dist; to = t.to; } }
      const v = goods.reduce((n, r) => n + s.price[r], 0) * x.gold * w.trade + held + there;
      if (to >= 0) out.push({ name: 'load', value: v, dist: dd + 1, extra: 2, to, then: 'cargo' });
    }
  }
  for (const z of s.settlements) if (z.alive) {
    const t = adjacentWater(z.cell), v = nativeValue(x, z.n);
    if (t && v > 0.3) out.push({ name: 'natives', value: v, dist: t.dist, extra: 1, to: t.to });
  }
  if (x.left <= 2 && x.colonies && !guarding(x, start)) for (const c of s.colonies) if (c.owner === me) {
    const t = adjacentWater(c.cell);
    if (t) out.push({ name: 'guard', value: x.strength, dist: t.dist, extra: 0, to: t.to });
  }
  return out.filter((g) => g.dist < Infinity);
}

const guarding = (x: Situation, cell: number) => x.s.colonies.some((c) => c.owner === x.me && map.distance(x.s, c.cell, cell) <= 1);

/** Whether infantry on land can walk to a place worth founding on. */
function landReach(x: Situation): boolean {
  const pl = x.s.players[x.me];
  if (typeof pl.inf !== 'number') return false;
  const p = landPaths(x.s, x.me, [pl.inf]);
  return x.sites.some((c) => p.dist[c] < Infinity);
}

function landGoals(x: Situation, start: number, paths: Paths): Goal[] {
  const { s, me, w } = x, pl = s.players[me], out: Goal[] = [];
  if (x.canFound && x.left > 1) for (const c of x.sites) if (paths.dist[c] < Infinity) out.push({ name: 'settle', value: siteValue(x, c), dist: paths.dist[c], extra: 1, to: c });
  for (const [k, kind] of Object.entries(s.poi)) if (kind === 'ruin' && paths.dist[Number(k)] < Infinity) out.push({ name: 'ruin', value: w.poi, dist: paths.dist[Number(k)], extra: 0, to: Number(k) });
  for (const z of s.settlements) if (z.alive) {
    const v = nativeValue(x, z.n);
    for (const c of s.map.neighbours[z.cell]) if (v > 0.3 && paths.dist[c] < Infinity) out.push({ name: 'natives', value: v, dist: paths.dist[c], extra: 1, to: c });
  }
  if (!x.last) for (let c = 0; c < s.map.zone.length; c++) if (paths.dist[c] < 8 && map.explorable(s, c).length) out.push({ name: 'explore', value: w.explore * (x.sites.length ? 0.6 : 2), dist: paths.dist[c] + 1, extra: 0, to: c, then: 'explore' });
  if (!guarding(x, start)) for (const c of s.colonies) if (c.owner === me && x.left <= 2) for (const n of [c.cell, ...s.map.neighbours[c.cell]]) if (paths.dist[n] < Infinity) out.push({ name: 'guard', value: x.strength, dist: paths.dist[n], extra: 0, to: n });
  // Back aboard, when there is more to settle and nowhere to walk.
  if (x.canFound && x.left > 2 && !x.sites.some((c) => paths.dist[c] < Infinity) && util.holdFree(s, me) > 0)
    for (const c of s.map.neighbours[pl.ship]) if (paths.dist[c] < Infinity) out.push({ name: 'board', value: 2.5, dist: paths.dist[c] + 1, extra: 2, to: c, then: 'embark' });
  return out;
}

/** Best peaceful or violent use of a settlement, ignoring how to get there. */
function nativeValue(x: Situation, n: number): number {
  const { s, me } = x, z = s.settlements[n - 1], pl = s.players[me], h = util.combinedHostility(s, me, z.tribe);
  let v = 0;
  if (s.nativesLeft > 0 && pl.crosses >= h) v = Math.max(v, preachValue(x, h));
  if (canGift(x)) v = Math.max(v, giftValue(x, n));
  if (z.ally === null && h <= 1 && x.cards.some((c) => s.def.agents[c].edu === 2 || s.def.agents[c].base === 'scout')) v = Math.max(v, allyValue(x));
  const best = Math.max(0, ...pl.hand.map((c) => (c === '?' ? 0 : cardStrength(s, c, 'infantry', true, z.cell))));
  if (best > 0) v = Math.max(v, conquestValue(x, n, 1 + best));
  return v;
}
const canGift = (x: Situation) => (x.s.def.settings.natives.giftResource === 'any' ? util.total(x.s.players[x.me].wh) > 0 : x.s.players[x.me].wh.goods >= 1);
/** A gift: the raids it spares us, and a step towards an alliance, against the resource it costs; without a resource named, the best one we hold. */
function giftValue(x: Situation, n: number, r?: Resource): number {
  const z = x.s.settlements[n - 1], wh = x.s.players[x.me].wh;
  if (!r) return Math.max(-9, ...(x.s.def.settings.natives.giftResource === 'any' ? RESOURCES.filter((k) => wh[k] > 0) : ['goods' as Resource]).map((k) => giftValue(x, n, k)));
  return (z.ally === null && x.s.hostility[z.tribe] >= 2 ? 0.5 * allyValue(x) : 0) + giftGain(x, z.tribe, r) - x.res[r] - (x.last ? 0.6 : 0.1);
}
/** Raids a preaching may bring: hostility rises by 1, unless John Eliot keeps it calm. */
const preachAnger = (x: Situation, tribe: string) => (x.s.players[x.me].fathers.includes('john_eliot') ? 0 : Math.max(0, raidExposure(x, tribe, x.s.hostility[tribe] + 1) - raidExposure(x)));
const allyValue = (x: Situation) => x.w.alliance * 3 * x.strength * (1 - x.loyal) + (x.s.players[x.me].fathers.includes('peter_minuit') ? 1 : 0);
const preachValue = (x: Situation, cost: number) => x.w.native * 1.2 + (x.last ? 0 : agentValue(x, 'indian')) - cost * x.w.cross * 0.6 - 0.1;
function conquestValue(x: Situation, n: number, strength: number): number {
  const { s, w } = x, z = s.settlements[n - 1], t = s.def.tribes[z.tribe];
  const p = success(strength - z.pop - s.def.terrain[s.map.terrain[z.cell]!].defence);
  const f = util.mods(s, x.me, 'lootFactor').reduce((n, m) => Math.max(n, m.value), 1), bonus = util.mods(s, x.me, 'lootGold').reduce((n, m) => n + m.add, 0);
  const gold = (t.loot.gold ?? 0) * f + bonus;
  const loot = z.pop === 1 ? gold * x.gold + (t.loot.res ? t.loot.amount! * f * x.res[t.loot.res] : 0) : (gold * x.gold * 0.5) / z.pop;
  // An attack sets the tribe's hostility to the top, which may bring raids; taking the last of its people ends that settlement's raids for good.
  const after = raidExposure(x, z.tribe, s.def.settings.natives.afterAttack);
  const angry = (s.hostility[z.tribe] < 5 ? (x.colonies ? 0.4 : 0.15) : 0) + Math.max(0, after - raidExposure(x)) - (z.pop === 1 ? p * Math.max(0, after - raidExposure(x, z.tribe, s.def.settings.natives.afterAttack, undefined, 0, z.n)) : 0);
  return w.native * (p * (x.bell + 0.5 + loot)) - angry * (1 - x.loyal);
}

// --- Turn ------------------------------------------------------------------------

function scoreTurn(x: Situation): Considered[] {
  const { s, me, v, w } = x, pl = s.players[me];
  const sPaths = pl.damage === 0 ? shipPaths(s, pl.ship) : null;
  const sg = sPaths ? shipGoals(x, pl.ship, sPaths) : [];
  const lg = typeof pl.inf === 'number' ? landGoals(x, pl.inf, landPaths(s, me, [pl.inf])) : [];
  const points = (card: string) => util.mods(s, me, 'move', card).reduce((n, m) => n + m.add, s.def.settings.move.points);
  const top = (goals: Goal[], p: number) => goals.reduce<Goal | null>((b, g) => (g.dist > 0 && (!b || worth(g, p) > worth(b, p)) ? g : b), null);

  const base: Considered[] = [];
  for (const c of v.legal) {
    if (c.c === 'pass') { base.push({ choice: c, score: 0, why: 'pass' }); continue; }
    if (c.c === 'recruit') { base.push({ choice: c, score: (0.5 + recruitPick(x, 1)) * 0.9 - recruitCost(s) * w.cross * 1.1 + (x.last ? -0.3 : 0.3), why: 'recruit with crosses' }); continue; }
    const card = c.card as string;
    let score = 0, why = c.a as string, to: number | undefined;
    switch (c.a) {
      case 'produce': case 'docks': {
        const y = cellYield(s, me, card, c.cell as number, (c.icon ?? 'food') as 'food', c.a === 'docks' ? 1 : 0)!;
        const r = ({ food: 'food', timber: 'timber', crops: 'crops', silver: 'silver' } as Record<string, Resource>)[(c.icon ?? 'food') as string];
        const free = Math.max(0, util.warehouseCap(s, me) - util.total(pl.wh));
        score = Math.min(y.total, free) * x.res[r];
        if (x.last && r === 'timber' && x.target && pl.wh.timber + y.total >= s.def.buildings[x.target].timber) score = 0.6;
        break;
      }
      case 'work': {
        const b = s.def.buildings[c.building as string], y = buildingYield(s, me, card, c.building as string);
        if (typeof y === 'string' || b.work?.kind !== 'produce') break;
        const n = y.total;
        if (b.work.icon === 'bells') score = n * x.bell + endGame(x, n);
        else if (b.work.icon === 'crosses') score = Math.min(n, s.def.settings.crosses.max - pl.crosses) * crossWorth(x) * (x.last ? 0.1 : 1);
        else score = n * Math.max(x.res.goods, x.gold * s.price.goods * 0.6 * w.trade * (x.left > 1 ? 1 : 0)) - x.res.crops * 0.5;
        break;
      }
      case 'moveShip': { const g = top(sg, points(card)); score = g ? worth(g, points(card)) : -0.1; why = g ? `ship: ${g.name}` : 'ship'; to = g?.to; break; }
      case 'moveInfantry': {
        const p = points(card), g = pl.inf === 'ship' ? top(sg.filter((q) => q.then === 'disembark' && q.dist <= 1), p) : top(lg, p);
        score = g ? worth(g, p) : -0.1; why = g ? `infantry: ${g.name}` : 'infantry'; to = g?.to; break;
      }
      case 'found': score = siteValue(x, pl.inf as number) * (x.last ? 0.6 : 1); break;
      case 'attack': score = attackValue(x, c); break;
      case 'trade': score = cargoValue(x, pl.hold, card); break;
      case 'hire': {
        const off = util.mods(s, me, 'cost', card).reduce((n, m) => n + (m.of === 'hire' ? m.add : 0), 0);
        let gold = pl.gold;
        const list = s.pier.map((st) => ({ p: Math.max(0, s.def.agents[st[0]].price! + off), val: hireValue(x, st[0], Math.max(0, s.def.agents[st[0]].price! + off)) })).sort((a, b) => b.val - a.val);
        let k = 0;
        for (const o of list) if (k < s.def.settings.hire.max && o.p <= gold && o.val > 0) { score += o.val; gold -= o.p; k++; }
        if (!k) score = -0.2;
        break;
      }
      case 'propaganda': {
        let bells = pl.bells, k = 0;
        for (const f of [...s.salon].sort((a, b) => fatherValue(x, b) - fatherValue(x, a))) if (k < 2 && s.def.fathers[f].bells <= bells && fatherValue(x, f) > 0) { score += fatherValue(x, f); if (!s.def.settings.fathers.keepBells) bells -= s.def.fathers[f].bells; k++; }
        if (!k) score = -0.5;
        break;
      }
      case 'repair': case 'shipyard': score = x.last ? 0 : 0.9 * Math.min(pl.damage, c.a === 'repair' ? 1 : 4); break;
      case 'build': score = buildingValue(x, c.building as string) - buildPrice(s, me, card, c.building as string) * 0.15; if (c.building !== x.target && !x.last && x.target && pl.wh.timber - buildPrice(s, me, card, c.building as string) < s.def.buildings[x.target].timber) score -= 0.2 + buildPrice(s, me, card, c.building as string) * w.timber; break;
      // Schooling swaps the agent played for the profession chosen (DD-75).
      case 'teach': score = w.teach * (agentValue(x, c.target as string) - agentValue(x, card)); break;
      // A custom house of kind market (DD-100) sells what the warehouse can spare, as in Europe.
      case 'customs': score = c.r ? (sellPrice(s, me, card, c.r as Resource) - 0.5) * x.gold : RESOURCES.reduce((v, r) => v + Math.max(0, sellPrice(s, me, card, r) * x.gold - x.res[r]) * pl.wh[r], 0) - 0.2; break;
      case 'smuggle': score = (s.price[c.r as Resource] - 1) * x.gold; break;
      case 'supply': score = 0.02 - (x.last ? 0 : x.res.food); break;
      case 'exchange': score = 0.02 - 0.1; break;
      case 'gift': score = giftValue(x, c.settlement as number, (c.r ?? 'goods') as Resource); break;
      case 'preach': { const z = s.settlements[(c.settlement as number) - 1]; score = preachValue(x, 0) - 0.12 * w.cross * util.combinedHostility(s, me, z.tribe) - preachAnger(x, z.tribe); break; }
      case 'alliance': score = allyValue(x); break;
      // Each extra look is a better pick.
      case 'recruit': score = recruitPick(x, c.n as number) * 0.9 - (c.n as number) * w.cross * 1.1 - (x.last ? 0.3 : 0); break;
    }
    base.push({ choice: c, score, why, ...(to !== undefined ? { to } : {}) });
  }
  // A card is worth keeping for what it does best.
  const best = new Map<string, number>();
  for (const b of base) {
    const k = b.choice.card as string | undefined;
    if (k) best.set(k, Math.max(best.get(k) ?? 0, b.score));
  }
  for (const b of base) {
    const k = b.choice.card as string | undefined;
    if (k) b.score -= w.regret * Math.max(0, best.get(k)! - b.score);
  }
  return base;
}

/** Crossing the bell limit ends the game: good when ahead, bad when behind. */
function endGame(x: Situation, n: number): number {
  const pl = x.s.players[x.me], lim = x.s.def.settings.war.bells;
  if (x.s.players.some((p) => p.bells >= lim) || pl.bells + n < lim || x.s.round >= x.s.def.settings.rounds.max) return 0;
  // Without a colony that can hold, every point is lost: never call the war on oneself.
  const safe = outlook(x.s, x.v.collections, x.me, x.loyalist, 0).qualifies;
  if (safe < 0.5 && x.loyal < 0.5) return -8 * (1 - safe);
  const now = lead(x, 0), later = lead(x, Math.min(3, x.s.def.settings.rounds.max - x.s.round));
  return Math.max(-5, Math.min(5, 0.35 * x.w.rush * (now - later) + 0.15 * x.w.rush * now));
}

/** Crosses decide ties for the loyalist, so they are a risk to anyone who wants that role. */
const crossWorth = (x: Situation) => x.cross;

function attackValue(x: Situation, c: Choice): number {
  const { s, me, w } = x, cell = c.cell as number, card = c.card as string, pl = s.players[me];
  const st = util.settlementAt(s, cell);
  const kind = c.mode === 'bombard' ? 'best' : (c.token as 'ship' | 'infantry');
  const from = c.token === 'ship' || pl.inf === 'ship' ? pl.ship : (pl.inf as number);
  let a = 1 + cardStrength(s, card, kind, !!st, from) + (c.mode === 'landing' || c.mode === 'shore' ? -1 : 0);
  // One more supporter could be added from hand.
  const help = Math.max(0, ...pl.hand.filter((h) => h !== card).map((h) => 1 + cardStrength(s, h, kind, !!st, from)));
  if (st) return Math.max(conquestValue(x, st.n, a), conquestValue(x, st.n, a + help) - 0.7);
  a += help * 0.5;
  const col = util.colonyAt(s, cell), terrain = s.def.terrain[s.map.terrain[cell]!].defence;
  const t = col ? { p: col.owner, kind: 'colony' } : map.tokenAt(s, cell)!;
  const foe = s.players[t.p];
  const guard = terrain + Math.min(2, foe.hand.length * 0.5) * 1.3 + 0.8 + (col ? 1 + (util.has(foe, 'fort') ? 2 : util.has(foe, 'stockade') ? 1 : 0) : 0);
  const gap = a - guard, p = success(gap);
  if (p <= 0) return -0.5;
  if (col) return w.raid * (p * x.bell + Math.max(0, gap) * 0.33 * 0.9) - 0.6;
  if (t.kind === 'ship') return w.raid * p * (x.bell + cargoValue(x, foe.hold) + 1) - 0.4;
  return w.raid * p * (x.bell + 0.6) - 0.4;
}

// --- Moving ------------------------------------------------------------------------

interface Intent { goal: string | null }
const idOf = (g: Goal) => `${g.name}:${g.cell ?? (g.name === 'settle' || g.name === 'ruin' ? g.to : '')}`;

function scoreMove(x: Situation, intent: Intent): Considered[] {
  const { s, me, v } = x, m = s.move!, pl = s.players[me];
  const out: Considered[] = v.legal.map((choice) => ({ choice, score: choice.c === 'end' ? 0 : -1, why: 'move' }));
  const put = (f: (c: Choice) => boolean, score: number, why: string) => { for (const o of out) if (f(o.choice) && score > o.score) { o.score = score; o.why = why; } };
  const onLand = m.token === 'infantry' && typeof pl.inf === 'number';
  const start = onLand ? (pl.inf as number) : pl.ship;
  const paths = onLand ? landPaths(s, me, [start]) : shipPaths(s, start);
  let goals = onLand ? landGoals(x, start, paths) : shipGoals(x, start, paths);
  if (m.token === 'infantry' && pl.inf === 'ship') goals = goals.filter((g) => g.then === 'disembark' && g.dist <= 1);
  const here = (g: Goal) => worth(g, s.def.settings.move.points) * (idOf(g) === intent.goal ? 3 : 1);
  const main = goals.reduce<Goal | null>((b, g) => (!b || here(g) > here(b) ? g : b), null);
  // Arrived where the move was going: the next action happens there.
  if (intent.goal?.startsWith('to Europe') && map.inEurope(s, pl.ship)) { put((c) => c.c === 'end', 99, 'arrived'); return out; }
  if (main) intent.goal = idOf(main);
  for (const g of goals) {
    const score = here(g);
    if (score <= 0) continue;
    if (start === g.to) {
      if (g.then === 'explore') put((c) => c.c === 'explore', score, g.name);
      else if (g.then === 'disembark') put((c) => c.c === 'disembark' && c.cell === g.cell, score, g.name);
      else if (g.then === 'cargo') put((c) => c.c === 'cargo', score, g.name);
      else if (g.then === 'embark') put((c) => c.c === 'embark', score, g.name);
      // Already where the next action happens: stop here.
      else if (g.extra > 0 && m.points < s.def.settings.move.points) put((c) => c.c === 'end', score, g.name);
    } else {
      const step = firstStep(paths, g.to);
      put((c) => c.c === 'step' && c.cell === step, score, g.name);
    }
  }
  if (x.left <= 2 && m.points < s.def.settings.move.points && guarding(x, start)) put((c) => c.c === 'end', x.strength, 'guard');
  // Unload timber and food picked up at sea when passing home.
  const useful = (['timber', 'food'] as const).reduce((n, r) => n + pl.hold[r] * Math.max(0, x.res[r] - s.price[r] * x.gold * x.w.trade * 0.8), 0);
  if (useful > 0) put((c) => c.c === 'cargo', 0.2 + useful, 'unload');
  return out;
}

// --- Everything else -----------------------------------------------------------------

function scoreSmall(x: Situation, c: Choice): number {
  const { s, me, w, v } = x, d = s.pending!, pl = s.players[me];
  const price = (r: Resource) => s.price[r];
  switch (d.kind) {
    case 'startCell': { // away from other ships, near the middle of a side
      const cell = c.cell as number, wd = s.map.width, r = Math.floor(cell / wd), k = cell % wd, mid = (wd - 1) / 2;
      const near = Math.min(20, ...s.players.filter((p) => p.ship >= 0).map((p) => map.distance(s, p.ship, cell)));
      return near * 0.05 - Math.min(Math.abs(r - mid), Math.abs(k - mid)) * 0.05 + ((cell * 7919) % 13) * 0.004;
    }
    case 'cargo': {
      if (c.c === 'done') return 0;
      const r = c.r as Resource, n = c.n as number;
      if (c.c === 'unload') {
        if (r === 'timber' || r === 'food') return n * (x.res[r] - price(r) * x.gold * w.trade * 0.8);
        return r === 'crops' && util.has(pl, 'blacksmith_shop') ? n * 0.1 : -1;
      }
      const ship = shippable(x).slice(0, util.holdFree(s, me)).filter((q) => q === r).length;
      return n <= ship ? n * price(r) * x.gold : -1;
    }
    // From the warehouse (a custom house), each unit sold is a unit the colony no longer has.
    case 'trade': return c.c === 'done' ? 0 : (c.n as number) * ((price(c.r as Resource) * x.gold) - (d.from === 'wh' ? x.res[c.r as Resource] : ['timber', 'food'].includes(c.r as string) ? x.res[c.r as Resource] * 0.5 : 0)) + 0.01;
    case 'hire': {
      if (c.c === 'done') return 0;
      if (c.c === 'refresh') return -0.15;
      const off = util.mods(s, me, 'cost', d.card as string).reduce((n, m) => n + (m.of === 'hire' ? m.add : 0), 0);
      return hireValue(x, c.agent as string, Math.max(0, s.def.agents[c.agent as string].price! + off));
    }
    case 'propaganda': return c.c === 'done' ? 0 : fatherValue(x, c.father as string);
    case 'cheapestFather': return fatherValue(x, c.father as string);
    case 'recruit': return c.c === 'take' ? agentValue(x, c.card as string) : c.c === 'top' ? 0.1 : 0.15;
    case 'takeFromPier': return agentValue(x, c.agent as string);
    case 'takeNative': return c.c === 'yes' ? agentValue(x, 'indian') : 0.1;
    case 'commit': return commitValue(x, c);
    case 'plunder': return c.c === 'destroy' ? 0.6 + (s.players[d.from as number].bells >= pl.bells ? 0.3 : 0) : x.res[c.r as Resource] + 0.2;
    case 'lootHold': return c.c === 'take' ? price(c.r as Resource) * x.gold + 0.1 : c.c === 'sink' ? 0.05 : 0;
    case 'refuge': return c.c === 'cell' ? 0.2 : 0;
    case 'overflow': return -x.res[c.r as Resource] - price(c.r as Resource) * 0.01;
    case 'discardHand': return c.c === 'keep' ? 0 : 0.3 - agentValue(x, c.card as string);
    case 'discardCards': return -agentValue(x, c.card as string);
    case 'payResource': return -x.res[c.r as Resource] - price(c.r as Resource) * 0.01;
    case 'tax': {
      const set = s.def.settings.tax, rate = taxRate(s);
      const cubes = refuseCubes(s);
      // Gold spent is mercenaries not hired; cubes come down on all patriots.
      if (c.c === 'pay') return set.payBells * x.bell - rate * 0.1 - Math.max(0, warPoints(x) - warPoints(x, { gold: -rate })) * w.strength - (x.last ? 0 : rate * Math.max(0, x.gold - 0.1));
      return set.refuseBells * x.bell - cubes * x.ref;
    }
    case 'nodeChoice': {
      const o = (d.opts as ChoiceOption[]).find((q) => q.id === c.id)!, k = o.cost ?? {};
      return nodesValue(x, o.do) - (k.gold ?? 0) * x.gold - (k.bells ?? 0) * x.bell - (k.crosses ?? 0) * w.cross - (k.cards ?? 0) * 0.7 - (c.card ? 0.7 : 0) -
        (k.anyFood ?? 0) * 0.3 - (k.anyResource ?? 0) * 0.2 - (k.holdResource ?? 0) * 0.3 - (k.wholeHold ? RESOURCES.reduce((n, r) => n + pl.hold[r] * price(r), 0) * x.gold : 0);
    }
    case 'raid': return c.c === 'resources' ? -stockLoss(x, s.def.settings.raid.resources) : -buildingValue(x, c.b as string) - 0.2;
    case 'nearestSettlement': return 0;
    case 'guide': return nodesValue(x, s.def[d.deck === 'ruin' ? 'ruins' : 'wrecks'][c.card as string].do);
    case 'colonyWater': return 0;
    case 'freeBuilding': return c.c === 'build' ? buildingValue(x, c.b as string) : 0;
    // Hit the rival who leads.
    case 'damageShip': return 0.01 * scorePlayer(s, c.target as number).score;
    case 'cheapBuild': return c.c === 'build' ? buildingValue(x, c.b as string) - 0.8 : 0;
    case 'freeColony': return c.c === 'cell' ? siteValue(x, c.cell as number) : 0;
    case 'convertCrosses': return (c.n as number) * (x.bell - w.cross);
    case 'sellOff': {
      if (c.c === 'done') return 0;
      const n = c.n as number, node = d.node as { priceAdd: number; refPerUnit?: number; refPerSeller?: number };
      const p = Math.max(0, price(c.r as Resource) + node.priceAdd);
      const cubes = (node.refPerUnit ?? 0) * n + (d.any ? 0 : node.refPerSeller ?? 0);
      return n * (p * x.gold - x.res[c.r as Resource] * 0.7) - cubes * x.ref;
    }
    case 'mayTake': return c.c === 'yes' ? agentValue(x, d.agent as string) - (d.gold as number) * x.gold : 0;
    case 'payOrRef': return c.c === 'pay' ? -(d.gold as number) * x.gold : (d.bells as number) * x.bell - (d.ref as number) * x.ref;
    case 'sellAgents': {
      if (c.c === 'stop') return 0;
      const node = d.node as { gold: number; refEach: number };
      const avg = x.cards.reduce((n, k) => n + agentValue(x, k), 0) / x.cards.length;
      return node.gold * x.gold - avg * 0.9 - 0.1 - node.refEach * x.ref;
    }
    case 'joint': return (c.n as number) === 0 ? 0 : -(c.n as number) * (w.cross - 0.25 * x.ref * 0.5);
    case 'payPerBuilding': return -(c.n as number) * ((d.gold as number) * x.gold - (d.ref as number) * x.ref);
    case 'accuse': {
      const p = c.player as number;
      if (p === me) return v.collections[me].some((k) => s.def.agents[k].edu === 2) ? -2 : 5 * w.cross;
      return v.collections[p].some((k) => s.def.agents[k].edu === 2) ? 1 + scorePlayer(s, p).score * 0.02 : -0.5;
    }
    case 'loseLearned': return -agentValue(x, c.card as string);
    case 'payOrRemove': return c.c === 'pay' ? -(d.gold as number) * x.gold : -agentValue(x, d.card as string) - (d.ref as number) * x.ref;
    case 'sacredForest': return c.c === 'goods' ? -x.res.goods - 0.2 : c.c === 'gold' ? -(d.gold as number) * x.gold : -0.4;
    case 'boycott': {
      const n = pl.wh[d.res as Resource];
      return c.c === 'pay' ? -n * (d.gold as number) * x.gold : n * (x.bell - x.res.goods - (d.ref as number) * x.ref);
    }
    case 'blockade': return c.c === 'pay' ? -(d.gold as number) * x.gold : -1.2 - cargoValue(x, pl.hold) - (d.ref as number) * x.ref;
    default: return warValue(x, c);
  }
}
function stockLoss(x: Situation, n: number): number {
  const vals = RESOURCES.flatMap((r) => Array<number>(x.s.players[x.me].wh[r]).fill(x.res[r] + 0.05)).sort((a, b) => a - b);
  return vals.slice(0, n).reduce((a, b) => a + b, 0);
}

function commitValue(x: Situation, c: Choice): number {
  const { s, me, w } = x, d = s.pending!, b = s.combat!;
  if (c.c === 'done') return 0;
  const native = b.target === 'settlement';
  if (d.side === 'a') {
    const kind = b.bombard ? 'best' : b.token;
    const now = 1 + cardStrength(s, b.card, kind, native, b.from) + b.a.reduce((n, k) => n + 1 + cardStrength(s, k, kind, native, b.from), 0) + (b.mode === 'landing' || b.mode === 'shore' ? -1 : 0);
    const terrain = s.def.terrain[s.map.terrain[b.cell]!].defence;
    const foe = b.defender === null ? null : s.players[b.defender];
    const guard = terrain + (native ? util.settlementAt(s, b.cell)!.pop : 1 + Math.min(3, foe!.hand.length) * 0.5 + (b.target === 'colony' ? 1 + (util.has(foe!, 'fort') ? 2 : util.has(foe!, 'stockade') ? 1 : 0) : 0));
    const add = 1 + cardStrength(s, c.card as string, kind, native, b.from);
    const z = native ? util.settlementAt(s, b.cell)! : null;
    const loot = z && z.pop === 1 ? (s.def.tribes[z.tribe].loot.gold ?? 0) * x.gold : 0;
    const stake = native ? w.native * (x.bell + 0.5 + loot) : w.raid * (x.bell + 1.2);
    return (success(now + add - guard) - success(now - guard)) * stake - 0.75 - 0.2 * cardPower(s, c.card as string);
  }
  const kind = b.target === 'ship' ? 'ship' : 'infantry';
  const stake = b.target === 'colony' ? 1.6 + util.total(s.players[me].wh) * 0.2 : b.target === 'ship' ? 1.5 + cargoValue(x, s.players[me].hold) : 1.2;
  if (c.c === 'top') return 0.15;
  const add = 1 + cardStrength(s, c.card as string, kind, false, b.cell);
  const mine = b.d.reduce((n, k) => n + 1 + cardStrength(s, k, kind, false, b.cell), 0);
  return mine >= 4 ? -1 : stake * 0.22 * add - 0.7;
}

function warValue(x: Situation, c: Choice): number {
  const { s, me, v } = x, d = s.pending!, set = s.def.settings, war = s.war!;
  const hand = war.hands[me] ?? [];
  const goldCost = set.war.mercenaryGold / set.score.goldPerPoint, bellCost = set.score.perBell / set.score.bellsPerPoint;
  const perBell = util.mods(s, me, 'militiaPerBell').reduce((n, m) => Math.max(n, m.value), 1);
  switch (d.kind) {
    case 'militia': {
      const max = militiaMax(s, me), free = Math.min(max, util.mods(s, me, 'freeMilitia').reduce((n, m) => n + m.value, 0));
      const r = planDefence(v, hand, { freeCubes: free, perBell, maxMilitia: max - free, maxMercs: mercenaryMax(s, me), bellCost, goldCost });
      return -Math.abs((c.n as number) - Math.min(max, free + r.plan.units));
    }
    case 'mercenaries': {
      if (war.loyalist === me) {
        // Enough to beat the King's army at the cheapest patriot colony, if that is worth the gold.
        const mine = hand.reduce((n, k) => n + warStrength(s, k, 0), 0);
        const cheapest = Math.min(Infinity, ...war.sieges.filter((y) => y.owner !== me && y.cubes > 0).map((y) => siegeStrength(s, y).ref + 1));
        const want = cheapest - mine;
        return -Math.abs((c.n as number) - (want > 0 && want <= mercenaryMax(s, me) && want * goldCost < set.score.loyalistColony / 2 ? want : 0));
      }
      const r = planDefence(v, hand, { freeCubes: 0, perBell, maxMilitia: 0, maxMercs: mercenaryMax(s, me), bellCost, goldCost });
      return -Math.abs((c.n as number) - r.plan.mercs);
    }
    case 'deploy': return c.c === 'place' ? deployGain(v, c.card as string, c.siege as number) : 0;
    case 'betray': {
      if (c.c !== 'betray') return 0;
      const y = war.sieges[c.siege as number];
      return 1 + (y.stacks[me]?.length ?? 0) * 0.5 + y.cubes * 0.1;
    }
    default: return 0;
  }
}
