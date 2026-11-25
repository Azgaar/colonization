import { describe, expect, it } from 'vitest';
import { attackOptions, buildingDefence, buildingYield, cardStrength, cellYield, combatStrength, legal, scorePlayer, siegeStrength } from '../src/index.ts';
import type { State } from '../src/index.ts';
import { push, run } from '../src/core.ts';
import { act, at, build, can, canPlay, colony, def, event, father, game, opt, P, play, poi, rig, runTasks, settle, stock, total, turn, world } from './h.ts';

/** One colony with every kind of land around it. */
function home(n = 1): State {
  const s = game(n);
  world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'forest', [at(6, 5)]: 'mountains', [at(6, 6)]: 'tundra', [at(4, 5)]: 'desert' });
  colony(s, 0, at(5, 5));
  return s;
}
const yields = (s: State, card: string, cell: number, icon: Parameters<typeof cellYield>[4]) => cellYield(s, 0, card, cell, icon)?.total ?? 0;
const work = (s: State, card: string, b: string) => { const y = buildingYield(s, 0, card, b); return typeof y === 'string' ? y : y.total; };
const points = (card: string, a: 'moveShip' | 'moveInfantry') => {
  const s = home();
  P(s).inf = at(5, 5);
  turn(s, 0, card, card);
  play(s, card, a);
  return s.move!.points;
};
const strength = (card: string, kind: 'infantry' | 'ship', native = false, cell = at(5, 5)) => cardStrength(home(), card, kind, native, cell);

/** One test per card. The last test checks that none is missing. */
const agents: Record<string, () => void> = {
  criminal: () => { const s = home(); turn(s, 0, 'criminal', 'colonist'); expect(yields(s, 'criminal', at(5, 5), 'corn')).toBe(1); expect(canPlay(s, 'criminal', 'moveShip')).toBe(false); },
  slave: () => { const s = home(); build(s, 0, 'docks'); expect(yields(s, 'slave', at(5, 5), 'leaf')).toBe(2); turn(s, 0, 'slave', 'slave'); play(s, 'slave', 'docks'); expect(P(s).wh.food).toBe(3); },
  colonist: () => { const s = home(); expect(yields(s, 'colonist', at(5, 5), 'corn')).toBe(1); },
  fisherman: () => { const s = home(); expect(yields(s, 'fisherman', at(4, 4), 'fish')).toBe(2); expect(yields(s, 'fisherman', at(5, 5), 'corn')).toBe(1); },
  farmer: () => { const s = home(); expect(yields(s, 'farmer', at(5, 5), 'corn')).toBe(2); expect(yields(s, 'farmer', at(4, 4), 'fish')).toBe(1); },
  lumberjack: () => expect(yields(home(), 'lumberjack', at(5, 6), 'timber')).toBe(2),
  miner: () => expect(yields(home(), 'miner', at(6, 5), 'silver')).toBe(2),
  scout: () => { expect(points('scout', 'moveInfantry')).toBe(7); expect(points('scout', 'moveShip')).toBe(5); },
  sailor: () => { expect(points('sailor', 'moveShip')).toBe(7); expect(points('sailor', 'moveInfantry')).toBe(5); },
  builder: () => { const s = home(); turn(s, 0, 'builder', 'builder'); P(s).wh = stock({ timber: 1 }); play(s, 'builder', 'build', { building: 'chapel' }); expect(P(s).wh.timber).toBe(0); },
  preacher: () => { const s = home(); build(s, 0, 'chapel'); expect(work(s, 'preacher', 'chapel')).toBe(2); },
  recruiter: () => { const s = home(); s.pier[0] = ['soldier']; s.pier = s.pier.slice(0, 1); P(s).gold = 5; turn(s, 0, 'recruiter', 'recruiter'); play(s, 'recruiter', 'hire'); act(s, { c: 'buy', agent: 'soldier' }); expect(P(s).gold).toBe(0); },
  priest: () => { const s = home(); build(s, 0, 'chapel', 'church'); expect(work(s, 'priest', 'church')).toBe(5); },
  craftsman: () => { const s = home(); build(s, 0, 'blacksmith_shop'); P(s).wh = stock({ crops: 1 }); expect(work(s, 'craftsman', 'blacksmith_shop')).toBe(2); },
  trader: () => { const s = home(); P(s).hold = stock({ crops: 2 }); turn(s, 0, 'trader', 'trader'); play(s, 'trader', 'trade'); act(s, { c: 'sell', r: 'crops', n: 2 }); expect(P(s).gold).toBe(8); },
  smuggler: () => { const s = home(); P(s).wh = stock({ crops: 1 }); turn(s, 0, 'smuggler', 'smuggler'); play(s, 'smuggler', 'smuggle'); expect(P(s).gold).toBe(2); },
  corsair: () => expect([strength('corsair', 'ship'), strength('corsair', 'infantry')]).toEqual([2, 0]),
  cannoneer: () => { expect([strength('cannoneer', 'ship'), strength('cannoneer', 'infantry')]).toEqual([1, 0]); const s = home(); settle(s, 'sioux', at(9, 9)); P(s).ship = at(8, 8); expect(attackOptions(s, 0, 'cannoneer').map((o) => o.mode)).toEqual(['bombard']); },
  soldier: () => expect([strength('soldier', 'infantry'), strength('soldier', 'ship')]).toEqual([2, 0]),
  dragoon: () => expect([strength('dragoon', 'infantry'), strength('dragoon', 'ship')]).toEqual([3, 0]),
  captain: () => expect([strength('captain', 'infantry'), strength('captain', 'ship')]).toEqual([3, 3]),
  politician: () => { const s = home(); build(s, 0, 'town_hall'); expect(work(s, 'politician', 'town_hall')).toBe(2); },
  trapper: () => expect([yields(home(), 'trapper_french', at(5, 6), 'fur'), yields(home(), 'trapper_french', at(6, 6), 'fur')]).toEqual([2, 0]),
  negotiant: () => { const s = home(); P(s).hold = stock({ goods: 1 }); turn(s, 0, 'negotiant_dutch', 'sailor'); play(s, 'negotiant_dutch', 'trade'); act(s, { c: 'sell' }); expect(P(s).gold).toBe(6); },
  puritan: () => { const s = home(); build(s, 0, 'chapel'); expect(work(s, 'puritan_english', 'chapel')).toBe(3); },
  navigator: () => expect(points('navigator_portuguese', 'moveShip')).toBe(9),
  conquistador: () => expect([strength('conquistador_spanish', 'infantry'), strength('conquistador_spanish', 'infantry', true)]).toEqual([2, 4]),
  settler: () => { const s = home(); turn(s, 0, 'settler_swedish', 'sailor'); P(s).wh = stock({ timber: 2 }); build(s, 0, 'docks'); play(s, 'settler_swedish', 'build', { building: 'shipyard' }); expect(P(s).wh.timber).toBe(1); },
  planter: () => { const s = game(1); world(s, { [at(5, 5)]: 'grassland' }); colony(s, 0, at(5, 5)); expect(yields(s, 'planter_danish', at(5, 5), 'leaf')).toBe(2); },
  cossack: () => { expect(strength('cossack_russian', 'infantry')).toBe(2); expect(yields(home(), 'cossack_russian', at(6, 6), 'fur')).toBe(2); },
  adventurer: () => { const s = home(); s.pier = [['soldier']]; P(s).gold = 4; turn(s, 0, 'adventurer_curonian', 'sailor'); play(s, 'adventurer_curonian', 'hire'); act(s, { c: 'buy', agent: 'soldier' }); expect(P(s).gold).toBe(0); },
  highlander: () => expect([strength('highlander_scottish', 'infantry'), strength('highlander_scottish', 'infantry', false, at(6, 5))]).toEqual([1, 3]),
  indian: () => { const s = home(); expect(yields(s, 'indian', at(5, 5), 'leaf')).toBe(2); turn(s, 0, 'indian', 'sailor'); expect(canPlay(s, 'indian', 'moveShip')).toBe(true); },
};

const buildings: Record<string, () => void> = {
  warehouse: () => { const s = home(); build(s, 0, 'warehouse'); P(s).wh = stock({ food: 12 }); runTasks(s, { t: 'overflow', p: 0, from: 'wh' }); expect(P(s).wh.food).toBe(12); },
  docks: () => { const s = home(); build(s, 0, 'docks'); turn(s, 0, 'colonist', 'sailor'); play(s, 'colonist', 'docks'); expect(P(s).wh.food).toBe(2); },
  blacksmith_shop: () => { const s = home(); build(s, 0, 'blacksmith_shop'); expect(work(s, 'colonist', 'blacksmith_shop')).toMatch(/needs 1 crops/); P(s).wh.crops = 1; expect(work(s, 'colonist', 'blacksmith_shop')).toBe(1); expect(work(s, 'slave', 'blacksmith_shop')).toMatch(/education/); },
  town_hall: () => { const s = home(); build(s, 0, 'town_hall'); expect(work(s, 'colonist', 'town_hall')).toBe(1); },
  chapel: () => { const s = home(); build(s, 0, 'chapel'); expect(work(s, 'colonist', 'chapel')).toBe(1); },
  stockade: () => { const s = home(); build(s, 0, 'stockade'); expect(buildingDefence(s, 0)).toEqual([{ label: 'stockade', value: 1 }]); },
  school: () => { const s = home(); build(s, 0, 'school'); turn(s, 0, 'farmer', 'criminal'); expect(canPlay(s, 'farmer', 'teach', { target: 'criminal' })).toBe(true); },
  custom_house: () => { const s = home(); build(s, 0, 'warehouse', 'custom_house'); P(s).wh.silver = 1; turn(s, 0, 'priest', 'sailor'); play(s, 'priest', 'customs'); expect(P(s).gold).toBe(5); },
  shipyard: () => { const s = home(); build(s, 0, 'docks', 'shipyard'); P(s).damage = 3; P(s).ship = at(4, 4); turn(s, 0, 'criminal', 'indian', 'colonist'); expect(canPlay(s, 'indian', 'shipyard')).toBe(false); play(s, 'colonist', 'shipyard'); expect(P(s).damage).toBe(0); },
  factory: () => { const s = home(); build(s, 0, 'blacksmith_shop', 'factory'); P(s).wh.crops = 1; expect(work(s, 'colonist', 'factory')).toBe(2); },
  newspaper: () => { const s = home(); build(s, 0, 'town_hall', 'newspaper'); expect(work(s, 'priest', 'newspaper')).toBe(3); expect(work(s, 'colonist', 'newspaper')).toMatch(/education/); },
  church: () => { const s = home(); build(s, 0, 'chapel', 'church'); expect(work(s, 'politician', 'church')).toBe(3); },
  fort: () => { const s = home(); build(s, 0, 'stockade', 'fort'); expect(buildingDefence(s, 0)).toEqual([{ label: 'fort', value: 2 }]); },
  university: () => { const s = home(); build(s, 0, 'school', 'university'); s.agentDeck.push('politician'); turn(s, 0, 'politician', 'criminal'); expect(canPlay(s, 'politician', 'teach')).toBe(true); },
};

const take = (s: State, f: string) => {
  for (const z of [s.salon, s.fatherDeck]) { const i = z.indexOf(f); if (i >= 0) z.splice(i, 1); }
  s.salon[0] = f;
  P(s).bells = s.def.fathers[f].bells;
  turn(s, 0, 'colonist', 'sailor');
  play(s, 'colonist', 'propaganda');
  act(s, { c: 'take', father: f });
  return s;
};
const reveal = (f: string) => { const s = game(1); world(s, { [at(5, 5)]: 'grassland' }); s.revealed[5] = false; father(s, 0, f); P(s).ship = at(4, 5); turn(s, 0, 'colonist', 'sailor'); return s; };
const fathers: Record<string, () => void> = {
  christopher_columbus: () => { for (const [land, n] of [[true, 1], [false, 0]] as const) { const s = reveal('christopher_columbus'); if (!land) s.map.terrain[at(5, 5)] = 'ocean'; P(s).ship = at(5, 4); play(s, 'colonist', 'moveShip'); act(s, { c: 'explore', frag: 5 }); expect(P(s).hold.crops).toBe(n); } },
  jakob_fugger: () => { const s = home(); father(s, 0, 'jakob_fugger'); P(s).gold = 14; expect(scorePlayer(s, 0).parts).toContainEqual({ label: 'gold', value: 2 }); },
  pedro_cabral: () => { const s = home(); father(s, 0, 'pedro_cabral'); turn(s, 0, 'sailor', 'colonist'); play(s, 'sailor', 'moveShip'); expect(s.move!.points).toBe(9); },
  ponce_de_leon: () => { const s = take(home(), 'ponce_de_leon'); const a = s.pier[0][0], n = P(s).discard.length; act(s, { c: 'take', agent: a }); act(s, { c: 'take' }); expect(P(s).discard.length).toBeGreaterThanOrEqual(n + 2); expect(P(s).discard).toContain(a); },
  francisco_pizarro: () => { const s = home(); father(s, 0, 'francisco_pizarro'); s.map.terrain[at(9, 9)] = s.map.terrain[at(9, 8)] = 'grassland'; settle(s, 'aztec', at(9, 9), { pop: 1 }); P(s).inf = at(9, 8); turn(s, 0, 'dragoon', 'sailor'); play(s, 'dragoon', 'attack'); rig(s, 4, 4, 4); act(s, { c: 'done' }, { c: 'no' }); expect(P(s).gold).toBe(40); },
  bartolome_de_las_casas: () => { const s = home(); father(s, 0, 'bartolome_de_las_casas'); s.map.terrain[at(9, 9)] = 'grassland'; settle(s, 'aztec', at(9, 9), { hostility: 5 }); P(s).ship = at(8, 8); turn(s, 0, 'cannoneer', 'colonist'); expect(canPlay(s, 'cannoneer', 'attack')).toBe(false); play(s, 'colonist', 'preach'); expect(P(s).discard).toContain('indian'); },
  hernan_cortes: () => { const s = home(); father(s, 0, 'hernan_cortes'); settle(s, 'aztec', at(9, 9)); const c = (target: string) => combatStrength(s, { attacker: 0, defender: 0, token: 'infantry', mode: 'land', target, from: at(5, 5), cell: at(9, 9), bombard: false, card: 'soldier', a: [], d: [], top: null } as never).attack.total; expect([c('settlement'), c('infantry')]).toEqual([5, 3]); },
  juan_de_sepulveda: () => { const s = take(home(), 'juan_de_sepulveda'); expect(P(s).discard.filter((c) => c === 'slave').length + s.pier.flat().filter((c) => c === 'slave').length).toBe(2); },
  francisco_de_orellana: () => { const s = reveal('francisco_de_orellana'); play(s, 'colonist', 'moveShip'); P(s).ship = at(5, 4); act(s, { c: 'explore', frag: 5 }); expect(P(s).gold).toBe(2); },
  francis_drake: () => { const s = home(2); father(s, 0, 'francis_drake'); const c = (attacker: number, token: string) => combatStrength(s, { attacker, defender: 1 - attacker, token, mode: 'naval', target: 'ship', from: at(9, 9), cell: at(9, 8), bombard: false, card: 'captain', a: [], d: [], top: null } as never); expect(c(0, 'ship').attack.total).toBe(6); expect(c(0, 'infantry').attack.total).toBe(4); expect(c(1, 'ship').defence.total).toBe(0); },
  walter_raleigh: () => { const s = take(home(), 'walter_raleigh'); const a = s.pier[0][0]; act(s, { c: 'take', agent: a }); if (s.pending!.kind === 'propaganda') act(s, { c: 'done' }); expect(P(s).hand).toContain(a); },
  henry_hudson: () => { const s = home(); s.agentDeck.push('captain'); take(s, 'henry_hudson'); expect(P(s).discard).toContain('captain'); },
  samuel_de_champlain: () => { const s = home(); s.map.terrain[at(9, 9)] = 'grassland'; take(s, 'samuel_de_champlain'); expect(can(s, { c: 'cell', cell: at(5, 6) })).toBe(false); act(s, { c: 'cell', cell: at(9, 9) }); expect(s.colonies.length).toBe(2); },
  john_smith: () => { const s = home(); father(s, 0, 'john_smith'); s.map.terrain[at(9, 9)] = 'grassland'; settle(s, 'aztec', at(9, 9), { hostility: 3 }); P(s).ship = at(8, 8); turn(s, 0, 'scout', 'sailor'); expect(canPlay(s, 'scout', 'alliance')).toBe(true); },
  squanto: () => { const s = home(); father(s, 0, 'squanto'); expect([yields(s, 'colonist', at(5, 5), 'corn'), yields(s, 'colonist', at(4, 4), 'fish')]).toEqual([2, 1]); },
  john_rolfe: () => { const s = home(); father(s, 0, 'john_rolfe'); expect([yields(s, 'colonist', at(5, 5), 'leaf'), yields(s, 'colonist', at(5, 6), 'fur')]).toEqual([2, 1]); },
  thomas_hooker: () => { const s = home(); father(s, 0, 'thomas_hooker'); build(s, 0, 'chapel'); expect(work(s, 'colonist', 'chapel')).toBe(2); },
  peter_minuit: () => { const s = home(); father(s, 0, 'peter_minuit'); settle(s, 'aztec', at(9, 9), { ally: 0, hostility: 0 }); expect(scorePlayer(s, 0).parts).toContainEqual({ label: 'alliances', value: 1 }); },
  william_bradford: () => { const s = home(); P(s).crosses = 9; take(s, 'william_bradford'); expect(legal(s).length).toBe(6); act(s, { c: 'convert', n: 5 }); expect([P(s).crosses, P(s).bells]).toEqual([4, 5]); },
  pocahontas: () => { const s = home(); father(s, 0, 'pocahontas'); s.map.terrain[at(9, 9)] = 'grassland'; settle(s, 'aztec', at(9, 9), { hostility: 2 }); P(s).ship = at(8, 8); P(s).crosses = 1; turn(s, 0, 'scout', 'colonist'); expect([canPlay(s, 'scout', 'alliance'), canPlay(s, 'colonist', 'preach')]).toEqual([true, true]); },
  roger_williams: () => { const s = home(); father(s, 0, 'roger_williams'); P(s).crosses = 1; s.agentDeck.push('farmer', 'miner', 'scout'); const n = s.agentDeck.length; turn(s, 0, 'colonist'); act(s, { c: 'recruit' }, { c: 'take', card: 'miner' }); expect(P(s).discard).toContain('miner'); expect(s.agentDeck.slice(-2)).toEqual(['farmer', 'scout']); expect(s.agentDeck.length).toBe(n - 1); },
  john_eliot: () => { const s = home(); father(s, 0, 'john_eliot'); s.map.terrain[at(9, 9)] = 'grassland'; settle(s, 'aztec', at(9, 9), { hostility: 3 }); P(s).ship = at(8, 8); P(s).crosses = 1; turn(s, 0, 'colonist', 'sailor'); play(s, 'colonist', 'preach'); expect([P(s).crosses, s.hostility.aztec]).toEqual([0, 3]); },
  michiel_de_ruyter: () => { const s = home(); father(s, 0, 'michiel_de_ruyter'); settle(s, 'aztec', at(9, 9)); P(s).ship = at(8, 8); P(s).inf = 'europe'; expect(attackOptions(s, 0, 'soldier').map((o) => o.mode)).toEqual(['bombard']); },
  robert_de_la_salle: () => { const s = take(home(), 'robert_de_la_salle'); expect(legal(s).map((c) => c.b ?? c.c)).toEqual(['stockade', 'skip']); act(s, { c: 'build' }); expect(P(s).buildings).toEqual(['stockade']); },
  william_penn: () => { const s = home(); father(s, 0, 'william_penn'); s.map.terrain[at(9, 9)] = 'grassland'; P(s).inf = at(9, 9); P(s).wh = stock({ timber: 2 }); turn(s, 0, 'colonist', 'sailor'); play(s, 'colonist', 'found'); expect(P(s).wh.timber).toBe(0); },
  benjamin_franklin: () => { const s = home(); father(s, 0, 'benjamin_franklin'); build(s, 0, 'town_hall', 'newspaper'); expect([work(s, 'colonist', 'town_hall'), work(s, 'politician', 'newspaper')]).toEqual([3, 6]); },
  george_washington: () => { const s = war('gentlemans_war', (x) => father(x, 0, 'george_washington')); act(s, { c: 'keep' }); act(s, { c: 'militia', n: 1 }); expect(s.war!.sieges[0].support).toBe(2); },
  paul_revere: () => { const s = war('gentlemans_war', (x) => father(x, 0, 'paul_revere')); act(s, { c: 'keep' }); act(s, { c: 'militia', n: 0 }); expect(s.war!.sieges[0].support).toBe(4); },
  thomas_jefferson: () => { const s = home(); s.salon = ['thomas_jefferson', 'squanto', 'peter_minuit', 'pocahontas', 'benjamin_franklin']; P(s).bells = 5; turn(s, 0, 'colonist', 'sailor'); play(s, 'colonist', 'propaganda'); act(s, { c: 'take', father: 'thomas_jefferson' }); expect(legal(s).map((c) => c.father)).toEqual(['peter_minuit', 'pocahontas']); act(s, { father: 'pocahontas' }); expect(P(s).fathers).toEqual(['thomas_jefferson', 'pocahontas']); },
  olaudah_equiano: () => { const s = home(); P(s).discard = ['slave_english', 'slave', 'colonist']; P(s).deck = []; s.agentDiscard = []; take(s, 'olaudah_equiano'); const all = [...P(s).hand, ...P(s).deck, ...P(s).discard]; expect(all.filter((c) => c.startsWith('slave')).length).toBeLessThanOrEqual(1); expect(all.length).toBe(5); },
  thaddeus_kosciuszko: () => { const s = home(); father(s, 0, 'thaddeus_kosciuszko'); const d = () => buildingDefence(s, 0).reduce((n, x) => n + x.value, 0); expect(d()).toBe(0); build(s, 0, 'stockade'); expect(d()).toBe(2); build(s, 0, 'fort'); expect(d()).toBe(4); },
  eli_whitney: () => { const s = home(); father(s, 0, 'eli_whitney'); build(s, 0, 'blacksmith_shop', 'factory'); P(s).wh.crops = 1; expect(work(s, 'craftsman', 'factory')).toBe(4); },
  simon_bolivar: () => { const s = home(); father(s, 0, 'simon_bolivar'); expect(scorePlayer(s, 0).parts).toContainEqual({ label: 'simon_bolivar', value: 3 }); s.war = { loyalist: 0, tactic: 'gentlemans_war', pool: 0, order: [0], sieges: [], spent: {} }; expect(scorePlayer(s, 0).parts.some((x) => x.label === 'simon_bolivar')).toBe(false); },
  benedict_arnold: () => { const s = war('gentlemans_war', (x) => father(x, 1, 'benedict_arnold'), 2); while (s.pending!.kind !== 'betray') act(s, legal(s).find((c) => c.c === 'keep' || c.n === 0)!); act(s, { c: 'betray', siege: 0 }); expect(s.war!.sieges[0].betrayed).toBe(-3); },
};

/** The war with one attacked colony of player 0. */
function war(tactic: string, prepare: (s: State) => void = () => {}, n = 2, ref = 3): State {
  const s = home(n);
  if (n > 1) { s.map.terrain[at(9, 9)] = 'grassland'; colony(s, 1, at(9, 9)); }
  s.players.forEach((p, i) => Object.assign(p, { hand: [], deck: [], discard: i ? [] : ['colonist', 'colonist', 'colonist', 'soldier'], bells: 10 - i, inf: 'europe' }));
  s.ref = ref;
  s.tacticDeck = [tactic];
  prepare(s);
  s.pending = null;
  s.stack = [];
  push(s, { t: 'warStart', reason: 'bells' });
  run(s);
  return s;
}
const finish = (s: State, ...dice: number[]) => { while (!s.over) { if (dice.length) rig(s, ...dice); act(s, legal(s).find((c) => c.c === 'keep' || c.n === 0 || c.c === 'skip')!); } return s.war!.sieges[0]; };
const tactics: Record<string, () => void> = {
  line_infantry: () => { const s = war('line_infantry', undefined, 2, 7); expect(siegeStrength(s, s.war!.sieges[0]).attack.total).toBe(14 + 2); },
  ships_of_the_line: () => { const s = war('ships_of_the_line'); expect(siegeStrength(s, s.war!.sieges[0]).attack.total).toBe(6 + 2); },
  native_scouts: () => { const d = (t: string) => { const s = war(t, (x) => { x.map.terrain[at(5, 5)] = 'mountains'; }); return siegeStrength(s, s.war!.sieges[0]).defence.total; }; expect([d('gentlemans_war'), d('native_scouts')]).toEqual([3, 1]); },
  hessian_mercenaries: () => expect(war('hessian_mercenaries').war!.pool).toBe(7),
  surprise_assault: () => { expect(finish(war('surprise_assault', undefined, 2, 1), 6).fell).toBe(true); expect(finish(war('gentlemans_war', undefined, 2, 1), 6).fell).toBe(false); },
  siege_artillery: () => { const d = (t: string) => { const s = war(t, (x) => build(x, 0, 'stockade', 'fort')); return siegeStrength(s, s.war!.sieges[0]).defence.total; }; expect([d('gentlemans_war'), d('siege_artillery')]).toEqual([3, 1]); },
  loyalist_militia: () => { const s = war('loyalist_militia', (x) => { P(x, 1).crosses = 5; }); expect(s.war!.sieges[0].militia).toBe(5); },
  extended_supply_lines: () => { expect(finish(war('extended_supply_lines', undefined, 2, 2), 4, 1, 1).fell).toBe(false); expect(finish(war('extended_supply_lines', undefined, 2, 2), 4, 4, 1).fell).toBe(true); },
  gentlemans_war: () => { const s = war('gentlemans_war'); expect(siegeStrength(s, s.war!.sieges[0]).attack.total).toBe(6); },
};

const act1 = (hostility: number) => { const s = home(2); s.map.terrain[at(9, 9)] = 'grassland'; settle(s, 'aztec', at(9, 9), { hostility }); return s; };
const yes = (s: State) => act(s, { c: 'yes' });
const events: Record<string, () => void> = {
  sugar_act: () => { const s = home(2); P(s).wh = stock({ crops: 2 }); event(s, 'sugar_act'); act(s, { c: 'sell', n: 2 }); expect([s.price.crops, P(s).bells, P(s).gold, s.ref, P(s, 1).bells]).toEqual([2, 1, 4, 2, 0]); },
  silver_fleet: () => { const s = home(2); s.agentDeck.push('corsair'); P(s).gold = 5; P(s, 1).wh = stock({ silver: 2 }); P(s, 1).gold = 4; event(s, 'silver_fleet'); yes(s); expect(P(s).discard).toContain('corsair'); act(s, { c: 'refuse' }); expect([s.price.silver, s.ref, P(s, 1).bells]).toEqual([4, 1, 1]); event(s, 'silver_fleet'); act(s, { c: 'pay' }); expect(P(s, 1).gold).toBe(0); },
  seven_years_war: () => { const s = home(); s.price.goods = 3; s.pier = [['soldier'], ['farmer'], ['captain'], ['miner'], ['scout']]; Object.assign(P(s), { deck: Array(6).fill('colonist'), hand: [], discard: [] }); event(s, 'seven_years_war'); expect(s.pier.map((x) => x[0])).toEqual(expect.arrayContaining(['farmer', 'miner', 'scout'])); act(s, { c: 'remove' }, { c: 'remove' }); expect([s.price.goods, P(s).gold, s.ref, P(s).deck.length]).toEqual([4, 12, 2, 4]); },
  the_great_awakening: () => { const s = home(); build(s, 0, 'chapel'); s.ref = 3; P(s).crosses = 6; event(s, 'the_great_awakening'); act(s, { c: 'give', n: 8 }); expect([P(s).crosses, s.ref]).toEqual([0, 1]); },
  smallpox_epidemic: () => { const s = act1(3); s.settlements[0].pop = 1; const old = s.pier.flat(); event(s, 'smallpox_epidemic'); expect([s.price.timber, s.settlements[0].alive, s.agentDiscard.length]).toEqual([2, false, old.length]); },
  stamp_act: () => { const s = home(); s.price.goods = 2; build(s, 0, 'town_hall', 'docks', 'chapel'); P(s).gold = 5; event(s, 'stamp_act'); act(s, { c: 'payFor', n: 2 }); expect([s.price.goods, P(s).bells, P(s).gold, s.ref]).toEqual([3, 1, 1, 1]); },
  atlantic_storms: () => { const s = home(3); P(s, 0).ship = at(8, 8); P(s, 0).hold = stock({ goods: 2 }); P(s, 1).ship = at(9, 8); event(s, 'atlantic_storms'); expect([total(P(s).hold), P(s).damage, P(s, 1).damage, P(s, 2).damage, s.price.crops, P(s, 1).wh.goods]).toEqual([0, 0, 1, 0, 4, 2]); expect(s.map.zone[P(s, 1).ship]).toBe('europe'); },
  pontiacs_rebellion: () => { const s = act1(4); P(s).wh = stock({ food: 3 }); event(s, 'pontiacs_rebellion'); expect([P(s).wh.food, s.ref]).toEqual([1, 2]); },
  broken_treaties: () => { const s = act1(3); s.settlements[0].ally = 1; event(s, 'broken_treaties'); expect(s.settlements[0].ally).toBe(null); },
  black_market: () => { const s = home(2); P(s).wh = stock({ goods: 2 }); event(s, 'black_market'); act(s, { c: 'sell', n: 2 }); expect([s.price.goods, P(s).gold, s.ref]).toEqual([4, 6, 2]); },
  starving_time: () => { const s = act1(0); Object.assign(P(s), { deck: Array(5).fill('colonist'), hand: [], discard: [] }); event(s, 'starving_time'); expect([s.price.food, P(s).wh.food, P(s).deck.length]).toEqual([2, 0, 5]); s.hostility.aztec = 3; event(s, 'starving_time'); expect(P(s).deck.length).toBe(4); },
  prison_ships: () => { const s = home(2); s.agentDeck.push('criminal'); event(s, 'prison_ships'); yes(s); expect([s.price.timber, P(s).discard.includes('criminal'), s.ref]).toEqual([0, true, 2]); },
  common_sense: () => { const s = home(2); const old = [...s.salon]; P(s).bells = 7; P(s, 1).bells = 4; event(s, 'common_sense'); expect(s.ref).toBe(4); expect(s.salon.some((f) => old.includes(f))).toBe(false); },
  industrial_boom: () => { const s = home(2); P(s).wh = stock({ timber: 2 }); P(s, 1).wh = stock({ goods: 1 }); event(s, 'industrial_boom'); act(s, { c: 'build', b: 'blacksmith_shop' }); expect([s.price.goods, s.price.crops, P(s).wh.timber, P(s).buildings, s.ref]).toEqual([4, 4, 0, ['blacksmith_shop'], 1]); },
  salem_witch_trials: () => { const s = home(2); P(s).crosses = 1; Object.assign(P(s, 1), { hand: ['priest'], deck: Array(4).fill('colonist'), discard: [] }); event(s, 'salem_witch_trials'); act(s, { c: 'accuse', player: 1 }); expect([P(s, 1).hand.length, s.ref]).toEqual([0, 2]); event(s, 'salem_witch_trials'); act(s, { c: 'accuse', player: 1 }); expect(P(s, 1).crosses).toBe(5); },
  mutiny: () => { const s = home(); s.price.silver = 2; Object.assign(P(s), { deck: ['soldier', 'captain', ...Array(4).fill('colonist')], hand: [], discard: [], gold: 2 }); event(s, 'mutiny'); act(s, { c: 'pay' }); expect([s.price.silver, P(s).gold, s.ref, P(s).deck.includes('soldier'), P(s).deck.includes('captain')]).toEqual([3, 0, 2, false, true]); },
  sacred_forest: () => { const s = act1(2); P(s).wh = stock({ timber: 1, goods: 1 }); event(s, 'sacred_forest'); act(s, { c: 'goods' }); expect([s.price.timber, P(s).wh.goods, s.hostility.aztec]).toEqual([2, 0, 2]); event(s, 'sacred_forest'); expect(s.hostility.aztec).toBe(3); },
  el_dorado_rumors: () => { const s = home(); Object.assign(P(s), { deck: Array(7).fill('colonist'), hand: [], discard: [] }); event(s, 'el_dorado_rumors'); act(s, { c: 'remove' }, { c: 'remove' }, { c: 'remove' }); expect([s.price.silver, P(s).gold, s.ref]).toEqual([4, 15, 2]); },
  slave_rebellion: () => { const s = home(); Object.assign(P(s), { deck: ['slave', 'slave_english', ...Array(4).fill('colonist')], hand: [], discard: [], gold: 2 }); event(s, 'slave_rebellion'); act(s, { c: 'pay' }); expect([s.price.crops, P(s).gold, s.ref, P(s).deck.length]).toEqual([4, 0, 1, 5]); },
  treaty_of_paris: () => { const s = act1(3); s.price.crops = 0; s.price.goods = 1; s.agentDeck.push('soldier'); P(s).gold = 5; event(s, 'treaty_of_paris'); yes(s); expect([s.price.crops, s.price.goods, s.hostility.aztec, P(s).gold]).toEqual([3, 5, 2, 0]); },
  the_boston_tea_party: () => { const s = home(2); P(s).wh = stock({ goods: 2 }); P(s).gold = 4; event(s, 'the_boston_tea_party'); act(s, { c: 'boycott' }); expect([P(s).wh.goods, P(s).bells, s.ref]).toEqual([0, 2, 2 + 4]); P(s).wh = stock({ goods: 2 }); event(s, 'the_boston_tea_party'); act(s, { c: 'pay' }); expect([P(s).gold, P(s).wh.goods]).toEqual([0, 2]); },
  pirate_blockade: () => { const s = home(2); P(s).ship = at(8, 8); P(s).gold = 3; P(s).hold = stock({ silver: 1 }); event(s, 'pirate_blockade'); act(s, { c: 'refuse' }); expect([P(s).damage, total(P(s).hold), s.ref, P(s).gold, P(s, 1).damage]).toEqual([1, 0, 2, 3, 0]); },
};

const near = () => { const s = game(1); s.map.terrain[at(6, 8)] = 'grassland'; settle(s, 'sioux', at(6, 8), { hostility: 2 }); P(s).crosses = 6; return s; };
const ended = (s: State) => s.move!.ended;
const ruins: Record<string, () => void> = {
  natives_ambush: () => { const s = near(); P(s).hand = ['colonist']; poi(s, 'ruin', 'natives_ambush', 'soldier'); opt(s, 'fight'); expect([P(s).bells, ended(s)]).toEqual([1, true]); poi(s, 'ruin', 'natives_ambush'); opt(s, 'surrender'); expect(P(s).hand).toEqual([]); poi(s, 'ruin', 'natives_ambush'); opt(s, 'flee'); expect(P(s).inf).toBe('europe'); },
  predators_lair: () => { const s = near(); poi(s, 'ruin', 'predators_lair', 'dragoon'); opt(s, 'fight'); expect(P(s).gold).toBe(5); P(s).hand = []; poi(s, 'ruin', 'predators_lair'); opt(s, 'flee'); expect(P(s).inf).toBe('europe'); },
  golden_city: () => { for (const [d, g] of [[2, 10], [4, 15], [6, 20]]) { const s = near(); poi(s, 'ruin', 'golden_city'); rig(s, d); opt(s, 'search'); expect(P(s).gold).toBe(g); } const s = near(); poi(s, 'ruin', 'golden_city'); opt(s, 'study'); expect([P(s).bells, ended(s)]).toEqual([2, true]); },
  silver_mines: () => { for (const [d, g] of [[1, 1], [3, 3], [5, 5]]) { const s = near(); poi(s, 'ruin', 'silver_mines'); rig(s, d); opt(s, 'search'); expect([P(s).wh.silver, ended(s)]).toEqual([g, true]); } const s = near(); poi(s, 'ruin', 'silver_mines'); opt(s, 'leave'); expect(s.move!.points).toBe(4); },
  survivor: () => { const s = near(); const a = s.pier[0][0]; poi(s, 'ruin', 'survivor'); opt(s, 'take'); expect(P(s).discard).toContain(a); poi(s, 'ruin', 'survivor'); opt(s, 'escort'); expect([P(s).crosses, P(s).inf]).toEqual([9, 'europe']); s.ruinDeck.push('hidden_granaries'); s.ruinDeck.reverse(); s.ruinDeck.push('hidden_granaries'); poi(s, 'ruin', 'survivor'); opt(s, 'abandon'); expect([P(s).crosses, P(s).wh.food]).toEqual([7, 4]); },
  abandoned_fort: () => { const s = near(); poi(s, 'ruin', 'abandoned_fort'); expect(can(s, { c: 'build', b: 'fort' })).toBe(false); act(s, { c: 'build', b: 'school' }); expect([P(s).wh.timber, P(s).buildings]).toEqual([4, ['school']]); },
  hidden_granaries: () => expect(P(poi(near(), 'ruin', 'hidden_granaries')).wh.food).toBe(4),
  smugglers_cave: () => expect(P(poi(near(), 'ruin', 'smugglers_cave')).wh).toMatchObject({ crops: 2, goods: 2 }),
  mere_rumors: () => expect(poi(near(), 'ruin', 'mere_rumors').move!.points).toBe(4),
  native_burial: () => { for (const [d, g, h] of [[1, 0, 2], [3, 5, 3], [6, 10, 4]]) { const s = near(); poi(s, 'ruin', 'native_burial'); rig(s, d); opt(s, 'loot'); expect([P(s).gold, s.hostility.sioux, ended(s)]).toEqual([g, h, true]); } const s = near(); poi(s, 'ruin', 'native_burial'); opt(s, 'respect'); expect(s.hostility.sioux).toBe(1); },
  desecrated_burial: () => { const s = near(); poi(s, 'ruin', 'desecrated_burial'); opt(s, 'take'); expect([P(s).gold, s.hostility.sioux]).toEqual([5, 3]); poi(s, 'ruin', 'desecrated_burial'); opt(s, 'rebury'); expect([P(s).crosses, ended(s)]).toEqual([9, true]); },
  sacred_totem_circle: () => { for (const [d, g, v] of [[1, 0, 0], [3, 0, 3], [6, 20, 0]]) { const s = near(); poi(s, 'ruin', 'sacred_totem_circle'); rig(s, d); opt(s, 'dismantle'); expect([P(s).gold, P(s).wh.silver, s.hostility.sioux]).toEqual([g, v, 4]); } const s = near(); P(s).wh.food = 1; poi(s, 'ruin', 'sacred_totem_circle'); opt(s, 'offer'); expect([P(s).wh.food, P(s).crosses, s.hostility.sioux]).toEqual([0, 1, 0]); poi(s, 'ruin', 'sacred_totem_circle'); opt(s, 'study'); expect(P(s).bells).toBe(2); },
  guide: () => { const s = near(); P(s).gold = 2; s.ruinDeck.push('hidden_granaries', 'mere_rumors'); poi(s, 'ruin', 'guide'); opt(s, 'pay'); act(s, { c: 'play', card: 'hidden_granaries' }); expect([P(s).gold, P(s).wh.food, s.ruinDiscard.includes('mere_rumors')]).toEqual([0, 4, true]); s.ruinDeck.push('hidden_granaries'); poi(s, 'ruin', 'guide'); opt(s, 'threaten'); expect([s.hostility.sioux, P(s).wh.food]).toEqual([1, 8]); poi(s, 'ruin', 'guide'); opt(s, 'leave'); expect(s.move!.points).toBe(4); },
  warrior_burial: () => { const s = near(); poi(s, 'ruin', 'warrior_burial'); opt(s, 'loot'); expect([P(s).gold, P(s).crosses, s.hostility.sioux]).toEqual([6, 4, 3]); poi(s, 'ruin', 'warrior_burial'); opt(s, 'leave'); expect(s.move!.points).toBe(4); },
  bandeirante_tracks: () => { const s = near(); poi(s, 'ruin', 'bandeirante_tracks', 'scout'); opt(s, 'track'); expect([P(s).gold, ended(s)]).toEqual([15, false]); for (const [d, g, eu] of [[3, 0, false], [4, 0, true], [5, 15, false]] as const) { const t = near(); P(t).hand = []; poi(t, 'ruin', 'bandeirante_tracks'); rig(t, d); opt(t, 'comb'); expect([P(t).gold, P(t).inf === 'europe', ended(t)]).toEqual([g, eu, true]); } },
  stone_wall: () => { for (const [d, g, eu] of [[1, 0, true], [4, 10, false], [5, 15, false]] as const) { const t = near(); poi(t, 'ruin', 'stone_wall'); rig(t, d); opt(t, 'dig'); expect([P(t).gold, P(t).inf === 'europe']).toEqual([g, eu]); } },
  protective_amulet: () => { const s = near(); poi(s, 'ruin', 'protective_amulet'); opt(s, 'study'); expect([P(s).bells, ended(s)]).toEqual([2, true]); poi(s, 'ruin', 'protective_amulet'); opt(s, 'take'); expect([P(s).gold, s.hostility.sioux, ended(s)]).toEqual([10, 3, false]); poi(s, 'ruin', 'protective_amulet'); opt(s, 'leave'); expect(s.move!.points).toBe(4); },
  defiled_shrine: () => { for (const [d, g, h] of [[2, 0, 3], [3, 5, 2], [6, 10, 2]]) { const t = near(); poi(t, 'ruin', 'defiled_shrine'); rig(t, d); opt(t, 'search'); expect([P(t).gold, t.hostility.sioux]).toEqual([g, h]); } const s = near(); poi(s, 'ruin', 'defiled_shrine'); opt(s, 'leave'); expect(P(s).crosses).toBe(8); },
  lost_tomb: () => { for (const [d, g, eu] of [[1, 0, true], [2, 5, false], [5, 20, false]] as const) { const t = near(); poi(t, 'ruin', 'lost_tomb'); rig(t, d); opt(t, 'open'); expect([P(t).gold, P(t).inf === 'europe', t.hostility.sioux]).toEqual([g, eu, 3]); } const s = near(); poi(s, 'ruin', 'lost_tomb'); opt(s, 'record'); expect(P(s).bells).toBe(2); },
  trail_marker: () => { const s = near(); s.revealed = s.revealed.map((_, i) => i === 5); poi(s, 'ruin', 'trail_marker'); opt(s, 'study'); expect([1, 4, 6, 9].every((f) => s.revealed[f])).toBe(true); expect(ended(s)).toBe(true); poi(s, 'ruin', 'trail_marker'); opt(s, 'destroy'); expect([P(s).crosses, s.hostility.sioux]).toEqual([11, 4]); },
};

const sea = () => { const s = near(); P(s).ship = at(6, 5); return s; };
const wrecks: Record<string, () => void> = {
  shipwreck: () => { const s = sea(); poi(s, 'wreck', 'shipwreck'); opt(s, 'take'); expect([P(s).hold.timber, ended(s)]).toEqual([1, true]); poi(s, 'wreck', 'shipwreck'); opt(s, 'leave'); expect(s.move!.points).toBe(4); },
  sunken_galleon: () => { const s = sea(); poi(s, 'wreck', 'sunken_galleon'); opt(s, 'deck'); expect(P(s).gold).toBe(8); for (const [d, g, x] of [[2, 0, 1], [3, 15, 0], [6, 25, 0]]) { const t = sea(); poi(t, 'wreck', 'sunken_galleon'); rig(t, d); opt(t, 'dive'); expect([P(t).gold, P(t).damage]).toEqual([g, x]); } },
  man_overboard: () => { const s = sea(); const a = s.pier[0][0]; poi(s, 'wreck', 'man_overboard'); opt(s, 'save'); expect([P(s).crosses, P(s).discard.includes(a), ended(s)]).toEqual([8, true, true]); poi(s, 'wreck', 'man_overboard'); opt(s, 'abandon'); expect([P(s).crosses, s.move!.points]).toEqual([6, 4]); },
  floating_cargo: () => { const s = sea(); poi(s, 'wreck', 'floating_cargo'); opt(s, 'barrels'); expect(P(s).hold.goods).toBe(2); const t = sea(); poi(t, 'wreck', 'floating_cargo'); opt(t, 'bales'); expect(P(t).hold.crops).toBe(3); /* infantry takes a slot */ },
  plague_ship: () => { for (const [d, g, x] of [[1, 0, 2], [3, 0, 1], [4, 10, 0]]) { const t = sea(); poi(t, 'wreck', 'plague_ship'); rig(t, d); opt(t, 'board'); expect([P(t).gold, P(t).damage]).toEqual([g, x]); } },
  drifting_frigate: () => { const s = sea(); P(s).hand = ['colonist', 'sailor']; poi(s, 'wreck', 'drifting_frigate'); expect(can(s, { id: 'guns' })).toBe(false); opt(s, 'tow'); act(s, { c: 'discard', card: 'sailor' }); expect([P(s).gold, s.map.zone[P(s).ship], P(s).hand.length]).toEqual([10, 'europe', 1]); s.map.terrain[at(9, 9)] = 'grassland'; colony(s, 0, at(9, 9)); poi(s, 'wreck', 'drifting_frigate'); opt(s, 'guns'); act(s, { c: 'cell', cell: at(8, 8) }); expect([P(s).bells, P(s).ship]).toEqual([2, at(8, 8)]); },
  pirate_ambush: () => { const s = sea(); P(s).gold = 5; poi(s, 'wreck', 'pirate_ambush', 'soldier'); opt(s, 'fire'); expect(P(s).bells).toBe(1); poi(s, 'wreck', 'pirate_ambush'); opt(s, 'ransom'); expect(P(s).gold).toBe(0); P(s).hold = stock({ food: 2 }); poi(s, 'wreck', 'pirate_ambush'); opt(s, 'cargo'); expect(total(P(s).hold)).toBe(0); P(s).hand = ['colonist', 'colonist']; poi(s, 'wreck', 'pirate_ambush'); opt(s, 'flee'); expect([P(s).hand.length, s.move!.points]).toEqual([0, 4]); P(s).hold = stock({ food: 1 }); poi(s, 'wreck', 'pirate_ambush'); opt(s, 'surrender'); expect([P(s).damage, total(P(s).hold)]).toEqual([2, 0]); },
  sea_charts: () => { const s = sea(); poi(s, 'wreck', 'sea_charts'); opt(s, 'currents'); expect(s.move!.points).toBe(8); s.revealed = s.revealed.map((_, i) => i === 5); poi(s, 'wreck', 'sea_charts'); opt(s, 'copy'); expect([s.revealed[6], s.revealed[10], ended(s)]).toEqual([true, false, true]); },
  smugglers_cache: () => { const s = sea(); s.ref = 2; poi(s, 'wreck', 'smugglers_cache'); opt(s, 'take'); expect(P(s).hold.silver).toBe(2); poi(s, 'wreck', 'smugglers_cache'); opt(s, 'report'); expect(s.ref).toBe(1); },
  surviving_crew: () => { const s = sea(); poi(s, 'wreck', 'surviving_crew'); expect(can(s, { id: 'feed' })).toBe(false); opt(s, 'abandon'); expect(P(s).crosses).toBe(4); P(s).wh.food = 1; poi(s, 'wreck', 'surviving_crew'); opt(s, 'feed'); expect([P(s).wh.food, P(s).crosses]).toEqual([0, 6]); },
  treacherous_reefs: () => { const s = sea(); P(s).hand = ['colonist']; poi(s, 'wreck', 'treacherous_reefs'); opt(s, 'careful'); expect([P(s).hand.length, s.move!.points]).toEqual([0, 4]); for (const [d, g, x] of [[3, 0, 1], [4, 5, 0]]) { const t = sea(); poi(t, 'wreck', 'treacherous_reefs'); rig(t, d); opt(t, 'straight'); expect([P(t).gold, P(t).damage]).toEqual([g, x]); } },
  slave_ship: () => { const s = sea(); poi(s, 'wreck', 'slave_ship'); opt(s, 'free'); expect([P(s).crosses, s.hostility.sioux]).toEqual([9, 1]); s.agentDeck.push('slave'); poi(s, 'wreck', 'slave_ship'); opt(s, 'chain'); expect([P(s).discard.includes('slave'), P(s).crosses, s.hostility.sioux, ended(s)]).toEqual([true, 7, 2, true]); poi(s, 'wreck', 'slave_ship'); opt(s, 'abandon'); expect(P(s).crosses).toBe(4); },
  gutted_hull: () => { const s = sea(); poi(s, 'wreck', 'gutted_hull'); opt(s, 'strip'); expect(P(s).hold.timber).toBe(1); poi(s, 'wreck', 'gutted_hull'); rig(s, 5); opt(s, 'search'); expect(P(s).gold).toBe(5); },
  calm_seas: () => expect(ended(poi(sea(), 'wreck', 'calm_seas'))).toBe(true),
  capricious_official: () => { const s = sea(); poi(s, 'wreck', 'capricious_official'); expect(legal(s).map((c) => c.id)).toEqual(['ignore']); opt(s, 'ignore'); expect(s.ref).toBe(1); P(s).bells = 2; P(s).hold = stock({ food: 1 }); poi(s, 'wreck', 'capricious_official'); opt(s, 'space'); expect(total(P(s).hold)).toBe(0); poi(s, 'wreck', 'capricious_official'); opt(s, 'cabin'); expect(P(s).bells).toBe(0); },
  lost_relic: () => { for (const [d, g, c] of [[2, 0, 6], [4, 5, 7], [6, 15, 8]]) { const t = sea(); poi(t, 'wreck', 'lost_relic'); rig(t, d); opt(t, 'dive'); expect([P(t).gold, P(t).crosses]).toEqual([g, c]); } const s = sea(); poi(s, 'wreck', 'lost_relic'); opt(s, 'abandon'); expect([P(s).crosses, s.move!.points]).toEqual([3, 4]); },
  message_in_a_bottle_1: () => { const s = sea(); poi(s, 'wreck', 'message_in_a_bottle_1'); opt(s, 'discard'); expect(P(s).ship).toBe(at(6, 5)); poi(s, 'wreck', 'message_in_a_bottle_1'); opt(s, 'deliver'); expect(s.map.zone[P(s).ship]).toBe('europe'); },
  message_in_a_bottle_2: () => { const s = sea(); poi(s, 'wreck', 'message_in_a_bottle_2'); opt(s, 'spread'); expect([P(s).bells, s.ref]).toEqual([2, 1]); poi(s, 'wreck', 'message_in_a_bottle_2'); opt(s, 'destroy'); expect([P(s).bells, s.ref]).toEqual([0, 0]); },
  message_in_a_bottle_3: () => { const s = sea(); poi(s, 'wreck', 'message_in_a_bottle_3'); opt(s, 'spread'); expect([P(s).bells, s.ref]).toEqual([1, 1]); poi(s, 'wreck', 'message_in_a_bottle_3'); opt(s, 'destroy'); expect([P(s).bells, s.ref]).toEqual([0, 1]); },
  rich_reefs: () => { for (const [d, g] of [[2, 0], [3, 8], [5, 20]]) { const t = sea(); poi(t, 'wreck', 'rich_reefs'); rig(t, d); opt(t, 'dive'); expect(P(t).gold).toBe(g); } },
};
const tribes = Object.values(def.tribes);

const suites = { agents, buildings, fathers, tactics, events, ruins, wrecks };
for (const [name, list] of Object.entries(suites)) describe(name, () => { for (const [id, fn] of Object.entries(list)) it(id, fn); });
describe('tribes', () => {
  for (const t of tribes) it(t.id, () => {
    const s = game(1);
    world(s, { [at(5, 5)]: { t: t.terrain, poi: 'village' }, [at(5, 6)]: 'grassland' });
    s.tribeDeck = [t.id];
    s.revealed[5] = false;
    P(s).inf = 'europe';
    P(s).ship = at(4, 4);
    s.revealed[0] = true;
    runTasks(s, { t: 'node', node: { n: 'revealAdjacent' }, p: 0, cell: at(3, 6) });
    expect(s.settlements[0]).toMatchObject({ tribe: t.id, pop: t.population });
    expect(s.hostility[t.id]).toBe(t.hostility);
    s.settlements[0].pop = 1;
    P(s).inf = at(5, 6);
    turn(s, 0, 'dragoon', 'dragoon', 'dragoon');
    play(s, 'dragoon', 'attack');
    rig(s, 4);
    act(s, { c: 'add', card: 'dragoon' }, { c: 'done' }, { c: 'no' });
    if (t.loot.gold) expect(P(s).gold).toBe(t.loot.gold);
    else expect(P(s).wh[t.loot.res!]).toBe(t.loot.amount);
  });
});
describe('coverage', () => {
  it('every card in the workbook has a test', () => {
    const bases = [...new Set(Object.values(def.agents).map((a) => a.base))];
    expect(bases.filter((x) => !agents[x])).toEqual([]);
    for (const k of ['buildings', 'fathers', 'tactics', 'events', 'ruins', 'wrecks'] as const) expect(Object.keys(def[k]).filter((x) => !suites[k][x])).toEqual([]);
  });
});
