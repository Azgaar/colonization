/* Battles and sieges, shared by every screen of the war and of a fight (DD-123): a hanging banner for each side, agents as cards (face down until they are turned over), and the chance as a range while cards are hidden. */
import type { Explained, Part } from '@col/engine';
import { art, cap, cellName, colonyAt, colonyName, D, me, pick, t } from '../data.ts';
import { seal } from '../emblem.ts';
import { icon } from '../icons.ts';
import { Sprite } from '../map/sprites.ts';
import { Places } from '../places.ts';
import type { Snapshot } from '../view.ts';
import { name, part } from './kit.ts';

/** A line of a banner: an effect and what it adds; `hid` for a range that hides cards. */
export interface Line { label: string; value: number | string; hid?: boolean; tactic?: boolean }
/** The picture at the top of a banner: a player's emblem, the King's crown, the patriots, a tribe. */
export const crest = (side: number | 'king' | 'patriots') => (typeof side === 'number' ? Places.em(side, 50) : seal(side, 50));
export const colorOf = (side: number | 'king' | 'patriots') => (typeof side === 'number' ? D.players[side]!.color : side === 'king' ? '#7a1d22' : '#2b4a6b');
export type Siege = NonNullable<Snapshot['war']>['sieges'][number];
const signed = (v: number | string) => (typeof v === 'number' && v > 0 ? `+${v}` : `${v}`);
/** What a banner says: its strength, whether cards still hide part of it, and the effects that make it. */
export interface Says { total: number; hidden: boolean; lines: Line[] }
const says = (x: Says) => `<div class="sbn">${x.total}${x.hidden ? '<em>+?</em>' : ''}${icon('power', 26)}</div><ul>${x.lines.map((l) => `<li${l.hid ? ' class="hid"' : l.tactic ? ' class="tac"' : ''}><span>${l.tactic ? icon('king', 14) : ''}${l.label}</span><b>${signed(l.value)}</b></li>`).join('')}</ul>`;
/**
 * A side of the fight: its crest, its name, its strength (with `+?` while cards are hidden) and the effects that make it. Always the same size.
 * With `before` and `late`, it says what was known until the cards have turned, then what they showed.
 */
export const banner = (color: string, pic: string, title: string, total: number, hidden: boolean, lines: Line[], late = '', before?: Says) =>
  `<div class="sban" style="--c:${color}">${pic}<h3>${title}</h3>${late && before ? `<div class="sbody" ${late}><div class="sold">${says(before)}</div><div class="slate">${says({ total, hidden, lines })}</div></div>` : says({ total, hidden, lines })}</div>`;

/** An agent as in the hand: the picture, the name on a light ribbon, its strength here with the sword. */
export const card = (k: string, o: { w?: number; power?: number; cls?: string; attrs?: string; n?: number; button?: boolean } = {}) => {
  const tag = o.button ? 'button' : 'div';
  // A small card has no room for its name: the picture and the strength tell it, the name shows on hover.
  const w = o.w ?? 92, nm = pick(D.agents[k]!);
  return `<${tag} class="scard${o.cls ?? ''}" style="--w:${w}px" ${w < 56 ? `title="${nm}"` : ''} ${o.attrs ?? ''}><img src="${art.agent(k)}" alt="${w < 56 ? nm : ''}">${w < 56 ? '' : `<span class="rib">${nm}</span>`}${o.power === undefined ? '' : `<b class="spw">${o.power}${icon('power', 13)}</b>`}${(o.n ?? 1) > 1 ? `<i class="sct">×${o.n}</i>` : ''}</${tag}>`;
};
/** A card face down, with its owner's token on it. */
export const back = (p: number | null, w = 60) => `<div class="scard sback" style="--w:${w}px">${p === null ? '' : `<span class="stok">${Places.em(p, 22)}</span>`}</div>`;
/**
 * A face-down card that turns over: `open` shows it turned, `turn` turns it now, the `i`-th of its row a moment after the one before. Unturned, its face is hidden from screen readers too.
 */
export const flip = (p: number | null, k: string, w: number, power: number, how: '' | 'open' | 'turn', i = 0) =>
  `<div class="sflip ${how}" style="--w:${w}px;--i:${i}"><div class="in">${back(p, w)}${card(k, { w, power, cls: ' face', attrs: how ? '' : 'aria-hidden="true"' })}</div></div>`;

/** The chance of at least `need` successes on `gap` dice (at most `cap`), each succeeding on `faces` of 6. */
export function chance(gap: number, faces: number, need = 1, cap = 10): number {
  const n = Math.max(0, Math.min(cap, gap)), q = faces / 6;
  if (n < need) return 0;
  let p = 0, c = 1;
  for (let k = 0; k <= n; k++) { if (k >= need) p += c * q ** k * (1 - q) ** (n - k); c = (c * (n - k)) / (k + 1); }
  return p;
}
/** A chance as a range, from the worst the hidden cards may bring to the best, with a bar. */
export function odds(lo: number, hi: number, what = '') {
  const a = Math.round(Math.min(lo, hi) * 100), b = Math.round(Math.max(lo, hi) * 100);
  return `<div class="sodds"><b>${a === b ? a : `${a}–${b}`}<small>%</small></b><span class="sband"><i style="left:${a}%;width:${Math.max(b - a, 1.5)}%"></i></span>${what ? `<small class="swhat">${what}</small>` : ''}</div>`;
}
/** Whether a colony in the war is the player's enemy: the loyalist's for a patriot, a patriot's for the loyalist. Its chance is then told as a chance to fall. */
export const enemy = (x: { owner: number }) => (D.war?.loyalist === me ? x.owner !== me : x.owner === D.war?.loyalist);
/** The strongest an agent can be in a fight: what a hidden card may add at most. */
export const strongest = () => Math.max(0, ...Object.values(D.agents).flatMap((a) => a.mods.flatMap((m) => (m.mod === 'combat' && !m.vs && !m.terrain ? [m.add] : []))));

/** Labels of explained strength that are agents' strength (in a battle each agent by name; in the war each side's cards together). */
const AGENTS = new Set(['army', 'loyalist cards', 'patriot cards']);
export const isAgents = (p: Part) => AGENTS.has(p.label) || !!D.agents[p.label];
/** A banner's lines: every effect, and the agents' strength as one line (the cards themselves are shown under the banner). */
export function lines(e: Explained | Part[], agents?: Line): Line[] {
  const parts = Array.isArray(e) ? e : e.parts, sum = parts.filter(isAgents).reduce((n, p) => n + p.value, 0);
  // The played agent and the ones added count as cards together (C-3).
  const cards = parts.filter((p) => p.label === 'played card' || p.label === 'cards').reduce((n, p) => n + p.value, 0);
  const rest: Line[] = parts.filter((p) => p.value && !isAgents(p) && p.label !== 'played card' && p.label !== 'cards').map((p) => ({ label: p.label === 'tactic' && D.war ? pick(D.names.tactics[D.war.tactic]) : cap(part(p.label.startsWith('fathers:') ? p.label.slice(8) : p.label)), value: p.value, tactic: p.label === 'tactic' }));
  if (cards) rest.push({ label: cap(part('cards')), value: cards });
  return [...rest, ...(agents ? [agents] : sum ? [{ label: t('battle.agents'), value: sum }] : [])];
}

/** The King's lines with his tactic among them: by its name, with what it adds, or with nothing when it changes the dice or the rules instead. */
export const withTactic = (l: Line[]): Line[] => (l.some((x) => x.tactic) || !D.war ? l : [{ label: pick(D.names.tactics[D.war.tactic]), value: '', tactic: true }, ...l]);
/** The name of a fight: the siege of a colony, the attack on a tribe, a battle anywhere else. */
export const fight = (target: string, cell: number, defender: number | null) => (target === 'colony' && defender !== null ? t('battle.siege', { x: colonyName({ cell, owner: colonyAt(cell)?.owner ?? defender }) }) : target === 'settlement' ? t('battle.raid', { x: (() => { const v = D.settlements.find((q) => q.cell === cell); return v ? pick(D.names.tribes[v.tribe]) : cellName(cell); })() }) : t('battle.fight', { x: cellName(cell) }));
/** A fight on the screen: its name, the two banners with their cards under them, the chance or the dice between, and the hand below. */
export const stage = (title: string, left: string, leftRow: string, center: string, right: string, rightRow: string, below = '') =>
  `<div class="siege"><h2>${title}</h2><div class="sduel"><div class="sside">${left}<div class="srow">${leftRow}</div></div><div class="smid">${center}</div><div class="sside">${right}<div class="srow">${rightRow}</div></div></div>${below ? `<div class="shand">${below}</div>` : ''}</div>`;

/** A war card's or agent's strength in the war: a card adds only its 🗡️ there. */
export const warPower = (k: string) => (k === 'brave' ? D.settings.war.allyCubes : k === 'militia' || k === 'mercenary' ? 1 : Math.max(0, ...D.agents[k]!.mods.flatMap((m) => (m.mod === 'combat' && !m.vs && !m.terrain ? [m.add] : []))));
/** The faces that win in this war, and how many successes are needed: the board's, or the King's tactic's. */
const warDice = (x: { counter?: boolean }) => { const e = D.war ? D.tacticEffects[D.war.tactic] : undefined; return x.counter ? { faces: D.settings.combat.successFaces.length, need: 1 } : { faces: e?.t === 'successFrom' ? e.faces.length : D.settings.combat.successFaces.length, need: e?.t === 'minSuccesses' ? e.value : 1 }; };
/** The chance a colony holds against `atk`, defended by `def`, worst and best with its hidden cards: each adds 0 to 3 in the war. */
export function holds(x: { counter?: boolean }, atk: number, def: number, hidA: number, hidD: number): [number, number] {
  const { faces, need } = warDice(x), most = strongest(), win = (gap: number) => chance(gap, faces, need, D.settings.war.diceCap);
  return [1 - win(atk + hidA * most - def), 1 - win(atk - def - hidD * most)];
}

/** A redcoat: one soldier of the Royal Army, a red cube on the table. */
const SOLDIER = (s: number) => `<svg viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${Sprite.redcoat()}</svg>`;
/** The King's redcoats as little figures: up to `most` of them, then how many in all. */
export const men = (n: number, most = 12) => `<span class="wmen">${SOLDIER(26).repeat(Math.min(n, most))}${n > most ? `<em>×${n}</em>` : ''}</span>`;
/** The redcoats sent to a colony: a few figures and how many. */
const redcoats = (n: number) => (n ? `<span class="sred" title="${t('war.redcoats_at', { n })}">${SOLDIER(20).repeat(Math.min(n, 3))}<b>${n}</b></span>` : '');

export type Stacks = (readonly [number, readonly string[]])[];
/** The stacks on a colony: its owner's defend it (below), everyone else's attack it (above). */
export const stacksOf = (x: Siege) => { const l: Stacks = Object.entries(x.stacks).map(([q, c]) => [Number(q), c] as const); return { below: l.filter(([q]) => q === x.owner), above: l.filter(([q]) => q !== x.owner) }; };
/** Cards of others, still face down: how many, and what they add. */
export const unseen = (l: Stacks) => l.filter(([q]) => q !== me).reduce((m, [, c]) => m + c.length, 0);
export const unseenPower = (l: Stacks) => l.filter(([q]) => q !== me).reduce((m, [, c]) => m + c.reduce((k, x) => k + warPower(x), 0), 0);

/**
 * The front lines (W-7) as the table lays them out: each player's board with a slot for each colony. On a slot: the redcoats and the attackers' stacks above,
 * what is known of each side's strength between, the defenders' stack below. No chance is told: cards may still come, and the others' lie face down.
 * `act` makes a slot a button (to place a card on it, or to open its siege); with `counted`, the strengths count the others' face-down cards, which are left out until they turn.
 */
export function frontLines(sieges: readonly Siege[], act: (i: number) => string | null, counted: boolean) {
  const boards: { owner: number; slots: string[] }[] = [];
  sieges.forEach((x, i) => {
    const { below, above } = stacksOf(x), hidD = unseen(below), hidA = unseen(above);
    const def = x.defence.total - (counted ? unseenPower(below) : 0), atk = x.attack.total - (counted ? unseenPower(above) : 0);
    const fan = (l: Stacks) => l.map(([p, c]) => `<div class="sfan">${c.map((k) => (p === me ? card(k, { w: 38, power: warPower(k) }) : back(p, 38))).join('')}</div>`).join('');
    const a = act(i), tag = a === null ? 'div' : 'button', struck = x.cubes > 0 || above.length > 0;
    const slot = `<${tag} class="slot${a === null ? '' : ' can'}" ${a ?? ''}><b class="sname" title="${colonyName(x)}">${colonyName(x)}</b><div class="szone up">${redcoats(x.cubes)}${fan(above)}</div>`
      + `<div class="svs"><span class="d">${def}${hidD ? '<em>+?</em>' : ''}</span>${icon('power', 15)}<span class="a">${struck ? `${atk}${hidA ? '<em>+?</em>' : ''}` : '–'}</span></div><div class="szone">${fan(below)}</div></${tag}>`;
    const b = boards.at(-1);
    if (b?.owner === x.owner) b.slots.push(slot); else boards.push({ owner: x.owner, slots: [slot] });
  });
  return `<div class="sboards">${boards.map((b) => `<section class="sboard" style="--c:${colorOf(b.owner)}"><header>${Places.em(b.owner, 26)}<b>${name(b.owner)}</b>${b.owner === D.war?.loyalist ? `<small>${t('loyalist')}</small>` : ''}</header><div class="sslots">${b.slots.join('')}</div></section>`).join('')}</div>`;
}
