/* Small pieces shared by the panels: buttons, the large card, dice, strength bars. */
import type { Choice, Explained } from '@col/engine';
import { D, pick } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import type { Pair } from '../view.ts';
/** The kinds of large card, each with its own seal. */
export type CardKind = 'tax' | 'war' | 'event' | 'ruin' | 'wreck';
export const name = (p: number) => Places.name(p), res = (r: string) => `${icon(r, 20)} ${pick(D.names.resources[r])}`;
export const btn = (label: string, act: string, cls = '') => `<button class="${cls}" ${act}>${label}</button>`;
export const choice = (c: Choice) => `data-do='${JSON.stringify(c).replace(/'/g, '&#39;')}'`;
export const panel = (title: string, body: string, buttons: string, img = '') => `<div class="bx">${img ? `<img class="art" src="${img}" alt="">` : ''}<div class="tx"><h3>${title}</h3>${body}<div class="bts">${buttons}</div></div></div>`;
export const plus = (n: number, i: string) => Places.plus(n, i, 18);
export const dice = (l: number[], hit = [4, 5]) => `<span class="dice">${l.map((d) => `<i class="${hit.includes(d) ? 'hit' : ''}">${d}</i>`).join('')}</span>`;
const PART: Record<string, Pair> = { 'played card': ['played agent', 'разыгранный агент'], cards: ['cards', 'карты'], terrain: ['terrain', 'местность'], population: ['population', 'население'], colony: ['colony', 'колония'], fathers: ['Fathers', 'отцы'], landing: ['landing', 'высадка'], 'against ship': ['against a ship', 'против корабля'], ref: ['King’s army', 'армия короля'], tactic: ['tactic', 'тактика'], 'loyalist cards': ['loyalist agents', 'агенты лоялиста'], 'loyalist militia': ['loyalist militia', 'ополчение лоялиста'], tokens: ['ship and infantry', 'корабль и пехота'], army: ['soldiers', 'солдаты'], support: ['militia and allies', 'ополчение и союзники'] };
export const part = (l: string) => (PART[l] ? pick(PART[l]) : D.buildings[l] ? pick(D.buildings[l]) : D.agents[l] ? pick(D.agents[l]) : D.fathers[l] ? pick(D.fathers[l]) : l);
export const bar = (e: Explained, cls: string) => `<div class="fb ${cls}"><b>${e.total}</b><span class="fparts">${e.parts.filter((q) => q.value).map((q) => `<i style="flex:${Math.max(1, Math.abs(q.value))}" title="${part(q.label)} ${q.value}"><em>${q.value}</em> ${part(q.label)}</i>`).join('')}</span></div>`;
const SEAL: Record<CardKind, string> = { tax: '<path d="M3 8l4.500 4L12 4l4.500 8L21 8l-2 9H5Z"/><path d="M5 18.500h14v2.700H5Z"/>', war: '<path d="M22.500 1.500l-.8 5L11 17.200l-4.200-4.200L17.500 2.300Z"/><path d="M4.800 9.800l9.400 9.400-2 2-9.400-9.400Z"/><path d="M6.500 15.500l2 2-3.300 3.300a2.300 2.300 0 1 1-2-2Z"/>', event: '<path d="M12 2l3 6.500 7 .8-5.200 4.700 1.500 7L12 17.500 5.700 21l1.500-7L2 9.300l7-.8Z"/>', ruin: '<path d="M3 21h18v-2.500H3Zm1.500-4h3v-8h-3Zm6 0h3v-8h-3Zm6 0h3v-8h-3ZM2.500 7.500h19L12 2.500Z"/>', wreck: '<path d="M12 2a3 3 0 0 1 1.300 5.700V9H17v2.500h-3.700V19c3-.4 5-2.200 5.700-4.500l-2 .6 2.600-4.600L22.500 15l-1.700-.4C20 18.700 16.500 22 12 22s-8-3.300-8.800-7.400L1.500 15l2.900-4.500L7 15.100l-2-.6c.7 2.300 2.700 4.100 5.700 4.500v-7.500H7V9h3.700V7.700A3 3 0 0 1 12 2Z"/>' };
/** Every large card: picture, seal, name, text. Proportions of a real card. */
export const bigCard = (kind: CardKind, pic: string, title: string, foot: string, body: string, buttons: string) => `<article class="rc ${kind}"><div class="in"><img class="pic" src="${pic.includes('/') ? pic : `art/event/${pic}.webp`}" alt=""><svg class="seal" viewBox="0 0 24 24">${SEAL[kind]}</svg><h2>${title}</h2><div class="rule"></div><div class="tx">${body}</div><div class="bts">${buttons}</div></div></article>`;
