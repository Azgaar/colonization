/* The full Colony and Europe screens. Agents, Fathers and buildings all appear as cards in the proportions of printed ones. */
import { $, ACT, art, cap, D, L, P, pick, RES, t, W } from '../data.js';
import { icon } from '../icons.js';
import { Board } from '../map/board.js';
import { Sprite } from '../map/sprites.js';
import { Places } from '../places.js';
import { S } from '../state.js';
import { Texts, trait, work } from '../texts.js';
import { lore } from './fans.js';
import { goods, hull } from './goods.js';

/** A card: picture, name, what it does, a note (what is missing), and the story line last, where it may be cut. */
const deck = ({ id = '', pic, name, does = '', note = '', story = '', cost = '', cls = '' }) => `<div class="dk ${cls}"${id ? ` data-space="${id}"` : ''}><img class="pic" src="${pic}" alt="">${cost ? `<span class="cost">${cost}</span>` : ''}${id ? `<span class="tk">${Places.tokens(id)}</span>` : ''}<div class="dt"><b>${name}</b>${does ? `<small>${does}</small>` : ''}${note ? `<em>${note}</em>` : ''}${story ? `<i>${story}</i>` : ''}</div></div>`;
const back = () => `<button class="back" data-close>${t('map')}</button>`;

/* ---- Colony ---- */
/** The 3×3 cells around a colony, with what an agent would gather on each. */
function land(home, ys) {
  const cells = [-1, 0, 1].flatMap((a) => [-1, 0, 1].map((b) => {
    const c = home.cell + a * W + b, y = ys.filter((q) => q.cell === c), here = !a && !b;
    return `<div class="c${here ? ' here' : ''}" ${y.length || Places.tokens(`cell:${c}`) ? `data-space="cell:${c}"` : ''} style="left:${(b + 1) * 33.33}%;top:${(a + 1) * 33.33}%">${here ? `<svg class="town" viewBox="0 0 64 64">${Sprite.colony(home)}</svg>` : ''}${y.map((q) => `<span class="y">${icon(Places.ico(q.icon), 20)}${q.n}</span>`).join('')}${Places.tokens(`cell:${c}`)}</div>`;
  })).join('');
  return `<div class="land"><canvas width="520" height="520" data-home="${home.cell}"></canvas>${cells}<span class="def">${icon('sword', 15)} ${home.defence}</span></div>`;
}
/** A building, built or not. One not built is a project: dim, with its cost and what it still needs. */
function building(b, sp) {
  const def = D.buildings[b], name = cap(pick(def));
  if (P.buildings.includes(b)) return deck({ id: `lot:${b}`, pic: art.building(b), name, does: (S.card && Places.label(sp[`lot:${b}`])) || work(b), cls: `bl built${def.improvement ? ' up' : ''}` });
  const s = sp[`build:${b}`], gone = D.left[b] <= 0, base = def.requires && !P.buildings.includes(def.requires);
  const note = gone ? L('None left', 'Не осталось') : base ? `${L('Needs', 'Нужно:')} ${cap(pick(D.buildings[def.requires]))}` : S.card && s && !s.options ? (s.need ? Places.lack(s) : s.why) : '';
  return deck({ id: `build:${b}`, pic: art.building(b), name, does: work(b), note, cost: `${s?.cost ?? def.timber}${icon('timber', 16)}`, cls: `bl plan${def.improvement ? ' up' : ''}${gone ? ' gone' : ''}${base ? ' locked' : ''}` });
}
function colony(sp) {
  const homes = Places.homes(), ys = S.card ? D.yields[S.card] || [] : D.land;
  // Seven basic buildings, each with the one improvement that can follow it.
  const basics = Object.keys(D.buildings).filter((b) => !D.buildings[b].improvement), next = (b) => Object.keys(D.buildings).find((x) => D.buildings[x].requires === b);
  const tree = `${basics.map((b) => building(b, sp)).join('')}${basics.map((b) => (next(b) ? building(next(b), sp) : '<span></span>')).join('')}`;
  const seats = `${P.fathers.map((f) => deck({ pic: art.father(f), name: pick(D.fathers[f]), does: Texts.father(f, 14), story: lore(f), cls: 'fa' })).join('')}${'<div class="dk seat"></div>'.repeat(Math.max(0, D.settings.fathers.max - P.fathers.length))}`;
  const supply = S.card ? `<small>${pick(ACT.supply)}: ${sp.deck?.options ? `${Places.plus(-1, 'food')}, ${L('draw 1', 'взять 1')}` : Places.label(sp.deck)}</small>` : '';
  $('sCol').style.backgroundImage = `url(${art.nation(P.nation)})`;
  $('sCol').innerHTML = `${back()}<div class="in"><h2>${pick(D.names.nations[P.nation])}</h2><div class="two">
<div><div class="lands n${homes.length}">${homes.map((h) => land(h, ys)).join('') || `<p>${L('No colony yet. Land your infantry and found one.', 'Колонии пока нет. Высадите пехоту и основайте её.')}</p>`}</div>
<div class="stores"><div data-space="deck" class="wz"><h4>${t('warehouse')} ${Places.sum(P.wh)}/${D.cap} ${supply}</h4><div class="heap wide">${goods(P.wh).map((r) => `<span>${icon(r, 27)}</span>`).join('')}${'<i></i>'.repeat(Math.max(0, D.cap - Places.sum(P.wh)))}</div></div><div><h4>${t('hold')}</h4>${hull()}</div></div></div>
<div><h4>${t('buildings')} ${P.buildings.length}/${D.settings.buildings.max} <small>${L('Under each building, its improvement: one of each in the game. Dark ones are not built yet', 'Под каждой постройкой её улучшение, одно на игру. Тёмные ещё не построены')}</small></h4><div class="tree">${tree}</div>
<h4>${t('fathers')} ${P.fathers.length}/${D.settings.fathers.max}</h4><div class="row-dk">${seats}</div></div></div></div>`;
  const T = Board.terrain, k = T.width / W;
  $('sCol').querySelectorAll('canvas').forEach((c) => { const h = +c.dataset.home, x = (h % W) - 1, y = Math.floor(h / W) - 1; c.getContext('2d').drawImage(T, x * k, y * k, 3 * k, 3 * k, 0, 0, 520, 520); });
}

/* ---- Europe ---- */
function europe(sp) {
  const lab = (id) => (S.card ? Places.label(sp[id]) : '');
  const market = `<div class="zone" data-space="eu:market"><h4>${t('market')} ${lab('eu:market')}</h4><div class="mk">${RES.map((r) => `${icon(r, 32)}<span class="bar"><i style="width:${D.price[r] * 20}%"></i></span><b>${D.price[r]}</b><span class="dm" title="${t('demand')}">${D.players.map((_, i) => `<i class="${i < D.demand[r] ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</div><p class="note">${L('When the circles of a good fill, its price falls by 1.', 'Когда кружки товара заполнены, его цена падает на 1.')}</p><div class="hold">${hull()}<span>${L('Worth', 'Стоит')} <b>${Places.worth(S.card)} ${icon('gold', 22)}</b>${Places.inEurope() ? '' : `<br><small>${L('The ship must be in Europe to sell', 'Чтобы продать, корабль должен быть в Европе')}</small>`}</span>${Places.tokens('eu:market')}</div></div>`;
  const extra = `${S.card && sp['eu:some']?.options ? `<div class="tls wide"><div class="tl" data-space="eu:some"><img src="art/crate.webp" alt=""><span><b>${L('Sell some', 'Продать часть')}</b></span></div></div>` : ''}${P.damage ? `<div class="tls wide"><div class="tl" data-space="eu:yard"><img src="${art.building('shipyard')}" alt=""><span><b>${pick(ACT.repair)}</b></span><span class="rs">${lab('eu:yard')}</span></div></div>` : ''}`;
  const pier = D.pier.map(([x, n]) => deck({ id: `pier:${x}`, pic: art.agent(x), name: `${pick(D.agents[x])}${n > 1 ? ` ×${n}` : ''}`, does: trait(x) || L('no talent', 'без таланта'), cost: `${icon('gold', 16)}${sp[`pier:${x}`]?.cost ?? D.agents[x].price}`, cls: `ag${D.agents[x].price > P.gold ? ' dear' : ''}` })).join('') + (S.card ? `<div class="dk newp" data-space="pier:new"><span class="rot">↻</span><b>${L('New agents', 'Другие агенты')}</b></div>` : '');
  const salon = D.salon.map((f) => deck({ id: `salon:${f}`, pic: art.father(f), name: pick(D.fathers[f]), does: Texts.father(f, 14), story: lore(f), cost: `${icon('bells', 16)}${D.fathers[f].bells}`, cls: `fa${D.fathers[f].bells > P.bells ? ' dear' : ''}` })).join('');
  $('sEu').innerHTML = `${back()}<div class="in"><h2>${t('europe')}</h2><div class="two eu"><div>${market}${extra}</div><div><h4>${t('pier')} <small>${L('up to 2 per action', 'до 2 за действие')}</small></h4><div class="row-dk">${pier}</div><h4>${t('salon')} <small>${L('up to 2 per action', 'до 2 за действие')}</small></h4><div class="row-dk">${salon}</div></div></div></div>`;
}
export function scenes(sp) {
  if (S.view === 'colony') colony(sp); else $('sCol').innerHTML = '';
  if (S.view === 'europe') europe(sp); else $('sEu').innerHTML = '';
}
