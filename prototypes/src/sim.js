/* The real rules engine behind the prototype: one seat is the player, the others are the test bots. */
const E = window.Engine, rules = E.loadRuleset(), me = 0, KINDS = ['trader', 'balanced', 'explorer', 'missionary', 'rebel'];
let s, bots, history = [], seen = 0, P0 = null, fast = localStorage.getItem('fast') === '1';
const D = E.exportRules(rules);
const seats = () => { bots = s.players.map((_, i) => E.goalBot(`${s.seed}${i}`, E.PERSONALITIES[KINDS[i % KINDS.length]])); };
/** Bring what is shown in step with the game. `D` and the player's own record keep their identity. */
function refresh() {
  const x = E.exportState(s, me);
  if (P0) { Object.assign(P0, x.players[me]); x.players[me] = P0; } else P0 = x.players[me];
  Object.assign(D, x);
}
function start(json) { s = E.load(json, rules); s.logging = true; seen = s.log.length; history = []; Sim.placed.splice(0); seats(); refresh(); }
function fresh(n) { s = E.createGame({ def: rules, seed: `p${Date.now()}`, nations: ['french', 'english', 'spanish', 'dutch', 'portuguese'].slice(0, n), logging: true }); seen = 0; history = []; Sim.placed.splice(0); seats(); refresh(); }
const mine = () => s.pending?.player === me && !s.over;
const kind = () => (mine() ? s.pending.kind : null);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let busy = false; const told = new Set();
export const Sim = {
  D, placed: [],
  get s() { return s; }, get busy() { return busy; }, get fast() { return fast; }, set fast(v) { fast = v; localStorage.setItem('fast', v ? '1' : ''); },
  kind, mine, refresh, start, fresh,
  legal: () => (mine() ? E.viewFor(s, me).legal : []),
  /** Remember this moment, so that it can be taken back. */
  mark() { history.push({ json: E.save(s), placed: Sim.placed.slice() }); if (history.length > 40) history.shift(); },
  canUndo: () => history.length > 0 && !busy,
  undo() { const h = history.pop(); if (!h) return; s = E.load(h.json, rules); Sim.placed.splice(0, 99, ...h.placed); seen = s.log.length; refresh(); },
  /** One choice of the player. Choices come from the engine's own lists. */
  apply(c) { E.applyInPlace(s, c, true); },
  /** These entries were already told. */
  seen(l) { l.forEach((e) => told.add(e)); },
  /** News since the last look. */
  news() { const l = s.log.slice(seen).filter((e) => !told.has(e) || !['combat', 'attack'].includes(e.e)); seen = s.log.length; return l; },
  /** Everyone else plays until it is the player's decision again. `show` is called after each of their turns. */
  async run(show) {
    if (busy) return; busy = true;
    let last = null;
    while (!s.over && s.pending.player !== me) {
      const p = s.pending.player, k = s.pending.kind, from = s.log.length;
      E.applyInPlace(s, bots[p].choose(E.viewFor(s, p)), true);
      if (k === 'turn') last = { p, from };
      const ended = s.over || s.pending.kind === 'turn' || s.pending.player === me;
      if (last && ended) { refresh(); show(last.p, s.log.slice(last.from)); last = null; if (!fast) await wait(650); }
    }
    busy = false; refresh();
  },
  /** Let a bot play for the player as well, up to some point. */
  async auto(until) { if (busy) return; Sim.mark(); let n = 0; while (!s.over && !until(s) && n++ < 5000) { const p = s.pending.player; E.applyInPlace(s, bots[p].choose(E.viewFor(s, p)), true); } Sim.placed.splice(0); refresh(); },
};
start(window.START);
