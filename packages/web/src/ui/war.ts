/* The war, colony by colony, on the map: the colony's banner against the King's (or the patriots'), every card face down until it is turned over, then the dice and what came of it; then the end of the game. */
import { $, colonyName, D, me, t } from '../data.ts';
import { seal } from '../emblem.ts';
import { Places } from '../places.ts';
import { Sim } from '../sim.ts';
import { S } from '../state.ts';
import type { Snapshot } from '../view.ts';
import { btn, dice } from './kit.ts';
import { ending } from './ending.ts';
import { banner, card, colorOf, crest, flip, frontLines, isAgents, lines, stacksOf, stage, unseen, unseenPower, warPower, withTactic, type Siege, type Stacks } from './siege.ts';
/** The faces that succeed in this war: the board's, or the King's tactic's. */
export const warFaces = () => { const e = D.war ? D.tacticEffects[D.war.tactic] : undefined; return e?.t === 'successFrom' ? e.faces : D.settings.combat.successFaces; };
/** The chance that a colony holds, from the gap in strength and the King's tactic. */
export const holdChance = (x: Siege, tactic: string) => { const n = Math.min(10, Math.max(0, x.attack.total - x.defence.total)), q = 2 / 3; return n === 0 ? 1 : tactic === 'extended_supply_lines' ? q ** n + (n * q ** (n - 1)) / 3 : tactic === 'surprise_assault' ? 0.5 ** n : q ** n; };

/** Sieges whose cards were turned over in this game, the one turning now (its cards flip as it is shown), and whether the front lines are shown instead of a siege. */
let game = '', turning = -1, front = false;
const shown = new Set<number>();
export function reveal() { shown.add(S.war); turning = S.war; }
export function showFront(on: boolean) { front = on; }
/** Whether anyone attacked a colony: redcoats or cards against it. */
const struck = (x: Siege) => x.cubes > 0 || Object.keys(x.stacks).some((q) => Number(q) !== x.owner && x.stacks[Number(q)]!.length > 0);
/** What came of a siege once seen: held, fallen to the King, or taken by a player; nothing before its cards are turned. */
const mark = (x: Siege, k: number) => (!shown.has(k) || !struck(x) ? '' : !x.fell ? '<i class="ok">✓</i>' : x.takenBy !== null && x.takenBy !== undefined ? Places.em(x.takenBy, 16) : seal('king', 16));
/** The war's tabs: the front lines, each colony by its owner's emblem with what came of it, the final score. */
function tabs(w: NonNullable<Snapshot['war']>) {
  const groups: { owner: number; tabs: string[] }[] = [];
  w.sieges.forEach((x, k) => {
    const tab = `<button class="wtab${k === S.war && !front ? ' on' : ''}${shown.has(k) && x.fell ? ' fell' : ''}" data-war="${k}">${colonyName(x)}${mark(x, k)}</button>`, g = groups.at(-1);
    if (g?.owner === x.owner) g.tabs.push(tab); else groups.push({ owner: x.owner, tabs: [tab] });
  });
  const end = D.over ? `<button class="wtab" data-war="${w.sieges.length}">${t('result')}</button>` : `<button class="wtab" data-peace>${t('close')}</button>`;
  return `<nav class="wtabs"><button class="wtab${front ? ' on' : ''}" data-front>${t('war.front')}</button>${groups.map((g) => `<span class="wgrp">${Places.em(g.owner, 22)}${g.tabs.join('')}</span>`).join('')}${end}</nav>`;
}
/** The way on from a siege: the next colony, or the final score. */
const onward = (w: NonNullable<Snapshot['war']>, k: number) => { const x = w.sieges[k]; return btn(x ? t('war.on_to', { x: colonyName(x) }) : D.over ? t('result') : t('close'), x || D.over ? `data-war="${k}"` : 'data-peace', 'go'); };

export function war() {
  const w = D.war, over = D.over;
  document.body.classList.toggle('ended', !!w && !!over && S.war >= (w?.sieges.length ?? 0));
  if (S.war < 0 || !w) { $('war').innerHTML = ''; ending(); return; }
  const key = `${Sim.setup.seed}:${w.tactic}:${w.pool}`;
  // A war seen for the first time opens on its front lines.
  if (key !== game) { game = key; shown.clear(); turning = -1; front = true; }
  const x = w.sieges[S.war];
  ending();
  if (!x) { $('war').innerHTML = ''; return; }
  const paint = (html: string) => { const el = $('war'); if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; } };
  if (front) return paint(`${tabs(w)}<div class="siege front">${frontLines(w.sieges, (i) => `data-war="${i}"`, true)}<div class="bts">${onward(w, 0)}</div></div>`);
  // Who placed what: the owner's cards defend, everyone else's attack. Your own are always face up.
  const { below, above } = stacksOf(x), hidD = unseen(below), hidA = unseen(above);
  const open = shown.has(S.war) || hidD + hidA === 0, how = turning === S.war ? 'turn' : 'open';
  // Before the cards are turned over, each side shows what is known; its hidden agents are a range.
  const known = (e: Siege['attack'], hid: number, power: number, open: boolean) => {
    if (open) return { total: e.total, lines: lines(e) };
    const agents = e.parts.filter(isAgents).reduce((m, q) => m + q.value, 0) - power;
    return { total: e.total - power, lines: [...lines(e.parts.filter((q) => !isAgents(q))), ...(agents ? [{ label: t('battle.agents'), value: agents }] : []), ...(hid ? [{ label: t('battle.agents'), value: `+0–${hid * 3}`, hid: true }] : [])] };
  };
  // The King's tactic is told on his banner, even when it changes the dice rather than his strength.
  const king = (l: ReturnType<typeof known>) => (x.counter ? l : { ...l, lines: withTactic(l.lines) });
  const d = known(x.defence, hidD, unseenPower(below), open), a = king(known(x.attack, hidA, unseenPower(above), open));
  const d0 = known(x.defence, hidD, unseenPower(below), false), a0 = king(known(x.attack, hidA, unseenPower(above), false));
  let k = 0;
  const row = (l: Stacks) => l.map(([p, c]) => c.map((card0) => (p === me ? card(card0, { w: 58, power: warPower(card0) }) : flip(p, card0, 58, warPower(card0), open ? how : '', k++))).join('')).join('');
  const out = !struck(x) ? t('war.untouched') : x.fell ? (x.takenBy !== null && x.takenBy !== undefined ? `${t('war.taken')} ${Places.name(x.takenBy)}` : t('war.lost_king')) : t('holds');
  // Good or bad only for a player who was in it; a siege of others' is told plainly.
  const tone = !struck(x) ? '' : x.owner === me ? (x.fell ? 'bad' : 'good') : x.takenBy === me ? 'good' : x.stacks[me]?.length ? 'bad' : '';
  // What the cards show comes once the last of them has turned.
  const late = `style="--late:${(how === 'turn' ? (hidD + hidA) * 0.26 + 0.5 : 0).toFixed(2)}s"`, fade = how === 'turn' && open ? late : '';
  // Nobody can tell the chance while cards lie face down: they are turned over first.
  const center = open
    ? `<div class="slate" ${late}>${x.dice?.length ? dice(x.dice, x.counter ? D.settings.combat.successFaces : warFaces()) : ''}<b class="sverd ${tone}">${out}</b>${onward(w, S.war + 1)}</div>`
    : btn(t('battle.turn'), 'data-reveal', 'go');
  const left = banner(colorOf(x.owner), crest(x.owner), Places.name(x.owner), d.total, !open && hidD > 0, d.lines, hidD ? fade : '', { total: d0.total, hidden: hidD > 0, lines: d0.lines });
  // At a loyalist colony, the patriots who attacked it: one by name, several by their emblems together.
  const raiders = above.map(([p]) => p), one = x.counter && raiders.length === 1 ? raiders[0]! : null;
  const pic = !x.counter ? crest('king') : one !== null ? crest(one) : raiders.length ? `<span class="smany">${raiders.map((p) => Places.em(p, 40)).join('')}</span>` : crest('patriots');
  const right = banner(colorOf(!x.counter ? 'king' : one !== null ? one : 'patriots'), pic, !x.counter ? t('battle.king') : one !== null ? Places.name(one) : t('patriots'), a.total, !open && hidA > 0, a.lines, hidA ? fade : '', { total: a0.total, hidden: hidA > 0, lines: a0.lines });
  paint(`${tabs(w)}${stage(t('battle.siege', { x: colonyName(x) }), left, row(below), center, right, row(above))}`);
}
