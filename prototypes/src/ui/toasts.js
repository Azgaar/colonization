/* Short notices, one under another. Each goes away by itself or on a click. */
import { $ } from '../data.js';
import { Places } from '../places.js';
const box = $('toasts'), MAX = 6;
function close(el) { if (el.dataset.gone) return; el.dataset.gone = 1; clearTimeout(el.timer); el.classList.remove('on'); el.style.marginTop = `${-el.offsetHeight - 8}px`; setTimeout(() => el.remove(), 320); }
/** `pic` is a picture, `who` a player whose emblem is shown on it, `tone` colours the edge. */
function add({ html, pic = '', who = null, ms = 8000, tone = '' }) {
  const el = document.createElement('button'); el.className = `toast ${tone}`;
  el.innerHTML = `${pic || who !== null ? `<span class="pc">${pic ? `<img src="${pic}" alt="">` : ''}${who !== null ? Places.em(who, pic ? 24 : 42) : ''}</span>` : ''}<span class="tt">${html}</span>`;
  const start = () => { el.timer = setTimeout(() => close(el), ms); };
  el.onclick = () => close(el); el.onpointerenter = () => clearTimeout(el.timer); el.onpointerleave = start;
  box.append(el); while ([...box.children].filter((x) => !x.dataset.gone).length > MAX) close([...box.children].find((x) => !x.dataset.gone));
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on'))); start();
}
export const Toast = { add, clear: () => [...box.children].forEach(close) };
