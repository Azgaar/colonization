/* The settings, drawn the same in both places they are changed: the title screen's Options page and the game menu.
 * A section heading, then rows: a name on the left, its switch, choices or slider on the right. A switch is the whole row, so a click anywhere on it turns it. */
import { L, lang } from '../data.ts';
import { Board } from '../map/board.ts';
import { Dev, LOCAL, Sim } from '../sim.ts';
import { Music, Sound } from '../sound.ts';
import { tutorialOn } from './tutorial.ts';

/** A switch. It carries what a click sets: `on` when it is off, `off` when it is on. As a heading it also names its section. */
const tog = (cls: string, name: string, on: boolean, set: [on: string, off: string]) => `<button class="${cls} tog" role="switch" aria-checked="${on}" ${on ? set[1] : set[0]}><span>${name}</span><i class="sw"></i></button>`;
const row = (name: string, on: boolean, set: [string, string]) => tog('orow', name, on, set);
/** Choices side by side, the chosen one lit. */
const seg = (name: string, list: [attr: string, n: string, on?: boolean][]) => `<div class="orow"><span>${name}</span><span class="seg">${list.map(([a, n, on]) => `<button class="${on ? 'on' : ''}" ${on ? '' : a}>${n}</button>`).join('')}</span></div>`;
const head = (name: string, end = '') => `<h4 class="ohead"><span>${name}</span>${end}</h4>`;
/** A volume slider: heard as it moves (sound.ts reads the output right after it). */
const vol = (k: 'music' | 'fx', name: string) => `<label class="orow range"><span>${name}</span><input type="range" data-vol="${k}" min="0" max="100" step="5" value="${Sound[k]}"${Sound.mute ? ' disabled' : ''}><output>${Sound[k]}%</output></label>`;
/** The piece playing, named, with pause or play and the next piece. Drawn again in place when the music changes (sound.ts tells). */
const PLAY = '<path d="M7 4.5v15l12-7.5Z" fill="currentColor"/>', PAUSE = '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>', NEXT = '<path d="M5 5v14l10-7ZM16 5h3v14h-3z" fill="currentColor"/>';
const svg = (d: string) => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${d}</svg>`;
/** The composer as players know him: the surname, or Traditional. */
const short = (c: string) => (c.startsWith('Traditional') ? 'Traditional' : c.split(' ').at(-1) ?? c);
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/** A piece as the list names it: "Surname: Title". */
const named = (m: { composer: string; title: string }) => (m.composer ? `${short(m.composer)}: ${m.title}` : m.title);
/** The name of the piece playing is also the list of every piece, in alphabetical order: any can be chosen. */
function player() {
  const n = Music.now, f = Music.file, off = Sound.mute ? ' disabled' : '';
  const all = Music.all.map((m) => ({ file: m.file, name: named(m) })).sort((a, b) => a.name.localeCompare(b.name));
  const list = all.length ? `<select data-music-pick aria-label="${L('Piece', 'Произведение')}"${n ? ` title="${esc(`${n.composer ? `${n.composer}: ` : ''}${n.title}${n.by ? `\n${n.by}` : ''}`)}"` : ''}${off}>${n ? '' : `<option value="" selected disabled>${L('No music yet', 'Музыки пока нет')}</option>`}${all.map((m) => `<option value="${m.file}"${m.file === f ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : '';
  const name = `<span class="tn">${list || `<small>${L('No music yet', 'Музыки пока нет')}</small>`}${n?.by ? `<small>${esc(n.by)}</small>` : ''}</span>`;
  return `${name}<span class="ctl"><button data-music="toggle" aria-label="${Music.paused ? L('Play', 'Играть') : L('Pause', 'Пауза')}" title="${Music.paused ? L('Play', 'Играть') : L('Pause', 'Пауза')}"${off}>${svg(Music.paused ? PLAY : PAUSE)}</button><button data-music="next" aria-label="${L('Next piece', 'Следующая')}" title="${L('Next piece', 'Следующая')}"${off}>${svg(NEXT)}</button></span>`;
}
if (typeof document !== 'undefined') document.addEventListener('music', () => document.querySelectorAll<HTMLElement>('.prefs .player').forEach((el) => { el.innerHTML = player(); }));

/** The settings, in sections. In the game the map has its camera and view sliders, and the dev menu can be opened. */
export function settings(inGame: boolean) {
  const v = Board.view;
  const slide = ([k, n, lo, hi, u]: [keyof typeof v, string, number, number, string]) => `<label class="orow range"><span>${n}</span><input type="range" data-view-set="${k}" data-unit="${u}" min="${lo}" max="${hi}" value="${v[k]}"><output>${v[k]}${u}</output></label>`;
  const general = `<section>${head(L('General', 'Общие'))}
${seg(L('Language', 'Язык'), [['data-lang="en"', 'English', lang() === 'en'], ['data-lang="ru"', 'Русский', lang() === 'ru']])}
${row(L('Tutorial', 'Обучение'), tutorialOn(), ['data-tutorial="1"', 'data-tutorial=""'])}
${row(L('Show others’ turns', 'Показывать чужие ходы'), !Sim.fast, ['data-fast=""', 'data-fast="1"'])}</section>`;
  const sound = `<section>${tog('ohead', L('Sound', 'Звук'), !Sound.mute, ['data-mute=""', 'data-mute="1"'])}
<div class="orow player">${player()}</div>
${vol('music', L('Music', 'Музыка'))}${vol('fx', L('Effects', 'Эффекты'))}</section>`;
  const map = `<section>${head(L('Map', 'Карта'), `<button class="pill" data-reset>${L('Reset', 'Сбросить')}</button>`)}
${inGame ? seg(L('Camera', 'Камера'), [['data-cam="out" aria-label="−"', '−'], ['data-cam="in" aria-label="+"', '+'], ['data-cam="home"', L('Start', 'Начало')], ['data-cam="fit"', L('All', 'Всё')]]) : ''}
${row(L('Tilt follows zoom', 'Наклон по масштабу'), !!v.auto, ['data-follow="1"', 'data-follow=""'])}
${inGame ? `${slide(v.auto ? ['most', L('Closest tilt', 'Наклон вблизи'), 20, 70, '°'] : ['tilt', L('Tilt', 'Наклон'), 0, 45, '°'])}
${slide(['depth', L('Perspective', 'Перспектива'), 0, 100, '%'])}
${slide(['shift', L('Shift', 'Сдвиг'), -25, 25, '%'])}` : ''}
${row(L('Cell grid', 'Сетка клеток'), Board.grid, ['data-grid="1"', 'data-grid=""'])}</section>`;
  const dev = LOCAL ? `<section>${tog('ohead', L('Dev mode', 'Режим разработчика'), Dev.on, ['data-dev="1"', 'data-dev=""'])}
${Dev.on ? row(L('Forecast in play', 'Прогноз в игре'), Dev.forecast, ['data-forecast="1"', 'data-forecast=""']) : ''}
${Dev.on && inGame && Sim.sandbox ? `<div class="orow"><span>${L('Edit the game', 'Правка игры')}</span><button class="pill" data-sandbox>${L('Dev menu', 'Меню разработчика')}</button></div>` : ''}</section>` : '';
  return `<div class="prefs">${general}${sound}${map}${dev}</div>`;
}
