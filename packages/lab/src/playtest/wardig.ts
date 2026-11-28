/** Why patriots lose every colony: their sieges and where their war cards went. Usage: node packages/lab/src/playtest/wardig.ts [games] */
import { loadRuleset } from '@col/data';
import { botForLevel } from '@col/bots';
import { applyInPlace, createGame, nationsApart, viewFor, warStrength } from '@col/engine';
const def = loadRuleset(), games = Number(process.argv[2] ?? 200), all = Object.keys(def.nations);
let patriots = 0, destroyed = 0, away = 0, couldHold = 0;
for (let i = 0; i < games; i++) {
  const nations = nationsApart(def, [...all.slice(i % 10), ...all.slice(0, i % 10)], 4), seed = `dig-${i}`;
  const s = createGame({ def, seed, nations, logging: true });
  const bots = nations.map((_, p) => botForLevel('normal', `${seed}-${p}`));
  let hands: string[][] = [];
  while (!s.over) { const p = s.pending!.player; if (s.war && !hands.length && s.pending!.kind === 'deploy') hands = s.players.map((_, q) => [...(s.war!.hands[q] ?? [])]); applyInPlace(s, bots[p].choose(viewFor(s, p)), true); }
  const w = s.war!;
  for (let p = 0; p < 4; p++) {
    if (p === w.loyalist || !s.colonies.some((c) => c.owner === p)) continue;
    patriots++;
    if (s.over.players[p].score !== 0) continue;
    destroyed++;
    const mine = w.sieges.filter((x) => x.owner === p), elsewhere = w.sieges.filter((x) => x.owner !== p).reduce((n, x) => n + (x.stacks[p]?.length ?? 0), 0);
    if (elsewhere) away++;
    const gaps = mine.map((x) => (x.attack ?? 0) - (x.defence ?? 0));
    const placedAway = w.sieges.filter((x) => x.owner !== p).reduce((n, x) => n + (x.stacks[p] ?? []).reduce((k, c) => k + warStrength(s, c, x.cell), 0), 0);
    if (Math.min(...gaps) - placedAway <= 2) couldHold++;
    if (destroyed <= 12) console.log(`${seed} P${p} ${nations[p]} colonies ${mine.length} gaps ${gaps.join(',')} cards away ${elsewhere} (strength ${placedAway}) hand ${hands[p]?.length} lost score ${s.over.players[p].parts.length}`);
  }
}
console.log(`patriots ${patriots}, destroyed ${destroyed} (${(100 * destroyed / patriots).toFixed(0)}%), with cards placed on others' colonies ${away}, of them gap within 2 after taking those cards back ${couldHold}`);
