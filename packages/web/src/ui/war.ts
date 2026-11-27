/* The war, colony by colony, on the map: the colony against the Royal Army as pictures, the dice, what came of it; then the end of the game. */
import { $, art, D, pick, t } from '../data.ts';
import { icon, SHAPES } from '../icons.ts';
import { Sprite } from '../map/sprites.ts';
import { Places } from '../places.ts';
import { S } from '../state.ts';
import type { Snapshot } from '../view.ts';
import { dice, part } from './kit.ts';
import { ending } from './ending.ts';
type Siege = NonNullable<Snapshot['war']>['sieges'][number];
type Explained = Siege['attack'];
/** The faces that succeed in this war: the board's, or the King's tactic's. */
export const warFaces = () => { const e = D.war ? D.tacticEffects[D.war.tactic] : undefined; return e?.t === 'successFrom' ? e.faces : D.settings.combat.successFaces; };
/** The chance that a colony holds, from the gap in strength and the King's tactic. */
export const odds = (x: Siege, tactic: string) => { const n = Math.min(10, Math.max(0, x.attack.total - x.defence.total)), q = 2 / 3; return n === 0 ? 1 : tactic === 'extended_supply_lines' ? q ** n + (n * q ** (n - 1)) / 3 : tactic === 'surprise_assault' ? 0.5 ** n : q ** n; };
const SOLDIER = `<svg viewBox="0 0 64 64" width="26" height="26">${Sprite.redcoat()}</svg>`;
/** The King's soldiers at a colony, as little figures: up to `most` of them, then how many in all. */
export const men = (n: number, most = 12) => `<span class="wmen">${SOLDIER.repeat(Math.min(n, most))}${n > most ? `<em>×${n}</em>` : ''}</span>`;
const face = (card: string) => `<img class="wface" src="${art.agent(card)}" alt="" title="${pick(D.agents[card])}">`;
const chip = (pic: string, v: number, title: string) => `<span class="wchip" title="${title}">${pic}<b>${v > 0 ? '+' : ''}${v}</b></span>`;
/** One part of a side's strength as a picture: soldiers, faces, a building, an icon. */
function piece(x: Siege, label: string, v: number) {
  const name = part(label);
  if (label === 'ref') return `<span class="wchip men" title="${name}">${SOLDIER.repeat(Math.min(x.cubes, 24))}${x.cubes > 24 ? `<em>×${x.cubes}</em>` : ''}<b>+${v}</b></span>`;
  // The loyalist's agents fight face down: only whose they are shows.
  if (label === 'loyalist cards') return chip(D.war?.loyalist == null ? icon('people', 22) : Places.em(D.war.loyalist, 24), v, name);
  if (label === 'army') return chip(x.army.map(face).join(''), v, name);
  if (label === 'loyalist militia' || label === 'support') return chip(icon('people', 22), v, name);
  if (label === 'tactic') return chip(icon('ref', 22), v, name);
  if (label === 'colony') return chip(icon('house', 22), v, name);
  if (label === 'tokens') return chip(icon('ship', 22), v, name);
  if (D.buildings[label]) return chip(`<img class="wbld" src="${art.building(label)}" alt="">`, v, name);
  if (label === 'benedict_arnold') return chip(`<img class="wface" src="${art.father(label)}" alt="">`, v, name);
  // The ground the colony stands on: its picture where there is one, else its name.
  if (label === 'terrain') { const g = D.terrain[x.cell] ?? ''; return chip(SHAPES[g] ? icon(g, 22) : `<i class="wtxt">${D.names.terrain[g] ? pick(D.names.terrain[g]) : name}</i>`, v, name); }
  return chip(SHAPES[label] ? icon(label, 22) : `<i class="wtxt">${name}</i>`, v, name);
}
const side = (x: Siege, e: Explained, cls: string, head: string) => `<div class="wside ${cls}"><header>${head}<strong>${e.total}</strong></header><div class="wparts">${e.parts.filter((q) => q.value).map((q) => piece(x, q.label, q.value)).join('')}</div></div>`;
export function war() {
  const w = D.war, over = D.over;
  document.body.classList.toggle('ended', !!w && !!over && S.war >= (w?.sieges.length ?? 0));
  if (S.war < 0 || !w) { $('war').innerHTML = ''; ending(); return; }
  const n = w.sieges.length, x = w.sieges[S.war];
  ending();
  if (!x) { $('war').innerHTML = ''; return; }
  const nav = `<nav class="wnav"><button data-war="${Math.max(0, S.war - 1)}" aria-label="${t('war.previous')}">◂</button>${w.sieges.map((q, k) => `<button class="wd${k === S.war ? ' on' : ''}${q.fell ? ' fell' : ''}" data-war="${k}">${Places.em(q.owner, 28)}</button>`).join('')}<button data-war="${Math.min(n, S.war + 1)}" aria-label="${t('war.next')}">▸</button>${over ? `<button class="tx" data-war="${n}">${t('result')}</button>` : `<button class="tx" data-peace>${t('close')}</button>`}</nav>`;
  const a = x.attack.total, d = x.defence.total, share = a + d ? (d / (a + d)) * 100 : 50, p = D.players[x.owner]!;
  const out = x.fell ? (x.takenBy !== null && x.takenBy !== undefined ? `${t('war.taken')} ${Places.name(x.takenBy)}` : t('falls')) : t('holds');
  $('war').innerHTML = `<div class="wtop"><span class="wtac">${icon('ref', 20)}${pick(D.names.tactics[w.tactic])}</span>${w.loyalist === null ? '' : `<span class="wloy">${Places.em(w.loyalist, 22)}${t('loyalist')}</span>`}</div>
<div class="wfight" style="--pc:${p.color}">${side(x, x.defence, 'def', `${Places.em(x.owner, 36)}<h3>${Places.name(x.owner)}</h3>`)}<span class="wvs">${t('war.vs')}</span>${side(x, x.attack, 'atk', `<span class="wcrown">${icon('ref', 34)}</span><h3>${t('ref')}</h3>`)}</div>
<div class="wtug"><i style="width:${share.toFixed(1)}%"></i><i></i></div>
<div class="wend${x.fell ? ' fell' : ''}">${x.dice?.length ? dice(x.dice, warFaces()) : `<span class="dim">${t('war.no_dice')}</span>`}<span class="wodds">${t('odds')} ${(odds(x, w.tactic) * 100).toFixed(0)}%</span><b>${out}</b></div>${nav}`;
}
