/* Drawing everything again after any change. */
import { P } from './data.js';
import { picker } from './input.js';
import { Board } from './map/board.js';
import { Places } from './places.js';
import { Sim } from './sim.js';
import { S } from './state.js';
import { paintStep } from './ui/decisions.js';
import { fans, peek } from './ui/fans.js';
import { hand } from './ui/hand.js';
import { details } from './ui/look.js';
import { scenes } from './ui/scenes.js';
import { menu, top } from './ui/top.js';
import { war } from './ui/war.js';
/** Everything shown follows the game and the interface state. */
export function paint() {
  Places.forget(); if (S.card && (!P.hand.includes(S.card) || Sim.kind() !== 'turn')) S.card = null;
  const b = document.body; b.classList.toggle('lift', !!S.card); b.dataset.view = S.view; b.classList.toggle('war', S.war >= 0); b.classList.toggle('busy', Sim.busy);
  const sp = Places.spaces(S.card); top(); menu(); hand(sp); fans(sp); peek(); scenes(sp); details(); paintStep(); war(); Board.edge(); Board.ground(); Board.draw(); picker(); marks();
}
const marks = () => document.querySelectorAll('[data-space]').forEach((e) => { const s = S.card ? Places.spaces(S.card)[e.dataset.space] : null; e.classList.toggle('ok', !!s?.options?.length); e.classList.toggle('off', !!S.card && !s?.options?.length); });
