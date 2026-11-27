/* The design bench (M4): change the rules (FR-R-4), test them (FR-T-8) and export what to carry to the workbook (FR-R-5, FR-R-8).
 * Drawn once when it opens; each action redraws only the part it changes. */
import {
  type Conversion,
  changeList,
  conversionReport,
  type Editable,
  editable,
  flattenRuleset,
  gameData,
  getPath,
  type Override,
  promoteProblem,
  type Ruleset,
  rulesets,
  sourceOf,
  toCsv,
  toMarkdown,
  validateChange,
  where
} from "@col/data";
import { msg as say, pick, t, type Text } from "../data.ts";
import { all, custom, defOf, forget, keep } from "../rules.ts";
import { Dev } from "../sim.ts";
import { U } from "../state.ts";
import { lab, labTab } from "./lab.ts";
import { esc, md } from "./md.ts";

export type Tab = "rules" | "lab" | "export";
const B: { tab: Tab; rs: string; q: string } = { tab: "rules", rs: "", q: "" };
const VALUES: Editable[] = editable(gameData);
const LABELS: Record<Conversion, Text> = {
  direct: say('bench.direct_printed'),
  component: say('bench.component_needs'),
  interface: say('bench.interface'),
  notConvertible: say('bench.not_convertible')
};
const show = (v: unknown) =>
  v === null || v === undefined
    ? "–"
    : Array.isArray(v)
      ? v.join(", ")
      : typeof v === "boolean"
        ? v
          ? t('bench.yes')
          : t('bench.no')
        : String(v);
const label = (e: Editable) => pick(e.label);
/** A value as the rules have it: board for the default, the chosen ruleset for the current one. */
const value = (id: string, path: string) => {
  try {
    return getPath(defOf(id), path);
  } catch {
    return getPath(defOf("board"), path);
  }
};
const mine = () => custom()[B.rs];
/** A ruleset whose changes are not all labelled and worded for the table runs only in sandbox games (FR-R-7). */
const settle = (r: Ruleset): Ruleset => ({
  ...r,
  sandbox: r.overrides.some(o => promoteProblem(o) !== null)
});

/* ---- the page ---- */
export function bench(): string {
  if (!B.rs || !all()[B.rs]) B.rs = Object.keys(custom())[0] ?? "pc";
  return `<div class="bench">
<header><button class="pback" data-t-page="main">← ${t('back')}</button><h2>${t('bench.design_bench')}</h2>
<nav class="tabs">${(["rules", "lab", "export"] as Tab[]).map(t => `<button class="${B.tab === t ? "on" : ""}" data-b-tab="${t}">${pick({ rules: say('newgame.rules'), lab: say('bench.lab'), export: say('bench.export') }[t] as Text)}</button>`).join("")}</nav></header>
<section class="b-body">${body()}</section></div>`;
}
const body = () => (B.tab === "rules" ? rulesTab() : B.tab === "lab" ? labTab() : exportTab());
function redraw() {
  const el = document.querySelector("#title .b-body");
  if (el) el.innerHTML = body();
  document
    .querySelectorAll<HTMLElement>("#title [data-b-tab]")
    .forEach(b => b.classList.toggle("on", b.dataset.bTab === B.tab));
}

/** The rulesets, the chosen one's changes, and every value with a search. */
function rulesTab() {
  const list = all(),
    r = list[B.rs],
    own = !!custom()[B.rs];
  const picker = `<div class="b-rs"><h4>${t('bench.rulesets')}</h4>${Object.values(list)
    .map(
      x =>
        `<button class="${x.id === B.rs ? "on" : ""}" data-b-rs="${x.id}"><b>${esc(x.id)}</b><small>${rulesets[x.id] ? t('bench.built') : x.sandbox ? t('bench.sandbox') : t('bench.yours')}</small></button>`
    )
    .join("")}
<div class="b-new"><input data-b-name placeholder="${t('bench.new_ruleset')}" spellcheck="false"><button data-b-create>${t('bench.create')}</button></div><p class="b-msg" id="b-msg"></p></div>`;
  return `<div class="b-rules">${picker}<div class="b-main">${own ? changes(r) : `<p class="note">${t('bench.built_cannot', { id: r.id })}</p>`}
<div class="b-search"><input data-b-q value="${esc(B.q)}" placeholder="${t('bench.search_values')}" spellcheck="false"></div><div class="b-values">${values(own)}</div></div></div>`;
}
/** The changes this ruleset makes, each with how it would reach the table. */
function changes(r: Ruleset) {
  const flat = flattenRuleset(r, all());
  const rows = r.overrides
    .map(o => {
      const [path, to] = Object.entries(o.set ?? {})[0] ?? ["", ""],
        e = VALUES.find(v => v.path === path);
      return `<div class="b-ch" data-b-o="${esc(o.id)}"><div class="b-ch-h"><b>${e ? esc(label(e)) : esc(path)}</b><span>${show(value("board", path))} → <b>${show(to)}</b></span><button data-b-reset="${esc(path)}">${t('bench.undo_change')}</button></div>
<div class="b-ch-f"><select data-b-conv>${(Object.keys(LABELS) as Conversion[]).map(k => `<option value="${k}"${o.conversion === k ? " selected" : ""}>${pick(LABELS[k])}</option>`).join("")}</select>
<input data-b-table value="${esc(o.table)}" placeholder="${t('bench.reads_table')}"><input data-b-why value="${esc(o.why)}" placeholder="${t('bench.why')}">
${o.conversion === "component" ? `<input data-b-comp value="${esc((o.components ?? []).join(", "))}" placeholder="${t('bench.components_comma')}">` : ""}</div>
${promoteProblem(o) ? `<small class="b-warn">${t('bench.sandbox_until')}: ${esc(promoteProblem(o))}</small>` : ""}</div>`;
    })
    .join("");
  return `<div class="b-chs"><h4>${esc(r.id)}: ${r.overrides.length ? t('bench.change_s', { length: r.overrides.length }) : t('bench.no_changes')}${flat.overrides.length > r.overrides.length ? ` <small>${t('bench.top', { base: r.base })}</small>` : ""}</h4>${rows}
<div class="b-acts"><button data-b-play>${t('bench.play')}</button><button data-b-test>${t('bench.test_lab')}</button><button data-b-delete>${t('bench.delete_ruleset')}</button></div></div>`;
}
/** Every value that can change, found by name or path: board's default, this ruleset's value, and a field to change it. */
function values(own: boolean) {
  const q = B.q.trim().toLowerCase();
  const found = q
    ? VALUES.filter(
        e =>
          e.path.toLowerCase().includes(q) ||
          e.label.en.toLowerCase().includes(q) ||
          e.label.ru.toLowerCase().includes(q)
      )
    : VALUES.filter(e => e.group === "settings");
  return (
    `<div class="b-v head"><span>${t('bench.value')}</span><span>${t('bench.board')}</span><span>${esc(B.rs)}</span><span>${t('bench.printed')}</span></div>` +
    found
      .slice(0, 80)
      .map(e => {
        const base = value("board", e.path),
          now = value(B.rs, e.path),
          changed = JSON.stringify(base) !== JSON.stringify(now);
        return `<div class="b-v${changed ? " ch" : ""}"><span title="${esc(e.path)}">${esc(label(e))}<small>${esc(e.path)}</small></span><span>${show(base)}</span><span>${own ? field(e, now) : show(now)}</span><span class="src">${esc(where(sourceOf(e.path)))}</span></div>`;
      })
      .join("") +
    (found.length > 80
      ? `<p class="note">${t('bench.narrow_search', { v: found.length - 80 })}</p>`
      : !found.length
        ? `<p class="note">${t('bench.nothing_found')}</p>`
        : "")
  );
}
function field(e: Editable, v: unknown) {
  const a = `data-b-set="${esc(e.path)}"`;
  if (e.type === "boolean")
    return `<select ${a}><option value="true"${v ? " selected" : ""}>${t('bench.yes')}</option><option value="false"${v ? "" : " selected"}>${t('bench.no')}</option></select>`;
  if (e.options)
    return `<select ${a}>${e.options.map(o => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  if (e.type === "number")
    return `<input type="number" ${a} value="${v ?? ""}" ${e.min !== undefined ? `min="${e.min}"` : ""} ${e.max !== undefined ? `max="${e.max}"` : ""} step="1">`;
  return `<input ${a} value="${esc(Array.isArray(v) ? v.join(", ") : v)}">`;
}
const parse = (e: Editable, raw: string): unknown => {
  if (e.type === "boolean") return raw === "true";
  if (e.type === "number") return raw.trim() === "" && e.nullable ? null : Number(raw);
  if (e.type === "number[]")
    return raw
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
  if (e.type === "string[]")
    return raw
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  return raw;
};

/** What to carry to the workbook and the rules document: the conversion report, the change list by sheet, row and column, and the ruleset itself. */
function exportTab() {
  const r = all()[B.rs],
    flat = { ...flattenRuleset(r, all()), base: undefined },
    rows = changeList(gameData, flat);
  const report = conversionReport(gameData, rulesets.board, {
    ...flat,
    base: "board",
    overrides: flat.overrides.filter(o => !rulesets.board.overrides.some(b => b.id === o.id))
  });
  return `<div class="b-export"><div class="b-acts"><label>${t('bench.ruleset')} <select data-b-pick>${Object.keys(
    all()
  )
    .map(id => `<option${id === B.rs ? " selected" : ""}>${esc(id)}</option>`)
    .join("")}</select></label>
<button data-b-dl="csv">${t('bench.cells_edit')}</button><button data-b-dl="md">${t('bench.cells_edit2')}</button><button data-b-dl="report">${t('bench.conversion_report')}</button><button data-b-dl="json">${t('bench.ruleset_file')}</button></div>
<p class="note">${t('bench.make_change')} <code>pnpm rules promote &lt;id&gt;</code> ${t('bench.drop_decision')}</p>
${Dev.on ? `<section class="b-board" id="b-board">${toBoard()}</section>` : ""}
<div class="md">${md(report)}</div><h4>${t('bench.cells_edit3')}</h4><div class="md">${md(toMarkdown(rows))}</div></div>`;
}

/* ---- toward the board game (dev mode, FR-R-9): the local server writes rulesets/*.json and docs/decisions.md, as `pnpm rules` does ---- */
const S: {
  rs: Record<string, Ruleset> | null;
  down: boolean;
  busy: boolean;
  msg: string;
  rows: string;
  fresh: boolean;
} = { rs: null, down: false, busy: false, msg: "", rows: "", fresh: false };
async function readServer() {
  try {
    const r = await fetch("/api/rules");
    if (!r.ok) throw new Error();
    S.rs = (await r.json()) as Record<string, Ruleset>;
    S.down = false;
  } catch {
    S.down = true;
  }
  const el = document.getElementById("b-board");
  if (el) el.innerHTML = toBoard();
}
function toBoard(): string {
  const h = `<h4>${t('bench.toward_board')}</h4>`;
  if (S.down)
    return `${h}<p class="note">${t('bench.rules_files')} <code>pnpm web</code> ${t('bench.use')} <code>pnpm rules</code>.</p>`;
  if (!S.rs) {
    void readServer();
    return `${h}<p class="note">${t('bench.reading_rules')}</p>`;
  }
  const pc = S.rs.pc.overrides,
    board = S.rs.board.overrides,
    off = S.busy ? " disabled" : "";
  const line = (o: Override, acts: string) => {
    const why = promoteProblem(o);
    return `<div class="b-ch"><div class="b-ch-h"><b>${esc(o.id)}</b><span>${esc(o.table || o.why || Object.keys(o.set ?? {}).join(", "))}</span>${acts}</div>${why ? `<small class="b-warn">${t('bench.not_ready')}: ${esc(why)}</small>` : ""}</div>`;
  };
  const pcRows = pc.length
    ? pc
        .map(o =>
          line(
            o,
            `<button data-b-promote="${esc(o.id)}"${promoteProblem(o) ? " disabled" : off}>${t('bench.promote_board')}</button><button data-b-drop="${esc(o.id)}"${off}>${t('bench.drop')}</button>`
          )
        )
        .join("")
    : `<p class="note">${t('bench.pc_plays')}</p>`;
  const from = B.rs !== "pc" && B.rs !== "board" ? all()[B.rs] : undefined;
  const add = from
    ? `<h5>${t('bench.changes', { id: from.id })}</h5>${from.overrides.length ? from.overrides.map(o => line(o, pc.some(x => x.id === o.id) ? `<small>${t('bench.pc')}</small>` : board.some(x => x.id === o.id) ? `<small>${t('bench.board2')}</small>` : `<button data-b-add="${esc(o.id)}"${promoteProblem(o) ? " disabled" : off}>${t('bench.add_pc')}</button>`)).join("") : `<p class="note">${t('bench.no_changes')}</p>`}`
    : "";
  return `${h}<p class="note">${t('bench.change_goes')}</p>
<h5>${t('bench.waiting_pc')}</h5>${pcRows}${add}
${S.msg ? `<p class="b-msg">${esc(S.msg)}${S.fresh ? ` <button data-b-reload>${t('bench.reload_game')}</button>` : ""}</p>` : ""}${S.rows ? `<div class="md">${md(S.rows)}</div>` : ""}`;
}
async function step(kind: "add" | "promote" | "drop", x: { id?: string; override?: Override }) {
  S.busy = true;
  S.msg = t('bench.writing_files');
  S.rows = "";
  const el = () => document.getElementById("b-board");
  el()!.innerHTML = toBoard();
  try {
    const r = await fetch(`/api/rules/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(x)
      }),
      out = (await r.json()) as {
        message?: string;
        error?: string;
        rows?: Parameters<typeof toMarkdown>[0];
      };
    S.msg =
      out.error ??
      `${out.message} ${t('bench.reload_play')}`;
    S.fresh = !out.error;
    if (out.rows?.length) S.rows = toMarkdown(out.rows);
  } catch {
    S.msg = t('bench.local_server');
  }
  S.busy = false;
  await readServer();
}
function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---- changing a ruleset ---- */
function save(r: Ruleset) {
  keep(settle(r));
}
function setValue(path: string, raw: string) {
  const r = mine(),
    e = VALUES.find(v => v.path === path);
  if (!r || !e) return;
  const v = parse(e, raw),
    why = validateChange(gameData, path, v);
  if (why) {
    msg(why);
    return;
  }
  const id = path,
    base = value("board", path),
    o = r.overrides.find(x => x.id === id);
  // Back to the board value: the change goes away.
  if (JSON.stringify(v) === JSON.stringify(base)) r.overrides = r.overrides.filter(x => x.id !== id);
  else if (o) o.set = { [path]: v };
  else
    r.overrides.push({
      id,
      why: "",
      conversion: "direct",
      table: "",
      set: { [path]: v }
    } as Override);
  try {
    save(r);
    defOf(r.id);
    msg("");
  } catch (x) {
    msg((x as Error).message);
  }
  redraw();
}
const msg = (t: string) => {
  const el = document.getElementById("b-msg");
  if (el) el.textContent = t;
};

document.addEventListener("click", e => {
  if (U.title !== "bench") return;
  const el = e.target as HTMLElement,
    q = (s: string) => el.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if ((x = q("[data-b-tab]"))) {
    B.tab = x.dataset.bTab as Tab;
    redraw();
  } else if ((x = q("[data-b-rs]"))) {
    B.rs = x.dataset.bRs!;
    redraw();
  } else if (q("[data-b-create]")) {
    const name = (document.querySelector<HTMLInputElement>("#title [data-b-name]")?.value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!name) return msg(t('bench.give_name'));
    if (all()[name]) return msg(t('bench.name_taken'));
    save({ id: name, title: name, base: "pc", overrides: [] });
    B.rs = name;
    redraw();
  } else if ((x = q("[data-b-reset]"))) {
    const p = x.dataset.bReset!;
    setValue(p, JSON.stringify(value("board", p)));
    const r = mine();
    if (r) {
      r.overrides = r.overrides.filter(o => o.id !== p);
      save(r);
      redraw();
    }
  } else if (q("[data-b-delete]")) {
    if (confirm(t('bench.delete_ruleset2', { rs: B.rs }))) {
      forget(B.rs);
      B.rs = "";
      redraw();
    }
  } else if (q("[data-b-test]")) {
    B.tab = "lab";
    lab.b = B.rs;
    redraw();
  } else if (q("[data-b-play]")) {
    void import("./newgame.ts").then(m => m.openNewGame(B.rs));
  } else if ((x = q("[data-b-promote]"))) {
    const id = x.dataset.bPromote!;
    if (
      confirm(
        t('bench.make_part', { id })
      )
    )
      void step("promote", { id });
  } else if ((x = q("[data-b-drop]"))) {
    const id = x.dataset.bDrop!;
    if (confirm(t('bench.drop_pc', { id })))
      void step("drop", { id });
  } else if ((x = q("[data-b-add]"))) {
    const o = all()[B.rs]?.overrides.find(v => v.id === x!.dataset.bAdd);
    if (o) void step("add", { override: o });
  } else if (q("[data-b-reload]")) location.reload();
  else if ((x = q("[data-b-dl]"))) {
    const r = all()[B.rs],
      flat = { ...flattenRuleset(r, all()), base: undefined },
      rows = changeList(gameData, flat),
      k = x.dataset.bDl;
    if (k === "csv") download(`${r.id}-cells.csv`, toCsv(rows), "text/csv");
    else if (k === "md") download(`${r.id}-cells.md`, toMarkdown(rows), "text/markdown");
    else if (k === "report")
      download(
        `${r.id}-conversion.md`,
        conversionReport(gameData, rulesets.board, { ...flat, base: "board" }),
        "text/markdown"
      );
    else download(`${r.id}.json`, JSON.stringify(r, null, 2), "application/json");
  }
});
document.addEventListener("change", e => {
  if (U.title !== "bench") return;
  const t = e.target as HTMLInputElement,
    o = t.closest<HTMLElement>("[data-b-o]"),
    r = mine();
  if (t.dataset.bSet !== undefined) return setValue(t.dataset.bSet, t.value);
  if (t.dataset.bPick !== undefined) {
    B.rs = t.value;
    return redraw();
  }
  if (!o || !r) return;
  const ov = r.overrides.find(x => x.id === o.dataset.bO);
  if (!ov) return;
  if (t.dataset.bConv !== undefined) ov.conversion = t.value as Conversion;
  else if (t.dataset.bTable !== undefined) ov.table = t.value;
  else if (t.dataset.bWhy !== undefined) ov.why = t.value;
  else if (t.dataset.bComp !== undefined)
    ov.components = t.value
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  save(r);
  redraw();
});
document.addEventListener("input", e => {
  const t = e.target as HTMLInputElement;
  if (U.title !== "bench" || t.dataset.bQ === undefined) return;
  B.q = t.value;
  const el = document.querySelector("#title .b-values");
  if (el) el.innerHTML = values(!!mine());
});
