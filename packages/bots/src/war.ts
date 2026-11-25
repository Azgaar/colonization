import type { Choice, Siege, State, View } from '@col/engine';
import { attacked, cardStrength, siegeStrength } from '@col/engine';

/** Chance that a colony holds, given attack minus defence. */
export function holdChance(gap: number, faces = 2, need = 1): number {
  const n = Math.min(10, Math.max(0, Math.round(gap)));
  if (n === 0) return 1;
  const q = faces / 6, none = (1 - q) ** n;
  return need === 1 ? none : none + n * q * (1 - q) ** (n - 1);
}
const odds = (s: State) => {
  const e = s.def.tactics[s.war!.tactic].effect;
  return { faces: e.t === 'successFrom' ? e.faces.length : 2, need: e.t === 'minSuccesses' ? e.value : 1 };
};

interface Plan { army: Record<string, number>; militia: number; mercs: number; cubes: number[]; value: number }

/** Expected hidden strength of one face-down loyalist card. */
function hiddenCard(v: View): number {
  const s = v.state, l = s.war!.loyalist;
  if (l === null) return 0;
  const powers = (v.collections[l] ?? []).map((c) => cardStrength(s, c, 'best', false, 0)).sort((a, b) => b - a);
  const placed = s.war!.sieges.reduce((n, x) => n + x.loyalist.length, 0);
  // Loyalists place their best cards, with some bluffing.
  const top = powers.slice(0, Math.max(1, placed));
  return (top.reduce((a, b) => a + b, 0) / Math.max(1, top.length)) * 0.85;
}

/**
 * Best defence for a patriot. Colonies are either defended to the point of holding, or given up,
 * so all subsets are tried with increasing amounts of paid support.
 */
export function planDefence(v: View, cards: string[], opts: { freeCubes: number; maxMilitia: number; perBell: number; maxMercs: number; bellCost: number; goldCost: number }): { plan: Plan; mine: number[]; assign: Map<number, number> } {
  const s = v.state, me = v.player, war = s.war!, { faces, need } = odds(s), hid = hiddenCard(v);
  const mine = war.sieges.flatMap((x, i) => (x.owner === me && attacked(x) ? [i] : []));
  const per = s.def.settings.score.patriotColony + s.players[me].fathers.reduce((n, f) => n + s.def.fathers[f].mods.reduce((k, m) => k + (m.mod === 'pointsPerPatriotColony' ? m.value : 0), 0), 0);
  const gaps = mine.map((i) => {
    const x: Siege = { ...war.sieges[i], loyalist: [] };
    const st = siegeStrength(s, x);
    return st.attack.total + war.sieges[i].loyalist.length * hid - st.defence.total;
  });
  const free = war.sieges.filter((x) => x.owner === me && !attacked(x)).length;
  const power = cards.map((c, i) => ({ i, p: cardStrength(s, c, 'best', false, 0) })).sort((a, b) => b.p - a.p);
  let best: Plan = { army: {}, militia: 0, mercs: 0, cubes: mine.map(() => 0), value: -Infinity }, bestAssign = new Map<number, number>();
  const maxPaid = opts.maxMilitia + opts.maxMercs;
  for (let set = 0; set < 1 << mine.length; set++) {
    const chosen = mine.map((_, k) => k).filter((k) => set & (1 << k));
    if (!chosen.length && mine.length) { if (set === 0) { const val = gaps.reduce((n, g) => n + per * holdChance(g, faces, need), 0); if (val > best.value) { best = { army: {}, militia: 0, mercs: 0, cubes: mine.map(() => 0), value: val }; bestAssign = new Map(); } } continue; }
    // Cards: strongest to the colony with the largest remaining gap that is not yet closed.
    const g = [...gaps], assign = new Map<number, number>();
    for (const c of power) {
      if (c.p <= 0) continue;
      const open = chosen.filter((k) => g[k] > 0).sort((a, b) => g[a] - g[b]);
      // Finish the easiest first unless this card overshoots and another needs it.
      const k = open.find((z) => g[z] >= c.p) ?? open[0] ?? chosen[0];
      if (k === undefined) break;
      assign.set(c.i, k);
      g[k] -= c.p;
    }
    for (let paid = 0; paid <= maxPaid; paid++) {
      // The cheaper source first.
      const milFirst = opts.bellCost / opts.perBell <= opts.goldCost;
      const mil = milFirst ? Math.min(paid, opts.maxMilitia) : Math.max(0, paid - opts.maxMercs);
      const mer = paid - mil;
      const bells = Math.ceil(mil / opts.perBell);
      const cubes = mine.map(() => 0), h = [...g];
      let left = opts.freeCubes + paid;
      for (const k of [...chosen].sort((a, b) => h[a] - h[b])) { const n = Math.min(left, Math.max(0, Math.ceil(h[k]))); cubes[k] += n; h[k] -= n; left -= n; }
      if (left > 0 && chosen.length) cubes[chosen[0]] += left;
      const value = h.reduce((n, q) => n + per * holdChance(q, faces, need), 0) - bells * opts.bellCost - mer * opts.goldCost +
        // At least one colony is needed to win at all.
        (free ? 0 : 5 * (1 - h.reduce((n, q) => n * (1 - holdChance(q, faces, need)), 1)));
      if (value > best.value + 1e-9) { best = { army: {}, militia: bells, mercs: mer, cubes, value }; bestAssign = assign; }
    }
  }
  return { plan: best, mine, assign: bestAssign };
}

/** Where the loyalist wants each card. */
export function planAssault(v: View, cards: string[]): Choice[] {
  const s = v.state, war = s.war!;
  const order = war.sieges.map((x, i) => {
    const st = siegeStrength(s, { ...x, loyalist: [] });
    const placed = x.loyalist.reduce((n, c) => n + cardStrength(s, c, 'best', false, 0), 0) + x.militia;
    return { i, ref: st.ref, placed, gap: st.attack.total - st.defence.total };
  }).sort((a, b) => b.placed - a.placed || a.ref - b.ref || b.gap - a.gap);
  const need = order.map((o) => Math.max(1, o.ref) - o.placed);
  const out: Choice[] = [];
  const total = cards.reduce((n, c) => n + cardStrength(s, c, 'best', false, 0), 0);
  // Capture as many of the cheapest colonies as the army allows.
  let k = 0, sum = 0;
  const goal: number[] = [];
  for (; k < order.length && sum + Math.max(0, need[k]) <= total; k++) { goal.push(k); sum += Math.max(0, need[k]); }
  if (!goal.length && order.length) goal.push(0);
  const left = goal.map((x) => need[x]);
  for (const card of cards) {
    const p = cardStrength(s, card, 'best', false, 0);
    if (p <= 0 || !goal.length) { out.push({ c: 'keep', card }); continue; }
    let z = left.findIndex((n) => n > 0);
    if (z < 0) z = 0;
    left[z] -= p;
    out.push({ c: 'place', card, siege: order[goal[z]].i });
  }
  return out;
}
