/** What a player believes things are worth, in victory points. Tuned by self-play. */
export interface Weights {
  bell: number; gold: number; cross: number; timber: number; food: number; crops: number;
  /** Value of holding one more colony, after the risk of losing it. */
  /** Multipliers on what the war forecast says about colonies, ⚔️ and REF cubes. */
  colony: number; strength: number; ref: number;
  firstColony: number;
  explore: number; poi: number; trade: number; building: number; father: number; hire: number;
  alliance: number; native: number; raid: number; teach: number;
  /** How much of a better use elsewhere counts against spending a card. */
  regret: number;
  /** Leaning towards the King: 0 picks the better side, above 0 prefers loyalist, -1 never. */
  loyal: number;
  /** Cost of a bell to someone who wants to stay the least rebellious. */
  shun: number;
  /** Extra worth of keeping at least one colony, without which nobody can win. */
  qualify: number;
  /** Eagerness to end the game when ahead. */
  rush: number;
  noise: number;
}
export const BASE: Weights = {
  bell: 1, gold: 0.13, cross: 0.12, timber: 1, food: 1, crops: 0.3, colony: 1, firstColony: 8, strength: 1, ref: 1,
  explore: 0.35, poi: 1.2, trade: 1, building: 1, father: 1, hire: 1, alliance: 0.9, native: 0.6, raid: 0.5, teach: 0.6,
  regret: 0.4, loyal: 0, shun: 0.7, qualify: 10, rush: 0.3, noise: 0.02,
};
export type Personality = 'balanced' | 'trader' | 'explorer' | 'missionary' | 'rebel' | 'loyalist' | 'defender' | 'raider';
export const PERSONALITIES: Record<Personality, Partial<Weights>> = {
  balanced: {},
  trader: { trade: 3, crops: 0.7, gold: 0.25, bell: 0.7 },
  explorer: { explore: 2, poi: 4, native: 1.5, raid: 0.7, bell: 0.8 },
  missionary: { cross: 0.6, alliance: 3, native: 1.2, bell: 0.8 },
  rebel: { bell: 1.6, rush: 2, ref: 0.4, loyal: -1 },
  loyalist: { loyal: 2, strength: 1.3, building: 1.3, gold: 0.2 },
  defender: { loyal: -1, strength: 2.5, ref: 2, qualify: 16, alliance: 2, hire: 1.5 },
  raider: { raid: 4, strength: 1.4, hire: 1.4 },
};
