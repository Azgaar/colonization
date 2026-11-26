/* Standing forecasts (FR-U-15): each governor's expected score, the likely loyalist, and how each of the shown player's colonies would fare in the war.
 * Worked out from what the shown seat may know (its view), with the bots' own war estimate, so nothing hidden leaks. */
import { forecast, holdChance } from '@col/bots';
import { findLoyalist, viewFor } from '@col/engine';
import { D, me } from './data.ts';
import { Places } from './places.ts';
import { Sim } from './sim.ts';

export interface Outlook {
  /** Rounds still expected before the war, the current one excluded, and the round it should come in. */
  rounds: number; warRound: number;
  /** Per governor: expected final points, and the chance to keep at least one colony (without which nobody wins). */
  players: { points: number; keeps: number }[];
  loyalist: number | null;
  /** The shown player's colonies: attack against defence, and the chance to hold, now and when the war is expected. */
  colonies: { cell: number; defence: number; now: { attack: number; hold: number }; then: { attack: number; hold: number } }[];
}

export function outlook(): Outlook | null {
  const s = Sim.s;
  if (!s || s.over) return null;
  const v = viewFor(s, me), set = s.def.settings, top = Math.max(...s.players.map((p) => p.bells));
  // Like the bots: about four bells a round towards the war, never past the last round.
  const left = top >= set.war.bells ? 1 : Math.min(set.rounds.max - s.round + 1, Math.max(1, Math.ceil((set.war.bells - top) / 4) + 1)), rounds = left - 1;
  const loyalist = s.players.length > 1 ? findLoyalist(v.state) : null;
  const players = forecast(v.state, v.collections, loyalist, rounds).map((f) => ({ points: Math.round(f.points), keeps: f.qualifies }));
  // The King's army grows each round, at least as fast as it has so far.
  const A = Places.army(), rate = Math.max(s.players.length * 0.7, s.ref / Math.max(1, s.round)), later = A.pool + rate * rounds;
  const colonies = me === A.loyal ? [] : D.colonies.filter((c) => c.owner === me).map((c) => {
    const now = (A.per[c.cell] ?? 0) * set.war.refStrength, then = Math.round((later / Math.max(1, A.targets)) * set.war.refStrength);
    return { cell: c.cell, defence: c.defence, now: { attack: now, hold: holdChance(now - c.defence) }, then: { attack: then, hold: holdChance(then - c.defence) } };
  });
  return { rounds, warRound: Math.min(set.rounds.max, s.round + rounds), players, loyalist, colonies };
}
