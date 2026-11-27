/* The full Colony and Europe screens. Agents, Fathers and buildings all appear as cards in the proportions of printed ones. */
import type { Snapshot } from '../view.ts';
import { $, ACT, art, cap, colonyName, D, P, pick, RES, t, W } from '../data.ts';
import { icon } from '../icons.ts';
import { Board } from '../map/board.ts';
import { Sprite } from '../map/sprites.ts';
import { Places, type Spaces } from '../places.ts';
import { Sim } from '../sim.ts';
import { S } from '../state.ts';
import { Texts, trait, work } from '../texts.ts';
import { lore } from './fans.ts';
import { goods, hull } from './goods.ts';

/** A card: picture, name, what it does, a note (what is missing), and the story line last, where it may be cut. */
interface Card { id?: string; pic: string; name: string; does?: string; note?: string; story?: string; cost?: string; cls?: string }
const deck = ({ id = '', pic, name, does = '', note = '', story = '', cost = '', cls = '' }: Card) => `<div class="dk ${cls}"${id ? ` data-space="${id}"` : ''}><img class="pic" src="${pic}" alt="">${cost ? `<span class="cost">${cost}</span>` : ''}${id ? `<span class="tk">${Places.tokens(id)}</span>` : ''}<div class="dt"><b>${name}</b>${does ? `<small>${does}</small>` : ''}${note ? `<em>${note}</em>` : ''}${story ? `<i>${story}</i>` : ''}</div></div>`;
const back = () => `<button class="back" data-close>${t('map')}</button>`;

/* ---- Colony ---- */
/** The 3×3 cells around a colony, with what an agent would gather on each. */
function land(home: Snapshot['colonies'][number], ys: Snapshot['land']) {
  const cells = [-1, 0, 1].flatMap((a) => [-1, 0, 1].map((b) => {
    const c = home.cell + a * W + b, y = ys.filter((q) => q.cell === c), here = !a && !b;
    return `<div class="c${here ? ' here' : ''}" ${y.length || Places.tokens(`cell:${c}`) ? `data-space="cell:${c}"` : ''} style="left:${(b + 1) * 33.33}%;top:${(a + 1) * 33.33}%">${here ? `<svg class="town" viewBox="0 0 64 64">${Sprite.colony(home)}</svg>` : ''}${y.map((q) => `<span class="y">${icon(Places.ico(q.icon), 20)}${q.n}</span>`).join('')}${Places.tokens(`cell:${c}`)}</div>`;
  })).join('');
  return `<div class="home"><input class="cname" data-rename="${home.cell}" value="${colonyName(home)}" maxlength="24" spellcheck="false" title="${t('scenes.rename')}"${Sim.replay ? ' disabled' : ''}><div class="land"><canvas width="520" height="520" data-home="${home.cell}"></canvas>${cells}</div></div>`;
}
/** A colony's defence and where it comes from: the colony itself, its terrain, defensive buildings. */
function defence(h: { defence: number; parts: { label: string; value: number }[] }) {
  const name = (l: string) => (l === 'colony' ? t('part.colony') : D.names.terrain[l] ? pick(D.names.terrain[l]).toLowerCase() : D.buildings[l] ? pick(D.buildings[l]).toLowerCase() : l);
  return `${t('defence')} ${icon('sword', 14)} <b>${h.defence}</b> = ${h.parts.map((x) => `${name(x.label)} ${x.value}`).join(' + ')}`;
}
/** A building, built or not. One not built is a project: dim, with its cost and what it still needs. */
function building(b: string, sp: Spaces) {
  const def = D.buildings[b], name = cap(pick(def));
  if (P.buildings.includes(b)) return deck({ id: `lot:${b}`, pic: art.building(b), name, does: (S.card && Places.label(sp[`lot:${b}`])) || work(b), cls: `bl built${def.improvement ? ' up' : ''}` });
  const s = sp[`build:${b}`], gone = D.left[b] <= 0, base = def.requires && !P.buildings.includes(def.requires);
  const note = gone ? t('scenes.none_left') : base ? `${t('scenes.needs')} ${cap(pick(D.buildings[def.requires!]))}` : S.card && s && !s.options ? (s.need ? Places.lack(s) : s.why) : '';
  return deck({ id: `build:${b}`, pic: art.building(b), name, does: `${work(b)} ${Places.gain(D.settings.score.building)}`, note, cost: `${s?.cost ?? def.timber}${icon('timber', 16)}`, cls: `bl plan${def.improvement ? ' up' : ''}${gone ? ' gone' : ''}${base ? ' locked' : ''}` });
}
function colony(sp: Spaces) {
  const homes = Places.homes(), ys = S.card ? D.yields[S.card] || [] : D.land;
  // Seven basic buildings, each with the one improvement that can follow it.
  const basics = Object.keys(D.buildings).filter((b) => !D.buildings[b].improvement), next = (b: string) => Object.keys(D.buildings).find((x) => D.buildings[x].requires === b);
  const tree = `${basics.map((b) => building(b, sp)).join('')}${basics.map((b) => { const n = next(b); return n ? building(n, sp) : '<span></span>'; }).join('')}`;
  const seats = `${P.fathers.map((f) => deck({ pic: art.father(f), name: pick(D.fathers[f]), does: Texts.father(f, 14), story: lore(f), cls: 'fa' })).join('')}${'<div class="dk seat"></div>'.repeat(Math.max(0, D.settings.fathers.max - P.fathers.length))}`;
  const supply = S.card ? `<small>${pick(ACT.supply)}: ${sp.deck?.options ? `${Places.plus(-1, 'food')}, ${t('places.draw_1')}` : Places.label(sp.deck)}</small>` : '';
  $('sCol').style.backgroundImage = `url(${art.nation(P.nation)})`;
  // A name being typed survives the screen being drawn again.
  const ed = document.activeElement instanceof HTMLInputElement && document.activeElement.dataset.rename ? { cell: document.activeElement.dataset.rename, value: document.activeElement.value, at: document.activeElement.selectionStart } : null;
  $('sCol').innerHTML = `${back()}<div class="in"><h2>${pick(D.names.nations[P.nation])}</h2><div class="two">
<div><div class="lands n${homes.length}">${homes.map((h) => land(h, ys)).join('') || `<p>${t('scenes.no_colony')}</p>`}</div>${homes.length ? `<p class="defs">${homes.map((h) => `${homes.length > 1 ? `${colonyName(h)}: ` : ''}${defence(h)}`).join('<br>')}</p>` : ''}
<div class="stores"><div data-space="deck" class="wz"><h4>${t('warehouse')} ${Places.sum(P.wh)}/${D.cap} ${supply}</h4><div class="heap wide">${goods(P.wh).map((r) => `<span>${icon(r, 27)}</span>`).join('')}${'<i></i>'.repeat(Math.max(0, D.cap - Places.sum(P.wh)))}</div></div><div><h4>${t('hold')}</h4>${hull()}</div></div></div>
<div><h4>${t('buildings')} ${P.buildings.length}/${D.settings.buildings.max} <small>${t('scenes.under_building')}</small></h4><div class="tree">${tree}</div>
<h4>${t('fathers')} ${P.fathers.length}/${D.settings.fathers.max}</h4><div class="row-dk">${seats}</div></div></div></div>`;
  const again = ed && $('sCol').querySelector<HTMLInputElement>(`[data-rename="${ed.cell}"]`);
  if (again) { again.value = ed.value; again.focus(); again.setSelectionRange(ed.at, ed.at); }
  const T = Board.terrain, k = T.width / W;
  $('sCol').querySelectorAll('canvas').forEach((c) => { const h = +c.dataset.home!, x = (h % W) - 1, y = Math.floor(h / W) - 1; c.getContext('2d')!.drawImage(T, x * k, y * k, 3 * k, 3 * k, 0, 0, 520, 520); });
}

/* ---- Europe ---- */
/** The face-down deck of agents beside the pier. On the player's turn, crosses equal to the round buy a look at its top agent, without using an action. */
function recruit(sp: Spaces) {
  const cost = D.recruit, why = Sim.kind() === 'recruit' ? '' : Sim.kind() !== 'turn' ? t('scenes.turn') : !P.hand.length ? t('scenes.needs_agent')
    : !D.agentsLeft ? t('scenes.deck_empty') : P.crosses < cost ? t('scenes.crosses', { cost }) : '', off = !!why || Sim.kind() === 'recruit';
  // The back of the deck: a gilt frame and a compass star. The price is in the corner; the reason it cannot be done now, in the tooltip.
  const star = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="30" fill="none" stroke="currentColor" stroke-width="2"/><circle r="22" fill="none" stroke="currentColor" stroke-width="1" opacity=".6"/><path d="M0-44 7-7 44 0 7 7 0 44-7 7-44 0-7-7Z" fill="currentColor"/><path d="M0-44 7-7 0 0ZM44 0 7 7 0 0ZM0 44-7 7 0 0ZM-44 0-7-7 0 0Z" fill="#0c2d33" opacity=".35"/><circle r="4" fill="#0c2d33"/></svg>';
  // As an action, an agent is played on the deck, like on any other place.
  const looks = sp['eu:recruit']?.options ?? [];
  if (D.settings.crosses.recruitAction) return `<div class="dk rec${P.crosses < cost ? ' dear' : ''}" data-space="eu:recruit"><span class="pile">${star}</span><span class="cost">${icon('crosses', 16)}${cost}+</span>
<span class="dt"><b>${t('act.recruit')}</b><small>${S.card ? (looks.length > 1 ? `<span class="yes">${t('scenes.look')} ${looks[0].n}–${looks.at(-1)!.n}</span>` : Places.label(sp['eu:recruit'])) : t('scenes.spend_crosses')}</small></span></div>`;
  return `<button class="dk rec${P.crosses < cost ? ' dear' : off ? ' off' : ''}" ${off ? 'disabled' : 'data-recruit'}${why ? ` title="${why}"` : ''}><span class="pile">${star}</span><span class="cost">${icon('crosses', 16)}${cost}</span>
<span class="dt"><b>${t('act.recruit')}</b><small>${t('scenes.look_top')}</small></span></button>`;
}
function europe(sp: Spaces) {
  const lab = (id: string) => (S.card ? Places.label(sp[id]) : '');
  const market = `<div class="zone" data-space="eu:market"><h4>${t('market')} ${lab('eu:market')}</h4><div class="mk">${RES.map((r) => `${icon(r, 32)}<span class="bar"><i style="width:${D.price[r] * 20}%"></i></span><b>${D.price[r]}</b><span class="dm" title="${t('demand')}">${D.players.map((_, i) => `<i class="${i < D.demand[r] ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</div><p class="note">${t('scenes.circles_good')}</p><div class="hold">${hull()}<span>${t('scenes.worth')} <b>${Places.worth(S.card)} ${icon('gold', 22)}</b>${Places.inEurope() ? '' : `<br><small>${t('scenes.ship_europe')}</small>`}</span>${Places.tokens('eu:market')}</div></div>`;
  const extra = `${S.card && sp['eu:some']?.options ? `<div class="tls wide"><div class="tl" data-space="eu:some"><img src="art/crate.webp" alt=""><span><b>${t('fans.sell2')}</b></span></div></div>` : ''}${P.damage ? `<div class="tls wide"><div class="tl" data-space="eu:yard"><img src="${art.building('shipyard')}" alt=""><span><b>${pick(ACT.repair)}</b></span><span class="rs">${lab('eu:yard')}</span></div></div>` : ''}`;
  const agents = D.pier.map(([x, n]) => deck({ id: `pier:${x}`, pic: art.agent(x), name: `${pick(D.agents[x])}${n > 1 ? ` ×${n}` : ''}`, does: trait(x) || t('fans.no_talent'), cost: `${icon('gold', 16)}${sp[`pier:${x}`]?.cost ?? D.agents[x].price}`, cls: `ag${(D.agents[x].price ?? 0) > P.gold ? ' dear' : ''}` })).join('') + (S.card ? `<div class="dk newp" data-space="pier:new"><span class="rot">↻</span><b>${t('fans.new_agents')}</b></div>` : '');
  const pier = agents + recruit(sp);
  const salon = D.salon.map((f) => deck({ id: `salon:${f}`, pic: art.father(f), name: pick(D.fathers[f]), does: `${Texts.father(f, 14)} ${Places.gain(D.settings.score.father)}`, story: lore(f), cost: `${icon('bells', 16)}${D.fathers[f].bells}`, cls: `fa${D.fathers[f].bells > P.bells ? ' dear' : ''}` })).join('');
  $('sEu').innerHTML = `${back()}<div class="in"><h2>${t('europe')}</h2><div class="two eu"><div>${market}${extra}</div><div><h4>${t('pier')} <small>${t('scenes.up_2')}</small></h4><div class="row-dk">${pier}</div><h4>${t('salon')} <small>${t('scenes.up_2')}</small></h4><div class="row-dk">${salon}</div></div></div></div>`;
}
export function scenes(sp: Spaces) {
  if (S.view === 'colony') colony(sp); else $('sCol').innerHTML = '';
  if (S.view === 'europe') europe(sp); else $('sEu').innerHTML = '';
}
