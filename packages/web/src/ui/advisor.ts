/* The advisor (FR-A-8): on request, the search bot's three best suggestions for the person's decision, best first, each told exactly (what is gathered and how much, what is sold, whom to hire, where a ship heads); one click plays a suggestion, the whole action. */
import type { Resource } from '@col/data';
import { recruitCost } from '@col/engine';
import { $, ACT, D, L, P, pick } from '../data.ts';
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
/** An amount gathered, with its sign and its name: "+3 🌽 food". Fish is food. */
const got = (n: number, i: string) => { const r = Places.ico(i) === 'fish' ? 'food' : Places.ico(i); return `${Places.plus(n, Places.ico(i))} ${name(D.names.resources[r], r).toLowerCase()}`; };

/** Where a move heads, by the bot's goal: `{at}` is the cell. */
const GOALS: Record<string, Pair> = {
  'ship: explore': ['sail to explore around {at}', 'плыть на разведку к {at}'],
  'ship: to Europe': ['sail to Europe', 'плыть в Европу'],
  'ship: fetch': ['sail to Europe to fetch the infantry', 'плыть в Европу за пехотой'],
  'ship: load': ['sail to {at} to load goods', 'плыть к {at} за грузом'],
  'ship: settle': ['sail to {at} to land settlers', 'плыть к {at}, чтобы высадить колонистов'],
  'ship: ruin': ['sail to {at} to land at the ruins', 'плыть к {at}, чтобы высадиться у руин'],
  'ship: wreck': ['sail to the shipwreck at {at}', 'плыть к кораблекрушению у {at}'],
  'ship: natives': ['sail to the natives near {at}', 'плыть к индейцам у {at}'],
  'ship: pick up': ['sail to {at} to pick up the infantry', 'плыть к {at} за пехотой'],
  'ship: guard': ['sail to {at} to guard the colony', 'плыть к {at} охранять колонию'],
  'infantry: settle': ['march to {at} to found a colony', 'идти к {at}, чтобы основать колонию'],
  'infantry: ruin': ['march to the ruins at {at}', 'идти к руинам у {at}'],
  'infantry: explore': ['march to explore around {at}', 'идти на разведку к {at}'],
  'infantry: natives': ['march to the natives near {at}', 'идти к индейцам у {at}'],
  'infantry: guard': ['march to {at} to guard the colony', 'идти к {at} охранять колонию'],
  'infantry: board': ['march to {at} to board the ship', 'идти к {at}, чтобы сесть на корабль'],
};
function move(a: Advice, ship: boolean): string {
  const g = GOALS[a.goal];
  // Infantry aboard goes ashore next to the ship: the cell it heads for says little.
  const aboard = !ship && P.inf === 'ship';
  if (aboard && a.goal === 'infantry: settle') return L('go ashore to found a colony', 'высадиться, чтобы основать колонию');
  if (aboard && a.goal === 'infantry: ruin') return L('go ashore at the ruins', 'высадиться у руин');
  if (!g || (a.to === undefined && pick(g).includes('{at}'))) return ship ? L('sail', 'плыть') : L('march', 'идти');
  return pick(g).replace('{at}', a.to === undefined ? '' : where(a.to));
}

/** One suggestion, told exactly: the agent, then what it does and what it brings or costs. */
function describe(a: Advice): string {
  const c = a.choice as Opt, then = a.then as Opt[];
  if (c.c === 'pass') return L('Pass', 'Пасовать');
  if (c.c === 'recruit') return `${L('Recruit an agent with crosses', 'Завербовать агента за кресты')}: ${Places.plus(-recruitCost(Sim.s), 'crosses')}`;
  if (c.c !== 'play') { const d = Sim.pending()!; return esc(look(c, d as Pending).title || c.c); }
  const card = c.card as string, who = `<b>${agent(card)}:</b> `;
  const what = ((): string => {
    switch (c.a) {
      case 'produce': {
        const n = D.yields[card]?.find((y) => y.cell === c.cell && y.icon === c.icon)?.n ?? 1;
        return `${L('gather', 'добыть')} ${got(n, c.icon)} ${L('at', 'на')} ${where(c.cell)}`;
      }
      case 'docks': return `${L('fish from the docks', 'ловить рыбу у причала')} ${got(D.docks[card]?.find((y) => y.cell === c.cell)?.n ?? 1, 'fish')}`;
      case 'work': return `${L('work in the', 'работать:')} ${name(D.buildings[c.building], c.building).toLowerCase()} ${signs(c)}`;
      case 'build': return `${L('build the', 'построить:')} ${name(D.buildings[c.building], c.building).toLowerCase()} ${signs(c)}`;
      case 'found': return `${L('found a colony at', 'основать колонию на')} ${typeof P.inf === 'number' ? where(P.inf) : ''} ${signs(c)}`;
      case 'moveShip': return move(a, true);
      case 'moveInfantry': return move(a, false);
      case 'attack': {
        const x = D.settlements.find((y) => y.alive && y.cell === c.cell);
        return `${L('attack', 'атаковать')} ${x ? `${tribe(x.n)} ${L('at', 'на')} ` : ''}${where(c.cell)} ${c.token === 'ship' ? L('with the ship', 'кораблём') : L('with the infantry', 'пехотой')}`;
      }
      case 'trade': {
        const sold = then.filter((k) => k.c === 'sell');
        if (!sold.length) return `${L('sell in Europe, up to', 'продать в Европе, до')} ${Places.plus(Places.worth(card), 'gold')}`;
        const gold = sold.reduce((n, k) => n + k.n * (D.sell[card]?.[k.r] ?? D.price[k.r as Resource]), 0);
        return `${L('sell in Europe', 'продать в Европе')} ${sold.map((k) => Places.plus(-k.n, k.r)).join(' ')} ${Places.plus(gold, 'gold')}`;
      }
      case 'hire': {
        const hired = then.filter((k) => k.c === 'buy');
        if (!hired.length) return L('call new agents to the pier, then hire', 'обновить причал и нанять');
        return `${L('hire', 'нанять')} ${hired.map((k) => `${agent(k.agent)} ${Places.price(card, k.agent) ? Places.plus(-Places.price(card, k.agent), 'gold') : L('free', 'даром')}`).join(', ')}`;
      }
      case 'propaganda': {
        const won = then.filter((k) => k.c === 'take');
        if (!won.length) return L('win over a Founding Father', 'привлечь отца-основателя');
        return `${L('win over', 'привлечь:')} ${won.map((k) => `${name(D.fathers[k.father], k.father)} ${Places.plus(-D.fathers[k.father].bells, 'bells')}`).join(', ')}`;
      }
      case 'repair': return L('repair 1 damage of the ship in Europe', 'починить 1 повреждение корабля в Европе');
      case 'shipyard': return L('repair the ship fully at the shipyard', 'полностью починить корабль на верфи');
      case 'teach': { const base = D.agents[card]?.base; return `${L('teach the', 'обучить:')} ${agent(c.target)} → ${base && D.agents[base] ? agent(base) : agent(card)}`; }
      case 'customs': return `${L('sell at the custom house', 'продать на таможне')} ${signs(c)}`;
      case 'smuggle': return `${L('smuggle', 'контрабанда')} ${signs(c)}`;
      case 'supply': return `${L('supply', 'снабжение')} ${signs(c)}`;
      case 'exchange': return `${L('exchange it and the', 'обменять его и')} ${agent(c.other)} ${L('for a new agent', 'на нового агента')}`;
      case 'gift': return `${L('give a gift to the', 'подарок:')} ${tribe(c.settlement)} ${signs(c)}`;
      case 'preach': return `${L('preach to the', 'проповедь:')} ${tribe(c.settlement)}, ${L('a native agent joins', 'агент-индеец присоединится')}`;
      case 'alliance': return `${L('make an alliance with the', 'союз:')} ${tribe(c.settlement)}`;
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
  el.innerHTML = advice === 'thinking' ? `<p>${L('Thinking…', 'Думаю…')}</p>` : `<h4>${L('Advisor', 'Советник')}</h4>${advice.list.map((x, i) => `<div class="adv"><span>${i + 1}. ${describe(x)}</span><button data-adv-do="${i}">${L('Play it', 'Сделать')}</button></div>`).join('') || `<p>${L('Nothing to suggest here.', 'Здесь нечего посоветовать.')}</p>`}<button class="x" data-adv-close>${L('Close', 'Закрыть')}</button>`;
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
