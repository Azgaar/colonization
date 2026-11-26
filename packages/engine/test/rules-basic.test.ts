import { describe, expect, it } from 'vitest';
import { createGame, legal, problems, apply, applyInPlace, IllegalChoice, map, scorePlayer, taxRate, year } from '../src/index.ts';
import { act, at, build, can, canPlay, colony, def, defWith, event, father, game, NATIONS, P, play, poi, rig, runTasks, settle, stock, total, turn, world } from './h.ts';

const fresh = (n = 2, seed = 'x', d = def) => createGame({ def: d, seed, nations: NATIONS.slice(0, n) });

describe('Setup', () => {
  it('[S-1] players start with their nation deck and nothing else', () => {
    const s = fresh(5);
    for (const p of s.players) {
      expect([...p.deck].sort()).toEqual([...def.nations[p.nation].deck].sort());
      expect([p.gold, p.bells, p.crosses, total(p.wh), total(p.hold), p.inf]).toEqual([0, 0, 0, 0, 0, 'ship']);
    }
    expect(() => fresh(0)).toThrow();
    expect(() => createGame({ def, seed: 'x', nations: ['english', 'english'] })).toThrow();
  });
  it('[S-2] 16 different fragments, all closed', () => {
    const s = fresh();
    expect(new Set(s.frags).size).toBe(16);
    expect(s.revealed.every((r) => !r)).toBe(true);
    const tile = def.tiles[s.frags[0]];
    expect([0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => s.map.terrain[at(2 + r, 2 + c)]))).toEqual(tile.cells.map((c) => c.terrain));
  });
  it('[S-3] a ring of open sea inside a ring of Europe', () => {
    const s = fresh();
    expect(s.map.width).toBe(16);
    expect([at(0, 5), at(1, 5), at(2, 5)].map((c) => s.map.zone[c])).toEqual(['europe', 'sea', 'map']);
    expect(fresh(2, 'x', defWith({ 'settings.ring.openSea': 0 })).map.width).toBe(14);
  });
  it('[S-4] common deck has only common agents, natives are apart', () => {
    const s = fresh();
    const all = [...s.agentDeck, ...s.pier.flat()];
    expect(all.length).toBe(49);
    expect(all.every((c) => def.agents[c].kind === 'common')).toBe(true);
    expect(s.nativesLeft).toBe(8);
  });
  it('[S-5] the pier shows five different agents, duplicates stacked', () => {
    for (let i = 0; i < 20; i++) {
      const s = fresh(2, `p${i}`);
      expect(s.pier.length).toBe(5);
      expect(new Set(s.pier.map((x) => x[0])).size).toBe(5);
      for (const st of s.pier) expect(new Set(st).size).toBe(1);
    }
  });
  it('[S-6] salon of five, buildings by copies', () => {
    const s = fresh();
    expect(s.salon.length).toBe(5);
    expect([s.buildingsLeft.docks, s.buildingsLeft.fort]).toEqual([5, 1]);
  });
  it('[S-7] start prices, cap and floor', () => {
    const s = game();
    expect(s.price).toEqual({ food: 1, timber: 1, crops: 3, goods: 5, silver: 5 });
    runTasks(s, { t: 'node', node: { n: 'price', res: ['goods'], add: 1 }, p: 0 }, { t: 'node', node: { n: 'price', res: ['food'], add: -3 }, p: 0 });
    expect([s.price.goods, s.price.food]).toEqual([5, 0]);
  });
  it('[S-8] tax track', () => {
    const s = game();
    expect(Array.from({ length: 10 }, (_, i) => { s.round = i + 1; return taxRate(s); })).toEqual([0, 1, 3, 6, 10, 10, 15, 15, 20, 25]);
  });
  it('[S-9] start cells are free Europe cells, chosen in turn order', () => {
    const s = fresh(3);
    expect(s.pending).toMatchObject({ kind: 'startCell', player: s.first });
    const c = legal(s)[0];
    applyInPlace(s, c);
    expect(s.pending!.player).toBe((s.first + 1) % 3);
    expect(legal(s).some((x) => x.cell === c.cell)).toBe(false);
    expect(legal(s).every((x) => s.map.zone[x.cell as number] === 'europe')).toBe(true);
  });
});

describe('Round', () => {
  it('[T-1] draw to five, reshuffling the discard in mid-draw', () => {
    const s = game(1);
    Object.assign(P(s), { hand: ['colonist_english'], deck: ['sailor_english'], discard: ['soldier_english', 'slave_english', 'puritan_english'] });
    runTasks(s, { t: 'roundStart' });
    expect(P(s).hand.length).toBe(5);
    expect([P(s).deck.length, P(s).discard.length]).toEqual([0, 0]);
    Object.assign(P(s), { hand: ['a', 'b', 'c', 'd'].map(() => 'colonist_english'), deck: ['sailor_english', 'soldier_english'], discard: [] });
    runTasks(s, { t: 'roundStart' });
    expect(P(s).hand.length).toBe(5);
    expect(P(s).deck.length).toBe(1);
  });
  it('[T-2] one card per turn, clockwise; passing may keep or discard cards', () => {
    const s = game(3);
    for (const p of [0, 1, 2]) P(s, p).hand = ['colonist', 'colonist'];
    turn(s, 0, 'colonist', 'sailor', 'soldier');
    act(s, { c: 'pass' }, { c: 'discard', card: 'sailor' }, { c: 'keep' });
    expect(P(s).hand).toEqual(['colonist', 'soldier']);
    expect(P(s).discard).toContain('sailor');
    expect(s.pending).toMatchObject({ kind: 'turn', player: 1 });
    play(s, 'colonist', 'exchange');
    expect(s.pending!.player).toBe(2);
    play(s, 'colonist', 'exchange');
    expect(s.pending!.player).toBe(1); // player 0 has passed
  });
  it('[T-3] a player without cards can only pass', () => {
    const s = game(2);
    P(s, 1).hand = [];
    turn(s, 0, 'colonist', 'sailor');
    play(s, 'colonist', 'moveShip');
    act(s, { c: 'end' });
    expect(s.pending).toMatchObject({ kind: 'turn', player: 1 });
    expect(legal(s)).toEqual([{ c: 'pass' }]);
    act(s, { c: 'pass' });
    expect(s.pending).toMatchObject({ kind: 'turn', player: 0 });
    expect(P(s, 1).passed).toBe(true);
  });
  it('[T-4] the event comes when all have passed', () => {
    const s = game(1);
    s.eventDeck = ['prison_ships', 'pontiacs_rebellion'];
    turn(s, 0, 'colonist');
    act(s, { c: 'pass' }, { c: 'keep' });
    expect(s.eventDeck).toEqual(['prison_ships']);
    expect(s.round).toBe(2);
    expect(s.ref).toBe(1);
  });
  it('[T-5] tax is paid in full or refused', () => {
    const s = game(2);
    s.round = 4;
    P(s, 0).gold = 10;
    P(s, 1).gold = 5;
    runTasks(s, { t: 'taxPhase' });
    expect(s.pending).toMatchObject({ kind: 'tax', player: 0 });
    act(s, { c: 'pay' });
    expect(P(s, 0).gold).toBe(4);
    // Player 1 cannot pay and refuses automatically.
    expect([P(s, 1).gold, P(s, 1).bells, s.ref]).toEqual([5, 1, 2]);
    const solo = game(1);
    solo.round = 2;
    runTasks(solo, { t: 'taxPhase' });
    expect([solo.ref, P(solo).bells]).toEqual([3, 1]);
    const first = game(2);
    runTasks(first, { t: 'taxPhase' });
    expect(first.ref).toBe(0);
  });
  it('[T-6] round, year and first player advance', () => {
    const s = game(3);
    runTasks(s, { t: 'roundEnd' });
    expect([s.round, s.first, year(s)]).toEqual([2, 1, 1640]);
  });
  it('[T-7] warehouse excess is discarded at the end of the turn and after events', () => {
    const s = game(1);
    colony(s, 0, at(5, 5));
    world(s, { [at(5, 5)]: 'grassland' });
    turn(s, 0, 'farmer', 'colonist');
    P(s).wh = stock({ food: 6 });
    play(s, 'farmer', 'produce', { icon: 'corn' });
    expect(total(P(s).wh)).toBe(6); // only food to discard, so no choice was needed
    P(s).wh = stock({ food: 5, timber: 5 });
    s.eventDeck = ['pontiacs_rebellion'];
    act(s, { c: 'pass' }, { c: 'keep' });
    expect(s.pending).toMatchObject({ kind: 'overflow', player: 0 });
    act(s, { c: 'discard', r: 'food' }, { c: 'discard', r: 'food' }, { c: 'discard', r: 'timber' }, { c: 'discard', r: 'timber' });
    expect(total(P(s).wh)).toBe(6);
  });
  it('[T-8] recruiting with crosses is free and repeatable', () => {
    const s = game(1);
    P(s).crosses = 2;
    act(s, { c: 'recruit' }, { c: 'bottom' });
    expect(s.pending!.kind).toBe('turn');
    act(s, { c: 'recruit' }, { c: 'top' });
    expect(P(s).crosses).toBe(0);
    expect(can(s, { c: 'recruit' })).toBe(false);
  });
});

describe('Playing a card', () => {
  it('[P-1] any agent may take any standard action', () => {
    const s = game(1);
    for (const c of ['farmer', 'soldier', 'politician', 'indian']) { turn(s, 0, c, 'colonist'); expect(canPlay(s, c, 'moveShip')).toBe(true); expect(canPlay(s, c, 'hire')).toBe(true); }
  });
  it('[P-2] criminals and slaves only produce, but support battles', () => {
    const s = game(2);
    colony(s, 0, at(5, 5));
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    turn(s, 0, 'slave', 'criminal', 'soldier');
    const acts = new Set(legal(s).filter((c) => c.card === 'slave' || c.card === 'criminal').map((c) => c.a));
    expect([...acts]).toEqual(['produce']);
    P(s, 0).inf = at(5, 5);
    P(s, 1).inf = at(5, 6);
    play(s, 'soldier', 'attack');
    expect(can(s, { c: 'add', card: 'slave' })).toBe(true);
    const no = game(2, defWith({ 'settings.combat.supportFromCriminalSlave': false }));
    world(no, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    P(no, 0).inf = at(5, 5);
    P(no, 1).inf = at(5, 6);
    turn(no, 0, 'slave', 'soldier');
    P(no, 1).hand = ['colonist'];
    play(no, 'soldier', 'attack');
    expect(no.pending!.player).toBe(1); // nothing to add, so the attacker was not asked
  });
  it('[P-3] the played card goes to the discard', () => {
    const s = game(1);
    turn(s, 0, 'colonist', 'sailor');
    play(s, 'colonist', 'moveShip');
    expect(P(s).inPlay).toBe('colonist');
    act(s, { c: 'end' });
    expect(P(s).inPlay).toBe(null);
    expect(P(s).discard).toContain('colonist');
  });
  it('[P-4] removal stops at four agents', () => {
    const s = game(1);
    Object.assign(P(s), { hand: ['colonist'], deck: ['sailor', 'soldier', 'farmer', 'miner'], discard: [], gold: 0 });
    event(s, 'el_dorado_rumors');
    act(s, { c: 'remove' });
    expect(P(s).hand.length + P(s).deck.length).toBe(4);
    expect(P(s).gold).toBe(5);
    expect(s.pending!.kind).toBe('stop');
  });
});

describe('Movement', () => {
  it('[M-1] five points, eight directions, one token', () => {
    const s = game(1);
    turn(s, 0, 'colonist');
    play(s, 'colonist', 'moveShip');
    expect(s.move!.points).toBe(5);
    for (const c of [at(1, 1), at(2, 2), at(3, 3), at(4, 4), at(5, 5)]) act(s, { c: 'step', cell: c });
    expect(P(s).ship).toBe(at(5, 5));
    expect(s.move).toBe(null);
  });
  it('[M-2] terrain costs, mountains use everything left', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'forest', [at(5, 7)]: 'grassland', [at(5, 8)]: 'mountains', [at(6, 5)]: 'tundra', [at(4, 5)]: 'desert' });
    P(s).inf = at(5, 5);
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveInfantry');
    act(s, { c: 'step', cell: at(6, 5) });
    expect(s.move!.points).toBe(3);
    act(s, { c: 'step', cell: at(5, 5) });
    expect(s.move!.points).toBe(2);
    act(s, { c: 'step', cell: at(4, 5) });
    expect(s.move).toBe(null);
    P(s).inf = at(5, 6);
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveInfantry');
    act(s, { c: 'step', cell: at(5, 7) }, { c: 'step', cell: at(5, 8) });
    expect(s.move).toBe(null);
    P(s).inf = at(5, 7);
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveInfantry');
    s.move!.points = 1;
    expect(can(s, { c: 'step', cell: at(5, 6) })).toBe(false);
    expect(can(s, { c: 'step', cell: at(5, 8) })).toBe(true);
  });
  it('[M-3] ships stay on water, infantry on land, one token per cell', () => {
    const s = game(2);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    P(s).ship = at(4, 5);
    P(s, 1).ship = at(4, 6);
    P(s).inf = at(5, 5);
    P(s, 1).inf = at(5, 6);
    turn(s, 0, 'colonist');
    play(s, 'colonist', 'moveShip');
    expect(can(s, { c: 'step', cell: at(5, 5) })).toBe(false);
    expect(can(s, { c: 'step', cell: at(4, 6) })).toBe(false);
    turn(s, 0, 'colonist');
    expect(canPlay(s, 'colonist', 'moveInfantry')).toBe(true); // only to embark
    play(s, 'colonist', 'moveInfantry');
    expect(legal(s).map((c) => c.c).sort()).toEqual(['embark', 'end']);
  });
  it('[M-4] own colonies may be entered, foreign ones and settlements not', () => {
    const s = game(2);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland', [at(5, 4)]: 'grassland', [at(6, 5)]: 'grassland' });
    P(s).inf = at(5, 5);
    colony(s, 0, at(5, 6));
    colony(s, 1, at(5, 4));
    settle(s, 'sioux', at(6, 5));
    turn(s, 0, 'colonist');
    play(s, 'colonist', 'moveInfantry');
    expect([at(5, 6), at(5, 4), at(6, 5)].map((cell) => can(s, { c: 'step', cell }))).toEqual([true, false, false]);
  });
  it('[M-5] exploring: side neighbours from a fragment, touching ones from the ring', () => {
    const s = game(1);
    s.revealed = s.revealed.map((_, i) => i === 5);
    P(s).ship = at(6, 6);
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveShip');
    expect(legal(s).filter((c) => c.c === 'explore').map((c) => c.frag)).toEqual([1, 4, 6, 9]);
    act(s, { c: 'explore', frag: 6 });
    expect([s.revealed[6], s.move!.points]).toEqual([true, 4]);
    s.revealed = s.revealed.map(() => false);
    expect(map.explorable(s, at(1, 4))).toEqual([0, 1]);
    expect(map.explorable(s, at(0, 4))).toEqual([]);
    const diag = game(1, defWith({ 'settings.explore.diagonal': true }));
    diag.revealed = diag.revealed.map(() => false);
    expect(map.explorable(diag, at(6, 6))).toEqual([0, 1, 2, 4, 6, 8, 9, 10]);
  });
  it('[M-6] revealing marks ruins and wrecks and places settlements in reading order', () => {
    const s = game(1);
    world(s, { [at(2, 2)]: { t: 'grassland', poi: 'ruin' }, [at(2, 3)]: { t: 'grassland', poi: 'village' }, [at(3, 3)]: { t: 'mountains', poi: 'village' } });
    s.map.poi[at(4, 4)] = 'wreck';
    s.revealed[0] = false;
    map.reveal(s, 0, 0);
    expect(s.poi).toEqual({ [at(2, 2)]: 'ruin', [at(4, 4)]: 'wreck' });
    expect(s.settlements.map((x) => [x.n, x.cell])).toEqual([[1, at(2, 3)], [2, at(3, 3)]]);
  });
  it('[M-7] loading and unloading next to an own colony, one point per operation', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland' });
    colony(s, 0, at(5, 5));
    P(s).ship = at(4, 5);
    P(s).wh = stock({ goods: 3, food: 2 });
    P(s).hold = stock({ silver: 1 });
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveShip');
    act(s, { c: 'cargo' }, { c: 'unload', r: 'silver', n: 1 }, { c: 'load', r: 'goods', n: 3 });
    expect(s.move!.points).toBe(4);
    expect([P(s).hold.goods, P(s).wh.goods, P(s).wh.silver]).toEqual([3, 0, 1]);
    act(s, { c: 'step', cell: at(3, 5) });
    expect(can(s, { c: 'cargo' })).toBe(false);
    const u = game(1, defWith({ 'settings.cargo.costPer': 'unit' }));
    world(u, { [at(5, 5)]: 'grassland' });
    colony(u, 0, at(5, 5));
    P(u).ship = at(4, 5);
    P(u).wh = stock({ goods: 3 });
    turn(u, 0, 'colonist', 'colonist');
    play(u, 'colonist', 'moveShip');
    act(u, { c: 'cargo' }, { c: 'load', r: 'goods', n: 2 });
    expect(u.move!.points).toBe(3);
  });
  it('[M-8] disembarking and embarking let the other token use what is left', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'mountains', [at(5, 6)]: 'grassland' });
    P(s).ship = at(3, 5);
    turn(s, 0, 'colonist', 'colonist', 'colonist');
    play(s, 'colonist', 'moveShip');
    act(s, { c: 'step', cell: at(4, 5) }, { c: 'disembark', cell: at(5, 5) });
    expect([s.move!.token, s.move!.points, P(s).inf]).toEqual(['infantry', 3, at(5, 5)]);
    act(s, { c: 'step', cell: at(5, 6) }, { c: 'embark' });
    expect([s.move!.token, s.move!.points, P(s).inf]).toEqual(['ship', 1, 'ship']);
    act(s, { c: 'step', cell: at(3, 5) });
    expect(P(s).ship).toBe(at(3, 5));
  });
  it('[M-9] the hold has four slots for goods, infantry and damage', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland' });
    colony(s, 0, at(5, 5));
    P(s).ship = at(4, 5);
    P(s).wh = stock({ goods: 6 });
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveShip');
    act(s, { c: 'cargo' });
    expect(Math.max(...legal(s).filter((c) => c.c === 'load').map((c) => c.n as number))).toBe(3);
    P(s).inf = at(5, 5);
    P(s).hold = stock({ goods: 4 });
    turn(s, 0, 'colonist');
    play(s, 'colonist', 'moveShip');
    expect(can(s, { c: 'embark' })).toBe(false);
  });
  it('[M-10] a damaged ship neither moves nor attacks', () => {
    const s = game(2);
    P(s).damage = 1;
    P(s).ship = at(5, 5);
    P(s, 1).ship = at(5, 6);
    turn(s, 0, 'captain');
    expect(canPlay(s, 'captain', 'moveShip')).toBe(false);
    expect(canPlay(s, 'captain', 'attack')).toBe(false);
  });
  it('[M-11] entering a ruin or wreck triggers it and may end the move', () => {
    const s = game(1);
    s.poi[at(1, 1)] = 'wreck';
    s.wreckDeck.push('calm_seas');
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveShip');
    act(s, { c: 'step', cell: at(1, 1) });
    expect(s.move).toBe(null);
    expect(s.poi[at(1, 1)]).toBeUndefined();
    s.poi[at(1, 2)] = 'ruin'; // not for ships
    play(s, 'colonist', 'moveShip');
    act(s, { c: 'step', cell: at(1, 2) });
    expect(s.poi[at(1, 2)]).toBe('ruin');
  });
  it('[M-12] infantry in Europe is boarded from a Europe cell for one point', () => {
    const s = game(1);
    P(s).inf = 'europe';
    turn(s, 0, 'colonist', 'colonist');
    expect(canPlay(s, 'colonist', 'moveInfantry')).toBe(false);
    play(s, 'colonist', 'moveShip');
    act(s, { c: 'embark' });
    expect([P(s).inf, s.move!.points]).toEqual(['ship', 4]);
    P(s).inf = 'europe';
    P(s).ship = at(1, 1);
    expect(can(s, { c: 'embark' })).toBe(false);
  });
  it('[M-13] a ship sent to Europe goes to the nearest free cell with infantry and cargo', () => {
    const s = game(2);
    P(s).ship = at(3, 8);
    P(s).hold = stock({ silver: 2 });
    P(s, 1).ship = at(0, 8);
    poi(s, 'wreck', 'message_in_a_bottle_1');
    act(s, { id: 'deliver' });
    expect(s.map.zone[P(s).ship]).toBe('europe');
    expect(P(s).ship).not.toBe(at(0, 8));
    expect(map.distance(s, P(s).ship, at(3, 8))).toBe(3);
    expect([P(s).inf, P(s).hold.silver]).toEqual(['ship', 2]);
  });
  it('[M-14] damage sends a ship to repair, unless switched off', () => {
    const s = game(1);
    P(s).ship = at(5, 5);
    runTasks(s, { t: 'damage', p: 0, amount: 1 });
    expect(s.map.zone[P(s).ship]).toBe('europe');
    const y = game(1);
    world(y, { [at(5, 5)]: 'grassland' });
    colony(y, 0, at(5, 5));
    build(y, 0, 'docks', 'shipyard');
    P(y).ship = at(8, 8);
    runTasks(y, { t: 'damage', p: 0, amount: 1 });
    act(y, { c: 'cell', cell: at(4, 4) });
    expect(P(y).ship).toBe(at(4, 4));
    const off = game(1, defWith({ 'settings.damage.sendsToEurope': false }));
    P(off).ship = at(5, 5);
    runTasks(off, { t: 'damage', p: 0, amount: 1 });
    expect(P(off).ship).toBe(at(5, 5));
  });
});

describe('Colonies', () => {
  it('[F-1] first free, then 5 food, at most three', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 8)]: 'grassland', [at(8, 5)]: 'grassland', [at(8, 8)]: 'grassland' });
    const found = (cell: number, food: number) => { P(s).inf = cell; P(s).wh = stock({ food }); turn(s, 0, 'colonist', 'colonist'); return canPlay(s, 'colonist', 'found') ? (play(s, 'colonist', 'found'), true) : false; };
    expect(found(at(5, 5), 0)).toBe(true);
    expect(found(at(5, 8), 4)).toBe(false);
    expect(found(at(5, 8), 6)).toBe(true);
    expect(P(s).wh.food).toBe(1);
    expect(found(at(8, 5), 5)).toBe(true);
    expect(found(at(8, 8), 6)).toBe(false);
  });
  it('[F-2] where a colony may be founded', () => {
    const s = game(1);
    world(s, { [at(2, 5)]: 'grassland', [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland', [at(6, 6)]: 'grassland', [at(9, 9)]: 'grassland' });
    expect(map.colonyProblem(s, at(2, 5))).toMatch(/edge/);
    expect(map.colonyProblem(s, at(4, 4))).toMatch(/land/);
    expect(map.colonyProblem(s, at(5, 5))).toBe(null);
    settle(s, 'sioux', at(6, 6));
    expect(map.colonyProblem(s, at(5, 5))).toMatch(/settlement/);
    s.settlements = [];
    colony(s, 0, at(6, 6));
    expect(map.colonyProblem(s, at(5, 5))).toMatch(/colony/);
    // A lake does not connect to Europe.
    s.colonies = [];
    const ring = Object.fromEntries([8, 9, 10, 11].flatMap((r) => [8, 9, 10, 11].map((c) => [at(r, c), 'grassland' as const])));
    world(s, { ...ring, [at(10, 10)]: 'ocean' });
    expect(map.colonyProblem(s, at(9, 9))).toMatch(/passage/);
    // An unrevealed fragment closes the way.
    world(s, { [at(5, 5)]: 'grassland' });
    s.revealed = s.revealed.map((_, i) => i === 5);
    expect(map.colonyProblem(s, at(5, 5))).toMatch(/passage/);
  });
  it('[F-3] plundering never removes a colony', () => {
    const s = game(2);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    colony(s, 1, at(5, 6));
    P(s).inf = at(5, 5);
    P(s, 1).hand = [];
    P(s, 1).deck = [];
    P(s, 1).discard = [];
    turn(s, 0, 'dragoon', 'dragoon');
    rig(s, 5, 5, 5);
    play(s, 'dragoon', 'attack');
    act(s, { c: 'done' });
    expect(s.colonies.length).toBe(1);
    expect(P(s).inf).toBe('europe'); // no own colony to return to
  });
  it('[F-4] buildings and warehouse serve all colonies', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland', [at(8, 8)]: 'mountains' });
    colony(s, 0, at(5, 5));
    colony(s, 0, at(8, 8));
    build(s, 0, 'stockade');
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'produce', { icon: 'silver' });
    play(s, 'colonist', 'produce', { icon: 'corn' });
    expect([P(s).wh.silver, P(s).wh.food]).toEqual([1, 1]);
  });
  it('[F-5] capacity 6, or 12 with a warehouse', () => {
    const s = game(1);
    P(s).wh = stock({ food: 13 });
    runTasks(s, { t: 'overflow', p: 0, from: 'wh' });
    expect(P(s).wh.food).toBe(6);
    build(s, 0, 'warehouse');
    P(s).wh = stock({ food: 13 });
    runTasks(s, { t: 'overflow', p: 0, from: 'wh' });
    expect(P(s).wh.food).toBe(12);
  });
});

describe('Europe', () => {
  it('[A-1] trade sells from the hold; the track is as long as the number of players', () => {
    const s = game(3);
    P(s).hold = stock({ silver: 2, crops: 1 });
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'trade');
    act(s, { c: 'sell', r: 'silver', n: 2 }, { c: 'done' });
    expect([P(s).gold, s.demand.silver, s.price.silver, P(s).hold.crops]).toEqual([10, 2, 5, 1]);
    const away = game(1);
    P(away).ship = at(3, 3);
    P(away).hold = stock({ silver: 1 });
    turn(away, 0, 'colonist');
    expect(canPlay(away, 'colonist', 'trade')).toBe(false);
  });
  it('[A-2] old price for the whole action, several drops, excess kept', () => {
    const s = game(2);
    P(s).hold = stock({ silver: 4 });
    s.demand.silver = 1;
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'trade');
    act(s, { c: 'sell', r: 'silver', n: 4 });
    expect([P(s).gold, s.price.silver, s.demand.silver]).toEqual([20, 3, 1]);
  });
  it('[A-3] hire one or two different agents, or refresh the pier', () => {
    const s = game(1);
    s.pier = [['colonist', 'colonist'], ['farmer'], ['soldier'], ['scout'], ['miner']];
    P(s).gold = 12;
    turn(s, 0, 'sailor', 'sailor', 'sailor');
    play(s, 'sailor', 'hire');
    act(s, { c: 'buy', agent: 'colonist' });
    expect(can(s, { c: 'buy', agent: 'colonist' })).toBe(false);
    act(s, { c: 'buy', agent: 'farmer' });
    expect(P(s).discard).toEqual(expect.arrayContaining(['colonist', 'farmer']));
    expect([P(s).gold, s.pier.length, s.pending!.kind]).toEqual([7, 5, 'turn']);
    const before = s.pier.flat().length;
    play(s, 'sailor', 'hire');
    act(s, { c: 'refresh' });
    expect(s.agentDiscard.length).toBe(before);
    expect(s.pier.length).toBe(5);
  });
  it('[A-4] the common discard is reshuffled when the deck is empty', () => {
    const s = game(1);
    s.agentDiscard = s.agentDeck;
    s.agentDeck = [];
    s.pier = s.pier.slice(0, 4);
    P(s).crosses = 1;
    act(s, { c: 'recruit' });
    expect(s.agentDiscard.length).toBe(0);
  });
  it('[A-5] propaganda takes up to two Fathers', () => {
    const s = game(1);
    s.salon = ['squanto', 'john_rolfe', 'peter_minuit', 'thomas_jefferson', 'benjamin_franklin'];
    P(s).bells = 9;
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'propaganda');
    act(s, { c: 'take', father: 'squanto' }, { c: 'take', father: 'peter_minuit' });
    expect([P(s).fathers, P(s).bells, s.salon.length, s.pending!.kind]).toEqual([['squanto', 'peter_minuit'], 4, 5, 'turn']);
    father(s, 0, 'francis_drake', 'henry_hudson');
    turn(s, 0, 'colonist');
    expect(canPlay(s, 'colonist', 'propaganda')).toBe(false);
  });
  it('[A-6] repair: one damage in Europe, all with a shipyard at a colony', () => {
    const s = game(1);
    P(s).damage = 3;
    turn(s, 0, 'colonist', 'colonist', 'colonist');
    play(s, 'colonist', 'repair');
    expect(P(s).damage).toBe(2);
    world(s, { [at(5, 5)]: 'grassland' });
    colony(s, 0, at(5, 5));
    build(s, 0, 'docks', 'shipyard');
    P(s).ship = at(4, 4);
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'shipyard');
    expect(P(s).damage).toBe(0);
  });
  it('[A-7] cross recruitment costs the round number and shows the top agent', () => {
    const s = game(1);
    s.round = 3;
    P(s).crosses = 4;
    const top = s.agentDeck.at(-1)!;
    act(s, { c: 'recruit' }, { c: 'take', card: top });
    expect([P(s).crosses, P(s).discard.includes(top)]).toEqual([1, true]);
    const next = s.agentDeck.at(-1)!;
    P(s).crosses = 6;
    act(s, { c: 'recruit' }, { c: 'top' });
    expect(s.agentDeck.at(-1)).toBe(next);
    act(s, { c: 'recruit' }, { c: 'bottom' });
    expect(s.agentDeck[0]).toBe(next);
  });
});

describe('Engine', () => {
  it('rejects illegal choices without changing the state', () => {
    const s = game(1);
    const before = JSON.stringify({ ...s, def: 0 });
    expect(() => applyInPlace(s, { c: 'play', card: 'nobody', a: 'found' })).toThrow(IllegalChoice);
    expect(JSON.stringify({ ...s, def: 0 })).toBe(before);
  });
  it('apply leaves the original state alone', () => {
    const s = game(1);
    const n = apply(s, { c: 'pass' });
    expect(s.pending!.kind).toBe('turn');
    expect(n).not.toBe(s);
    expect(problems(s).length).toBeGreaterThanOrEqual(0);
    expect(scorePlayer(s, 0).score).toBe(1);
  });
});
