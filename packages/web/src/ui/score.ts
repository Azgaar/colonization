/* A final score broken down by where its points came from (FR-U-11). */
import { D, L, pick } from '../data.ts';
import { icon } from '../icons.ts';

/** Each source of points: its sign, or a Father's name for the points a Father gives. */
const SOURCE: Record<string, { icon?: string; name: [string, string] }> = {
  colonies: { icon: 'house', name: ['colonies', 'колонии'] }, bells: { icon: 'bells', name: ['bells', 'колокола'] }, agents: { icon: 'people', name: ['agents', 'агенты'] },
  gold: { icon: 'gold', name: ['gold', 'золото'] }, buildings: { icon: 'house', name: ['buildings', 'постройки'] }, fathers: { icon: 'father', name: ['Fathers', 'Отцы'] },
  alliances: { icon: 'people', name: ['alliances', 'союзы'] },
};
/** Points by source, in one line: "colonies 6, bells 3, gold 2". */
export function scoreParts(parts: { label: string; value: number }[]): string {
  if (!parts.length) return L('no points', 'нет очков');
  return parts.map((x) => {
    const s = SOURCE[x.label], name = s ? pick(s.name) : D.fathers[x.label] ? pick(D.fathers[x.label]) : x.label;
    return `<span class="pt">${s?.icon ? icon(s.icon, 15) : ''}${name} <b>${x.value}</b></span>`;
  }).join('');
}
