/**
 * One seat played from the command line, a decision at a time, so that an agent (Claude Code) can play the game.
 * The other seats are bots of a level; between the seat's decisions they play on their own.
 * The game is kept in out/seat/<id>.json as its seed and choices. When it ends, the same seed is played with a bot
 * of that level in the seat, so that the result says whether the seat did better than the bot would have.
 *
 *   node packages/lab/src/seat.ts new [id] [--vs normal|easy|hard|expert] [--players 2] [--seat 0] [--seed s] [--nations a,b] [--hints]
 *   node packages/lab/src/seat.ts show [id]           the current decision again
 *   node packages/lab/src/seat.ts pick <n> [id] [--why "reason"]
 *   node packages/lab/src/seat.ts result [id]
 *
 * The rulebook as text is written to out/seat/rules.txt (built from rulebook/dist/en.html by `pnpm rulebook`).
 * --hints shows the goal bot's best candidates with each decision.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { botForLevel, goalBot, LEVELS, type Bot, type Level } from '@col/bots';
import { applyInPlace, choiceKey, createGame, viewFor, type Choice, type State } from '@col/engine';
import { parseArgs } from './args.ts';
import { defFor } from './game.ts';
import { choiceText, decisionPrompt, rulebookText } from './llm/describe.ts';
import { mean } from './stats.ts';

interface Saved {
  id: string; seed: string; nations: string[]; seat: number; vs: Level; ruleset: string; hints: boolean;
  choices: Choice[];
  /** The seat's own decisions: where in `choices`, what it picked and why. */
  picks: { at: number; round: number; kind: string; options: number; picked: string; why?: string; bot: boolean }[];
}
const DIR = 'out/seat';
const file = (id: string) => `${DIR}/${id}.json`;
const { pos, opt } = parseArgs(process.argv.slice(2));
const [cmd = 'show'] = pos;

/** Search levels count samples only, so that the game is the same every time it is replayed. */
const bot = (g: Saved, seed: string): Bot => botForLevel(g.vs, seed, 'balanced', LEVELS[g.vs].search ? { iterations: LEVELS[g.vs].search!.iterations } : undefined);

function load(id: string): { g: Saved; s: State } {
  if (!existsSync(file(id))) throw new Error(`no game "${id}": start one with "new ${id}"`);
  const g = JSON.parse(readFileSync(file(id), 'utf8')) as Saved;
  const s = createGame({ def: defFor({ ruleset: g.ruleset }), seed: g.seed, nations: g.nations, logging: false });
  for (const c of g.choices) applyInPlace(s, c, true);
  return { g, s };
}
const save = (g: Saved) => writeFileSync(file(g.id), JSON.stringify(g));

/** The bots play, and the seat's decisions with one choice are taken, until the seat has something to decide. */
function advance(g: Saved, s: State) {
  const bots = g.nations.map((_, p) => bot(g, `${g.seed}-${p}`));
  while (!s.over) {
    const p = s.pending!.player, v = viewFor(s, p);
    if (p === g.seat && v.legal.length > 1) return;
    const c = p === g.seat ? v.legal[0] : bots[p].choose(v);
    g.choices.push(c);
    applyInPlace(s, c, true);
  }
}

function show(g: Saved, s: State) {
  if (s.over) { result(g, s); return; }
  const v = viewFor(s, g.seat);
  let hints: { index: number; why: string }[] | undefined;
  if (g.hints) {
    const gb = goalBot(`${g.seed}-hint`), keys = v.legal.map(choiceKey);
    gb.choose(v);
    hints = gb.last.map((c) => ({ index: keys.indexOf(choiceKey(c.choice)), why: c.why })).filter((h) => h.index >= 0);
  }
  console.log(decisionPrompt(v, { hints }));
  console.log(`\nAnswer: node packages/lab/src/seat.ts pick <number> ${g.id} --why "<short reason>"`);
}

function result(g: Saved, s: State) {
  const r = s.over!, me = g.seat;
  const line = (st: State) => {
    const sc = st.over!.players.map((x) => x.score), won = st.over!.winners.includes(me);
    return { score: sc[me], others: mean(sc.filter((_, i) => i !== me)), won, text: st.over!.players.map((x) => `P${x.player} ${x.score} (${x.side})`).join(', ') };
  };
  // The same game with a bot of the level in the seat.
  const base = createGame({ def: s.def, seed: g.seed, nations: g.nations, logging: false });
  const bots = g.nations.map((_, p) => bot(g, `${g.seed}-${p}`));
  while (!base.over) { const p = base.pending!.player; applyInPlace(base, bots[p].choose(viewFor(base, p)), true); }
  const a = line(s), b = line(base);
  console.log(`Game over (${r.reason}). You were P${me} (${s.def.nations[g.nations[me]].en}).`);
  console.log(`You:            ${a.text}. Winners ${r.winners.map((w) => `P${w}`).join(', ') || 'nobody'}.`);
  console.log(`Bot in your seat: ${b.text}. Winners ${base.over!.winners.map((w) => `P${w}`).join(', ') || 'nobody'}.`);
  console.log(`Your margin over the others' mean ${(a.score - a.others).toFixed(1)}${a.won ? ', you won' : ''}; the ${LEVELS[g.vs].label} bot's in your seat ${(b.score - b.others).toFixed(1)}${b.won ? ', it won' : ''}.`);
  console.log(`${g.picks.length} decisions, ${g.picks.filter((p) => p.bot).length} the same as the goal bot would pick. Decisions with reasons: ${file(g.id)}`);
}

mkdirSync(DIR, { recursive: true });
if (cmd === 'new') {
  const id = pos[1] ?? `game-${Date.now().toString(36)}`, ruleset = opt.ruleset ?? 'board', def = defFor({ ruleset });
  const players = Number(opt.players ?? 2), vs = (opt.vs ?? 'normal') as Level;
  if (!(vs in LEVELS)) throw new Error(`unknown level "${vs}": use ${Object.keys(LEVELS).join(', ')}`);
  if (existsSync(file(id)) && opt.force !== 'true') throw new Error(`game "${id}" exists: pick another id or add --force`);
  const seed = opt.seed ?? id, all = Object.keys(def.nations);
  // Nations drawn from the seed unless given.
  const nations = opt.nations ? opt.nations.split(',') : [...all].sort((x, y) => hash(`${seed}${x}`) - hash(`${seed}${y}`)).slice(0, players);
  writeFileSync(`${DIR}/rules.txt`, rulebookText());
  const g: Saved = { id, seed, nations, seat: Number(opt.seat ?? 0), vs, ruleset, hints: opt.hints === 'true', choices: [], picks: [] };
  const s = createGame({ def, seed, nations, logging: false });
  advance(g, s);
  save(g);
  writeFileSync(`${DIR}/last`, g.id);
  console.log(`Game "${id}": you are P${g.seat} (${def.nations[nations[g.seat]].en}) against ${LEVELS[vs].label} bots, ${nations.map((n) => def.nations[n].en).join(', ')}. Rules: ${DIR}/rules.txt\n`);
  show(g, s);
} else if (cmd === 'pick') {
  const n = Number(pos[1]), { g, s } = load(pos[2] ?? last());
  if (s.over) { result(g, s); process.exit(0); }
  const v = viewFor(s, g.seat);
  if (!Number.isInteger(n) || n < 0 || n >= v.legal.length) throw new Error(`pick a number from 0 to ${v.legal.length - 1}`);
  const c = v.legal[n], gb = goalBot(`${g.seed}-agree`);
  g.picks.push({ at: g.choices.length, round: s.round, kind: s.pending!.kind, options: v.legal.length, picked: choiceText(v, c), ...(opt.why && { why: opt.why }), bot: choiceKey(gb.choose(v)) === choiceKey(c) });
  g.choices.push(c);
  applyInPlace(s, c, true);
  advance(g, s);
  save(g);
  writeFileSync(`${DIR}/last`, g.id);
  console.log(`Picked: ${choiceText(v, c)}\n`);
  show(g, s);
} else if (cmd === 'show' || cmd === 'result') {
  const { g, s } = load(pos[1] ?? last());
  if (cmd === 'result' && !s.over) console.log(`Game "${g.id}" is still on: round ${s.round}.`);
  else show(g, s);
} else throw new Error(`unknown command "${cmd}": use new, show, pick or result`);

function last(): string {
  if (!existsSync(`${DIR}/last`)) throw new Error('give the game id');
  return readFileSync(`${DIR}/last`, 'utf8').trim();
}
function hash(x: string): number { let h = 2166136261; for (const ch of x) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
