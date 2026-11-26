/* What another player did on their turn, said in one line: the agent, the action and what came of it. */
import { plural } from '../plural.ts';
import { ACT, cap, D, L, pick, t } from '../data.ts';
import { Places } from '../places.ts';
import type { Entry } from '../sim.ts';

const cells = (n: number) => L(`${n} ${n === 1 ? 'cell' : 'cells'}`, `${n} ${plural(n, 'клетка', 'клетки', 'клеток')}`);
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
  if (!play) return recruit ? L(`Recruited: ${pick(D.agents[recruit.agent])}`, `Вербовка: ${pick(D.agents[recruit.agent])}`) : '';
  const agent = pick(D.agents[play.card]), got = [...made(p, l), ...income(p, l)], has = (e: string) => mine.filter((x) => x.e === e);
  let what: string;
  switch (play.a) {
    case 'produce': what = L('gathered', 'добыча'); break;
    case 'docks': what = L('fished', 'рыбалка'); break;
    case 'work': what = building(play.building); break;
    case 'build': what = `${L('built', 'постройка:')} ${has('build').map((x) => building(x.building)).join(', ')}`; break;
    case 'hire': what = `${L('hired', 'наём:')} ${has('hire').map((x) => pick(D.agents[x.agent])).join(', ')}`; break;
    case 'propaganda': what = `${L('won over', 'пропаганда:')} ${has('father').map((x) => pick(D.fathers[x.father])).join(', ')}`; break;
    case 'found': what = L('founded a colony', 'основана колония'); break;
    case 'trade': what = `${L('sold', 'продажа')} ${has('sell').map((x) => plus(x.n, x.r).replace(/^\+/, '')).join(' ')}`; break;
    case 'moveShip': case 'moveInfantry': {
      const steps = has('step'), last = steps.at(-1), extra: string[] = [];
      if (last && D.zone[last.cell] === 'europe') extra.push(L('to Europe', 'в Европу'));
      if (has('reveal').length) extra.push(L('new land', 'открыта земля'));
      if (has('embark').length) extra.push(L('went aboard', 'посадка на корабль'));
      for (const x of has('poi')) extra.push(t(x.deck));
      for (const x of has('load')) extra.push(`${L('loaded', 'погрузка')} ${plus(x.n, x.r).replace(/^\+/, '')}`);
      for (const x of has('unload')) extra.push(`${L('unloaded', 'выгрузка')} ${plus(x.n, x.r).replace(/^\+/, '')}`);
      what = [`${play.a === 'moveShip' ? L('sailed', 'плавание:') : L('marched', 'марш:')} ${cells(steps.length)}`, ...extra].join(', ');
      break;
    }
    case 'alliance': what = `${L('alliance with', 'союз:')} ${tribe(play.settlement)}`; break;
    case 'preach': what = `${L('preached to', 'проповедь:')} ${tribe(play.settlement)}`; break;
    case 'gift': what = `${L('gift to', 'подарок:')} ${tribe(play.settlement)}`; break;
    default: what = pick(ACT[play.a] || [play.a, play.a]).toLowerCase();
  }
  return `${agent}: ${what}${got.length ? ` ${got.join(' ')}` : ''}`;
}
