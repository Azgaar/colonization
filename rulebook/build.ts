/**
 * The rulebook, Russian and English, built from the rules (`rules/`, compiled by `pnpm rules:build`).
 * Sources: rulebook/src/<lang>.html. Every number of the rules is written there as `<rv p="settings.tax.track"></rv>` (or a computed key, see VALUES),
 * and every generated part as `<rv-table of="agents"></rv-table>`; this fills them in and stops on anything it does not know, so no value is typed by hand.
 * Symbols are written as emoji in the sources and card texts, and drawn here as the game's own icons (packages/web/src/shapes.ts).
 * Output: rulebook/dist/<lang>.html, opened in a browser and printed from there (rulebook.css sets the pages).
 * Usage: pnpm rulebook [en|ru]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadRuleset, getPath, type GameDef } from '../packages/data/src/index.ts';
import texts from '../packages/data/generated/texts.json' with { type: 'json' };
import en from '../packages/web/locales/en.json' with { type: 'json' };
import { SHAPES } from '../packages/web/src/shapes.ts';
import { describe, RES } from './describe.ts';
import { ornamentsCss } from './ornaments.ts';
import rulings from './rulings.json' with { type: 'json' };

type Lang = 'en' | 'ru';
const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const R: GameDef = loadRuleset('board');
const S = R.settings;
const D = describe(R);
const PRINTED = texts as Record<string, string>, EN = en as Record<string, string>;
const ART = '../../packages/web/art';
const EDU = ['🚫', '📖', '🎓'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const name = (x: { en: string; ru: string }, l: Lang) => esc(cap(l === 'ru' ? x.ru : x.en));
const L = (l: Lang, e: string, r: string) => (l === 'ru' ? r : e);
const year = (round: number) => S.rounds.firstYear + (round - 1) * S.rounds.yearStep;
const count = <T>(o: Record<string, T>, f: (x: T) => boolean = () => true) => Object.values(o).filter(f).length;
const sum = <T>(o: Record<string, T>, f: (x: T) => number) => Object.values(o).reduce((n, x) => n + f(x), 0);

/* ---- the game's icons in place of the emoji ---- */
const EXTRA: Record<string, string> = {
  skull: '<path d="M12 2.5c-5 0-8.5 3.4-8.5 8 0 2.6 1.2 4.6 3 5.8V20c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5v-3.7c1.8-1.2 3-3.2 3-5.8 0-4.6-3.5-8-8.5-8Z" fill="#e9e3d6" stroke="#2a2a2a" stroke-width=".8"/><circle cx="8.6" cy="11.2" r="2.2" fill="#2a2a2a"/><circle cx="15.4" cy="11.2" r="2.2" fill="#2a2a2a"/><path d="M12 13.6l-1.3 2.4h2.6Z" fill="#2a2a2a"/><path d="M9.5 18.2v3M12 18.2v3M14.5 18.2v3" stroke="#2a2a2a" stroke-width="1"/>',
  cube: '<path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4Z" fill="#2b2b2b"/><path d="M4 7.5 12 11.5l8-4M12 11.5v9" stroke="#777" stroke-width="1.1" fill="none"/>',
  hut: '<path d="M12 2.5 2.5 21h19Z" fill="#b98152"/><path d="M12 2.5 9.4 7.6M12 2.5l2.6 5.1" stroke="#6e4527" stroke-width="1.6" stroke-linecap="round"/><path d="M12 12.5 9.2 21h5.6Z" fill="#5a3820"/>',
  tools: '<path d="M14.5 3.2a5 5 0 0 0-5.9 6.6L3 15.4a2 2 0 0 0 2.8 2.8l5.6-5.6a5 5 0 0 0 6.6-5.9l-3 3-2.5-.7-.7-2.5Z" fill="currentColor"/>',
};
const SHAPE = (k: string) => SHAPES[k] ?? EXTRA[k] ?? '';
const EMOJI: [string, string][] = Object.entries({
  '🟡': 'gold', '🔔': 'bells', '✝️': 'crosses', '✝': 'crosses', '🟥': 'ref', '🟨': 'food', '🟫': 'timber', '🟩': 'crops', '🟦': 'goods', '⬜': 'silver',
  '🐟': 'fish', '🪵': 'timber', '🍂': 'crops', '🦫': 'fur', '📦': 'goods', '🪙': 'silver', '⚔️': 'sword', '⚔': 'sword', '💢': 'anger', '📖': 'book', '🎓': 'cap', '🚫': 'bar',
  '👨🏻‍🌾': 'bar', '💨': 'move', '🎲': 'die', '⛵': 'ship', '💂': 'infantry', '👥': 'people', '🏘️': 'house', '🏛️': 'father', '💀': 'skull', '⬛': 'cube', '🛖': 'hut',
  '🛠️': 'tools', '🛠': 'tools', '🏅': 'vp',
}).sort((a, b) => b[0].length - a[0].length);
const EMOJI_RE = new RegExp(EMOJI.map(([e]) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
const EMOJI_KEY = new Map(EMOJI);
const svg = (k: string) => `<svg class="ic ic-${k}" viewBox="0 0 24 24" aria-hidden="true">${SHAPE(k)}</svg>`;
/** The emoji of a text drawn as the game's icons; also the game texts' {icon} tokens and "N ПО" (victory points). */
const iconize = (html: string) => html
  .replace(/(\d) ПО(?![А-Яа-я])/g, '$1 🏅')
  .replace(/\{(\w+)\}/g, (m, k: string) => (k === 'vp' ? '🏅' : SHAPE(k) ? `⁣${k}⁣` : m))
  .replace(EMOJI_RE, (e) => svg(EMOJI_KEY.get(e)!))
  .replace(/⁣(\w+)⁣/g, (_, k: string) => svg(k))
  .replace(/️/g, '');

/** A card's printed Russian text: options (➥) as a list, rolls (🎲) under their option, " / " between steps. */
function printed(s: string | undefined): string {
  if (!s) return '';
  const head: string[] = [], items: string[] = [];
  for (const raw of s.split('\n')) {
    const x = raw.trim();
    if (!x) continue;
    if (x.startsWith('➥')) { const t = x.slice(1).trim(), m = /^([^:(]+?)(\s*\([^)]*\))?\s*:\s*(.*)$/.exec(t); items.push(m ? `<b>${m[1]}</b>${m[2] ? ` <span class="cost">${m[2].trim()}</span>` : ''}${m[3] ? `: ${m[3]}` : ''}` : `<b>${t}</b>`); }
    else if (x.startsWith('🎲') && items.length) items[items.length - 1] += `<span class="rolls"><span>${x}</span></span>`;
    else head.push(x);
  }
  const steps = head.join(' ').split(/\s?\/\s/).map((p) => p.trim()).filter(Boolean);
  return `${steps.length ? `<p>${steps.map((p) => `<span>${p}</span>`).join('')}</p>` : ''}${items.length ? `<ul class="opts">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : ''}`;
}

/* ---- values that are not a single path of the rules ---- */
const VALUES: Record<string, () => string | number> = {
  'year.first': () => S.rounds.firstYear,
  'year.last': () => year(S.rounds.max),
  'year.step': () => S.rounds.yearStep,
  'tiles.total': () => R.tiles.length,
  'tiles.used': () => S.map.size ** 2,
  'map.cells': () => S.map.size * 3,
  'agents.common': () => sum(R.agents, (a) => (a.kind === 'common' ? a.copies : 0)),
  'agents.nation': () => sum(R.agents, (a) => (a.kind === 'nation' ? a.copies : 0)),
  'agents.native': () => sum(R.agents, (a) => (a.kind === 'native' ? a.copies : 0)),
  'agents.types': () => count(R.agents, (a) => a.kind === 'common'),
  'nations.count': () => count(R.nations),
  'deck.min': () => Math.min(...Object.values(R.nations).map((n) => n.deck.length)),
  'deck.max': () => Math.max(...Object.values(R.nations).map((n) => n.deck.length)),
  'buildings.basic': () => count(R.buildings, (b) => !b.improvement),
  'buildings.improvements': () => count(R.buildings, (b) => b.improvement),
  'buildings.basicCopies': () => Object.values(R.buildings).find((b) => !b.improvement)!.copies,
  'warehouse.full': () => S.warehouse.base + (R.buildings.warehouse?.storage ?? 0),
  'fathers.count': () => count(R.fathers),
  'events.count': () => count(R.events),
  'ruins.count': () => count(R.ruins),
  'wrecks.count': () => count(R.wrecks),
  'tactics.count': () => count(R.tactics),
  'tribes.count': () => count(R.tribes),
  'success': () => S.combat.successFaces.join(' and '),
  'success.ru': () => S.combat.successFaces.join(' и '),
  'tax.track': () => S.tax.track.join(' · '),
  'tax.first': () => S.tax.track.findIndex((x) => x > 0) + 1,
  'tax.round4': () => S.tax.track[3]!,
  'hostility.calm': () => S.activation.giftMaxHostility + 1,
  'hostility.raidFrom': () => S.activation.raidMinHostility,
};
function value(p: string): string {
  if (VALUES[p]) return String(VALUES[p]!());
  let v: unknown;
  try { v = getPath(R, p); } catch { throw new Error(`<rv p="${p}">: no such value in the rules`); }
  if (v === undefined) throw new Error(`<rv p="${p}">: no such value in the rules`);
  if (Array.isArray(v)) return v.join(' · ');
  if (typeof v === 'object' && v) throw new Error(`<rv p="${p}">: a group of values, not one`);
  return String(v);
}

/* ---- generated parts: card references, tables, the map ---- */
type Card = { id: string; en: string; ru: string; flavor?: string };
const img = (src: string, cls = 'face') => `<img class="${cls}" src="${src}" alt="">`;
const agentArt = (base: string) => `${ART}/agent/${base}.webp`;
const fatherArt = (id: string) => `${ART}/father/${id === 'benedict_arnold' ? 'edward_colston' : id}.webp`;
const buildingArt = (id: string) => `${ART}/building/${id === 'blacksmith_shop' ? 'blacksmiths_shop' : id}.webp`;
const entry = (pic: string, title: string, meta: string, body: string, cls = '') => `<div class="entry${cls ? ` ${cls}` : ''}">${pic}<div><h4><span>${title}</span>${meta ? `<small>${meta}</small>` : ''}</h4>${body}</div></div>`;
const talent = (a: GameDef['agents'][string], l: Lang) => { const t = l === 'ru' ? cap(PRINTED[`agent.${a.base}`] ?? '') : D.talent(a.mods); return `<p>${t ? stop(t) : L(l, 'No talent.', 'Без свойства.')}</p>`; };
/** A sentence closed with a full stop, unless it already ends in one. */
const stop = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const agentEntry = (a: GameDef['agents'][string], l: Lang, meta: string) => entry(img(agentArt(a.base)), `${name(a, l)} ${EDU[a.edu]}`, meta, talent(a, l) + ruling(`agent.${a.base}`, l));
const copies = (n: number, l: Lang) => L(l, `${n} ${n === 1 ? 'card' : 'cards'}`, `${n} ${n === 1 ? 'карта' : n < 5 ? 'карты' : 'карт'}`);
const emblem = (n: GameDef['nations'][string]) => `<span class="emblem" style="--c:${n.color}"><img src="${ART}/emblem/${n.id}.svg" alt=""></span>`;
/** A card's story line: the printed Russian one (rules/), or its English in the game's locale (`flavor.<kind>.<id>`). */
const flavor = (c: Card, l: Lang, kind: string) => { if (!c.flavor) return ''; const t = l === 'ru' ? c.flavor : EN[`flavor.${kind}.${c.id}`]; if (!t) throw new Error(`en.json: no flavor.${kind}.${c.id}`); return `<p class="flav">${esc(t)}</p>`; };
/** How a card works in full (rulebook/rulings.json, keyed "<kind>.<id>", English and Russian): printed under the card's own text in the reference. */
const RULINGS = rulings as Record<string, { en: string; ru: string }>;
const usedRulings = new Set<string>();
const ruling = (key: string, l: Lang) => { const r = RULINGS[key]; if (!r) return ''; usedRulings.add(key); if (!r[l]) throw new Error(`rulings.json: "${key}" has no ${l} text`); return `<p class="ruling">${r[l]}</p>`; };

const TABLES: Record<string, (l: Lang) => string> = {
  resources: (l) => {
    const from: Record<string, [string, string]> = { food: ['fishing the 🐟 ocean', 'рыбалка в 🐟 океане'], timber: ['🪵 forest', '🪵 лес'], crops: ['🍂 grassland, and 🦫 fur', '🍂 луг, а также 🦫 мех'], goods: ['made from 🟩 in a workshop', 'делают из 🟩 в мастерской'], silver: ['🪙 mountains', '🪙 горы'] };
    return `<table class="res"><thead><tr><th>${L(l, 'Resource', 'Ресурс')}</th><th>${L(l, 'From', 'Откуда')}</th><th>${L(l, 'Start price', 'Начальная цена')}</th></tr></thead><tbody>${Object.values(R.resources).map((r) => `<tr><td>${RES[r.id]} <b>${name(r, l)}</b></td><td>${L(l, ...(from[r.id] ?? ['', '']))}</td><td>${r.price} 🟡</td></tr>`).join('')}</tbody></table>`;
  },
  terrain: (l) => { const give: Record<string, string> = { fish: '🟨', timber: '🟫', leaf: '🟩', silver: '⬜' }; return `<table class="terrain"><thead><tr><th>${L(l, 'Terrain', 'Местность')}</th><th>${L(l, 'Gives', 'Даёт')}</th><th>${L(l, 'To enter', 'Вход')}</th><th>${L(l, 'Defence', 'Защита')}</th></tr></thead><tbody>${Object.values(R.terrain).map((t) => `<tr><td><b>${name(t, l)}</b></td><td>${t.yields.map((y) => give[y] ?? y).join(' ') || '—'}</td><td>${t.move === 'all' ? L(l, 'all 💨 left, at least 1', 'все оставшиеся 💨, не меньше 1') : `${t.move} 💨`}</td><td>${t.defence ? `+${t.defence} ⚔️` : '—'}</td></tr>`).join('')}</tbody></table>`; },
  components: (l) => { const li = (n: string | number, e: string, r: string) => `<li><b>${n}</b> ${L(l, e, r)}</li>`; return `<ul class="components">${[
    li(R.tiles.length, 'map tiles of 3 × 3 cells', 'фрагментов карты по 3 × 3 клетки'),
    li(VALUES['agents.common']!(), `common agent cards, ${VALUES['agents.types']!()} professions`, `карт общих агентов, ${VALUES['agents.types']!()} профессий`),
    li(VALUES['agents.nation']!(), `nation agent cards: the starting decks of ${count(R.nations)} nations`, `карт агентов наций: стартовые колоды ${count(R.nations)} наций`),
    li(VALUES['agents.native']!(), 'native agent cards', 'карт агентов-индейцев'),
    li(sum(R.buildings, (b) => b.copies), `building cards: ${count(R.buildings, (b) => !b.improvement)} basic buildings, ${VALUES['buildings.basicCopies']!()} of each, and ${count(R.buildings, (b) => b.improvement)} improvements`, `карт построек: ${count(R.buildings, (b) => !b.improvement)} базовых, по ${VALUES['buildings.basicCopies']!()} каждой, и ${count(R.buildings, (b) => b.improvement)} улучшений`),
    li(count(R.fathers), 'Founding Father cards', 'карты Отцов-основателей'),
    li(count(R.events), 'event cards', 'карты событий'),
    li(count(R.ruins), 'ruin cards', 'карт руин'),
    li(count(R.wrecks), 'wreck cards', 'карт кораблекрушений'),
    li(count(R.tactics), 'King’s tactic cards', 'карт тактики Короля'),
    li(sum(R.tribes, (t) => t.copies), `tribe cards (${count(R.tribes)} tribes) with settlement markers`, `карт племён (${count(R.tribes)} племён) с маркерами поселений`),
    li(count(R.nations), 'nation boards, each with a ⛵ ship, a 💂 pawn and colony markers in its colour', 'планшетов наций, у каждой ⛵ корабль, 💂 пешка и маркеры колоний своего цвета'),
    `<li>${L(l, 'The Europe board: the round, tax and price tracks, the pier, the salon and the barracks', 'Планшет Европы: треки тура, налога и цен, причал, салон и казармы')}</li>`,
    `<li>${L(l, 'Resource cubes in five colours, 🟨 🟫 🟩 🟦 ⬜; red cubes 🟥 for the Royal Army; black cubes ⬛ for population, fighters and markers', 'Кубики ресурсов пяти цветов, 🟨 🟫 🟩 🟦 ⬜; красные кубики 🟥 для королевской армии; чёрные кубики ⬛ для населения, бойцов и отметок')}</li>`,
    `<li>${L(l, 'Gold 🟡, bell 🔔 and cross ✝️ tokens; six dice 🎲', 'Жетоны золота 🟡, колоколов 🔔 и крестов ✝️; шесть кубиков 🎲')}</li>`,
  ].join('')}</ul>`; },
  /** The table at setup: the Europe ring, the open sea ring, the map's tiles face down. */
  map: (l) => {
    const e = S.ring.europe, o = S.ring.openSea, t = S.map.size, n = t * 3 + 2 * (e + o), c: string[] = [], g: string[] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const d = Math.min(x, y, n - 1 - x, n - 1 - y); c.push(`<rect x="${x}" y="${y}" width="1" height="1" class="${d < e ? 'eu' : d < e + o ? 'sea' : 'tile'}"/>`); }
    for (let i = 0; i <= t; i++) { const p = e + o + i * 3; g.push(`M${p} ${e + o}V${n - e - o}M${e + o} ${p}H${n - e - o}`); }
    return `<figure class="map"><svg viewBox="-.1 -.1 ${n + 0.2} ${n + 0.2}">${c.join('')}<path class="grid" d="${g.join('')}"/><path class="north" d="M${n / 2} ${e + o + 0.5}l-.7 1.3h1.4Z"/></svg><figcaption><span><i class="k eu"></i>${L(l, 'Europe', 'Европа')}</span><span><i class="k sea"></i>${L(l, 'open sea', 'открытое море')}</span><span><i class="k tile"></i>${L(l, `${t * t} tiles face down`, `${t * t} фрагментов рубашкой вверх`)}</span></figcaption></figure>`;
  },
  nations: (l) => `<div class="cards two">${Object.values(R.nations).sort((a, b) => a.stars - b.stars || a.en.localeCompare(b.en)).map((n) => {
    const own = n.deck.map((id) => R.agents[id]!).find((a) => a.unique);
    const deck = n.deck.map((id) => R.agents[id]!).filter((a) => !a.unique).map((a) => name(a, l)).join(', ');
    return `<div class="entry nation">${img(`${ART}/nation/${n.id}.webp`, 'art')}<div><h4><span>${emblem(n)} ${name(n, l)}</span><small class="stars" title="${n.stars}">${'★'.repeat(n.stars)}<i>${'★'.repeat(5 - n.stars)}</i></small></h4><p><b>${L(l, 'Starting agents', 'Стартовые агенты')}:</b> ${own ? `${name(own, l)}, ` : ''}${deck}.</p>${own ? `<p class="own">${img(agentArt(own.base))}<span><b>${name(own, l)}</b> ${EDU[own.edu]}, ${L(l, 'the nation’s own agent', 'особый агент нации')}: ${stop(l === 'ru' ? PRINTED[`agent.${own.base}`] ?? '' : D.talent(own.mods))}</span></p>` : ''}</div></div>`;
  }).join('')}</div>`,
  agents: (l) => `<div class="cards">${Object.values(R.agents).filter((a) => a.kind === 'common').sort((a, b) => (a.price ?? 0) - (b.price ?? 0) || name(a, l).localeCompare(name(b, l), l)).map((a) => agentEntry(a, l, `${a.price} 🟡 · ${copies(a.copies, l)}`)).join('')}</div>`,
  nationAgents: (l) => `<div class="cards">${Object.values(R.agents).filter((a) => a.unique).sort((a, b) => name(a, l).localeCompare(name(b, l), l)).map((a) => agentEntry(a, l, name(R.nations[a.nation!]!, l))).join('')}</div>`,
  nativeAgents: (l) => `<div class="cards">${Object.values(R.agents).filter((a) => a.kind === 'native').map((a) => agentEntry(a, l, copies(a.copies, l))).join('')}</div>`,
  buildings: (l) => `<div class="cards">${Object.values(R.buildings).sort((a, b) => Number(a.improvement) - Number(b.improvement) || a.timber - b.timber).map((b) => entry(img(buildingArt(b.id), 'art'), name(b, l), `${b.timber} 🟫 · ${b.work ? `${L(l, 'worker', 'работник')} ${EDU[b.edu]}` : L(l, 'no worker', 'без работника')}`, `<p>${l === 'ru' ? PRINTED[`building.${b.id}`] ?? '' : `${D.work(b)}.`}</p>${b.requires ? `<p class="req">${L(l, 'Needs', 'Требует')}: ${name(R.buildings[b.requires]!, l)}. ${L(l, 'Only one', 'Только одна')}.</p>` : ''}${ruling(`building.${b.id}`, l)}`, b.improvement ? 'imp' : '')).join('')}</div>`,
  fathers: (l) => `<div class="cards">${Object.values(R.fathers).sort((a, b) => a.bells - b.bells || name(a, l).localeCompare(name(b, l), l)).map((f) => entry(img(fatherArt(f.id)), name(f, l), `${f.bells} 🔔`, `${flavor(f as Card, l, 'father')}<p>${stop(l === 'ru' ? PRINTED[`father.${f.id}`] ?? '' : esc(EN[`father.${f.id}`] ?? ''))}</p>${ruling(`father.${f.id}`, l)}`)).join('')}</div>`,
  events: (l) => `<div class="cards">${Object.values(R.events).map((e) => entry(img(`${ART}/event/${e.id}.webp`, 'art'), name(e, l), '', (l === 'ru' ? `${flavor(e as Card, l, 'event')}${printed(PRINTED[`event.${e.id}`])}` : `${flavor(e as Card, l, 'event')}<p>${D.event(e as never)}</p>`) + ruling(`event.${e.id}`, l), 'event')).join('')}</div>`,
  ruins: (l) => poiCards(R.ruins, 'ruin', l),
  wrecks: (l) => poiCards(R.wrecks, 'wreck', l),
  tribes: (l) => `<div class="cards">${Object.values(R.tribes).sort((a, b) => a.terrain.localeCompare(b.terrain) || a.en.localeCompare(b.en)).map((t) => { const loot = t.loot as { gold?: number; res?: string; amount?: number }; return entry(img(`${ART}/tribe/${t.id}.webp`), name(t, l), name(R.terrain[t.terrain]!, l), `<p class="stats"><span>👥 ${t.population}</span><span>💢 ${t.hostility}</span><span>${L(l, 'loot', 'добыча')} ${loot.gold ? `${loot.gold} 🟡` : `${loot.amount} ${RES[loot.res!]}`}</span><span>${copies(t.copies, l)}</span></p>${ruling(`tribe.${t.id}`, l)}`); }).join('')}</div>`,
  tactics: (l) => `<div class="cards">${Object.values(R.tactics).map((t) => entry('', name(t, l), '', `<p>${l === 'ru' ? PRINTED[`tactic.${t.id}`] ?? '' : D.tactic(t)}</p>${ruling(`tactic.${t.id}`, l)}`, 'plain')).join('')}</div>`,
  symbols: (l) => { const rows: [string, string, string][] = [
    ['🟡', 'gold', 'золото'], ['🔔', 'bells', 'колокола'], ['✝️', 'crosses', 'кресты'], ['🟥', 'the Royal Army', 'королевская армия'],
    ['🟨', 'food, from fish', 'еда, из рыбы'], ['🟫', 'timber', 'древесина'], ['🟩', 'crops, from leaf', 'сырьё, из листьев'], ['🦫', 'fur, counts as crops', 'мех, считается сырьём'], ['🟦', 'goods', 'товары'], ['⬜', 'silver', 'серебро'],
    ['⚔️', 'fighting strength', 'боевая сила'], ['💨', 'movement points', 'очки передвижения'], ['⛵', 'ship', 'корабль'], ['💂', 'pawn', 'пешка'],
    ['🛖', 'native settlement', 'поселение индейцев'], ['👥', 'population', 'население'], ['💢', 'hostility', 'враждебность'], ['⬛', 'black cube', 'чёрный кубик'],
    ['💀', 'danger, a scout ignores it', 'опасность, скаут её игнорирует'], ['🎲', 'die', 'кубик'], ['🏅', 'victory points', 'победные очки'],
    ['🚫', 'no education', 'без образования'], ['📖', 'basic education', 'базовое образование'], ['🎓', 'higher education', 'высшее образование'],
  ]; return `<dl class="symbols">${rows.map(([i, e, r]) => `<div><dt>${i}</dt><dd>${L(l, e, r)}</dd></div>`).join('')}</dl>`; },
};
function poiCards(o: GameDef['ruins'], kind: 'ruin' | 'wreck', l: Lang): string {
  return `<div class="cards two">${Object.values(o).map((c) => entry(img(`${ART}/event/${c.id}.webp`, 'art'), name(c, l), '', (l === 'ru' ? `${flavor(c as Card, l, kind)}${printed(PRINTED[`${kind}.${c.id}`])}` : flavor(c as Card, l, kind) + D.poi(c as never)) + ruling(`${kind}.${c.id}`, l), 'event')).join('')}</div>`;
}

function build(l: Lang) {
  const src = readFileSync(at(`src/${l}.html`), 'utf8');
  let out = src
    .replace(/<rv-table of="([\w.]+)"><\/rv-table>/g, (_, k: string) => { if (!TABLES[k]) throw new Error(`<rv-table of="${k}">: no such table`); return TABLES[k]!(l); })
    .replace(/<rv p="([\w.]+)"><\/rv>/g, (_, p: string) => `<span class="rv">${esc(value(p))}</span>`);
  const left = /<rv[\s>-]/.exec(out);
  if (left) throw new Error(`${l}: an <rv> was not filled near "${out.slice(left.index, left.index + 60)}"`);
  // Each part after the first starts a page (data-part names it in the contents); then the ornaments' stylesheet.
  let parts = 0;
  out = out.replace(/<section class="([^"]*chapter[^"]*)" data-part="([^"]+)"/g, (_, cls: string, part: string) => `<section class="${cls}${parts++ ? ' new-page' : ''}" data-part="${part}"`)
    .replace('<link rel="stylesheet" href="../rulebook.css">', '<link rel="stylesheet" href="../rulebook.css">\n<link rel="stylesheet" href="ornaments.css">');
  const body = out.indexOf('<body');
  out = out.slice(0, body) + iconize(out.slice(body));
  mkdirSync(at('dist'), { recursive: true });
  writeFileSync(at(`dist/${l}.html`), out);
  writeFileSync(at('dist/ornaments.css'), ornamentsCss());
  console.log(`rulebook/dist/${l}.html`);
}
const langs = (process.argv.length > 2 ? process.argv.slice(2) : ['en', 'ru']) as Lang[];
for (const l of langs) build(l);
const stale = Object.keys(RULINGS).filter((k) => !usedRulings.has(k));
if (stale.length) throw new Error(`rulings.json: no card for ${stale.join(', ')}`);
