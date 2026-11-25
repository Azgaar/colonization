import type { Choice, State } from './types.ts';
import { clone, legal } from './core.ts';

export interface View { player: number; state: State; legal: Choice[] }
const hide = (a: unknown[]) => a.map(() => '?');

/** What one seat may know. Hidden cards become '?', unrevealed map cells become null. */
export function viewFor(s: State, p: number): View {
  const v = clone(s);
  v.rng = [0, 0, 0, 0];
  v.seed = '';
  v.log = [];
  v.stack = [];
  v.frags = s.frags.map((f, i) => (s.revealed[i] ? f : -1));
  const open = (i: number) => s.map.frag[i] < 0 || s.revealed[s.map.frag[i]];
  v.map = {
    ...s.map, terrain: s.map.terrain.map((t, i) => (open(i) ? t : null)), bonus: s.map.bonus.map((t, i) => (open(i) ? t : null)), poi: s.map.poi.map((t, i) => (open(i) ? t : null)),
  };
  for (const k of ['agentDeck', 'fatherDeck', 'eventDeck', 'tribeDeck', 'tacticDeck', 'ruinDeck', 'wreckDeck'] as const) v[k] = hide(s[k]) as string[];
  v.players.forEach((pl, i) => {
    if (i === p) pl.deck.sort();
    // Collections are public: every card gained or lost is seen. How they are split is not.
    else { pl.hand = hide(pl.hand) as string[]; pl.deck = hide(pl.deck) as string[]; }
  });
  if (v.combat && s.combat) {
    const c = v.combat;
    if (c.top) {
      // Nobody has seen this card, so for its owner it is still somewhere in the deck.
      const deck = v.players[c.defender!].deck;
      deck.push(c.defender === p ? c.top : '?');
      deck.sort();
      c.top = null;
    }
    if (c.attacker !== p) { v.players[c.attacker].hand.push(...(hide(c.a) as string[])); c.a = []; }
    if (c.defender !== null && c.defender !== p) { v.players[c.defender].hand.push(...(hide(c.d) as string[])); c.d = []; }
  }
  if (v.war && !s.over) {
    for (const x of v.war.sieges) {
      if (x.fell === undefined) {
        if (x.owner !== p) { x.army = []; x.support = 0; }
        if (v.war.loyalist !== p) x.loyalist = hide(x.loyalist) as string[];
      }
    }
    for (const k of Object.keys(v.war.spent)) if (Number(k) !== p) v.war.spent[Number(k)] = { bells: 0, gold: 0 };
  }
  const mine = s.pending?.player === p;
  if (s.pending) {
    v.pending = mine ? { ...v.pending! } : { kind: s.pending.kind, player: s.pending.player };
    if (mine) delete v.pending!._given;
  }
  return { player: p, state: v, legal: mine ? legal(s) : [] };
}
