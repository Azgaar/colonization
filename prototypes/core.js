/* Shared by the three prototypes: data access, words, icons, map drawing, selection. No look of its own. */
(() => {
const D = window.SNAPSHOT, W = D.width, CELL = 64, me = D.me;
const P = D.players[me];
const lang = () => document.documentElement.lang || 'en';
const pick = (x) => (Array.isArray(x) ? x[lang() === 'ru' ? 1 : 0] : lang() === 'ru' ? x.ru : x.en);
const T = {
  round: ['Round', 'Тур'], of: ['of', 'из'], tax: ['Tax', 'Налог'], gold: ['Gold', 'Золото'], bells: ['Bells', 'Колокола'], crosses: ['Crosses', 'Кресты'], ref: ['King’s army', 'Армия короля'],
  hand: ['Your agents', 'Ваши агенты'], deck: ['deck', 'колода'], discard: ['discard', 'сброс'], pass: ['Pass', 'Пас'], warehouse: ['Warehouse', 'Склад'], hold: ['Hold', 'Трюм'], buildings: ['Buildings', 'Постройки'], fathers: ['Founding Fathers', 'Отцы-основатели'],
  colony: ['Colony', 'Колония'], europe: ['Europe', 'Европа'], market: ['Market', 'Рынок'], pier: ['Pier', 'Причал'], salon: ['Salon', 'Салон'], plans: ['Building projects', 'Проекты построек'], demand: ['demand', 'спрос'], free: ['free', 'свободно'], slot: ['Free slot', 'Свободно'],
  war: ['War of Independence', 'Война за независимость'], warshort: ['War', 'Война'], map: ['Map', 'Карта'], rivals: ['Governors', 'Губернаторы'], log: ['Chronicle', 'Хроника'], defence: ['Defence', 'Защита'], yields: ['This agent can gather', 'Этот агент может добыть'],
  settlement: ['Settlement', 'Поселение'], population: ['Population', 'Население'], hostility: ['Hostility', 'Враждебность'], loot: ['Loot', 'Добыча'], ally: ['Ally', 'Союз'], none: ['none', 'нет'], terrain: ['Terrain', 'Местность'], bonus: ['Bonus', 'Бонус'], raid: ['Raids when an event calls it', 'Набег при активации'], calm: ['Quiet', 'Спокойно'], gift: ['Brings food when an event calls it', 'Дарит еду при активации'],
  attack: ['Attack', 'Атака'], holds: ['Holds', 'Удержана'], falls: ['Falls', 'Пала'], loyalist: ['Loyalist', 'Лоялист'], patriot: ['Patriot', 'Патриот'], tactic: ['King’s tactic', 'Тактика короля'], cubes: ['redcoats', 'красные мундиры'], odds: ['Chance to hold', 'Шанс удержать'], dice: ['Dice', 'Кубики'], result: ['Final score', 'Итоговый счёт'],
  choose: ['Pick an agent, then an action', 'Выберите агента, затем действие'], why: ['Not now', 'Недоступно'], show: ['Show', 'Показать'], score: ['points', 'очков'], unexplored: ['Unexplored', 'Не исследовано'], ship: ['Ship', 'Корабль'], infantry: ['Infantry', 'Пехота'], ruin: ['Ruins', 'Руины'], wreck: ['Shipwreck', 'Кораблекрушение'], sea: ['Open sea', 'Открытое море'],
   forecast: ['If the war came now', 'Если бы война началась сейчас'], you: ['you', 'вы'], close: ['Close', 'Закрыть'], confirm: ['Do it', 'Выполнить'], back: ['Back', 'Назад'], undo: ['Undo', 'Отменить'],
};
const cargo = RES0().reduce((n, r) => n + P.hold[r] * D.price[r], 0);
function RES0() { return ['food', 'timber', 'crops', 'goods', 'silver']; }
T.full = [`The hold is worth ${cargo} gold in Europe`, `Груз стоит ${cargo} золота в Европе`];
for (const [k, en] of Object.entries({ french: 'New France', english: 'New England', dutch: 'New Netherland', spanish: 'New Spain' })) D.names.nations[k][0] = en;
const t = (k) => (T[k] ? pick(T[k]) : k);
const ACT = {
  produce: ['Gather', 'Добыча'], docks: ['Fish from the docks', 'Ловля у причала'], work: ['Work in a building', 'Работа в постройке'], moveShip: ['Sail', 'Плыть'], moveInfantry: ['March', 'Идти'], found: ['Found a colony', 'Основать колонию'], attack: ['Attack', 'Атака'], trade: ['Sell in Europe', 'Торговля'], hire: ['Hire', 'Наём'], propaganda: ['Win over a Father', 'Пропаганда'], repair: ['Repair', 'Ремонт'], shipyard: ['Repair at the shipyard', 'Ремонт на верфи'], build: ['Build', 'Строительство'], teach: ['Teach', 'Обучение'], customs: ['Sell at the custom house', 'Таможня'], supply: ['Supply', 'Снабжение'], exchange: ['Exchange agents', 'Обмен'], gift: ['Give a gift', 'Подарок'], preach: ['Preach', 'Проповедь'], alliance: ['Make an alliance', 'Союз'], smuggle: ['Smuggle', 'Контрабанда'],
};
const GROUPS = [['map', ['moveShip', 'moveInfantry', 'found', 'attack']], ['colony', ['produce', 'docks', 'work', 'build', 'teach', 'supply', 'shipyard', 'customs']], ['settlement', ['gift', 'preach', 'alliance']], ['europe', ['trade', 'hire', 'propaganda', 'repair']], ['hand', ['exchange']]];
const WHY_RU = { 'the ship must be in Europe': 'корабль должен быть в Европе', 'no settlement next to a token': 'нет поселения рядом', 'infantry must be on land': 'пехота должна быть на суше', 'needs an agent with ⚔️': 'нужен военный агент', 'no target in reach': 'нет цели рядом', 'needs a school': 'нужна школа', 'needs a custom house': 'нужна таможня', 'needs a shipyard': 'нужна верфь', 'needs 1 food': 'нужна 1 еда', 'needs higher education or a scout': 'нужно высшее образование или скаут', 'nothing to choose from': 'не из чего выбрать', 'the limit of colonies is reached': 'достигнут предел колоний' };
const why = (s) => (lang() === 'ru' && WHY_RU[s] ? WHY_RU[s] : s);
const agent = (id) => D.agents[id];
const art = {
  agent: (id) => `art/agent/${D.agents[id].base}.webp`,
  building: (id) => `art/building/${({ blacksmith_shop: 'blacksmiths_shop' })[id] || id}.webp`,
  father: (id) => `art/father/${id === 'benedict_arnold' ? 'edward_colston' : id}.webp`,
  tribe: (id) => `art/tribe/${id}.webp`, nation: (id) => `art/nation/${id}.webp`, emblem: (id) => `art/emblem/${id}.svg`,
};
const RES = ['food', 'timber', 'crops', 'goods', 'silver'];
const ICON_RES = { corn: 'food', fish: 'food', timber: 'timber', leaf: 'crops', fur: 'crops', silver: 'silver' };
/* Small pictograms, drawn once, coloured by CSS custom properties where a design wants to. */
const SHAPES = {
  food: '<path d="M12 2c4 3 5 8 3 14l-3 6-3-6C7 10 8 5 12 2Z" fill="#f2c230"/><path d="M12 22c-5-1-8-5-8-10 4 1 7 4 8 10Zm0 0c5-1 8-5 8-10-4 1-7 4-8 10Z" fill="#6d9b3a"/><path d="M12 5v10M10 8h4M9.6 11h4.8" stroke="#b98a12" stroke-width="1.1"/>',
  fish: '<path d="M3 12c4-6 11-6 15-1l4-4v10l-4-4c-4 5-11 5-15-1Z" fill="#5c93bd"/><circle cx="8" cy="11" r="1.2" fill="#12324a"/>',
  timber: '<rect x="2" y="13" width="20" height="7" rx="3.5" fill="#8a5a33"/><rect x="5" y="5" width="17" height="7" rx="3.5" fill="#a06c40"/><circle cx="5.5" cy="16.5" r="2.3" fill="#d9ae7c"/><circle cx="8.5" cy="8.5" r="2.3" fill="#e3bd8f"/>',
  crops: '<path d="M4 20C4 9 10 3 20 3c1 10-4 16-13 16" fill="#4f9a45"/><path d="M3 21 15 9" stroke="#2d6a2e" stroke-width="1.6"/>',
  fur: '<path d="M4 15c0-6 4-9 9-9 4 0 7 3 7 7 0 5-4 7-8 7-5 0-8-2-8-5Z" fill="#7d5535"/><circle cx="16" cy="11" r="1.1" fill="#1d120a"/><path d="M4 16c-2 1-2 4 0 4l5-1" fill="#5d3d25"/>',
  goods: '<path d="M3 7l9-4 9 4v10l-9 4-9-4Z" fill="#3f86c6"/><path d="M3 7l9 4 9-4M12 11v10" stroke="#1f4e7d" stroke-width="1.4" fill="none"/>',
  silver: '<path d="M5 8h14l3 10H2Z" fill="#c3c9cf"/><path d="M5 8h14l1 3H4Z" fill="#eef1f3"/>',
  gold: '<circle cx="12" cy="12" r="9" fill="#e8b923"/><circle cx="12" cy="12" r="6" fill="none" stroke="#a97c0b" stroke-width="1.5"/>',
  bells: '<path d="M12 3c5 0 6 4 6 8l2 6H4l2-6c0-4 1-8 6-8Z" fill="#d79a2b"/><rect x="3" y="16.5" width="18" height="2.4" rx="1.2" fill="#a86f13"/><circle cx="12" cy="20.6" r="1.8" fill="#a86f13"/>',
  crosses: '<path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6Z" fill="#7c4fa3"/>',
  ref: '<path d="M6 10 12 3l6 7v11H6Z" fill="#c0392b"/><path d="M9 10h6v4H9Z" fill="#fff3ec"/><path d="M6 10h12" stroke="#7d1f14" stroke-width="1.5"/>',
  sword: '<path d="M19 2 9 14l1 1L22 5V2ZM7 13l4 4M4 20l4-4" stroke="currentColor" stroke-width="2.2" fill="currentColor"/>',
  anger: '<path d="M12 2l2.4 6L20 6l-2 5 5 2-5 2 2 5-5.6-2L12 23l-2.4-5L4 20l2-5-5-2 5-2-2-5 5.600 2Z" fill="#c8442f"/>',
  people: '<circle cx="8" cy="8" r="3.4" fill="currentColor"/><circle cx="16.500" cy="9" r="2.800" fill="currentColor"/><path d="M2 20c0-5 3-7 6-7s6 2 6 7Zm11.500 0c0-2-.4-4-1.500-5.500 1-.800 2.500-1.200 4.500-1.200 3 0 5.500 2 5.500 6.700Z" fill="currentColor"/>',
  move: '<path d="M3 15h9l2-9 3 9h4l-2 5H6Z" fill="currentColor"/>', book: '<path d="M3 5c4-1.500 7-1 9 1 2-2 5-2.500 9-1v14c-4-1.500-7-1-9 1-2-2-5-2.500-9-1Z" fill="currentColor"/>', cap: '<path d="M12 4 1 9l11 5 9-4.100V17h2V9Z" fill="currentColor"/><path d="M5 12.500V17c2 2 5 3 7 3s5-1 7-3v-4.500l-7 3.200Z" fill="currentColor"/>', bar: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.500"/><path d="M6 18 18 6" stroke="currentColor" stroke-width="2.500"/>',
};
const icon = (n, size = 18) => `<svg class="ic ic-${n}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${SHAPES[n] || ''}</svg>`;
const eduIcon = (e) => icon(['bar', 'book', 'cap'][e], 16);
/* What an agent is good at, from its modifiers. */
function traits(id) {
  const out = [], n = (x) => (x > 0 ? `+${x}` : x);
  const sword = { infantry: 0, ship: 0 };
  for (const m of D.agents[id].mods) {
    if (m.mod === 'production') out.push(`${n(m.add)} ${m.icons ? m.icons.map((i) => icon({ corn: 'food', leaf: 'crops' }[i] || i, 15)).join('') : pick(['gathering', 'добыча'])}${m.terrain ? ' ' + pick(D.names.terrain[m.terrain]).toLowerCase() : ''}`);
    if (m.mod === 'move') out.push(`${n(m.add)} ${icon('move', 15)} ${t(m.token).toLowerCase()}`);
    if (m.mod === 'combat') sword[m.token] += m.vs || m.terrain ? 0 : m.add;
    if (m.mod === 'cost') out.push(`${m.add} ${m.of === 'hire' ? icon('gold', 15) : icon('timber', 15)}`);
    if (m.mod === 'sellPrice') out.push(`${n(m.add)} ${icon('gold', 15)}`);
    if (m.mod === 'onlyProduce') out.push(pick(['gathers only', 'только добыча']));
    if (m.mod === 'bombard') out.push(pick(['bombards', 'обстрел']));
  }
  if (sword.infantry) out.unshift(`+${sword.infantry} ${icon('sword', 14)}`); else if (sword.ship) out.unshift(`+${sword.ship} ${icon('sword', 14)} ${t('ship').toLowerCase()}`);
  return out;
}

/* ---- choices ---- */
function optionsOf(card) {
  const list = D.actions[card] || [];
  return GROUPS.map(([g, acts]) => ({ group: g, items: acts.map((a) => list.find((x) => x.action === a)).filter(Boolean) })).filter((g) => g.items.length);
}
function describe(c) {
  const res = (r, n) => `${n} ${icon(r, 16)}`;
  if (c.a === 'produce') { const y = D.yields[c.card].find((z) => z.cell === c.cell && z.icon === c.icon); return `${res(ICON_RES[c.icon], '+' + y.n)} <span class="dim">${pick(D.names.terrain[D.terrain[c.cell]])}</span>`; }
  if (c.a === 'docks') return res('fish', '+2');
  if (c.a === 'work') { const b = D.buildings[c.building]; const extra = b.work.icon === 'goods' ? P.fathers.includes('eli_whitney') ? 1 : 0 : 0; const add = D.agents[c.card].mods.filter((m) => m.mod === 'production' && (!m.icons || m.icons.includes(b.work.icon))).reduce((n, m) => n + m.add, 0); return `${pick(b)} ${res(b.work.icon, '+' + (b.work.amount + extra + add))}`; }
  if (c.a === 'build') return `${pick(D.buildings[c.building])} <span class="dim">−${D.buildings[c.building].timber}</span>${icon('timber', 15)}`;
  if (c.a === 'exchange') return pick(D.agents[c.other]);
  if (c.settlement) { const x = D.settlements[c.settlement - 1]; return pick(D.names.tribes[x.tribe]); }
  return '';
}
const points = (card, token) => 5 + D.agents[card].mods.filter((m) => m.mod === 'move' && m.token === token).reduce((n, m) => n + m.add, 0);
const nbs = (c) => { const r = Math.floor(c / W), k = c % W, o = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if ((a || b) && r + a >= 0 && k + b >= 0 && r + a < W && k + b < W) o.push((r + a) * W + k + b); return o; };
const tokenAt = (c) => { for (let i = 0; i < D.players.length; i++) { if (D.players[i].ship === c) return { p: i, kind: 'ship' }; if (D.players[i].inf === c) return { p: i, kind: 'infantry' }; } return null; };
const colonyAt = (c) => D.colonies.find((x) => x.cell === c), settlementAt = (c) => D.settlements.find((x) => x.alive && x.cell === c);
/** Cells a token could reach this action, with the points left. */
function reach(card, token) {
  const start = token === 'ship' ? P.ship : P.inf, out = {};
  if (typeof start !== 'number') return out;
  const todo = [[start, points(card, token)]];
  out[start] = todo[0][1];
  while (todo.length) {
    const [c, left] = todo.shift();
    for (const x of nbs(c)) {
      if (!D.open[x] || tokenAt(x) || (token === 'ship' ? D.terrain[x] !== 'ocean' : D.terrain[x] === 'ocean' || settlementAt(x) || (colonyAt(x) && colonyAt(x).owner !== me))) continue;
      const k = { ocean: 1, grassland: 1, forest: 2, desert: 2, tundra: 2 }[D.terrain[x]] ?? left, l = left - k;
      if (l >= 0 && left > 0 && !(out[x] >= l)) { out[x] = l; todo.push([x, l]); }
    }
  }
  delete out[start];
  return out;
}
/** Cells to light up for a card and action. */
function targets(card, action) {
  if (!card || !action) return {};
  const a = (D.actions[card] || []).find((x) => x.action === action);
  if (!a || !a.options.length) return {};
  if (action === 'moveShip') return reach(card, 'ship');
  if (action === 'moveInfantry') return reach(card, 'infantry');
  const out = {};
  for (const o of a.options) { if (o.cell !== undefined) out[o.cell] = ''; if (o.settlement) out[D.settlements[o.settlement - 1].cell] = ''; }
  if (action === 'produce') for (const y of D.yields[card]) out[y.cell] = Math.max(out[y.cell] || 0, y.n);
  return out;
}
/* This war's tactic needs two successes to take a colony. */
const spread = (x) => { const n = Math.min(10, Math.max(0, x)), q = 2 / 3, p = D.war.tactic === 'extended_supply_lines' && n ? q ** n + (n * q ** (n - 1)) / 3 : q ** n; return `${(p * 100).toFixed(0)}%`; };

/* ---- map ---- */
function rnd(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, y) { const a = Math.floor(x), b = Math.floor(y), u = x - a, v = y - b, s = u * u * (3 - 2 * u), q = v * v * (3 - 2 * v); return (rnd(a, b) * (1 - s) + rnd(a + 1, b) * s) * (1 - q) + (rnd(a, b + 1) * (1 - s) + rnd(a + 1, b + 1) * s) * q; }
async function textures() {
  const out = {};
  await Promise.all(Object.entries(window.TEXTURES).map(([k, src]) => new Promise((ok) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 224; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); out[k] = g.getImageData(0, 0, 224, 224).data; ok(); }; im.src = src; })));
  return out;
}
/** One value per pixel: terrain index with wandering borders, so coasts and forests look natural. */
function field(warp) {
  const N = W * CELL, kinds = ['ocean', 'forest', 'grassland', 'mountains', 'desert', 'tundra'], f = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let c = Math.floor(y / CELL) * W + Math.floor(x / CELL);
    if (!D.open[c]) { f[y * N + x] = 255; continue; }
    if (warp) {
      const wx = x + (noise(x / 26, y / 26) - 0.5) * 40 + (noise(x / 9 + 50, y / 9) - 0.5) * 12, wy = y + (noise(x / 26 + 90, y / 26 + 40) - 0.5) * 40 + (noise(x / 9, y / 9 + 70) - 0.5) * 12;
      const q = Math.min(W - 1, Math.max(0, Math.floor(wy / CELL))) * W + Math.min(W - 1, Math.max(0, Math.floor(wx / CELL)));
      if (D.open[q]) c = q;
    }
    f[y * N + x] = kinds.indexOf(D.terrain[c]);
  }
  return { f, N, kinds };
}
/** Distance in pixels to the nearest land (for sea) or sea (for land). */
function distances(f, N) {
  const run = (isGoal) => {
    const d = new Float32Array(N * N).fill(1e4);
    for (let i = 0; i < N * N; i++) if (isGoal(f[i])) d[i] = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (x) d[i] = Math.min(d[i], d[i - 1] + 1); if (y) { d[i] = Math.min(d[i], d[i - N] + 1); if (x) d[i] = Math.min(d[i], d[i - N - 1] + 1.41); if (x < N - 1) d[i] = Math.min(d[i], d[i - N + 1] + 1.41); } }
    for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (x < N - 1) d[i] = Math.min(d[i], d[i + 1] + 1); if (y < N - 1) { d[i] = Math.min(d[i], d[i + N] + 1); if (x) d[i] = Math.min(d[i], d[i + N - 1] + 1.41); if (x < N - 1) d[i] = Math.min(d[i], d[i + N + 1] + 1.41); } }
    return d;
  };
  return { toLand: run((v) => v > 0 && v < 6), toSea: run((v) => v === 0) };
}
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
async function drawMap(canvas, style) {
  const tex = style === 'chart' ? null : await textures();
  const { f, N, kinds } = field(style !== 'tile'), { toLand, toSea } = distances(f, N);
  canvas.width = canvas.height = N;
  const g = canvas.getContext('2d'), im = g.createImageData(N, N), o = im.data;
  for (let i = 0; i < N * N; i++) {
    const x = i % N, y = (i / N) | 0, v = f[i];
    let c;
    if (style === 'painted') {
      if (v === 255) { const n = noise(x / 60, y / 60) * 0.6 + noise(x / 22 + 9, y / 22) * 0.4; c = mix([20, 58, 58], [58, 104, 98], n); }
      else {
        const s = (((y * 1.5) | 0) % 224) * 224 + (((x * 1.5) | 0) % 224), k = tex[kinds[v]];
        c = [k[s * 4], k[s * 4 + 1], k[s * 4 + 2]];
        if (v === 0) { const d = toLand[i]; c = mix(c, [88, 178, 176], Math.max(0, 0.62 - d / 62)); c = mix(c, [10, 44, 78], Math.min(0.42, d / 420)); if (d < 2.2) c = mix(c, [240, 246, 236], 0.75); else if (d > 6 && d < 7.6) c = mix(c, [225, 242, 238], 0.35); }
        else { const d = toSea[i]; if (d < 4) c = mix(c, [226, 205, 150], 0.8 - d * 0.14); c = mix(c, [255, 246, 214], 0.06); }
      }
      if (D.zone[((y / CELL) | 0) * W + ((x / CELL) | 0)] === 'europe') c = mix(c, [12, 36, 52], 0.5);
    } else if (style === 'chart') {
      if (v === 255) c = (x + y) % 9 < 1.2 ? [196, 206, 208] : [250, 250, 247];
      else if (v === 0) { const d = toLand[i]; c = d < 9 ? [160, 205, 214] : d < 22 ? [190, 221, 227] : d < 40 ? [213, 233, 236] : [236, 244, 244]; if (Math.abs(d - 9) < 0.7 || Math.abs(d - 22) < 0.6 || Math.abs(d - 40) < 0.5) c = [112, 160, 172]; }
      else { c = { forest: [205, 214, 158], grassland: [240, 224, 170], mountains: [226, 199, 146], desert: [246, 234, 196], tundra: [226, 227, 208] }[kinds[v]]; const d = toSea[i]; if (d < 1.9) c = [40, 52, 60]; else if (d < 5) c = mix(c, [200, 170, 110], 0.4); }
      if (D.zone[((y / CELL) | 0) * W + ((x / CELL) | 0)] === 'europe') c = mix(c, [214, 190, 214], 0.35);
    } else {
      if (v === 255) { const ex = x % 192, ey = y % 192; c = mix([96, 112, 118], [116, 132, 136], noise(x / 8, y / 8)); void ex; void ey; }
      else { const s = (((y * 1.75) | 0) % 224) * 224 + (((x * 1.75) | 0) % 224), k = tex[kinds[v]]; c = [k[s * 4], k[s * 4 + 1], k[s * 4 + 2]]; }
      if (D.zone[((y / CELL) | 0) * W + ((x / CELL) | 0)] === 'europe') c = mix(c, [24, 30, 48], 0.45);
    }
    o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  if (style === 'chart') chartGlyphs(g);
  return canvas;
}
function chartGlyphs(g) {
  g.lineCap = 'round';
  for (let c = 0; c < W * W; c++) {
    if (!D.open[c] || D.terrain[c] === 'ocean') continue;
    const x0 = (c % W) * CELL, y0 = Math.floor(c / W) * CELL;
    for (let k = 0; k < 7; k++) {
      const x = x0 + 8 + rnd(c, k) * 48, y = y0 + 10 + rnd(k, c + 9) * 46;
      g.strokeStyle = '#4d5a44'; g.fillStyle = '#7f9462'; g.lineWidth = 1.1; g.beginPath();
      if (D.terrain[c] === 'forest') { g.arc(x, y, 4.2, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y + 8); g.stroke(); }
      else if (D.terrain[c] === 'mountains' && k < 4) { g.strokeStyle = '#6a5134'; g.moveTo(x - 9, y + 7); g.lineTo(x, y - 8); g.lineTo(x + 9, y + 7); for (let h = 1; h < 4; h++) { g.moveTo(x + h * 2, y - 8 + h * 4); g.lineTo(x + h * 2 - 2, y + 5); } g.stroke(); }
      else if (D.terrain[c] === 'grassland' && k < 4) { g.strokeStyle = '#9a8a4e'; g.moveTo(x - 3, y); g.lineTo(x - 4, y - 5); g.moveTo(x, y); g.lineTo(x, y - 6); g.moveTo(x + 3, y); g.lineTo(x + 4, y - 5); g.stroke(); }
      else if (D.terrain[c] === 'desert') { g.fillStyle = '#b79a55'; g.arc(x, y, 1.1, 0, 7); g.fill(); }
      else if (D.terrain[c] === 'tundra' && k < 5) { g.strokeStyle = '#8a9088'; g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.stroke(); }
    }
  }
}
/* Cloth texture and shadow for nation emblems: white charge on the nation's colour. */
const DEFS = '<defs><pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 .5H4M0 2.5H4" stroke="#fff" stroke-opacity=".1"/><path d="M.5 0V4M2.5 0V4" stroke="#000" stroke-opacity=".13"/></pattern><filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="#000" flood-opacity=".55"/></filter></defs>';
const roundel = (x, y, p, s, r = s / 2) => `<g><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${D.players[p].color}"/><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="url(#weave)" stroke="#fff" stroke-width="${Math.max(1.5, s / 14)}"/><image filter="url(#lift)" href="${art.emblem(D.players[p].nation)}" x="${x + s * 0.14}" y="${y + s * 0.14}" width="${s * 0.72}" height="${s * 0.72}"/></g>`;
/* Markers over the map, as SVG in map pixels. */
const at = (c) => [(c % W) * CELL, Math.floor(c / W) * CELL];
function overlay(opts) {
  const { card, action, sel, skin } = opts, out = [], ink = skin === 'chart' ? '#28343c' : '#fff8e6', hot = { chart: '#b0126b', painted: '#ffd75e', tile: '#ffffff' }[skin];
  const N = W * CELL;
  out.push(DEFS);
  if (skin !== 'tile') for (let i = 2; i <= 14; i++) out.push(`<path d="M${i * CELL} ${2 * CELL}V${14 * CELL}M${2 * CELL} ${i * CELL}H${14 * CELL}" stroke="${skin === 'chart' ? '#6f8790' : '#ffffff'}" stroke-opacity="${i % 3 === 2 ? 0.32 : 0.13}"/>`);
  else for (let i = 0; i <= 16; i++) out.push(`<path d="M${i * CELL} 0V${N}M0 ${i * CELL}H${N}" stroke="#101820" stroke-opacity="${i >= 2 && i <= 14 && (i - 2) % 3 === 0 ? 0.75 : 0.22}" stroke-width="${i >= 2 && i <= 14 && (i - 2) % 3 === 0 ? 3 : 1}"/>`);
  const small = (x, y, n, s = 20) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 24 24">${SHAPES[n]}</svg>`;
  D.bonus.forEach((b, c) => { if (!b) return; const [x, y] = at(c); out.push(`<g><circle cx="${x + 51}" cy="${y + 13}" r="12" fill="${skin === 'chart' ? '#fffdf4' : '#10262c'}" fill-opacity="${skin === 'chart' ? 0.95 : 0.6}" stroke="${ink}" stroke-opacity=".5"/>${small(x + 42, y + 4, { corn: 'food', leaf: 'crops' }[b] || b, 18)}</g>`); });
  for (const [c, k] of Object.entries(D.poi)) { const [x, y] = at(+c); out.push(k === 'ruin' ? `<path d="M${x + 18} ${y + 46}V${y + 28}h6v18m8 0V${y + 28}h6v18m8 0V${y + 28}h-4M${x + 14} ${y + 28}h36v-6h-36Z" fill="${skin === 'chart' ? 'none' : '#e8dfc8'}" stroke="${skin === 'chart' ? ink : '#3a3326'}" stroke-width="2"/>` : `<path d="M${x + 14} ${y + 40}q18 12 36 0l-5-9-13 4-11-6Zm14-8 4-16 3 15" fill="${skin === 'chart' ? 'none' : '#8a6a45'}" stroke="${skin === 'chart' ? ink : '#2b1d10'}" stroke-width="2"/>`); }
  const tg = targets(card, action);
  for (const [c, n] of Object.entries(tg)) { const [x, y] = at(+c); if (action === 'moveShip' || action === 'moveInfantry') { out.push(`<circle cx="${x + 32}" cy="${y + 32}" r="${8 + n * 1.6}" fill="${hot}" fill-opacity="${skin === 'chart' ? 0.5 : 0.7}" stroke="${skin === 'chart' ? '#fff' : '#12262c'}" stroke-opacity=".5"/><text x="${x + 32}" y="${y + 37}" text-anchor="middle" font-size="14" font-weight="700" fill="${skin === 'chart' ? '#fff' : '#12262c'}">${n}</text>`); continue; } out.push(`<rect x="${x + 4}" y="${y + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="${skin === 'tile' ? 2 : 10}" fill="${hot}" fill-opacity="${skin === 'chart' ? 0.14 : 0.2}" stroke="${hot}" stroke-width="${skin === 'chart' ? 2 : 3}" ${skin === 'chart' ? 'stroke-dasharray="6 4"' : ''}/>`); if (n !== '' && n !== undefined && n > 0) out.push(`<text x="${x + 10}" y="${y + 56}" font-size="17" font-weight="700" fill="${skin === 'chart' ? hot : '#fff'}" stroke="${skin === 'chart' ? '#fff' : '#12262c'}" stroke-width="3.500" paint-order="stroke">${action === 'produce' ? '+' : ''}${n}</text>`); }
  for (const x of D.settlements) if (x.alive) {
    const [a, b] = at(x.cell), col = x.hostility >= 4 ? '#c8442f' : x.hostility === 3 ? '#c98f2a' : '#4c8a57';
    out.push(`<g><path d="M${a + 32} ${b + 8}L${a + 10} ${b + 50}h44Z" fill="${skin === 'chart' ? '#fffaf0' : '#f2e2bf'}" stroke="${skin === 'chart' ? ink : '#4a3418'}" stroke-width="2.500"/><path d="M${a + 32} ${b + 26}l-9 24h18Z" fill="${skin === 'chart' ? ink : '#4a3418'}"/><path d="M${a + 28} ${b + 2}l4 8 4-8" stroke="${skin === 'chart' ? ink : '#4a3418'}" stroke-width="2.500" fill="none"/><circle cx="${a + 52}" cy="${b + 50}" r="11" fill="${col}" stroke="#fff" stroke-width="2"/><text x="${a + 52}" y="${b + 55}" font-size="14" font-weight="700" text-anchor="middle" fill="#fff">${x.hostility}</text>${x.ally !== null ? `<circle cx="${a + 12}" cy="${b + 50}" r="8" fill="${D.players[x.ally].color}" stroke="#fff" stroke-width="2"/>` : ''}</g>`);
  }
  const flag = (x, y, p, s = 26) => roundel(x, y, p, s);
  for (const c of D.colonies) { const [a, b] = at(c.cell); out.push(`<g><path d="M${a + 8} ${b + 54}V${b + 34}l11-10 11 10v20Zm22 0V${b + 26}l13-12 13 12v28Z" fill="${skin === 'chart' ? '#fffdf6' : '#f6ead0'}" stroke="${skin === 'chart' ? ink : '#3a2a17'}" stroke-width="2.500"/><path d="M${a + 5} ${b + 35}l14-13 12 11m-4-5 16-16 17 16" fill="none" stroke="${skin === 'chart' ? D.players[c.owner].color : '#9c3f2c'}" stroke-width="4.500"/>${flag(a + 36, b + 32, c.owner, 24)}</g>`); }
  D.players.forEach((p, i) => {
    if (typeof p.ship === 'number') { const [a, b] = at(p.ship); out.push(`<g><path d="M${a + 8} ${b + 42}h48l-8 14H${a + 17}Z" fill="${skin === 'chart' ? '#fffdf6' : '#7a4e2b'}" stroke="${skin === 'chart' ? ink : '#2c1a0b'}" stroke-width="2.500"/><path d="M${a + 31} ${b + 41}V${b + 6}M${a + 34} ${b + 10}q20 8 16 26H${a + 34}Zm-6 4q-16 8-14 22h14Z" fill="#fffaf0" stroke="${skin === 'chart' ? ink : '#2c1a0b'}" stroke-width="2"/>${flag(a + 32, b + 15, i, 20)}</g>`); }
    if (typeof p.inf === 'number') { const [a, b] = at(p.inf), small = colonyAt(p.inf); out.push(`<g${small ? ` transform="translate(${a - 4} ${b + 24}) scale(.62) translate(${-a} ${-b})"` : ''}><path d="M${a + 14} ${b + 12}h36v20q0 18-18 26-18-8-18-26Z" fill="${p.color}"/><path d="M${a + 14} ${b + 12}h36v20q0 18-18 26-18-8-18-26Z" fill="url(#weave)" stroke="#fff" stroke-width="3"/><image filter="url(#lift)" href="${art.emblem(p.nation)}" x="${a + 19}" y="${b + 16}" width="26" height="26"/></g>`); }
  });
  if (sel !== null && sel !== undefined) { const [a, b] = at(sel); out.push(`<rect x="${a + 2}" y="${b + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="${skin === 'tile' ? 0 : 12}" fill="none" stroke="${hot}" stroke-width="4"/>`); }
  return out.join('');
}
/** Pan and zoom a map stage. */
function stage(el, { zoom = 1, center = null, min = 0.45, max = 2.2, onCell, onMove, plane = false }) {
  const inner = el.querySelector('.map-inner'); let z = zoom, x = 0, y = 0, drag = null, moved = 0;
  // A tilted plane moves by its transform alone, so nothing is painted again. `un` goes from the screen to the flat stage, `proj` back with the local scale.
  const T = { a: 0, d: 1500, up: 0 }, box = plane ? { left: 0, top: 0 } : null, R = () => { if (!box) return el.getBoundingClientRect(); box.width = innerWidth; box.height = innerHeight; return box; };
  const un = (cx, cy) => { const r = R(), w = r.width / 2, h = r.height / 2, sx = cx - r.left - w, sy = cy - r.top - h - T.up, c = Math.cos(T.a), s = Math.sin(T.a), py = (sy * T.d) / (T.d * c + sy * s), k = T.d / (T.d - py * s); return [w + sx / k, h + py]; };
  const proj = (px, py) => { const r = R(), w = r.width / 2, h = r.height / 2, v = py - h, k = T.d / (T.d - v * Math.sin(T.a)); return [r.left + w + (px - w) * k, r.top + h + v * Math.cos(T.a) * k + T.up, k * z]; };
  const cell = (cx, cy) => { const [a, b] = un(cx, cy), i = Math.floor((a - x) / z / CELL), j = Math.floor((b - y) / z / CELL); return i >= 0 && j >= 0 && i < W && j < W ? j * W + i : null; };
  const tilt = (deg, d = 1500, up = 0) => { T.a = (deg * Math.PI) / 180; T.d = d; T.up = up; put(); };
  const put = () => {
    if (!plane) inner.style.transform = `translate(${x}px,${y}px) scale(${z})`;
    else { const w = innerWidth / 2, h = innerHeight / 2; inner.style.transform = `translate(${w}px,${h + T.up}px) perspective(${T.d}px) rotateX(${T.a}rad) translate(${x - w}px,${y - h}px) scale(${z})`; }
    onMove?.();
  };
  const look = (c) => { const [a, b] = at(c), r = R(); x = r.width / 2 - (a + 32) * z; y = r.height / 2 - (b + 32) * z; put(); };
  el.addEventListener('wheel', (e) => { e.preventDefault(); const [mx, my] = un(e.clientX, e.clientY), n = Math.min(max, Math.max(min, z * Math.exp(-e.deltaY * 0.0015))); x = mx - ((mx - x) * n) / z; y = my - ((my - y) * n) / z; z = n; put(); }, { passive: false });
  el.addEventListener('pointerdown', (e) => { const [a, b] = un(e.clientX, e.clientY); drag = [a - x, b - y, e.clientX, e.clientY]; moved = 0; });
  window.addEventListener('pointermove', (e) => { if (!drag) return; moved = Math.max(moved, Math.abs(e.clientX - drag[2]) + Math.abs(e.clientY - drag[3])); if (moved > 5) { const [a, b] = un(e.clientX, e.clientY); x = a - drag[0]; y = b - drag[1]; put(); } });
  window.addEventListener('pointerup', () => { drag = null; });
  el.addEventListener('click', (e) => { if (moved > 5) return; const c = cell(e.clientX, e.clientY); if (c !== null) onCell(c); });
  const fit = () => { const r = R(); z = Math.min(r.width, r.height) / (W * CELL); x = (r.width - W * CELL * z) / 2; y = (r.height - W * CELL * z) / 2; put(); };
  if (center !== null) look(center); else fit();
  const frame = (x0, y0, x1, y1, pad = [0, 0, 0, 0]) => { const r = R(), w = r.width - pad[1] - pad[3], h = r.height - pad[0] - pad[2]; z = Math.min(max, Math.max(min, Math.min(w / (x1 - x0), h / (y1 - y0)))); x = pad[3] + w / 2 - ((x0 + x1) / 2) * z; y = pad[0] + h / 2 - ((y0 + y1) / 2) * z; put(); };
  return { tilt, cell, point: (mx, my) => proj(x + mx * z, y + my * z), frame, get: () => [x, y, z], set: (v) => { [x, y, z] = v; put(); }, look, fit, zoomBy: (k) => { const r = R(), n = Math.min(max, Math.max(min, z * k)); x = r.width / 2 - ((r.width / 2 - x) * n) / z; y = r.height / 2 - ((r.height / 2 - y) * n) / z; z = n; put(); } };
}
/** One line of the chronicle. */
function logLine(e) {
  const who = e.p === undefined ? '' : `<b style="--c:${D.players[e.p].color}" class="who">${pick(D.names.nations[D.players[e.p].nation])}</b> `;
  const A = (k) => pick(ACT[k] || [k, k]).toLowerCase();
  if (e.e === 'play') return `${who}${pick(D.agents[e.card])}: ${A(e.a)}`;
  if (e.e === 'event') return `<em>${pick(D.names.events[e.id])}</em>`;
  if (e.e === 'build') return `${who}${pick(['built', 'строит'])}: ${pick(D.buildings[e.building])}`;
  if (e.e === 'found') return `${who}${pick(['founded a colony', 'основывает колонию'])}`;
  if (e.e === 'raid') return `${who}${pick(['raided by natives', 'набег индейцев'])}`;
  if (e.e === 'tax') return `${who}${e.pay ? pick(['paid the tax', 'платит налог']) : pick(['refused the tax', 'отказ от налога'])} (${e.rate})`;
  if (e.e === 'father') return `${who}${pick(D.fathers[e.father])}`;
  if (e.e === 'hire') return `${who}${pick(['hired', 'нанимает'])}: ${pick(D.agents[e.agent])}`;
  if (e.e === 'reveal') return `${who}${pick(['charted new waters', 'открывает карту'])}`;
  if (e.e === 'poi') return `${who}${pick(['explored', 'исследует'])}: ${e.deck === 'ruin' ? t('ruin') : t('wreck')}`;
  if (e.e === 'sell') return `${who}${pick(['sold', 'продаёт'])} ${e.n} ${icon(e.r, 14)} × ${e.price}`;
  return '';
}
window.Core = { D, W, CELL, me, P, pick, t, T, ACT, GROUPS, RES, ICON_RES, why, agent, art, icon, eduIcon, traits, roundel, DEFS, nbs, noise, rnd, textures, at, SHAPES, optionsOf, describe, targets, reach, points, tokenAt, colonyAt, settlementAt, drawMap, overlay, stage, logLine, spread, lang };
})();
