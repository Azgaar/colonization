/**
 * One seat played from the command line, a decision at a time, so that an agent (Claude Code) can play the game.
 * The other seats are bots of a level; between the seat's decisions they play on their own.
 * The game is kept in out/seat/<id>.json as its seed and choices. When it ends, the same seed is played with a bot
 * of that level in the seat, so that the result says whether the seat did better than the bot would have.
 *
 *   node packages/lab/src/seat.ts new [id] [--vs normal|easy|hard|expert] [--players 2] [--seat 0] [--seed s] [--nations a,b] [--hints]
 *   node packages/lab/src/seat.ts show [id]           the current decision again
 *   node packages/lab/src/seat.ts pick <n> [id] [--is "words of the line"] [--why "reason"]
 *   node packages/lab/src/seat.ts result [id]
 *   node packages/lab/src/seat.ts bots --seed s [--def f] [--vs normal]   every bot level in the seat, for comparison
 *   node packages/lab/src/seat.ts review [id]         round by round, the seat's actions next to a bot's in the same seat
 *
 * The rulebook as text is written to out/seat/rules.txt (built from rulebook/dist/en.html by `pnpm rulebook`).
 * --hints shows the goal bot's best candidates with each decision. Each game keeps its rules in out/seat/<id>.def.json;
 * --def <that file> starts a game by the same rules, so that a series stays comparable while rules/ changes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { botForLevel, goalBot, LEVELS, type Bot, type Level } from '@col/bots';
import { applyInPlace, choiceKey, createGame, nationsApart, viewFor, type Choice, type LogEntry, type State } from '@col/engine';
import { parseArgs } from './args.ts';
import type { GameDef } from '@col/data';
import { defFor } from './game.ts';
import { choiceText, decisionPrompt, nameOf, rulebookText } from './llm/describe.ts';
import { mean } from './stats.ts';

interface Saved {
  id: string; seed: string; nations: string[]; seat: number; vs: Level; ruleset: string; hints: boolean;
  choices: Choice[];
  /** The seat's own decisions: where in `choices`, what it picked and why. */
  picks: { at: number; round: number; kind: string; options: number; picked: string; why?: string; bot: boolean }[];
  /** Where in the log the seat's last pick was, so that `show` repeats what happened since. */
  from?: number;
}
const DIR = 'out/seat';
const file = (id: string) => `${DIR}/${id}.json`;
const { pos, opt } = parseArgs(process.argv.slice(2));
const [cmd = 'show'] = pos;

/** Search levels count samples only, so that the game is the same every time it is replayed. */
const levelBot = (level: Level, seed: string): Bot => botForLevel(level, seed, 'balanced', LEVELS[level].search ? { iterations: LEVELS[level].search!.iterations } : undefined);
const bot = (g: Saved, seed: string): Bot => levelBot(g.vs, seed);

function load(id: string): { g: Saved; s: State } {
  if (!existsSync(file(id))) throw new Error(`no game "${id}": start one with "new ${id}"`);
  const g = JSON.parse(readFileSync(file(id), 'utf8')) as Saved;
  const s = createGame({ def: defOf(g.id), seed: g.seed, nations: g.nations, logging: true });
  for (const c of g.choices) applyInPlace(s, c, true);
  return { g, s };
}
/** The rules a game is played by, frozen when it starts, so that rules edited meanwhile cannot change it. */
const defFile = (id: string) => `${DIR}/${id}.def.json`;
const defOf = (id: string): GameDef => JSON.parse(readFileSync(defFile(id), 'utf8')) as GameDef;
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
  console.log(`\nAnswer: node packages/lab/src/seat.ts pick <number> ${g.id} --is "<words from that line>" --why "<short reason>"`);
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
  const w = s.map.width;
  for (const x of s.war?.sieges ?? []) if (x.attack !== undefined) console.log(`Siege of P${x.owner}'s colony at r${Math.floor(x.cell / w)}c${x.cell % w}: attack ${x.attack}, defence ${x.defence}${x.dice?.length ? `, dice ${x.dice.join(' ')}` : ''}: ${x.fell ? 'fell' : 'held'}.`);
  console.log(`You:            ${a.text}. Winners ${r.winners.map((w) => `P${w}`).join(', ') || 'nobody'}.`);
  console.log(`Bot in your seat: ${b.text}. Winners ${base.over!.winners.map((w) => `P${w}`).join(', ') || 'nobody'}.`);
  console.log(`Your margin over the others' mean ${(a.score - a.others).toFixed(1)}${a.won ? ', you won' : ''}; the ${LEVELS[g.vs].label} bot's in your seat ${(b.score - b.others).toFixed(1)}${b.won ? ', it won' : ''}.`);
  console.log(`${g.picks.length} decisions, ${g.picks.filter((p) => p.bot).length} the same as the goal bot would pick. Decisions with reasons: ${file(g.id)}`);
}

mkdirSync(DIR, { recursive: true });
if (cmd === 'new') {
  const id = pos[1] ?? `game-${Date.now().toString(36)}`, ruleset = opt.ruleset ?? 'board';
  // --def: the frozen rules of an earlier game, to play a series by the same rules.
  const def: GameDef = opt.def ? (JSON.parse(readFileSync(opt.def, 'utf8')) as GameDef) : defFor({ ruleset });
  const players = Number(opt.players ?? 2), vs = (opt.vs ?? 'normal') as Level;
  if (!(vs in LEVELS)) throw new Error(`unknown level "${vs}": use ${Object.keys(LEVELS).join(', ')}`);
  if (existsSync(file(id)) && opt.force !== 'true') throw new Error(`game "${id}" exists: pick another id or add --force`);
  const seed = opt.seed ?? id, all = Object.keys(def.nations);
  // Nations drawn from the seed unless given.
  const nations = opt.nations ? opt.nations.split(',') : nationsApart(def, [...all].sort((x, y) => hash(`${seed}${x}`) - hash(`${seed}${y}`)), players);
  if (!opt.def || !existsSync(`${DIR}/rules.txt`)) writeFileSync(`${DIR}/rules.txt`, rulebookText());
  writeFileSync(defFile(id), JSON.stringify(def));
  const g: Saved = { id, seed, nations, seat: Number(opt.seat ?? 0), vs, ruleset, hints: opt.hints === 'true', choices: [], picks: [] };
  const s = createGame({ def, seed, nations, logging: true });
  advance(g, s);
  save(g);
  writeFileSync(`${DIR}/last`, g.id);
  console.log(`Game "${id}": you are P${g.seat} (${def.nations[nations[g.seat]].en}) against ${LEVELS[vs].label} bots: ${nations.map((n, p) => (p === g.seat ? null : `P${p} ${def.nations[n].en}`)).filter(Boolean).join(', ')}. ${players} players${players < 3 ? ', so no loyalist' : ''}. Rules: ${DIR}/rules.txt\n`);
  show(g, s);
} else if (cmd === 'pick') {
  const n = Number(pos[1]), { g, s } = load(pos[2] ?? last());
  if (s.over) { result(g, s); process.exit(0); }
  const v = viewFor(s, g.seat);
  if (!Number.isInteger(n) || n < 0 || n >= v.legal.length) throw new Error(`pick a number from 0 to ${v.legal.length - 1}`);
  const c = v.legal[n], gb = goalBot(`${g.seed}-agree`);
  // --is: words the picked line must contain, so that a number taken from an older list picks nothing.
  if (opt.is && !opt.is.toLowerCase().split(/\s+/).every((word) => choiceText(v, c).toLowerCase().includes(word))) {
    console.log(`Nothing picked: choice ${n} is "${choiceText(v, c)}", which does not contain "${opt.is}". The current decision:\n`);
    show(g, s);
    process.exit(0);
  }
  g.picks.push({ at: g.choices.length, round: s.round, kind: s.pending!.kind, options: v.legal.length, picked: choiceText(v, c), ...(opt.why && { why: opt.why }), bot: choiceKey(gb.choose(v)) === choiceKey(c) });
  g.choices.push(c);
  const from = s.log.length;
  applyInPlace(s, c, true);
  advance(g, s);
  g.from = from;
  save(g);
  writeFileSync(`${DIR}/last`, g.id);
  console.log(`Picked: ${choiceText(v, c)}\n`);
  process.stdout.write(feed(s, g.seat, from));
  show(g, s);
} else if (cmd === 'show' || cmd === 'result') {
  const { g, s } = load(pos[1] ?? last());
  if (cmd === 'result' && !s.over) console.log(`Game "${g.id}" is still on: round ${s.round}.`);
  else { if (cmd === 'show') process.stdout.write(feed(s, g.seat, g.from ?? 0)); show(g, s); }
} else if (cmd === 'bots') {
  // Every level in the seat against the opponents' level, on one seed and set of rules: what the AI's result compares with.
  const def: GameDef = opt.def ? (JSON.parse(readFileSync(opt.def, 'utf8')) as GameDef) : defFor({ ruleset: opt.ruleset ?? 'board' });
  const seed = opt.seed ?? 'bots', players = Number(opt.players ?? 2), seat = Number(opt.seat ?? 0), vs = (opt.vs ?? 'normal') as Level;
  const all = Object.keys(def.nations), nations = opt.nations ? opt.nations.split(',') : nationsApart(def, [...all].sort((x, y) => hash(`${seed}${x}`) - hash(`${seed}${y}`)), players);
  console.log(`Seed ${seed}: seat P${seat} (${def.nations[nations[seat]].en}) against ${LEVELS[vs].label} bots (${nations.filter((_, p) => p !== seat).map((n) => def.nations[n].en).join(', ')}).`);
  console.log('| In the seat | Score | Others | Margin | Won | Ended |\n|---|---|---|---|---|---|');
  for (const level of Object.keys(LEVELS) as Level[]) {
    const t0 = performance.now(), s = createGame({ def, seed, nations, logging: false });
    const bots = nations.map((_, p) => levelBot(p === seat ? level : vs, `${seed}-${p}`));
    while (!s.over) { const p = s.pending!.player; applyInPlace(s, bots[p].choose(viewFor(s, p)), true); }
    const sc = s.over.players.map((x) => x.score), others = mean(sc.filter((_, i) => i !== seat));
    console.log(`| ${LEVELS[level].label} | ${sc[seat]} | ${others.toFixed(1)} | ${(sc[seat] - others).toFixed(1)} | ${s.over.winners.includes(seat) ? 'yes' : 'no'} | round ${s.round} (${((performance.now() - t0) / 1000).toFixed(0)} s) |`);
  }
} else if (cmd === 'review') review(load(pos[1] ?? last()).g);
else throw new Error(`unknown command "${cmd}": use new, show, pick, result, review or bots`);

/** One public log entry as a short line, or null for steps too small to show. Nothing secret is logged in these kinds. */
function entryText(s: State, e: LogEntry): string | null {
  const name = (id: unknown) => (typeof id === 'string' ? nameOf(s.def, id) ?? id : String(id));
  const w = s.map.width, at = (c: unknown) => (typeof c === 'number' ? `r${Math.floor(c / w)}c${c % w}` : String(c));
  switch (e.e) {
    case 'war': return `WAR (${e.reason}), Royal Army ${e.pool}`;
    case 'siege': { const x = e as unknown as { cell: number; attack: { total: number }; defence: { total: number }; fell: boolean }; return `siege ${at(x.cell)} ${x.attack.total} v ${x.defence.total}${x.fell ? ' FELL' : ''}`; }
    case 'event': return `event ${name(e.id)}`;
    case 'ref': return `Royal Army ${(e.n as number) > 0 ? '+' : ''}${e.n} (${e.why})`;
    case 'play': return `${name(e.card)}: ${e.a}`;
    case 'found': return `FOUND ${at(e.cell)}`;
    case 'build': return `BUILD ${name(e.building)}`;
    case 'father': return `Founding Father ${name(e.father)}`;
    case 'hire': case 'recruit': case 'gainAgent': return `${e.e === 'gainAgent' ? 'gained' : e.e} ${name(e.agent)}`;
    case 'sell': return `sold ${e.n} ${e.r} at ${e.price}`;
    case 'produce': return `+${e.n} ${e.icon}`;
    case 'overflow': return `lost 1 ${e.r} (warehouse full)`;
    case 'poi': return `${e.deck} ${name(e.card)}`;
    case 'bells': case 'crosses': case 'gold': return e.why === 'production' || e.why === 'trade' ? null : `${(e.n as number) > 0 ? '+' : ''}${e.n} ${e.e} (${e.why})`;
    case 'tax': return e.pay ? `paid tax ${e.rate}` : `refused tax ${e.rate}`;
    case 'pass': return e.forced ? null : `PASSED with ${e.n ?? '?'} cards`;
    case 'removed': return `lost ${name(e.card)}`;
    case 'attack': return `attacked ${e.target} at ${at(e.cell)}`;
    case 'alliance': return `alliance with settlement ${e.settlement}`;
    case 'damage': return `ship damaged ${e.n}`;
    case 'toEurope': return `${e.token} sent to Europe`;
    case 'raid': return e.stopped ? `natives raided P${e.p}'s colony, stopped by the ${nameOf(s.def, s.def.settings.raid.stoppedBy)}` : `natives raided P${e.p}'s colony: ${s.def.settings.raid.resources} resources or a building lost`;
    default: return null;
  }
}
/** What happened since a point in the log, for the seat to read before its decision. */
function feed(s: State, seat: number, from: number): string {
  const lines: string[] = [];
  let at = '';
  for (const e of s.log.slice(from)) {
    if (e.e === 'round') { lines.push(`-- round ${e.n} begins`); continue; }
    const t = entryText(s, e);
    if (!t) continue;
    const who = e.p === undefined || ['war', 'siege', 'event', 'ref', 'raid'].includes(e.e) ? '' : e.p === seat ? 'You' : `P${e.p}`;
    if (who !== at || !who) { lines.push(`${who ? `${who}: ` : ''}${t}`); at = who; } else lines[lines.length - 1] += `; ${t}`;
  }
  return lines.length ? `Since your last decision:\n${lines.join('\n')}\n\n` : '';
}
/** The seat's actions per round, from a game's log. */
function actions(s: State, seat: number): string[][] {
  const out: string[][] = [[]];
  for (const e of s.log) {
    if (e.e === 'round') { out[e.n as number] = []; continue; }
    if (e.p !== seat && e.e !== 'war' && e.e !== 'siege') continue;
    const t = entryText(s, e);
    if (t) out[out.length - 1].push(t);
  }
  return out;
}
function review(g: Saved) {
  const def = defOf(g.id);
  const a = createGame({ def, seed: g.seed, nations: g.nations, logging: true });
  for (const c of g.choices) applyInPlace(a, c, true);
  const b = createGame({ def, seed: g.seed, nations: g.nations, logging: true });
  const bots = g.nations.map((_, p) => bot(g, `${g.seed}-${p}`));
  while (!b.over) { const p = b.pending!.player; applyInPlace(b, bots[p].choose(viewFor(b, p)), true); }
  const x = actions(a, g.seat), y = actions(b, g.seat);
  for (let r = 1; r < Math.max(x.length, y.length); r++) {
    console.log(`Round ${r}\n  seat: ${(x[r] ?? ['-']).join('; ')}\n  bot:  ${(y[r] ?? ['-']).join('; ')}`);
  }
  for (const [label, s] of [['seat', a], ['bot', b]] as const) {
    console.log(`\n${label} game: ${s.over!.players.map((p) => `P${p.player} ${p.score} (${p.parts.map((q) => `${q.label} ${q.value}`).join(', ')})`).join(' | ')}`);
  }
}

function last(): string {
  if (!existsSync(`${DIR}/last`)) throw new Error('give the game id');
  return readFileSync(`${DIR}/last`, 'utf8').trim();
}
function hash(x: string): number { let h = 2166136261; for (const ch of x) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
