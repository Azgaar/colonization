/* Lifting, hovering and dropping agents; clicks and keys. */
import { clearNews } from './ui/reports.js';
import { art, colonyAt, D, L, me, P, pick, RES, settlementAt } from './data.js';
import { act, cargo, commit, focus, go, read, settle } from './flow.js';
import { Board } from './map/board.js';
import { paint } from './paint.js';
import { Places } from './places.js';
import { Sim } from './sim.js';
import { S, U, X } from './state.js';
import { deciding, paintStep, pickedCards } from './ui/decisions.js';
import { peek } from './ui/fans.js';
/* ---- lifting, hovering, dropping ---- */
let press = null, ghost = null;
const find = (x, y) => { for (const e of document.elementsFromPoint(x, y)) { const s = e.closest('[data-space]'); if (s) return s.dataset.space; if (e.closest('.map-stage')) { const c = Board.stage.cell(x, y); return c === null ? null : `cell:${c}`; } if (e.closest('[data-solid]')) return null; } return null; };
export const bub = () => { let b = document.querySelector('.kb'); if (!b) { b = document.createElement('div'); b.className = 'kb'; document.body.append(b); } return b; };
function hover(x, y) {
  const id = find(x, y);
  if (id !== S.over) { document.querySelectorAll('.over').forEach((e) => e.classList.remove('over')); S.over = id; if (id && !id.startsWith('cell:')) document.querySelector(`[data-space="${id}"]`)?.classList.add('over'); Board.draw(); }
  const b = bub(), s = id && S.card ? Places.spaces(S.card)[id] : null;
  if (id?.startsWith('cell:') && s?.options?.length) { const o = s.options, v = settlementAt(+id.slice(5)); b.classList.toggle('ch', !!v); const say = (o.length === 1 ? `<b>${Places.verb(o[0])}</b> ${Places.effect(o[0]).join(' ')}` : `<b>${[...new Set(o.map(Places.verb))].join(L(' or ', ' или '))}</b>`) + (s.site ? `<small class="st">⚑ ${L('a colony can be founded here', 'здесь можно основать колонию')}</small>` : ''); b.innerHTML = (v ? `<img src="${art.tribe(v.tribe)}" alt=""><i>${pick(D.names.tribes[v.tribe])}</i><span>${say}</span>` : say); b.hidden = false; b.style.left = `${Math.min(innerWidth - 120, Math.max(120, x))}px`; b.style.top = `${y - 46}px`; } else b.hidden = true;
}
function drop(x, y) {
  const id = find(x, y), s = id ? Places.spaces(S.card)[id] : null;
  bub().hidden = true;
  if (!s?.options?.length) return false;
  if (s.options.length === 1) { commit(s.options[0], id === 'found' ? `cell:${s.cell}` : id); return true; }
  S.pickAt = { x, y, id }; picker(); return true;
}
export function picker() {
  let p = document.querySelector('.kp'); if (!p) { p = document.createElement('div'); p.className = 'kp'; p.dataset.solid = ''; document.body.append(p); }
  const s = S.pickAt && S.card ? Places.spaces(S.card)[S.pickAt.id] : null; if (!s?.options?.length) { p.hidden = true; S.pickAt = null; return; }
  p.innerHTML = s.options.map((o, i) => { const f = Places.face(o); return `<button class="${f ? 'im' : ''}" data-opt="${i}">${f ? `<img src="${f}" alt="">` : ''}<b>${Places.verb(o)}</b><span>${Places.effect(o).join(' ')}</span></button>`; }).join('');
  p.hidden = false; const r = p.getBoundingClientRect(); p.style.left = `${Math.max(12, Math.min(innerWidth - r.width - 12, S.pickAt.x - r.width / 2))}px`; p.style.top = `${Math.max(12, Math.min(innerHeight - r.height - 12, S.pickAt.y - r.height - 22))}px`;
}
const put = () => { ghost?.remove(); ghost = null; S.drag = null; };
addEventListener('pointerdown', (e) => { const a = e.target.closest('[data-agent]'); if (a && e.button === 0 && Sim.kind() === 'turn' && !Sim.busy && !X.reports.length) { press = { card: a.dataset.agent, x: e.clientX, y: e.clientY, on: false }; e.preventDefault(); } });
addEventListener('pointermove', (e) => {
  if (press) {
    if (!press.on && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 7) { press.on = true; S.card = S.drag = press.card; S.pickAt = null; S.look = null; paint(); ghost = document.createElement('div'); ghost.className = 'ghost'; ghost.innerHTML = `<img src="${art.agent(press.card)}" alt="">`; document.body.append(ghost); }
    if (press.on) { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; hover(e.clientX, e.clientY); }
  } else if ((S.card || Sim.kind() === 'move') && !S.pickAt) hover(e.clientX, e.clientY);
});
addEventListener('pointerup', (e) => {
  const p = press; press = null; if (!p) return;
  if (p.on) { put(); if (!drop(e.clientX, e.clientY)) S.card = null; S.over = null; if (!Sim.busy) paint(); }
  else { S.card = S.card === p.card ? null : p.card; S.pickAt = null; S.look = null; bub().hidden = true; paint(); }
});
/* A glimpse behind the doors on hover. */
let peekT;
addEventListener('pointerover', (e) => { if (e.pointerType === 'touch') return; const w = e.target.closest('#side,#de,#peekE') ? 'east' : e.target.closest('#heaps,#dw,#peekW') ? 'west' : null; clearTimeout(peekT); if (w === U.peek || S.card) return; peekT = setTimeout(() => { U.peek = w; peek(); }, w ? 260 : 380); });
/* ---- clicks ---- */
export function onCell(c) {
  if (Sim.busy || S.card) return;
  const k = Sim.kind();
  if (k === 'move' && !X.reports.length) { const m = Board.moving(), w = m.ways.get(c); S.over = null; if (m.frags.includes(D.frag[c]) && !D.open[c]) { act({ c: 'explore', frag: D.frag[c] }); return; } if (w) go(w.path); return; }
  if (k === 'startCell' || k === 'freeColony' || k === 'colonyWater' || k === 'refuge') { const o = Sim.legal().find((x) => x.cell === c); if (o) { act(o); return; } }
  if (S.war >= 0) return;
  if (colonyAt(c)?.owner === me && !deciding()) { S.view = 'colony'; S.look = null; } else S.look = S.look === c ? null : c;
  paint();
}
document.addEventListener('click', async (e) => {
  const q = (s) => e.target.closest(s); let x;
  if ((x = q('[data-opt]'))) { const s = Places.spaces(S.card)[S.pickAt.id]; commit(s.options[+x.dataset.opt], S.pickAt.id); return; }
  if (q('[data-agent]')) return;
  if (S.card && !q('button:not([data-space])')) { const id = find(e.clientX, e.clientY); if (id && drop(e.clientX, e.clientY)) return; if (S.pickAt && !q('.kp')) { S.pickAt = null; paint(); return; } }
  if (Sim.busy && !q('[data-menu],[data-fast],[data-sheet],[data-king]')) return;
  if (q('[data-ok]')) read();
  else if ((x = q('[data-do]'))) act(JSON.parse(x.dataset.do));
  else if ((x = q('[data-cargo]'))) cargo(x.dataset.cargo, x.dataset.r);
  else if ((x = q('[data-sell]'))) { const r = x.dataset.sell; if (r === 'ok') { Sim.mark(); for (const k of RES) if (X.sell[k] > 0) { const n = X.sell[k]; if (Sim.kind() === 'trade') Sim.apply({ c: 'sell', r: k, n }); } if (Sim.kind() === 'trade') Sim.apply({ c: 'done' }); X.sell = null; settle(); } else { X.sell[r] += +x.dataset.n; paintStep(); } }
  else if ((x = q('[data-sel]'))) { const v = x.dataset.sel; if (v === 'ok' || v === 'top') { const k = Sim.kind(), cards = pickedCards(); Sim.mark(); for (const card of cards) if (Sim.kind() === k) Sim.apply({ c: k === 'commit' ? 'add' : 'discard', card }); if (Sim.kind() === k && D.pending.player === me) Sim.apply({ c: k === 'commit' ? (v === 'top' ? 'top' : 'done') : 'keep' }); X.sel = []; settle(); } else { const i = +v; X.sel = X.sel.includes(i) ? X.sel.filter((n) => n !== i) : [...X.sel, i]; paintStep(); } }
  else if (q('[data-rest]')) { Sim.mark(); while (Sim.kind() === 'placeCards') Sim.apply({ c: 'keep', card: Sim.s.pending._cards[0] }); settle(); }
  else if (q('[data-undo]')) { Sim.undo(); clearNews(); S.card = null; S.war = -1; paint(); Board.land(); }
  else if (q('[data-pass]')) { Sim.mark(); S.card = null; Sim.apply({ c: 'pass' }); settle(); }
  else if (q('[data-recruit]')) { Sim.mark(); S.card = null; Sim.apply({ c: 'recruit' }); settle(); }
  else if (q('[data-peace]')) { S.war = -1; paint(); }
  else if ((x = q('[data-war]'))) { if (D.over) { S.war = +x.dataset.war; S.view = 'map'; S.look = null; U.king = false; focus(); paint(); } }
  else if ((x = q('[data-lang]'))) { document.documentElement.lang = x.dataset.lang; paint(); }
  else if ((x = q('[data-zoom]'))) Board.stage.zoomBy(+x.dataset.zoom);
  else if (q('[data-home]')) Board.home();
  else if (q('[data-fit]')) Board.fit();
  else if ((x = q('[data-grid]'))) { Board.grid = !!x.dataset.grid; paint(); }
  else if ((x = q('[data-follow]'))) { Board.view.auto = x.dataset.follow ? 1 : 0; localStorage.setItem(Board.KEY, JSON.stringify(Board.view)); Board.look(); Board.land(); paint(); }
  else if ((x = q('[data-fast]'))) { Sim.fast = !!x.dataset.fast; paint(); }
  else if (q('[data-reset]')) { Object.assign(Board.view, Board.VIEW); localStorage.removeItem(Board.KEY); Board.look(); Board.land(); paint(); }
  else if ((x = q('[data-auto]'))) { const r = D.round; U.menu = false; await Sim.auto((s) => (x.dataset.auto === 'war' ? !!s.war && s.pending?.player === me : s.round > r || !!s.war)); clearNews(); Sim.news(); settle(); }
  else if ((x = q('[data-new]'))) { U.menu = false; S.war = -1; S.view = 'map'; clearNews(); if (x.dataset.new) Sim.fresh(+x.dataset.new); else Sim.start(window.START); Board.home(); settle(); }
  else if (q('[data-menu]')) { U.menu = !U.menu; U.king = U.sheet = false; paint(); }
  else if (q('[data-king]')) { U.king = !U.king; U.sheet = U.menu = false; paint(); }
  else if (q('[data-sheet]')) { U.sheet = !U.sheet; U.king = U.menu = false; paint(); }
  else if (q('[data-close]')) { S.view = 'map'; paint(); }
  else if ((x = q('[data-go]'))) { if (!deciding()) { S.view = S.view === x.dataset.go ? 'map' : x.dataset.go; U.peek = null; paint(); } }
  else if (document.contains(e.target) && ((U.menu && !q('.menu')) || (U.king && !q('.kingbox')))) { U.menu = U.king = false; paint(); }
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { put(); if (S.pickAt) S.pickAt = null; else if (S.card) S.card = null; else if (S.war >= 0) S.war = -1; else if (U.menu || U.king || U.sheet) U.menu = U.king = U.sheet = false; else S.view = 'map'; bub().hidden = true; paint(); }
  if (e.key === 'Enter' && X.reports.length && !Sim.busy) { e.preventDefault(); read(); }
  if (/^[1-9]$/.test(e.key) && Sim.kind() === 'turn' && !Sim.busy && P.hand[+e.key - 1]) { S.card = P.hand[+e.key - 1]; S.pickAt = null; paint(); }
});
document.addEventListener('input', (e) => { const k = e.target.dataset.viewSet; if (!k) return; Board.view[k] = +e.target.value; e.target.nextElementSibling.textContent = Board.view[k] + e.target.dataset.unit; Board.look(); });
document.addEventListener('change', (e) => { if (!e.target.dataset.viewSet) return; localStorage.setItem(Board.KEY, JSON.stringify(Board.view)); if (['tilt', 'most'].includes(e.target.dataset.viewSet)) Board.land(); });
