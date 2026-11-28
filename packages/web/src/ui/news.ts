/* What a player did on their turn, said in one line: the agent, the action and what came of it. */
import { ACT, cap, D, pick, t } from '../data.ts';
import { icon } from '../icons.ts';
import { Places } from '../places.ts';
import type { Entry } from '../sim.ts';

const cells = (n: number) => t('news.cells', { n });
const plus = (n: number, i: string) => Places.plus(n, Places.ico(i), 15);
/** Goods without a sign: "2 [crops]". */
const goods = (n: number, r: string) => `${n} ${icon(r, 15)}`;
const tribe = (n: number) => { const v = D.settlements.find((x) => x.n === n); return v ? pick(D.names.tribes[v.tribe]) : ''; };
const building = (b: string) => cap(pick(D.buildings[b]));
const agent = (id: string) => pick(D.agents[id]);
/** Gold that a sale brought. */
const SALE = ['trade', 'customs', 'smuggle'];
/** Gold, bells and crosses that came with the action itself (not from tax, events or a sale, which is said apart). */
const income = (p: number, l: Entry[]) => { const sum: Record<string, number> = {}; for (const x of l) if (x.p === p && ['gold', 'bells', 'crosses'].includes(x.e) && !['tax', 'event', ...SALE].includes(x.why)) sum[x.e] = (sum[x.e] || 0) + x.n; return Object.entries(sum).filter(([, n]) => n).map(([k, n]) => plus(n, k)); };
/** What was gathered or made. */
const made = (p: number, l: Entry[]) => l.filter((x) => x.p === p && x.e === 'produce' && x.n).map((x) => plus(x.n, x.icon));
/** "for 5 [gold]": what a sale brought. */
const paid = (p: number, l: Entry[]) => { const n = l.filter((x) => x.p === p && x.e === 'gold' && SALE.includes(x.why)).reduce((a, x) => a + x.n, 0); return n ? ` ${t('news.for')} ${goods(n, 'gold')}` : ''; };
/** Whom an attack was against: a governor or a tribe. */
export const foe = (e: Entry): string => {
  if (typeof e.defender === 'number') return Places.name(e.defender);
  const v = typeof e.cell === 'number' ? D.settlements.find((x) => x.cell === e.cell) : undefined;
  return v ? pick(D.names.tribes[v.tribe]) : '';
};
/** One line for a turn: "Fur Trapper: gathered +1 [crops]", "Merchant: sold 2 [crops] for 5 [gold]". Empty when there is nothing to tell. */
export function doing(p: number, l: Entry[]): string {
  const play = l.find((x) => x.e === 'play' && x.p === p), mine = l.filter((x) => x.p === p), has = (e: string) => mine.filter((x) => x.e === e);
  const pass = l.find((x) => x.e === 'pass' && x.p === p);
  if (pass) return pass.forced ? '' : t('news.passed', { n: pass.n ?? 0 });
  if (!play) return has('recruit').length ? cap(`${t('news.recruited')} ${has('recruit').map((x) => agent(x.agent)).join(', ')}`) : '';
  const got = [...made(p, l), ...income(p, l)];
  let what: string;
  switch (play.a) {
    case 'produce': what = t('news.gathered'); break;
    case 'docks': what = t('news.fished'); break;
    case 'work': what = `${t('news.worked')} ${building(play.building)}`; break;
    case 'build': what = `${t('news.built')} ${has('build').map((x) => building(x.building)).join(', ')}`; break;
    case 'hire': what = has('hire').length ? `${t('news.hired')} ${has('hire').map((x) => agent(x.agent)).join(', ')}` : t('news.hired_nobody'); break;
    case 'propaganda': what = `${t('news.won_over')} ${has('father').map((x) => pick(D.fathers[x.father])).join(', ')}`; break;
    case 'found': what = t('news.founded_colony'); break;
    case 'trade': what = `${t('news.sold')} ${has('sell').map((x) => goods(x.n, x.r)).join(' ')}${paid(p, l)}`; break;
    case 'customs': what = `${t('news.sold')} ${play.r ? goods(1, play.r) : has('sell').map((x) => goods(x.n, x.r)).join(' ')} ${t('news.at_customs')}${paid(p, l)}`; break;
    case 'smuggle': what = `${t('news.smuggled')} ${goods(1, play.r)}${paid(p, l)}`; break;
    case 'moveShip': case 'moveInfantry': {
      const steps = has('step'), last = steps.at(-1), extra: string[] = [];
      if (last && D.zone[last.cell] === 'europe') extra.push(t('news.europe'));
      if (has('reveal').length) extra.push(t('news.new_land'));
      if (has('embark').length) extra.push(t('news.went_aboard'));
      for (const x of has('poi')) extra.push(x.deck === 'ruin' ? t('news.ruin') : t('news.wreck'));
      for (const x of has('load')) extra.push(`${t('news.loaded')} ${goods(x.n, x.r)}`);
      for (const x of has('unload')) extra.push(`${t('news.unloaded')} ${goods(x.n, x.r)}`);
      what = [`${play.a === 'moveShip' ? t('news.sailed') : t('news.marched')} ${cells(steps.length)}`, ...extra].join(', ');
      break;
    }
    case 'attack': { const c = l.find((x) => x.e === 'combat' && x.p === p); what = `${t('news.attacked')} ${c ? foe(c) : ''}`.trim(); break; }
    case 'repair': what = t('news.repaired'); break;
    case 'shipyard': what = t('news.repaired_yard'); break;
    case 'teach': what = `${t('news.retrained')} ${agent(play.target)}`; break;
    case 'supply': what = t('news.supplied', { food: icon('food', 15) }); break;
    case 'exchange': what = t('news.exchanged', { a: agent(play.other) }); break;
    case 'alliance': what = `${t('news.alliance')} ${tribe(play.settlement)}`; break;
    case 'preach': what = `${t('news.preached')} ${tribe(play.settlement)}`; break;
    case 'recruit': what = has('recruit').length ? `${t('news.recruited')} ${has('recruit').map((x) => agent(x.agent)).join(', ')}` : t('news.recruited_nobody'); break;
    case 'gift': { const g = has('gift')[0]; what = `${t('news.gift')} ${tribe(play.settlement)}${g ? `, ${t('news.hostility', { n: D.settings.natives.giftBase + g.hits })}` : ''}`; break; }
    default: what = pick(ACT[play.a] || [play.a, play.a]).toLowerCase();
  }
  return `${agent(play.card)}: ${what}${got.length ? ` ${got.join(' ')}` : ''}`;
}
