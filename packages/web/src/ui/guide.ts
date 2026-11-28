/* The rules reference (FR-U-20): the board game's rules in short, in both languages, from the goal to the score.
 * Every number comes from the rules being played, so a changed ruleset reads true here as well. Source: docs/rules-spec.md (rule IDs in brackets). */
import { $, D, lang, msg, pick, t, type Text } from '../data.ts';
import { icon } from '../icons.ts';
import { esc } from './md.ts';

interface Section { id: string; title: Text; items: Text[] }

/** Open, and on which section. */
const G = { open: false, at: 'goal' };
export const openGuide = (at = G.at) => { G.open = true; G.at = at; guide(); };
export const guideOpen = () => G.open;

function sections(): Section[] {
  const s = D.settings, tax = s.tax.track, ic = (n: string) => icon(n, 17), fur = D.terrainYields.forest?.includes('crops');
  return [
    { id: 'goal', title: msg('guide.goal'), items: [
      msg('guide.govern_colony', { firstYear: s.rounds.firstYear, v: s.rounds.firstYear + (s.rounds.max - 1) * s.rounds.yearStep, max: s.colony.max }),
      msg('guide.game_ends', { bells: s.war.bells, bells2: ic('bells'), max: s.rounds.max }),
      msg('guide.win_hold', { vp: ic('vp') }),
    ] },
    { id: 'round', title: msg('guide.round'), items: [
      msg('guide.draw_up', { size: s.hand.size }),
      msg('guide.turn_player'),
      msg('guide.top_event'),
      msg('guide.tax', { track: tax.join(', '), gold: ic('gold'), pay: s.tax.payBells ? t('guide.tax_pay', { n: s.tax.payBells, bells: ic('bells') }) : '', n: s.tax.refuseRef, solo: s.tax.refuseRefSolo, two: s.tax.refuseRefTwo, bells: s.tax.refuseBells ? t('guide.tax_bells', { n: s.tax.refuseBells, bells: ic('bells') }) : '' }),
      msg('guide.recruit_play', { crosses: ic('crosses') }),
    ] },
    { id: 'agents', title: msg('top.agents'), items: [
      msg('guide.agent_take'),
      msg('guide.education_decides'),
      msg('guide.criminal_slave'),
      msg('guide.played_agent'),
    ] },
    { id: 'move', title: msg('guide.moving_exploring'), items: [
      msg('guide.one_action', { ship: ic('ship'), pawn: ic('pawn'), points: s.move.points }),
      msg('guide.moving_clouds', { explore: s.move.explore }),
      msg('guide.infantry_rides'),
      msg('guide.hold_places', { size: s.hold.size, cargo: s.move.cargo }),
      msg('guide.edge_map'),
    ] },
    { id: 'colony', title: msg('guide.colonies'), items: [
      msg('guide.infantry_founds', { edge: s.colony.onEdge ? '' : t('guide.not_edge'), value: s.colony.foundCost.value, v: ic(s.colony.foundCost.resource) }),
      msg('guide.produce', { forest: t(fur ? 'guide.forest_fur' : 'guide.forest', { timber: ic('timber') }), food: ic('food'), silver: ic('silver') }),
      msg('guide.build_timber', { max: s.buildings.max }),
      msg('guide.warehouse_resources', { base: s.warehouse.base }),
      msg('guide.supply_1'),
    ] },
    { id: 'europe', title: msg('word.europe'), items: [
      msg('guide.ship_map'),
      msg('guide.trade_sell', { maxPrice: s.market.maxPrice }),
      msg('guide.hire_buy', { max: s.hire.max }),
      msg('guide.propaganda_take', { maxFathers: s.propaganda.maxFathers, max: s.fathers.max }),
      msg('guide.repair_remove'),
    ] },
    { id: 'natives', title: msg('guide.natives'), items: [
      msg('guide.villages_appear', { anger: ic('hostility'), maxHostility: s.natives.maxHostility }),
      msg('guide.next_village'),
      msg('guide.events_activate'),
    ] },
    { id: 'combat', title: msg('guide.combat'), items: [
      msg('guide.attack_neighbouring'),
      msg('guide.strength', { faces: new Intl.ListFormat(lang(), { type: 'disjunction' }).format(s.combat.successFaces.map(String)), n: s.combat.victoryBells, bells: ic('bells') }),
      msg('guide.beaten_token'),
    ] },
    { id: 'events', title: msg('guide.events_ruins'), items: [
      msg('guide.one_event', { max: s.rounds.max }),
      msg('guide.ruins_wrecks'),
    ] },
    { id: 'war', title: msg('guide.war_independence'), items: [
      msg('guide.begins_after', { bells: s.war.bells, bells2: ic('bells'), max: s.rounds.max }),
      s.war.loyalistFrom > 2
        ? msg('guide.governor_fewest', { loyalistFrom: s.war.loyalistFrom })
        : msg('guide.governor_fewest2'),
      msg('guide.king_s', { refStrength: s.war.refStrength }),
      msg('guide.patriots_defend', { bells: ic('bells'), mercenaryGold: s.war.mercenaryGold, gold: ic('gold'), allyCubes: s.war.allyCubes }),
    ] },
    { id: 'score', title: msg('guide.scoring'), items: [
      msg('guide.patriot_per', { patriotColony: s.score.patriotColony, vp: ic('vp'), perBell: s.score.perBell, bellsPerPoint: s.score.bellsPerPoint, bells: ic('bells') }),
      msg('guide.everybody_1', { vp: ic('vp'), agentsPerPoint: s.score.agentsPerPoint, goldPerPoint: s.score.goldPerPoint, gold: ic('gold'), building: s.score.building, fathers: s.score.father }),
      msg('guide.ties_go'),
    ] },
    { id: 'icons', title: msg('guide.icons'), items: [
      msg('guide.food_timber', { food: ic('food'), timber: ic('timber'), crops: ic('crops'), goods: ic('goods'), silver: ic('silver') }),
      msg('guide.gold_bells', { gold: ic('gold'), bells: ic('bells'), crosses: ic('crosses'), king: ic('king'), vp: ic('vp') }),
      msg('guide.ship_infantry', { ship: ic('ship'), pawn: ic('pawn'), hostility: ic('hostility') }),
    ] },
  ];
}

/** The rules over the table: an index of sections on the left, the chosen section on the right. Esc or the cross closes it. */
export function guide() {
  const el = $('guide');
  el.hidden = !G.open;
  if (!G.open) return;
  const all = sections(), sec = all.find((x) => x.id === G.at) ?? all[0];
  el.innerHTML = `<div class="gd"><nav>${all.map((x) => `<button class="${x.id === sec.id ? 'on' : ''}" data-guide-at="${x.id}">${esc(pick(x.title))}</button>`).join('')}</nav>
<article><h2>${esc(pick(sec.title))}</h2>${sec.items.map((p) => `<p>${pick(p)}</p>`).join('')}
<p class="gnote">${t('guide.full_rules')}</p></article>
<button class="x" data-guide-close>${t('close')}</button></div>`;
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if ((x = q('[data-guide]'))) { e.stopPropagation(); openGuide(x.dataset.guide || undefined); }
  else if ((x = q('[data-guide-at]'))) { G.at = x.dataset.guideAt!; guide(); }
  else if (q('[data-guide-close]') || (G.open && t === $('guide'))) { G.open = false; guide(); }
}, true);
// F1 opens and closes the rules anywhere; Esc closes them first.
document.addEventListener('keydown', (e) => {
  if (e.key === 'F1') { e.preventDefault(); G.open = !G.open; guide(); }
  else if (e.key === 'Escape' && G.open) { e.stopImmediatePropagation(); G.open = false; guide(); }
}, true);
