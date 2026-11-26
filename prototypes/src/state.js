/* What the interface is doing now, apart from the game itself. */
/** The agent in hand and the one dragged, the place under the pointer, where a list of options is open (`pickAt`), the open screen (`map`, `colony`, `europe`), the clicked cell (`look`), the cell under the pointer (`hov`), the colony shown in the war (-1: none). */
export const S = { card: null, drag: null, over: null, pickAt: null, view: 'map', look: null, hov: null, war: -1 };
/** Boxes that are open: the King's army, the Governors sheet, the options menu, the glimpse behind a door (`west`, `east`). `last` keeps the order of goods in the heaps. */
export const U = { king: false, sheet: false, menu: false, peek: null, last: { wh: [], hold: [] } };
/** Decision panels: reports still to read, cards picked, goods being moved or sold, an event that is still collecting what it did, and which decision the panel shows (`key`, to start it afresh). */
export const X = { reports: [], sel: [], cargo: null, sell: null, evt: null, key: '' };
