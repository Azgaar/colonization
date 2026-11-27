/* A final score broken down by where its points came from (FR-U-11). */
import { D, msg, pick, t, type Text } from '../data.ts';
import { icon } from '../icons.ts';

/** Each source of points: its sign, or a Father's name for the points a Father gives. */
const SOURCE: Record<string, { icon?: string; name: Text }> = {
  colonies: { icon: 'colony', name: msg('score.colonies') }, bells: { icon: 'bells', name: msg('score.bells') }, agents: { icon: 'population', name: msg('score.agents') },
  gold: { icon: 'gold', name: msg('score.gold') }, buildings: { icon: 'colony', name: msg('score.buildings') }, fathers: { icon: 'fathers', name: msg('score.fathers') },
  alliances: { icon: 'population', name: msg('score.alliances') },
};
type Parts = { label: string; value: number }[];
export const named = (l: string) => (SOURCE[l] ? pick(SOURCE[l].name) : D.fathers[l] ? pick(D.fathers[l]) : l);
/** Points by source, in one line: "colonies 6, bells 3, gold 2". */
export function scoreParts(parts: Parts): string {
  if (!parts.length) return t('score.no_points');
  return parts.map((x) => `<span class="pt">${SOURCE[x.label]?.icon ? icon(SOURCE[x.label].icon!, 15) : ''}${named(x.label)} <b>${x.value}</b></span>`).join('');
}
/** The same as plain text, for a tooltip. */
export const scoreTip = (parts: Parts) => (parts.length ? parts.map((x) => `${named(x.label)} ${x.value}`).join(', ') : t('score.no_points'));
