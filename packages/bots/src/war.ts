import type { Siege, State, View } from '@col/engine';
import { attacked, loyalistColony, siegeStrength, warStrength } from '@col/engine';

/** Chance that a colony holds, given attack minus defence. */
export function holdChance(gap: number, faces = 2, need = 1): number {
  const n = Math.min(10, Math.max(0, Math.round(gap)));
  if (n === 0) return 1;
  const q = faces / 6, none = (1 - q) ** n;
  return need === 1 ? none : none + n * q * (1 - q) ** (n - 1);
}
export const odds = (s: State) => {
  const e = s.def.tactics[s.war!.tactic].effect;
  return { faces: e.t === 'successFrom' ? e.faces.length : 2, need: e.t === 'minSuccesses' ? e.value : 1 };
};

interface Plan { militia: number; units: number; mercs: number; cubes: number[]; value: number }

/** Expected hidden strength of one face-down card of player `q`, from their agents and the war cards they took. */
export function hiddenCard(v: View, q: number | null): number {
  const s = v.state, war = s.war!;
  if (q === null) return 0;
  const powers = [...(v.collections[q] ?? []), ...(war.gained[q] ?? [])].map((c) => warStrength(s, c, 0)).sort((a, b) => b - a);
  const placed = war.sieges.reduce((n, x) => n + (x.stacks[q]?.length ?? 0), 0);
  // Players place their best cards, with some bluffing.
  const top = powers.slice(0, Math.max(1, placed));
  return (top.reduce((a, b) => a + b, 0) / Math.max(1, top.length)) * 0.85;
}
/** A siege's attack minus defence, face-down cards counted at their expected strength. */
export function siegeGap(v: View, x: Siege): number {
  const s = v.state, st = siegeStrength(s, x);
  let gap = st.attack.total - st.defence.total;
  for (const [k, c] of Object.entries(x.stacks)) {
    const hidden = c.filter((y) => y === '?').length * hiddenCard(v, Number(k));
    gap += Number(k) === x.owner ? -hidden : hidden;
  }
  return gap;
}

/**
 * Best defence for a patriot: how many militia and mercenaries to take before the cards are placed.
 * Colonies are either defended to the point of holding, or given up, so all subsets are tried with increasing amounts of paid strength.
 */
export function planDefence(v: View, cards: string[], opts: { freeCubes: number; maxMilitia: number; perBell: number; maxMercs: number; bellCost: number; goldCost: number }): { plan: Plan; mine: number[] } {
  const s = v.state, me = v.player, war = s.war!, { faces, need } = odds(s);
  const mine = war.sieges.flatMap((x, i) => (x.owner === me && attacked(x) ? [i] : []));
  const per = s.def.settings.score.patriotColony + s.players[me].fathers.reduce((n, f) => n + s.def.fathers[f].mods.reduce((k, m) => k + (m.mod === 'pointsPerPatriotColony' ? m.value : 0), 0), 0);
  // The loyalist's cards are still in hand: about a third of their strength may come to each colony.
  const foe = war.loyalist === null ? 0 : (war.hands[war.loyalist] ?? []).length * hiddenCard(v, war.loyalist) / Math.max(1, mine.length) * 0.5;
  const gaps = mine.map((i) => siegeGap(v, war.sieges[i]) + foe);
  const free = war.sieges.filter((x) => x.owner === me && !attacked(x)).length;
  const strength = cards.reduce((n, c) => n + warStrength(s, c, 0), 0) + opts.freeCubes;
  let best: Plan = { militia: 0, units: 0, mercs: 0, cubes: mine.map(() => 0), value: -Infinity };
  const maxPaid = opts.maxMilitia + opts.maxMercs;
  for (let set = 0; set < 1 << mine.length; set++) {
    const chosen = mine.map((_, k) => k).filter((k) => set & (1 << k));
    for (let paid = 0; paid <= maxPaid; paid++) {
      // The cheaper source first.
      const milFirst = opts.bellCost / opts.perBell <= opts.goldCost;
      const mil = milFirst ? Math.min(paid, opts.maxMilitia) : Math.max(0, paid - opts.maxMercs);
      const mer = paid - mil;
      const bells = Math.ceil(mil / opts.perBell);
      const cubes = mine.map(() => 0), h = [...gaps];
      let left = strength + paid;
      for (const k of [...chosen].sort((a, b) => h[a] - h[b])) { const n = Math.min(left, Math.max(0, Math.ceil(h[k]))); cubes[k] += n; h[k] -= n; left -= n; }
      const value = h.reduce((n, q) => n + per * holdChance(q, faces, need), 0) - bells * opts.bellCost - mer * opts.goldCost +
        // At least one colony is needed to win at all.
        (free ? 0 : 5 * (1 - h.reduce((n, q) => n * (1 - holdChance(q, faces, need)), 1)));
      if (value > best.value + 1e-9) best = { militia: bells, units: mil, mercs: mer, cubes, value };
      if (!chosen.length) break;
    }
  }
  return { plan: best, mine };
}

/**
 * Where one card does most (W-7): the change in expected points from placing it on this slot.
 * A patriot weighs holding its own colonies against taking a loyalist one, where it scores only if it brings the most strength;
 * the loyalist weighs taking patriot colonies against guarding its own. Face-down cards of others count at their expected strength.
 */
export function deployGain(v: View, card: string, siege: number): number {
  const s = v.state, war = s.war!, me = v.player, x = war.sieges[siege], sc = s.def.settings.score;
  const p = warStrength(s, card, x.cell);
  if (p <= 0) return -0.01;
  const loyal = war.loyalist === me, { faces, need } = odds(s);
  const gap = siegeGap(v, x);
  if (loyalistColony(s, x)) {
    if (loyal) return (holdChance(gap - p) - holdChance(gap)) * (sc.loyalistColony + sc.patriotColony * 0.3);
    // Mine only if I bring the most: count my share against the strongest other patriot.
    const by: Record<number, number> = {};
    for (const [k, c] of Object.entries(x.stacks)) if (Number(k) !== x.owner) by[Number(k)] = c.reduce((n, y) => n + (y === '?' ? hiddenCard(v, Number(k)) : warStrength(s, y, x.cell)), 0);
    const mine = (by[me] ?? 0) + p, rival = Math.max(0, ...Object.entries(by).filter(([q]) => Number(q) !== me).map(([, n]) => n));
    // A tie is settled by a die.
    const share = mine > rival ? 1 : mine === rival ? 0.5 : 0.15;
    return ((1 - holdChance(gap + p)) - (1 - holdChance(gap))) * (sc.patriotColony * share + sc.loyalistColony * 0.3) - 0.05;
  }
  if (loyal) {
    // A colony the loyalist helps to take is theirs only if their cards beat the King's army; a tie is a die (W-13).
    const st = siegeStrength(s, x), mine = st.loyalist + p;
    const theirs = mine > st.ref ? sc.loyalistColony : mine === st.ref ? sc.loyalistColony / 2 : 0;
    return (holdChance(gap, faces, need) - holdChance(gap + p, faces, need)) * (theirs + sc.patriotColony * 0.3);
  }
  const last = s.colonies.filter((c) => c.owner === me).length <= 1 ? 4 : 0;
  return (holdChance(gap - p, faces, need) - holdChance(gap, faces, need)) * (sc.patriotColony + last);
}
