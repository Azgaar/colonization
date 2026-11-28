/** Turns where the Normal bot holds the food for a colony and room for one, yet does something else: where its pawn is, and what it chose. */
import { loadRuleset } from '@col/data';
import { BASE, botForLevel, read } from '@col/bots';
import { applyInPlace, createGame, nationsApart, viewFor } from '@col/engine';
const def = loadRuleset(), games = Number(process.argv[2] ?? 100), n = Number(process.argv[3] ?? 2), all = Object.keys(def.nations);
const where: Record<string, number> = {}, chose: Record<string, number> = {};
let turns = 0, noSites = 0, settleOffered = 0;
for (let i = 0; i < games; i++) {
  const nations = nationsApart(def, [...all.slice(i % 10), ...all.slice(0, i % 10)], n), seed = `why-${n}-${i}`;
  const s = createGame({ def, seed, nations, logging: false });
  const bots = nations.map((_, p) => botForLevel('normal', `${seed}-${p}`));
  while (!s.over) {
    const p = s.pending!.player, v = viewFor(s, p), pl = s.players[p], b = bots[p] as unknown as { last: { choice: { c: string; a?: string }; why: string }[] };
    const c = bots[p].choose(v);
    if (s.pending!.kind === 'turn' && s.round <= 7 && pl.wh.food >= 5) {
      const mine = s.colonies.filter((k) => k.owner === p).length;
      if (mine >= 1 && mine < 3) {
        turns++;
        const x = read(v, BASE);
        if (!x.sites.length) noSites++;
        const k = pl.inf === 'ship' ? 'aboard' : pl.inf === 'europe' ? 'europe' : s.colonies.some((q) => q.cell === pl.inf) ? 'in a colony' : 'on land';
        where[k] = (where[k] ?? 0) + 1;
        const why = b.last[0]?.why ?? '?';
        chose[why] = (chose[why] ?? 0) + 1;
        if (b.last.some((q) => /settle|found/.test(q.why))) settleOffered++;
      }
    }
    applyInPlace(s, c, true);
  }
}
const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${(100 * v / turns).toFixed(0)}%`).join(', ');
console.log(`${turns} turns with 5+ food, 1-2 colonies, round 7 or earlier. No legal site known: ${(100 * noSites / turns).toFixed(0)}%. A settle or found in the top 5: ${(100 * settleOffered / turns).toFixed(0)}%`);
console.log(`pawn: ${top(where)}`);
console.log(`chosen: ${top(chose)}`);
