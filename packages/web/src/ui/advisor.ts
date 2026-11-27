/* The advisor (FR-A-8): on request, the search bot's three best suggestions for the person's decision, best first, each told exactly (what is gathered and how much, what is sold, whom to hire, where a ship heads); one click plays a suggestion, the whole action. */
import type { Resource } from '@col/data';
import { recruitCost } from '@col/engine';
import { $, ACT, D, P, pick, t, table } from '../data.ts';
import { settle } from '../flow.ts';
import { Board } from '../map/board.ts';
import { paint } from '../paint.ts';
import { Places } from '../places.ts';
import { Sim, type Advice, type Opt, type Pending } from '../sim.ts';
import { look, where } from './decisions.ts';
import { esc } from './md.ts';
import type { Pair } from '../view.ts';

/** The suggestions shown, for which decision (the log length when asked), or 'thinking'. */
let advice: { at: number; list: Advice[] } | 'thinking' | null = null;

const name = (p: Pair | { en: string; ru: string } | undefined, id: string) => esc(p ? pick(p) : id);
const agent = (id: string) => name(D.agents[id], id);
const tribe = (n: number) => { const x = D.settlements[n - 1]; return x ? name(D.names.tribes[x.tribe], x.tribe) : ''; };
const signs = (o: Opt) => Places.effect(o).join(' ');
/** An amount gathered, with its sign and its name: "+3 [food] food". */
const got = (n: number, i: string) => { const r = Places.ico(i); return `${Places.plus(n, Places.ico(i))} ${name(D.names.resources[r], r).toLowerCase()}`; };

/** Where a move heads, by the bot's goal: `{at}` is the cell. */
const GOALS: Record<string, Pair> = table('goal');
function move(a: Advice, ship: boolean): string {
  const g = GOALS[a.goal.replace(/\W+/g, '_')];
  // Infantry aboard goes ashore next to the ship: the cell it heads for says little.
  const aboard = !ship && P.inf === 'ship';
  if (aboard && a.goal === 'infantry: settle') return t('advisor.go_ashore');
  if (aboard && a.goal === 'infantry: ruin') return t('advisor.go_ashore2');
  if (!g || (a.to === undefined && pick(g).includes('{at}'))) return ship ? t('advisor.sail') : t('advisor.march');
  return pick(g).replace('{at}', a.to === undefined ? '' : where(a.to));
}

/** One suggestion, told exactly: the agent, then what it does and what it brings or costs. */
function describe(a: Advice): string {
  const c = a.choice as Opt, then = a.then as Opt[];
  if (c.c === 'pass') return t('advisor.pass');
  if (c.c === 'recruit') return `${t('advisor.recruit_agent')}: ${Places.plus(-recruitCost(Sim.s), 'crosses')}`;
  if (c.c !== 'play') { const d = Sim.pending()!; return esc(look(c, d as Pending).title || c.c); }
  const card = c.card as string, who = `<b>${agent(card)}:</b> `;
  const what = ((): string => {
    switch (c.a) {
      case 'produce': {
        const n = D.yields[card]?.find((y) => y.cell === c.cell && y.icon === c.icon)?.n ?? 1;
        return `${t('advisor.gather')} ${got(n, c.icon)} ${t('advisor.at')} ${where(c.cell)}`;
      }
      case 'docks': return `${t('advisor.fish_docks')} ${got(D.docks[card]?.find((y) => y.cell === c.cell)?.n ?? 1, 'food')}`;
      case 'work': return `${t('advisor.work')} ${name(D.buildings[c.building], c.building).toLowerCase()} ${signs(c)}`;
      case 'build': return `${t('advisor.build')} ${name(D.buildings[c.building], c.building).toLowerCase()} ${signs(c)}`;
      case 'found': return `${t('advisor.found_colony')} ${typeof P.inf === 'number' ? where(P.inf) : ''} ${signs(c)}`;
      case 'moveShip': return move(a, true);
      case 'moveInfantry': return move(a, false);
      case 'attack': {
        const x = D.settlements.find((y) => y.alive && y.cell === c.cell);
        return `${t('advisor.attack')} ${x ? `${tribe(x.n)} ${t('advisor.at')} ` : ''}${where(c.cell)} ${c.token === 'ship' ? t('advisor.ship') : t('advisor.infantry')}`;
      }
      case 'trade': {
        const sold = then.filter((k) => k.c === 'sell');
        if (!sold.length) return `${t('advisor.sell_europe')} ${Places.plus(Places.worth(card), 'gold')}`;
        const gold = sold.reduce((n, k) => n + k.n * (D.sell[card]?.[k.r] ?? D.price[k.r as Resource]), 0);
        return `${t('advisor.sell_europe2')} ${sold.map((k) => Places.plus(-k.n, k.r)).join(' ')} ${Places.plus(gold, 'gold')}`;
      }
      case 'hire': {
        const hired = then.filter((k) => k.c === 'buy');
        if (!hired.length) return t('advisor.call_new');
        return `${t('advisor.hire')} ${hired.map((k) => `${agent(k.agent)} ${Places.price(card, k.agent) ? Places.plus(-Places.price(card, k.agent), 'gold') : t('places.free')}`).join(', ')}`;
      }
      case 'propaganda': {
        const won = then.filter((k) => k.c === 'take');
        if (!won.length) return t('advisor.win_over');
        return `${t('advisor.win_over')} ${won.map((k) => `${name(D.fathers[k.father], k.father)} ${Places.plus(-D.fathers[k.father].bells, 'bells')}`).join(', ')}`;
      }
      case 'repair': return t('advisor.repair_1');
      case 'shipyard': return t('advisor.repair_ship');
      case 'teach': return `${t('advisor.teach')} ${agent(card)} → ${agent(c.target)}`;
      case 'customs': return `${t('advisor.sell_custom')} ${signs(c)}`;
      case 'smuggle': return `${t('advisor.smuggle')} ${signs(c)}`;
      case 'supply': return `${t('advisor.supply')} ${signs(c)}`;
      case 'exchange': return `${t('advisor.exchange')} ${agent(c.other)} ${t('advisor.new_agent')}`;
      case 'gift': return `${t('advisor.give_gift')} ${tribe(c.settlement)} ${signs(c)}`;
      case 'preach': return `${t('advisor.preach')} ${tribe(c.settlement)}, ${t('advisor.native_agent')}`;
      case 'alliance': return `${t('advisor.make_alliance')} ${tribe(c.settlement)}`;
      case 'recruit': return `${t('advisor.recruit_look', { n: c.n })} ${Places.plus(-c.n, 'crosses')}`;
      default: return esc(pick(ACT[c.a] ?? [c.a, c.a]).toLowerCase());
    }
  })();
  return who + what;
}

export function advisor() {
  const el = $('advice'), mine = Sim.mine() && !Sim.busy;
  if (!mine || (advice && advice !== 'thinking' && advice.at !== Sim.s.log.length)) advice = null;
  el.hidden = !advice;
  if (!advice) return;
  el.innerHTML = advice === 'thinking' ? `<p>${t('advisor.thinking')}</p>` : `<h4>${t('advisor.advisor')}</h4>${advice.list.map((x, i) => `<div class="adv"><span>${i + 1}. ${describe(x)}</span><button data-adv-do="${i}">${t('advisor.play')}</button></div>`).join('') || `<p>${t('advisor.nothing_suggest')}</p>`}<button class="x" data-adv-close>${t('close')}</button>`;
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if (q('[data-advise]')) {
    if (!Sim.mine()) return;
    // Show that it is thinking first: the search holds the page for most of a second.
    advice = 'thinking'; paint();
    setTimeout(() => { advice = { at: Sim.s.log.length, list: Sim.advise() }; paint(); }, 30);
  } else if (q('[data-adv-close]')) { advice = null; paint(); }
  else if ((x = q('[data-adv-do]')) && advice && advice !== 'thinking') {
    const a = advice.list[+x.dataset.advDo!]; advice = null;
    if (!a || !Sim.mine()) return;
    // The whole action, not only its first choice: first what the advice told (what to sell, whom to hire), then the bot carries it to its end, each step shown as the player's own would be.
    const step = async () => { Sim.refresh(); Places.forget(); Board.draw(); await new Promise((r) => setTimeout(r, 110)); };
    Sim.mark(); Sim.apply(a.choice);
    void (async () => {
      for (const k of a.then) { if (!Sim.mine() || !Sim.apply(k)) break; await step(); }
      await Sim.finish(step);
    })().then(() => settle());
  }
});
