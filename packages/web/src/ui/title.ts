/* The title screen: the name of the game and its menu — Continue, New game, Load game, Options, About — over a living map where bots play. */
import { $, D, L, lang, pick } from '../data.ts';
import { icon } from '../icons.ts';
import { Board } from '../map/board.ts';
import { paint } from '../paint.ts';
import { Sim } from '../sim.ts';
import { U, type TitlePage } from '../state.ts';
import { crest, newGame, openNewGame } from './newgame.ts';
import { chooseFile, enterGame } from './setup.ts';
import { introPlaying } from './intro.ts';
import { startAttract, stopAttract } from './attract.ts';
// The game's version, from the root package.json (bumped with `pnpm release:patch`, `:minor` or `:major`).
import { version } from '../../../../package.json';

/** The year a round falls in. */
const year = (round: number) => D.settings.rounds.firstYear + (round - 1) * D.settings.rounds.yearStep;
/** A compass rose: the ornament under the title. */
const ROSE = `<svg viewBox="0 0 120 24" aria-hidden="true"><path d="M2 12h44M74 12h44" stroke="currentColor" stroke-width="1.200"/><circle cx="60" cy="12" r="9.500" fill="none" stroke="currentColor" stroke-width="1.200"/><path d="M60 0l3 12-3 12-3-12Z" fill="currentColor"/><path d="M48 12l12-3 12 3-12 3Z" fill="currentColor" opacity=".6"/><circle cx="46" cy="12" r="1.800" fill="currentColor"/><circle cx="74" cy="12" r="1.800" fill="currentColor"/></svg>`;
const seg = (label: string, list: [string, string, boolean][]) => `<div class="orow"><span>${label}</span><span class="set">${list.map(([a, n, on]) => `<button class="${on ? 'on' : ''}" ${on ? '' : a}>${n}</button>`).join('')}</span></div>`;

/** The saved game, as a card with what it is. */
function savedCard() {
  const s = Sim.savedInfo();
  if (!s) return `<p class="empty">${L('No game is saved in this browser yet.', 'В этом браузере пока нет сохранённой игры.')}</p>`;
  return `<div class="save">${crest(s.nation, 64)}<div><b>${pick(D.names.nations[s.nation] ?? [s.nation, s.nation])}</b><span>${s.over ? L('The war is over', 'Война окончена') : `${year(s.round)} · ${L('round', 'тур')} ${s.round}`} · ${s.players === 1 ? L('solo', 'соло') : L(`${s.players} players`, `игроков: ${s.players}`)}</span></div><div class="sa"><button class="primary" data-t-continue>${L('Continue', 'Продолжить')}</button><button data-t-forget>${L('Forget', 'Забыть')}</button></div></div>`;
}
const PAGES: Record<Exclude<TitlePage, 'main' | 'new'>, () => string> = {
  load: () => `<h2>${L('Load game', 'Загрузить игру')}</h2>
<h3>${L('Saved in this browser', 'Сохранено в этом браузере')}</h3>${savedCard()}
<h3>${L('From a file', 'Из файла')}</h3><p>${L('A game saved to a file during play (Options → Save to a file).', 'Игра, сохранённая в файл во время игры (Настройки → Сохранить в файл).')}</p>
<button class="wide" data-open-file>${icon('book', 18)} ${L('Open a saved game…', 'Открыть сохранённую игру…')}</button>`,
  options: () => { const v = Board.view; return `<h2>${L('Options', 'Настройки')}</h2>
${seg(L('Language', 'Язык'), [['data-lang="en"', 'English', lang() === 'en'], ['data-lang="ru"', 'Русский', lang() === 'ru']])}
${seg(L('Other players’ turns', 'Ходы других игроков'), [['data-fast=""', L('Show each', 'Показывать'), !Sim.fast], ['data-fast="1"', L('At once', 'Сразу'), Sim.fast]])}
<h3>${L('Map', 'Карта')}</h3>
${seg(L('Tilt follows zoom', 'Наклон по масштабу'), [['data-follow="1"', L('On', 'Да'), !!v.auto], ['data-follow=""', L('Off', 'Нет'), !v.auto]])}
${seg(L('Cell grid', 'Сетка клеток'), [['data-grid=""', L('Off', 'Нет'), !Board.grid], ['data-grid="1"', L('On', 'Да'), Board.grid]])}
<div class="orow"><span>${L('Camera', 'Камера')}</span><span class="set"><button data-reset>${L('Reset the view', 'Сбросить вид')}</button></span></div>`; },
  about: () => `<h2>${L('About', 'Об игре')}</h2>
<p class="lead">${L('Colonization is a board game about the New World from 1620 to 1800, and this is its computer version: the same rules, played against bots, to test the game.', '«Колонизация» — настольная игра о Новом Свете с 1620 по 1800 год, а это её компьютерная версия: те же правила, игра против ботов, чтобы испытать игру.')}</p>
<h3>${L('The game in brief', 'Коротко о правилах')}</h3><ul>
<li>${L('Each turn you play one agent from your hand for one action: sail, march, found a colony, gather, work, build, trade, hire, win over a Founding Father.', 'Каждый ход вы разыгрываете одного агента с руки на одно действие: плыть, идти, основать колонию, добывать, работать, строить, торговать, нанимать, привлекать Отцов-основателей.')}</li>
<li>${L('Each round ends with an event and the King’s tax. Refusing it brings bells, and redcoats to the King’s army.', 'Каждый тур заканчивается событием и налогом короля. Отказ приносит колокола — и красные мундиры в армию короля.')}</li>
<li>${L('At 15 bells or after round 10 comes the War of Independence. The least rebellious governor sides with the King; the others defend their colonies.', 'При 15 колоколах или после 10-го тура начинается Война за независимость. Наименее мятежный губернатор встаёт на сторону короля, остальные защищают свои колонии.')}</li>
<li>${L('Colonies that hold, bells, agents, gold, buildings and Fathers score points. Keep at least one colony to win.', 'Очки дают удержанные колонии, колокола, агенты, золото, постройки и Отцы. Чтобы победить, удержите хотя бы одну колонию.')}</li></ul>
<h3>${L('Controls', 'Управление')}</h3><dl>
<dt>${L('Drag or click an agent', 'Перетащите или выберите агента')}</dt><dd>${L('every place it can act lights up', 'подсвечиваются все места, где он может действовать')}</dd>
<dt>${L('Wheel, drag', 'Колесо, перетаскивание')}</dt><dd>${L('zoom and move the map', 'масштаб и движение карты')}</dd>
<dt>1–9</dt><dd>${L('pick an agent from the hand', 'выбрать агента с руки')}</dd><dt>Enter</dt><dd>${L('read on', 'дальше')}</dd><dt>Esc</dt><dd>${L('put down, close', 'отменить, закрыть')}</dd></dl>
<p class="note">${L('Board game, rules and art: the Colonization board game. Interface, rules engine and bots: this project, milestone M3.', 'Настольная игра, правила и иллюстрации: настольная игра «Колонизация». Интерфейс, движок правил и боты: этот проект, этап M3.')}</p>`,
};

/** What the title screen shows; it is drawn again only when this changes. */
let shown = '';
/** The title screen. Called on every repaint, it redraws only when its page, the language, the saved game or the options change. */
export function title() {
  const el = $('title'), page = U.title;
  document.body.classList.toggle('titled', !!page);
  if (!page || introPlaying()) { el.hidden = true; el.dataset.page = ''; shown = ''; stopAttract(); return; }
  el.hidden = false; startAttract();
  const key = [page, lang(), page === 'new' ? '' : JSON.stringify(Sim.savedInfo()), page === 'options' ? [Sim.fast, Board.view.auto, Board.grid].join() : ''].join('|'), was = shown.split('|')[0];
  if (key === shown) return;
  shown = key;
  if (page === 'new') { el.dataset.page = 'new'; el.innerHTML = newGame(); return; }
  const s = Sim.savedInfo(), cont = s && !s.over;
  const items: [string, string, boolean][] = [
    ['data-t-continue', L('Continue', 'Продолжить'), !cont],
    ['data-t-new', L('New game', 'Новая игра'), false],
    ['data-t-page="load"', L('Load game', 'Загрузить игру'), false],
    ['data-t-page="options"', L('Options', 'Настройки'), false],
    ['data-t-page="about"', L('About', 'Об игре'), false],
  ];
  // The name and the menu rise in once, when the title screen opens; a page slides in when it is opened, not when it is redrawn.
  const first = !was || was === 'new', fresh = was !== page;
  el.dataset.page = page;
  el.innerHTML = `<div class="veil" aria-hidden="true"><div class="mist a"></div><div class="mist b"></div></div>
<header class="brand${first ? ' enter' : ''}"><h1>${L('Colonization', 'Колонизация')}</h1><span class="rose">${ROSE}</span><p>${L('A New World, a charter from the King, and a question of loyalty', 'Новый Свет, грамота короля и вопрос верности')}</p></header>
<nav class="menu-t${first ? ' enter' : ''}">${items.map(([a, n, off], i) => `<button ${a} class="${page !== 'main' && a.includes(`"${page}"`) ? 'on' : ''}" ${off ? 'disabled' : ''} style="--i:${i}"><b>${n}</b></button>`).join('')}</nav>
${page === 'main' ? '' : `<section class="page${fresh ? ' anim' : ''}">${PAGES[page]()}<button class="pback" data-t-page="main">${L('Back', 'Назад')}</button></section>`}
<small class="ver">v${version}</small>`;
}
/** Open the title screen from the game. */
export function openTitle(page: TitlePage = 'main') { U.title = page; U.menu = false; paint(); }

document.addEventListener('click', (e) => {
  if (!U.title) return;
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if (q('[data-t-continue]')) { if (Sim.savedInfo()) { if (!Sim.resume()) return; Board.home(); enterGame(); } }
  else if (q('[data-t-new]')) openNewGame();
  else if ((x = q('[data-t-page]'))) { U.title = x.dataset.tPage as TitlePage; paint(); }
  else if (q('[data-t-forget]')) { if (confirm(L('Forget the saved game? It cannot be brought back.', 'Забыть сохранённую игру? Её нельзя будет вернуть.'))) { Sim.forget(); paint(); } }
  else if (q('[data-open-file]')) chooseFile();
});
// From the game: the main menu or the new game screen.
document.addEventListener('click', (e) => {
  const x = (e.target as HTMLElement).closest<HTMLElement>('[data-t-open]');
  if (!x || U.title) return;
  if (x.dataset.tOpen === 'new') openNewGame(); else openTitle('main');
});
document.addEventListener('keydown', (e) => {
  if (!U.title || introPlaying()) return;
  if (e.key === 'Escape' && U.title !== 'main') { e.stopImmediatePropagation(); U.title = 'main'; paint(); }
}, true);
