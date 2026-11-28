import type { GameDef, Resource } from '@col/data';
import { RESOURCES } from '@col/data';
import type { Player, State } from './types.ts';
import { below, seedRng, shuffle } from './rng.ts';
import { push, task, ask, decision, run } from './core.ts';
import { emptyStock, fillPier, fillSalon, turnOrder } from './util.ts';
import { buildMap, tokenAt } from './map.ts';

export interface GameConfig { def: GameDef; seed: string; nations: string[]; logging?: boolean }

const copies = <T extends { id: string; copies?: number }>(m: Record<string, T>, ok: (x: T) => boolean = () => true) =>
  Object.values(m).filter(ok).flatMap((x) => Array.from({ length: x.copies ?? 1 }, () => x.id));

/** The first `n` nations of a list, skipping any whose colour is already taken: two nations share each colour (DD-124). */
export function nationsApart(def: GameDef, list: string[], n: number): string[] {
  const out: string[] = [], colours = new Set<string>();
  for (const k of list) if (out.length < n && !colours.has(def.nations[k].color)) { colours.add(def.nations[k].color); out.push(k); }
  return out;
}

export function createGame({ def, seed, nations, logging = true }: GameConfig): State {
  const { players, map } = def.settings;
  if (nations.length < players.min || nations.length > players.max) throw new Error(`${players.min} to ${players.max} players are needed`);
  if (new Set(nations).size !== nations.length) throw new Error('each nation can be played once');
  for (const n of nations) if (!def.nations[n]) throw new Error(`unknown nation "${n}"`);
  // Two nations share each colour, and their pieces and war tokens with it (DD-124).
  if (new Set(nations.map((n) => def.nations[n].color)).size !== nations.length) throw new Error('two players cannot have nations of one colour');

  const s = {
    def, seed, rng: seedRng(seed), round: 1, first: 0, current: 0, revealed: Array(map.size ** 2).fill(false), poi: {}, settlements: [], hostility: {},
    nativesLeft: def.agents.indian.copies, colonies: [], demand: emptyStock(), agentDiscard: [], pier: [], salon: [], fatherDiscard: [],
    event: null, ruinDiscard: [], wreckDiscard: [], ref: 0, move: null, combat: null, war: null, stack: [], pending: null, over: null, logging, log: [],
  } as unknown as State;

  s.frags = shuffle(s, def.tiles.map((_, i) => i)).slice(0, map.size ** 2);
  s.map = buildMap(def, s.frags);
  s.price = Object.fromEntries(RESOURCES.map((r) => [r, def.resources[r].price])) as Record<Resource, number>;
  s.agentDeck = shuffle(s, copies(def.agents, (a) => a.kind === 'common'));
  s.fatherDeck = shuffle(s, Object.keys(def.fathers));
  s.eventDeck = shuffle(s, Object.keys(def.events));
  s.ruinDeck = shuffle(s, Object.keys(def.ruins));
  s.wreckDeck = shuffle(s, Object.keys(def.wrecks));
  s.tacticDeck = shuffle(s, Object.keys(def.tactics));
  s.tribeDeck = shuffle(s, copies(def.tribes));
  s.buildingsLeft = Object.fromEntries(Object.values(def.buildings).map((b) => [b.id, b.copies]));
  s.players = nations.map((nation): Player => ({
    nation, hand: [], deck: shuffle(s, [...def.nations[nation].deck]), discard: [], inPlay: null, gold: 0, bells: 0, crosses: 0,
    wh: emptyStock(), hold: emptyStock(), damage: 0, ship: -1, inf: 'ship', buildings: [], fathers: [], passed: false,
  }));
  fillPier(s);
  fillSalon(s);
  s.first = below(s, nations.length);
  push(s, ...turnOrder(s).map((p) => ({ t: 'startCell', p })), { t: 'roundStart' });
  run(s);
  return s;
}

task('startCell', (s, t) => ask(s, { kind: 'startCell', player: t.p }));
decision('startCell', {
  options: (s) => s.map.zone.flatMap((z, cell) => (z === 'europe' && !tokenAt(s, cell) ? [{ c: 'start', cell }] : [])),
  resolve: (s, d, c) => { s.players[d.player].ship = c.cell; },
});
