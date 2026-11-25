/** Show what one seat considered. Usage: node packages/lab/src/trace.ts [seed] [players] [seat] [personality] [weights.json] */
import { readFileSync } from 'node:fs';
import { loadRuleset } from '@col/data';
import { goalBot, PERSONALITIES, type Personality } from '@col/bots';
import { map } from '@col/engine';
import { playGame } from './play.ts';
const [seed = 'solo1', n = '1', seat = '0', kind = 'balanced', file] = process.argv.slice(2);
const def = loadRuleset(), nations = Object.keys(def.nations).slice(0, Number(n));
const w = { ...PERSONALITIES[kind as Personality], ...(file ? JSON.parse(readFileSync(file, 'utf8')).weights : {}) };
const bots = nations.map((_, p) => goalBot(`${seed}${p}`, w));
let seen = 0;
const { state: s } = playGame({ def, seed, nations, bots, logging: true, onDecision: (st) => {
  for (; seen < st.log.length; seen++) { const e = st.log[seen]; if (e.e === 'round') console.log(`\nROUND ${e.n} score ${e.scores} bells ${st.players.map((p) => p.bells)} gold ${st.players.map((p) => p.gold)} ref ${e.ref} wh ${JSON.stringify(st.players[+seat].wh)} hold ${JSON.stringify(st.players[+seat].hold)} b ${st.players[+seat].buildings}`);
    else if (e.p === +seat && e.e === 'play') console.log(`  ${e.card} ${e.a} ${e.building ?? e.icon ?? ''}   [${bots[+seat].last.slice(0, 3).map((c) => `${c.choice.a ?? c.choice.c}${c.choice.building ?? c.choice.icon ?? ''} ${c.score.toFixed(2)} ${c.why}`).join(' | ')}]`);
    else if (e.p === +seat && ['step', 'found', 'embark', 'poi', 'toEurope', 'reveal', 'tax', 'siege'].includes(e.e)) console.log(`      ${e.e} ${e.cell ?? e.frag ?? e.card ?? e.pay ?? ''} ${e.e === 'siege' ? JSON.stringify([e.attack, e.defence, e.dice]) : ''}`); }
} });
console.log(s.over!.players.map((p) => `${p.side} ${p.score} ${p.parts.map((x) => `${x.label} ${x.value}`)}`).join('\n'));
for (let r = 0; r < 16; r++) console.log(Array.from({ length: 16 }, (_, c) => { const x = r * 16 + c; return s.colonies.some((z) => z.cell === x) ? 'C' : s.players[+seat].inf === x ? 'I' : s.settlements.some((z) => z.alive && z.cell === x) ? 'v' : s.map.zone[x] !== 'map' ? '~' : !map.isOpen(s, x) ? '?' : { ocean: '.', forest: 'f', grassland: 'g', mountains: 'm', desert: 'd', tundra: 't' }[s.map.terrain[x]!]; }).join(' '), `  ${r * 16}`);
