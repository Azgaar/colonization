/* Goods as heaps of pictures: the warehouse and the ship's hold. */
import { L, me, P, RES, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Sprite } from '../map/sprites.ts';
import { U } from '../state.ts';
export const goods = (x: Record<string, number>) => RES.flatMap((r) => Array<string>(x[r]).fill(r));
/** A heap of `size` places, the goods first; a good that was not there last time is marked new. Also gives the goods, to remember. */
export const heap = (x: Record<string, number>, size: number, key: 'wh' | 'hold', extra: string[] = []): [string, string[]] => { const l = goods(x), seen: Record<string, number> = {}, b = U.last[key] || []; const h = Array.from({ length: Math.max(size, l.length) }, (_, i) => { const r = l[i]; if (!r) return extra[i - l.length] || '<i></i>'; seen[r] = (seen[r] || 0) + 1; return `<span class="${b.length && seen[r] > b.filter((q) => q === r).length ? 'new' : ''}">${icon(r, 27)}</span>`; }).join(''); return [`<div class="heap">${h}</div>`, l]; };
const HULL = '<svg viewBox="0 0 138 50" preserveAspectRatio="none"><path d="M2 20q12 6 22 6h92q12 0 20-8l-13 25q-3 5-10 5H26q-8 0-12-7Z" fill="#6d4325"/><path d="M2 20q12 6 22 6h92q12 0 20-8l-3 6q-8 7-18 7H24q-12 0-20-6Z" fill="#a06d3c"/><path d="M16 38h104" stroke="#4b2d17" stroke-width="1.500"/></svg>';
const aboard = () => [...(P.inf === 'ship' ? [`<span title="${t('infantry')}"><svg viewBox="0 0 64 64" width="27" height="27">${Sprite.infantry(me)}</svg></span>`] : []), ...Array<string>(P.damage).fill(`<span class="hurt" title="${L('Damage', 'Повреждение')}">✕</span>`)];
export const hull = () => `<div class="hull" title="${t('hold')}">${heap(P.hold, 4, 'hold', aboard())[0]}${HULL}</div>`;
