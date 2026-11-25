import type { GameDef } from '@col/data';
import type { Choice, State } from '@col/engine';
import { applyInPlace, createGame, legal, problems, viewFor } from '@col/engine';
import type { Bot } from '@col/bots';

export interface PlayOptions { def: GameDef; seed: string; nations: string[]; bots: Bot[]; check?: boolean; fastView?: boolean; maxChoices?: number; logging?: boolean; rich?: boolean; onDecision?: (s: State) => void }
export class GameFailure extends Error {
  readonly seed: string; readonly nations: string[]; readonly choices: Choice[];
  constructor(message: string, seed: string, nations: string[], choices: Choice[]) { super(message); this.seed = seed; this.nations = nations; this.choices = choices; }
}

/** Play one game to the end. Any failure carries what is needed to replay it. */
export function playGame(o: PlayOptions): { state: State; choices: Choice[] } {
  const choices: Choice[] = [];
  try {
    const s = createGame({ def: o.def, seed: o.seed, nations: o.nations, logging: o.logging ?? false });
    if (o.rich) for (const p of s.players) { p.gold = 80; p.bells = 10; p.crosses = 10; if (p.buildings.length === 0) { p.buildings.push('school'); s.buildingsLeft.school--; } p.wh = { food: 1, timber: 6, crops: 1, goods: 0, silver: 0 }; }
    while (!s.over) {
      o.onDecision?.(s);
      if (o.check) { const bad = problems(s); if (bad.length) throw new Error(bad.join('; ')); }
      if (choices.length >= (o.maxChoices ?? 20000)) throw new Error('the game does not end');
      const p = s.pending!.player;
      // Bots that only look at the list of choices can skip building the view.
      const c = o.bots[p].choose(o.fastView ? { player: p, state: s, legal: legal(s) } : viewFor(s, p));
      choices.push(c);
      applyInPlace(s, c, !o.check);
    }
    return { state: s, choices };
  } catch (e) {
    throw new GameFailure(`seed "${o.seed}", ${o.nations.join('+')}, choice ${choices.length}: ${(e as Error).stack}`, o.seed, o.nations, choices);
  }
}
