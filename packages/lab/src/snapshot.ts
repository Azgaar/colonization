/** Export one real position for the design prototypes. Usage: node packages/lab/src/snapshot.ts */
import { writeFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { goalBot, PERSONALITIES } from '@col/bots';
import { actionsFor, applyInPlace, buildingDefence, cellYield, createGame, map, scorePlayer, siegeStrength, taxRate, util, viewFor, workableCells, year, type State } from '@col/engine';

const def = loadRuleset(), nations = ['french', 'english', 'spanish', 'dutch'], me = 0;
const kinds = ['trader', 'balanced', 'explorer', 'missionary'] as const;
let best: { seed: string; score: number; at: State; end: State } | null = null;
for (let i = 0; i < 160; i++) {
  const seed = `show${i}`;
  const s = createGame({ def, seed, nations, logging: true });
  const bots = kinds.map((k, p) => goalBot(`${seed}${p}`, PERSONALITIES[k]));
  let at: State | null = null, score = -1;
  while (!s.over) {
    const p = s.pending!.player;
    if (p === me && s.pending!.kind === 'turn' && s.round >= 4 && s.round <= 6 && s.players[me].hand.length >= 4) {
      const pl = s.players[me], acts = new Set(pl.hand.flatMap((c) => actionsFor(s, me, c).filter((a) => a.options.length).map((a) => a.action)));
      const v = acts.size + s.colonies.filter((c) => c.owner === me).length * 4 + pl.buildings.length * 2 + pl.fathers.length * 3 + s.colonies.length + (typeof pl.inf === 'number' ? 3 : 0) + util.total(pl.hold) + (map.inEurope(s, pl.ship) ? -4 : 4) + new Set(pl.hand.map((c) => util.baseOf(s, c))).size + s.settlements.filter((x) => x.alive && x.ally !== null).length * 3;
      const unopened = s.revealed.filter((r) => !r).length;
      const total = v + (unopened >= 1 && unopened <= 5 ? 6 : 0);
      if (total > score) { score = total; at = structuredClone({ ...s, def: null, log: s.log }) as unknown as State; at.def = def; }
    }
    applyInPlace(s, bots[p].choose(viewFor(s, p)));
  }
  if (at && (!best || score > best.score)) best = { seed, score, at, end: s };
}
const { at: s, end, seed } = best!;
const pl = s.players[me];
const named = (m: Record<string, { ru: string; en: string }>) => Object.fromEntries(Object.entries(m).map(([k, x]) => [k, [x.en, x.ru]]));
const data = {
  seed, me, round: s.round, year: year(s), tax: taxRate(s), track: def.settings.tax.track, first: s.first,
  width: s.map.width, zone: s.map.zone, frag: s.map.frag,
  open: s.map.zone.map((_, c) => map.isOpen(s, c)),
  terrain: s.map.terrain.map((t, c) => (map.isOpen(s, c) ? t : null)), bonus: s.map.bonus.map((t, c) => (map.isOpen(s, c) ? t : null)), poi: s.poi,
  colonies: s.colonies.map((c) => ({ ...c, defence: def.settings.combat.colonyDefence + def.terrain[s.map.terrain[c.cell]!].defence + buildingDefence(s, c.owner).reduce((n, x) => n + x.value, 0) })),
  settlements: s.settlements.map((x) => ({ ...x, hostility: s.hostility[x.tribe], loot: def.tribes[x.tribe].loot, terrain: s.map.terrain[x.cell] })),
  players: s.players.map((p, i) => ({ ...p, hand: i === me ? p.hand : p.hand.length, deck: p.deck.length, discard: i === me ? p.discard : p.discard.length, score: scorePlayer(s, i).score, color: def.nations[p.nation].color, parts: scorePlayer(s, i).parts })),
  price: s.price, demand: s.demand, pier: s.pier.map((x) => [x[0], x.length]), salon: s.salon, ref: s.ref, left: s.buildingsLeft, cap: util.warehouseCap(s, me),
  actions: Object.fromEntries([...new Set(pl.hand)].map((c) => [c, actionsFor(s, me, c)])),
  yields: Object.fromEntries([...new Set(pl.hand)].map((c) => [c, workableCells(s, me).flatMap((cell) => (['corn', 'fish', 'timber', 'leaf', 'fur', 'silver'] as const).flatMap((icon) => { const y = cellYield(s, me, c, cell, icon); return y ? [{ cell, icon, n: y.total, parts: y.parts }] : []; }))])),
  agents: Object.fromEntries(Object.values(def.agents).map((a) => [a.id, { base: a.base, en: a.en, ru: a.ru, edu: a.edu, price: a.price, unique: a.unique, mods: a.mods }])),
  buildings: Object.fromEntries(Object.values(def.buildings).map((b) => [b.id, { en: b.en, ru: b.ru, timber: b.timber, edu: b.edu, requires: b.requires, improvement: b.improvement, work: b.work, storage: b.storage, defence: b.defence }])),
  fathers: Object.fromEntries(Object.values(def.fathers).map((f) => [f.id, { en: f.en, ru: f.ru, bells: f.bells }])),
  names: { nations: named(def.nations), tribes: named(def.tribes), terrain: named(def.terrain), tactics: named(def.tactics), events: named(def.events), resources: named(def.resources) },
  log: s.log.filter((e) => ['play', 'found', 'build', 'event', 'raid', 'reveal', 'father', 'hire', 'tax', 'poi', 'sell'].includes(e.e)).slice(-26),
  war: { loyalist: end.war!.loyalist, tactic: end.war!.tactic, pool: end.war!.pool, sieges: end.war!.sieges.map((x) => ({ ...x, ...siegeStrength(end, { ...x }) , dice: x.dice })), result: end.over, terrain: Object.fromEntries(end.war!.sieges.map((x) => [x.cell, end.map.terrain[x.cell]])) },
};
writeFileSync('prototypes/snapshot.js', `window.SNAPSHOT = ${JSON.stringify(data)};\n`);
console.log(seed, 'round', s.round, 'hand', pl.hand, 'buildings', pl.buildings, 'fathers', pl.fathers, 'colonies', s.colonies.length, 'hold', pl.hold, 'wh', pl.wh, 'inf', pl.inf, 'gold', pl.gold, 'bells', pl.bells, 'crosses', pl.crosses, 'closed', s.revealed.filter((r) => !r).length);
