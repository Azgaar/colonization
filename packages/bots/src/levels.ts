import type { View } from '@col/engine';
import type { Bot } from './random.ts';
import { goalBot, type Considered } from './goal.ts';
import { searchBot, type Budget } from './search.ts';
import { PERSONALITIES, type Personality, type Weights } from './weights.ts';

export type Level = 'easy' | 'normal' | 'hard' | 'expert';
/**
 * Levels change only how well a bot thinks, never the rules or what it gets.
 * - easy: the goal bot with much noise (about two points either way, so it often takes a clearly worse action)
 *   and no weight on opportunity cost or on keeping a colony, so it plays for the moment.
 * - normal: the goal bot with its tuned weights, the default opponent.
 * - hard: search over the goal bot's 5 best candidates, about 1 s per decision.
 * - expert: search over 8 candidates with the full 3 s per decision of the PRD.
 */
export const LEVELS: Record<Level, { label: string; weights?: Partial<Weights>; search?: Budget & { width: number } }> = {
  easy: { label: 'Easy', weights: { noise: 2, regret: 0, qualify: 3, rush: 0 } },
  normal: { label: 'Normal' },
  hard: { label: 'Hard', search: { ms: 1000, width: 5 } },
  expert: { label: 'Expert', search: { ms: 3000, width: 8 } },
};

/** A bot of a level and personality. `budget` replaces the thinking time, e.g. by a number of iterations for repeatable batches. */
export function botForLevel(level: Level, seed: string, personality: Personality = 'balanced', budget?: Budget): Bot {
  const l = LEVELS[level], weights = { ...PERSONALITIES[personality], ...l.weights }, name = `${level}-${personality}`;
  if (!l.search) return goalBot(seed, weights, name);
  return searchBot(seed, { ...l.search, ...budget, weights, name });
}

/** The best three choices for a human at their current decision, best first, each with why. */
export function advise(v: View, o: Budget & { seed?: string; personality?: Personality } = {}): Considered[] {
  if (!v.legal.length) return [];
  const bot = searchBot(o.seed ?? 'advisor', { weights: PERSONALITIES[o.personality ?? 'balanced'], ms: o.ms ?? 800, iterations: o.iterations, width: 6 });
  bot.choose(v);
  return bot.last.slice(0, 3);
}
