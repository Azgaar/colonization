/** Look for bots that waste actions: moves that change nothing, and games without a colony. */
import { loadRuleset } from '@col/data';
import { PERSONALITIES, type GoalBot, type Personality } from '@col/bots';
import { makeBot, type BotSpec } from './pool.ts';
import { table } from './design.ts';
import { playGame } from './play.ts';
const def = loadRuleset(), names = Object.keys(PERSONALITIES) as Personality[];
const specs = table(def, { prefix: 'stall', games: Number(process.argv[2] ?? 60), players: 4, bots: names.map((p): BotSpec => ({ kind: 'goal', name: p, personality: p })) });
const why: string[] = [];
let moves = 0, idle = 0, none = 0, seats = 0;
const kinds: Record<string, number> = {}, bad: string[] = [];
for (const g of specs) {
  let before = '', p = -1, what = '';
  const bots = g.bots.map((b, k) => makeBot(b, `${g.seed}-${k}`)) as GoalBot[];
  let path = '';
  const { state } = playGame({ def, seed: g.seed, nations: g.nations, bots, onDecision: (s) => {
    const sig = (q: number) => { const x = s.players[q]; return JSON.stringify([x.ship, x.inf, x.hold, x.wh, s.revealed, x.gold, x.bells, x.crosses, x.damage, x.discard.length > 0 && 0]); };
    if (s.pending!.kind === 'move' && !what) why[s.pending!.player] = bots[s.pending!.player].last[0]?.why ?? '';
    if (s.pending!.kind === 'turn') {

      if (what) { moves++; if (sig(p) === before) { idle++; const k = `${what.split(' ')[1]}: ${why[p]} | ${path}`; kinds[k] = (kinds[k] ?? 0) + 1; } }
      path = '';
      p = s.pending!.player; before = sig(p); what = '';
    } else if (s.pending!.kind === 'move' && s.pending!.player === p && what) path += ` >${bots[p].last[0]?.why}:${bots[p].last[0]?.choice.c}`; else if (s.pending!.kind === 'move' && s.move!.player === p && !what) what = `${g.bots[p].kind === 'goal' ? (g.bots[p] as { name: string }).name : ''} ${s.move!.token}`;
  } });
  state.players.forEach((_, q) => { seats++; if (!state.colonies.some((c) => c.owner === q)) { none++; bad.push(`${g.seed}#${q}`); } });
}
console.log(Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${v} ${k}`).join('\n'));
console.log(`idle moves ${idle} of ${moves}`, `seats without a colony ${none} of ${seats}`, bad.slice(0, 10).join(' '));
