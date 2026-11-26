/* The advisor (FR-A-8): on request, the search bot's three best suggestions for the person's decision, with its reasons; one click plays a suggestion, the whole action. */
import type { Considered } from '@col/bots';
import { $, ACT, D, L, pick } from '../data.ts';
import { settle } from '../flow.ts';
import { Board } from '../map/board.ts';
import { paint } from '../paint.ts';
import { Places } from '../places.ts';
import { Sim, type Opt, type Pending } from '../sim.ts';
import { look } from './decisions.ts';
import { esc } from './md.ts';

/** The suggestions shown, for which decision (the log length when asked), or 'thinking'. */
let advice: { at: number; list: Considered[] } | 'thinking' | null = null;
const describe = (c: Opt) => {
  const d = Sim.pending()!, x = look(c, d as Pending).title;
  if (c.c === 'play') return `${pick(D.agents[c.card])}: ${pick(ACT[c.a] ?? [c.a, c.a])}${c.building || c.settlement || c.cell !== undefined || c.r || c.other || c.target ? ` · ${look({ ...c, card: undefined } as Opt, d as Pending).title}` : ''}`;
  return x || c.c;
};

export function advisor() {
  const el = $('advice'), mine = Sim.mine() && !Sim.busy;
  if (!mine || (advice && advice !== 'thinking' && advice.at !== Sim.s.log.length)) advice = null;
  el.hidden = !advice;
  if (!advice) return;
  el.innerHTML = advice === 'thinking' ? `<p>${L('Thinking…', 'Думаю…')}</p>` : `<h4>${L('Advisor', 'Советник')}</h4>${advice.list.map((x, i) => `<div class="adv"><b>${i + 1}. ${esc(describe(x.choice as Opt))}</b><small>${esc(x.why)}</small><button data-adv-do="${i}">${L('Play it', 'Сделать')}</button></div>`).join('') || `<p>${L('Nothing to suggest here.', 'Здесь нечего посоветовать.')}</p>`}<button class="x" data-adv-close>${L('Close', 'Закрыть')}</button>`;
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if (q('[data-advise]')) {
    if (!Sim.mine()) return;
    // Show that it is thinking first: the search holds the page for most of a second.
    advice = 'thinking'; paint();
    setTimeout(() => { advice = { at: Sim.s.log.length, list: Sim.advise() }; paint(); }, 30);
  } else if (q('[data-adv-close]')) { advice = null; paint(); }
  else if ((x = q('[data-adv-do]')) && advice && advice !== 'thinking') {
    const c = advice.list[+x.dataset.advDo!]?.choice; advice = null;
    if (!c || !Sim.mine()) return;
    // The whole action, not only its first choice: a sail goes on to its end, with each step shown as the player's own would be.
    Sim.mark(); Sim.apply(c);
    void Sim.finish(async () => { Sim.refresh(); Places.forget(); Board.draw(); await new Promise((r) => setTimeout(r, 110)); }).then(() => settle());
  }
});
