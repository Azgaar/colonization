/** How the Normal bot's opening goes, round by round: food, colonies, bells, buildings, and what its cards did. Usage: node packages/lab/src/playtest/opening.ts [games] [players] */
import { loadRuleset } from '@col/data';
import { botForLevel } from '@col/bots';
import { applyInPlace, createGame, nationsApart, viewFor } from '@col/engine';
const def = loadRuleset(), games = Number(process.argv[2] ?? 100), n = Number(process.argv[3] ?? 2), all = Object.keys(def.nations);
const R = def.settings.rounds.max, food = Array.from({ length: R + 1 }, () => 0), cols = food.map(() => 0), five = food.map(() => 0), acts: Record<string, number>[] = food.map(() => ({}));
let seats = 0, foodSitting = 0;
for (let i = 0; i < games; i++) {
  const nations = nationsApart(def, [...all.slice(i % 10), ...all.slice(0, i % 10)], n), seed = `open-${n}-${i}`;
  const s = createGame({ def, seed, nations, logging: true });
  const bots = nations.map((_, p) => botForLevel('normal', `${seed}-${p}`));
  let round = 1;
  const snap = () => { for (let p = 0; p < n; p++) { food[round] += s.players[p].wh.food; cols[round] += s.colonies.filter((c) => c.owner === p).length; if (s.players[p].wh.food >= 5 && s.colonies.filter((c) => c.owner === p).length < 3) five[round]++; } };
  while (!s.over) {
    if (s.round !== round) { snap(); round = s.round; }
    const p = s.pending!.player, c = bots[p].choose(viewFor(s, p));
    if (c.c === 'play') { const a = acts[s.round]; a[c.a as string] = (a[c.a as string] ?? 0) + 1; }
    applyInPlace(s, c, true);
  }
  seats += n;
  for (let p = 0; p < n; p++) if (s.players[p].wh.food >= 5) foodSitting++;
}
for (let r = 1; r < R; r++) console.log(`end of round ${r}: food ${(food[r + 1] / seats).toFixed(1)}, colonies ${(cols[r + 1] / seats).toFixed(2)}, seats with 5+ food and room for a colony ${(100 * five[r + 1] / seats).toFixed(0)}%; round ${r} plays: ${Object.entries(acts[r]).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${k} ${(v / seats).toFixed(1)}`).join(', ')}`);
console.log(`seats ending with 5+ food unspent: ${(100 * foodSitting / seats).toFixed(0)}%`);
