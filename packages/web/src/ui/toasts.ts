/* Short notices, one under another. Each goes away by itself or on a click; while the pointer is over them, none does.
 * More than fit scroll, with arrows to the ones out of sight. */
import { $ } from '../data.ts';
import { Places } from '../places.ts';
const box = $('toasts'), MAX = 30, list = document.createElement('div');
/** At least this long to read a notice again once the pointer leaves. */
const AFTER = 2000;
const arrow = (dir: 'up' | 'down') => {
  const b = document.createElement('button'); b.className = `tsc ${dir}`; b.hidden = true;
  b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${dir === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}"/></svg><span></span>`;
  b.onclick = () => list.scrollBy({ top: (dir === 'up' ? -1 : 1) * list.clientHeight * 0.7, behavior: 'smooth' });
  return b;
};
const up = arrow('up'), down = arrow('down');
list.className = 'tstack'; box.append(up, list, down);

/** The time a notice has left, and since when it runs (it does not while the pointer is over the notices). */
interface Clock { left: number; since: number; t: ReturnType<typeof setTimeout> | null }
const clocks = new WeakMap<HTMLElement, Clock>();
let held = false;
/** The notices shown, and those not yet going away. */
const all = () => [...list.children].filter((x) => x instanceof HTMLElement), live = () => all().filter((x) => !x.dataset.gone);
function run(el: HTMLElement) { const c = clocks.get(el); if (!c || c.t) return; c.since = performance.now(); c.t = setTimeout(() => close(el), c.left); }
function stop(el: HTMLElement) { const c = clocks.get(el); if (!c?.t) return; clearTimeout(c.t); c.t = null; c.left = Math.max(AFTER, c.left - (performance.now() - c.since)); }
function close(el: HTMLElement) { if (el.dataset.gone) return; el.dataset.gone = '1'; stop(el); el.classList.remove('on'); el.style.marginTop = `${-el.offsetHeight - 8}px`; setTimeout(() => { el.remove(); edges(); }, 320); }
/** The arrows show how many notices are out of sight above and below; the list fades where it is cut. */
function edges() {
  const top = list.scrollTop, bottom = top + list.clientHeight, shown = live();
  const above = shown.filter((x) => x.offsetTop + x.offsetHeight / 2 < top).length, below = shown.filter((x) => x.offsetTop + x.offsetHeight / 2 > bottom).length;
  const more = (b: HTMLButtonElement, n: number, cut: boolean) => { b.hidden = !cut; b.querySelector('span')!.textContent = n ? `${n}` : ''; };
  more(up, above, top > 2); more(down, below, bottom < list.scrollHeight - 2);
  box.classList.toggle('cut-up', top > 2); box.classList.toggle('cut-down', bottom < list.scrollHeight - 2);
}
list.onscroll = edges;
box.addEventListener('pointerover', () => { if (held) return; held = true; live().forEach(stop); });
box.addEventListener('pointerout', (e) => { if (box.contains(e.relatedTarget as Node | null)) return; held = false; live().forEach(run); });

/** A notice: `pic` is a picture, `who` a player whose emblem is shown on it, `tone` colours the edge. */
export interface Notice { html: string; pic?: string; who?: number | null; ms?: number; tone?: string }
/** What a notice says and shows, also for the Chronicle. */
export const face = ({ html, pic = '', who = null }: Notice) => `${pic || who !== null ? `<span class="pc">${pic ? `<img src="${pic}" alt="">` : ''}${who !== null ? Places.em(who, pic ? 24 : 42) : ''}</span>` : ''}<span class="tt">${html}</span>`;
function add(n: Notice) {
  const { ms = 8000, tone = '' } = n, el = document.createElement('button'); el.className = `toast ${tone}`;
  el.innerHTML = face(n); el.onclick = () => close(el);
  clocks.set(el, { left: ms, since: 0, t: null });
  list.append(el); while (live().length > MAX) close(live()[0]);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  // A new notice comes into sight, unless the player is reading the others.
  if (!held) { run(el); list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' }); }
  edges();
}
export const Toast = { add, clear: () => all().forEach((x) => close(x)) };
