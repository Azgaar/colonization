/**
 * English card texts for the rulebook, written from each card's effect so that no number is typed by hand.
 * Russian prints the cards' own texts (rules/, compiled to texts.json); the English game texts are shortened for the screen,
 * so the rulebook says the whole card here. Symbols are written as emoji and drawn as the game's icons by build.ts.
 */
import type { GameDef, Mod } from '../packages/data/src/index.ts';

type Any = Record<string, any>; // the effect nodes, read loosely: every kind is handled by name below
export const RES: Record<string, string> = { food: '🟦', timber: '🟫', crops: '🟩', goods: '🟧', silver: '⬜', gold: '🟡', bells: '🔔', crosses: '✝️' };
const ICON: Record<string, string> = { food: '🐟', timber: '🪵', crops: '🌿', goods: '📦', silver: '🪙', crosses: '✝️', bells: '🔔' };
const sign = (x: number) => (x > 0 ? `+${x}` : `−${-x}`);
const list = (xs: string[], and = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs.at(-1)}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function describe(R: GameDef) {
  const S = R.settings;
  const agent = (base: string) => (Object.values(R.agents).find((a) => a.base === base)?.en ?? base).toLowerCase();
  const building = (id: string) => (R.buildings[id]?.en ?? id).toLowerCase();
  const terrain = (id: string) => ((R.terrain as Record<string, { en: string }>)[id]?.en ?? id).toLowerCase();
  const a = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

  /** What an agent is good at. */
  function talent(mods: Mod[]): string {
    const out: string[] = [];
    for (const m of mods as (Mod & Any)[]) {
      const where = m.terrain ? ` in ${terrain(m.terrain)}` : m.island ? ` on an island of ${m.island} cells or fewer` : '';
      const icons = (m.icons as string[] | undefined)?.map((i) => ICON[i] ?? i).join(' ') ?? '';
      switch (m.mod) {
        case 'onlyProduce': out.push('May only produce. Still counts 1 in battle'); break;
        case 'production': out.push(`${icons ? `${icons} ${sign(m.add)}` : `Produce ${sign(m.add)}`}${where}${m.enables ? ', even where the land gives nothing' : ''}`); break;
        case 'move': out.push(`${sign(m.add)} 💨`); break;
        case 'ignoreSkull': out.push('Ignores 💀 effects'); break;
        case 'cost': out.push(m.of === 'build' ? `Buildings cost ${sign(m.add)} 🟫` : `Hiring costs ${sign(m.add)} 🟡`); break;
        case 'sellPrice': out.push(`Trade: ${sign(m.add)} 🟡 for each resource sold`); break;
        case 'smuggle': out.push(`Smuggles: sells 1 resource from the warehouse at the market price ${sign(m.add)} 🟡, off the demand track`); break;
        case 'combat': out.push(`${m.token === 'ship' ? '⛵' : '♟️'} ${sign(m.add)} 🗡️${m.vs === 'native' ? ' against natives' : ''}${where}`); break;
        case 'bombard': out.push('Bombards'); break;
        default: out.push(String(m.mod));
      }
    }
    return out.join('. ');
  }

  /** What a building does. */
  function work(b: GameDef['buildings'][string]): string {
    const w = b.work as Any | undefined;
    if (b.storage) return `Warehouse holds ${S.warehouse.base + b.storage} resources instead of ${S.warehouse.base}`;
    if (b.defence) return `${sign(b.defence)} 🗡️ to every colony’s defence${b.id === S.raid.stoppedBy ? '; stops native raids' : ''}`;
    if (w?.kind === 'ocean') return `Work an ocean cell: ${sign(w.add)} 🐟`;
    if (w?.kind === 'produce') return `${w.consumes ? `${w.consumes.amount} ${RES[w.consumes.res]} → ` : '→ '}${w.amount} ${ICON[w.icon] ?? RES[w.icon] ?? w.icon}`;
    if (w?.kind === 'teach') return `Retrain the agent played here, ${b.edu ? 'one with 📖 or more' : 'any agent'}, into any ${w.maxEdu === 2 ? '🎓' : '📖'} profession`;
    if (w?.kind === 'market') return 'Sell any resources from the warehouse, as much as you like, at the Europe market price: no ship needed';
    if (w?.kind === 'sell') return w.amount > 1 ? `Sell up to ${w.amount} of one resource from the warehouse at the market price` : 'Sell 1 resource from the warehouse at the market price';
    if (w?.kind === 'repair') return `Repair the ship fully while it lies next to your colony${S.damage.shipyardRepairs ? '; a damaged ship may come back to your colony instead of Europe, fully repaired' : ''}${S.damage.repairOnBuild ? '; building it repairs your ship at once' : ''}`;
    return '';
  }

  /* ---- ruins and wrecks ---- */
  const gains = (n: Any, k: number) => [
    ...(['gold', 'bells', 'crosses'] as const).filter((q) => n[q]).map((q) => `${sign(k * n[q])} ${RES[q]}`),
    ...Object.entries((n.wh ?? {}) as Record<string, number>).map(([q, v]) => `${sign(k * v)} ${RES[q]}`),
    ...Object.entries((n.hold ?? {}) as Record<string, number>).map(([q, v]) => `${sign(k * v)} ${RES[q]} into the hold`),
  ].join(', ');
  function step(n: Any): string {
    const skull = n.skull ? ' 💀' : '';
    switch (n.n) {
      case 'gain': return gains(n, 1);
      case 'lose': return gains(n, -1);
      case 'endMove': return 'the move ends';
      case 'moves': return `${sign(n.add)} 💨`;
      case 'toEurope': return `the token goes to Europe${skull}`;
      case 'damage': return `${plural(n.amount, 'damage', 'damage')}${skull}`;
      case 'hostilityNearest': return `${sign(n.add)} 💢 at the nearest settlement`;
      case 'discardCards': return `discard ${plural(n.amount, 'card')}`;
      case 'loseTopAgent': return `remove the top agent of your deck${skull}`;
      case 'discardHand': return `discard your hand${skull}`;
      case 'pierLeftmost': return 'put the leftmost agent of the pier into your discard';
      case 'drawPoi': return 'resolve another card of this deck';
      case 'guide': return `look at the top ${n.look} cards of this deck, resolve one and discard the other`;
      case 'revealAdjacent': return 'reveal the fragments beside this one';
      case 'freeBasicBuilding': return 'build a basic building for free';
      case 'toColonyWater': return 'move the ship next to any of your colonies';
      case 'dropHold': return 'lose the whole cargo';
      case 'ref': return `${sign(n.add)} 🟥`;
      case 'takeAgent': return `put ${n.amount === 1 ? a(agent(n.agent)) : `${n.amount} ${agent(n.agent)}s`} into your discard`;
      default: return '';
    }
  }
  const steps = (l: Any[] = []) => l.filter((n) => n.n !== 'roll' && n.n !== 'choice').map(step).filter(Boolean).join(', ');
  /** What an option costs; `paid` says it as what happens ("−2 🔔") when the cost is all the option does. */
  function cost(c: Any = {}, needs?: string, paid = false): string {
    const out: string[] = [], m = paid ? '−' : '';
    if (c.agent) out.push(c.agent === 'scout' ? 'needs a scout' : 'needs an agent with 🗡️');
    for (const q of ['gold', 'bells'] as const) if (c[q]) out.push(`${m}${c[q]} ${RES[q]}`);
    if (c.cards) out.push(`discard ${plural(c.cards, 'card')} from your hand`);
    if (c.anyFood) out.push(`${m}${c.anyFood} 🟦 from the hold or the warehouse`);
    if (c.anyResource) out.push(`${m}${c.anyResource} resource of any kind`);
    if (c.holdResource) out.push(`discard ${c.holdResource} resource from the hold`);
    if (c.wholeHold) out.push(`discard the whole cargo, at least ${c.wholeHold} resources`);
    if (needs === 'sea-colony') out.push('needs a colony by the sea');
    return out.join('; ');
  }
  function roll(l: Any[] = []): string {
    const r = l.find((n) => n.n === 'roll');
    if (!r) return '';
    let from = 1;
    return `<span class="rolls">${(r.table as Any[]).map((x) => { const span = from === x.max ? `${from}` : `${from}–${x.max}`; from = x.max + 1; return `<span>🎲 ${span}: ${steps(x.do) || 'nothing'}</span>`; }).join('')}</span>`;
  }
  /** A ruin or wreck: what happens at once, then each option. */
  function poi(c: { do: Any[] }): string {
    const first = steps(c.do), choice = c.do.find((n) => n.n === 'choice');
    const opts = (choice?.options ?? []) as Any[];
    return `${first ? `<p>${cap(first)}.</p>` : ''}${roll(c.do)}${opts.length ? `<ul class="opts">${opts.map((o) => { const s = steps(o.do), r = roll(o.do), only = !s && !r, k = cost(o.cost, o.needs, only); return `<li><b>${o.en}</b>${only ? `: ${k || 'nothing'}` : `${k ? ` <span class="cost">(${k})</span>` : ''}${s ? `: ${s}` : ''}${r}`}</li>`; }).join('')}</ul>` : ''}`;
  }

  /* ---- events ---- */
  const resList = (rs: string[]) => (rs.length === Object.keys(R.resources).length ? 'all resources' : list(rs.map((r) => RES[r]!)));
  const raid = `raids the nearest colony. Unless its owner has a ${R.buildings[S.raid.stoppedBy]?.en.toLowerCase() ?? S.raid.stoppedBy}, its owner discards ${S.raid.resources} resources or loses 1 building`;
  function eventStep(n: Any): string {
    switch (n.n) {
      case 'gainIfStock': return `Every player with ${RES[n.res]} in their warehouse gains ${n.bells} 🔔.`;
      case 'sellOff': return `Players may sell ${n.res.length === 5 ? 'any resources' : resList(n.res)} from their warehouse to smugglers at once, at the market price${n.priceAdd ? ` ${sign(n.priceAdd)} 🟡` : ''}; the demand track does not move. ${n.refPerUnit ? `Add ${n.refPerUnit} 🟥 for each one sold.` : `Add ${n.refPerSeller} 🟥 for each player who sold.`}`;
      case 'activate': return `The natives stir: settlement ${n.settlement}.`;
      case 'firstMayTake': return `The first player may ${n.gold ? `pay ${n.gold} 🟡 to put` : 'put'} ${a(agent(n.agent))} into their discard${n.gold ? '' : ' for free'}.`;
      case 'mostPays': return `The player with the most ${RES[n.res]} pays ${n.goldPerUnit ? `${n.goldPerUnit} 🟡 for each one` : `${n.gold} 🟡`}, or adds ${n.ref} 🟥${n.bells ? ` and gains ${n.bells} 🔔` : ''}.`;
      case 'refreshPier': return n.which === 'military' ? 'Replace every agent with 🗡️ on the pier.' : 'Discard the pier and deal it anew.';
      case 'sellAgents': return `Each player may remove up to ${n.max} agents from the top of their deck and gains ${n.gold} 🟡 for each${n.refEach ? `; add ${n.refEach} 🟥 for each` : ''}.`;
      case 'gainPerBuilding': { const e = Object.entries(n.buildings as Record<string, number>), w = RES[n.what]; return n.once ? `Every player with ${list(e.map(([b]) => a(building(b))), 'or')} gains ${e[0]![1]} ${w}.` : `Every player gains ${list(e.map(([b, v]) => `${v} ${w} for ${a(building(b))}`))}.`; }
      case 'jointCrosses': return `Each player secretly discards any number of ✝️. For every ${n.per} ✝️ discarded by all players together, remove 1 🟥, at most ${n.max}.`;
      case 'populationAll': return `Every native settlement loses ${-n.add} population.`;
      case 'payPerBuilding': return `Each player pays ${n.gold} 🟡 for each of their buildings, or adds ${n.ref} 🟥 for each building left unpaid.`;
      case 'storm': return 'Every ship outside Europe loses its whole cargo, or takes 1 damage if its hold is empty.';
      case 'fewestColoniesGain': return `The player with the fewest colonies finds cargo washed ashore: ${gains(n, 1)}.`;
      case 'raidAll': return `Every settlement with 💢 ${S.activation.raidMinHostility} or more ${raid}.`;
      case 'ref': return n.perPlayer ? `Add ${n.perPlayer} 🟥 for each player.` : `Add ${n.add} 🟥 for every ${n.perBells} 🔔 the players hold together.`;
      case 'breakAlliances': return `Alliances with settlements at 💢 ${n.min} or more end.`;
      case 'nativeGifts': return `Every settlement with 💢 ${n.min}–${n.max} gives ${n.food} 🟦 to the player whose colony is nearest.`;
      case 'winter': return `Each player discards ${n.food} 🟦 for each of their colonies, and removes the top card of their deck for each colony left hungry.`;
      case 'refreshSalon': return 'Replace the Founding Fathers in the salon with new ones.';
      case 'cheapBuild': return `In turn order, players may build ${list((n.options as string[]).map((b) => a(building(b))), 'or')} at once for ${n.timber} 🟫.`;
      case 'witchTrial': return `The player with the most ✝️ picks any player, who removes one of their 🎓 agents, or gains ${n.crosses} ✝️ if they have none.`;
      case 'payOrRemove': return `Each player pays ${n.gold} 🟡 for each ${n.which === 'military' ? 'agent with 🗡️' : agent(n.which)} they own, or removes it. Add ${n.refEach} 🟥 for each one removed.`;
      case 'sacredForest': return `The player with the most 🟫 (if nobody has any, the most buildings) pays the natives ${n.goods} 🟧 or ${n.gold} 🟡, or the 💢 of every settlement rises by ${n.hostility}.`;
      case 'priceReset': return `The prices of ${resList(n.res)} return to their start.`;
      case 'hostilityAll': return `The 💢 of every settlement ${n.add < 0 ? 'falls' : 'rises'} by ${Math.abs(n.add)}.`;
      case 'boycott': return `Each player with ${RES[n.res]} pays ${n.goldPerUnit} 🟡 for each one, or boycotts: discards them all and gains 1 🔔 for each. Add ${n.refPerUnit} 🟥 for each one discarded.`;
      case 'blockade': return `Each player whose ship is outside Europe pays a ransom of ${n.byRound ? '🟡 equal to the round number' : `${n.gold} 🟡`}, or takes 1 damage and loses the whole cargo. Add ${n.refEach} 🟥 for each damaged ship.`;
      default: return '';
    }
  }
  function event(e: { do: Any[] }): string {
    const prices = e.do.filter((n) => n.n === 'price');
    const price = prices.length ? prices.map((n) => { const all = n.res.length === Object.keys(R.resources).length, many = all || n.res.length > 1; return `${all ? 'All prices' : `The price${many ? 's' : ''} of ${resList(n.res)}`} ${n.add > 0 ? (many ? 'rise' : 'rises') : many ? 'fall' : 'falls'} by ${Math.abs(n.add)} 🟡.`; }).join(' ') : 'Prices stay the same.';
    return [price, ...e.do.filter((n) => n.n !== 'price').map(eventStep)].filter(Boolean).map((s) => `<span>${s}</span>`).join('');
  }

  /** A King's tactic. */
  function tactic(t: GameDef['tactics'][string]): string {
    const e = t.effect as Any;
    switch (e.t) {
      case 'perCubes': return `Attack ${sign(e.add)} 🗡️ for every ${e.per} 🟥 at the colony.`;
      case 'perOcean': return `Attack ${sign(e.add)} 🗡️ for every ${e.per} ocean cells around the colony.`;
      case 'noTerrain': return 'Patriots do not add their terrain to the defence.';
      case 'cubes': return `Add ${e.add} 🟥 before they are dealt.`;
      case 'successFrom': return `Every ${list(e.faces.map(String))} on the dice is a success.`;
      case 'noBuildings': return 'Patriots do not add their stockade or fort to the defence.';
      case 'militiaPerCross': return `The loyalist gets ${e.value} Militia card for each of their ✝️.`;
      case 'minSuccesses': return `A colony falls only to ${e.value} successes or more.`;
      case 'none': return 'No effect.';
      default: return String(e.t);
    }
  }

  return { talent, work, poi, event, tactic, steps };
}
