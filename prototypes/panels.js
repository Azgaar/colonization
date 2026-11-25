/* Blocks of markup used by several screens. */
(() => {
const { D, P, me, pick, t, art, icon } = Core;
const name = (p) => pick(D.names.nations[D.players[p].nation]);
window.Panels = {
  name,
  work: (id) => { const b = D.buildings[id], w = b.work; if (b.storage) return `+${b.storage}`; if (b.defence) return `+${b.defence} ${icon('sword', 13)}`; if (!w) return ''; if (w.kind === 'produce') return `${w.consumes ? `${w.consumes.amount}${icon(w.consumes.res, 14)} ▸ ` : ''}${w.amount}${icon(w.icon, 14)}`; if (w.kind === 'ocean') return `2${icon('fish', 14)}`; return ''; },
  plans: () => `<div class="plans">${Object.entries(D.buildings).map(([id, b]) => `<span class="plan${D.left[id] ? '' : ' gone'}${P.buildings.includes(id) ? ' own' : ''}${b.improvement ? ' imp' : ''}"><img src="${art.building(id)}" alt=""><span>${pick(b)}</span><small>${b.timber}${icon('timber', 13)} ×${D.left[id]}</small></span>`).join('')}</div>`,
  rivals: () => D.players.map((p, i) => `<div class="riv${i === me ? ' me' : ''}" style="--c:${p.color}"><span class="em"><img src="${art.emblem(p.nation)}" alt=""></span><span class="nm">${name(i)}${i === me ? ` <small>(${t('you')})</small>` : ''}</span><span class="v">${icon('bells', 16)}${p.bells}</span><span class="v">${icon('gold', 16)}${p.gold}</span><span class="v"><svg class="ic" viewBox="0 0 24 24" width="16" height="16"><path d="M3 21V11l9-8 9 8v10Z" fill="currentColor"/></svg>${D.colonies.filter((c) => c.owner === i).length}</span><b class="sc">${p.score}</b></div>`).join(''),
  log: () => D.log.slice().reverse().map((e) => { const l = Core.logLine(e); return l ? `<li>${l}</li>` : ''; }).join(''),
};
})();
