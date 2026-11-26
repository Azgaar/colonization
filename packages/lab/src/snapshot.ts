/** Find a position worth looking at and save it for the interface prototype. Usage: node packages/lab/src/snapshot.ts */
import { writeFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { goalBot, PERSONALITIES } from '@col/bots';
import { actionsFor, applyInPlace, createGame, map, save, util, viewFor, type State } from '@col/engine';

const def = loadRuleset(), nations = ['french', 'english', 'spanish', 'dutch'], me = 0;
const kinds = ['trader', 'balanced', 'explorer', 'missionary'] as const;
let best: { seed: string; score: number; at: State; end: State } | null = null;
for (let i = 0; i < 160; i++) {
  const seed = `show${i}`;
  const s = createGame({ def, seed, nations, logging: true });
  const bots = kinds.map((k, p) => goalBot(`${seed}${p}`, PERSONALITIES[k]));
  let at: State | null = null, score = -1;
  while (!s.over) {
    const p = s.pending!.player;
    if (p === me && s.pending!.kind === 'turn' && s.round >= 4 && s.round <= 6 && s.players[me].hand.length >= 4) {
      const pl = s.players[me], acts = new Set(pl.hand.flatMap((c) => actionsFor(s, me, c).filter((a) => a.options.length).map((a) => a.action)));
      const v = acts.size + s.colonies.filter((c) => c.owner === me).length * 4 + pl.buildings.length * 2 + pl.fathers.length * 3 + s.colonies.length + (typeof pl.inf === 'number' ? 3 : 0) + util.total(pl.hold) + (map.inEurope(s, pl.ship) ? -4 : 4) + new Set(pl.hand.map((c) => util.baseOf(s, c))).size + s.settlements.filter((x) => x.alive && x.ally !== null).length * 3;
      const unopened = s.revealed.filter((r) => !r).length;
      const total = v + (unopened >= 1 && unopened <= 5 ? 6 : 0);
      if (total > score) { score = total; at = structuredClone({ ...s, def: null, log: s.log }) as unknown as State; at.def = def; }
    }
    applyInPlace(s, bots[p].choose(viewFor(s, p)));
  }
  if (at && (!best || score > best.score)) best = { seed, score, at, end: s };
}
const { at: s, seed } = best!;
writeFileSync('prototypes/build/start.js', `window.START = ${JSON.stringify(save(s))};\n`);
console.log(seed, 'round', s.round, 'hand', s.players[me].hand);
