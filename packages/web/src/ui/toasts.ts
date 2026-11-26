/* Short notices, one under another. Each goes away by itself or on a click. */
import { $ } from '../data.ts';
import { Places } from '../places.ts';
const box = $('toasts'), MAX = 6, timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
/** The notices shown, and those not yet going away. */
const all = () => [...box.children].filter((x) => x instanceof HTMLElement), live = () => all().filter((x) => !x.dataset.gone);
function close(el: HTMLElement) { if (el.dataset.gone) return; el.dataset.gone = '1'; clearTimeout(timers.get(el)); el.classList.remove('on'); el.style.marginTop = `${-el.offsetHeight - 8}px`; setTimeout(() => el.remove(), 320); }
/** A notice: `pic` is a picture, `who` a player whose emblem is shown on it, `tone` colours the edge. */
export interface Notice { html: string; pic?: string; who?: number | null; ms?: number; tone?: string }
function add({ html, pic = '', who = null, ms = 8000, tone = '' }: Notice) {
  const el = document.createElement('button'); el.className = `toast ${tone}`;
  el.innerHTML = `${pic || who !== null ? `<span class="pc">${pic ? `<img src="${pic}" alt="">` : ''}${who !== null ? Places.em(who, pic ? 24 : 42) : ''}</span>` : ''}<span class="tt">${html}</span>`;
  const start = () => { timers.set(el, setTimeout(() => close(el), ms)); };
  el.onclick = () => close(el); el.onpointerenter = () => clearTimeout(timers.get(el)); el.onpointerleave = start;
  box.append(el); while (live().length > MAX) close(live()[0]);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on'))); start();
}
export const Toast = { add, clear: () => all().forEach((x) => close(x)) };
