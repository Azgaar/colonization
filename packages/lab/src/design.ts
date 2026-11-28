import { nationsApart } from '@col/engine';
import type { GameDef } from '@col/data';
import type { BotSpec, GameSpec } from './game.ts';

/**
 * A balanced set of games: nations are drawn so that each plays equally often, and
 * bots rotate through the seats.
 */
export function table(def: GameDef, o: { prefix: string; games: number; players: number; bots: BotSpec[]; nations?: string[]; changes?: GameSpec['changes']; ruleset?: string }): GameSpec[] {
  const all = o.nations ?? Object.keys(def.nations);
  return Array.from({ length: o.games }, (_, i) => {
    // A different stride per block spreads the pairings.
    const step = 1 + (Math.floor(i / all.length) % (all.length - 1));
    const nations: string[] = [];
    for (let k = 0; nations.length < all.length; k++) { const x = all[(i + k * step + Math.floor(k / all.length)) % all.length]; if (!nations.includes(x)) nations.push(x); else { const y = all.find((z) => !nations.includes(z))!; nations.push(y); } }
    // Two nations of one colour never play together (DD-124).
    nations.splice(0, nations.length, ...nationsApart(def, nations, o.players));
    const bots = nations.map((_x, p) => o.bots[(p + i) % o.bots.length]);
    return { seed: `${o.prefix}-${i}`, nations, bots, ...(o.changes ? { changes: o.changes } : {}), ...(o.ruleset ? { ruleset: o.ruleset } : {}) };
  });
}
