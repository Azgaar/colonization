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
}

export interface Colony { cell: number; owner: number }
export interface Settlement { n: number; cell: number; tribe: string; pop: number; ally: number | null; alive: boolean }
export interface Move { player: number; token: 'ship' | 'infantry'; points: number; ended: boolean; scout: boolean; card: string }

export type AttackMode = 'land' | 'landing' | 'shore' | 'naval' | 'bombard';
export interface Combat {
  attacker: number; defender: number | null; token: 'ship' | 'infantry'; mode: AttackMode;
  target: 'infantry' | 'ship' | 'colony' | 'settlement'; from: number; cell: number; bombard: boolean;
  card: string; a: string[]; d: string[];
  /** The defender's unseen top card. */
  top: string | null;
}

export interface Siege {
  owner: number; cell: number; cubes: number; loyalist: string[]; militia: number; army: string[]; support: number; betrayed: number;
  attack?: number; defence?: number; dice?: number[]; fell?: boolean; takenBy?: number | null;
}
export interface War {
  loyalist: number | null; tactic: string; pool: number; order: number[]; sieges: Siege[];
  /** Bells and gold spent in secret, taken when the sieges begin. */
  spent: Record<number, { bells: number; gold: number }>;
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
}
