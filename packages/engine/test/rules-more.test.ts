import { describe, expect, it } from 'vitest';
import { map, attackOptions, buildingDefence, cardStrength, cellYield, cellYields, combatStrength, findLoyalist, legal, rebelOrder, scorePlayer, siegeStrength, workableCells } from '../src/index.ts';
import { push, run } from '../src/core.ts';
import { act, at, boardWith, build, canPlay, colony, def, defWith, event, father, game, opt, P, play, poi, rig, runTasks, settle, stock, total, turn, world } from './h.ts';

/** Infantry of both players next to each other on grassland. */
function duel(n = 2, d?: ReturnType<typeof defWith>) {
  const s = d ? game(n, d) : game(n);
  world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland', [at(5, 7)]: 'forest' });
  P(s).inf = at(5, 5);
  P(s, 1).inf = at(5, 6);
  Object.assign(P(s, 1), { hand: [], deck: [], discard: [] });
  return s;
}

describe('Combat', () => {
  it('[C-1] adjacent target and the right kind of agent', () => {
    const s = duel();
    expect(attackOptions(s, 0, 'colonist')).toEqual([]);
    expect(attackOptions(s, 0, 'corsair')).toEqual([]);
    expect(attackOptions(s, 0, 'soldier')).toEqual([{ card: 'soldier', token: 'infantry', mode: 'land', cell: at(5, 6) }]);
    P(s, 1).inf = at(5, 7);
    expect(attackOptions(s, 0, 'soldier')).toEqual([]);
    P(s).ship = at(8, 8);
    P(s, 1).ship = at(8, 9);
    expect(attackOptions(s, 0, 'corsair').map((o) => o.mode)).toEqual(['naval']);
    expect(attackOptions(s, 0, 'captain').map((o) => o.mode)).toEqual(['naval']);
  });
  it('[C-2] both sides add cards secretly, the defender may add the unseen top card', () => {
    const s = duel();
    Object.assign(P(s, 1), { hand: ['colonist'], deck: ['soldier'], discard: [] });
    turn(s, 0, 'soldier', 'colonist', 'farmer', 'sailor');
    play(s, 'soldier', 'attack');
    expect(s.pending).toMatchObject({ kind: 'commit', player: 0 });
    act(s, { c: 'add', card: 'colonist' }, { c: 'add', card: 'farmer' }, { c: 'done' });
    expect(s.pending).toMatchObject({ kind: 'commit', player: 1 });
    act(s, { c: 'add', card: 'colonist' }, { c: 'top' });
    expect(P(s, 1).discard.sort()).toEqual(['colonist', 'soldier']);
  });
  it('[C-3] strength counts cards, bonuses, terrain', () => {
    const s = duel();
    const c = { attacker: 0, defender: 1, token: 'infantry', mode: 'land', target: 'infantry', from: at(5, 5), cell: at(5, 7), bombard: false, card: 'soldier', a: ['dragoon', 'colonist'], d: ['soldier'], top: null } as const;
    const r = combatStrength(s, c as never);
    expect(r.attack.total).toBe(3 + 2 + 3);
    expect(r.defence.total).toBe(1 + 2 + 1);
    const no = duel(2, defWith({ 'settings.combat.countPlayedCard': false }));
    expect(combatStrength(no, c as never).attack.total).toBe(7);
  });
  it('[C-4] each side uses its own token kind', () => {
    const s = game(2);
    expect(cardStrength(s, 'corsair', 'ship', false, at(5, 5))).toBe(2);
    expect(cardStrength(s, 'corsair', 'infantry', false, at(5, 5))).toBe(0);
    expect(cardStrength(s, 'cannoneer', 'best', false, at(5, 5))).toBe(1);
    const c = { attacker: 0, defender: 1, token: 'infantry', mode: 'shore', target: 'ship', from: at(5, 5), cell: at(4, 5), bombard: false, card: 'soldier', a: [], d: ['corsair', 'soldier'], top: null };
    expect(combatStrength(s, c as never).defence.total).toBe(2 + 2);
  });
  it('[C-5] only a stronger attacker rolls, 5 and 6 succeed', () => {
    const s = duel();
    Object.assign(P(s, 1), { hand: ['soldier'] });
    turn(s, 0, 'soldier', 'soldier');
    play(s, 'soldier', 'attack');
    act(s, { c: 'done' }, { c: 'add', card: 'soldier' });
    expect(P(s, 1).inf).toBe(at(5, 6)); // 3 against 3
    for (const [d, won] of [[4, false], [3, false], [5, true], [6, true]] as const) {
      const t = duel();
      turn(t, 0, 'soldier', 'farmer');
      P(t).hand = ['soldier', 'farmer'];
      play(t, 'soldier', 'attack');
      P(t, 1).hand = [];
      rig(t, d, 1, 1);
      act(t, { c: 'done' });
      expect(P(t, 1).inf === 'europe').toBe(won);
    }
    const cap = defWith({ 'settings.combat.diceCap': 1 });
    const t = duel(2, cap);
    t.logging = true;
    turn(t, 0, 'soldier', 'farmer');
    play(t, 'soldier', 'attack');
    act(t, { c: 'done' });
    expect((t.log.find((e) => e.e === 'combat')!.dice as number[]).length).toBe(1);
  });
  it('[C-6] a beaten land token goes to Europe', () => {
    const s = duel();
    turn(s, 0, 'dragoon', 'farmer');
    play(s, 'dragoon', 'attack');
    rig(s, 5, 5, 5, 5);
    act(s, { c: 'done' });
    expect(P(s, 1).inf).toBe('europe');
    expect(P(s).inf).toBe(at(5, 5));
  });
  it('[C-7] ship battles: damage, looting, retreat', () => {
    const s = game(2);
    P(s).ship = at(5, 5);
    P(s).inf = 'europe';
    P(s, 1).ship = at(5, 6);
    P(s, 1).hold = stock({ silver: 2, goods: 1 });
    P(s, 1).hand = [];
    P(s, 1).deck = [];
    P(s, 1).discard = [];
    P(s).hold = stock({ food: 2 });
    turn(s, 0, 'captain', 'farmer');
    play(s, 'captain', 'attack', { mode: 'naval' });
    rig(s, 5, 5, 1, 1);
    act(s, { c: 'done' }, { c: 'take', r: 'silver' }, { c: 'take', r: 'silver' });
    act(s, { c: 'leave' });
    expect(P(s).hold).toMatchObject({ silver: 2, food: 2 });
    expect([P(s, 1).damage, s.map.zone[P(s, 1).ship], P(s, 1).hold.goods]).toEqual([2, 'europe', 1]);
    expect(P(s).bells).toBe(1);
    // Cargo beyond the damaged hold is lost. Infantry takes no cargo.
    const t = duel();
    P(t, 1).inf = 'europe';
    P(t, 1).ship = at(4, 5);
    P(t, 1).hold = stock({ silver: 4 });
    turn(t, 0, 'dragoon', 'farmer');
    play(t, 'dragoon', 'attack', { mode: 'shore' });
    rig(t, 5, 5, 1);
    act(t, { c: 'done' });
    expect([P(t, 1).damage, P(t, 1).hold.silver, total(P(t).hold)]).toEqual([2, 2, 0]);
    // Never more than four.
    runTasks(t, { t: 'damage', p: 1, amount: 9 });
    expect(P(t, 1).damage).toBe(4);
  });
  it('[C-8] attacking a colony', () => {
    const s = duel();
    P(s, 1).inf = 'europe';
    colony(s, 1, at(5, 6));
    colony(s, 0, at(9, 9));
    s.map.terrain[at(9, 9)] = 'grassland';
    build(s, 1, 'stockade', 'docks');
    P(s, 1).wh = stock({ silver: 1 });
    expect(buildingDefence(s, 1).map((x) => x.value)).toEqual([1]);
    build(s, 1, 'fort');
    expect(buildingDefence(s, 1).map((x) => x.value)).toEqual([1, 2]);
    turn(s, 0, 'dragoon', 'dragoon', 'dragoon');
    play(s, 'dragoon', 'attack');
    rig(s, 5, 5, 1, 1, 1);
    act(s, { c: 'add', card: 'dragoon' }, { c: 'add', card: 'dragoon' });
    expect(s.pending).toMatchObject({ kind: 'plunder', player: 0 });
    // Cheapest first: docks cost 1. The stockade is protected by the fort.
    expect(legal(s).map((c) => c.b ?? c.r)).toEqual(['silver', 'docks']);
    act(s, { c: 'take', r: 'silver' });
    expect(P(s).wh.silver).toBe(1);
    expect(P(s, 1).buildings).not.toContain('docks'); // the only thing left, taken without asking
    expect([s.buildingsLeft.docks, P(s).inf]).toEqual([5, at(9, 9)]);
    // Infantry inside is not a separate target.
    P(s).inf = at(5, 5);
    P(s, 1).inf = at(5, 6);
    expect(attackOptions(s, 0, 'soldier').length).toBe(1);
    turn(s, 0, 'soldier', 'farmer');
    play(s, 'soldier', 'attack');
    expect(s.combat!.target).toBe('colony');
  });
  it('[C-8] a bombarding ship stays where it is', () => {
    const s = duel();
    P(s, 1).inf = 'europe';
    colony(s, 1, at(5, 6));
    P(s).ship = at(4, 6);
    P(s, 1).wh = stock({ silver: 1 });
    turn(s, 0, 'cannoneer', 'dragoon');
    play(s, 'cannoneer', 'attack', { mode: 'bombard' });
    rig(s, 5, 1, 1, 1);
    act(s, { c: 'add', card: 'dragoon' });
    expect([P(s).ship, P(s).inf, P(s).wh.silver]).toEqual([at(4, 6), at(5, 5), 1]);
  });
  it('[C-9] landing and shore penalties', () => {
    const s = duel();
    P(s).inf = 'ship';
    P(s).ship = at(4, 6);
    const base = { attacker: 0, defender: 1, token: 'infantry', target: 'infantry', from: at(4, 6), cell: at(5, 6), bombard: false, card: 'soldier', a: [], d: [], top: null };
    expect(attackOptions(s, 0, 'soldier').map((o) => o.mode)).toEqual(['landing']);
    expect(combatStrength(s, { ...base, mode: 'landing' } as never).attack.total).toBe(2);
    expect(combatStrength(s, { ...base, mode: 'shore', target: 'ship' } as never).attack.total).toBe(2);
  });
  it('[C-10] bombardment', () => {
    const s = duel();
    P(s).ship = at(4, 6);
    expect(attackOptions(s, 0, 'cannoneer').map((o) => `${o.token} ${o.mode}`)).toEqual(['ship bombard']);
    P(s, 1).ship = at(4, 5);
    expect(attackOptions(s, 0, 'cannoneer').map((o) => `${o.token} ${o.mode}`)).toContain('infantry bombard');
    expect(attackOptions(s, 0, 'corsair').some((o) => o.mode === 'bombard')).toBe(false);
    father(s, 0, 'michiel_de_ruyter');
    expect(attackOptions(s, 0, 'corsair').some((o) => o.token === 'ship' && o.mode === 'bombard')).toBe(true);
    expect(attackOptions(s, 0, 'soldier').some((o) => o.token === 'infantry' && o.mode === 'bombard')).toBe(false);
  });
  it('[C-11] a victory gives one bell whatever the damage', () => {
    const s = duel();
    turn(s, 0, 'dragoon', 'farmer');
    play(s, 'dragoon', 'attack');
    rig(s, 5, 5, 5, 5);
    act(s, { c: 'done' });
    expect(P(s).bells).toBe(1);
  });
  it('[C-12] tokens in Europe are safe', () => {
    const s = game(2);
    P(s).ship = at(1, 2);
    expect(attackOptions(s, 0, 'captain')).toEqual([]);
    const t = game(2, defWith({ 'settings.europe.safe': false }));
    P(t).ship = at(1, 2);
    expect(attackOptions(t, 0, 'captain').length).toBe(1);
  });
  it('[C-13] committed cards go to the discards', () => {
    const s = duel();
    Object.assign(P(s, 1), { hand: ['miner'] });
    P(s).discard = [];
    turn(s, 0, 'soldier', 'farmer', 'sailor');
    play(s, 'soldier', 'attack');
    act(s, { c: 'add', card: 'farmer' }, { c: 'done' }, { c: 'add', card: 'miner' });
    expect(P(s).discard.sort()).toEqual(['farmer', 'soldier']);
    expect(P(s, 1).discard).toEqual(['miner']);
  });
});

describe('Colony actions', () => {
  function farm(land: Parameters<typeof world>[1] = {}) {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland', ...land });
    colony(s, 0, at(5, 5));
    P(s).ship = at(0, 0);
    return s;
  }
  it('[R-1] the colony cell and its empty neighbours', () => {
    const s = game(2);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'forest', [at(5, 7)]: 'forest', [at(6, 6)]: 'grassland' });
    colony(s, 0, at(5, 5));
    expect(workableCells(s, 0).length).toBe(9);
    expect(workableCells(s, 0)).not.toContain(at(5, 7));
    P(s, 1).inf = at(5, 6);
    P(s).inf = at(6, 6);
    settle(s, 'sioux', at(4, 4));
    expect(workableCells(s, 0).length).toBe(6);
    const t = game(1, defWith({ 'settings.production.emptyMeans': 'noForeignToken' }));
    world(t, { [at(5, 5)]: 'grassland', [at(6, 6)]: 'grassland' });
    colony(t, 0, at(5, 5));
    P(t).inf = at(6, 6);
    expect(workableCells(t, 0).length).toBe(9);
  });
  it('[R-2] terrain yields', () => {
    const s = farm({ [at(5, 6)]: 'forest', [at(6, 5)]: 'mountains', [at(6, 6)]: 'desert', [at(4, 4)]: 'tundra' });
    const y = (cell: number) => cellYields(s, 0, 'colonist').filter((x) => x.cell === cell).map((x) => `${x.icon}${x.total}`);
    expect(y(at(5, 5))).toEqual(['crops1']); // DD-63: grassland gives crops only
    expect(y(at(5, 6))).toEqual(['timber1']);
    expect(y(at(6, 5))).toEqual(['silver1']);
    expect(y(at(6, 6))).toEqual([]);
    expect(y(at(4, 4))).toEqual([]);
    expect(y(at(4, 5))).toEqual(['food1']);
  });
  it('[R-2] forest gives fur only with its bonus (DD-56)', () => {
    const s = farm({ [at(5, 6)]: 'forest' });
    s.map.bonus[at(5, 6)] = 'crops';
    expect(cellYields(s, 0, 'colonist').filter((x) => x.cell === at(5, 6)).map((x) => `${x.icon}${x.total}`)).toEqual(['timber1', 'crops1']);
  });
  it('[R-3] ocean gives 1, through docks 2, with fish 3, with a fisherman 4', () => {
    const s = farm();
    const fish = (card: string, a: string) => { turn(s, 0, card, card); P(s).wh = stock({}); play(s, card, a, a === 'docks' ? {} : { icon: 'food' }); return P(s).wh.food; };
    expect(fish('colonist', 'produce')).toBe(1);
    expect(canPlay(s, 'colonist', 'docks')).toBe(false);
    build(s, 0, 'docks');
    turn(s, 0, 'colonist', 'colonist');
    expect(fish('colonist', 'docks')).toBe(2);
    expect(fish('criminal', 'docks')).toBe(2);
    s.map.bonus[at(4, 4)] = 'food';
    turn(s, 0, 'fisherman', 'fisherman');
    const best = legal(s).filter((c) => c.a === 'docks').map((c) => c.cell as number);
    expect(best).toContain(at(4, 4));
    P(s).wh = stock({});
    play(s, 'fisherman', 'docks', { cell: at(4, 4) });
    expect(P(s).wh.food).toBe(4);
  });
  it('[R-4] bonus icons add one, or allow one where the terrain yields nothing', () => {
    const s = farm({ [at(5, 5)]: { t: 'grassland', bonus: 'crops' }, [at(5, 6)]: { t: 'mountains', bonus: 'crops' } });
    expect(cellYield(s, 0, 'colonist', at(5, 5), 'crops')!.total).toBe(2);
    expect(cellYield(s, 0, 'colonist', at(5, 5), 'food')).toBe(null);
    expect(cellYield(s, 0, 'colonist', at(5, 6), 'crops')!.total).toBe(1);
    expect(cellYield(s, 0, 'farmer', at(5, 6), 'crops')!.total).toBe(2);
  });
  it('[R-5] the cossack works empty tundra', () => {
    const s = farm({ [at(5, 6)]: 'tundra', [at(6, 5)]: 'forest' });
    expect(cellYield(s, 0, 'cossack_russian', at(5, 6), 'crops')!.total).toBe(2);
    expect(cellYield(s, 0, 'colonist', at(5, 6), 'crops')).toBe(null);
    expect(cellYield(s, 0, 'slave', at(5, 6), 'crops')).toBe(null);
    expect(cellYield(s, 0, 'trapper_french', at(6, 5), 'crops')!.total).toBe(1);
  });
  it('[R-6] the planter needs an island of three cells or fewer', () => {
    const s = farm({ [at(5, 6)]: 'desert', [at(6, 7)]: 'grassland' });
    expect(cellYield(s, 0, 'planter_danish', at(5, 5), 'crops')!.total).toBe(2);
    expect(cellYield(s, 0, 'planter_danish', at(5, 6), 'crops')!.total).toBe(1);
    s.map.terrain[at(7, 7)] = 'grassland';
    expect(cellYield(s, 0, 'planter_danish', at(5, 5), 'crops')!.total).toBe(1);
    expect(cellYield(s, 0, 'planter_danish', at(5, 6), 'crops')).toBe(null);
  });
  it('[R-7] buildings need education and can be worked repeatedly', () => {
    const s = farm();
    build(s, 0, 'town_hall', 'newspaper');
    turn(s, 0, 'criminal', 'colonist', 'politician', 'politician');
    expect(canPlay(s, 'criminal', 'work')).toBe(false);
    expect(canPlay(s, 'colonist', 'work', { building: 'newspaper' })).toBe(false);
    play(s, 'colonist', 'work', { building: 'town_hall' });
    play(s, 'politician', 'work', { building: 'newspaper' });
    play(s, 'politician', 'work', { building: 'newspaper' });
    expect(P(s).bells).toBe(1 + 3 + 3);
  });
  it('[R-8] workshop and factory', () => {
    const s = farm();
    build(s, 0, 'blacksmith_shop', 'factory');
    P(s).wh = stock({ crops: 2 });
    turn(s, 0, 'craftsman', 'craftsman', 'craftsman', 'craftsman');
    play(s, 'craftsman', 'work', { building: 'blacksmith_shop' });
    expect([P(s).wh.goods, P(s).wh.crops]).toEqual([2, 1]);
    play(s, 'craftsman', 'work', { building: 'factory' });
    expect([P(s).wh.goods, P(s).wh.crops]).toEqual([5, 0]);
    expect(canPlay(s, 'craftsman', 'work')).toBe(false);
  });
  it('[R-9] building limits', () => {
    const s = farm();
    P(s).wh = stock({ timber: 4 });
    turn(s, 0, 'colonist', 'colonist', 'builder', 'builder');
    expect(canPlay(s, 'colonist', 'build', { building: 'fort' })).toBe(false);
    play(s, 'colonist', 'build', { building: 'stockade' });
    expect(canPlay(s, 'colonist', 'build', { building: 'stockade' })).toBe(false);
    play(s, 'builder', 'build', { building: 'fort' });
    expect([P(s).wh.timber, P(s).buildings, s.buildingsLeft.fort]).toEqual([0, ['stockade', 'fort'], 0]);
    build(s, 0, 'docks', 'warehouse', 'chapel', 'school');
    P(s).wh = stock({ timber: 6 });
    turn(s, 0, 'colonist', 'colonist');
    expect(canPlay(s, 'colonist', 'build')).toBe(false);
  });
  it('[R-10] schooling: the agent played becomes any profession the school teaches, from the deck, the discard or the pier (DD-73)', () => {
    const s = farm();
    build(s, 0, 'school');
    s.agentDeck.push('soldier');
    turn(s, 0, 'criminal', 'farmer');
    P(s).discard = [];
    // A school takes anyone, a criminal too, and teaches 📖 professions only.
    expect(canPlay(s, 'criminal', 'teach', { target: 'soldier' })).toBe(true);
    expect(canPlay(s, 'criminal', 'teach', { target: 'priest' })).toBe(false);
    play(s, 'criminal', 'teach', { target: 'soldier' });
    expect(P(s).discard).toEqual(['soldier']);
    expect(s.agentDiscard).toContain('criminal');
    expect(P(s).hand).toEqual(['farmer']);
    // A university takes agents with 📖 or more and teaches 🎓 professions; a nation's agent leaves the game; the copy may come from the pier.
    build(s, 0, 'university');
    s.agentDeck = s.agentDeck.filter((c) => c !== 'dragoon');
    s.agentDiscard = s.agentDiscard.filter((c) => c !== 'dragoon');
    s.pier[0] = ['dragoon'];
    turn(s, 0, 'puritan_english', 'criminal');
    expect(canPlay(s, 'criminal', 'teach', { target: 'dragoon' })).toBe(false);
    play(s, 'puritan_english', 'teach', { target: 'dragoon' });
    expect(P(s).discard).toContain('dragoon');
    expect([...P(s).hand, ...P(s).deck, ...P(s).discard]).not.toContain('puritan_english');
    expect(s.agentDiscard).not.toContain('puritan_english');
    expect(s.pier.some((st) => st[0] === 'dragoon')).toBe(false);
  });
  it('[R-11] custom house', () => {
    const s = farm();
    build(s, 0, 'warehouse', 'custom_house');
    P(s).wh = stock({ goods: 2 });
    turn(s, 0, 'negotiant_dutch', 'smuggler');
    expect(canPlay(s, 'smuggler', 'customs')).toBe(false);
    play(s, 'negotiant_dutch', 'customs', { r: 'goods' });
    // Two goods (DD-79), each at the price of the moment: 5 + 1, then 4 + 1.
    expect([P(s).gold, s.price.goods]).toEqual([11, 3]);
  });
  it('[R-12] supply', () => {
    const s = farm();
    P(s).wh = stock({ food: 1 });
    P(s).deck = ['miner'];
    turn(s, 0, 'colonist', 'sailor');
    play(s, 'colonist', 'supply');
    expect([P(s).hand, P(s).wh.food]).toEqual([['sailor', 'miner'], 0]);
  });
  it('[R-13] exchange', () => {
    const s = game(1);
    P(s).deck = ['miner'];
    turn(s, 0, 'colonist', 'sailor', 'farmer');
    play(s, 'colonist', 'exchange', { other: 'sailor' });
    expect(P(s).hand).toEqual(['farmer', 'miner']);
    expect(P(s).discard).toEqual(expect.arrayContaining(['colonist', 'sailor']));
  });
  it('[R-14] smuggling', () => {
    const s = farm();
    P(s).wh = stock({ silver: 2 });
    turn(s, 0, 'smuggler', 'colonist');
    expect(canPlay(s, 'colonist', 'smuggle')).toBe(false);
    play(s, 'smuggler', 'smuggle', { r: 'silver' });
    expect([P(s).gold, s.price.silver, s.demand.silver]).toEqual([4, 5, 0]);
  });
  it('[R-15] crosses are capped, bells are not', () => {
    const s = farm();
    build(s, 0, 'chapel', 'town_hall');
    P(s).crosses = 15;
    P(s).bells = 30;
    turn(s, 0, 'colonist', 'colonist', 'colonist');
    play(s, 'colonist', 'work', { building: 'chapel' });
    play(s, 'colonist', 'work', { building: 'town_hall' });
    expect([P(s).crosses, P(s).bells]).toEqual([15, 31]);
  });
});

describe('Natives', () => {
  function village(o: Parameters<typeof settle>[3] = {}, n = 1) {
    const s = game(n);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland', [at(5, 9)]: 'grassland', [at(9, 9)]: 'mountains' });
    P(s).inf = at(5, 5);
    settle(s, 'sioux', at(5, 6), o);
    return s;
  }
  it('[N-1] tribes match terrain, six settlements at most', () => {
    const s = game(1);
    const land: Parameters<typeof world>[1] = {};
    for (let i = 0; i < 9; i++) land[at(2 + Math.floor(i / 3), 2 + (i % 3))] = { t: 'forest', poi: 'village' };
    world(s, land);
    s.revealed[0] = false;
    runReveal(s, 0);
    expect(s.settlements.length).toBe(6);
    expect(s.settlements.every((x) => s.def.tribes[x.tribe].terrain === 'forest')).toBe(true);
    const t = game(1);
    world(t, { [at(2, 2)]: { t: 'tundra', poi: 'village' } });
    t.tribeDeck = t.tribeDeck.filter((x) => x !== 'inuit');
    t.revealed[0] = false;
    runReveal(t, 0);
    expect(t.settlements.length).toBe(0);
  });
  it('[N-2] settlements are numbered in order of appearance', () => {
    const s = village();
    settle(s, 'inca', at(9, 9));
    expect(s.settlements.map((x) => x.n)).toEqual([1, 2]);
  });
  it('[N-3] hostility is shared by the tribe and limited', () => {
    const s = village({ hostility: 2 });
    settle(s, 'sioux', at(5, 9));
    P(s).wh = stock({ goods: 1 });
    turn(s, 0, 'colonist', 'colonist');
    rig(s, 5, 5, 5);
    play(s, 'colonist', 'gift');
    expect(s.hostility.sioux).toBe(0);
  });
  it('[N-4] a token must be adjacent', () => {
    const s = village({ hostility: 0 });
    P(s).crosses = 5;
    turn(s, 0, 'colonist', 'colonist');
    expect(canPlay(s, 'colonist', 'preach')).toBe(true);
    P(s).inf = at(5, 9);
    expect(canPlay(s, 'colonist', 'preach')).toBe(false);
    P(s).ship = at(4, 6);
    expect(canPlay(s, 'colonist', 'preach')).toBe(true);
  });
  it('[N-5] gift', () => {
    const s = village({ hostility: 5 });
    P(s).wh = stock({ goods: 2 });
    turn(s, 0, 'colonist', 'colonist');
    // No dice: hostility falls by 3 (DD-86).
    play(s, 'colonist', 'gift');
    expect([s.hostility.sioux, P(s).wh.goods]).toEqual([2, 1]);
  });
  it('[N-6] preach', () => {
    const s = village({ hostility: 3, pop: 1 });
    P(s).crosses = 3;
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'preach');
    expect([P(s).crosses, s.hostility.sioux, s.settlements[0].alive, P(s).discard.includes('indian'), s.nativesLeft, P(s).wh.crops]).toEqual([0, 4, false, true, 7, 0]);
    const min = game(1, defWith({ 'settings.natives.preachMin': 1 }));
    world(min, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    P(min).inf = at(5, 5);
    settle(min, 'sioux', at(5, 6), { hostility: 0 });
    turn(min, 0, 'colonist', 'colonist');
    expect(canPlay(min, 'colonist', 'preach')).toBe(false);
  });
  it('[N-7] attack', () => {
    const s = village({ hostility: 1, pop: 1 });
    turn(s, 0, 'soldier', 'colonist');
    play(s, 'soldier', 'attack');
    rig(s, 1, 1);
    act(s, { c: 'done' });
    expect([s.hostility.sioux, s.settlements[0].pop]).toEqual([5, 1]); // lost, still angry
    turn(s, 0, 'soldier', 'colonist');
    play(s, 'soldier', 'attack');
    rig(s, 5, 5);
    act(s, { c: 'done' }, { c: 'yes' });
    expect([s.settlements[0].alive, P(s).bells, P(s).discard.includes('indian'), P(s).wh.crops]).toEqual([false, 1, true, 3]);
    const m = village({ pop: 2 });
    s.settlements = [];
    settle(m, 'inca', at(9, 9), { pop: 4 });
    const c = { attacker: 0, defender: null, token: 'infantry', mode: 'land', target: 'settlement', from: at(5, 5), cell: at(9, 9), bombard: false, card: 'soldier', a: [], d: [], top: null };
    expect(combatStrength(m, c as never).defence.total).toBe(6);
  });
  it('[N-8] loot goes to the player and the warehouse', () => {
    const s = village();
    settle(s, 'inca', at(5, 9), { pop: 1 });
    s.map.terrain[at(5, 8)] = 'grassland';
    P(s).inf = at(5, 8);
    turn(s, 0, 'dragoon', 'dragoon');
    play(s, 'dragoon', 'attack');
    rig(s, 5, 5, 5);
    act(s, { c: 'done' }, { c: 'no' });
    expect(P(s).gold).toBe(25);
    expect(P(s).discard).not.toContain('indian');
  });
  it('[N-9] alliance', () => {
    const s = village({ hostility: 1 });
    turn(s, 0, 'colonist', 'politician', 'scout');
    expect([canPlay(s, 'colonist', 'alliance'), canPlay(s, 'politician', 'alliance'), canPlay(s, 'scout', 'alliance')]).toEqual([false, true, true]);
    s.hostility.sioux = 2;
    expect(canPlay(s, 'scout', 'alliance')).toBe(false);
    father(s, 0, 'john_smith');
    s.hostility.sioux = 3;
    play(s, 'scout', 'alliance');
    expect(s.settlements[0].ally).toBe(0);
    turn(s, 0, 'scout', 'colonist');
    expect(canPlay(s, 'scout', 'alliance')).toBe(false);
    runTasks(s, { t: 'node', node: { n: 'hostilityAll', add: 1 }, p: 0 });
    expect(s.settlements[0].ally).toBe(null);
  });
  it('[N-10] native agents are limited', () => {
    const s = village({ hostility: 0 });
    s.nativesLeft = 0;
    turn(s, 0, 'colonist', 'colonist');
    expect(canPlay(s, 'colonist', 'preach')).toBe(false);
  });
  it('[N-11] activation', () => {
    const s = village({ hostility: 2 }, 2);
    runTasks(s, { t: 'activate', n: 1 });
    expect(P(s).wh.food).toBe(0); // no colony
    colony(s, 1, at(9, 9));
    colony(s, 0, at(5, 9));
    for (const [h, food] of [[0, 1], [1, 2], [2, 3], [3, 3]]) { s.hostility.sioux = h; runTasks(s, { t: 'activate', n: 1 }); expect(P(s).wh.food).toBe(food); }
    s.hostility.sioux = 4;
    runTasks(s, { t: 'activate', n: 1 });
    expect([P(s).wh.food, P(s, 1).wh.food]).toEqual([1, 0]);
    runTasks(s, { t: 'activate', n: 6 });
    s.settlements[0].alive = false;
    s.hostility.sioux = 0;
    runTasks(s, { t: 'activate', n: 1 });
    expect(P(s).wh.food).toBe(1);
  });
  it('[N-12] raid', () => {
    const s = village({ hostility: 5 });
    colony(s, 0, at(5, 9));
    P(s).wh = stock({ silver: 3 });
    build(s, 0, 'docks', 'shipyard');
    runTasks(s, { t: 'raid', n: 1 });
    expect(legal(s)).toEqual([{ c: 'resources' }, { c: 'destroy', b: 'shipyard' }]);
    act(s, { c: 'resources' });
    expect(P(s).wh.silver).toBe(1);
    runTasks(s, { t: 'raid', n: 1 });
    expect(P(s).buildings).toEqual(['docks']); // one resource is not enough
    P(s).buildings = [];
    runTasks(s, { t: 'raid', n: 1 });
    expect(P(s).wh.silver).toBe(0);
    P(s).wh = stock({ silver: 3 });
    build(s, 0, 'stockade', 'fort');
    runTasks(s, { t: 'raid', n: 1 });
    expect(P(s).wh.silver).toBe(3);
  });
  it('[N-13] Pocahontas lowers hostility for her owner only', () => {
    const s = village({ hostility: 4 }, 2);
    colony(s, 0, at(5, 9));
    P(s).wh = stock({ silver: 3 });
    father(s, 0, 'pocahontas');
    runTasks(s, { t: 'activate', n: 1 });
    expect([P(s).wh.silver, s.hostility.sioux]).toEqual([3, 4]);
  });
  it('[N-14] a settlement may appear next to a colony', () => {
    const s = game(1);
    world(s, { [at(5, 4)]: { t: 'grassland', poi: 'village' }, [at(5, 5)]: 'grassland' });
    colony(s, 0, at(5, 5));
    s.revealed[4] = false;
    runReveal(s, 4);
    expect(s.settlements.length).toBe(1);
  });
});
const runReveal = (s: ReturnType<typeof game>, f: number) => map.reveal(s, f, 0);

describe('Founding Father rules', () => {
  it('[B-1] limit of four, six with Jefferson', () => {
    const s = game(1);
    s.salon = ['thomas_jefferson', 'squanto', 'peter_minuit', 'john_rolfe', 'pocahontas'];
    P(s).fathers = ['francis_drake', 'jakob_fugger', 'pedro_cabral'];
    s.fatherDeck = s.fatherDeck.filter((f) => !P(s).fathers.includes(f));
    P(s).bells = 12;
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'propaganda');
    act(s, { c: 'take', father: 'thomas_jefferson' }, { c: 'take', father: 'peter_minuit' });
    expect(P(s).fathers.length).toBe(5);
    expect(s.pending).toMatchObject({ kind: 'propaganda' });
    act(s, { c: 'take', father: 'squanto' });
    expect(P(s).fathers.length).toBe(6);
    expect(s.salon.length).toBe(5);
  });
  const gain = (s: ReturnType<typeof game>, f: string) => {
    s.salon = [f, ...s.salon.filter((x) => x !== f)].slice(0, 5);
    return runTasks(s, { t: 'node', node: { n: 'cheapestFather' }, p: 0 });
  };
  const onGain = (s: ReturnType<typeof game>, f: string) => runTasks(s, { t: 'nodes', nodes: s.def.fathers[f].onGain, p: 0 });
  it('[B-2] Sepulveda gives two slaves, or as many as there are', () => {
    const s = game(1);
    s.agentDeck = s.agentDeck.filter((c) => c !== 'slave');
    s.agentDeck.unshift('slave');
    s.agentDiscard = ['slave'];
    onGain(s, 'juan_de_sepulveda');
    expect(P(s).discard.filter((c) => c === 'slave').length).toBe(2);
    onGain(s, 'juan_de_sepulveda');
    expect(P(s).discard.filter((c) => c === 'slave').length).toBe(2);
  });
  it('[B-3] Equiano replaces slaves, down to the minimum collection', () => {
    const s = game(1);
    Object.assign(P(s), { hand: ['slave'], deck: ['slave_english'], discard: ['colonist', 'colonist', 'colonist'] });
    s.agentDeck = ['miner', 'farmer'];
    onGain(s, 'olaudah_equiano');
    expect([...P(s).hand, ...P(s).deck, ...P(s).discard].sort()).toEqual(['colonist', 'colonist', 'colonist', 'farmer', 'miner']);
    expect(s.agentDiscard).toContain('slave');
    Object.assign(P(s), { hand: ['slave'], deck: [], discard: ['colonist', 'colonist', 'colonist'] });
    onGain(s, 'olaudah_equiano');
    expect(P(s).hand).toEqual(['slave']);
  });
  it('[B-4] Las Casas: free preaching, no attacks on natives', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    P(s).inf = at(5, 5);
    settle(s, 'sioux', at(5, 6), { hostility: 5 });
    father(s, 0, 'bartolome_de_las_casas');
    expect(attackOptions(s, 0, 'dragoon')).toEqual([]);
    turn(s, 0, 'colonist', 'sailor');
    play(s, 'colonist', 'preach');
    expect(P(s).discard).toContain('indian');
  });
  it('[B-5] production Fathers count their icon only', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'forest' });
    colony(s, 0, at(5, 5));
    father(s, 0, 'john_rolfe', 'squanto');
    s.map.bonus[at(5, 6)] = 'crops';
    const y = (cell: number, icon: 'crops' | 'food') => cellYield(s, 0, 'colonist', cell, icon)!.total;
    // John Rolfe adds to all crops, fur in the forest too (DD-76); Squanto to fish (DD-65).
    expect([y(at(5, 5), 'crops'), y(at(5, 6), 'crops'), y(at(4, 4), 'food')]).toEqual([2, 2, 2]);
  });
  it('[B-6] Champlain founds anywhere legal, within the limit', () => {
    const s = game(2);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 9)]: 'grassland', [at(9, 9)]: 'grassland', [at(2, 5)]: 'grassland' });
    P(s, 1).inf = at(5, 9);
    s.poi[at(9, 9)] = 'ruin';
    onGain(s, 'samuel_de_champlain');
    expect(legal(s).map((c) => c.cell ?? c.c)).toEqual([at(2, 5), at(5, 5), 'skip']);
    for (const c of [at(5, 5), at(7, 7), at(9, 5)]) colony(s, 0, c);
    onGain(s, 'samuel_de_champlain');
    expect(s.pending!.kind).toBe('stop');
  });
  it('[B-7] Jefferson brings the cheapest Father, chosen on ties', () => {
    const s = game(1);
    s.salon = ['squanto', 'peter_minuit', 'pocahontas'];
    gain(s, 'squanto');
    expect(legal(s).map((c) => c.father).sort()).toEqual(['peter_minuit', 'pocahontas']);
  });
  it('[B-8] Kosciuszko adds to the stockade or the fort, not both', () => {
    const s = game(1);
    father(s, 0, 'thaddeus_kosciuszko');
    const d = () => buildingDefence(s, 0).reduce((n, x) => n + x.value, 0);
    build(s, 0, 'stockade');
    expect(d()).toBe(2);
    build(s, 0, 'fort');
    expect(d()).toBe(5);
  });
  it('[B-9] Arnold acts only for the loyalist', () => {
    const s = game(2);
    world(s, { [at(5, 5)]: 'grassland' });
    colony(s, 0, at(5, 5));
    father(s, 0, 'benedict_arnold');
    Object.assign(P(s), { bells: 9, hand: [], deck: [], discard: ['colonist'] });
    Object.assign(P(s, 1), { hand: [], deck: [], discard: [] });
    s.ref = 2;
    s.pending = null;
    s.stack = [];
    push(s, { t: 'warStart', reason: 'bells' });
    run(s);
    while (!s.over) { expect(s.pending!.kind).not.toBe('betray'); act(s, legal(s).find((c) => c.n === 0 || c.c === 'keep')!); }
  });
  it('[B-10] removed cards go where they belong', () => {
    const s = game(1);
    Object.assign(P(s), { hand: [], deck: ['colonist', 'indian', 'colonist_english', 'miner', 'miner', 'miner', 'miner'].reverse(), discard: [] });
    s.agentDiscard = [];
    s.nativesLeft = 7;
    event(s, 'seven_years_war');
    act(s, { c: 'remove' }, { c: 'remove' }, { c: 'remove' });
    expect(s.agentDiscard.filter((c) => c === 'colonist').length).toBe(1);
    expect(s.nativesLeft).toBe(8);
    expect(s.agentDiscard).not.toContain('colonist_english');
  });
});

describe('Event rules', () => {
  it('[V-1] one event per round without reshuffle', () => {
    const s = game(1);
    expect(s.eventDeck.length).toBe(22);
    s.eventDeck = [];
    runTasks(s, { t: 'eventPhase' });
    expect(s.round).toBe(2);
  });
  it('[V-2] effects in printed order, players from the first player', () => {
    const s = game(3);
    s.first = 1;
    for (const p of s.players) p.wh = stock({ crops: 1 });
    event(s, 'sugar_act');
    expect(s.pending).toMatchObject({ kind: 'sellOff', player: 1 });
    act(s, { c: 'sell', n: 1 });
    expect(P(s, 1).gold).toBe(2); // the price fell first
    expect(s.pending).toMatchObject({ player: 2 });
  });
  it('[V-3] ties go to the closest to the first player; nobody if all have none', () => {
    const s = game(3);
    s.first = 2;
    for (const p of s.players) p.wh = stock({ goods: 2 });
    event(s, 'industrial_boom');
    expect(s.ref).toBe(1);
    const t = game(3);
    event(t, 'industrial_boom');
    expect(t.ref).toBe(0);
    for (const p of s.players) { p.gold = 9; p.wh = stock({ goods: 2 }); }
    event(s, 'industrial_boom');
    expect(s.pending).toMatchObject({ kind: 'payOrRef', player: 2 });
  });
  it('[V-4] stock is the warehouse, not the hold', () => {
    const s = game(1);
    P(s).hold = stock({ crops: 3 });
    event(s, 'sugar_act');
    expect(P(s).bells).toBe(0);
  });
  it('[V-5] price changes keep the demand track', () => {
    const s = game(2);
    s.demand.goods = 1;
    s.price.goods = 0;
    event(s, 'black_market');
    expect([s.price.goods, s.demand.goods]).toEqual([0, 1]);
  });
  it('[V-6] joint offers are secret', () => {
    const s = game(2);
    P(s).crosses = 3;
    P(s, 1).crosses = 5;
    s.ref = 5;
    event(s, 'the_great_awakening');
    act(s, { c: 'give', n: 3 });
    expect(P(s).crosses).toBe(3); // taken only when all have chosen
    act(s, { c: 'give', n: 5 });
    expect([P(s).crosses, P(s, 1).crosses, s.ref]).toEqual([0, 0, 3]);
  });
  it('[V-7] activation comes last', () => {
    const s = game(1);
    for (const e of Object.values(s.def.events)) {
      const i = e.do.findIndex((n) => n.n === 'activate');
      expect(i === -1 || i === e.do.length - 1).toBe(true);
    }
  });
  it('[V-8] REF per player counts all players', () => {
    const s = game(5);
    event(s, 'el_dorado_rumors');
    while (s.pending!.kind === 'sellAgents') act(s, { c: 'stop' });
    expect(s.ref).toBe(10);
  });
  it('[V-9] offered agents come from the deck or common discard', () => {
    const s = game(1);
    s.agentDeck = s.agentDeck.filter((c) => c !== 'corsair');
    s.agentDiscard = ['corsair'];
    P(s).gold = 5;
    event(s, 'silver_fleet');
    act(s, { c: 'yes' });
    expect([P(s).gold, P(s).discard.includes('corsair'), s.agentDiscard]).toEqual([0, true, []]);
    P(s).gold = 5;
    event(s, 'silver_fleet');
    expect(s.pending!.kind).toBe('stop');
  });
  it('[V-10] chapel and church together, one bell for town hall and newspaper, forest falls back to buildings', () => {
    const s = game(2);
    build(s, 0, 'chapel', 'church', 'town_hall', 'newspaper');
    event(s, 'the_great_awakening');
    expect(P(s).crosses).toBe(6);
    event(s, 'stamp_act');
    expect(P(s).bells).toBe(1);
    P(s).gold = 5;
    event(s, 'sacred_forest');
    expect(s.pending).toMatchObject({ kind: 'sacredForest', player: 0 });
    P(s, 1).wh = stock({ timber: 1 });
    P(s, 1).gold = 5;
    event(s, 'sacred_forest');
    expect(s.pending).toMatchObject({ player: 1 });
  });
  it('[V-11] smuggling uses the market price without bonuses or demand', () => {
    const s = game(1);
    P(s).wh = stock({ silver: 2 });
    event(s, 'black_market');
    act(s, { c: 'sell', r: 'silver', n: 2 });
    expect([P(s).gold, s.price.silver, s.ref]).toEqual([8, 5, 2]);
  });
});

describe('Ruin and wreck rules', () => {
  it('[X-1] infantry meets ruins, ships meet wrecks', () => {
    const s = game(1);
    world(s, { [at(5, 5)]: 'grassland', [at(5, 6)]: 'grassland' });
    s.poi[at(5, 6)] = 'ruin';
    s.ruinDeck.push('hidden_granaries');
    P(s).inf = at(5, 5);
    turn(s, 0, 'colonist', 'colonist');
    play(s, 'colonist', 'moveInfantry');
    act(s, { c: 'step', cell: at(5, 6) });
    expect([P(s).wh.food, s.poi[at(5, 6)], s.ruinDiscard]).toEqual([4, undefined, ['hidden_granaries']]);
  });
  it('[X-2] used cards are reshuffled when the deck is empty', () => {
    const s = game(1);
    s.wreckDeck = [];
    s.wreckDiscard = ['calm_seas'];
    s.move = { player: 0, token: 'ship', points: 2, ended: false, scout: false, card: 'colonist' };
    runTasks(s, { t: 'poi', p: 0, deck: 'wreck' });
    expect(s.wreckDiscard).toEqual(['calm_seas']);
    expect(s.move!.ended).toBe(true);
  });
  it('[X-3] only affordable options are offered', () => {
    const s = game(1);
    P(s).hand = [];
    poi(s, 'ruin', 'guide');
    expect(legal(s).map((c) => c.id)).toEqual(['threaten', 'leave']);
  });
  it('[X-4] the played agent qualifies, or one is discarded from hand', () => {
    const s = game(1);
    P(s).hand = ['dragoon', 'colonist'];
    P(s).discard = [];
    poi(s, 'ruin', 'predators_lair');
    opt(s, 'fight', { card: 'dragoon' });
    expect([P(s).gold, P(s).discard]).toEqual([5, ['dragoon']]);
    poi(s, 'ruin', 'predators_lair', 'soldier');
    expect(legal(s)[0]).toEqual({ c: 'option', id: 'fight' });
    P(s).hand = ['colonist'];
    poi(s, 'ruin', 'predators_lair');
    expect(legal(s).map((c) => c.id)).toEqual(['flee']);
  });
  it('[X-5] a scout ignores skulls', () => {
    const s = game(1);
    P(s).hand = [];
    poi(s, 'ruin', 'natives_ambush', 'scout');
    opt(s, 'flee');
    expect(P(s).inf).not.toBe('europe');
    poi(s, 'ruin', 'natives_ambush');
    opt(s, 'flee');
    expect(P(s).inf).toBe('europe');
    poi(s, 'wreck', 'pirate_ambush', 'scout');
    opt(s, 'surrender');
    expect(P(s).damage).toBe(0);
  });
  it('[X-6] nearest settlement, chosen on ties, skipped if none', () => {
    const s = game(1);
    poi(s, 'ruin', 'desecrated_burial');
    opt(s, 'take');
    expect(P(s).gold).toBe(5);
    s.map.terrain[at(6, 8)] = 'grassland';
    s.map.terrain[at(6, 4)] = 'forest';
    settle(s, 'sioux', at(6, 8), { hostility: 1 });
    settle(s, 'tupi', at(6, 4), { hostility: 1 });
    poi(s, 'ruin', 'desecrated_burial');
    opt(s, 'take');
    act(s, { c: 'settlement', settlement: 2 });
    expect(s.hostility).toMatchObject({ sioux: 1, tupi: 2 });
  });
  it('[X-7] losses stop at zero, bell prices must be affordable', () => {
    const s = game(1);
    P(s).crosses = 1;
    poi(s, 'wreck', 'man_overboard');
    opt(s, 'abandon');
    expect(P(s).crosses).toBe(0);
    poi(s, 'wreck', 'message_in_a_bottle_2');
    expect(legal(s).map((c) => c.id)).toEqual(['spread']);
  });
});

describe('War', () => {
  /** `board` with a loyalist at 2 players, as printed, so a two-player game tests the loyalist's steps. */
  const TWO = boardWith({ 'settings.war.loyalistFrom': 2 });
  /** Two players with one colony each on grassland, player 0 more rebellious. */
  function eve(n = 2, tactic = 'gentlemans_war', d = TWO) {
    const s = game(n, d);
    world(s, { [at(5, 5)]: 'grassland', [at(9, 9)]: 'grassland', [at(5, 9)]: 'grassland' });
    colony(s, 0, at(5, 5));
    if (n > 1) colony(s, 1, at(9, 9));
    s.players.forEach((p, i) => { p.bells = 10 - i; Object.assign(p, { hand: [], deck: [], discard: ['colonist', 'colonist', 'soldier', 'captain'], inf: 'europe' }); });
    s.tacticDeck = [tactic];
    return s;
  }
  function start(s: ReturnType<typeof game>) { s.pending = null; s.stack = []; s.over = null; push(s, { t: 'warStart', reason: 'bells' }); run(s); return s; }
  const keepAll = (s: ReturnType<typeof game>) => { while (s.pending?.kind === 'placeCards' && s.pending.side === 'loyalist') act(s, { c: 'keep' }); return s; };
  const passAll = (s: ReturnType<typeof game>) => {
    let n = 0;
    while (!s.over && n++ < 200) { const o = legal(s); act(s, o.find((c) => c.c === 'keep' || c.c === 'skip' || c.n === 0) ?? o[0]); }
    return s;
  };
  it('[W-1] starts at 15 bells or after round 10', () => {
    const s = eve();
    P(s).bells = 15;
    s.pending = null;
    s.stack = [];
    push(s, { t: 'roundEnd' });
    run(s);
    expect(s.war).not.toBe(null);
    const t = eve();
    runTasks(t, { t: 'roundEnd' });
    expect(t.war).toBe(null);
    const u = eve();
    u.round = 10;
    u.pending = null;
    u.stack = [];
    push(u, { t: 'roundEnd' });
    run(u);
    expect(u.war).not.toBe(null);
  });
  it('[W-2] the loyalist', () => {
    const s = eve(3);
    expect(findLoyalist(s)).toBe(2);
    P(s, 0).bells = 8;
    P(s, 0).crosses = 1;
    expect(findLoyalist(s)).toBe(2);
    P(s, 2).crosses = 2;
    expect(findLoyalist(s)).toBe(0);
    P(s, 2).crosses = 1;
    P(s, 2).gold = 1;
    expect(findLoyalist(s)).toBe(0);
    for (const p of s.players) p.bells = 15;
    expect(findLoyalist(s)).toBe(null);
    expect(findLoyalist(eve(1))).toBe(null);
  });
  it('[W-2] no loyalist with 2 players (DD-58): the King attacks both colonies', () => {
    const s = start(eve(2, 'gentlemans_war', def));
    expect(s.war!.loyalist).toBe(null);
    expect(s.war!.sieges.map((x) => x.owner)).toEqual([0, 1]);
    expect(findLoyalist(eve(3, 'gentlemans_war', def))).toBe(2);
  });
  it('[W-3] one tactic is drawn', () => {
    const s = start(eve());
    expect([s.war!.tactic, s.tacticDeck.length]).toEqual(['gentlemans_war', 0]);
  });
  it('[W-4] the pool', () => {
    const s = eve(2, 'hessian_mercenaries');
    s.ref = 3;
    settle(s, 'sioux', at(5, 9), { hostility: 4 });
    start(s);
    expect(s.war!.pool).toBe(3 + 1 + 4);
  });
  it('[W-5] cubes are dealt one per colony from the most rebellious', () => {
    const s = eve(3);
    colony(s, 0, at(5, 9));
    s.ref = 4;
    start(s);
    expect(s.war!.sieges.map((x) => [x.owner, x.cell, x.cubes])).toEqual([[0, at(5, 5), 2], [0, at(5, 9), 1], [1, at(9, 9), 1]]);
    expect(rebelOrder(s)).toEqual([0, 1, 2]);
  });
  it('[W-6] the loyalist places any agents face down', () => {
    const s = eve(2);
    s.ref = 1;
    start(s);
    expect(s.pending).toMatchObject({ kind: 'placeCards', player: 1, side: 'loyalist' });
    act(s, { c: 'place', card: 'captain', siege: 0 }, { c: 'place', card: 'colonist', siege: 0 });
    keepAll(s);
    expect(s.war!.sieges[0].loyalist).toEqual(['captain', 'colonist']);
  });
  it('[W-7] patriots muster army, militia, mercenaries and allies', () => {
    const s = eve(2);
    s.ref = 1;
    P(s).gold = 11;
    settle(s, 'sioux', at(5, 9), { hostility: 0, ally: 0 });
    keepAll(start(s));
    expect(legal(s).map((c) => c.c)).toEqual(['place', 'keep']);
    act(s, { c: 'place', card: 'captain' }, { c: 'place', card: 'soldier' });
    expect(legal(s).length).toBe(3); // two civilians
    act(s, { c: 'militia', n: 2 });
    expect(legal(s).length).toBe(3);
    act(s, { c: 'mercenaries', n: 2 });
    const x = s.war!.sieges[0];
    expect([x.army, x.support]).toEqual([['captain', 'soldier'], 2 + 2 + 3]);
    expect([P(s).bells, P(s).gold]).toEqual([8, 1]);
  });
  it('[W-8] Washington and Revere', () => {
    const s = eve(2);
    s.ref = 1;
    father(s, 0, 'george_washington', 'paul_revere');
    keepAll(start(s));
    act(s, { c: 'keep' }, { c: 'keep' });
    expect(legal(s).length).toBe(2);
    act(s, { c: 'militia', n: 1 });
    if (!s.over) passAll(s);
    expect(s.war!.sieges[0].support).toBe(2 + 4);
  });
  it('[W-9] attack strength', () => {
    const s = eve(2);
    s.ref = 3;
    start(s);
    s.war!.sieges[0].loyalist = ['captain', 'colonist', 'corsair'];
    s.war!.sieges[0].militia = 2;
    expect(siegeStrength(s, s.war!.sieges[0]).attack.total).toBe(3 + 3 + 2 + 2);
  });
  it('[W-10] defence strength', () => {
    const s = eve(2);
    s.map.terrain[at(5, 5)] = 'forest';
    build(s, 0, 'stockade');
    P(s).inf = at(5, 5);
    P(s).ship = at(4, 4);
    s.ref = 1;
    start(s);
    s.war!.sieges[0].army = ['soldier', 'cannoneer'];
    s.war!.sieges[0].support = 3;
    expect(siegeStrength(s, s.war!.sieges[0]).defence.total).toBe(1 + 1 + 1 + 2 + 3 + 3);
  });
  it('[W-11] colonies not attacked are kept', () => {
    const s = passAll(start(eve(2)));
    expect(s.war!.sieges[0].fell).toBe(false);
    expect(s.war!.sieges[0].dice).toBeUndefined();
  });
  it('[W-12] dice decide when the attack is stronger', () => {
    const run2 = (dice: number[], ref: number) => { const s = eve(1); s.ref = ref; start(s); while (!s.over) { rig(s, ...dice); const o = legal(s); act(s, o.find((c) => c.c === 'keep' || c.n === 0) ?? o[0]); } return s.war!.sieges[0]; };
    expect(run2([1, 2, 3], 4)).toMatchObject({ attack: 4, defence: 1, fell: false });
    expect(run2([1, 2, 5], 4)).toMatchObject({ fell: true });
    expect(run2([], 20).dice!.length).toBe(10);
    const s = eve(1);
    s.ref = 1;
    start(s);
    act(s, { c: 'place', card: 'captain' }, { c: 'keep' }, { c: 'militia', n: 0 });
    expect(s.war!.sieges[0]).toMatchObject({ dice: [], fell: false });
  });
  it('[W-13] the loyalist takes a colony if at least as strong as the REF', () => {
    for (const [cards, taken] of [[['captain'], 1], [['soldier'], 1], [['colonist'], null]] as const) {
      const s = eve(2);
      s.ref = 2;
      P(s, 1).discard = [...cards];
      P(s).discard = ['colonist', 'colonist'];
      start(s);
      act(s, { c: 'place', card: cards[0] });
      while (!s.over) { rig(s, 5, 5, 5, 5); act(s, legal(s).find((c) => c.n === 0 || c.c === 'keep')!); }
      expect(s.war!.sieges[0].fell).toBe(true);
      expect(s.war!.sieges[0].takenBy).toBe(taken);
    }
  });
  it('[W-14] loyalist militia needs a loyalist', () => {
    const s = eve(2, 'loyalist_militia');
    P(s, 1).crosses = 4;
    s.ref = 1;
    keepAll(start(s));
    expect(s.war!.sieges[0].militia).toBe(4);
    const solo = eve(1, 'loyalist_militia');
    P(solo).crosses = 4;
    expect(passAll(start(solo)).war!.sieges[0].militia).toBe(0);
  });
  it('[W-15] sieges follow the rebel order', () => {
    const s = eve(3);
    P(s, 1).bells = 14;
    s.ref = 2;
    passAll(start(s));
    expect(s.war!.sieges.map((x) => x.owner)).toEqual([1, 0]);
  });
  it('[W-20] colonies and bells by side', () => {
    const s = eve(2);
    passAll(start(s));
    expect(scorePlayer(s, 0).parts).toEqual(expect.arrayContaining([{ label: 'colonies', value: 6 }, { label: 'bells', value: 10 }]));
    expect(scorePlayer(s, 1).parts).toEqual([{ label: 'colonies', value: 3 }]);
    s.war!.sieges[0].fell = true;
    s.war!.sieges[0].takenBy = 1;
    expect(scorePlayer(s, 0).colonies).toBe(0);
    expect(scorePlayer(s, 1).parts[0].value).toBe(6);
  });
  it('[W-21] points for everything else, rounded down', () => {
    const s = game(1);
    Object.assign(P(s), { gold: 19, deck: Array(9).fill('colonist'), hand: [], discard: [] });
    build(s, 0, 'docks', 'chapel');
    father(s, 0, 'squanto');
    expect(scorePlayer(s, 0).parts).toEqual([{ label: 'agents', value: 1 }, { label: 'gold', value: 1 }, { label: 'buildings', value: 2 }, { label: 'fathers', value: 1 }]);
    P(s).fathers = ['jakob_fugger'];
    expect(scorePlayer(s, 0).parts).toContainEqual({ label: 'gold', value: 2 });
  });
  it('[W-22] the winner holds a colony; ties go by gold, then agents', () => {
    const s = eve(2);
    s.colonies = s.colonies.filter((c) => c.owner === 1);
    passAll(start(s));
    expect(s.over!.winners).toEqual([1]);
    const t = eve(3);
    for (const p of t.players) p.bells = 15;
    colony(t, 2, at(5, 9));
    P(t, 1).gold = 4;
    passAll(start(t));
    expect(t.over!.winners).toEqual([1]);
    const u = eve(3);
    for (const p of u.players) p.bells = 15;
    colony(u, 2, at(5, 9));
    expect(passAll(start(u)).over!.winners).toEqual([0, 1, 2]);
  });
  it('[W-23] nobody with a colony means nobody wins', () => {
    const s = eve(1);
    s.colonies = [];
    expect(passAll(start(s)).over!.winners).toEqual([]);
    expect(passAll(start(eve(1))).over!.winners).toEqual([0]);
  });
});

describe('settings without a rule of their own', () => {
  it('activation thresholds and gift', () => {
    const s = game(1, defWith({ 'settings.activation.giftMaxHostility': 1, 'settings.activation.raidMinHostility': 3, 'settings.activation.gift': 2 }));
    world(s, { [at(5, 5)]: 'grassland', [at(5, 8)]: 'grassland' });
    colony(s, 0, at(5, 5));
    settle(s, 'sioux', at(5, 8), { hostility: 1 });
    runTasks(s, { t: 'activate', n: 1 });
    expect(P(s).wh.food).toBe(2);
    s.hostility.sioux = 2;
    runTasks(s, { t: 'activate', n: 1 });
    expect(P(s).wh.food).toBe(2);
    s.hostility.sioux = 3;
    runTasks(s, { t: 'activate', n: 1 });
    expect(P(s).wh.food).toBe(0);
  });
  it('price cap, hire and propaganda limits', () => {
    const s = game(1, defWith({ 'settings.market.maxPrice': 7, 'settings.propaganda.maxFathers': 1, 'settings.hire.max': 1 }));
    event(s, 'stamp_act');
    expect(s.price.goods).toBe(6);
    P(s).bells = 20;
    P(s).gold = 50;
    turn(s, 0, 'colonist', 'colonist', 'colonist');
    play(s, 'colonist', 'hire');
    act(s, { c: 'buy' });
    expect(s.pending!.kind).toBe('turn');
    s.salon = ['squanto', 'john_rolfe', 'pocahontas'];
    play(s, 'colonist', 'propaganda');
    act(s, { father: 'squanto' });
    expect(s.pending!.kind).toBe('turn');
  });
  it('REF strength with or without the tactic', () => {
    const ref = (d?: ReturnType<typeof defWith>) => {
      const s = d ? game(1, d) : game(1);
      s.war = { loyalist: null, tactic: 'ships_of_the_line', pool: 2, order: [0], sieges: [], spent: {} };
      return siegeStrength(s, { owner: 0, cell: at(5, 5), cubes: 2, loyalist: [], militia: 0, army: [], support: 0, betrayed: 0 }).ref;
    };
    // 2 cubes at strength 1 (DD-49): 2 without the tactic, 6 with Ships of the Line's bonus.
    expect([ref(), ref(defWith({ 'settings.war.refStrengthIncludesTactic': false }))]).toEqual([6, 2]);
  });
});
