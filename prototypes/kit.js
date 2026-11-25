/* Shared by B4 to B6: lifting an agent shows every place it can go, on the map and off it. */
(() => {
const { D, P, W, CELL, me, t, pick, icon, art, at, nbs, SHAPES, roundel } = Core, { Sprite } = Rich;
const L = (en, ru) => pick([en, ru]);
const S = { card: null, drag: null, over: null, pickAt: null, war: -1, view: 'map', look: null };
const ico = (i) => ({ corn: 'food', leaf: 'crops' })[i] || i;
const home = () => D.colonies.find((c) => c.owner === me);
const inEurope = () => D.zone[P.ship] === 'europe';
const placed = [];
/* ---- Europe in the light simulation, once the ship is there ---- */
const price = (card, id) => Math.max(0, D.agents[id].price + D.agents[card].mods.filter((m) => m.mod === 'cost' && m.of === 'hire').reduce((n, m) => n + m.add, 0));
const bonusSell = (card) => D.agents[card].mods.filter((m) => m.mod === 'sellPrice').reduce((n, m) => n + m.add, 0);
const cargo = (card) => Core.RES.reduce((n, r) => n + P.hold[r] * (D.price[r] ? D.price[r] + (card ? bonusSell(card) : 0) : 0), 0);
const AWAY = () => L('Ship must be in Europe', 'Корабль должен быть в Европе');
function europe(card) {
  const away = AWAY(), only = D.agents[card].mods.some((m) => m.mod === 'onlyProduce');
  if (only) { const w = { why: L('Gathers only', 'Только добыча') }; return { market: w, pier: w, salon: w, yard: w }; }
  if (!inEurope()) return { market: { why: away }, pier: { why: away }, salon: { why: away }, yard: { why: P.damage ? away : L('No damage', 'Нет повреждений') } };
  const hire = D.pier.filter(([id]) => price(card, id) <= P.gold).map(([id]) => ({ a: 'hire', card, agent: id })), fathers = D.salon.filter((f) => D.fathers[f].bells <= P.bells).map((f) => ({ a: 'propaganda', card, father: f }));
  return { market: cargo() ? { options: [{ a: 'trade', card }] } : { why: L('The hold is empty', 'Трюм пуст') }, pier: hire.length ? { options: hire, ask: true } : { why: L('Not enough gold', 'Мало золота') }, salon: fathers.length ? { options: fathers, ask: true } : { why: L('Not enough bells', 'Мало колоколов') }, yard: { why: L('No damage', 'Нет повреждений') } };
}
/* ---- every place for one agent ---- */
/** What each space means for this agent, kept until the next change. */
let kept = null;
function spaces(card) { if (!card) return work(card); if (kept?.card !== card) kept = { card, sp: work(card) }; return kept.sp; }
function work(card) {
  if (!card) return {};
  const pl = Rich.byPlace(card), out = {}, why = (a, f = '') => { const x = (D.actions[card] || []).find((q) => q.action === a); return x?.why ? Core.why(x.why) : f; }, only = D.agents[card].mods.some((m) => m.mod === 'onlyProduce');
  for (let i = 0; i < 6; i++) {
    const b = P.buildings[i];
    if (!b) { const o = pl.home.filter((q) => q.a === 'build'); out[`lot:${i}`] = o.length && i === P.buildings.length ? { options: o, ask: true, verb: t('slot') } : { why: i === P.buildings.length ? (only ? L('Gathers only', 'Только добыча') : L('Not enough timber', 'Мало древесины')) : '' }; continue; }
    const def = D.buildings[b], o = pl.home.filter((q) => (q.a === 'work' && q.building === b) || (q.a === 'docks' && b === 'docks')).slice(0, 1);
    out[`lot:${i}`] = o.length ? { options: o } : { why: !def.work ? L('Works by itself', 'Работает само') : def.edu > D.agents[card].edu ? L('Needs more education', 'Нужно образование') : def.work.consumes && P.wh[def.work.consumes.res] < def.work.consumes.amount ? L('Needs crops', 'Нужно сырьё') : why('work') };
  }
  const eu = europe(card);
  for (const k of Object.keys(eu)) out[`eu:${k}`] = eu[k];
  for (const x of D.settlements) if (x.alive) { const o = pl.villages[x.cell]; if (o) out[`cell:${x.cell}`] = { options: o, village: x }; }
  for (const [c, l] of Object.entries(pl.cells)) { const id = `cell:${c}`; out[id] = { options: [...(out[id]?.options || []), ...[...l].sort((a, b) => b.n - a.n)], gather: l }; }
  const ship = pl.ship ? Core.reach(card, 'ship') : {}, inf = pl.inf ? Core.reach(card, 'infantry') : {};
  for (const c of Object.keys(ship)) if (D.terrain[c] === 'ocean') { const id = `cell:${c}`; out[id] = { ...(out[id] || {}), options: [...(out[id]?.options || []), { c: 'play', card, a: 'moveShip', cell: +c }] }; }
  for (const c of Object.keys(inf)) { const id = `cell:${c}`; out[id] = { ...(out[id] || {}), options: [...(out[id]?.options || []), { c: 'play', card, a: 'moveInfantry', cell: +c }] }; }
  // The town itself takes every colony action.
  for (const c of D.colonies) if (c.owner === me && pl.home.length) { const id = `cell:${c.cell}`; out[id] = { ...(out[id] || {}), options: [...(out[id]?.options || []), ...pl.home], ask: true, town: true }; }
  for (const q of pl.hand) out[`who:${q.other}`] = { options: [q] };
  out['hand:supply'] = { why: why('supply', L('Needs 1 food', 'Нужна 1 еда')) };
  return out;
}
/* ---- what a choice changes ---- */
function effect(o) {
  if (o.a === 'trade') return [`+${cargo(o.card)} ${icon('gold', 18)}`];
  if (o.a === 'hire') return [`−${price(o.card, o.agent)} ${icon('gold', 18)}`];
  if (o.a === 'propaganda') return [`−${D.fathers[o.father].bells} ${icon('bells', 18)}`];
  return Rich.preview(o).rows.map((q) => { const n = q.to - q.from; return Number.isFinite(n) ? `${n > 0 ? '+' : '−'}${Math.abs(n)} ${icon(q.icon, 18)}` : `${q.from} ▸ ${q.to} ${icon(q.icon, 18)}`; });
}
const verb = (o) => (o.a === 'hire' ? pick(D.agents[o.agent]) : o.a === 'propaganda' ? pick(D.fathers[o.father]) : o.a === 'build' || o.a === 'work' ? pick(D.buildings[o.building]) : pick(Core.ACT[o.a]));
const face = (o) => (o.a === 'hire' ? art.agent(o.agent) : o.a === 'propaganda' ? art.father(o.father) : o.building ? art.building(o.building) : o.a === 'docks' ? art.building('docks') : o.other ? art.agent(o.other) : null);
/** Short label of a place for the lifted agent: what happens there, or why nothing does. */
function label(s) {
  if (!s) return '';
  if (!s.options?.length) return s.why === AWAY() ? '' : s.why ? `<span class="no">${s.why}</span>` : '';
  if (s.options.length === 1) return `<span class="yes">${effect(s.options[0]).join(' ') || pick(Core.ACT[s.options[0].a])}</span>`;
  const a = [...new Set(s.options.map((o) => pick(Core.ACT[o.a])))];
  return `<span class="yes">${a.join(' / ')} <small>${s.options.length}</small></span>`;
}
function commit(o, spaceId) {
  const now = P.ship;
  if (['trade', 'hire', 'propaganda'].includes(o.a)) {
    Rich.history.push(JSON.stringify({ p: D.players, c: D.colonies, left: D.left, s: D.settlements, pier: D.pier, price: D.price, demand: D.demand, act: D.actions, ref: D.ref, salon: D.salon }));
    if (o.a === 'trade') { P.gold += cargo(o.card); for (const r of Core.RES) { D.demand[r] += P.hold[r]; while (D.demand[r] >= D.players.length) { D.demand[r] -= D.players.length; D.price[r] = Math.max(0, D.price[r] - 1); } P.hold[r] = 0; } }
    if (o.a === 'hire') { P.gold -= price(o.card, o.agent); P.discard.push(o.agent); D.pier = D.pier.filter(([id]) => id !== o.agent); }
    if (o.a === 'propaganda') { P.bells -= D.fathers[o.father].bells; P.fathers.push(o.father); D.salon = D.salon.filter((f) => f !== o.father); }
    P.hand.splice(P.hand.indexOf(o.card), 1); P.discard.push(o.card);
    Rich.notes.unshift(`${pick(D.agents[o.card])}: ${pick(Core.ACT[o.a]).toLowerCase()}`);
  } else Rich.perform(o);
  placed.push({ card: o.card, space: o.a === 'moveShip' ? `cell:${o.cell}` : spaceId, o });
  S.card = S.over = S.pickAt = null;
  void now;
  K.paint();
  K.onCommit?.(o);
}
function undo() {
  const h = Rich.history.at(-1); if (!h) return;
  const s = JSON.parse(h); Rich.undo();
  if (s.pier) D.pier = s.pier; if (s.salon) D.salon = s.salon; Object.assign(D.price, s.price); Object.assign(D.demand, s.demand);
  placed.pop(); S.card = null; K.paint();
}
const at_ = (space) => placed.filter((x) => x.space === space);
const tokens = (space) => at_(space).map((x) => `<span class="placed" title="${pick(D.agents[x.card])}"><img src="${art.agent(x.card)}" alt=""></span>`).join('');
/* ---- the King's army, exactly ---- */
function army() {
  const hostile = D.settlements.filter((x) => x.alive && x.hostility >= 4).length, order = D.players.map((p, i) => ({ i, b: p.bells, c: p.crosses, g: p.gold })).sort((a, b) => b.b - a.b || b.c - a.c || b.g - a.g), loyal = order.at(-1).i;
  const targets = order.filter((x) => x.i !== loyal).flatMap((x) => D.colonies.filter((c) => c.owner === x.i)), pool = D.ref + hostile, per = {};
  targets.forEach((c, k) => { per[c.cell] = Math.floor(pool / targets.length) + (k < pool % targets.length ? 1 : 0); });
  return { ref: S.war >= 0 ? D.war.pool : D.ref, hostile, pool, loyal, targets: targets.length, per };
}
/* ---- map ---- */
function marks(opt = {}) {
  const o = [Core.DEFS], sp = spaces(S.card), lifted = !!S.card, A = army();
  if (!lifted) D.bonus.forEach((b, c) => { if (!b) return; const [x, y] = at(c); o.push(`<g opacity=".92"><circle cx="${x + 52}" cy="${y + 52}" r="9.5" fill="#f7f1e1"/><svg x="${x + 45}" y="${y + 45}" width="14" height="14" viewBox="0 0 24 24">${SHAPES[ico(b)]}</svg></g>`); });
  for (const [c, k] of Object.entries(D.poi)) { const [x, y] = at(+c); o.push(`<svg x="${x + 4}" y="${y + 2}" width="56" height="56" viewBox="0 0 64 64">${k === 'ruin' ? Sprite.ruin() : Sprite.wreck()}</svg>`); }
  if (lifted) {
    const r = {}; for (const [id, s] of Object.entries(sp)) if (id.startsWith('cell:') && s.options?.some((q) => q.a === 'moveShip' || q.a === 'moveInfantry')) r[id.slice(5)] = 1;
    let d = ''; const inn = (q) => q in r || q === P.ship; for (const k of Object.keys(r)) { const c = +k, [x, y] = at(c); if (!inn(c - W)) d += `M${x} ${y}h64`; if (!inn(c + W)) d += `M${x} ${y + 64}h64`; if (!inn(c - 1)) d += `M${x} ${y}v64`; if (!inn(c + 1)) d += `M${x + 64} ${y}v64`; }
    o.push(`<g>${Object.keys(r).map((c) => `<rect x="${at(+c)[0]}" y="${at(+c)[1]}" width="64" height="64" fill="#fff" fill-opacity=".1"/>`).join('')}<path d="${d}" stroke="#fff2c4" stroke-opacity=".8" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round" fill="none"/></g>`);
    const h = S.over?.startsWith('cell:') ? +S.over.slice(5) : null;
    if (h !== null && sp[S.over]?.options?.length) { const [x, y] = at(h); o.push(`<rect x="${x + 3}" y="${y + 3}" width="58" height="58" rx="14" fill="#ffe08a" fill-opacity=".35" stroke="#fff" stroke-width="4"/>`); const mv = sp[S.over].options.find((q) => q.a === 'moveShip' || q.a === 'moveInfantry'); if (mv) { const p = route(mv.a, h).map((c) => { const [a, b] = at(c); return `${a + 32},${b + 32}`; }); o.push(`<polyline points="${p.join(' ')}" fill="none" stroke="#fff6da" stroke-width="5" stroke-dasharray="2 11" stroke-linecap="round"/>`); } }
  }
  const glow = (c, r = 30) => { const [x, y] = at(c); return `<ellipse cx="${x + 32}" cy="${y + 48}" rx="${r}" ry="${r * 0.45}" fill="none" stroke="#ffe08a" stroke-width="4.5"/>`; };
  const things = [];
  const plate = (c, inner, w) => { const [x, y] = at(c); return `<g transform="translate(${x + 32 - w / 2} ${y + 57})"><rect width="${w}" height="17" rx="8.5" fill="#0f3436e6"/>${inner}</g>`; };
  for (const x of D.settlements) if (x.alive) { const col = x.hostility >= 4 ? '#ee5a42' : x.hostility === 3 ? '#edb443' : '#7ccf86', [a, b] = at(x.cell), s = sp[`cell:${x.cell}`]; things.push([x.cell, `${s?.village ? glow(x.cell) : ''}<svg x="${a}" y="${b - 4}" width="64" height="64" viewBox="0 0 64 64">${Sprite.village(x)}</svg>${s?.village ? pill(a + 32, b + 64, s.options.map((q) => pick(Core.ACT[q.a])).join(' / ')) : plate(x.cell, [0, 1, 2, 3, 4].map((i) => `<circle cx="${9 + i * 10}" cy="8.500" r="3.400" fill="${i < x.hostility ? col : '#ffffff30'}"/>`).join(''), 58)}`]); }
  for (const c of D.colonies) { const [a, b] = at(c.cell), war = opt.war?.(c) ?? null; things.push([c.cell, `<svg x="${a - 2}" y="${b - 6}" width="68" height="68" viewBox="0 0 64 64">${Sprite.colony(c)}</svg>${war ?? plate(c.cell, `${roundel(-4, -4, c.owner, 25)}<text x="28" y="13" font-size="14" font-weight="800" fill="#f7f1e1">${c.defence}</text><svg x="37" y="3" width="11" height="11" viewBox="0 0 24 24" color="#f7f1e1">${SHAPES.sword}</svg>`, 54)}`]); }
  D.players.forEach((p, i) => {
    if (typeof p.ship === 'number') { const [a, b] = at(p.ship); things.push([p.ship, `<svg x="${a}" y="${b - 3}" width="64" height="64" viewBox="0 0 64 64">${Sprite.ship(i)}</svg>`]); }
    if (typeof p.inf === 'number') { const c = Core.colonyAt(p.inf), [x, y] = at(p.inf); things.push([p.inf + 0.5, `<svg x="${x + (c ? -22 : 0)}" y="${y + (c ? 2 : 0)}" width="${c ? 56 : 64}" height="${c ? 56 : 64}" viewBox="0 0 64 64">${Sprite.infantry(i)}</svg>`]); }
  });
  things.sort((a, b) => a[0] - b[0]).forEach((x) => o.push(x[1]));
  for (const [id, s] of Object.entries(sp)) if (s.gather) { const c = +id.slice(5), [x, y] = at(c), best = [...s.gather].sort((a, b) => b.n - a.n), up = Core.tokenAt(c) || Core.colonyAt(c) ? 14 : 34, w = best.length * 33; o.push(`<g><rect x="${x + 32 - w / 2}" y="${y + up - 13}" width="${w}" height="27" rx="13.5" fill="${S.over === id ? '#ffe08a' : '#f7f1e1'}"/>${best.map((b, i) => `<svg x="${x + 36 - w / 2 + i * 33}" y="${y + up - 9}" width="17" height="17" viewBox="0 0 24 24">${SHAPES[ico(b.icon)]}</svg><text x="${x + 55 - w / 2 + i * 33}" y="${y + up + 6}" font-size="16" font-weight="800" fill="#1c2a2a">${b.n}</text>`).join('')}</g>`); }
  for (const p of placed) if (p.space?.startsWith('cell:') && !opt.ownPlaced) { const [x, y] = at(+p.space.slice(5)); o.push(`<clipPath id="cl${p.space.slice(5)}"><circle cx="${x + 14}" cy="${y + 14}" r="12"/></clipPath><circle cx="${x + 14}" cy="${y + 14}" r="14" fill="#edb443"/><image href="${art.agent(p.card)}" x="${x + 1}" y="${y + 1}" width="26" height="36" clip-path="url(#cl${p.space.slice(5)})" preserveAspectRatio="xMidYMin slice"/>`); }
  void A;
  return o.join('') + (opt.extra?.(sp) || '');
}
const pill = (x, y, text) => { const w = text.length * 8.2 + 18; return `<g><rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="22" rx="11" fill="#f7f1e1"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="15" font-weight="800" fill="#1c2a2a">${text}</text></g>`; };
function route(token, to) { const kind = token === 'moveShip' ? 'ship' : 'infantry', start = kind === 'ship' ? P.ship : P.inf, r = Core.reach(S.card, kind), path = [to]; let c = to, g = 0; while (c !== start && g++ < 14) { if (nbs(c).includes(start)) { path.push(start); break; } const n = nbs(c).filter((x) => x in r && r[x] > r[c]).sort((a, b) => dist(a, start) - dist(b, start)); if (!n.length) break; c = n[0]; path.push(c); } return path; }
const dist = (a, b) => Math.hypot(Math.floor(a / W) - Math.floor(b / W), (a % W) - (b % W));
/* ---- lifting, hovering, dropping ---- */
let press = null, ghost = null;
const find = (x, y) => { for (const e of document.elementsFromPoint(x, y)) { const s = e.closest('[data-space]'); if (s) return s.dataset.space; if (e.closest('.map-stage')) { const c = K.stage.cell(x, y); return c === null ? null : `cell:${c}`; } if (e.closest('[data-solid]')) return null; } return null; };
function hover(x, y) {
  const id = find(x, y);
  if (id !== S.over) { document.querySelectorAll('.over').forEach((e) => e.classList.remove('over')); S.over = id; if (id && !id.startsWith('cell:')) document.querySelector(`[data-space="${id}"]`)?.classList.add('over'); K.drawMarks(); }
  const b = bub(), s = id ? spaces(S.card)[id] : null;
  if (id?.startsWith('cell:') && s?.options?.length) { const o = s.options; b.innerHTML = o.length === 1 ? `<b>${verb(o[0])}</b> ${effect(o[0]).join(' ')}` : `<b>${[...new Set(o.map((q) => pick(Core.ACT[q.a])))].join(L(' or ', ' или '))}</b>`; b.hidden = false; b.style.left = `${x}px`; b.style.top = `${y - 46}px`; } else b.hidden = true;
}
function bub() { let b = document.querySelector('.kb'); if (!b) { b = document.createElement('div'); b.className = 'kb'; document.body.append(b); } return b; }
function drop(x, y) {
  const id = find(x, y), s = id ? spaces(S.card)[id] : null;
  bub().hidden = true;
  if (!s?.options?.length) return false;
  if (s.options.length === 1 && !s.ask) { commit(s.options[0], id); return true; }
  S.pickAt = { x, y, id };
  picker(); return true;
}
function picker() {
  let p = document.querySelector('.kp'); if (!p) { p = document.createElement('div'); p.className = 'kp'; p.dataset.solid = ''; document.body.append(p); }
  if (!S.pickAt) { p.hidden = true; return; }
  const s = spaces(S.card)[S.pickAt.id]; if (!s?.options?.length) { p.hidden = true; S.pickAt = null; return; }
  p.innerHTML = s.options.map((o, i) => { const f = face(o); return `<button class="${f ? 'im' : ''}" data-opt="${i}">${f ? `<img src="${f}" alt="" class="${o.a === 'hire' || o.a === 'propaganda' || o.a === 'exchange' ? 'por' : ''}">` : ''}<b>${verb(o)}</b><span>${effect(o).join(' ')}</span></button>`; }).join('');
  p.hidden = false; const r = p.getBoundingClientRect(); p.style.left = `${Math.max(12, Math.min(innerWidth - r.width - 12, S.pickAt.x - r.width / 2))}px`; p.style.top = `${Math.max(12, Math.min(innerHeight - r.height - 12, S.pickAt.y - r.height - 22))}px`;
}
const put = () => { ghost?.remove(); ghost = null; S.drag = null; };
addEventListener('pointerdown', (e) => {
  const a = e.target.closest('[data-agent]');
  if (a && e.button === 0) press = { card: a.dataset.agent, x: e.clientX, y: e.clientY, on: false };
});
addEventListener('pointermove', (e) => {
  if (press) {
    if (!press.on && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) { press.on = true; S.card = S.drag = press.card; S.pickAt = null; S.look = null; ghost = document.createElement('div'); ghost.className = 'ghost'; ghost.innerHTML = `<img src="${art.agent(press.card)}" alt="">`; document.body.append(ghost); K.paint(); }
    if (press.on) { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; hover(e.clientX, e.clientY); }
  } else if (S.card && !S.pickAt && !e.buttons) hover(e.clientX, e.clientY);
});
addEventListener('pointerup', (e) => {
  const p = press; press = null;
  if (!p) return;
  if (p.on) { put(); if (!drop(e.clientX, e.clientY)) S.card = null; S.over = null; K.paint(); }
  else { S.card = S.card === p.card ? null : p.card; S.pickAt = null; S.look = null; bub().hidden = true; K.paint(); }
});
document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest(s); let x;
  if ((x = q('[data-opt]'))) { const s = spaces(S.card)[S.pickAt.id]; commit(s.options[+x.dataset.opt], S.pickAt.id); return; }
  if (q('[data-agent]')) return;
  if (S.card && !q('button:not([data-space])')) { const id = find(e.clientX, e.clientY); if (id && drop(e.clientX, e.clientY)) return; if (S.pickAt && !q('.kp')) { S.pickAt = null; K.paint(); return; } }
  if (q('[data-peace]')) { K.war.exit(); K.paint(); }
  else if (q('[data-undo]')) undo();
  else if (q('[data-lang]')) { document.documentElement.lang = Core.lang() === 'ru' ? 'en' : 'ru'; K.paint(); }
  else if ((x = q('[data-go]'))) { S.view = S.view === x.dataset.go ? 'map' : x.dataset.go; K.paint(); }
  else if ((x = q('[data-war]'))) { S.war = +x.dataset.war; S.card = null; S.view = 'map'; S.look = null; K.war.enter(); K.paint(); K.onWar?.(); }
  else if (q('[data-pass]')) { P.hand.splice(0); S.card = null; K.paint(); }
  else if ((x = q('[data-zoom]'))) K.stage.zoomBy(+x.dataset.zoom);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') { put(); if (S.pickAt) S.pickAt = null; else if (S.card) S.card = null; else if (S.war >= 0) K.war.exit(); else S.view = 'map'; bub().hidden = true; K.paint(); } if (/^[1-9]$/.test(e.key) && P.hand[+e.key - 1]) { S.card = P.hand[+e.key - 1]; S.pickAt = null; K.paint(); } });
const K = { europe, route, S, away: () => (S.card && !inEurope() ? `<em class="aw">${AWAY()}</em>` : ''), spaces, effect, verb, face, label, commit, undo, tokens, army, marks, pill, home, inEurope, cargo, placed, L, ico, picker, sword: (n = 15) => icon('sword', n),
  /* War, one line per colony. */
  odds(x) { const n = Math.min(10, Math.max(0, x.attack.total - x.defence.total)), q = 2 / 3; return n === 0 ? 1 : D.war.tactic === 'extended_supply_lines' ? q ** n + (n * q ** (n - 1)) / 3 : q ** n; },
  part: (q) => ({ ref: t('ref'), tactic: t('tactic'), 'loyalist cards': t('loyalist'), colony: t('colony'), terrain: t('terrain'), tokens: L('Ship and infantry', 'Корабль и пехота'), army: L('Soldiers', 'Солдаты'), support: L('Militia and allies', 'Ополчение и союзники') })[q] || (D.buildings[q] ? pick(D.buildings[q]) : q),
  em: (p, s = 34) => `<span class="em" style="--c:${D.players[p].color};width:${s}px;height:${s}px"><img src="${art.emblem(D.players[p].nation)}" alt=""></span>`,
  war: {
    enter() { if (!K.savedCols) { K.savedCols = D.colonies.slice(); const w = D.war.sieges.map((x) => ({ cell: x.cell, owner: x.owner, defence: x.defence.total })), keep = K.savedCols.filter((c) => c.owner === D.war.loyalist); D.colonies.splice(0, 99, ...w, ...keep); } },
    exit() { if (K.savedCols) { D.colonies.splice(0, 99, ...K.savedCols); K.savedCols = null; } S.war = -1; },
    of: (c) => D.war.sieges.find((x) => x.cell === c.cell),
    /** On the map: attack against defence, and what came of it. */
    plate(c, shown) { const x = K.war.of(c), [a, b] = at(c.cell); if (!x) return null; const i = D.war.sieges.indexOf(x), done = i <= shown, w = 92; return `<g transform="translate(${a + 32 - w / 2} ${b + 54})" data-war="${i}" style="cursor:pointer">${i === shown ? `<rect x="-4" y="-4" width="${w + 8}" height="30" rx="15" fill="#ffe08a"/>` : ''}<rect width="${w}" height="22" rx="11" fill="#0f3436f2"/>${roundel(-6, -3, x.owner, 28)}<text x="33" y="16" font-size="15" font-weight="800" fill="#ff8f78">${x.attack.total}</text><text x="52" y="16" font-size="13" fill="#f7f1e1" fill-opacity=".7">/</text><text x="59" y="16" font-size="15" font-weight="800" fill="#f7f1e1">${x.defence.total}</text>${done ? (x.fell ? '<path d="M78 7l8 8m0-8l-8 8" stroke="#ff8f78" stroke-width="3" stroke-linecap="round"/>' : '<path d="M77 11l4 4 7-8" stroke="#8fe09a" stroke-width="3" fill="none" stroke-linecap="round"/>') : ''}</g>`; },
    bar: (e, cls) => `<div class="fb ${cls}"><b>${e.total}</b><span class="fparts">${e.parts.map((q) => `<i style="flex:${Math.max(1, q.value)}" title="${K.part(q.label)} ${q.value}"><em>${q.value}</em> ${K.part(q.label)}</i>`).join('')}</span></div>`,
    ledger(i) { const n = D.war.sieges.length, x = D.war.sieges[i]; return i < n ? `<div class="wl"><header>${K.em(x.owner, 40)}<h3>${Panels.name(x.owner)}</h3><span>${x.cubes} ${t('cubes')}${x.loyalist?.length ? `, ${x.loyalist.length} ${L('loyalist agents', 'агентов лоялиста')}` : ''}</span><span class="dim">${t('odds')} ${(K.odds(x) * 100).toFixed(0)}%</span><span class="dice">${(x.dice || []).map((d) => `<i class="${d === 4 || d === 5 ? 'hit' : ''}">${d}</i>`).join('')}</span><b class="out ${x.fell ? 'fell' : ''}">${x.fell ? t('falls') : t('holds')}</b></header>${K.war.bar(x.attack, 'atk')}${K.war.bar(x.defence, 'def')}</div>` : K.war.scores(); },
    scores: () => `<div class="wscore">${D.war.result.players.slice().sort((a, b) => b.qualifies - a.qualifies || b.score - a.score).map((r) => `<div class="${r.qualifies ? '' : 'lost'}">${K.em(r.player, 34)}<b>${Panels.name(r.player)}</b><span class="dim">${t(r.side).toLowerCase()}, ${r.colonies} ${L('colonies kept', 'колоний')}</span><strong>${r.score}</strong></div>`).join('')}</div>`,
    nav(i) { const n = D.war.sieges.length; return `<nav class="wnav"><button data-war="${Math.max(0, i - 1)}">◂</button>${D.war.sieges.map((x, k) => `<button class="wd${k === i ? ' on' : ''}${k <= i && x.fell ? ' fell' : ''}" data-war="${k}">${K.em(x.owner, 28)}</button>`).join('')}<button class="wd tx${i >= n ? ' on' : ''}" data-war="${n}">${t('result')}</button><button data-war="${Math.min(n, i + 1)}">▸</button><button class="tx" data-peace>${t('close')}</button></nav>`; },
    head: () => `${t('tactic')}: <b>${pick(D.names.tactics[D.war.tactic])}</b>. <b>${D.war.pool}</b> ${t('cubes')}. ${t('loyalist')}: <b>${Panels.name(D.war.loyalist)}</b>`,
  },
  start({ paint, marks: mk, draw, terrain, stage, K: scale = 1.5, map = {} }) {
    const canvas = document.querySelector('canvas.terrain'), svg = document.querySelector('svg.marks');
    svg?.setAttribute('viewBox', `0 0 ${W * 64} ${W * 64}`);
    K.drawMarks = draw || (() => { svg.innerHTML = marks(mk?.() || {}); });
    K.paint = () => { kept = null; document.body.classList.toggle('lift', !!S.card); document.body.dataset.view = S.view; document.body.classList.toggle('war', S.war >= 0); paint(); K.drawMarks(); picker(); document.querySelectorAll('[data-space]').forEach((e) => { const s = S.card ? spaces(S.card)[e.dataset.space] : null; e.classList.toggle('ok', !!s?.options?.length); e.classList.toggle('off', !!S.card && !s?.options?.length); }); };
    K.stage = Core.stage(document.querySelector('.map-stage'), { ...stage, onCell: (c) => { if (!S.card) { S.look = S.look === c ? null : c; K.onCell?.(c); K.paint(); } } });
    K.paint();
    return terrain ? terrain() : Rich.drawRich(canvas, { K: scale, ...map });
  },
};
window.Kit = K;
})();
