/* What another player did on their turn, said in one line: the agent, the action and what came of it. */
import { ACT, cap, D, pick, t } from '../data.ts';
import { Places } from '../places.ts';
import type { Entry } from '../sim.ts';

const cells = (n: number) => t('news.cells', { n });
const plus = (n: number, i: string) => Places.plus(n, Places.ico(i), 15);
const tribe = (n: number) => { const v = D.settlements.find((x) => x.n === n); return v ? pick(D.names.tribes[v.tribe]) : ''; };
const building = (b: string) => cap(pick(D.buildings[b]));
/** Gold, bells and crosses that came with the action itself (not from tax or events). */
const income = (p: number, l: Entry[]) => { const sum: Record<string, number> = {}; for (const x of l) if (x.p === p && ['gold', 'bells', 'crosses'].includes(x.e) && !['tax', 'event'].includes(x.why)) sum[x.e] = (sum[x.e] || 0) + x.n; return Object.entries(sum).filter(([, n]) => n).map(([k, n]) => plus(n, k)); };
/** What was gathered or made. */
const made = (p: number, l: Entry[]) => l.filter((x) => x.p === p && x.e === 'produce' && x.n).map((x) => plus(x.n, x.icon));
/** One line for a turn: "Trapper: gathered +1 fur", "Sailor: sailed 4 cells, new land". */
export function doing(p: number, l: Entry[]): string {
  const play = l.find((x) => x.e === 'play' && x.p === p), mine = l.filter((x) => x.p === p);
  const recruit = mine.find((x) => x.e === 'recruit');
  if (!play) return recruit ? t('news.recruited', { v: pick(D.agents[recruit.agent]) }) : '';
  const agent = pick(D.agents[play.card]), got = [...made(p, l), ...income(p, l)], has = (e: string) => mine.filter((x) => x.e === e);
  let what: string;
  switch (play.a) {
    case 'produce': what = t('news.gathered'); break;
    case 'docks': what = t('news.fished'); break;
    case 'work': what = building(play.building); break;
    case 'build': what = `${t('news.built')} ${has('build').map((x) => building(x.building)).join(', ')}`; break;
    case 'hire': what = `${t('news.hired')} ${has('hire').map((x) => pick(D.agents[x.agent])).join(', ')}`; break;
    case 'propaganda': what = `${t('news.won_over')} ${has('father').map((x) => pick(D.fathers[x.father])).join(', ')}`; break;
    case 'found': what = t('news.founded_colony'); break;
    case 'trade': what = `${t('news.sold')} ${has('sell').map((x) => plus(x.n, x.r).replace(/^\+/, '')).join(' ')}`; break;
    case 'moveShip': case 'moveInfantry': {
      const steps = has('step'), last = steps.at(-1), extra: string[] = [];
      if (last && D.zone[last.cell] === 'europe') extra.push(t('news.europe'));
      if (has('reveal').length) extra.push(t('news.new_land'));
      if (has('embark').length) extra.push(t('news.went_aboard'));
      for (const x of has('poi')) extra.push(t(x.deck));
      for (const x of has('load')) extra.push(`${t('news.loaded')} ${plus(x.n, x.r).replace(/^\+/, '')}`);
      for (const x of has('unload')) extra.push(`${t('news.unloaded')} ${plus(x.n, x.r).replace(/^\+/, '')}`);
      what = [`${play.a === 'moveShip' ? t('news.sailed') : t('news.marched')} ${cells(steps.length)}`, ...extra].join(', ');
      break;
    }
    case 'alliance': what = `${t('news.alliance')} ${tribe(play.settlement)}`; break;
    case 'preach': what = `${t('news.preached')} ${tribe(play.settlement)}`; break;
    case 'recruit': what = has('recruit').length ? `${t('news.recruited2')} ${has('recruit').map((x) => pick(D.agents[x.agent])).join(', ')}` : t('news.recruited_nobody'); break;
    case 'gift': what = `${t('news.gift')} ${tribe(play.settlement)}`; break;
    default: what = pick(ACT[play.a] || [play.a, play.a]).toLowerCase();
  }
  return `${agent}: ${what}${got.length ? ` ${got.join(' ')}` : ''}`;
}
