/* What the interface is doing now, apart from the game itself. */

export type Screen = 'map' | 'colony' | 'europe';
/** The agent in hand and the one dragged, the place under the pointer, where a list of options is open (`pickAt`), the open screen, the clicked cell (`look`), the cell under the pointer (`hov`), the colony shown in the war (-1: none). */
export const S: { card: string | null; drag: string | null; over: string | null; pickAt: { x: number; y: number; id: string } | null; view: Screen; look: number | null; hov: number | null; war: number } =
  { card: null, drag: null, over: null, pickAt: null, view: 'map', look: null, hov: null, war: -1 };

/** Pages of the title screen; `null` while playing. */
export type TitlePage = 'main' | 'new' | 'load' | 'options' | 'about' | 'bench';
/** Boxes that are open: the King's army, a governor's victory points, the Governors sheet, the options menu, the glimpse behind a door, the sandbox panel; the title screen page. `last` keeps the order of goods in the heaps. */
export const U: { king: boolean; vp: number | null; sheet: boolean; menu: boolean; peek: 'west' | 'east' | null; title: TitlePage | null; last: { wh: string[]; hold: string[] }; sandbox: boolean; deck: boolean } =
  { king: false, vp: null, sheet: false, menu: false, peek: null, title: 'main', last: { wh: [], hold: [] }, sandbox: false, deck: false };

/** A report waiting to be read: a large card, or a short one in a panel. `after` runs once it is closed. */
export interface Report { html: string; big?: boolean; after?: (() => void) | null }
/** Goods in the warehouse and the hold while cargo is being moved; `was` is the hold before. */
export interface Cargo { wh: Record<string, number>; hold: Record<string, number>; was: Record<string, number> }
/** Decision panels: reports still to read, cards picked, goods being moved or sold, an event that is still collecting what it did, and which decision the panel shows (`key`, to start it afresh). */
export const X: { reports: Report[]; sel: number[]; cargo: Cargo | null; sell: Record<string, number> | null; evt: { id: string; l: import('./sim.ts').Entry[] } | null; key: string } =
  { reports: [], sel: [], cargo: null, sell: null, evt: null, key: '' };
