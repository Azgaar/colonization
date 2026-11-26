/* The Dev menu (FR-U-19, FR-R-6): edit the game, force what comes next, play any seat, change the rules. Only in dev mode. */
import { RESOURCES } from '@col/data';
import { $, L, me, pick, showSeat } from '../data.ts';
import { settle } from '../flow.ts';
import { Board } from '../map/board.ts';
import { paint } from '../paint.ts';
import { Places } from '../places.ts';
import { Dev, RULESETS, Sim } from '../sim.ts';
import { U } from '../state.ts';

/** The answer to the last change of rules, kept across redraws. */
let note = '';
const num = (k: string, label: string, v: number) => `<label><span>${label}</span><input type="number" min="0" step="1" value="${v}" data-sb-num="${k}"></label>`;
const sel = (k: string, list: [string, string][]) => `<select data-sb-pick="${k}">${list.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>`;
const name = (rec: Record<string, { en: string; ru: string }>, id: string) => (rec[id] ? pick(rec[id]) : id);

export function sandbox() {
  const el = $('sandbox'), on = U.sandbox && Sim.sandbox;
  el.hidden = !on;
  if (!on || el.contains(document.activeElement)) return; // not redrawn under the pointer while a value is typed
  const s = Sim.s, pl = s.players[me], ev = [...new Set(s.eventDeck)], ag = [...new Set(s.agentDeck)];
  const common = Object.values(s.def.agents).filter((a) => a.kind === 'common').map((a) => a.id);
  el.innerHTML = `<button class="x" data-sandbox>${L('Close', 'Закрыть')}</button><h3>${L('Dev menu', 'Меню разработчика')}</h3>
<h4>${L('Seats', 'Места')}</h4>${s.players.map((_, i) => `<div class="sb-seat${i === me ? ' on' : ''}">${Places.em(i, 26)}<span>${Places.name(i)}</span>
<span class="set"><button class="${Sim.humans.has(i) ? 'on' : ''}" data-sb-human="${i}">${L('Person', 'Человек')}</button><button class="${Sim.humans.has(i) ? '' : 'on'}" data-sb-bot="${i}">${L('Bot', 'Бот')}</button></span><button data-sb-show="${i}" ${i === me ? 'disabled' : ''}>${L('Show', 'Показать')}</button></div>`).join('')}
<h4>${Places.name(me)}</h4><div class="sb-grid">${num('gold', pick(['Gold', 'Золото']), pl.gold)}${num('bells', pick(['Bells', 'Колокола']), pl.bells)}${num('crosses', pick(['Crosses', 'Кресты']), pl.crosses)}${num('damage', L('Ship damage', 'Повреждения'), pl.damage)}
${RESOURCES.map((r) => num(`wh.${r}`, name(s.def.resources, r), pl.wh[r])).join('')}</div>
<h4>${L('King’s army', 'Армия короля')}</h4><div class="sb-grid">${num('ref', L('Cubes in the barracks', 'Кубиков в казармах'), s.ref)}</div>
<h4>${L('What comes next', 'Что будет дальше')}</h4>
${ev.length ? `<div class="sb-row">${sel('event', ev.map((e) => [e, name(s.def.events, e)]))}<button data-sb-top="event">${L('Next event', 'Следующее событие')}</button></div>` : ''}
${ag.length ? `<div class="sb-row">${sel('agent', ag.map((a) => [a, name(s.def.agents, a)]))}<button data-sb-top="agent">${L('Top of the deck', 'Наверх колоды')}</button></div>` : ''}
<div class="sb-row">${sel('give', common.map((a) => [a, name(s.def.agents, a)]))}<button data-sb-give>${L('Into the hand', 'В руку')}</button></div>
<div class="sb-row"><input data-sb-dice placeholder="${L('Dice, e.g. 6 6 1', 'Кубики, напр. 6 6 1')}" value="${(s.forced?.dice ?? []).join(' ')}"><button data-sb-dice-set>${L('Next dice', 'Следующие кубики')}</button></div>
<h4>${L('Rules', 'Правила')}</h4><div class="sb-row">${sel('rules', RULESETS().map((r) => [r, r]))}<button data-sb-rules>${L('Play on with these', 'Играть дальше с ними')}</button></div><p class="sb-note">${note}</p>`;
  el.querySelector<HTMLSelectElement>('[data-sb-pick="rules"]')!.value = Sim.setup.ruleset;
}

document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement, k = t.dataset.sbNum;
  if (!k || !Sim.sandbox) return;
  const v = Math.max(0, Math.round(+t.value || 0));
  Sim.edit((s) => {
    const pl = s.players[me];
    if (k === 'ref') s.ref = v; else if (k.startsWith('wh.')) pl.wh[k.slice(3) as keyof typeof pl.wh] = v; else (pl as unknown as Record<string, number>)[k] = v;
  });
  paint();
});
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (x: string) => t.closest<HTMLElement>(x);
  let x: HTMLElement | null;
  if (q('[data-sandbox]')) { U.sandbox = !U.sandbox; U.menu = false; paint(); return; }
  // Dev mode and the forecast, from Options (in play or on the title screen).
  if ((x = q('[data-dev]'))) { Dev.on = !!x.dataset.dev; if (!Dev.on) U.sandbox = false; paint(); return; }
  if ((x = q('[data-forecast]'))) { Dev.forecast = !!x.dataset.forecast; paint(); return; }
  if (!U.sandbox || !Sim.sandbox) return;
  const pickOf = (k: string) => $('sandbox').querySelector<HTMLSelectElement>(`[data-sb-pick="${k}"]`)!.value;
  if ((x = q('[data-sb-human]'))) { Sim.setHuman(+x.dataset.sbHuman!, true); paint(); }
  else if ((x = q('[data-sb-bot]'))) { const p = +x.dataset.sbBot!; Sim.setHuman(p, false); if (p === me && Sim.humans.size) showSeat([...Sim.humans][0]); paint(); void settle(); }
  // Only a look: the turn goes on from the seat whose decision it is.
  else if ((x = q('[data-sb-show]'))) { showSeat(+x.dataset.sbShow!); paint(); }
  else if ((x = q('[data-sb-top]'))) {
    // The top of a deck is its last card.
    const k = x.dataset.sbTop!, id = pickOf(k);
    Sim.edit((s) => { const d = k === 'event' ? s.eventDeck : s.agentDeck, i = d.lastIndexOf(id); if (i >= 0) { d.splice(i, 1); d.push(id); } });
    paint();
  } else if (q('[data-sb-give]')) {
    const id = pickOf('give');
    // Taken from the deck or the discard when a copy is there, so the cards still add up.
    Sim.edit((s) => { for (const d of [s.agentDeck, s.agentDiscard]) { const i = d.lastIndexOf(id); if (i >= 0) { d.splice(i, 1); break; } } s.players[me].hand.push(id); });
    paint();
  } else if (q('[data-sb-dice-set]')) {
    const v = $('sandbox').querySelector<HTMLInputElement>('[data-sb-dice]')!.value.split(/[\s,]+/).map(Number).filter((n) => n >= 1 && n <= 6);
    Sim.edit((s) => { s.forced = { dice: v }; });
    paint();
  } else if (q('[data-sb-rules]')) {
    const why = Sim.setRules(pickOf('rules'));
    note = why ?? L('The game goes on under these rules.', 'Игра продолжается по этим правилам.');
    if (!why) Board.land();
    paint();
  }
});
