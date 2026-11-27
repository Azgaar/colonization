/* Card texts. Russian is printed in the rules (rules/, compiled to texts.json), English is written here. */
import texts from '../../data/generated/texts.json' with { type: 'json' };
import { D, lang, pick, t, table } from './data.ts';
import type { Pair } from './view.ts';
import { eduIcon, icon } from './icons.ts';
import { Places } from './places.ts';
/** Card texts as printed, from the spreadsheet: `father.<id>`, `event.<id>`, `ruin.<id>`… */
const PRINTED: Record<string, string> = texts;
const TACTIC: Record<string, Pair> = table('tactic');
const EMOJI: Record<string, string> = { '🟡': 'gold', '🔔': 'bells', '✝️': 'crosses', '🟥': 'ref', '🟨': 'food', '🟫': 'timber', '🟩': 'crops', '🟦': 'goods', '⬜': 'silver', '🌽': 'food', '🐟': 'fish', '🪵': 'timber', '🍂': 'crops', '🦫': 'crops', '📦': 'goods', '🪙': 'silver', '⚔️': 'sword', '💢': 'anger', '📖': 'book', '🎓': 'cap' };
const draw = (s: string, size = 16) => Object.entries(EMOJI).reduce((x, [e, k]) => x.replaceAll(e, icon(k, size)), s.replace(/\{(\w+)\}/g, (_: string, k: string) => icon(k, size)).replace(/(\d) ПО(?![А-Яа-я])/g, (_: string, n: string) => `${n} ${icon('vp', size)}`).replace(/<\/?i>/g, '')).replace(/ ?\/ /g, '. ').replace(/\.\. /g, '. ').replace(/[🛖💨🎲💀👨🏻‍🌾🛠️]/gu, '').trim();
/** A card's text: Russian as printed in the workbook, other languages from the locale files. */
const text = (key: string, size: number) => draw(lang() === 'ru' && PRINTED[key] ? PRINTED[key] : t(key), size);
export const Texts = { father: (id: string, n: number) => text(`father.${id}`, n), event: (id: string, n: number) => text(`event.${id}`, n), tactic: (id: string) => pick(TACTIC[id] || ['', '']) };
/* What an agent is good at, from its modifiers. */
export function traits(id: string) {
  const out: string[] = [], n = (x: number) => (x > 0 ? `+${x}` : `${x}`);
  const sword = { infantry: 0, ship: 0 };
  for (const m of D.agents[id].mods) {
    if (m.mod === 'production') out.push(`${n(m.add)} ${m.icons ? m.icons.map((i) => icon(Places.ico(i), 15)).join('') : icon('gather', 15)}${m.terrain ? icon(m.terrain, 15) : ''}`);
    if (m.mod === 'move') out.push(`${n(m.add)} ${icon('move', 15)}${icon(m.token, 15)}`);
    if (m.mod === 'combat' && m.terrain && !m.vs) out.push(`${n(m.add)} ${icon('sword', 14)}${icon(m.terrain, 15)}`);
    if (m.mod === 'combat') sword[m.token] += m.vs || m.terrain ? 0 : m.add;
    if (m.mod === 'cost') out.push(`${m.add} ${m.of === 'hire' ? icon('gold', 15) : icon('timber', 15)}`);
    if (m.mod === 'sellPrice') out.push(`${n(m.add)} ${icon('gold', 15)}`);
    if (m.mod === 'bombard') out.push(t('texts.bombards'));
  }
  // Gathering only: said once, after the gathering bonus if there is one.
  if (D.agents[id].mods.some((m) => m.mod === 'onlyProduce')) { const i = out.findIndex((x) => x.includes('ic-gather')); if (i >= 0) out[i] += ` ${t('texts.only')}`; else out.push(`${icon('gather', 15)} ${t('texts.only')}`); }
  if (sword.infantry) out.unshift(`+${sword.infantry} ${icon('sword', 14)}`); else if (sword.ship) out.unshift(`+${sword.ship} ${icon('sword', 14)}${icon('ship', 15)}`);
  return out;
}
export const trait = (c: string) => `${eduIcon(D.agents[c].edu)} ${traits(c).join(' ')}`;
export const work = (id: string) => { const b = D.buildings[id], w = b.work; if (b.storage) return `+${b.storage} ${t('texts.places')}`; if (b.defence) return `+${b.defence} ${icon('sword', 14)}`; if (!w) return ''; if (w.kind === 'ocean') return `2 ${icon('fish', 16)}`; if (w.kind === 'sell') return t('texts.sells_1'); if (w.kind === 'repair') return t('texts.full_repair'); if (w.kind === 'teach') return `${t('texts.teaches')} ${icon(w.maxEdu === 2 ? 'cap' : 'book', 15)}`; return `${w.consumes ? `${w.consumes.amount}${icon(w.consumes.res, 16)} ▸ ` : ''}${w.amount}${icon(Places.ico(w.icon), 16)}`; };
