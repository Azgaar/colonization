import { createHash } from 'node:crypto';
import type {
  AgentDef, BuildingDef, Cell, Education, EventDef, FatherDef, GameData, Icon, NationDef, Node, Poi, PoiCardDef, Resource, ResourceDef, SourceMap,
  TacticDef, TerrainDef, TerrainId, TileDef, TribeDef,
} from './types.ts';
import { ICON_RESOURCE, RESOURCES } from './types.ts';
import type { Settings, Mod, Node as EffectNode } from './types.ts';

export type CellValue = string | number | boolean | Date | null | undefined;
export interface RawSheet { sheet: string; data: CellValue[][] }
export interface Issue { level: 'error' | 'warning'; sheet: string; row?: number; column?: string; message: string }
export interface ImportResult { data: GameData | null; issues: Issue[]; texts: Record<string, string>; sources: SourceMap }
/** The machine side of the rules, which the sheet's texts only describe: card effects by id (agents by base), terrain yields, settings,
 * English names where they differ from the nickname, and whether each printed text was checked against its effect. */
export interface Machine {
  agents: Record<string, Mod[]>; buildings: Record<string, Pick<BuildingDef, 'work' | 'storage' | 'defence'>>; fathers: Record<string, Pick<FatherDef, 'mods' | 'onGain'>>;
  events: Record<string, EffectNode[]>; ruins: Record<string, EffectNode[]>; wrecks: Record<string, EffectNode[]>; tactics: Record<string, TacticDef['effect']>;
  yields: Record<string, Icon[]>; settings: Settings; names: Record<string, string>;
  /** Whether the effect of `key` ("agent.farmer") was checked against this printed text. */
  checked: (key: string, text: string) => boolean;
}
/** An agent's base: a nation's copy (Planter_Danish) shares the common or unique agent's id; natives are their own base. */
export const agentBase = (nick: string) => (NATIVE_IDS.has(toId(nick)) ? toId(nick) : toId(nick.replace(/_[^_]+$/, '')));
/** A card's printed text as checked against its effect: its non-empty parts joined. */
export const printedText = (...parts: string[]) => parts.map((p) => String(p ?? '').trim()).filter(Boolean).join(' / ');

export const toId = (s: string) => s.toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const title = (s: string) => { const t = s.replace(/_/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
const EDU: Record<string, Education> = { '🚫': 0, '📖': 1, '🎓': 2 };
const ICONS: Record<string, Icon> = { '🌽': 'corn', '🐟': 'fish', '🪵': 'timber', '🍂': 'leaf', '🦫': 'fur', '📦': 'goods', '🪙': 'silver' };
const POIS: Record<string, Poi> = { 'village.png': 'village', 'burial.png': 'ruin', 'wreck.png': 'wreck' };
const TERRAINS: TerrainId[] = ['ocean', 'forest', 'grassland', 'mountains', 'desert', 'tundra'];
const NATIVE_IDS = new Set(['indian']);

interface Row { row: number; get(col: string): string; num(col: string): number; at(col: string): SourceMap[string] }
/** 0 → A, 26 → AA. */
export const columnLetter = (i: number): string => (i >= 26 ? columnLetter(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

export function importWorkbook(sheets: RawSheet[], mx: Machine): ImportResult {
  const issues: Issue[] = [];
  const texts: Record<string, string> = {};
  const sources: SourceMap = {};
  /** Record where each listed field of an entity came from; the entity itself points at its nickname cell. */
  const mark = (path: string, item: object, r: Row, cols: Record<string, string>, key = 'nickname') => {
    sources[path] = r.at(key);
    for (const [k, c] of Object.entries(cols)) if (k in item) sources[`${path}.${k}`] = r.at(c);
  };
  const err = (sheet: string, row: number | undefined, column: string | undefined, message: string) =>
    void issues.push({ level: 'error', sheet, row, column, message });
  const warn = (sheet: string, message: string, row?: number) => void issues.push({ level: 'warning', sheet, row, message });

  function table(name: string, firstCol?: string): Row[] {
    const sh = sheets.find((s) => s.sheet === name);
    if (!sh) { err(name, undefined, undefined, 'sheet is missing'); return []; }
    const head = (sh.data[0] ?? []).map((h) => String(h ?? '').trim());
    const key = head.indexOf(firstCol ?? 'nickname');
    const out: Row[] = [];
    sh.data.forEach((cells, i) => {
      if (i === 0 || cells[key] == null || String(cells[key]).trim() === '') return;
      const row = i + 1;
      const get = (c: string) => {
        const k = head.indexOf(c);
        if (k < 0) { err(name, 1, c, `column "${c}" is missing`); return ''; }
        return String(cells[k] ?? '').trim();
      };
      const num = (c: string) => {
        const v = Number.parseFloat(get(c).replace(',', '.'));
        if (!Number.isFinite(v) || v < 0) { err(name, row, c, `expected a number of 0 or more, got "${get(c)}"`); return 0; }
        return v;
      };
      out.push({ row, get, num, at: (c) => [name, row, columnLetter(Math.max(0, head.indexOf(c))), c] });
    });
    return out;
  }
  function add<T extends { id: string }>(map: Record<string, T>, item: T, sheet: string, row: number) {
    if (!item.id) err(sheet, row, 'nickname', 'empty id');
    if (map[item.id]) err(sheet, row, 'nickname', `duplicate id "${item.id}"`);
    map[item.id] = item;
  }
  /** Remember the printed text and check that its structured effect was reviewed against it. */
  function review(kind: string, id: string, sheet: string, row: number, ...parts: string[]) {
    const key = `${kind}.${id}`;
    const text = printedText(...parts);
    texts[key] = text;
    if (!mx.checked(key, text)) err(sheet, row, 'effect', `the text of "${id}" ("${text}") was not checked against its effect ($fx). Check the effect, then run "pnpm rules:review"`);
  }
  function effect<T>(map: Record<string, T>, id: string, sheet: string, row: number): T | undefined {
    if (!(id in map)) { err(sheet, row, 'nickname', `no effect defined for "${id}"`); return undefined; }
    return map[id];
  }
  const education = (r: Row, sheet: string, empty: Education): Education => {
    const v = r.get('education');
    if (v === '') return empty;
    if (!(v in EDU)) { err(sheet, r.row, 'education', `unknown education "${v}"`); return empty; }
    return EDU[v];
  };

  // Resources
  const resources = {} as Record<Resource, ResourceDef>;
  for (const r of table('Goods')) {
    const id = toId(r.get('nickname')) as Resource;
    if (!RESOURCES.includes(id)) { err('Goods', r.row, 'nickname', `unknown resource "${id}"`); continue; }
    resources[id] = { id, ru: r.get('name'), en: title(id), price: r.num('price') };
    mark(`resources.${id}`, resources[id], r, { ru: 'name', en: 'nickname', price: 'price' });
  }
  for (const x of RESOURCES) if (!resources[x]) err('Goods', undefined, undefined, `resource "${x}" is missing`);

  // Terrain
  const terrain = {} as Record<TerrainId, TerrainDef>;
  for (const r of table('Terrain')) {
    const id = toId(r.get('nickname')) as TerrainId;
    if (!TERRAINS.includes(id)) { err('Terrain', r.row, 'nickname', `unknown terrain "${id}"`); continue; }
    const mv = r.get('movement cost');
    const move = mv.startsWith('все') ? 'all' as const : Number.parseInt(mv, 10);
    if (move !== 'all' && !(move > 0)) err('Terrain', r.row, 'movement cost', `cannot read movement cost "${mv}"`);
    const defence = r.get('defence bonus') === '' ? 0 : Number.parseInt(r.get('defence bonus'), 10);
    review('terrain', id, 'Terrain', r.row, r.get('production'));
    terrain[id] = { id, ru: r.get('name'), en: title(id), yields: mx.yields[id] ?? [], defence, move };
    mark(`terrain.${id}`, terrain[id], r, { ru: 'name', en: 'nickname', yields: 'production', defence: 'defence bonus', move: 'movement cost' });
  }
  for (const t of TERRAINS) if (!terrain[t]) err('Terrain', undefined, undefined, `terrain "${t}" is missing`);

  // Agents
  const agents: Record<string, AgentDef> = {};
  const readPrice = (r: Row, sheet: string) => {
    const m = /^(\d+)\s*🟡$/u.exec(r.get('price'));
    if (!m) { err(sheet, r.row, 'price', `cannot read price "${r.get('price')}"`); return 0; }
    return Number(m[1]);
  };
  for (const r of table('Agents')) {
    const id = toId(r.get('nickname'));
    review('agent', id, 'Agents', r.row, r.get('effect'), r.get('comment'));
    add(agents, {
      id, base: id, ru: r.get('name'), en: title(r.get('nickname')), kind: 'common', unique: false, copies: r.num('copies'),
      edu: education(r, 'Agents', 0), price: readPrice(r, 'Agents'), mods: effect(mx.agents, id, 'Agents', r.row) ?? [],
    }, 'Agents', r.row);
    mark(`agents.${id}`, agents[id], r, { ru: 'name', en: 'nickname', copies: 'copies', edu: 'education', price: 'price', mods: 'effect' });
  }
  for (const r of table('Sp Agents')) {
    const nick = r.get('nickname');
    const nation = toId(r.get('nation'));
    const native = NATIVE_IDS.has(toId(nick));
    const base = agentBase(nick);
    const common = agents[base]?.kind === 'common';
    if (!common) review('agent', base, 'Sp Agents', r.row, r.get('effect'), r.get('comment'));
    const edu = education(r, 'Sp Agents', 0);
    if (common && agents[base].edu !== edu) err('Sp Agents', r.row, 'education', `"${nick}" differs from the common agent`);
    add(agents, {
      id: toId(nick), base, ru: r.get('name'), en: title(base), kind: native ? 'native' : 'nation', unique: !common && !native,
      ...(native ? {} : { nation }), copies: r.num('e'), edu, price: null, mods: effect(mx.agents, base, 'Sp Agents', r.row) ?? [],
    }, 'Sp Agents', r.row);
    mark(`agents.${toId(nick)}`, agents[toId(nick)], r, { ru: 'name', en: 'nickname', nation: 'nation', copies: 'e', edu: 'education', mods: 'effect' });
  }

  // English names that differ from the nickname (DD-68): the ids stay, as art, effects and bots use them.
  for (const a of Object.values(agents)) if (mx.names[a.base]) a.en = mx.names[a.base];

  // Nations
  const nations: Record<string, NationDef> = {};
  for (const r of table('Europeans')) {
    const id = toId(r.get('nickname'));
    const own = Object.values(agents).filter((a) => a.nation === id);
    const left = own.flatMap((a) => Array.from({ length: a.copies }, () => a));
    const deck: string[] = [];
    for (const name of r.get('starting units').split(/\s*[\n/]\s*/).filter(Boolean)) {
      const k = left.findIndex((a) => a.ru === name);
      if (k < 0) err('Europeans', r.row, 'starting units', `no card "${name}" for nation "${id}" in Sp Agents`);
      else deck.push(left.splice(k, 1)[0].id);
    }
    for (const a of left) err('Europeans', r.row, 'starting units', `card "${a.id}" is not in the starting deck`);
    add(nations, { id, ru: r.get('name'), en: r.get('nickname'), deck, stars: (r.get('difficulty').match(/★/g) ?? []).length, color: r.get('default color') }, 'Europeans', r.row);
    mark(`nations.${id}`, nations[id], r, { ru: 'name', en: 'nickname', deck: 'starting units', stars: 'difficulty', color: 'default color' });
  }
  for (const a of Object.values(agents)) if (a.nation && !nations[a.nation]) err('Sp Agents', undefined, 'nation', `unknown nation "${a.nation}"`);

  // Buildings
  const buildings: Record<string, BuildingDef> = {};
  const bRows = table('Buildings');
  for (const r of bRows) {
    const id = toId(r.get('nickname'));
    review('building', id, 'Buildings', r.row, r.get('effect'));
    const m = /^(\d+)\s*🪵$/u.exec(r.get('price'));
    if (!m) err('Buildings', r.row, 'price', `cannot read price "${r.get('price')}"`);
    const needs = r.get('requires');
    const reqRow = needs ? bRows.find((x) => x.get('name') === needs) : undefined;
    if (needs && !reqRow) err('Buildings', r.row, 'requires', `unknown building "${needs}"`);
    add(buildings, {
      id, ru: r.get('name'), en: title(r.get('nickname')), copies: r.num('copies'), edu: education(r, 'Buildings', 0), timber: Number(m?.[1] ?? 0),
      improvement: !!needs, ...(reqRow ? { requires: toId(reqRow.get('nickname')) } : {}), ...effect(mx.buildings, id, 'Buildings', r.row),
    }, 'Buildings', r.row);
    mark(`buildings.${id}`, buildings[id], r, {
      ru: 'name', en: 'nickname', copies: 'copies', edu: 'education', timber: 'price', requires: 'requires', improvement: 'requires', work: 'effect', storage: 'effect', defence: 'effect',
    });
  }

  // Fathers
  const fathers: Record<string, FatherDef> = {};
  for (const r of table('Fathers')) {
    const id = toId(r.get('nickname'));
    review('father', id, 'Fathers', r.row, r.get('effect'));
    const m = /^(\d+)\s*🔔$/u.exec(r.get('price'));
    if (!m) err('Fathers', r.row, 'price', `cannot read price "${r.get('price')}"`);
    add(fathers, { id, ru: r.get('name'), en: r.get('nickname'), flavor: r.get('description') || undefined, category: r.get('type'), bells: Number(m?.[1] ?? 0), mods: [], onGain: [], ...effect(mx.fathers, id, 'Fathers', r.row) }, 'Fathers', r.row);
    mark(`fathers.${id}`, fathers[id], r, { ru: 'name', en: 'nickname', flavor: 'description', category: 'type', bells: 'price', mods: 'effect', onGain: 'effect' });
  }

  // Events, ruins, wrecks, tactics
  const events: Record<string, EventDef> = {};
  for (const r of table('Events')) {
    const id = toId(r.get('nickname'));
    review('event', id, 'Events', r.row, r.get('effect 1'), r.get('effect 2'), r.get('effect 3'), r.get('effect 4'));
    add(events, { id, ru: r.get('name'), en: r.get('nickname'), flavor: r.get('flavor') || undefined, do: effect(mx.events, id, 'Events', r.row) ?? [] }, 'Events', r.row);
    mark(`events.${id}`, events[id], r, { ru: 'name', en: 'nickname', flavor: 'flavor', do: 'effect 1' });
  }
  const poiCards = (sheet: string, kind: string, map: Record<string, Node[]>) => {
    const out: Record<string, PoiCardDef> = {};
    for (const r of table(sheet)) {
      const id = toId(r.get('nickname'));
      review(kind, id, sheet, r.row, r.get('effect 1'));
      add(out, { id, ru: r.get('name'), en: r.get('nickname'), flavor: r.get('flavor') || undefined, do: effect(map, id, sheet, r.row) ?? [] }, sheet, r.row);
      mark(`${kind}s.${id}`, out[id], r, { ru: 'name', en: 'nickname', flavor: 'flavor', do: 'effect 1' });
    }
    return out;
  };
  const ruins = poiCards('Burial events', 'ruin', mx.ruins);
  const wrecks = poiCards('Wreck events', 'wreck', mx.wrecks);
  const tactics: Record<string, TacticDef> = {};
  for (const r of table('King Tactics')) {
    const id = toId(r.get('nickname'));
    review('tactic', id, 'King Tactics', r.row, r.get('effect'));
    add(tactics, { id, ru: r.get('name'), en: r.get('nickname'), effect: effect(mx.tactics, id, 'King Tactics', r.row) ?? { t: 'none' } }, 'King Tactics', r.row);
    mark(`tactics.${id}`, tactics[id], r, { ru: 'name', en: 'nickname', effect: 'effect' });
  }

  // Tribes
  const tribes: Record<string, TribeDef> = {};
  for (const r of table('Indians')) {
    const id = toId(r.get('nickname'));
    const t = r.get('terrain').replace('.png', '') as TerrainId;
    if (!TERRAINS.includes(t) || t === 'ocean') err('Indians', r.row, 'terrain', `unknown terrain "${t}"`);
    const m = /^(\d+)\s*(\S+)/u.exec(r.get('loot'));
    let loot: TribeDef['loot'] = {};
    if (!m) err('Indians', r.row, 'loot', `cannot read loot "${r.get('loot')}"`);
    else if (m[2] === '🟡') loot = { gold: Number(m[1]) };
    else if (ICONS[m[2]]) loot = { res: ICON_RESOURCE[ICONS[m[2]] as keyof typeof ICON_RESOURCE], amount: Number(m[1]) };
    else err('Indians', r.row, 'loot', `unknown loot "${m[2]}"`);
    add(tribes, { id, ru: r.get('name'), en: r.get('nickname'), terrain: t, hostility: r.num('initial alert'), population: r.num('initial population'), copies: r.num('copies'), loot }, 'Indians', r.row);
    mark(`tribes.${id}`, tribes[id], r, { ru: 'name', en: 'nickname', terrain: 'terrain', hostility: 'initial alert', population: 'initial population', copies: 'copies', loot: 'loot' });
  }

  // Tiles
  const tiles: TileDef[] = [];
  for (const r of table('Tiles')) {
    const id = r.num('nickname');
    const cells: Cell[] = [];
    for (let i = 1; i <= 9; i++) {
      const t = r.get(`cell ${i}`).replace('.png', '') as TerrainId;
      if (!TERRAINS.includes(t)) err('Tiles', r.row, `cell ${i}`, `unknown terrain "${t}"`);
      const c: Cell = { terrain: t };
      const p = r.get(`bonus ${i}`);
      if (p) {
        if (!POIS[p]) err('Tiles', r.row, `bonus ${i}`, `"${p}" is not a village, ruin or wreck`);
        else {
          c.poi = POIS[p];
          if (c.poi === 'wreck' ? t !== 'ocean' : t === 'ocean') err('Tiles', r.row, `bonus ${i}`, `${c.poi} cannot be on ${t}`);
        }
      }
      const b = r.get(`resource ${i}`);
      if (b) {
        if (!ICONS[b]) err('Tiles', r.row, `resource ${i}`, `"${b}" is not a resource icon`);
        else c.bonus = ICONS[b];
      }
      cells.push(c);
      mark(`tiles.${tiles.length}.cells.${i - 1}`, c, r, { terrain: `cell ${i}`, poi: `bonus ${i}`, bonus: `resource ${i}` }, `cell ${i}`);
    }
    if (id !== tiles.length + 1) err('Tiles', r.row, 'nickname', `expected tile ${tiles.length + 1}, got ${id}`);
    sources[`tiles.${tiles.length}`] = r.at('nickname');
    tiles.push({ id, cells });
  }
  if (tiles.length < mx.settings.map.size ** 2) err('Tiles', undefined, undefined, `need at least ${mx.settings.map.size ** 2} tiles`);

  // Warnings: things that are legal but probably not intended.
  for (const [id, f] of Object.entries(fathers)) for (const n of f.onGain) {
    if (n.n === 'takeAgent' && (agents[n.agent]?.copies ?? 0) < n.amount) warn('Fathers', `"${id}" takes ${n.amount} "${n.agent}" but the deck has ${agents[n.agent]?.copies ?? 0}`);
  }
  for (const t of TERRAINS) {
    const off = tiles.flatMap((x) => x.cells).filter((c) => c.terrain === t && c.bonus && !terrain[t]?.yields.includes(c.bonus)).length;
    if (off) warn('Tiles', `${off} ${t} cell(s) have a bonus resource the terrain does not yield`);
    const villages = tiles.flatMap((x) => x.cells).filter((c) => c.terrain === t && c.poi === 'village').length;
    if (villages && !Object.values(tribes).some((x) => x.terrain === t)) warn('Tiles', `villages on ${t} but no tribe lives there`);
  }

  const sourceHash = createHash('sha256').update(JSON.stringify(sheets.map((s) => [s.sheet, s.data]))).digest('hex').slice(0, 16);
  const failed = issues.some((i) => i.level === 'error');
  return {
    issues, texts, sources,
    data: failed ? null : { schema: 1, sourceHash, resources, terrain, agents, nations, buildings, fathers, events, ruins, wrecks, tactics, tribes, tiles, settings: mx.settings },
  };
}

export function formatIssue(i: Issue) {
  const at = [i.sheet, i.row ? `row ${i.row}` : '', i.column ? `column "${i.column}"` : ''].filter(Boolean).join(', ');
  return `${i.level.toUpperCase()}: ${at}: ${i.message}`;
}
