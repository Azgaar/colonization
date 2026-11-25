/** Game data types. Everything here is plain JSON and is never mutated by the engine. */

export type Resource = 'food' | 'timber' | 'crops' | 'goods' | 'silver';
export const RESOURCES: readonly Resource[] = ['food', 'timber', 'crops', 'goods', 'silver'];

/** What a production action yields. Corn and fish are both food, leaf and fur are both crops. */
export type Icon = 'corn' | 'fish' | 'timber' | 'leaf' | 'fur' | 'goods' | 'silver' | 'bells' | 'crosses';
export const ICON_RESOURCE: Record<Exclude<Icon, 'bells' | 'crosses'>, Resource> = {
  corn: 'food', fish: 'food', timber: 'timber', leaf: 'crops', fur: 'crops', goods: 'goods', silver: 'silver',
};

export type TerrainId = 'ocean' | 'forest' | 'grassland' | 'mountains' | 'desert' | 'tundra';
export type Poi = 'village' | 'ruin' | 'wreck';
export type Education = 0 | 1 | 2;
export type TokenKind = 'infantry' | 'ship';

export interface Named { id: string; ru: string; en: string }

/** Passive modifiers carried by agents and Fathers. */
export type Mod =
  | { mod: 'production'; icons?: Icon[]; add: number; terrain?: TerrainId; island?: number; enables?: boolean }
  | { mod: 'move'; token: TokenKind; add: number }
  | { mod: 'combat'; token: TokenKind; add: number; vs?: 'native'; terrain?: TerrainId }
  /** Added once per battle for the owner's side, not per card. */
  | { mod: 'battle'; add: number; vs?: 'native'; token?: TokenKind; role?: 'attack' }
  | { mod: 'cost'; of: 'hire' | 'build' | 'preach'; add: number }
  | { mod: 'sellPrice'; add: number }
  | { mod: 'bombard' } | { mod: 'bombardAny' } | { mod: 'smuggle'; add: number }
  | { mod: 'ignoreSkull' } | { mod: 'onlyProduce' } | { mod: 'negotiator' }
  | { mod: 'noAttackNatives' } | { mod: 'preachFree' } | { mod: 'preachCalm' }
  | { mod: 'nativeHostility'; add: number } | { mod: 'allianceMax'; value: number }
  | { mod: 'fatherLimit'; value: number } | { mod: 'lootFactor'; value: number }
  | { mod: 'recruitLook'; value: number } | { mod: 'foundCost'; resource: Resource; value: number }
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
export interface FatherDef extends Named { category: string; bells: number; mods: Mod[]; onGain: Node[] }
export interface EventDef extends Named { do: Node[] }
export interface PoiCardDef extends Named { do: Node[] }
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
  tax: { track: number[]; refuseRef: number; refuseRefSolo: number; refuseBells: number };
  map: { size: number };
  ring: { openSea: number; europe: number };
  move: { points: number; explore: number; cargo: number; embark: number };
  cargo: { costPer: 'operation' | 'unit' };
  explore: { diagonal: boolean };
  hold: { size: number; maxDamage: number };
  damage: { sendsToEurope: boolean };
  warehouse: { base: number };
  colony: { max: number; foundCost: { resource: Resource; value: number } };
  buildings: { max: number };
  fathers: { max: number; salon: number };
  propaganda: { maxFathers: number };
  hire: { max: number };
  pier: { slots: number };
  market: { maxPrice: number };
  crosses: { max: number; recruitPerRound: number };
  collection: { min: number };
  natives: { maxSettlements: number; maxHostility: number; allianceMax: number; allianceBreak: number; giftDice: number; giftBase: number; preachMin: number; afterAttack: number };
  activation: { giftMaxHostility: number; raidMinHostility: number; gift: number };
  raid: { resources: number };
  production: { emptyMeans: 'noToken' | 'noForeignToken' };
  combat: {
    successFaces: number[]; diceCap: number | null; countPlayedCard: boolean; supportFromCriminalSlave: boolean;
    landingPenalty: number; infantryVsShipPenalty: number; colonyDefence: number; victoryBells: number;
  };
  europe: { safe: boolean };
  fort: { replacesStockade: boolean };
  war: {
    bells: number; refStrength: number; hostileCubes: number; hostileFrom: number; allyCubes: number; mercenaryGold: number;
    diceCap: number; refStrengthIncludesTactic: boolean;
    tokenBonus: number; baseDefence: number;
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
  /** Dotted paths into game data, e.g. "agents.priest.price". */
  set: Record<string, unknown>;
}
export interface Ruleset { id: string; title: string; sandbox?: boolean; overrides: Override[] }
export interface GameDef extends GameData { rulesetId: string; rulesetHash: string }
