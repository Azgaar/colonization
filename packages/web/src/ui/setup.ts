/* Starting games, games in files (FR-E-10) and replays (FR-U-17, FR-T-6). */
import { $, D, L, pick, showSeat } from '../data.ts';
import { settle } from '../flow.ts';
import { Board } from '../map/board.ts';
import { paint } from '../paint.ts';
import { Sim, type Replay, type Setup } from '../sim.ts';
import { S, U } from '../state.ts';
import { clearNews } from './reports.ts';
import { playIntro } from './intro.ts';

const option = (v: string, label: string, on: boolean) => `<option value="${v}"${on ? ' selected' : ''}>${label}</option>`;

/** The bar under a replay: move through it, and see it from any seat. */
export function replayBar() {
  const el = $('replay'), r = Sim.replay;
  el.hidden = !r || !!U.title;
  document.body.classList.toggle('watching', !!r);
  if (!r) return;
  const n = r.data.choices.length;
  el.innerHTML = `<button data-rp="0" title="${L('Start', 'В начало')}">⏮</button><button data-rp="${r.at - 1}">◀</button><button data-rp-play>${timer ? '⏸' : '▶'}</button><button data-rp="${r.at + 1}">▶▶</button><button data-rp="${n}" title="${L('End', 'В конец')}">⏭</button>
<input type="range" min="0" max="${n}" value="${r.at}" data-rp-at><span class="at">${r.at} / ${n} · ${L('round', 'тур')} ${D.round}</span>
<select data-rp-seat>${D.players.map((p, i) => option(`${i}`, pick(D.names.nations[p.nation]), i === Sim.seat)).join('')}</select><button data-rp-close>${L('Close the replay', 'Закрыть запись')}</button>`;
}

let timer: ReturnType<typeof setInterval> | null = null;
const stop = () => { if (timer) clearInterval(timer); timer = null; };
/** The interface after the game behind it changed: nothing lifted, no stale reports, the map repainted. */
const after = () => { clearNews(); S.card = null; S.look = null; S.war = -1; S.view = 'map'; paint(); void Board.land(true); };
/** Go to a moment of the replay. */
const seek = (at: number) => { Sim.seek(at); if (Sim.replay && Sim.replay.at >= Sim.replay.data.choices.length) stop(); after(); };

/** Leave the title screen for the game that is loaded, and let the others play if it is their turn. */
export function enterGame() { U.title = null; U.menu = false; after(); if (!Sim.replay) void settle(); }
/** A new game from a setup: the opening scene first, then the map. */
export function startGame(x: Setup) {
  stop(); Sim.start(x); Sim.keep(); showSeat(0); U.title = null; U.menu = false; Board.home(); after();
  playIntro(x.nations[0], () => void settle());
}
/** A file chosen by the player: a saved game, or a recorded one. */
async function openFile(f: File) {
  const text = await f.text();
  try {
    const x = JSON.parse(text) as Partial<Replay> & { game?: string };
    if (Array.isArray(x.choices)) { stop(); showSeat(0); Sim.watch(x as Replay); }
    else if (typeof x.game === 'string' && Sim.open(text)) showSeat(0);
    else throw new Error(L('not a saved game or a replay', 'это не сохранённая игра и не запись'));
    Board.home(); enterGame();
  } catch (e) { alert(`${L('Cannot open the file', 'Не удалось открыть файл')}: ${(e as Error).message}`); }
}
/** The game at this moment, as a file to keep or to send. */
export function saveFile() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([Sim.file()], { type: 'application/json' }));
  a.download = `colonization-${Sim.setup.seed}-${D.year}.json`; a.click(); URL.revokeObjectURL(a.href);
}
export function chooseFile() { ($('file') as HTMLInputElement).click(); }

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if ((x = q('[data-rp]'))) { stop(); seek(+x.dataset.rp!); }
  else if (q('[data-rp-play]')) { if (timer) stop(); else timer = setInterval(() => seek((Sim.replay?.at ?? 0) + 1), 400); paint(); }
  else if (q('[data-save-file]')) { saveFile(); U.menu = false; paint(); }
  else if (q('[data-open-file]')) chooseFile();
  else if ((x = q('[data-look]'))) { const c = +x.dataset.look!; U.sheet = false; S.look = c; S.view = 'map'; Board.stage.look(c); paint(); }
  else if (q('[data-rp-close]')) { stop(); Sim.stopWatching(); showSeat(0); Board.home(); after(); void settle(); }
});
document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement & HTMLSelectElement;
  if (t.dataset.rpSeat !== undefined) { showSeat(+t.value); after(); }
  else if (t.id === 'file' && t.files?.[0]) { void openFile(t.files[0]); t.value = ''; }
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.rpAt !== undefined) { stop(); seek(+t.value); }
});
