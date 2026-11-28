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
 * - hard: search over the goal bot's 3 best candidates, 30 samples per decision (5 and 60 played as well as expert, 2026-11-28).
 * - expert: search over 8 candidates, 150 samples per decision.
 * Search met its strength goal at 60 samples (PRD); thousands, as a fixed 3 s gave, cost seconds a decision for little more.
 * Both stop sooner once no other candidate can still beat the goal bot's choice, which is how most decisions end.
 * The time is still a limit, for slow machines: 1 s and the PRD's 3 s.
 */
export const LEVELS: Record<Level, { label: string; weights?: Partial<Weights>; search?: Budget & { width: number; settle?: boolean } }> = {
  easy: { label: 'Easy', weights: { noise: 2, regret: 0, qualify: 3, rush: 0 } },
  normal: { label: 'Normal' },
  hard: { label: 'Hard', search: { iterations: 30, ms: 1000, width: 3, settle: true } },
  expert: { label: 'Expert', search: { iterations: 150, ms: 3000, width: 8, settle: true } },
};

/** A bot of a level and personality. `budget` replaces the level's samples and time, e.g. by a number of iterations alone for repeatable batches. */
export function botForLevel(level: Level, seed: string, personality: Personality = 'balanced', budget?: Budget): Bot {
  const l = LEVELS[level], weights = { ...PERSONALITIES[personality], ...l.weights }, name = `${level}-${personality}`;
  if (!l.search) return goalBot(seed, weights, name);
  return searchBot(seed, { ...l.search, ...(budget && { iterations: budget.iterations, ms: budget.ms }), weights, name });
}

/** The best three choices for a human at their current decision, best first, each with why. */
export function advise(v: View, o: Budget & { seed?: string; personality?: Personality } = {}): Considered[] {
  if (!v.legal.length) return [];
  const bot = searchBot(o.seed ?? 'advisor', { weights: PERSONALITIES[o.personality ?? 'balanced'], ms: o.ms ?? 800, iterations: o.iterations, width: 6 });
  bot.choose(v);
  return bot.last.slice(0, 3);
}
