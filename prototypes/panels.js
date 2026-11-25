/* Content blocks shared by the prototypes. Markup only; each design styles and arranges them. */
(() => {
const { D, P, me, W, pick, t, ACT, RES, why, art, icon, eduIcon, traits, optionsOf, describe, spread } = Core;
const name = (p) => pick(D.names.nations[D.players[p].nation]);
const pips = (n, of, cls = '') => Array.from({ length: of }, (_, i) => `<i class="pip ${cls}${i < n ? ' on' : ''}"></i>`).join('');
const goods = (stock, cap) => { const list = RES.flatMap((r) => Array(stock[r]).fill(r)); return `<div class="slots">${Array.from({ length: cap }, (_, i) => `<span class="slot${list[i] ? ' has' : ''}">${list[i] ? icon(list[i], 24) : ''}</span>`).join('')}</div>`; };
const Panels = {
  goods, name,
  stats: () => [['gold', P.gold], ['bells', P.bells], ['crosses', P.crosses]].map(([k, v]) => `<span class="stat" title="${t(k)}">${icon(k, 22)}<b>${v}</b><span class="lbl">${t(k)}</span></span>`).join(''),
  card: (id, cls = '') => { const a = D.agents[id]; return `<button class="card ${cls}" data-card="${id}"><img src="${art.agent(id)}" alt=""><span class="nm">${pick(a)}</span><span class="tr">${eduIcon(a.edu)} ${traits(id).join(' ')}</span></button>`; },
  /** Actions of one agent: open groups first, with the reason for what is not possible. */
  actions: (card, chosen) => !card ? `<p class="hint">${t('choose')}</p>` : optionsOf(card).map((g) => `<section class="grp"><h4>${t(g.group)}</h4>${g.items.map((x) => `<button class="act${x.options.length ? '' : ' off'}${chosen === x.action ? ' sel' : ''}" ${x.options.length ? '' : 'aria-disabled="true"'} data-action="${x.action}"><span>${pick(ACT[x.action] || [x.action, x.action])}</span>${x.options.length ? (x.options.length > 1 ? `<small>${x.options.length}</small>` : '') : `<small class="why">${why(x.why)}</small>`}</button>${chosen === x.action && x.options.length && describe(x.options[0]) ? `<div class="opts">${x.options.map((o) => `<button class="opt" data-do="${x.action}">${describe(o)}</button>`).join('')}</div>` : ''}`).join('')}</section>`).join(''),
  colony: (c, card) => { const T = pick(D.names.terrain[D.terrain[c.cell]]); const ys = card ? D.yields[card].filter((y) => [c.cell, ...Core.W ? [] : []].includes(y.cell) || true) : []; return `
    <div class="cells">${[-1, 0, 1].flatMap((a) => [-1, 0, 1].map((b) => { const x = c.cell + a * W + b, here = x === c.cell, y = ys.filter((q) => q.cell === x); return `<div class="cl t-${D.open[x] ? D.terrain[x] : 'closed'}${here ? ' here' : ''}">${here ? `<img src="${art.emblem(D.players[c.owner].nation)}" alt="">` : ''}${c.owner === me ? y.map((q) => `<span class="y">${icon({ corn: 'food', leaf: 'crops' }[q.icon] || q.icon, 18)}<b>${q.n}</b></span>`).join('') : ''}</div>`; })).join('')}</div>
    <p class="meta">${T}. ${t('defence')} <b>${c.defence}</b> ${icon('sword', 14)}</p>`; },
  buildings: () => `<div class="blds">${Array.from({ length: 6 }, (_, i) => P.buildings[i] ? `<figure class="bld"><img src="${art.building(P.buildings[i])}" alt=""><figcaption>${pick(D.buildings[P.buildings[i]])}<small>${Panels.work(P.buildings[i])}</small></figcaption></figure>` : `<div class="bld empty"><span>${t('slot')}</span></div>`).join('')}</div>`,
  work: (id) => { const b = D.buildings[id], w = b.work; if (b.storage) return `+${b.storage}`; if (b.defence) return `+${b.defence} ${icon('sword', 13)}`; if (!w) return ''; if (w.kind === 'produce') return `${w.consumes ? `${w.consumes.amount}${icon(w.consumes.res, 14)} ▸ ` : ''}${w.amount}${icon(w.icon, 14)}`; if (w.kind === 'ocean') return `2${icon('fish', 14)}`; return ''; },
  warehouse: () => `${goods(P.wh, D.cap)}`, hold: () => goods(P.hold, 4),
  market: () => `<table class="mkt"><tbody>${RES.map((r) => `<tr><th>${icon(r, 22)} ${pick(D.names.resources[r])}</th><td class="pr">${[1, 2, 3, 4, 5].map((n) => `<i class="${n === D.price[r] ? 'on' : n < D.price[r] ? 'lo' : ''}">${n}</i>`).join('')}</td><td class="dm" title="${t('demand')}">${pips(D.demand[r], D.players.length)}</td></tr>`).join('')}</tbody></table>`,
  pier: () => `<div class="row">${D.pier.map(([id, n]) => `<button class="mini${D.agents[id].price > P.gold ? ' dear' : ''}" data-hire="${id}"><img src="${art.agent(id)}" alt=""><span class="nm">${pick(D.agents[id])}${n > 1 ? ` ×${n}` : ''}</span><span class="tr">${eduIcon(D.agents[id].edu)} ${traits(id).join(' ')}</span><span class="cost">${icon('gold', 16)}${D.agents[id].price}</span></button>`).join('')}</div>`,
  salon: () => `<div class="row">${D.salon.map((id) => `<button class="mini father${D.fathers[id].bells > P.bells ? ' dear' : ''}"><img src="${art.father(id)}" alt=""><span class="nm">${pick(D.fathers[id])}</span><span class="cost">${icon('bells', 16)}${D.fathers[id].bells}</span></button>`).join('')}</div>`,
  plans: () => `<div class="plans">${Object.entries(D.buildings).map(([id, b]) => `<span class="plan${D.left[id] ? '' : ' gone'}${P.buildings.includes(id) ? ' own' : ''}${b.improvement ? ' imp' : ''}"><img src="${art.building(id)}" alt=""><span>${pick(b)}</span><small>${b.timber}${icon('timber', 13)} ×${D.left[id]}</small></span>`).join('')}</div>`,
  fathers: () => `<div class="row">${Array.from({ length: 4 }, (_, i) => P.fathers[i] ? `<span class="mini father"><img src="${art.father(P.fathers[i])}" alt=""><span class="nm">${pick(D.fathers[P.fathers[i]])}</span></span>` : `<span class="mini father empty"><span class="nm">${t('slot')}</span></span>`).join('')}</div>`,
  native: (x) => { const h = x.hostility; return `<div class="native"><img src="${art.tribe(x.tribe)}" alt=""><div><h3>${pick(D.names.tribes[x.tribe])} <small>№${x.n}</small></h3><dl><dt>${t('population')}</dt><dd>${icon('people', 18)}<b>${x.pop}</b></dd><dt>${t('hostility')}</dt><dd>${pips(h, 5, h >= 4 ? 'bad ' : h === 3 ? 'mid ' : 'ok ')}</dd><dt></dt><dd>${h >= 4 ? t('raid') : h === 3 ? t('calm') : t('gift')}</dd><dt>${t('ally')}</dt><dd>${x.ally === null ? t('none') : name(x.ally)}</dd><dt>${t('defence')}</dt><dd>${x.pop + { mountains: 2, forest: 1 }[x.terrain] || x.pop} ${icon('sword', 15)}</dd><dt>${t('loot')}</dt><dd>${x.loot.gold ? x.loot.gold + icon('gold', 16) : x.loot.amount + icon(x.loot.res, 16)}</dd></dl></div></div>`; },
  cell: (c) => { if (D.zone[c] === 'europe') return `<h3>${t('europe')}</h3>`; if (!D.open[c]) return `<h3>${t('unexplored')}</h3>`; const tk = Core.tokenAt(c), poi = D.poi[c]; return `<h3>${D.zone[c] === 'sea' ? t('sea') : pick(D.names.terrain[D.terrain[c]])}</h3>${tk ? `<p>${t(tk.kind)}: <b>${name(tk.p)}</b>${tk.p === me && tk.kind === 'ship' ? `<br>${t('full')}` : ''}</p>` : ''}${poi ? `<p>${t(poi)}</p>` : ''}${D.bonus[c] ? `<p>${t('bonus')}: ${icon({ corn: 'food', leaf: 'crops' }[D.bonus[c]] || D.bonus[c], 20)}</p>` : ''}${D.yields[P.hand[0]].some((y) => y.cell === c) ? `<p class="dim">${t('yields')}</p>` : ''}`; },
  rivals: () => D.players.map((p, i) => `<div class="riv${i === me ? ' me' : ''}" style="--c:${p.color}"><span class="em"><img src="${art.emblem(p.nation)}" alt=""></span><span class="nm">${name(i)}${i === me ? ` <small>(${t('you')})</small>` : ''}</span><span class="v">${icon('bells', 16)}${p.bells}</span><span class="v">${icon('gold', 16)}${p.gold}</span><span class="v"><svg class="ic" viewBox="0 0 24 24" width="16" height="16"><path d="M3 21V11l9-8 9 8v10Z" fill="currentColor"/></svg>${D.colonies.filter((c) => c.owner === i).length}</span><b class="sc">${p.score}</b></div>`).join(''),
  log: () => D.log.slice().reverse().map((e) => { const l = Core.logLine(e); return l ? `<li>${l}</li>` : ''; }).join(''),
  tax: () => `<div class="taxes">${D.track.map((x, i) => `<i class="${i + 1 === D.round ? 'on' : i + 1 < D.round ? 'past' : ''}"><small>${i + 1}</small>${x}</i>`).join('')}</div>`,
  siege: (x) => { const gap = Math.max(0, x.attack.total - x.defence.total); const bar = (e, cls) => `<div class="force ${cls}"><b>${e.total}</b><div class="parts">${e.parts.map((q) => `<span style="flex:${Math.max(1, Math.abs(q.value))}" title="${q.label}"><em>${q.value}</em> ${({ ref: t('ref'), tactic: t('tactic'), 'loyalist cards': t('loyalist'), colony: t('colony'), terrain: t('terrain'), tokens: pick(['tokens', 'фишки']), army: pick(['army', 'армия']), support: pick(['militia and allies', 'ополчение и союзники']) })[q.label] || (D.buildings[q.label] ? pick(D.buildings[q.label]) : q.label)}</span>`).join('')}</div></div>`; return `<article class="siege${x.fell ? ' fell' : ''}" style="--c:${D.players[x.owner].color}"><header><span class="em"><img src="${art.emblem(D.players[x.owner].nation)}" alt=""></span><h3>${name(x.owner)}</h3><span class="cubes">${x.cubes} ${t('cubes')}</span></header>${bar(x.attack, 'atk')}${bar(x.defence, 'def')}<footer>${x.dice && x.dice.length ? `<span class="dice">${x.dice.map((d) => `<i class="${d === 4 || d === 5 ? 'hit' : ''}">${d}</i>`).join('')}</span>` : ''}<span class="odds">${t('odds')} ${spread(gap)}</span><b class="out">${x.fell ? t('falls') : t('holds')}</b></footer></article>`; },
  war: () => `<div class="warhead"><h2>${t('war')}</h2><p>${t('tactic')}: <b>${pick(D.names.tactics[D.war.tactic])}</b>. ${icon('ref', 20)} <b>${D.war.pool}</b> ${t('cubes')}. ${t('loyalist')}: <b>${name(D.war.loyalist)}</b></p></div><div class="sieges">${D.war.sieges.map(Panels.siege).join('')}</div><div class="final"><h3>${t('result')}</h3>${D.war.result.players.slice().sort((a, b) => b.qualifies - a.qualifies || b.score - a.score).map((r) => `<div class="riv" style="--c:${D.players[r.player].color}"><span class="em"><img src="${art.emblem(D.players[r.player].nation)}" alt=""></span><span class="nm">${name(r.player)} <small>${t(r.side)}</small></span><span class="bits">${r.parts.map((q) => `${({ colonies: pick(['Colonies', 'Колонии']), bells: t('bells'), agents: pick(['Agents', 'Агенты']), gold: t('gold'), buildings: t('buildings'), fathers: t('fathers') })[q.label] || (D.fathers[q.label] ? pick(D.fathers[q.label]) : q.label)} ${q.value}`).join(', ')}</span><b class="sc">${r.score}</b></div>`).join('')}</div>`,
};
/* State and wiring common to all three. */
const S = { card: null, action: null, sel: null, view: 'map', focus: D.colonies.find((c) => c.owner === me) };
Panels.S = S;
Panels.start = async ({ skin, render, zoom, center }) => {
  const canvas = document.querySelector('canvas.terrain'), svg = document.querySelector('svg.marks');
  svg.setAttribute('viewBox', `0 0 ${W * 64} ${W * 64}`);
  const stage = Core.stage(document.querySelector('.map-stage'), { zoom, center, onCell: (c) => { S.sel = c; const col = Core.colonyAt(c); if (col) S.focus = col; S.onCell?.(c); paint(); } });
  const paint = () => { document.body.dataset.view = S.view; svg.innerHTML = Core.overlay({ ...S, skin }); render(S); };
  Panels.paint = paint;
  Panels.stage = stage;
  document.addEventListener('click', (e) => {
    const q = (s) => e.target.closest(s);
    let x;
    if ((x = q('[data-card]'))) { S.card = S.card === x.dataset.card ? null : x.dataset.card; S.action = null; }
    else if ((x = q('[data-do]'))) toast(`${pick(Core.agent(S.card))}: ${pick(ACT[x.dataset.do])}`);
    else if ((x = q('[data-action]'))) { if (x.classList.contains('off')) return; S.action = S.action === x.dataset.action ? null : x.dataset.action; }
    else if ((x = q('button[data-view]'))) S.view = x.dataset.view;
    else if ((x = q('[data-close]'))) { S.sel = null; S.view = 'map'; }
    else if ((x = q('[data-lang]'))) { document.documentElement.lang = document.documentElement.lang === 'ru' ? 'en' : 'ru'; }
    else if ((x = q('[data-zoom]'))) { stage.zoomBy(+x.dataset.zoom); return; }
    else if ((x = q('[data-hire]'))) { toast(pick(Core.agent(x.dataset.hire))); return; }
    else return;
    paint();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (S.view !== 'map') S.view = 'map'; else if (S.action) S.action = null; else { S.card = null; S.sel = null; } paint(); } if (/^[1-9]$/.test(e.key) && P.hand[+e.key - 1]) { S.card = P.hand[+e.key - 1]; S.action = null; paint(); } });
  paint();
  await Core.drawMap(canvas, skin);
};
let tm;
function toast(s) { let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); } el.textContent = s; el.classList.add('on'); clearTimeout(tm); tm = setTimeout(() => el.classList.remove('on'), 1600); }
window.Panels = Panels;
})();
