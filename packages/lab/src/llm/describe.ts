/** What a language-model player is shown: the rulebook as text, one seat's view, and the legal choices as numbered lines. */
import { existsSync, readFileSync } from 'node:fs';
import type { GameDef } from '@col/data';
import type { Choice, View } from '@col/engine';
import { cellYield, fatherLimit, taxRate, year } from '@col/engine';
import type { Icon } from '@col/data';

const RULEBOOK = 'rulebook/dist/en.html';
/** Words for the rulebook's icons, which are drawn as pictures. */
const ICON: Record<string, string> = { eduHigher: 'higher-education', eduBasic: 'basic-education', eduNone: 'no-education', cap: 'higher-education', book: 'basic-education', move: 'movement', sword: 'strength', ref: 'Royal-Army', vp: 'VP', die: 'die', hut: 'settlement', people: 'population', cube: 'cube', bar: 'bar' };

/** The English rulebook as plain text, icons as [words]. Built by `pnpm rulebook`. */
export function rulebookText(file = RULEBOOK): string {
  if (!existsSync(file)) throw new Error(`${file} is missing: run pnpm rulebook first`);
  return readFileSync(file, 'utf8')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<svg class="ic ic-([A-Za-z0-9-]+)"[\s\S]*?<\/svg>/g, (_, k: string) => ` [${ICON[k] ?? k}] `)
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h\d|li|tr|div|section|h4)>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/ *\n\s*/g, '\n').trim();
}

/** A card, building, Father or other entity by its English name. */
export function nameOf(def: GameDef, id: string): string | null {
  for (const k of ['agents', 'buildings', 'fathers', 'events', 'tactics', 'tribes', 'ruins', 'wrecks', 'nations'] as const) {
    const e = (def[k] as Record<string, { en: string }>)[id];
    if (e) return e.en;
  }
  return null;
}

const TERRAIN: Record<string, string> = { ocean: '~', forest: 'F', grassland: 'G', mountains: 'M', desert: 'D', tundra: 'T' };
const at = (v: View, cell: number) => `r${Math.floor(cell / v.state.map.width)}c${cell % v.state.map.width}`;

/** What is on a cell, as far as this seat knows. */
export function cellText(v: View, cell: number): string {
  const s = v.state, out: string[] = [at(v, cell)];
  const t = s.map.terrain[cell];
  out.push(s.map.zone[cell] === 'europe' ? 'Europe' : s.map.zone[cell] === 'sea' ? 'open sea' : t ?? 'unexplored');
  if (s.map.bonus[cell]) out.push(`bonus ${s.map.bonus[cell]}`);
  if (s.poi[cell]) out.push(s.poi[cell]);
  const col = s.colonies.find((c) => c.cell === cell);
  if (col) out.push(col.owner === v.player ? 'your colony' : `colony of P${col.owner}`);
  const st = s.settlements.find((x) => x.cell === cell && x.alive);
  if (st) out.push(`${nameOf(s.def, st.tribe) ?? st.tribe} settlement`);
  s.players.forEach((p, i) => {
    const who = i === v.player ? 'your' : `P${i}'s`;
    if (p.ship === cell) out.push(`${who} ship`);
    if (p.inf === cell) out.push(`${who} infantry`);
  });
  return out.join(', ');
}

/** The map as a grid, 3 characters a cell: terrain, what is there, whose token. */
export function mapText(v: View): string {
  const s = v.state, w = s.map.width, rows: string[] = [];
  rows.push(`    ${Array.from({ length: w }, (_, c) => `c${c}`.padEnd(3)).join('')}`);
  for (let r = 0; r < w; r++) {
    let line = `r${r}`.padEnd(4);
    for (let c = 0; c < w; c++) {
      const i = r * w + c, z = s.map.zone[i], t = s.map.terrain[i];
      const a = z === 'europe' ? 'E' : z === 'sea' ? '~' : t === null ? '?' : TERRAIN[t] ?? '?';
      const col = s.colonies.find((x) => x.cell === i), st = s.settlements.find((x) => x.cell === i && x.alive);
      const b = col ? (col.owner === v.player ? 'C' : String(col.owner)) : st ? 'V' : s.poi[i] === 'ruin' ? 'r' : s.poi[i] === 'wreck' ? 'w' : '.';
      let k = ' ';
      s.players.forEach((p, n) => { if (p.ship === i) k = n === v.player ? 'S' : 's'; if (p.inf === i) k = n === v.player ? 'I' : 'i'; });
      line += a + b + k;
    }
    rows.push(line.trimEnd());
  }
  return rows.join('\n');
}
const MAP_KEY = 'Map key, 3 characters a cell. 1st: E Europe, ~ water, F forest, G grassland, M mountains, D desert, T tundra, ? unexplored. 2nd: C your colony, a digit another player\'s colony, V native settlement, r ruin, w wreck. 3rd: S/I your ship/infantry, s/i another player\'s. Cells move to all 8 neighbours.';

const EDU = ['no education', 'basic education', 'higher education'];
const stock = (x: Record<string, number>) => Object.entries(x).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing';
const names = (def: GameDef, ids: string[]) => ids.map((id) => nameOf(def, id) ?? id).join(', ') || 'none';
const where = (v: View, x: number | string) => (typeof x !== 'number' ? (x === 'ship' ? 'aboard the ship' : x) : x < 0 ? 'not placed yet' : v.state.map.zone[x] === 'europe' ? `Europe (${at(v, x)})` : at(v, x));

/** Everything this seat may know, as text. */
export function viewText(v: View, map = true): string {
  const s = v.state, def = s.def, me = v.player, out: string[] = [];
  out.push(`Round ${s.round} of ${def.settings.rounds.max} (${year(s)}). First player P${s.first}. Tax this round ${taxRate(s)} gold. Royal Army (REF) ${s.ref}.${s.event ? ` Event: ${nameOf(def, s.event)}.` : ''}${s.players.length < 3 ? ` ${s.players.length} players: there is no loyalist; every patriot defends against the Royal Army alone.` : ''}`);
  out.push(`Market prices: ${Object.entries(s.price).map(([r, p]) => `${r} ${p}`).join(', ')}. Demand: ${stock(s.demand)}.`);
  s.players.forEach((p, i) => {
    const head = i === me ? `YOU are P${i} (${nameOf(def, p.nation)})` : `P${i} (${nameOf(def, p.nation)})`;
    out.push(`\n${head}: ${p.gold} gold, ${p.bells} bells, ${p.crosses} crosses${p.passed ? ', passed this round' : ''}.`);
    out.push(`  Warehouse: ${stock(p.wh)}. Ship: ${where(v, p.ship)} (damage ${p.damage}), hold: ${stock(p.hold)}. Infantry: ${where(v, p.inf)}.`);
    out.push(`  Buildings: ${names(def, p.buildings)}. Fathers: ${names(def, p.fathers)} (limit ${fatherLimit(s, i)}).`);
    if (i === me) {
      out.push(`  Hand: ${p.hand.map((c) => `${nameOf(def, c)} (${c}, ${EDU[def.agents[c]?.edu ?? 0]})`).join(', ') || 'empty'}.${p.inPlay ? ` In play: ${nameOf(def, p.inPlay)}.` : ''}`);
      out.push(`  Deck (${p.deck.length}, order unknown): ${names(def, p.deck)}. Discard: ${names(def, p.discard)}.`);
    } else out.push(`  Agents (${v.collections[i].length}): ${names(def, v.collections[i])}. In hand: ${p.hand.length}.`);
  });
  const cols = s.colonies.map((c) => `${at(v, c.cell)} P${c.owner}`).join('; ');
  out.push(`\nColonies: ${cols || 'none'}.`);
  const sts = s.settlements.filter((x) => x.alive).map((x) => `${nameOf(def, x.tribe)} at ${at(v, x.cell)} pop ${x.pop}${x.ally !== null ? ` ally of P${x.ally}` : ''}`);
  out.push(`Native settlements: ${sts.join('; ') || 'none known'}. Hostility: ${Object.entries(s.hostility).map(([t, h]) => `${nameOf(def, t)} ${h}`).join(', ') || 'none'}.`);
  out.push(`Pier (hire, top cards): ${s.pier.map((st) => st[0]).filter(Boolean).map((a) => `${nameOf(def, a)} ${def.agents[a]?.price ?? '?'} gold`).join(', ') || 'empty'}.`);
  out.push(`Salon (Founding Fathers): ${s.salon.map((f) => `${nameOf(def, f)} ${def.fathers[f].bells} bells`).join(', ') || 'empty'}.`);
  out.push(`Buildings left: ${Object.entries(s.buildingsLeft).filter(([, n]) => n > 0).map(([b, n]) => `${nameOf(def, b)} ${n}`).join(', ')}.`);
  if (s.move) out.push(`\nCurrent move: P${s.move.player} ${s.move.token}, ${s.move.points} movement points left${s.move.scout ? ', scouting' : ''}, card ${nameOf(def, s.move.card)}.`);
  if (s.combat) out.push(`\nCombat: ${json(v, s.combat)}`);
  if (s.war) out.push(`\nWar (sieges by number): ${json(v, s.war)}`);
  if (map) out.push(`\n${MAP_KEY}\n${mapText(v)}`);
  return out.join('\n');
}

/** JSON without Russian texts, effect trees or secret fields, with names after ids. */
function json(v: View, x: unknown): string {
  const def = v.state.def;
  return JSON.stringify(x, (k, val) => {
    if (k === 'ru' || k === 'do' || k.startsWith('_') || k === 'flavor') return undefined;
    if (CELLS.has(k) && typeof val === 'number') return at(v, val);
    if (typeof val === 'string' && k !== 'kind' && k !== 'c') { const n = nameOf(def, val); if (n && n !== val) return `${n} (${val})`; }
    return val;
  });
}

const CELLS = new Set(['cell', 'from', 'to', 'at']);
/** One legal choice as a readable line. */
export function choiceText(v: View, c: Choice): string {
  const s = v.state, parts: string[] = [c.c === 'pass' && s.pending?.kind === 'turn' ? `pass (stop: ${s.players[v.player].hand.length} cards unplayed)` : c.c];
  for (const [k, val] of Object.entries(c)) {
    if (k === 'c') continue;
    // The engine lists one cell per result (the warehouse is shared), so say what it makes and that the cell is only an example.
    if (k === 'cell' && (c.a === 'produce' || c.a === 'docks') && typeof val === 'number' && typeof c.card === 'string') {
      const icon = (c.icon ?? 'food') as Icon, y = cellYield(s, v.player, c.card, val, icon, c.a === 'docks' ? 1 : 0);
      parts.push(`makes ${y?.total ?? '?'} ${icon} (for example at ${cellText(v, val)}; the same at any cell with this result)`);
    } else if (k === 'icon' && c.a === 'produce') continue;
    else if (CELLS.has(k) && typeof val === 'number') parts.push(`${k} ${cellText(v, val)}`);
    else if (k === 'settlement' && typeof val === 'number') { const st = s.settlements.find((x) => x.n === val); parts.push(st ? `settlement ${nameOf(s.def, st.tribe)} at ${at(v, st.cell)}` : `settlement ${val}`); }
    else if (k === 'siege' && typeof val === 'number') { const x = s.war?.sieges[val]; parts.push(x ? `siege ${val} (${x.owner === v.player ? 'your' : `P${x.owner}'s`} colony at ${at(v, x.cell)})` : `siege ${val}`); }
    else if (k === 'a') parts.push(String(val));
    else if (typeof val === 'string') parts.push(`${k} ${nameOf(s.def, val) ?? val}`);
    else parts.push(`${k} ${JSON.stringify(val)}`);
  }
  return parts.join(' | ');
}

/** The decision being asked: its kind and its public fields. */
export function decisionText(v: View): string {
  const d = v.state.pending!;
  const { kind, player: _p, ...rest } = d;
  const opts = (d.opts as { id: string; en: string; cost?: unknown }[] | undefined)?.map((o) => `  ${o.id}: ${o.en}${o.cost ? ` (cost ${JSON.stringify(o.cost)})` : ''}`);
  if (opts) delete rest.opts;
  const more = Object.keys(rest).length ? ` ${json(v, rest)}` : '';
  return `Decision: ${kind}${more}${opts ? `\nOptions:\n${opts.join('\n')}` : ''}`;
}

/** The map matters for turns, moves and any choice of a cell; small decisions go without it. */
const needsMap = (v: View) => ['turn', 'move'].includes(v.state.pending!.kind) || v.legal.some((c) => Object.keys(c).some((k) => CELLS.has(k)));

/** The whole message for one decision. */
export function decisionPrompt(v: View, o: { plan?: string; hints?: { index: number; why: string }[] } = {}): string {
  const lines = v.legal.map((c, i) => `${i}: ${choiceText(v, c)}`);
  return [
    viewText(v, needsMap(v)),
    '',
    o.plan ? `Your plan, written at your previous decision: ${o.plan}\n` : '',
    decisionText(v),
    '',
    `Legal choices (answer with one number):\n${lines.join('\n')}`,
    o.hints?.length ? `\nThe built-in bot would rank these first: ${o.hints.map((h) => `${h.index} (${h.why})`).join('; ')}.` : '',
  ].filter((x) => x !== '').join('\n');
}
