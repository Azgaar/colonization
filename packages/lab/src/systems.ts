/**
 * Does every system work in general? Plays games with all checks on and lists what was exercised and how often.
 * Usage: pnpm systems [games]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { choiceKey, nationsApart, replay } from '@col/engine';
import { goalBot, PERSONALITIES, randomBot, type Bot, type Personality } from '@col/bots';
import { playGame } from './play.ts';
import { record, type GameRecord } from './record.ts';
import { compareTable, mdTable } from './metrics.ts';

const games = Number(process.argv[2] ?? 300), def = loadRuleset(), all = Object.keys(def.nations), names = Object.keys(PERSONALITIES) as Personality[];
const decisions: Record<string, Set<string>> = {}, kinds: Record<string, number> = {}, log: Record<string, number> = {}, cards = new Set<string>(), seen = new Set<string>();
const bump = (o: Record<string, number>, k: string, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const rs: GameRecord[] = [];
let failures = 0, replays = 0;
for (let i = 0; i < games; i++) {
  const n = (i % 5) + 1, nations = nationsApart(def, Array.from({ length: all.length }, (_, k) => all[(i * 3 + k * 7) % all.length]), n);
  // Goal-driven bots, with one random seat now and then for what they avoid.
  const bots: Bot[] = nations.map((_, p) => (i % 4 === 3 && p === 0 ? randomBot(`s${i}`, true) : goalBot(`s${i}-${p}`, PERSONALITIES[names[(i + p) % names.length]], names[(i + p) % names.length])));
  try {
    const seed = `sys-${i}`;
    const { state, choices } = playGame({ def, seed, nations, bots, check: true, logging: true, onDecision: (s) => bump(kinds, s.pending!.kind) });
    for (const e of state.log) {
      bump(log, e.e);
      if (e.e === 'play') bump(log, `action ${e.a}`);
      if (e.e === 'attack') bump(log, `attack ${e.mode} on ${e.target}`);
      if (e.e === 'event') cards.add(`event ${e.id}`);
      if (e.e === 'poi') cards.add(`${e.deck} ${e.card}`);
      if (e.e === 'father') cards.add(`father ${e.father}`);
      if (e.e === 'build') cards.add(`building ${e.building}`);
      if (e.e === 'war') cards.add(`tactic ${e.tactic}`);
      if (e.e === 'hire') cards.add(`agent ${e.agent}`);
      if (e.e === 'settlement') cards.add(`tribe ${e.tribe}`);
    }
    for (const c of choices) (decisions[c.c] ??= new Set()).add(String(c.a ?? ''));
    nations.forEach((x) => seen.add(x));
    if (i % 10 === 0) { if (choiceKey(replay({ def, seed, nations, logging: true }, choices).log) !== choiceKey(state.log)) throw new Error(`replay differs for ${seed}`); replays++; }
    rs.push(record(state, choices, bots.map((b) => b.name), 'board'));
  } catch (e) { failures++; console.log((e as Error).message.slice(0, 400)); }
}
const want: [string, string[]][] = [['event', Object.keys(def.events)], ['ruin', Object.keys(def.ruins)], ['wreck', Object.keys(def.wrecks)], ['father', Object.keys(def.fathers)], ['building', Object.keys(def.buildings)], ['tactic', Object.keys(def.tactics)], ['tribe', Object.keys(def.tribes)], ['agent', Object.values(def.agents).filter((a) => a.kind === 'common').map((a) => a.id)]];
const out = [
  `${rs.length} games with every check on, ${failures} failures, ${replays} replays identical, ${seen.size} of ${all.length} nations.`,
  mdTable(['Cards', 'seen', 'of', 'not seen'], want.map(([k, ids]) => { const miss = ids.filter((x) => !cards.has(`${k} ${x}`)); return [k, String(ids.length - miss.length), String(ids.length), miss.join(', ') || '–']; })),
  mdTable(['Action or event', 'times per game'], Object.entries(log).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, (v / rs.length).toFixed(2)])),
  mdTable(['Decision', 'times per game'], Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, (v / rs.length).toFixed(2)])),
  compareTable([1, 2, 3, 4, 5].map((n) => [`${n}p`, rs.filter((r) => r.n === n)])),
];
mkdirSync('out', { recursive: true });
writeFileSync('out/systems.md', out.join('\n\n'));
console.log(out.join('\n\n'));
process.exit(failures ? 1 : 0);
