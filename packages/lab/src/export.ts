/** What the interface prototype shows, taken from a game state. The caller sees only what seat `me` may know. */
import { actionsFor, buildingDefence, buildPrice, buildingYield, cellYield, combatStrength, docksYields, findLoyalist, map, recruitCost, scorePlayer, sellPrice, siegeStrength, taxRate, util, workableCells, year, type State } from '@col/engine';
import type { GameDef, Icon } from '@col/data';

const ICONS: Icon[] = ['corn', 'fish', 'timber', 'leaf', 'fur', 'silver'];
const named = (m: Record<string, { ru: string; en: string }>) => Object.fromEntries(Object.entries(m).map(([k, x]) => [k, [x.en, x.ru]]));

const flavor = (m: Record<string, { flavor?: string }>) => Object.fromEntries(Object.entries(m).flatMap(([k, x]) => (x.flavor ? [[k, x.flavor]] : [])));

export function exportRules(def: GameDef) {
  return {
    track: def.settings.tax.track, settings: def.settings,
    agents: Object.fromEntries(Object.values(def.agents).map((a) => [a.id, { base: a.base, en: a.en, ru: a.ru, edu: a.edu, price: a.price, unique: a.unique, mods: a.mods }])),
    buildings: Object.fromEntries(Object.values(def.buildings).map((b) => [b.id, { en: b.en, ru: b.ru, timber: b.timber, edu: b.edu, requires: b.requires, improvement: b.improvement, work: b.work, storage: b.storage, defence: b.defence }])),
    fathers: Object.fromEntries(Object.values(def.fathers).map((f) => [f.id, { en: f.en, ru: f.ru, bells: f.bells }])),
    names: { nations: named(def.nations), tribes: named(def.tribes), terrain: named(def.terrain), tactics: named(def.tactics), events: named(def.events), resources: named(def.resources), ruins: named(def.ruins), wrecks: named(def.wrecks) },
    flavor: { father: flavor(def.fathers), event: flavor(def.events), ruin: flavor(def.ruins), wreck: flavor(def.wrecks) },
  };
}
export function exportState(s: State, me: number) {
  const def = s.def, pl = s.players[me], cards = [...new Set(pl.hand)], mine = s.pending?.player === me && s.pending.kind === 'turn';
  const open = (c: number) => map.isOpen(s, c), fleet = workableCells(s, me);
  const yields = (card: string) => fleet.flatMap((cell) => ICONS.flatMap((icon) => { const y = cellYield(s, me, card, cell, icon); return y ? [{ cell, icon, n: y.total, parts: y.parts }] : []; }));
  // An agent without any talent, for what the land gives by itself.
  const plain = Object.values(def.agents).find((a) => a.base === 'colonist')!.id;
  return {
    me, round: s.round, year: year(s), tax: taxRate(s), first: s.first, current: s.current, turnOf: s.pending?.player ?? null, pending: s.pending?.player === me ? s.pending : null,
    width: s.map.width, zone: s.map.zone, frag: s.map.frag, revealed: s.revealed.slice(),
    open: s.map.zone.map((_, c) => open(c)), terrain: s.map.terrain.map((t, c) => (open(c) ? t : null)), bonus: s.map.bonus.map((t, c) => (open(c) ? t : null)), poi: { ...s.poi },
    colonies: s.colonies.map((c) => ({ ...c, defence: def.settings.combat.colonyDefence + def.terrain[s.map.terrain[c.cell]!].defence + buildingDefence(s, c.owner).reduce((n, x) => n + x.value, 0) })),
    settlements: s.settlements.map((x) => ({ ...x, hostility: s.hostility[x.tribe], loot: def.tribes[x.tribe].loot, terrain: s.map.terrain[x.cell] })),
    players: s.players.map((p, i) => ({
      ...structuredClone(p), hand: i === me ? p.hand.slice() : p.hand.length, deck: i === me ? p.deck.slice().sort() : p.deck.length, discard: p.discard.slice(),
      agents: util.collection(p).length, score: scorePlayer(s, i).score, parts: scorePlayer(s, i).parts, color: def.nations[p.nation].color,
    })),
    price: { ...s.price }, demand: { ...s.demand }, pier: s.pier.map((x) => [x[0], x.length] as [string, number]), salon: s.salon.slice(), ref: s.ref, left: { ...s.buildingsLeft }, cap: util.warehouseCap(s, me), loyal: findLoyalist(s),
    recruit: recruitCost(s), event: s.event,
    actions: mine ? Object.fromEntries(cards.map((c) => [c, actionsFor(s, me, c)])) : {},
    build: mine ? Object.fromEntries([null, ...cards].map((c) => [c ?? '', Object.fromEntries(Object.keys(def.buildings).map((b) => [b, buildPrice(s, me, c, b)]))])) : {},
    sell: mine ? Object.fromEntries(cards.map((c) => [c, Object.fromEntries(Object.keys(s.price).map((r) => [r, sellPrice(s, me, c, r as keyof typeof s.price)]))])) : {},
    works: Object.fromEntries(cards.map((c) => [c, Object.fromEntries(pl.buildings.filter((b) => def.buildings[b].work?.kind === 'produce').map((b) => { const y = buildingYield(s, me, c, b); return [b, typeof y === 'string' ? y : y.total]; }))])),
    docks: Object.fromEntries(cards.map((c) => [c, docksYields(s, me, c).map((y) => ({ cell: y.cell, n: y.total })).sort((a, b) => b.n - a.n)])),
    yields: Object.fromEntries(cards.map((c) => [c, yields(c)])), land: yields(plain),
    move: s.move, combat: s.combat ? { ...s.combat, strength: combatStrength(s, s.combat) } : null,
    war: s.war ? { loyalist: s.war.loyalist, tactic: s.war.tactic, pool: s.war.pool, result: s.over, sieges: s.war.sieges.map((x) => ({ ...x, ...siegeStrength(s, x), dice: x.dice })) } : null,
    log: s.log.slice(-60), over: s.over,
  };
}
