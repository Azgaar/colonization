/* Drawing everything again after any change. */
import { me, P } from './data.ts';
import { picker } from './input.ts';
import { Board } from './map/board.ts';
import { Places } from './places.ts';
import { D, Sim } from './sim.ts';
import { mood } from './sound.ts';
import { S, U } from './state.ts';
import { paintStep } from './ui/decisions.ts';
import { fans, peek } from './ui/fans.ts';
import { hand } from './ui/hand.ts';
import { details } from './ui/look.ts';
import { scenes } from './ui/scenes.ts';
import { sandbox } from './ui/sandbox.ts';
import { advisor } from './ui/advisor.ts';
import { coach } from './ui/tutorial.ts';
import { guide } from './ui/guide.ts';
import { menu, top } from './ui/top.ts';
import { replayBar } from './ui/setup.ts';
import { title } from './ui/title.ts';
import { war } from './ui/war.ts';
/** Everything shown follows the game and the interface state. */
export function paint() {
  Places.forget(); if (S.card && (!P.hand.includes(S.card) || Sim.kind() !== 'turn')) S.card = null;
  const b = document.body; b.classList.toggle('lift', !!S.card); b.classList.toggle('atwar', !!D.war && !D.over); b.dataset.view = S.view; b.classList.toggle('war', S.war >= 0); b.classList.toggle('busy', Sim.busy);
  // The title screen first: whether it covers the table decides what can be measured below (card names are fitted to their cards).
  title(); const sp = Places.spaces(S.card); top(); menu(); hand(sp); fans(sp); peek(); scenes(sp); details(); paintStep(); war(); replayBar(); sandbox(); advisor(); coach(); guide(); Board.edge(); Board.ground(); Board.draw(); picker(); marks();
  // The signature piece on the main menu; one rotation for the game; marches for the War of Independence; one piece for the end, won or lost.
  mood(U.title ? 'menu' : D.over ? (D.over.winners.includes(me) ? 'won' : 'lost') : D.war ? 'war' : 'game');
}
const marks = () => document.querySelectorAll<HTMLElement>('[data-space]').forEach((e) => { const s = S.card ? Places.spaces(S.card)[e.dataset.space!] : null; e.classList.toggle('ok', !!s?.options?.length); e.classList.toggle('off', !!S.card && !s?.options?.length); });
