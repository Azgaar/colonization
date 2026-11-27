/* The lab tab of the design bench (FR-T-8): batches of bot games in the browser's workers, without the command line.
 * Compare two rulesets on paired seeds, sweep a value over a range (FR-T-5), or look for problems (FR-T-7). */
import { flattenRuleset, rulesets, type Ruleset } from '@col/data';
import { PERSONALITIES, type Personality } from '@col/bots';
import { detect, detectMarkdown, diffTable, runAllBrowser, sweep, sweepMarkdown, SWEEP_KEYS, table, type BotSpec, type GameRecord, type GameSpec } from '@col/lab/browser';
import { msg, pick, t, type Msg, type Text } from '../data.ts';
import { inLang } from '../i18n.ts';
import { all, defOf } from '../rules.ts';
import { esc, md } from './md.ts';

type Mode = 'compare' | 'sweep' | 'detect';
/** The lab's form, its progress and its last report. `b` is the ruleset under test, `a` what it is compared with. */
export const lab = { mode: 'compare' as Mode, a: 'board', b: 'proposed', games: 200, players: 4, bots: 'mixed', path: 'settings.tax.refuseRef', values: '1,2,3', done: 0, total: 0, report: '', error: '', stop: null as AbortController | null };
const BOTS: Record<string, Msg> = { mixed: msg('lab.eight_characters'), balanced: msg('lab.balanced_bots'), search: msg('lab.one_search') };
/** The bots of a batch; seats rotate through the list, so a list as long as the table puts one search bot in every game. */
const botsOf = (k: string, players: number): BotSpec[] =>
  k === 'balanced' ? [{ kind: 'goal', name: 'balanced' }]
  : k === 'search' ? [{ kind: 'search', name: 'search', iterations: 60 }, ...Array.from({ length: Math.max(1, players - 1) }, (): BotSpec => ({ kind: 'goal', name: 'goal' }))]
  : (Object.keys(PERSONALITIES) as Personality[]).map((p): BotSpec => ({ kind: 'goal', name: p, personality: p }));
/** A ruleset for the workers: the built-in ones by name, the designer's own carried whole, flattened onto its base. */
const rulesOf = (id: string): Pick<GameSpec, 'ruleset' | 'rules'> => (rulesets[id] ? { ruleset: id } : { ruleset: id, rules: { ...flattenRuleset(all()[id] as Ruleset, all()), base: undefined } });
/** `1,2,3`, `1:5:1`, or JSON values such as `true,false`. */
function axis(path: string, v: string) {
  const r = /^(-?[\d.]+):(-?[\d.]+)(?::(-?[\d.]+))?$/.exec(v.trim());
  if (r) { const [a, b, s] = [Number(r[1]), Number(r[2]), Number(r[3] ?? 1)], out: number[] = []; for (let x = a; x <= b + s / 1e6 && out.length < 50; x += s) out.push(Math.round(x * 1e6) / 1e6); return { path: path.trim(), values: out }; }
  return { path: path.trim(), values: v.split(',').map((x) => { try { return JSON.parse(x.trim()) as unknown; } catch { return x.trim(); } }) };
}

export function labTab(): string {
  const ids = Object.keys(all()), opt = (v: string) => ids.map((id) => `<option${id === v ? ' selected' : ''}>${esc(id)}</option>`).join('');
  const mode = (m: Mode, n: Text) => `<button class="${lab.mode === m ? 'on' : ''}" data-l-mode="${m}">${pick(n)}</button>`;
  return `<div class="b-lab"><div class="l-form">
<div class="set">${mode('compare', msg('lab.compare_two'))}${mode('sweep', msg('lab.sweep_value'))}${mode('detect', msg('lab.find_problems'))}</div>
<div class="l-grid">
${lab.mode === 'compare' ? `<label>${t('bench.ruleset')}<select data-l="b">${opt(lab.b)}</select></label><label>${t('decisions.against')}<select data-l="a">${opt(lab.a)}</select></label>` : `<label>${t('bench.ruleset')}<select data-l="b">${opt(lab.b)}</select></label>`}
${lab.mode === 'sweep' ? `<label class="wide">${t('lab.value_path')}<input data-l="path" value="${esc(lab.path)}" spellcheck="false"></label><label class="wide">${t('lab.values_1')}<input data-l="values" value="${esc(lab.values)}" spellcheck="false"></label>` : ''}
<label>${t('lab.games')}<input type="number" min="10" max="5000" step="10" data-l="games" value="${lab.games}"></label>
<label>${t('lab.players')}<select data-l="players">${[1, 2, 3, 4, 5].map((n) => `<option${n === lab.players ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
<label class="wide">${t('lab.bots')}<select data-l="bots">${Object.entries(BOTS).map(([k, n]) => `<option value="${k}"${k === lab.bots ? ' selected' : ''}>${pick(n)}</option>`).join('')}</select></label></div>
<div class="b-acts">${lab.stop ? `<button data-l-stop>${t('lab.stop')}</button>` : `<button class="go" data-l-run>${t('lab.run')}</button>`}<span class="l-prog" id="l-prog">${progress()}</span></div>
<p class="note">${t('lab.same_seeds')}</p></div>
<div class="l-out md">${lab.error ? `<p class="b-warn">${esc(lab.error)}</p>` : ''}${lab.report ? md(lab.report) : ''}</div></div>`;
}
const progress = () => (lab.total ? `${lab.done} / ${lab.total} ${t('lab.games2')}` : '');
const paintProgress = () => { const el = document.getElementById('l-prog'); if (el) el.textContent = progress(); };

async function run(redraw: () => void) {
  lab.stop = new AbortController(); lab.error = ''; lab.report = ''; lab.done = 0;
  const bots = botsOf(lab.bots, lab.players), signal = lab.stop.signal, workers = navigator.hardwareConcurrency || 4;
  let offset = 0;
  const go = (specs: GameSpec[]): Promise<GameRecord[]> => { const at = offset; offset += specs.length; return runAllBrowser(specs, (n) => { lab.done = at + n; paintProgress(); }, workers, { signal }); };
  const games = Math.max(10, Math.min(5000, Math.round(lab.games)));
  redraw();
  try {
    // `table` keeps a ruleset's name only, so the designer's own rules are added to each game afterwards.
    const def = defOf(lab.b), specs = (id: string) => table(defOf(id), { prefix: `lab-${lab.players}`, games, players: lab.players, bots }).map((g) => ({ ...g, ...rulesOf(id) }));
    if (lab.mode === 'compare') {
      lab.total = games * 2;
      const a = await go(specs(lab.a)), b = await go(specs(lab.b));
      lab.report = `# ${lab.b} against ${lab.a}\n\n${games} paired games, ${lab.players} players, ${inLang('en', BOTS[lab.bots]).toLowerCase()}. Each change: ${lab.b} minus ${lab.a} on the same seeds.\n\n${diffTable(a, [[lab.b, b]], SWEEP_KEYS)}`;
    } else if (lab.mode === 'sweep') {
      const x = axis(lab.path, lab.values);
      lab.total = games * x.values.length;
      // The points are planned on board and played on the chosen ruleset, which the workers receive whole.
      const { result } = await sweep({ paths: [x], games, players: lab.players, bots, prefix: `lab-${lab.players}` }, (sp) => go(sp.map((s) => ({ ...s, ...rulesOf(lab.b) }))));
      lab.report = sweepMarkdown({ ...result, ruleset: lab.b });
    } else {
      lab.total = games;
      lab.report = detectMarkdown(detect(await go(specs(lab.b)), def));
    }
  } catch (e) { lab.error = signal.aborted ? t('lab.stopped') : (e as Error).message; }
  lab.stop = null; redraw();
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s), redraw = () => { const el = document.querySelector('#title .b-body'); if (el) el.innerHTML = labTab(); };
  let x: HTMLElement | null;
  if (!document.querySelector('#title .b-lab')) return;
  if ((x = q('[data-l-mode]'))) { lab.mode = x.dataset.lMode as Mode; lab.report = ''; redraw(); }
  else if (q('[data-l-run]')) void run(redraw);
  else if (q('[data-l-stop]')) lab.stop?.abort();
});
document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement, k = t.dataset.l;
  if (!k || !document.querySelector('#title .b-lab')) return;
  if (k === 'games' || k === 'players') lab[k] = Number(t.value); else (lab as Record<string, unknown>)[k] = t.value;
});
