/* The title screen: the name of the game and its menu — Continue, New game, Load game, Options, About — over a living map where bots play. */

// The game's version, from the root package.json (bumped with `pnpm release:patch`, `:minor` or `:major`).
import { version } from "../../../../package.json";
/** The recordings the game plays and whom to credit (sound/music.json, from their Wikimedia Commons pages). */
import MUSIC from "../../sound/music.json";
import { $, D, lang, pick, t } from "../data.ts";
import { Board } from "../map/board.ts";
import { paint } from "../paint.ts";
import { Dev, Sim } from "../sim.ts";
import { Sound } from "../sound.ts";
import { type TitlePage, U } from "../state.ts";
import { startAttract, stopAttract } from "./attract.ts";
import { bench } from "./bench.ts";
import { introPlaying } from "./intro.ts";
import { crest, newGame, openNewGame } from "./newgame.ts";
import { settings } from "./settings.ts";
import { chooseFile, enterGame } from "./setup.ts";
import { tutorialOn } from "./tutorial.ts";

/** The year a round falls in. */
const year = (round: number) => D.settings.rounds.firstYear + (round - 1) * D.settings.rounds.yearStep;
/** A compass rose: the ornament under the title. */
const ROSE = `<svg viewBox="0 0 120 24" aria-hidden="true"><path d="M2 12h44M74 12h44" stroke="currentColor" stroke-width="1.200"/><circle cx="60" cy="12" r="9.500" fill="none" stroke="currentColor" stroke-width="1.200"/><path d="M60 0l3 12-3 12-3-12Z" fill="currentColor"/><path d="M48 12l12-3 12 3-12 3Z" fill="currentColor" opacity=".6"/><circle cx="46" cy="12" r="1.800" fill="currentColor"/><circle cx="74" cy="12" r="1.800" fill="currentColor"/></svg>`;

/** The saved game, as a card with what it is. */
function savedCard() {
  const s = Sim.savedInfo();
  if (!s)
    return `<p class="empty">${t('title.no_game')}</p>`;
  return `<div class="save">${crest(s.nation, 64)}<div><b>${pick(D.names.nations[s.nation] ?? [s.nation, s.nation])}</b><span>${s.over ? t('hand.war_over') : `${year(s.round)} · ${t('setup.round')} ${s.round}`} · ${s.players === 1 ? t('title.solo') : t('title.players', { players: s.players })}</span></div><div class="sa"><button class="primary" data-t-continue>${t('title.continue')}</button><button data-t-forget>${t('title.forget')}</button></div></div>`;
}
const PAGES: Record<Exclude<TitlePage, "main" | "new" | "bench">, () => string> = {
  load: () => `<h2>${t('title.load_game')}</h2>
<h3>${t('title.saved_browser')}</h3>${savedCard()}
<h3>${t('title.file')}</h3><p>${t('title.game_saved')}</p>
<button class="wide" data-open-file>${t('title.open_saved')}</button>`,
  options: () => `<h2>${t('title.options')}</h2>${settings(false)}`,
  about: () => `<h2>${t('title.about')}</h2>
<p class="lead">${t('title.colonization_board')}</p>
<h3>${t('title.game_brief')}</h3><ul>
<li>${t('title.turn_play')}</li>
<li>${t('title.round_ends')}</li>
<li>${t('title.15_bells')}</li>
<li>${t('title.colonies_hold')}</li></ul>
<h3>${t('title.controls')}</h3><dl>
<dt>${t('title.drag_click')}</dt><dd>${t('title.place_act')}</dd>
<dt>${t('title.wheel_drag')}</dt><dd>${t('title.zoom_move')}</dd>
<dt>1–9</dt><dd>${t('title.pick_agent')}</dd><dt>Enter</dt><dd>${t('title.read')}</dd><dt>Esc</dt><dd>${t('title.put_down')}</dd></dl>
<p class="note">${t('title.board_game')}</p>
<h3>${t('settings.music')}</h3><ul class="credits">${MUSIC.map(m => `<li><a href="${m.page}" target="_blank" rel="noopener">${m.composer}: ${m.title}</a><small>${m.by} · ${m.license}</small></li>`).join("")}</ul>
<p class="note">${t('title.sound_effects')}</p>`
};

/** What the title screen shows; it is drawn again only when this changes. */
let shown = "";
/** The title screen. Called on every repaint, it redraws only when its page, the language, the saved game or the options change. */
export function title() {
  const el = $("title"),
    page = U.title;
  document.body.classList.toggle("titled", !!page);
  if (!page || introPlaying()) {
    el.hidden = true;
    el.dataset.page = "";
    shown = "";
    stopAttract();
    return;
  }
  el.hidden = false;
  startAttract();
  const key = [
      page,
      lang(),
      page === "new" ? "" : JSON.stringify(Sim.savedInfo()),
      page === "options"
        ? [tutorialOn(), Sim.fast, Board.view.auto, Board.grid, Dev.on, Dev.forecast, Sound.mute].join()
        : ""
    ].join("|"),
    was = shown.split("|")[0];
  if (key === shown) return;
  shown = key;
  if (page === "new") {
    el.dataset.page = "new";
    el.innerHTML = newGame();
    return;
  }
  if (page === "bench") {
    el.dataset.page = "bench";
    el.innerHTML = bench();
    return;
  }
  const s = Sim.savedInfo(),
    cont = s && !s.over;
  const items: [string, string, boolean][] = [
    ["data-t-continue", t('title.continue'), !cont],
    ["data-t-new", t('newgame.new_game'), false],
    ['data-t-page="load"', t('title.load_game'), false],
    ["data-guide", t('newgame.rules'), false],
    ['data-t-page="bench"', t('bench.design_bench'), false],
    ['data-t-page="options"', t('title.options'), false],
    ['data-t-page="about"', t('title.about'), false]
  ];
  // The name and the menu rise in once, when the title screen opens; a page slides in when it is opened, not when it is redrawn.
  const first = !was || was === "new",
    fresh = was !== page;
  el.dataset.page = page;
  el.innerHTML = `<div class="veil" aria-hidden="true"><div class="mist a"></div><div class="mist b"></div></div>
<header class="brand${first ? " enter" : ""}"><h1>${t('title.colonization')}</h1><span class="rose">${ROSE}</span><p>${t('title.new_world')}</p></header>
<nav class="menu-t${first ? " enter" : ""}">${items.map(([a, n, off], i) => `<button ${a} class="${page !== "main" && a.includes(`"${page}"`) ? "on" : ""}" ${off ? "disabled" : ""} style="--i:${i}"><b>${n}</b></button>`).join("")}</nav>
${page === "main" ? "" : `<section class="page${fresh ? " anim" : ""}">${PAGES[page]()}<button class="pback" data-t-page="main">${t('back')}</button></section>`}
<small class="ver">v${version}</small>`;
}
/** Open the title screen from the game. */
export function openTitle(page: TitlePage = "main") {
  U.title = page;
  U.menu = false;
  paint();
}

document.addEventListener("click", e => {
  if (!U.title) return;
  const el = e.target as HTMLElement,
    q = (s: string) => el.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if (q("[data-t-continue]")) {
    if (Sim.savedInfo()) {
      if (!Sim.resume()) return;
      Board.home();
      enterGame();
    }
  } else if (q("[data-t-new]")) openNewGame();
  else if ((x = q("[data-t-page]"))) {
    U.title = x.dataset.tPage as TitlePage;
    paint();
  } else if (q("[data-t-forget]")) {
    if (
      confirm(
        t('title.forget_saved')
      )
    ) {
      Sim.forget();
      paint();
    }
  } else if (q("[data-open-file]")) chooseFile();
});
// From the game: the main menu or the new game screen.
document.addEventListener("click", e => {
  const x = (e.target as HTMLElement).closest<HTMLElement>("[data-t-open]");
  if (!x || U.title) return;
  if (x.dataset.tOpen === "new") openNewGame();
  else openTitle("main");
});
document.addEventListener(
  "keydown",
  e => {
    if (!U.title || introPlaying()) return;
    if (e.key === "Escape" && U.title !== "main") {
      e.stopImmediatePropagation();
      U.title = "main";
      paint();
    }
  },
  true
);
