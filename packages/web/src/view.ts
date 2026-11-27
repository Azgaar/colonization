/** What the interface shows, taken from a game state. The caller sees only what seat `me` may know. */
import { actionsFor, buildingDefence, buildPrice, buildingYield, cellYield, combatStrength, docksYields, findLoyalist, map, recruitCost, scorePlayer, sellPrice, siegeStrength, taxRate, util, workableCells, year, type State } from '@col/engine';
import type { GameDef, Icon, TerrainId } from '@col/data';

const ICONS: Icon[] = ['food', 'timber', 'crops', 'silver'];
/** A name in both languages: English first, Russian second. */
export type Pair = [string, string];
/** A record built from keys, keeping the value type (unlike Object.fromEntries). */
export const record = <V>(keys: Iterable<string>, f: (k: string) => V): Record<string, V> => { const o: Record<string, V> = {}; for (const k of keys) o[k] = f(k); return o; };
const named = (m: Record<string, { ru: string; en: string }>) => record(Object.keys(m), (k): Pair => [m[k].en, m[k].ru]);
/** In English a nation goes by its colony's name; Russian keeps the spreadsheet's. */
const COLONIAL: Record<string, string> = { french: 'New France', english: 'New England', dutch: 'New Netherland', spanish: 'New Spain', portuguese: 'Portuguese Brazil', swedish: 'New Sweden', danish: 'Danish West Indies', russian: 'Russian America', curonian: 'New Courland', scottish: 'New Caledonia' };
const flavor = (m: Record<string, { flavor?: string }>) => record(Object.keys(m).filter((k) => m[k].flavor), (k) => m[k].flavor!);

export function exportRules(def: GameDef) {
  return {
    track: def.settings.tax.track, settings: def.settings, tacticEffects: record(Object.keys(def.tactics), (id) => def.tactics[id].effect),
    terrainYields: record(Object.keys(def.terrain), (id) => def.terrain[id as TerrainId].yields),
    agents: record(Object.keys(def.agents), (id) => { const a = def.agents[id]; return { base: a.base, en: a.en, ru: a.ru, edu: a.edu, price: a.price, unique: a.unique, mods: a.mods }; }),
    buildings: record(Object.keys(def.buildings), (id) => { const b = def.buildings[id]; return { en: b.en, ru: b.ru, timber: b.timber, edu: b.edu, requires: b.requires, improvement: b.improvement, work: b.work, storage: b.storage, defence: b.defence }; }),
    fathers: record(Object.keys(def.fathers), (id) => { const f = def.fathers[id]; return { en: f.en, ru: f.ru, bells: f.bells }; }),
    /** Each nation: how hard it is (stars), its starting agents, its colour. */
    nations: record(Object.keys(def.nations), (id) => { const n = def.nations[id]; return { stars: n.stars, deck: n.deck, color: n.color }; }),
    names: { nations: record(Object.keys(def.nations), (k): Pair => [COLONIAL[k] ?? def.nations[k].en, def.nations[k].ru]), tribes: named(def.tribes), terrain: named(def.terrain), tactics: named(def.tactics), events: named(def.events), resources: named(def.resources), ruins: named(def.ruins), wrecks: named(def.wrecks) },
    flavor: { father: flavor(def.fathers), event: flavor(def.events), ruin: flavor(def.ruins), wreck: flavor(def.wrecks) },
  };
}
/** Agents in name order, in the language shown: the order they were drawn in would tell what comes next. */
function byName(def: GameDef, cards: string[]) {
  const ru = typeof document !== 'undefined' && document.documentElement.lang === 'ru', name = (c: string) => (ru ? def.agents[c].ru : def.agents[c].en);
  return cards.slice().sort((a, b) => name(a).localeCompare(name(b), ru ? 'ru' : 'en') || a.localeCompare(b));
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
    colonies: s.colonies.map((c) => {
      // Defence as a sum of its sources: the colony itself, its terrain, the owner's defensive buildings.
      const parts = [{ label: 'colony', value: def.settings.combat.colonyDefence }, { label: s.map.terrain[c.cell]!, value: def.terrain[s.map.terrain[c.cell]!].defence }, ...buildingDefence(s, c.owner)].filter((x) => x.value);
      return { ...c, defence: parts.reduce((n, x) => n + x.value, 0), parts };
    }),
    settlements: s.settlements.map((x) => ({ ...x, hostility: s.hostility[x.tribe], loot: def.tribes[x.tribe].loot, terrain: s.map.terrain[x.cell] })),
    players: s.players.map((p, i) => ({
      ...structuredClone(p), hand: i === me ? byName(def, p.hand) : p.hand.length, deck: i === me ? byName(def, p.deck) : p.deck.length, discard: p.discard.slice(),
      agents: util.collection(p).length, score: scorePlayer(s, i).score, parts: scorePlayer(s, i).parts, color: def.nations[p.nation].color,
    })),
    price: { ...s.price }, demand: { ...s.demand }, pier: s.pier.map((x) => [x[0], x.length] as [string, number]), salon: s.salon.slice(), ref: s.ref, left: { ...s.buildingsLeft }, cap: util.warehouseCap(s, me), loyal: findLoyalist(s),
    recruit: recruitCost(s), agentsLeft: s.agentDeck.length + s.agentDiscard.length, event: s.event,
    actions: record(mine ? cards : [], (c) => actionsFor(s, me, c)),
    build: record(mine ? ['', ...cards] : [], (c) => record(Object.keys(def.buildings), (b) => buildPrice(s, me, c || null, b))),
    sell: record(mine ? cards : [], (c) => record(Object.keys(s.price), (r) => sellPrice(s, me, c, r as keyof typeof s.price))),
    works: record(cards, (c) => record(pl.buildings.filter((b) => def.buildings[b].work?.kind === 'produce'), (b) => { const y = buildingYield(s, me, c, b); return typeof y === 'string' ? y : y.total; })),
    docks: record(cards, (c) => docksYields(s, me, c).map((y) => ({ cell: y.cell, n: y.total })).sort((a, b) => b.n - a.n)),
    yields: record(cards, yields), land: yields(plain),
    move: s.move, combat: s.combat ? { ...s.combat, strength: combatStrength(s, s.combat) } : null,
    war: s.war ? { loyalist: s.war.loyalist, tactic: s.war.tactic, pool: s.war.pool, result: s.over, sieges: s.war.sieges.map((x) => ({ ...x, ...siegeStrength(s, x), dice: x.dice })) } : null,
    log: s.log.slice(-60), over: s.over,
  };
}
export type Rules = ReturnType<typeof exportRules>;
export type Snapshot = ReturnType<typeof exportState>;
/** Everything the interface reads about the game: fixed rules and the moment's state. */
export type GameView = Rules & Snapshot;
export type PlayerView = Snapshot['players'][number];
