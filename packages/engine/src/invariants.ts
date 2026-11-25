import { RESOURCES } from '@col/data';
import type { State } from './types.ts';
import { collection, coloniesOf, holdUsed, total } from './util.ts';
import { distance } from './map.ts';
import { fatherLimit } from './turn.ts';

/** Things that must hold at every decision. Returns the problems found. */
export function problems(s: State): string[] {
  const out: string[] = [];
  const bad = (m: string) => out.push(m);
  const set = s.def.settings;

  // Cards are conserved.
  const seen: Record<string, number> = {};
  const add = (a: string[]) => { for (const c of a) seen[c] = (seen[c] ?? 0) + 1; };
  add(s.agentDeck); add(s.agentDiscard); s.pier.forEach(add);
  s.players.forEach((p) => add(collection(p)));
  if (s.combat) { add(s.combat.a); add(s.combat.d); if (s.combat.top) add([s.combat.top]); }
  if (s.pending?.kind === 'recruit') add(s.pending.cards as string[]);
  for (const a of Object.values(s.def.agents)) {
    const n = (seen[a.id] ?? 0) + (a.kind === 'native' ? s.nativesLeft : 0);
    if (a.kind === 'nation' ? n > a.copies : n !== a.copies) bad(`agent ${a.id}: ${n} of ${a.copies}`);
  }
  for (const b of Object.values(s.def.buildings)) {
    const n = s.buildingsLeft[b.id] + s.players.filter((p) => p.buildings.includes(b.id)).length;
    if (n !== b.copies) bad(`building ${b.id}: ${n} of ${b.copies}`);
  }
  const fathers = [...s.fatherDeck, ...s.fatherDiscard, ...s.salon, ...s.players.flatMap((p) => p.fathers)];
  if (new Set(fathers).size !== fathers.length || fathers.length !== Object.keys(s.def.fathers).length) bad(`fathers: ${fathers.length}`);

  const cells: number[] = [];
  s.players.forEach((p, i) => {
    for (const k of ['gold', 'bells', 'crosses', 'damage'] as const) if (!(p[k] >= 0) || !Number.isInteger(p[k])) bad(`player ${i} ${k} = ${p[k]}`);
    for (const r of RESOURCES) if (!(p.wh[r] >= 0) || !(p.hold[r] >= 0)) bad(`player ${i} ${r}: ${p.wh[r]} / ${p.hold[r]}`);
    if (p.crosses > set.crosses.max) bad(`player ${i} crosses ${p.crosses}`);
    if (p.damage > set.hold.maxDamage) bad(`player ${i} damage ${p.damage}`);
    if (p.buildings.length > set.buildings.max || new Set(p.buildings).size !== p.buildings.length) bad(`player ${i} buildings ${p.buildings}`);
    for (const b of p.buildings) { const q = s.def.buildings[b].requires; if (q && !p.buildings.includes(q)) bad(`player ${i} has ${b} without ${q}`); }
    if (p.fathers.length > fatherLimit(s, i)) bad(`player ${i} fathers ${p.fathers.length}`);
    if (coloniesOf(s, i).length > set.colony.max) bad(`player ${i} colonies`);
    if (collection(p).length + (s.combat ? (s.combat.attacker === i ? s.combat.a.length : s.combat.defender === i ? s.combat.d.length + (s.combat.top ? 1 : 0) : 0) : 0) < Math.min(set.collection.min, s.def.nations[p.nation].deck.length)) bad(`player ${i} has too few agents`);
    if (p.ship >= 0) {
      cells.push(p.ship);
      if (s.map.terrain[p.ship] !== 'ocean') bad(`player ${i} ship on land`);
      if (s.pending?.kind === 'turn' && holdUsed(p) > set.hold.size && total(p.hold) > 0) bad(`player ${i} hold overfull`);
    }
    if (typeof p.inf === 'number') {
      cells.push(p.inf);
      if (s.map.terrain[p.inf] === 'ocean' || s.map.zone[p.inf] !== 'map') bad(`player ${i} infantry at sea`);
    }
  });
  if (new Set(cells).size !== cells.length) bad('two tokens on one cell');
  for (const c of s.colonies) {
    for (const d of s.colonies) if (c !== d && distance(s, c.cell, d.cell) <= 1) bad('colonies touch');
    if (s.settlements.some((x) => x.alive && x.cell === c.cell)) bad('colony on a settlement');
  }
  if (s.settlements.length > set.natives.maxSettlements) bad('too many settlements');
  for (const [t, h] of Object.entries(s.hostility)) if (h < 0 || h > set.natives.maxHostility) bad(`hostility ${t} = ${h}`);
  for (const r of RESOURCES) {
    if (s.price[r] < 0 || s.price[r] > set.market.maxPrice) bad(`price ${r} = ${s.price[r]}`);
    if (s.demand[r] < 0 || s.demand[r] >= s.players.length) bad(`demand ${r} = ${s.demand[r]}`);
  }
  if (s.ref < 0) bad('negative REF');
  return out;
}
