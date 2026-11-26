/* The map: a tilted plane of fixed pictures, with everything that stands on it as separate upright elements. */
import { $, ACT, art, at, colonyAt, D, L, lang, me, P, pick, RES, settlementAt, t, tokenAt, W } from '../data.js';
import { DEFS, roundel, SHAPES } from '../icons.js';
import { Bonus } from './bonus.js';
import { stage } from './camera.js';
import { Sprite } from './sprites.js';
import { drawRich, drawSea } from './terrain.js';
import { Places } from '../places.js';
import { S } from '../state.js';
import { Sim } from '../sim.js';
const terrain = document.querySelector('canvas.terrain');
/* ---- the view: tilt, perspective and shift, remembered in the browser ---- */
const VIEW = { tilt: 24, depth: 55, shift: -4, auto: 1, most: 52 }, KEY = 'view', view = { ...VIEW, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
const lens = () => 3600 * (900 / 3600) ** (view.depth / 100), up = () => 1 / Math.cos(((view.auto ? view.most * 0.6 : view.tilt) * Math.PI) / 180);
/** As in strategy games: straight down when zoomed far out, leaning more the closer one gets. The lean grows fast at first and levels off near the ground (ease-out over the logarithm of the zoom). */
const pitch = (z, min, max) => { const u = Math.min(1, Math.max(0, Math.log(z / min) / Math.log(max / min))); return view.most * (1 - (1 - u) ** 2); };
const haze = () => document.body.style.setProperty('--haze', ((B.stage.angle() / 45) ** 1.3 * 0.34).toFixed(2));
/** Farthest zoom: the whole board just fits between the top line and the hand, seen from above. */
const whole = () => Math.min((innerWidth - 24) / 1024, (innerHeight - 220) / 1024);
function look() { B.stage.tilt(view.tilt, lens(), (view.shift / 100) * innerHeight, view.auto ? pitch : null); haze(); }
/* ---- what stands on the map ---- */
let fid = 0;
const face = (x, y, card, r = 15) => { const id = `f${fid++}`; return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r - 2}"/></clipPath><circle cx="${x}" cy="${y}" r="${r}" fill="#f7f1e1"/><image href="${art.agent(card)}" x="${x - r}" y="${y - r + 1}" width="${r * 2}" height="${r * 2.9}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${id})"/>`; };
const SVG = (x, y, s, body) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 64 64">${body}</svg>`;
const pill = (x, y, text) => { const w = text.length * 8.2 + 18; return `<rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="22" rx="11" fill="#f7f1e1"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="15" font-weight="800" fill="#1c2a2a">${text}</text>`; };
function warPlate(c, x, y) {
  const q = D.war?.sieges.find((z) => z.cell === c.cell); if (!q) return null;
  const i = D.war.sieges.indexOf(q), shown = S.war >= 0, done = shown && i <= S.war && q.fell !== undefined, w = 92;
  return `<g transform="translate(${x + 32 - w / 2} ${y + 54})" data-war="${i}" style="cursor:pointer">${i === S.war ? `<rect x="-4" y="-4" width="${w + 8}" height="30" rx="15" fill="#fff08a"/>` : ''}<rect width="${w}" height="22" rx="11" fill="#0f3436f2"/>${roundel(-6, -3, q.owner, 28)}<text x="33" y="16" font-size="15" font-weight="800" fill="#ff8f78">${q.attack.total}</text><text x="52" y="16" font-size="13" fill="#f7f1e1" fill-opacity=".7">/</text><text x="59" y="16" font-size="15" font-weight="800" fill="#f7f1e1">${q.defence.total}</text>${done ? (q.fell ? '<path d="M78 7l8 8m0-8l-8 8" stroke="#ff8f78" stroke-width="3" stroke-linecap="round"/>' : '<path d="M77 11l4 4 7-8" stroke="#8fe09a" stroke-width="3" fill="none" stroke-linecap="round"/>') : ''}</g>`;
}
/** A settlement: how many live there and how alarmed they are. */
function count(v, x, y) {
  const hot = v.hostility >= 4, w = 66, ic = (n, cx) => `<svg x="${cx}" y="2" width="14" height="14" viewBox="0 0 24 24" color="#f7f1e1">${SHAPES[n]}</svg>`, num = (n, cx, c = '#f7f1e1') => `<text x="${cx}" y="14" font-size="14.500" font-weight="800" fill="${c}">${n}</text>`;
  return `<g transform="translate(${x - w / 2} ${y - 1})"><rect width="${w}" height="18" rx="9" fill="#0f3436e6"/>${ic('people', 7)}${num(v.pop, 23)}${ic('anger', 36)}${num(v.hostility, 53, hot ? '#ff8f78' : '#f7f1e1')}</g>`;
}
/** A ship under the pointer: what is in its hold, and the infantry if it is aboard. */
function cargoPlate(i, x, y) {
  const p = D.players[i], l = [...RES.filter((r) => p.hold[r]).map((r) => [r, p.hold[r]]), ...(p.inf === 'ship' ? [['infantry', 1]] : [])];
  const w = l.length ? l.length * 34 + 10 : 66, item = ([k, n], j) => `<svg x="${7 + j * 34}" y="2" width="15" height="15" viewBox="0 0 24 24" color="#f7f1e1">${SHAPES[k]}</svg><text x="${24 + j * 34}" y="15" font-size="14.500" font-weight="800" fill="#f7f1e1">${n}</text>`;
  return `<g transform="translate(${x - w / 2} ${y})"><rect width="${w}" height="19" rx="9.500" fill="#0f3436e6"/>${l.length ? l.map(item).join('') : `<text x="${w / 2}" y="14.500" text-anchor="middle" font-size="13" font-weight="700" fill="#f7f1e1" fill-opacity=".8">${L('empty', 'пусто')}</text>`}</g>`;
}
/** A colony under the pointer: how well it holds. */
function colonyPlate(c, x, y) {
  const mine = c.owner === me, w = 56;
  return `<g transform="translate(${x - w / 2} ${y})"><rect width="${w}" height="20" rx="10" fill="${mine ? D.players[me].color : '#0f3436e6'}" ${mine ? 'stroke="#fff" stroke-width="2"' : ''}/>${roundel(-4, -3, c.owner, 26)}<text x="28" y="15" font-size="14.500" font-weight="800" fill="#f7f1e1">${c.defence}</text><svg x="38" y="4" width="12" height="12" viewBox="0 0 24 24" color="#f7f1e1">${SHAPES.sword}</svg></g>`;
}
function things(sp) {
  const o = [], lift = !!S.card;
  const glow = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="33" ry="13" fill="#fff08a" fill-opacity=".25" stroke="#fff08a" stroke-width="4"/>`, own = (x, y, r = 25) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.36}" fill="none" stroke="#fff" stroke-width="3.400"/>`;
  const put = (id, c, dx, dy, html, z = 0, hit = false) => { if (shown && shown[c] === '0') return; const [x, y] = at(c); o.push({ id, x: x + dx, y: y + dy, z: Math.round(y + dy + z), hit, html: html(x, y) }); };
  // What lies on land that is still being painted waits for it.
  for (const [c, k] of Object.entries(D.poi)) put(`p${c}`, +c, 32, 50, (x, y) => SVG(x + 4, y + 2, 56, k === 'ruin' ? Sprite.ruin() : Sprite.wreck()));
  // Plates with numbers only for the cell under the pointer or the clicked one; at rest a colony shows whose it is.
  const near = (c) => S.hov === c || S.look === c || S.over === `cell:${c}`;
  // A village grows with its people: 5 is a little larger than a cell's picture, 1 about two thirds of it.
  for (const v of D.settlements) if (v.alive) { const k = 0.58 + 0.1 * v.pop, s = sp[`cell:${v.cell}`], on = s?.village || s?.attack, acts = on ? [...new Set(s.options.map((q) => pick(ACT[q.a] || ['', ''])))].join(' / ') : ''; put(`v${v.cell}`, v.cell, 32, 56, (x, y) => (on ? glow(x + 32, y + 50) : '') + SVG(x + 32 - 32 * k, y + 53 - 57 * k, 64 * k, Sprite.village(v)) + (v.ally !== null ? roundel(x + 32 + 12 * k, y + 53 - 55 * k, v.ally, 22) : '') + (on ? pill(x + 32, y + 64, acts) : '')); if (!on && near(v.cell)) put(`h${v.cell}`, v.cell, 32, 56, (x, y) => count(v, x + 32, y + 57), 3000); }
  for (const c of D.colonies) { const s = sp[`cell:${c.cell}`]; put(`c${c.cell}`, c.cell, 32, 56, (x, y) => (s?.attack ? glow(x + 32, y + 50) : '') + SVG(x - 2, y - 6, 68, Sprite.colony(c)) + (warPlate(c, x, y) ?? roundel(x + 20, y + 52, c.owner, 24)) + (s?.attack ? pill(x + 32, y - 12, pick(ACT.attack)) : ''), 0, !!D.war); if (near(c.cell) && !warPlate(c, 0, 0)) put(`h${c.cell}`, c.cell, 32, 56, (x, y) => colonyPlate(c, x + 32, y + 57), 3000); }
  D.players.forEach((p, i) => {
    const mine = i === me;
    if (typeof p.ship === 'number') { const s = sp[`cell:${p.ship}`], hit = s?.attack && !mine; put(`s${i}`, p.ship, 32, 54, (x, y) => (hit ? glow(x + 32, y + 52) : mine ? own(x + 32, y + 54, 30) : '') + SVG(x, y - 3, 64, Sprite.ship(i)) + (p.damage ? `<text x="${x + 10}" y="${y + 14}" font-size="17" font-weight="800" fill="#ff6a52" stroke="#1c2a2a" stroke-width="3" paint-order="stroke">−${p.damage}</text>` : '') + (hit ? pill(x + 32, y + 66, pick(ACT.attack)) : '')); if (near(p.ship) && !hit) put(`hs${i}`, p.ship, 32, 54, (x, y) => cargoPlate(i, x + 32, y + 58), 3000); }
    if (typeof p.inf === 'number') { const c = colonyAt(p.inf), s = sp[`cell:${p.inf}`], hit = s?.attack && !mine && !c; put(`i${i}`, p.inf, c ? 6 : 32, 58, (x, y) => (hit ? glow(x + 32, y + 54) : mine ? own(x + (c ? 6 : 32), y + (c ? 52 : 57), c ? 16 : 19) : '') + SVG(x + (c ? -22 : 0), y + (c ? 2 : 0), c ? 56 : 64, Sprite.infantry(i)) + (hit ? pill(x + 32, y + 68, pick(ACT.attack)) : ''), 2); }
  });
  if (lift) for (const [id, s] of Object.entries(sp)) {
    const c = +id.slice(5);
    if (s.gather) { const best = s.gather, dy = tokenAt(c) || colonyAt(c) ? 14 : 34, w = best.length * 33; put(`g${c}`, c, 32, dy, (x, y) => `<rect x="${x + 32 - w / 2}" y="${y + dy - 13}" width="${w}" height="27" rx="13.500" fill="${S.over === id ? '#fff08a' : '#f7f1e1'}"/>${best.map((b, i) => `<svg x="${x + 36 - w / 2 + i * 33}" y="${y + dy - 9}" width="17" height="17" viewBox="0 0 24 24">${SHAPES[Places.ico(b.icon)]}</svg><text x="${x + 55 - w / 2 + i * 33}" y="${y + dy + 6}" font-size="16" font-weight="800" fill="#1c2a2a">${b.n}</text>`).join('')}`, 2000); }
    else if (s.found) put(`g${c}`, c, 32, 14, (x, y) => pill(x + 32, y + 6, L('Found a colony', 'Основать колонию')), 2000);
  }
  // Agents stay where they were placed until the round ends.
  const home = Places.homes()[0]?.cell; fid = 0;
  if (home !== undefined) Sim.placed.filter((p) => p.space?.startsWith('lot:') || p.space?.startsWith('build:') || p.space === `cell:${home}`).forEach((p, i) => put(`a${p.card}`, home, 60 + i * 27, 18, (x, y) => face(x + 60 + i * 27, y + 4, p.card, 14), 1000));
  for (const p of Sim.placed) if (p.space?.startsWith('cell:') && p.space !== `cell:${home}`) put(`a${p.card}`, +p.space.slice(5), 50, 60, (x, y) => face(x + 50, y + 50, p.card, 14), 1000);
  return o;
}
$('defs').innerHTML = DEFS;
const layer = document.querySelector('.sprites'), paths = document.querySelector('svg.paths'), sprites = new Map();
/** Keeps the elements in step with the game. Only what changed is drawn again. */
function draw() {
  const now = new Set();
  for (const q of things(Places.spaces(S.card))) {
    now.add(q.id);
    let e = sprites.get(q.id);
    if (!e) { e = { el: document.createElement('div') }; e.el.className = 'sp'; layer.append(e.el); sprites.set(q.id, e); }
    if (e.html !== q.html || e.x !== q.x || e.y !== q.y) e.el.innerHTML = `<svg viewBox="${q.x - 50} ${q.y - 66} 100 100" width="200" height="200">${q.html}</svg>`;
    if (e.z !== q.z) e.el.style.zIndex = q.z;
    if (e.hit !== q.hit) e.el.style.pointerEvents = q.hit ? 'auto' : 'none';
    Object.assign(e, q);
  }
  for (const [id, e] of sprites) if (!now.has(id)) { e.el.remove(); sprites.delete(id); }
  place();
}
function place() {
  if (!B.stage) return;
  haze();
  for (const e of sprites.values()) { const [x, y, s] = B.stage.point(e.x, e.y); e.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(s / 2).toFixed(4)})`; }
  reach(); bubble();
}
/* Where the ship (white, on water) and the infantry (warm, on land) can go, and the closed land to explore. */
function reach() {
  const mv = D.pending?.kind === 'move' && !Sim.busy ? B.moving() : null;
  if (!S.card && !mv) { if (paths.innerHTML) paths.innerHTML = ''; return; }
  const sp = S.card ? Places.spaces(S.card) : {}, pt = (x, y) => B.stage.point(x, y).slice(0, 2).map((v) => v.toFixed(1)).join(' '), quad = (c, q = 0) => { const [x, y] = at(c); return `M${pt(x + q, y + q)}L${pt(x + 64 - q, y + q)}L${pt(x + 64 - q, y + 64 - q)}L${pt(x + q, y + 64 - q)}Z`; };
  const sea = new Set(), foot = new Set(), closed = new Set();
  if (mv) { for (const [c, n] of mv.ways) (n.foot ? foot : sea).add(c); for (const f of mv.frags) D.frag.forEach((x, c) => { if (x === f) closed.add(c); }); }
  else for (const [id, s] of Object.entries(sp)) if (id.startsWith('cell:')) { if (s.foot) foot.add(+id.slice(5)); else if (s.sea) sea.add(+id.slice(5)); }
  const area = (set, cls) => { if (!set.size) return ''; let d = ''; const line = (a, b, c, e) => `M${pt(a, b)}L${pt(c, e)}`; for (const c of set) { const [x, y] = at(c); if (!set.has(c - W)) d += line(x, y, x + 64, y); if (!set.has(c + W)) d += line(x, y + 64, x + 64, y + 64); if (!set.has(c - 1)) d += line(x, y, x, y + 64); if (!set.has(c + 1)) d += line(x + 64, y, x + 64, y + 64); } return `<path class="${cls} area" d="${[...set].map((c) => quad(c)).join('')}"/><path class="${cls} rim" d="${d}"/>`; };
  const h = S.over?.startsWith('cell:') ? +S.over.slice(5) : null, o = h === null ? null : mv ? (mv.ways.get(h) ? [{ path: mv.ways.get(h).path }] : closed.has(h) ? [{}] : null) : sp[S.over]?.options, go = o?.find((q) => q.path?.length), from = mv ? (D.move.token === 'ship' ? P.ship : typeof P.inf === 'number' ? P.inf : P.ship) : go?.a === 'moveInfantry' ? P.inf : P.ship;
  const sites = mv ? [...mv.ways].filter(([c, n]) => n.foot && !Engine.map.colonyProblem(Sim.s, c)).map(([c]) => c) : Object.entries(sp).filter(([id, s]) => id.startsWith('cell:') && s.site).map(([id]) => +id.slice(5)), flag = (c) => { const [x, y] = at(c), [a, b2] = B.stage.point(x + 50, y + 16); return `<g transform="translate(${a.toFixed(1)} ${b2.toFixed(1)})"><path d="M0 12V-9" stroke="#3a2614" stroke-width="2"/><path d="M1-9h11l-3 4 3 4H1Z" fill="#fff08a" stroke="#3a2614" stroke-width="1.200"/></g>`; };
  paths.innerHTML = area(sea, 'sea') + area(foot, 'foot') + area(closed, 'closed') + (o?.length ? `<path d="${quad(h, 3)}" fill="#fff08a" fill-opacity=".4" stroke="#fff" stroke-width="3.500" stroke-linejoin="round"/>` : '') + sites.map(flag).join('') + (go ? `<polyline points="${[from, ...go.path].map((c) => { const [x, y] = at(c); return pt(x + 32, y + 32); }).join(',')}" class="way"/>` : '');
}
/* Bonus resources lie on the ground: painted once into their own layer of the map. */
let grounded = '';
function ground() {
  const key = D.open.map((x, c) => (x && D.bonus[c] ? `${c}${colonyAt(c) || settlementAt(c) ? 'x' : ''}` : '')).join(''); if (grounded === key) return; grounded = key;
  const img = new Image(), c = document.querySelector('canvas.ground');
  img.onload = () => { c.width = c.height = 2048; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(img.src); };
  img.src = URL.createObjectURL(new Blob([Bonus.picture(D, at)], { type: 'image/svg+xml' }));
}
/* The outer ring of cells is Europe: fine hatching that fades into the open sea, with a thin line on the inner side. Painted once. */
let edged = '';
async function edge() {
  const key = `${lang()} ${B.grid}`; if (edged === key) return; edged = key;
  await document.fonts.load('700 24px "Alegreya SC"', t('europe'));
  const c = document.querySelector('canvas.edge'), k = 2; c.width = c.height = 1024 * k;
  const g = c.getContext('2d'), h = document.createElement('canvas'), q = h.getContext('2d'); g.scale(k, k); h.width = 8; h.height = 13 * k;
  q.fillStyle = '#f6e2ae'; q.fillRect(0, 5.8 * k, 8, 1.35 * k);
  const p = g.createPattern(h, 'repeat'); p.setTransform(new DOMMatrix().rotate(38).scale(1 / k));
  const ring = (a, r, w, style, alpha) => { g.globalAlpha = alpha; g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.roundRect(a, a, 1024 - a * 2, 1024 - a * 2, r); g.stroke(); };
  if (B.grid) { g.globalAlpha = 0.2; g.strokeStyle = '#fff'; g.beginPath(); for (let i = 64; i < 1024; i += 64) { g.moveTo(i, 0); g.lineTo(i, 1024); g.moveTo(0, i); g.lineTo(1024, i); } g.stroke(); }
  for (let i = 0; i < 30; i++) { const a = 62 - i * 2, m = (1 - i / 30) ** 0.9; ring(a, 29 + i, 2.1, p, 0.46 * m); ring(a, 29 + i, 2.1, '#bfe3ea', 0.06 * m); }
  ring(64, 28, 1.7, '#f6dfa4', 0.72);
  g.globalAlpha = 0.72; g.font = '700 24px "Alegreya SC"'; g.letterSpacing = '6px'; g.textAlign = 'center'; g.fillStyle = '#fbeecb'; g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = '#124468';
  const word = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.strokeText(t('europe'), 0, 0); g.fillText(t('europe'), 0, 0); g.restore(); };
  word(512, 1003, 0); word(40, 512, -Math.PI / 2); word(984, 512, Math.PI / 2);
}
function bubble() { if ($('look').hidden) return; const [x, y] = B.stage.point(((S.look % W) + 0.5) * 64, (Math.floor(S.look / W) + 0.1) * 64); $('look').style.left = `${Math.min(innerWidth - 130, Math.max(130, x))}px`; $('look').style.top = `${Math.max(200, y)}px`; }
drawSea(document.querySelector('canvas.sea'), 4608, 2 / 3).then((c) => { document.querySelector('.map-stage').style.background = c; });
/* A quick sketch of the land at once, then the sharp one in the background, a few milliseconds at a time. */
const SHARP = devicePixelRatio > 1 ? 2.2 : 1.6, plan = (k, rest) => ({ K: k, tall: up(), rest, seen: D.open.map((x) => (x ? 1 : 0)).join('') });
let clock = 0, drawing = Promise.resolve(), drawn = '', shown = null;
const rest = async () => { if (performance.now() - clock > 8) { await new Promise((r) => setTimeout(r)); clock = performance.now(); } };
async function land(sketch = false) {
  const now = plan(SHARP, rest); if (drawn === now.seen + now.tall && !sketch) return;
  const was = drawn, fresh = was && was.slice(-String(now.tall).length) === String(now.tall) && shown ? [...now.seen].map((v, c) => (v === '1' && shown[c] === '0' ? c : -1)).filter((c) => c >= 0) : [];
  drawn = now.seen + now.tall;
  // Something just explored: paint only that part, at once, and the rest quietly afterwards.
  if (fresh.length && !sketch) {
    const xs = fresh.map((c) => c % W), ys = fresh.map((c) => Math.floor(c / W));
    await drawRich(terrain, { ...plan(SHARP), box: [Math.min(...xs) * 64, Math.min(...ys) * 64, (Math.max(...xs) + 1) * 64, (Math.max(...ys) + 1) * 64] });
    shown = now.seen; draw(); if (S.view === 'colony') Places.paint();
    return;
  }
  await drawing;
  if (drawn !== now.seen + now.tall) return; // something newer is waiting
  if (sketch) { await drawRich(terrain, plan(0.75)); shown = now.seen; draw(); }
  if (S.view === 'colony') Places.paint();
  drawing = drawRich(terrain, now); await drawing; shown = now.seen; draw();
  if (S.view === 'colony') Places.paint();
}
const B = {
  ground, view, VIEW, KEY, look, draw, edge, land, bubble, terrain, stage: null, grid: false,
  /** Where the token on the move can still go, and what it could uncover. */
  moving() { if (B.mv?.move === D.move && B.mv?.n === Sim.s.log.length) return B.mv; const l = Sim.legal(); B.mv = { move: D.move, n: Sim.s.log.length, ways: Places.ways(D.move.token, D.move.points), frags: l.filter((c) => c.c === 'explore').map((c) => c.frag), legal: l }; return B.mv; },
  fit() { const a = view.auto ? 0 : view.tilt; B.stage.frame(0, 0, 1024, 1024, [70 - a, 0, 150 - a * 3, 0]); },
  /** The whole inner map between the top line and the hand. */
  home() { const z = Math.min(innerWidth / 900, (innerHeight - 200) / 715); B.stage.frame(512 - innerWidth / 2 / z, 512 - innerHeight / 2 / z, 512 + innerWidth / 2 / z, 512 + innerHeight / 2 / z); const [x, , k] = B.stage.get(); B.stage.set([x, innerHeight / 2 - 520 * k - 4, k]); },
  open(onCell) { B.stage = stage(document.querySelector('.map-stage'), { onMove: place, onCell, min: whole, max: 2.8, zoom: 1, center: 0 }); look(); B.home(); addEventListener('resize', look); },
};
export { B as Board };
