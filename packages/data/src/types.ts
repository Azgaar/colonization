/** Game data types. Everything here is plain JSON and is never mutated by the engine. */

export type Resource = 'food' | 'timber' | 'crops' | 'goods' | 'silver';
export const RESOURCES: readonly Resource[] = ['food', 'timber', 'crops', 'goods', 'silver'];

/** What a production action yields: one icon per resource (fish is food), plus bells and crosses. */
export type Icon = 'food' | 'timber' | 'crops' | 'goods' | 'silver' | 'bells' | 'crosses';
export const ICON_RESOURCE: Record<Exclude<Icon, 'bells' | 'crosses'>, Resource> = {
  food: 'food', timber: 'timber', crops: 'crops', goods: 'goods', silver: 'silver',
};

export type TerrainId = 'ocean' | 'forest' | 'grassland' | 'mountains' | 'desert' | 'tundra';
export type Poi = 'village' | 'ruin' | 'wreck';
export type Education = 0 | 1 | 2;
export type TokenKind = 'infantry' | 'ship';

export interface Named { id: string; ru: string; en: string }

/** Passive modifiers carried by agents and Fathers. */
export type Mod =
  | { mod: 'production'; icons?: Icon[]; add: number; terrain?: TerrainId; island?: number; enables?: boolean }
  | { mod: 'move'; add: number }
  | { mod: 'combat'; token: TokenKind; add: number; vs?: 'native'; terrain?: TerrainId }
  /** Added once per battle for the owner's side, not per card. */
  | { mod: 'battle'; add: number; vs?: 'native'; token?: TokenKind; role?: 'attack' }
  | { mod: 'cost'; of: 'hire' | 'build' | 'preach'; add: number }
  | { mod: 'sellPrice'; add: number }
  | { mod: 'bombard' } | { mod: 'bombardAny' } | { mod: 'smuggle'; add: number }
  | { mod: 'ignoreSkull' } | { mod: 'onlyProduce' }
  | { mod: 'noAttackNatives' } | { mod: 'preachFree' } | { mod: 'preachCalm' }
  | { mod: 'nativeHostility'; add: number } | { mod: 'allianceMax'; value: number }
  | { mod: 'fatherLimit'; value: number } | { mod: 'lootFactor'; value: number }
  | { mod: 'recruitLook'; value: number } | { mod: 'recruitTake'; value: number } | { mod: 'foundCost'; resource: Resource; value: number }
  | { mod: 'onReveal'; gold?: number; hold?: Partial<Record<Resource, number>>; ifLand?: boolean }
  | { mod: 'colonyDefence'; building: string; add: number }
  | { mod: 'militiaPerBell'; value: number } | { mod: 'freeMilitia'; value: number }
  | { mod: 'goldPerPoint'; value: number } | { mod: 'pointsPerAlliance'; value: number }
  | { mod: 'pointsPerPatriotColony'; value: number } | { mod: 'betray'; add: number };

export interface Cost {
  gold?: number; bells?: number; crosses?: number; cards?: number;
  /** One food from the hold or the warehouse. */
  anyFood?: number;
  anyResource?: number;
  holdResource?: number;
  /** The whole hold, with at least this many resources in it. */
  wholeHold?: number;
  /** The played agent qualifies for free, otherwise one such card is discarded from hand. */
  agent?: 'military' | 'scout';
}

/** One-off effects, executed in order. `skull` marks effects a scout ignores. */
export type Node =
  | { n: 'gain'; gold?: number; bells?: number; crosses?: number; wh?: Partial<Record<Resource, number>>; hold?: Partial<Record<Resource, number>> }
  | { n: 'lose'; gold?: number; bells?: number; crosses?: number }
  | { n: 'endMove' } | { n: 'moves'; add: number }
  | { n: 'toEurope'; skull?: boolean } | { n: 'toColonyWater' }
  | { n: 'damage'; amount: number; skull?: boolean }
  | { n: 'dropHold' }
  | { n: 'choice'; id: string; options: ChoiceOption[] }
  | { n: 'roll'; table: { max: number; do: Node[] }[] }
  | { n: 'hostilityNearest'; add: number }
  | { n: 'pierLeftmost' }
  | { n: 'drawPoi' } | { n: 'guide'; look: number }
  | { n: 'revealAdjacent' }
  | { n: 'discardCards'; amount: number }
  | { n: 'freeBasicBuilding' }
  | { n: 'ref'; add?: number; perPlayer?: number; perBells?: number }
  // Fathers
  | { n: 'takeFromPier'; amount: number; to: 'discard' | 'hand' }
  | { n: 'takeAgent'; agent: string; amount: number }
  | { n: 'freeColony' }
  | { n: 'freeBuilding'; options: string[] }
  | { n: 'convertCrosses'; max: number }
  | { n: 'cheapestFather' }
  | { n: 'replaceAgents'; agent: string }
  // Events
  | { n: 'price'; res: Resource[]; add: number } | { n: 'priceReset'; res: Resource[] }
  | { n: 'gainIfStock'; res: Resource; bells: number }
  | { n: 'gainPerBuilding'; buildings: Record<string, number>; what: 'bells' | 'crosses'; once?: boolean }
  | { n: 'sellOff'; res: Resource[]; priceAdd: number; refPerUnit?: number; refPerSeller?: number }
  | { n: 'firstMayTake'; agent: string; gold: number }
  | { n: 'mostPays'; res: Resource; goldPerUnit?: number; gold?: number; ref: number; bells?: number }
  | { n: 'refreshPier'; which: 'all' | 'military' } | { n: 'refreshSalon' }
  | { n: 'sellAgents'; max: number; gold: number; refEach: number }
  | { n: 'jointCrosses'; per: number; max: number }
  | { n: 'populationAll'; add: number } | { n: 'hostilityAll'; add: number }
  | { n: 'payPerBuilding'; gold: number; ref: number }
  | { n: 'storm' } | { n: 'fewestColoniesGain'; wh: Partial<Record<Resource, number>> }
  | { n: 'raidAll' } | { n: 'breakAlliances'; min: number }
  | { n: 'nativeGifts'; min: number; max: number; food: number } | { n: 'winter'; food: number }
  | { n: 'cheapBuild'; options: string[]; timber: number }
  | { n: 'witchTrial'; crosses: number }
  | { n: 'payOrRemove'; which: 'military' | 'slave'; gold: number; refEach: number }
  | { n: 'sacredForest'; goods: number; gold: number; hostility: number }
  | { n: 'boycott'; res: Resource; goldPerUnit: number; refPerUnit: number }
  | { n: 'blockade'; gold: number; refEach: number }
  | { n: 'activate'; settlement: number };

export interface ChoiceOption { id: string; ru: string; en: string; cost?: Cost; needs?: 'colony' | 'sea-colony'; do: Node[] }

export interface AgentDef extends Named {
  /** Type that rules refer to: `slave_english` has base `slave`. */
  base: string;
  kind: 'common' | 'nation' | 'native';
  unique: boolean;
  nation?: string;
  copies: number;
  edu: Education;
  price: number | null;
  mods: Mod[];
}
export interface NationDef extends Named { deck: string[]; stars: number; color: string }
export interface BuildingDef extends Named {
  copies: number; edu: Education; timber: number; requires?: string; improvement: boolean;
  work?: BuildingWork;
  storage?: number; defence?: number;
}
export type BuildingWork =
  | { kind: 'produce'; icon: Icon; amount: number; consumes?: { res: Resource; amount: number } }
  | { kind: 'ocean'; add: number }
  | { kind: 'teach'; maxEdu: Education }
  | { kind: 'sell'; amount: number }
  | { kind: 'repair' };
export interface FatherDef extends Named { /** Russian lore line: years of life and who they were. */ flavor?: string; category: string; bells: number; mods: Mod[]; onGain: Node[] }
/** `flavor` is the Russian story line printed above the effects. */
export interface EventDef extends Named { flavor?: string; do: Node[] }
export interface PoiCardDef extends Named { flavor?: string; do: Node[] }
export interface TribeDef extends Named { terrain: TerrainId; hostility: number; population: number; copies: number; loot: { gold?: number; res?: Resource; amount?: number } }
export type TacticEffect =
  | { t: 'perCubes'; add: number; per: number } | { t: 'perOcean'; add: number; per: number }
  | { t: 'noTerrain' } | { t: 'cubes'; add: number } | { t: 'successFrom'; faces: number[] }
  | { t: 'noBuildings' } | { t: 'militiaPerCross'; value: number } | { t: 'minSuccesses'; value: number } | { t: 'none' };
export interface TacticDef extends Named { effect: TacticEffect }
export interface TerrainDef extends Named { yields: Icon[]; defence: number; move: number | 'all' }
export interface Cell { terrain: TerrainId; poi?: Poi; bonus?: Icon }
export interface TileDef { id: number; cells: Cell[] }
export interface ResourceDef extends Named { price: number }

export interface Settings {
  players: { min: number; max: number };
  hand: { size: number };
  rounds: { max: number; firstYear: number; yearStep: number };
  tax: { track: number[]; refuseRef: number; refuseRefSolo: number; refuseBells: number; payBells: number };
  map: { size: number };
  ring: { openSea: number; europe: number };
  move: { points: number; explore: number; cargo: number };
  cargo: { costPer: 'operation' | 'unit' };
  explore: { diagonal: boolean };
  hold: { size: number; maxDamage: number };
  damage: { sendsToEurope: boolean;
    /** A damaged ship that takes refuge by its owner's shipyard is fully repaired there at once. Off: it arrives damaged. */
    shipyardRepairs: boolean;
    /** Building a shipyard repairs its owner's ship at once, wherever it is. */
    repairOnBuild: boolean };
  warehouse: { base: number };
  colony: {
    max: number; foundCost: { resource: Resource; value: number };
    /** A colony may stand on the outer edge of the map. Off: not on the edge, as printed (F-2). */
    onEdge: boolean;
  };
  buildings: { max: number };
  fathers: { max: number; salon: number };
  propaganda: { maxFathers: number };
  hire: { max: number };
  pier: { slots: number };
  market: { maxPrice: number };
  crosses: {
    max: number; recruitPerRound: number;
    /** Recruiting is a card action: spend at least the round number in crosses and look at that many agents. Off: a free look at the top agent (A-7, T-8). */
    recruitAction: boolean;
    /** On: a chapel or church is not worked but gives its ✝️ at the end of every round (the best one a player owns). */
    everyRound: boolean;
  };
  collection: { min: number };
  natives: { maxSettlements: number; maxHostility: number; allianceMax: number; allianceBreak: number; giftDice: number; giftBase: number; preachMin: number; afterAttack: number;
    /** What a gift costs: 1 goods, or 1 resource of any kind. */
    giftResource: 'goods' | 'any' };
  activation: { giftMaxHostility: number; raidMinHostility: number; gift: number };
  raid: { resources: number;
    /** The building whose owner is never raided. */
    stoppedBy: string };
  production: { emptyMeans: 'noToken' | 'noForeignToken' };
  combat: {
    successFaces: number[]; diceCap: number | null; countPlayedCard: boolean; supportFromCriminalSlave: boolean;
    landingPenalty: number; infantryVsShipPenalty: number; colonyDefence: number; victoryBells: number;
  };
  europe: { safe: boolean };
  war: {
    bells: number; refStrength: number; hostileCubes: number; hostileFrom: number; allyCubes: number; mercenaryGold: number;
    diceCap: number; refStrengthIncludesTactic: boolean;
    tokenBonus: number; baseDefence: number;
    /** Fewest players with a loyalist in the war (W-2). Solo never has one. */
    loyalistFrom: number;
  };
  score: { patriotColony: number; loyalistColony: number; perBell: number; agentsPerPoint: number; goldPerPoint: number; building: number; father: number };
}

export interface GameData {
  schema: 1;
  sourceHash: string;
  resources: Record<Resource, ResourceDef>;
  terrain: Record<TerrainId, TerrainDef>;
  agents: Record<string, AgentDef>;
  nations: Record<string, NationDef>;
  buildings: Record<string, BuildingDef>;
  fathers: Record<string, FatherDef>;
  events: Record<string, EventDef>;
  ruins: Record<string, PoiCardDef>;
  wrecks: Record<string, PoiCardDef>;
  tactics: Record<string, TacticDef>;
  tribes: Record<string, TribeDef>;
  tiles: TileDef[];
  settings: Settings;
}

/** How a rule change could return to the table. See PRD section 5. */
export type Conversion = 'interface' | 'direct' | 'component' | 'notConvertible';
export interface Override {
  id: string;
  why: string;
  conversion?: Conversion;
  /** How the rule would read at the table. Required for direct and component changes. */
  table?: string;
  components?: string[];
  /** New entity path → existing entity path in the same collection, e.g. "fathers.my_father": "fathers.peter_minuit". Applied before `set`. */
  copy?: Record<string, string>;
  /** Dotted paths into game data, e.g. "agents.priest.price". */
  set?: Record<string, unknown>;
  /** Entity paths to take out of the game, e.g. "events.stamp_act". Applied after `set`. */
  remove?: string[];
}
/** `base` names a ruleset whose overrides come first: `pc` is `board` plus its own changes. */
/** `packages`: named sets of this ruleset's overrides (by id) meant to be tried together, as in `proposed`. */
export interface Ruleset { id: string; title: string; base?: string; sandbox?: boolean; overrides: Override[]; packages?: Record<string, string[]> }
/** Where a value is printed: a cell of a sheet in rules/ (as published to the Google Sheet), or a key in rules/settings.json. `row` is null for a new row. */
export interface Source { sheet: string; row: number | null; column: string | null; header: string }
export interface GameDef extends GameData { rulesetId: string; rulesetHash: string }
/** Path → [sheet, row, column letter, header] of the cell it was read from. Deeper paths fall back to the nearest recorded parent. */
export type SourceMap = Record<string, [string, number, string, string]>;
