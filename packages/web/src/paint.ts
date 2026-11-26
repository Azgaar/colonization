/* Drawing everything again after any change. */
import { P } from './data.ts';
import { picker } from './input.ts';
import { Board } from './map/board.ts';
import { Places } from './places.ts';
import { Sim } from './sim.ts';
import { S } from './state.ts';
import { paintStep } from './ui/decisions.ts';
import { fans, peek } from './ui/fans.ts';
import { hand } from './ui/hand.ts';
import { details } from './ui/look.ts';
import { scenes } from './ui/scenes.ts';
import { menu, top } from './ui/top.ts';
import { setup } from './ui/setup.ts';
import { war } from './ui/war.ts';
/** Everything shown follows the game and the interface state. */
export function paint() {
  Places.forget(); if (S.card && (!P.hand.includes(S.card) || Sim.kind() !== 'turn')) S.card = null;
  const b = document.body; b.classList.toggle('lift', !!S.card); b.dataset.view = S.view; b.classList.toggle('war', S.war >= 0); b.classList.toggle('busy', Sim.busy);
  const sp = Places.spaces(S.card); top(); menu(); hand(sp); fans(sp); peek(); scenes(sp); details(); paintStep(); war(); setup(); Board.edge(); Board.ground(); Board.draw(); picker(); marks();
}
const marks = () => document.querySelectorAll<HTMLElement>('[data-space]').forEach((e) => { const s = S.card ? Places.spaces(S.card)[e.dataset.space!] : null; e.classList.toggle('ok', !!s?.options?.length); e.classList.toggle('off', !!S.card && !s?.options?.length); });
