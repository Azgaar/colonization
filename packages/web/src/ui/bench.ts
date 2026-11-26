/* The design bench (M4): change the rules (FR-R-4), test them (FR-T-8) and export what to carry to the workbook (FR-R-5, FR-R-8).
 * Drawn once when it opens; each action redraws only the part it changes. */
import { changeList, conversionReport, editable, flattenRuleset, gameData, getPath, promoteProblem, rulesets, toCsv, toMarkdown, validateChange, where, sourceOf, type Conversion, type Editable, type Override, type Ruleset } from '@col/data';
import { L, pick } from '../data.ts';
import { all, custom, defOf, forget, keep } from '../rules.ts';
import { Dev } from '../sim.ts';
import { U } from '../state.ts';
import { lab, labTab } from './lab.ts';
import { esc, md } from './md.ts';

export type Tab = 'rules' | 'lab' | 'export';
const B: { tab: Tab; rs: string; q: string } = { tab: 'rules', rs: '', q: '' };
const VALUES: Editable[] = editable(gameData);
const LABELS: Record<Conversion, [string, string]> = { direct: ['Direct: a printed number or text changes', 'Прямое: меняется напечатанное число или текст'], component: ['Component: needs a new card, token or track', 'Компонент: нужна новая карта, жетон или трек'], interface: ['Interface only', 'Только интерфейс'], notConvertible: ['Not convertible: sandbox only', 'Неконвертируемое: только песочница'] };
const show = (v: unknown) => (v === null || v === undefined ? '–' : Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? L('yes', 'да') : L('no', 'нет')) : String(v));
const label = (e: Editable) => pick(e.label);
/** A value as the rules have it: board for the default, the chosen ruleset for the current one. */
const value = (id: string, path: string) => { try { return getPath(defOf(id), path); } catch { return getPath(defOf('board'), path); } };
const mine = () => custom()[B.rs];
/** A ruleset whose changes are not all labelled and worded for the table runs only in sandbox games (FR-R-7). */
const settle = (r: Ruleset): Ruleset => ({ ...r, sandbox: r.overrides.some((o) => promoteProblem(o) !== null) });

/* ---- the page ---- */
export function bench(): string {
  if (!B.rs || !all()[B.rs]) B.rs = Object.keys(custom())[0] ?? 'pc';
  return `<div class="bench">
<header><button class="pback" data-t-page="main">← ${L('Back', 'Назад')}</button><h2>${L('Design bench', 'Мастерская')}</h2>
<nav class="tabs">${(['rules', 'lab', 'export'] as Tab[]).map((t) => `<button class="${B.tab === t ? 'on' : ''}" data-b-tab="${t}">${pick({ rules: ['Rules', 'Правила'], lab: ['Lab', 'Лаборатория'], export: ['Export', 'Экспорт'] }[t] as [string, string])}</button>`).join('')}</nav></header>
<section class="b-body">${body()}</section></div>`;
}
const body = () => (B.tab === 'rules' ? rulesTab() : B.tab === 'lab' ? labTab() : exportTab());
function redraw() { const el = document.querySelector('#title .b-body'); if (el) el.innerHTML = body(); document.querySelectorAll<HTMLElement>('#title [data-b-tab]').forEach((b) => b.classList.toggle('on', b.dataset.bTab === B.tab)); }

/** The rulesets, the chosen one's changes, and every value with a search. */
function rulesTab() {
  const list = all(), r = list[B.rs], own = !!custom()[B.rs];
  const picker = `<div class="b-rs"><h4>${L('Rulesets', 'Наборы правил')}</h4>${Object.values(list).map((x) => `<button class="${x.id === B.rs ? 'on' : ''}" data-b-rs="${x.id}"><b>${esc(x.id)}</b><small>${rulesets[x.id] ? L('built in', 'встроенный') : x.sandbox ? L('yours · sandbox only', 'ваш · только песочница') : L('yours', 'ваш')}</small></button>`).join('')}
<div class="b-new"><input data-b-name placeholder="${L('New ruleset name', 'Имя нового набора')}" spellcheck="false"><button data-b-create>${L('Create', 'Создать')}</button></div><p class="b-msg" id="b-msg"></p></div>`;
  return `<div class="b-rules">${picker}<div class="b-main">${own ? changes(r) : `<p class="note">${L(`"${r.id}" is built in and cannot be changed here. Create your own ruleset (it starts from pc) to change values.`, `«${r.id}» встроенный, его здесь не изменить. Создайте свой набор (он начнётся с pc), чтобы менять значения.`)}</p>`}
<div class="b-search"><input data-b-q value="${esc(B.q)}" placeholder="${L('Search values: tax, priest, war.bells…', 'Поиск: налог, священник, war.bells…')}" spellcheck="false"></div><div class="b-values">${values(own)}</div></div></div>`;
}
/** The changes this ruleset makes, each with how it would reach the table. */
function changes(r: Ruleset) {
  const flat = flattenRuleset(r, all());
  const rows = r.overrides.map((o) => {
    const [path, to] = Object.entries(o.set ?? {})[0] ?? ['', ''], e = VALUES.find((v) => v.path === path);
    return `<div class="b-ch" data-b-o="${esc(o.id)}"><div class="b-ch-h"><b>${e ? esc(label(e)) : esc(path)}</b><span>${show(value('board', path))} → <b>${show(to)}</b></span><button data-b-reset="${esc(path)}">${L('Undo change', 'Отменить')}</button></div>
<div class="b-ch-f"><select data-b-conv>${(Object.keys(LABELS) as Conversion[]).map((k) => `<option value="${k}"${o.conversion === k ? ' selected' : ''}>${pick(LABELS[k])}</option>`).join('')}</select>
<input data-b-table value="${esc(o.table)}" placeholder="${L('How it reads at the table', 'Как это звучит за столом')}"><input data-b-why value="${esc(o.why)}" placeholder="${L('Why', 'Зачем')}">
${o.conversion === 'component' ? `<input data-b-comp value="${esc((o.components ?? []).join(', '))}" placeholder="${L('Components, comma separated', 'Компоненты через запятую')}">` : ''}</div>
${promoteProblem(o) ? `<small class="b-warn">${L('Sandbox only until', 'Только песочница, пока')}: ${esc(promoteProblem(o))}</small>` : ''}</div>`;
  }).join('');
  return `<div class="b-chs"><h4>${esc(r.id)}: ${r.overrides.length ? L(`${r.overrides.length} change(s)`, `изменений: ${r.overrides.length}`) : L('no changes yet', 'изменений пока нет')}${flat.overrides.length > r.overrides.length ? ` <small>${L(`on top of ${r.base}`, `поверх ${r.base}`)}</small>` : ''}</h4>${rows}
<div class="b-acts"><button data-b-play>${L('Play it', 'Сыграть')}</button><button data-b-test>${L('Test it in the lab', 'Проверить в лаборатории')}</button><button data-b-delete>${L('Delete ruleset', 'Удалить набор')}</button></div></div>`;
}
/** Every value that can change, found by name or path: board's default, this ruleset's value, and a field to change it. */
function values(own: boolean) {
  const q = B.q.trim().toLowerCase();
  const found = q ? VALUES.filter((e) => e.path.toLowerCase().includes(q) || e.label.en.toLowerCase().includes(q) || e.label.ru.toLowerCase().includes(q)) : VALUES.filter((e) => e.group === 'settings');
  return `<div class="b-v head"><span>${L('Value', 'Значение')}</span><span>${L('Board', 'Настольная')}</span><span>${esc(B.rs)}</span><span>${L('Where it is printed', 'Где напечатано')}</span></div>` + found.slice(0, 80).map((e) => {
    const base = value('board', e.path), now = value(B.rs, e.path), changed = JSON.stringify(base) !== JSON.stringify(now);
    return `<div class="b-v${changed ? ' ch' : ''}"><span title="${esc(e.path)}">${esc(label(e))}<small>${esc(e.path)}</small></span><span>${show(base)}</span><span>${own ? field(e, now) : show(now)}</span><span class="src">${esc(where(sourceOf(e.path)))}</span></div>`;
  }).join('') + (found.length > 80 ? `<p class="note">${L(`${found.length - 80} more: narrow the search.`, `Ещё ${found.length - 80}: уточните поиск.`)}</p>` : !found.length ? `<p class="note">${L('Nothing found.', 'Ничего не найдено.')}</p>` : '');
}
function field(e: Editable, v: unknown) {
  const a = `data-b-set="${esc(e.path)}"`;
  if (e.type === 'boolean') return `<select ${a}><option value="true"${v ? ' selected' : ''}>${L('yes', 'да')}</option><option value="false"${v ? '' : ' selected'}>${L('no', 'нет')}</option></select>`;
  if (e.options) return `<select ${a}>${e.options.map((o) => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (e.type === 'number') return `<input type="number" ${a} value="${v ?? ''}" ${e.min !== undefined ? `min="${e.min}"` : ''} ${e.max !== undefined ? `max="${e.max}"` : ''} step="1">`;
  return `<input ${a} value="${esc(Array.isArray(v) ? v.join(', ') : v)}">`;
}
const parse = (e: Editable, raw: string): unknown => {
  if (e.type === 'boolean') return raw === 'true';
  if (e.type === 'number') return raw.trim() === '' && e.nullable ? null : Number(raw);
  if (e.type === 'number[]') return raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (e.type === 'string[]') return raw.split(',').map((x) => x.trim()).filter(Boolean);
  return raw;
};

/** What to carry to the workbook and the rules document: the conversion report, the change list by sheet, row and column, and the ruleset itself. */
function exportTab() {
  const r = all()[B.rs], flat = { ...flattenRuleset(r, all()), base: undefined }, rows = changeList(gameData, flat);
  const report = conversionReport(gameData, rulesets.board, { ...flat, base: 'board', overrides: flat.overrides.filter((o) => !rulesets.board.overrides.some((b) => b.id === o.id)) });
  return `<div class="b-export"><div class="b-acts"><label>${L('Ruleset', 'Набор')} <select data-b-pick>${Object.keys(all()).map((id) => `<option${id === B.rs ? ' selected' : ''}>${esc(id)}</option>`).join('')}</select></label>
<button data-b-dl="csv">${L('Cells to edit (CSV)', 'Ячейки для правки (CSV)')}</button><button data-b-dl="md">${L('Cells to edit (Markdown)', 'Ячейки для правки (Markdown)')}</button><button data-b-dl="report">${L('Conversion report', 'Отчёт о конверсии')}</button><button data-b-dl="json">${L('Ruleset file', 'Файл набора')}</button></div>
<p class="note">${L('To make a change part of the board game: put the ruleset file\'s change into rulesets/pc.json, then run', 'Чтобы перенести изменение в настольную игру: добавьте его в rulesets/pc.json и выполните')} <code>pnpm rules promote &lt;id&gt;</code> ${L('(or drop). The decision is logged in docs/decisions.md.', '(или drop). Решение записывается в docs/decisions.md.')}</p>
${Dev.on ? `<section class="b-board" id="b-board">${toBoard()}</section>` : ''}
<div class="md">${md(report)}</div><h4>${L('Cells to edit', 'Ячейки для правки')}</h4><div class="md">${md(toMarkdown(rows))}</div></div>`;
}

/* ---- toward the board game (dev mode, FR-R-9): the local server writes rulesets/*.json and docs/decisions.md, as `pnpm rules` does ---- */
const S: { rs: Record<string, Ruleset> | null; down: boolean; busy: boolean; msg: string; rows: string; fresh: boolean } = { rs: null, down: false, busy: false, msg: '', rows: '', fresh: false };
async function readServer() {
  try { const r = await fetch('/api/rules'); if (!r.ok) throw new Error(); S.rs = (await r.json()) as Record<string, Ruleset>; S.down = false; } catch { S.down = true; }
  const el = document.getElementById('b-board'); if (el) el.innerHTML = toBoard();
}
function toBoard(): string {
  const h = `<h4>${L('Toward the board game', 'В настольную игру')}</h4>`;
  if (S.down) return `${h}<p class="note">${L('The rules files are changed through the local server, which is not answering. Start the game with', 'Файлы правил меняет локальный сервер, а он не отвечает. Запустите игру через')} <code>pnpm web</code> ${L('or use', 'или используйте')} <code>pnpm rules</code>.</p>`;
  if (!S.rs) { void readServer(); return `${h}<p class="note">${L('Reading the rules files…', 'Читаю файлы правил…')}</p>`; }
  const pc = S.rs.pc.overrides, board = S.rs.board.overrides, off = S.busy ? ' disabled' : '';
  const line = (o: Override, acts: string) => { const why = promoteProblem(o); return `<div class="b-ch"><div class="b-ch-h"><b>${esc(o.id)}</b><span>${esc(o.table || o.why || Object.keys(o.set ?? {}).join(', '))}</span>${acts}</div>${why ? `<small class="b-warn">${L('Not ready for the table', 'Не готово для стола')}: ${esc(why)}</small>` : ''}</div>`; };
  const pcRows = pc.length ? pc.map((o) => line(o, `<button data-b-promote="${esc(o.id)}"${promoteProblem(o) ? ' disabled' : off}>${L('Promote to board', 'В настольную')}</button><button data-b-drop="${esc(o.id)}"${off}>${L('Drop', 'Отклонить')}</button>`)).join('') : `<p class="note">${L('pc plays exactly as board: nothing is waiting for a decision.', 'pc играет как board: решений не ждёт ничего.')}</p>`;
  const from = B.rs !== 'pc' && B.rs !== 'board' ? all()[B.rs] : undefined;
  const add = from ? `<h5>${L(`Changes in ${from.id}`, `Изменения в ${from.id}`)}</h5>${from.overrides.length ? from.overrides.map((o) => line(o, pc.some((x) => x.id === o.id) ? `<small>${L('in pc', 'в pc')}</small>` : board.some((x) => x.id === o.id) ? `<small>${L('on board', 'в board')}</small>` : `<button data-b-add="${esc(o.id)}"${promoteProblem(o) ? ' disabled' : off}>${L('Add to pc', 'В pc')}</button>`)).join('') : `<p class="note">${L('No changes.', 'Изменений нет.')}</p>`}` : '';
  return `${h}<p class="note">${L('A change goes into pc, where it is played and tested; then you promote it to board or drop it. Each decision is logged in docs/decisions.md.', 'Изменение попадает в pc, где его играют и проверяют; затем вы переносите его в board или отклоняете. Каждое решение записывается в docs/decisions.md.')}</p>
<h5>${L('Waiting in pc', 'Ждут в pc')}</h5>${pcRows}${add}
${S.msg ? `<p class="b-msg">${esc(S.msg)}${S.fresh ? ` <button data-b-reload>${L('Reload the game', 'Перезагрузить игру')}</button>` : ''}</p>` : ''}${S.rows ? `<div class="md">${md(S.rows)}</div>` : ''}`;
}
async function step(kind: 'add' | 'promote' | 'drop', x: { id?: string; override?: Override }) {
  S.busy = true; S.msg = L('Writing the files and rebuilding the game…', 'Записываю файлы и пересобираю игру…'); S.rows = '';
  const el = () => document.getElementById('b-board'); el()!.innerHTML = toBoard();
  try {
    const r = await fetch(`/api/rules/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(x) }), out = (await r.json()) as { message?: string; error?: string; rows?: Parameters<typeof toMarkdown>[0] };
    S.msg = out.error ?? `${out.message} ${L('Reload to play the new rules.', 'Перезагрузите, чтобы играть по новым правилам.')}`; S.fresh = !out.error;
    if (out.rows?.length) S.rows = toMarkdown(out.rows);
  } catch { S.msg = L('The local server did not answer.', 'Локальный сервер не ответил.'); }
  S.busy = false; await readServer();
}
function download(name: string, text: string, type: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---- changing a ruleset ---- */
function save(r: Ruleset) { keep(settle(r)); }
function setValue(path: string, raw: string) {
  const r = mine(), e = VALUES.find((v) => v.path === path); if (!r || !e) return;
  const v = parse(e, raw), why = validateChange(gameData, path, v);
  if (why) { msg(why); return; }
  const id = path, base = value('board', path), o = r.overrides.find((x) => x.id === id);
  // Back to the board value: the change goes away.
  if (JSON.stringify(v) === JSON.stringify(base)) r.overrides = r.overrides.filter((x) => x.id !== id);
  else if (o) o.set = { [path]: v };
  else r.overrides.push({ id, why: '', conversion: 'direct', table: '', set: { [path]: v } } as Override);
  try { save(r); defOf(r.id); msg(''); } catch (x) { msg((x as Error).message); }
  redraw();
}
const msg = (t: string) => { const el = document.getElementById('b-msg'); if (el) el.textContent = t; };

document.addEventListener('click', (e) => {
  if (U.title !== 'bench') return;
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if ((x = q('[data-b-tab]'))) { B.tab = x.dataset.bTab as Tab; redraw(); }
  else if ((x = q('[data-b-rs]'))) { B.rs = x.dataset.bRs!; redraw(); }
  else if (q('[data-b-create]')) {
    const name = (document.querySelector<HTMLInputElement>('#title [data-b-name]')?.value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!name) return msg(L('Give it a name first.', 'Сначала дайте имя.'));
    if (all()[name]) return msg(L('That name is taken.', 'Это имя занято.'));
    save({ id: name, title: name, base: 'pc', overrides: [] }); B.rs = name; redraw();
  } else if ((x = q('[data-b-reset]'))) { const p = x.dataset.bReset!; setValue(p, JSON.stringify(value('board', p))); const r = mine(); if (r) { r.overrides = r.overrides.filter((o) => o.id !== p); save(r); redraw(); } }
  else if (q('[data-b-delete]')) { if (confirm(L(`Delete the ruleset "${B.rs}"?`, `Удалить набор «${B.rs}»?`))) { forget(B.rs); B.rs = ''; redraw(); } }
  else if (q('[data-b-test]')) { B.tab = 'lab'; lab.b = B.rs; redraw(); }
  else if (q('[data-b-play]')) { void import('./newgame.ts').then((m) => m.openNewGame(B.rs)); }
  else if ((x = q('[data-b-promote]'))) { const id = x.dataset.bPromote!; if (confirm(L(`Make "${id}" part of the board game? This changes rulesets/board.json and pc.json and logs the decision.`, `Сделать «${id}» частью настольной игры? Это изменит rulesets/board.json и pc.json и запишет решение.`))) void step('promote', { id }); }
  else if ((x = q('[data-b-drop]'))) { const id = x.dataset.bDrop!; if (confirm(L(`Drop "${id}" from pc? The decision is logged.`, `Убрать «${id}» из pc? Решение будет записано.`))) void step('drop', { id }); }
  else if ((x = q('[data-b-add]'))) { const o = all()[B.rs]?.overrides.find((v) => v.id === x!.dataset.bAdd); if (o) void step('add', { override: o }); }
  else if (q('[data-b-reload]')) location.reload();
  else if ((x = q('[data-b-dl]'))) {
    const r = all()[B.rs], flat = { ...flattenRuleset(r, all()), base: undefined }, rows = changeList(gameData, flat), k = x.dataset.bDl;
    if (k === 'csv') download(`${r.id}-cells.csv`, toCsv(rows), 'text/csv');
    else if (k === 'md') download(`${r.id}-cells.md`, toMarkdown(rows), 'text/markdown');
    else if (k === 'report') download(`${r.id}-conversion.md`, conversionReport(gameData, rulesets.board, { ...flat, base: 'board' }), 'text/markdown');
    else download(`${r.id}.json`, JSON.stringify(r, null, 2), 'application/json');
  }
});
document.addEventListener('change', (e) => {
  if (U.title !== 'bench') return;
  const t = e.target as HTMLInputElement, o = t.closest<HTMLElement>('[data-b-o]'), r = mine();
  if (t.dataset.bSet !== undefined) return setValue(t.dataset.bSet, t.value);
  if (t.dataset.bPick !== undefined) { B.rs = t.value; return redraw(); }
  if (!o || !r) return;
  const ov = r.overrides.find((x) => x.id === o.dataset.bO); if (!ov) return;
  if (t.dataset.bConv !== undefined) ov.conversion = t.value as Conversion;
  else if (t.dataset.bTable !== undefined) ov.table = t.value;
  else if (t.dataset.bWhy !== undefined) ov.why = t.value;
  else if (t.dataset.bComp !== undefined) ov.components = t.value.split(',').map((s) => s.trim()).filter(Boolean);
  save(r); redraw();
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (U.title !== 'bench' || t.dataset.bQ === undefined) return;
  B.q = t.value;
  const el = document.querySelector('#title .b-values'); if (el) el.innerHTML = values(!!mine());
});
