const $ = (i) => document.getElementById(i), { D, P, W, t, pick, icon, art, me, at } = Core, K = Kit, S = K.S, L = K.L, { Sprite } = Rich;
/* ---- the view of the map: tilt, perspective and shift, remembered per page ---- */
const KEY = `view:${document.title}`, view = { ...VIEW, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
const lens = () => 3600 * (900 / 3600) ** (view.depth / 100);
const up = () => 1 / Math.cos((view.tilt * Math.PI) / 180);
function look() {
  document.body.style.setProperty('--haze', ((view.tilt / 45) ** 1.3 * 0.34).toFixed(2));
  K.stage.tilt(view.tilt, lens(), (view.shift / 100) * innerHeight);
}
let king = false, sheet = false, menu = false, grid = false, last = { wh: [], hold: [] };
const terrain = document.querySelector('canvas.terrain');
let fid = 0;
const face = (x, y, card, r = 15) => { const id = `f${fid++}`; return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r - 2}"/></clipPath><circle cx="${x}" cy="${y}" r="${r}" fill="#edb443"/><image href="${art.agent(card)}" x="${x - r}" y="${y - r + 1}" width="${r * 2}" height="${r * 2.9}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${id})"/>`; };
/* ---- what stands on the map: one element each, always upright, moved and scaled but never drawn again ---- */
const SVG = (x, y, s, body) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 64 64">${body}</svg>`;
function things(sp) {
  const o = [], lift = !!S.card, war = S.war >= 0, col = (h) => (h >= 4 ? '#ee5a42' : h === 3 ? '#edb443' : '#7ccf86');
  const plate = (x, y, w, inner) => `<g transform="translate(${x - w / 2} ${y})"><rect width="${w}" height="17" rx="8.500" fill="#0f3436e6"/>${inner}</g>`, glow = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="32" ry="13" fill="none" stroke="#ffe08a" stroke-width="4.500"/>`;
  const put = (id, c, dx, dy, html, z = 0, hit = false) => { const [x, y] = at(c); o.push({ id, x: x + dx, y: y + dy, z: y + dy + z, hit, html: html(x, y) }); };
  if (!lift) D.bonus.forEach((b, c) => { if (b) put(`b${c}`, c, 52, 52, (x, y) => `<g opacity=".92"><circle cx="${x + 52}" cy="${y + 52}" r="9.500" fill="#f7f1e1"/><svg x="${x + 45}" y="${y + 45}" width="14" height="14" viewBox="0 0 24 24">${Core.SHAPES[K.ico(b)]}</svg></g>`, -30); });
  for (const [c, k] of Object.entries(D.poi)) put(`p${c}`, +c, 32, 50, (x, y) => SVG(x + 4, y + 2, 56, k === 'ruin' ? Sprite.ruin() : Sprite.wreck()));
  for (const v of D.settlements) if (v.alive) { const s = sp[`cell:${v.cell}`]; put(`v${v.cell}`, v.cell, 32, 56, (x, y) => (s?.village ? glow(x + 32, y + 50) : '') + SVG(x, y - 4, 64, Sprite.village(v)) + (s?.village ? K.pill(x + 32, y + 64, s.options.map((q) => pick(Core.ACT[q.a])).join(' / ')) : plate(x + 32, y + 57, 58, [0, 1, 2, 3, 4].map((i) => `<circle cx="${9 + i * 10}" cy="8.500" r="3.400" fill="${i < v.hostility ? col(v.hostility) : '#ffffff30'}"/>`).join('')))); }
  for (const c of D.colonies) { const w = war ? K.war.plate(c, S.war) : null; put(`c${c.cell}`, c.cell, 32, 56, (x, y) => (lift && c.owner === me && sp[`cell:${c.cell}`]?.town ? glow(x + 32, y + 50) : '') + SVG(x - 2, y - 6, 68, Sprite.colony(c)) + (w ?? plate(x + 32, y + 57, 54, `${Core.roundel(-4, -4, c.owner, 25)}<text x="28" y="13" font-size="14" font-weight="800" fill="#f7f1e1">${c.defence}</text><svg x="37" y="3" width="11" height="11" viewBox="0 0 24 24" color="#f7f1e1">${Core.SHAPES.sword}</svg>`)), 0, war); }
  D.players.forEach((p, i) => {
    if (typeof p.ship === 'number') put(`s${i}`, p.ship, 32, 54, (x, y) => SVG(x, y - 3, 64, Sprite.ship(i)));
    if (typeof p.inf === 'number') { const c = Core.colonyAt(p.inf); put(`i${i}`, p.inf, c ? 6 : 32, 58, (x, y) => SVG(x + (c ? -22 : 0), y + (c ? 2 : 0), c ? 56 : 64, Sprite.infantry(i)), 2); }
  });
  if (lift) for (const [id, s] of Object.entries(sp)) if (s.gather) { const c = +id.slice(5), best = [...s.gather].sort((a, b) => b.n - a.n), dy = Core.tokenAt(c) || Core.colonyAt(c) ? 14 : 34, w = best.length * 33; put(`g${c}`, c, 32, dy, (x, y) => `<rect x="${x + 32 - w / 2}" y="${y + dy - 13}" width="${w}" height="27" rx="13.500" fill="${S.over === id ? '#ffe08a' : '#f7f1e1'}"/>${best.map((b, i) => `<svg x="${x + 36 - w / 2 + i * 33}" y="${y + dy - 9}" width="17" height="17" viewBox="0 0 24 24">${Core.SHAPES[K.ico(b.icon)]}</svg><text x="${x + 55 - w / 2 + i * 33}" y="${y + dy + 6}" font-size="16" font-weight="800" fill="#1c2a2a">${b.n}</text>`).join('')}`, 2000); }
  // Agents stay where they were placed until the round ends.
  const home = K.home().cell; fid = 0;
  K.placed.filter((p) => p.space?.startsWith('lot:') || p.space === `cell:${home}`).forEach((p, i) => put(`a${p.card}`, home, 60 + i * 27, 18, (x, y) => face(x + 60 + i * 27, y + 4, p.card, 14), 1000));
  for (const p of K.placed) if (p.space?.startsWith('cell:') && p.space !== `cell:${home}`) put(`a${p.card}`, +p.space.slice(5), 45, 56, (x, y) => face(x + 45, y + 45, p.card), 1000);
  return o;
}
$('defs').innerHTML = Core.DEFS;
const layer = document.querySelector('.sprites'), over = document.querySelector('svg.paths'), sprites = new Map();
/** Keeps the elements in step with the game. Only what changed is drawn again. */
function drawMarks() {
  const now = new Set();
  for (const q of things(K.spaces(S.card))) {
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
  if (!K.stage) return;
  for (const e of sprites.values()) { const [x, y, s] = K.stage.point(e.x, e.y); e.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(s / 2).toFixed(4)})`; }
  reach(); bubble();
}
/** Where the ship and infantry can go, the cell under the agent, and the way there. */
function reach() {
  if (!S.card) { if (over.innerHTML) over.innerHTML = ''; return; }
  const sp = K.spaces(S.card), r = new Set(), pt = (x, y) => K.stage.point(x, y).slice(0, 2).map((v) => v.toFixed(1)).join(' '), quad = (c, q = 0) => { const [x, y] = at(c); return `M${pt(x + q, y + q)}L${pt(x + 64 - q, y + q)}L${pt(x + 64 - q, y + 64 - q)}L${pt(x + q, y + 64 - q)}Z`; };
  for (const [id, s] of Object.entries(sp)) if (id.startsWith('cell:') && s.options?.some((q) => q.a === 'moveShip' || q.a === 'moveInfantry')) r.add(+id.slice(5));
  let d = ''; const inn = (c) => r.has(c) || c === P.ship, line = (a, b, c, e) => `M${pt(a, b)}L${pt(c, e)}`;
  for (const c of r) { const [x, y] = at(c); if (!inn(c - W)) d += line(x, y, x + 64, y); if (!inn(c + W)) d += line(x, y + 64, x + 64, y + 64); if (!inn(c - 1)) d += line(x, y, x, y + 64); if (!inn(c + 1)) d += line(x + 64, y, x + 64, y + 64); }
  const h = S.over?.startsWith('cell:') ? +S.over.slice(5) : null, o = h !== null ? sp[S.over]?.options : null, mv = o?.find((q) => q.a === 'moveShip' || q.a === 'moveInfantry');
  over.innerHTML = `<path d="${[...r].map((c) => quad(c)).join('')}" fill="#fff" fill-opacity=".1"/><path d="${d}" class="rim"/>${o?.length ? `<path d="${quad(h, 3)}" fill="#ffe08a" fill-opacity=".35" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>` : ''}${mv ? `<polyline points="${K.route(mv.a, h).map((c) => { const [x, y] = at(c); return pt(x + 32, y + 32); }).join(',')}" class="way"/>` : ''}`;
}
const heap = (x, cap, key) => { const l = Core.RES.flatMap((r) => Array(x[r]).fill(r)), seen = {}, b = last[key]; const h = Array.from({ length: cap }, (_, i) => { const r = l[i]; if (!r) return '<i></i>'; seen[r] = (seen[r] || 0) + 1; return `<span class="${b.length && seen[r] > b.filter((q) => q === r).length ? 'new' : ''}">${icon(r, 27)}</span>`; }).join(''); return [`<div class="heap">${h}</div>`, l]; };
const HULL = '<svg viewBox="0 0 138 50" preserveAspectRatio="none"><path d="M2 20q12 6 22 6h92q12 0 20-8l-13 25q-3 5-10 5H26q-8 0-12-7Z" fill="#6d4325"/><path d="M2 20q12 6 22 6h92q12 0 20-8l-3 6q-8 7-18 7H24q-12 0-20-6Z" fill="#a06d3c"/><path d="M16 38h104" stroke="#4b2d17" stroke-width="1.500"/></svg>';
function paint() {
  const sp = K.spaces(S.card), A = K.army(), f = Math.PI * 2 * (D.round / 10);
  $('date').innerHTML = `<svg class="dial" viewBox="0 0 46 46"><circle cx="23" cy="23" r="18" fill="none" stroke="#ffffff38" stroke-width="7"/><path d="M23 5A18 18 0 ${D.round > 5 ? 1 : 0} 1 ${23 + 18 * Math.sin(f)} ${23 - 18 * Math.cos(f)}" fill="none" stroke="#edb443" stroke-width="7"/><text x="23" y="29" text-anchor="middle" font-size="17" font-weight="800" fill="#f7f1e1">${D.round}</text></svg><div><b>${D.year}</b><small>${t('tax')} ${D.tax} ${icon('gold', 15)}</small></div>`;
  $('purse').innerHTML = ['gold', 'bells', 'crosses'].map((k) => `<span title="${t(k)}">${icon(k, 26)}${P[k]}</span>`).join('') + `<button class="king" data-king title="${t('ref')}">${icon('ref', 26)}${A.ref}</button>`;
  $('court').innerHTML = D.players.map((p, i) => `<button class="${i === me ? 'me' : ''}" data-sheet title="${Panels.name(i)}">${K.em(i, 38)}${p.score}</button>`).join('') + `<button class="gear" data-menu title="${L('Options', 'Настройки')}" aria-label="${L('Options', 'Настройки')}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"><path d="M4 7h9m5 0h2M4 17h2m5 0h9"/><circle cx="15.500" cy="7" r="2.500"/><circle cx="8.500" cy="17" r="2.500"/></svg></button>`;
  const mine = D.colonies.filter((c) => c.owner === me);
  $('king').hidden = !king || S.war >= 0 || !!S.card; $('king').innerHTML = `<h3>${t('ref')}</h3><dl><dt>${L('In the barracks', 'В казармах')}</dt><dd>${D.ref}</dd><dt>${L('Hostile settlements', 'Враждебные поселения')}</dt><dd>+${A.hostile}</dd><dt class="sum">${L('If the war came now', 'Если бы война началась сейчас')}</dt><dd class="sum">${A.pool}</dd><dt>${L('Patriot colonies', 'Колоний патриотов')}</dt><dd>${A.targets}</dd><dt>${L('Redcoats on each', 'Красных на каждую')}</dt><dd>${Math.floor(A.pool / A.targets)}–${Math.ceil(A.pool / A.targets)}</dd>${A.loyal === me ? '' : mine.map((c) => `<dt>${L('Your colony: attack against defence', 'Ваша колония: атака и защита')}</dt><dd>${(A.per[c.cell] || 0) * 2} / ${c.defence}</dd>`).join('')}</dl><p>${t('loyalist')}: <b>${Panels.name(A.loyal)}</b>${A.loyal === me ? ` (${t('you')})` : ''}</p><button data-war="0">${L('Show a war', 'Показать войну')}</button>`;
  $('menu').hidden = !menu; $('menu').innerHTML = `<h3>${L('Options', 'Настройки')}</h3><div class="row">${L('Language', 'Язык')}<span class="set">${[['en', 'English'], ['ru', 'Русский']].map(([k, n]) => `<button class="${Core.lang() === k ? 'on' : ''}" ${Core.lang() === k ? '' : 'data-lang'}>${n}</button>`).join('')}</span></div><div class="row">${L('Map zoom', 'Масштаб')}<span class="set"><button data-zoom=".8" aria-label="${L('Zoom out', 'Отдалить')}">−</button><button data-zoom="1.25" aria-label="${L('Zoom in', 'Приблизить')}">+</button></span></div><div class="row">${L('Whole map', 'Вся карта')}<span class="set"><button data-fit>${L('Show', 'Показать')}</button></span></div><div class="row">${L('Cell grid', 'Сетка')}<span class="set">${[[false, L('Off', 'Нет')], [true, L('On', 'Да')]].map(([k, n]) => `<button class="${grid === k ? 'on' : ''}" data-grid="${k ? 1 : ''}">${n}</button>`).join('')}</span></div><h4>${L('Map view', 'Вид карты')}</h4>${[['tilt', L('Tilt', 'Наклон'), 0, 45, '°'], ['depth', L('Perspective', 'Перспектива'), 0, 100, '%'], ['shift', L('Shift', 'Сдвиг'), -25, 25, '%']].map(([k, n, lo, hi, u]) => `<label class="row">${n}<input type="range" data-view-set="${k}" data-unit="${u}" min="${lo}" max="${hi}" value="${view[k]}"><output>${view[k]}${u}</output></label>`).join('')}<div class="row"><span></span><span class="set"><button data-reset>${L('Reset view', 'Сбросить вид')}</button></span></div>`;
  edge();
  $('dw').textContent = t('colony'); $('dw').style.backgroundImage = `url(${art.nation(P.nation)})`; $('de').innerHTML = `${t('europe')}<span class="who">${['eu:market', 'eu:pier', 'eu:salon', 'eu:yard'].map(K.tokens).join('')}</span>`;
  const [wh, whl] = heap(P.wh, D.cap, 'wh'), [ho, hol] = heap(P.hold, 4, 'hold'); last = { wh: whl, hold: hol };
  $('heaps').innerHTML = `<div class="hull" title="${t('hold')}">${ho}${HULL}</div><div title="${t('warehouse')}">${wh}</div>`;
  $('side').innerHTML = `<div class="pier" title="${t('pier')}">${D.pier.map(([x, n]) => `<button data-go="europe" class="${D.agents[x].price > P.gold ? 'dear' : ''}" title="${pick(D.agents[x])}"><img src="${art.agent(x)}" alt="${pick(D.agents[x])}"><span>${icon('gold', 14)}${D.agents[x].price}</span>${n > 1 ? `<em>×${n}</em>` : ''}</button>`).join('')}</div><div class="prices" title="${t('market')}">${Core.RES.map((r) => `<span>${icon(r, 24)}${D.price[r]}</span>`).join('')}</div>`;
  const acts = `<div class="acts"><button class="undo" data-undo ${Rich.history.length ? '' : 'hidden'}>${t('undo')}</button>${P.hand.length ? `<button class="pass" data-pass>${t('pass')}</button>` : ''}</div>`;
  $('hand').style.setProperty('--n', P.hand.length); $('hand').innerHTML = P.hand.length ? P.hand.map((c) => `<button class="card${S.card === c ? ' sel' : ''}${S.drag === c ? ' drag' : ''}${S.card && sp[`who:${c}`] ? ' swap' : ''}" data-agent="${c}" data-space="who:${c}"><img src="${art.agent(c)}" alt=""><span class="b"><span class="nm">${pick(D.agents[c])}</span><span class="tr">${Core.eduIcon(D.agents[c].edu)} ${Core.traits(c).join(' ')}</span></span><span class="tip">${L('Exchange', 'Обмен')}</span></button>`).join('') : `<span class="over1">${L('Your round is over', 'Ваш тур окончен')}</span>`; $('hand').innerHTML += acts;
  // The doors.
  const med = (id, img, name) => { const s = sp[id], ok = s?.options?.length; return `<div class="med" data-space="${id}"><span class="r">${img ? `<img src="${img}" alt="">` : '<span class="plus">+</span>'}<span class="tk">${K.tokens(id)}</span></span><span class="l"><b>${name}</b>${K.label(s)}</span></div>`; };
  const lots = [5, 4, 3, 2, 1, 0].filter((i) => P.buildings[i] || i === P.buildings.length), one = (i) => med(`lot:${i}`, P.buildings[i] ? art.building(P.buildings[i]) : null, P.buildings[i] ? pick(D.buildings[P.buildings[i]]) : t('slot')), can = (i) => sp[`lot:${i}`]?.options?.length;
  $('fw').innerHTML = S.card ? `<div class="shut">${lots.filter((i) => !can(i)).map(one).join('')}</div>${lots.filter(can).map(one).join('')}` : '';
  $('fe').innerHTML = S.card ? (K.inEurope() ? (() => { const all = [['eu:yard', art.building('shipyard'), L('Shipyard', 'Верфь')], ['eu:salon', art.father(D.salon[0]), t('salon')], ['eu:pier', art.agent(D.pier[0][0]), t('pier')], ['eu:market', 'art/crate.webp', t('market')]], can = ([id]) => sp[id]?.options?.length; return `<div class="shut">${all.filter((x) => !can(x)).map((x) => med(...x)).join('')}</div>${all.filter(can).map((x) => med(...x)).join('')}`; })() : `<span class="awl">${sp['eu:market']?.why || ''}</span>`) : '';
  // A place on the map.
  const lk = $('look'), v = S.look !== null && !S.card && S.war < 0 && S.view === 'map' ? Core.settlementAt(S.look) : null, c = S.look !== null && !S.card && S.war < 0 && S.view === 'map' ? Core.colonyAt(S.look) : null, tok = S.look !== null && !S.card && !v && !c && S.war < 0 && S.view === 'map' ? Core.tokenAt(S.look) : null;
  lk.hidden = !v && !c && !tok;
  if (v) lk.innerHTML = `<h3>${pick(D.names.tribes[v.tribe])}</h3><dl><dt>${t('population')}</dt><dd>${v.pop}</dd><dt>${t('hostility')}</dt><dd>${v.hostility}</dd><dt>${t('loot')}</dt><dd>${v.loot.gold ? v.loot.gold + icon('gold', 17) : v.loot.amount + icon(v.loot.res, 17)}</dd></dl><p>${v.hostility >= 4 ? t('raid') : v.hostility === 3 ? t('calm') : t('gift')}</p>`;
  else if (c) lk.innerHTML = `<h3>${Panels.name(c.owner)}</h3><dl><dt>${t('defence')}</dt><dd>${c.defence}</dd><dt>${L('Redcoats, if war now', 'Красных, если война')}</dt><dd>${A.per[c.cell] ?? 0}</dd></dl>`;
  else if (tok) lk.innerHTML = `<h3>${Panels.name(tok.p)}</h3><p>${t(tok.kind)}${tok.kind === 'ship' ? ` ${Core.RES.flatMap((r) => Array(D.players[tok.p].hold[r]).fill(icon(r, 19))).join('')}` : ''}</p>`;
  bubble();
  scenes(sp);
  $('sheet').className = `sheet${sheet ? ' on' : ''}`; $('sheet').innerHTML = `<button class="x" data-sheet>${t('close')}</button><h2>${t('rivals')}</h2>${Panels.rivals()}<h2 style="margin-top:20px">${t('log')}</h2><ul class="log">${Rich.notes.map((n) => `<li><b>${t('you')}</b> ${n}</li>`).join('')}${Panels.log()}</ul>`;
  $('war').innerHTML = S.war >= 0 ? `<p>${K.war.head()}</p>${K.war.ledger(S.war)}${K.war.nav(S.war)}` : '';
}
/* The outer ring of cells is Europe: hatched water between a drawn border and the open sea. Painted once. */
let edged = '';
async function edge() {
  const key = `${Core.lang()} ${grid}`; if (edged === key) return; edged = key;
  await document.fonts.load('800 27px "Alegreya SC"', t('europe'));
  const c = document.querySelector('canvas.edge'), k = 2; c.width = c.height = 1024 * k;
  const g = c.getContext('2d'), h = document.createElement('canvas'), q = h.getContext('2d'); h.width = 8; h.height = 12 * k;
  q.fillStyle = '#f6dc9b'; q.fillRect(0, 5 * k, 8, 1.7 * k);
  const p = g.createPattern(h, 'repeat'); p.setTransform(new DOMMatrix().rotate(38).scale(1 / k)); g.scale(k, k);
  const ring = (a, r, w, style, alpha) => { g.globalAlpha = alpha; g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.roundRect(a, a, 1024 - a * 2, 1024 - a * 2, r); g.stroke(); };
  if (grid) { g.globalAlpha = 0.2; g.strokeStyle = '#fff'; g.beginPath(); for (let i = 64; i < 1024; i += 64) { g.moveTo(i, 0); g.lineTo(i, 1024); g.moveTo(0, i); g.lineTo(1024, i); } g.stroke(); }
  for (let i = 0; i < 9; i++) ring(60 - i * 7, 30 + i * 5, 7.4, p, 0.6 * (1 - i / 9) ** 0.8);
  ring(64, 27, 2.6, '#f3d084', 0.9); ring(69.5, 23, 1.2, '#f3d084', 0.42);
  g.globalAlpha = 1; g.font = '800 27px "Alegreya SC"'; g.letterSpacing = '5px'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = '#124468'; g.fillStyle = '#fbe9ba';
  const word = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.strokeText(t('europe'), 0, 0); g.fillText(t('europe'), 0, 0); g.restore(); };
  for (const v of [300, 724]) { word(v, 42, 0); word(v, 1001, 0); }
  for (const v of [420, 905]) { word(41, v, -Math.PI / 2); word(983, v, Math.PI / 2); }
}
function bubble() { if ($('look').hidden) return; const [x, y] = K.stage.point(((S.look % W) + 0.5) * 64, (Math.floor(S.look / W) + 0.1) * 64); $('look').style.left = `${Math.min(innerWidth - 130, Math.max(130, x))}px`; $('look').style.top = `${Math.max(200, y)}px`; }
function scenes(sp) {
  const back = `<button class="back" data-close>${t('map')}</button>`;
  if (S.view === 'colony') {
    const home = K.home(), work = new Set((D.yields[S.card || ''] || Object.values(D.yields)[0] || []).map((q) => q.cell)), ys = D.yields[S.card || P.hand[0] || Object.keys(D.yields)[0]] || [];
    $('sCol').style.backgroundImage = `url(${art.nation(P.nation)})`;
    const cells = [-1, 0, 1].flatMap((a) => [-1, 0, 1].map((b) => { const c = home.cell + a * W + b, y = ys.filter((q) => q.cell === c), here = !a && !b; return `<div class="c" ${here || !(work.has(c) || K.tokens(`cell:${c}`)) ? '' : `data-space="cell:${c}"`} style="left:${(b + 1) * 33.33}%;top:${(a + 1) * 33.33}%">${here ? `<svg class="town" viewBox="0 0 64 64">${Sprite.colony(home)}</svg>` : ''}${y.map((q) => `<span class="y">${icon(K.ico(q.icon), 20)}${q.n}</span>`).join('')}${here ? '' : K.tokens(`cell:${c}`)}</div>`; })).join('');
    $('sCol').innerHTML = `${back}<div class="in"><h2>${pick(D.names.nations[P.nation])}</h2><div class="two"><div><div class="land"><canvas width="640" height="640"></canvas>${cells}</div><div class="under"><span>${t('defence')} <b>${home.defence}</b> ${icon('sword', 16)}</span><span>${t('warehouse')} <b>${Rich.total(P.wh)}/${D.cap}</b></span></div><div class="heaps" style="position:static;width:auto;margin-top:10px"><div class="heap" style="grid-template-columns:repeat(12,1fr)">${Core.RES.flatMap((r) => Array(P.wh[r]).fill(`<span>${icon(r, 27)}</span>`)).join('')}${'<i></i>'.repeat(Math.max(0, D.cap - Rich.total(P.wh)))}</div></div></div><div><h4>${t('buildings')}</h4><div class="blds">${Array.from({ length: 6 }, (_, i) => { const b = P.buildings[i], s = sp[`lot:${i}`]; return b ? `<div class="bld" data-space="lot:${i}"><img src="${art.building(b)}" alt=""><span class="tk">${K.tokens(`lot:${i}`)}</span><div class="cp"><b>${pick(D.buildings[b])}</b><span>${S.card ? K.label(s) : Panels.work(b)}</span></div></div>` : `<div class="bld empty" data-space="lot:${i}"><span>${S.card && s ? K.label(s) || t('slot') : t('slot')}</span></div>`; }).join('')}</div><h4 style="margin-top:26px">${t('fathers')}</h4><div class="ppl">${Array.from({ length: 4 }, (_, i) => P.fathers[i] ? `<div class="big"><img src="${art.father(P.fathers[i])}" alt=""><b>${pick(D.fathers[P.fathers[i]])}</b><small></small></div>` : `<div class="big empty">${t('slot')}</div>`).join('')}</div></div></div></div>`;
    const k = terrain.width / W, x = (home.cell % W) - 1, y = Math.floor(home.cell / W) - 1; $('sCol').querySelector('canvas').getContext('2d').drawImage(terrain, x * k, y * k, 3 * k, 3 * k, 0, 0, 640, 640);
  } else $('sCol').innerHTML = '';
  if (S.view === 'europe') {
    const lab = (id) => (S.card ? K.label(sp[id]) : '');
    $('sEu').innerHTML = `${back}<div class="in"><h2>${t('europe')}</h2><div class="two"><div><div class="zone" data-space="eu:market"><h4>${t('market')} ${lab('eu:market')}</h4><div class="mk">${Core.RES.map((r) => `${icon(r, 30)}<span class="bar"><i style="width:${D.price[r] * 20}%"></i></span><b>${D.price[r]}</b><span class="dm" title="${t('demand')}">${D.players.map((_, i) => `<i class="${i < D.demand[r] ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</div><div class="hold"><div class="hull">${heap(P.hold, 4, 'hold')[0]}${HULL}</div><span>${L('Worth', 'Стоит')} <b>${K.cargo()} ${icon('gold', 22)}</b>${K.inEurope() ? '' : `<br><small>${L('The ship must be in Europe to sell', 'Чтобы продать, корабль должен быть в Европе')}</small>`}</span>${K.tokens('eu:market')}</div></div><h4 style="margin-top:32px">${t('plans')}</h4>${Panels.plans()}</div><div><div class="zone" data-space="eu:pier"><h4>${t('pier')} ${lab('eu:pier')} ${K.tokens('eu:pier')}</h4><div class="ppl">${D.pier.map(([x, n]) => `<div class="big${D.agents[x].price > P.gold ? ' dear' : ''}"><img src="${art.agent(x)}" alt=""><span class="cost">${icon('gold', 17)}${D.agents[x].price}</span><b>${pick(D.agents[x])}${n > 1 ? ` ×${n}` : ''}</b><small>${Core.eduIcon(D.agents[x].edu)} ${Core.traits(x).join(' ')}</small></div>`).join('')}</div></div><div class="zone" data-space="eu:salon"><h4>${t('salon')} ${lab('eu:salon')} ${K.tokens('eu:salon')}</h4><div class="ppl">${D.salon.map((x) => `<div class="big${D.fathers[x].bells > P.bells ? ' dear' : ''}"><img src="${art.father(x)}" alt=""><span class="cost">${icon('bells', 17)}${D.fathers[x].bells}</span><b>${pick(D.fathers[x])}</b><small></small></div>`).join('')}</div></div></div></div></div>`;
  } else $('sEu').innerHTML = '';
}
document.addEventListener('click', (e) => { const q = (s) => e.target.closest(s); if (q('[data-menu]')) { menu = !menu; king = sheet = false; K.paint(); } else if (q('[data-grid]')) { grid = !!q('[data-grid]').dataset.grid; K.paint(); } else if (q('[data-reset]')) { Object.assign(view, VIEW); localStorage.removeItem(KEY); look(); redraw(); K.paint(); } else if (q('[data-fit]')) { K.stage.frame(0, 0, 1024, 1024, [70 - view.tilt, 0, $('hand').offsetHeight + 8 - view.tilt * 5, 0]); look(); } else if (menu && !q('.menu') && document.contains(e.target)) { menu = false; K.paint(); } else if (q('[data-king]')) { king = !king; sheet = false; K.paint(); } else if (q('[data-sheet]')) { sheet = !sheet; king = false; K.paint(); } else if (q('[data-close]')) { S.view = 'map'; K.paint(); } else if (!q('.kingbox') && king && !q('.king')) { king = false; K.paint(); } });
K.onCell = (c) => { if (Core.colonyAt(c)?.owner === me && S.war < 0) { S.view = 'colony'; S.look = null; } };
K.onWar = () => { king = false; const x = D.war.sieges[S.war]; if (x) K.stage.look(x.cell + W); };
Rich.drawSea(document.querySelector('canvas.sea'), 4608, 2 / 3).then((c) => { document.querySelector('.map-stage').style.background = c; });
/* A quick sketch of the land at once, then the sharp one in the background, a few milliseconds at a time. */
const SHARP = devicePixelRatio > 1 ? 2.2 : 1.6, plan = (k, rest) => ({ K: k, europe: false, open: true, tall: up(), rest });
let clock = 0, drawing = null;
const rest = async () => { if (performance.now() - clock > 8) { await new Promise((r) => setTimeout(r)); clock = performance.now(); } };
async function land() {
  await Rich.drawRich(terrain, plan(0.75)); if (S.view === 'colony') K.paint();
  drawing = Rich.drawRich(terrain, plan(SHARP, rest)); await drawing; if (S.view === 'colony') K.paint();
}
const redraw = async () => { await drawing; Rich.drawRich(terrain, plan(SHARP)); };
document.addEventListener('input', (e) => { const k = e.target.dataset.viewSet; if (!k) return; view[k] = +e.target.value; e.target.nextElementSibling.textContent = view[k] + e.target.dataset.unit; look(); });
document.addEventListener('change', (e) => { if (!e.target.dataset.viewSet) return; localStorage.setItem(KEY, JSON.stringify(view)); if (e.target.dataset.viewSet === 'tilt') redraw(); });
K.start({ paint, draw: drawMarks, terrain: land, stage: { plane: true, onMove: place, zoom: Math.min(2, Math.max(0.9, 1.34 * innerWidth / 1440)), center: Math.floor(K.home().cell / W) * W + (W - 1) / 2, min: 0.55, max: 2.8 } });
look(); addEventListener('resize', look);
// Pictures that first appear when an agent is lifted or a screen opens, ready beforehand.
setTimeout(() => { for (const u of [...P.buildings.map(art.building), ...D.salon.map(art.father), ...D.pier.map(([x]) => art.agent(x)), art.building('shipyard'), 'art/crate.webp', 'art/europe.webp', art.nation(P.nation)]) { const i = new Image(); i.src = u; i.decode?.().catch(() => {}); (window.ready ||= []).push(i); } }, 400);
