import type { GameDef, Icon, Poi, Resource, TerrainId } from '@col/data';

export type Stock = Record<Resource, number>;
export type Zone = 'europe' | 'sea' | 'map';

/** Full truth of the drawn map. Shared by clones, never mutated. Hidden parts are removed in views. */
export interface MapInfo {
  width: number;
  zone: Zone[];
  frag: number[];
  terrain: (TerrainId | null)[];
  bonus: (Icon | null)[];
  poi: (Poi | null)[];
  neighbours: number[][];
}

export interface Player {
  nation: string;
  hand: string[]; deck: string[]; discard: string[];
  inPlay: string | null;
  gold: number; bells: number; crosses: number;
  wh: Stock; hold: Stock; damage: number;
  ship: number;
  /** Cell number, or where else the infantry is. */
  inf: number | 'ship' | 'europe';
  buildings: string[]; fathers: string[];
  passed: boolean;
  /** Colonies the player may still found at no cost (Champlain). */
  freeFound?: number;
}

export interface Colony { cell: number; owner: number }
export interface Settlement { n: number; cell: number; tribe: string; pop: number; ally: number | null; alive: boolean }
export interface Move { player: number; token: 'ship' | 'infantry'; points: number; ended: boolean; scout: boolean; card: string; switched?: boolean }

export type AttackMode = 'land' | 'landing' | 'shore' | 'naval' | 'bombard';
export interface Combat {
  attacker: number; defender: number | null; token: 'ship' | 'infantry'; mode: AttackMode;
  target: 'infantry' | 'ship' | 'colony' | 'settlement'; from: number; cell: number; bombard: boolean;
  card: string; a: string[]; d: string[];
  /** The defender's unseen top card. */
  top: string | null;
}

/** One colony slot in the war (DD-123): the King's cubes and every player's face-down stack of cards there. */
export interface Siege {
  owner: number; cell: number;
  /** The colony's number on its owner's nation board, 1 to 3, in founding order. */
  slot: number;
  cubes: number;
  /** Cards by player: the owner's defend (or guard) the colony, any other player's attack it. Face down until the sieges. */
  stacks: Record<number, string[]>;
  betrayed: number;
  attack?: number; defence?: number; dice?: number[]; fell?: boolean; takenBy?: number | null;
}
export interface War {
  loyalist: number | null; tactic: string; pool: number;
  /** Players from most to least rebellious: the order the Royal Army is shared out in. */
  order: number[];
  /** Clockwise from the loyalist (or, with none, from the player with the most bells): the order players raise troops and place cards. */
  turn: number[];
  sieges: Siege[];
  /** Each player's cards for the war, their whole agent pool and their war cards; a placed card leaves it. Secret from the others. */
  hands: Record<number, string[]>;
  /** War cards each player took (`brave`, `militia`, `mercenary`): public, and counted as agents at the end. */
  gained: Record<number, string[]>;
  /** Agents swapped for militia: set aside, still in the player's agent pool. */
  swapped: Record<number, string[]>;
  /** Militia and Mercenary cards left in the box. */
  supply: { militia: number; mercenary: number };
}

export interface Task { t: string; [k: string]: unknown }
export interface Decision { kind: string; player: number; [k: string]: unknown }
export type Choice = { c: string } & Record<string, unknown>;
export interface LogEntry { e: string; p?: number; [k: string]: unknown }
export interface Part { label: string; value: number }
export interface Explained { total: number; parts: Part[] }

export interface PlayerResult { player: number; score: number; parts: Part[]; colonies: number; side: 'patriot' | 'loyalist'; qualifies: boolean }
export interface Result { winners: number[]; players: PlayerResult[]; reason: 'bells' | 'rounds' }

export interface State {
  def: GameDef;
  map: MapInfo;
  seed: string;
  rng: [number, number, number, number];
  round: number; first: number; current: number;
  players: Player[];
  frags: number[]; revealed: boolean[];
  poi: Record<number, 'ruin' | 'wreck'>;
  settlements: Settlement[]; hostility: Record<string, number>; nativesLeft: number;
  colonies: Colony[];
  price: Stock; demand: Stock;
  agentDeck: string[]; agentDiscard: string[];
  pier: string[][]; salon: string[]; fatherDeck: string[]; fatherDiscard: string[];
  buildingsLeft: Record<string, number>;
  eventDeck: string[]; event: string | null; tribeDeck: string[]; tacticDeck: string[];
  ruinDeck: string[]; ruinDiscard: string[]; wreckDeck: string[]; wreckDiscard: string[];
  ref: number;
  move: Move | null; combat: Combat | null; war: War | null;
  stack: Task[];
  pending: Decision | null;
  over: Result | null;
  logging: boolean;
  log: LogEntry[];
  /** Sandbox only: dice results to use next, in order, before the random ones. Hidden from every view. */
  forced?: { dice?: number[] };
}
