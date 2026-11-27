/* The game as the interface sees it, the player's language and the words, where the art is. No look of its own. */
import { RESOURCES, type Resource } from "@col/data";
import { Sim } from "./sim.ts";
import type { Pair, PlayerView } from "./view.ts";
import { lang, LOCALES, msg, t, table, type Msg } from "./i18n.ts";

export { lang, msg, t, table, type Msg };
/** Something to say in the shown language: a phrase from the locale files (`msg`), or a pair of names from the game data. */
export type Text = Pair | Msg;

export const D = Sim.D,
  CELL = 64;
/** The width of the map in cells. Rulesets may change it (no open sea ring: two cells fewer), so it follows the game that is loaded: see `syncWidth`. */
export let W = D.width;
/** Take the width of the game now loaded; true when it changed. */
export function syncWidth() {
  if (W === D.width) return false;
  W = D.width;
  return true;
}
/** The size of the map in map units. */
export const SIZE = () => W * CELL;
/** The seat whose view is shown: the player (0), or any seat while watching a replay. */
export let me = 0;
export function showSeat(p: number) {
  me = p;
  Sim.view(p);
}
/** A player's record as its owner sees it: the hand and deck are cards, not counts. */
export type Own = Omit<PlayerView, "hand" | "deck"> & {
  hand: string[];
  deck: string[];
};
/** The shown player's own record. It keeps its identity when the game changes. */
export const P = D.players[me] as Own;
/** In the shown language: a phrase from the locale files (`msg`), or names from the game data as a pair `[en, ru]` or a record with `en` and `ru`. */
export const pick = (x: Text | { en: string; ru: string }): string =>
  Array.isArray(x) ? x[lang() === "ru" ? 1 : 0] : "k" in x ? t(x.k, x.v) : lang() === "ru" ? x.ru : x.en;
/** A phrase in both languages, picked now. */
export const L = (en: string, ru: string) => pick([en, ru]);
/** An element of the page by id. The page always has the ones the code asks for. */
export const $ = (id: string) => document.getElementById(id)!;


export const ACT: Record<string, Pair> = table('act');
/** Why an action is not possible, in the shown language: the engine says it in English, which is also how the locale files know it (`why.*`). */
const WHY = new Map(Object.entries(LOCALES.en).filter(([k]) => k.startsWith("why.")).map(([k, v]) => [v, k]));
export const why = (s: string) => { const k = WHY.get(s); return k ? t(k) : s; };
export const art = {
  agent: (id: string) => `art/agent/${D.agents[id].base}.webp`,
  building: (id: string) => `art/building/${id === "blacksmith_shop" ? "blacksmiths_shop" : id}.webp`,
  father: (id: string) => `art/father/${id === "benedict_arnold" ? "edward_colston" : id}.webp`,
  tribe: (id: string) => `art/tribe/${id}.webp`,
  nation: (id: string) => `art/nation/${id}.webp`,
  emblem: (id: string) => `art/emblem/${id}.svg`
};
/** The five resources, in the order the interface lists them. */
export const RES: Resource[] = [...RESOURCES];
export const tokenAt = (c: number) => {
  for (let i = 0; i < D.players.length; i++) {
    if (D.players[i].ship === c) return { p: i, kind: "ship" };
    if (D.players[i].inf === c) return { p: i, kind: "infantry" };
  }
  return null;
};
export const colonyAt = (c: number) => D.colonies.find(x => x.cell === c);
/** A colony's name: the one its owner gave it, or the next of its nation's names, in the order its colonies were founded (`colonies.<nation>`, comma-separated). */
export const colonyName = (c: { cell: number; owner: number }) => {
  if (Sim.names[c.cell]) return Sim.names[c.cell];
  const n = D.colonies.filter((x) => x.owner === c.owner).findIndex((x) => x.cell === c.cell), key = `colonies.${D.players[c.owner].nation}`, list = t(key) === key ? [] : t(key).split(", ");
  return list[n] ?? `${t("colony")} ${n + 1}`;
};
export const settlementAt = (c: number) => D.settlements.find(x => x.alive && x.cell === c);
/** Top left corner of a cell, in map units. */
export const at = (c: number) => [(c % W) * CELL, Math.floor(c / W) * CELL];
/** Cells are named as on the grid, counted from the top left corner of Europe's ring, which is A1: a column letter, then a row number. */
/** A column's letters: A to Z, then AA, AB… as in a spreadsheet, for maps wider than 26 cells. */
export const column = (x: number): string =>
  (x >= 26 ? column(Math.floor(x / 26) - 1) : "") + String.fromCharCode(65 + (x % 26));
export const cellName = (c: number) => `${column(c % D.width)}${Math.floor(c / D.width) + 1}`;
export const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
