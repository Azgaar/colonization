/* A new game (FR-U-1), games in files (FR-E-10) and replays (FR-U-17, FR-T-6). */
import type { Personality } from '@col/bots';
import { $, D, L, pick, showSeat } from '../data.ts';
import { settle } from '../flow.ts';
import { Board } from '../map/board.ts';
import { paint } from '../paint.ts';
import { NATIONS, PERSONALITY_NAMES, RULESETS, Sim, type Replay, type Setup } from '../sim.ts';
import { S, U } from '../state.ts';
import { clearNews } from './reports.ts';

const CHARACTERS: Record<string, [string, string]> = {
  balanced: ['Balanced', 'Сбалансированный'], trader: ['Trader', 'Торговец'], explorer: ['Explorer', 'Исследователь'], missionary: ['Missionary', 'Миссионер'],
  rebel: ['Rebel', 'Бунтарь'], loyalist: ['Loyalist', 'Лоялист'], defender: ['Defender', 'Защитник'], raider: ['Raider', 'Налётчик'],
};
/** The form as it is being filled in. */
const form: { n: number; nation: string; bots: Personality[]; ruleset: string; seed: string } = { n: 4, nation: 'french', bots: ['balanced', 'trader', 'explorer', 'missionary'], ruleset: 'board', seed: '' };
const option = (v: string, label: string, on: boolean) => `<option value="${v}"${on ? ' selected' : ''}>${label}</option>`;
const nation = (k: string) => pick(D.names.nations[k] ?? [k, k]);

/** The nations in a game of `n`: the player's first, then the next ones in the list. */
export const nationsFor = (n: number, own: string) => [own, ...NATIONS.filter((x) => x !== own)].slice(0, n);

function setupBox() {
  const el = $('setup');
  el.hidden = !U.setup;
  if (!U.setup) return;
  const others = nationsFor(form.n, form.nation).slice(1);
  el.innerHTML = `<h3>${L('New game', 'Новая игра')}</h3>
<label class="row">${L('Players', 'Игроков')}<span class="set">${[1, 2, 3, 4, 5].map((n) => `<button data-su-n="${n}" class="${form.n === n ? 'on' : ''}">${n}</button>`).join('')}</span></label>
<label class="row">${L('Your nation', 'Ваша нация')}<select data-su-nation>${NATIONS.map((k) => option(k, nation(k), k === form.nation)).join('')}</select></label>
${others.map((k, i) => `<label class="row">${nation(k)}<select data-su-bot="${i}">${PERSONALITY_NAMES.map((p) => option(p, pick(CHARACTERS[p] ?? [p, p]), form.bots[i] === p)).join('')}</select></label>`).join('')}
<label class="row">${L('Rules', 'Правила')}<select data-su-ruleset>${RULESETS.map((r) => option(r, r, r === form.ruleset)).join('')}</select></label>
<label class="row">${L('Seed', 'Зерно')}<input data-su-seed value="${form.seed}" placeholder="${L('random', 'случайное')}"></label>
<p class="note">${form.n === 1 ? L('Solo: keep a colony through the war to win.', 'Соло: чтобы победить, удержите колонию в войне.') : L('The other nations are played by bots.', 'Остальными нациями играют боты.')}</p>
<div class="row"><button data-su-cancel>${L('Cancel', 'Отмена')}</button><button class="go" data-su-start>${L('Start', 'Начать')}</button></div>`;
}
/** The bar under a replay: move through it, and see it from any seat. */
function replayBar() {
  const el = $('replay'), r = Sim.replay;
  el.hidden = !r;
  document.body.classList.toggle('watching', !!r);
  if (!r) return;
  const n = r.data.choices.length;
  el.innerHTML = `<button data-rp="0" title="${L('Start', 'В начало')}">⏮</button><button data-rp="${r.at - 1}">◀</button><button data-rp-play>${timer ? '⏸' : '▶'}</button><button data-rp="${r.at + 1}">▶▶</button><button data-rp="${n}" title="${L('End', 'В конец')}">⏭</button>
<input type="range" min="0" max="${n}" value="${r.at}" data-rp-at><span class="at">${r.at} / ${n} · ${L('round', 'тур')} ${D.round}</span>
<select data-rp-seat>${D.players.map((p, i) => option(`${i}`, nation(p.nation), i === Sim.seat)).join('')}</select><button data-rp-close>${L('Close the replay', 'Закрыть запись')}</button>`;
}
export function setup() { setupBox(); replayBar(); }

let timer: ReturnType<typeof setInterval> | null = null;
const stop = () => { if (timer) clearInterval(timer); timer = null; };
const after = () => { clearNews(); S.card = null; S.look = null; S.war = -1; S.view = 'map'; paint(); void Board.land(true); };
/** Go to a moment of the replay. */
const seek = (at: number) => { Sim.seek(at); if (Sim.replay && Sim.replay.at >= Sim.replay.data.choices.length) stop(); after(); };

/** Start a new game from the form. */
function start() {
  const x: Setup = { nations: nationsFor(form.n, form.nation), bots: form.bots.slice(0, form.n - 1), ruleset: form.ruleset, seed: form.seed.trim() || `g${Date.now().toString(36)}` };
  stop(); U.setup = false; U.menu = false; Sim.start(x); Board.home(); after(); void settle();
}
/** A file chosen by the player: a saved game, or a recorded one. */
async function openFile(f: File) {
  const text = await f.text();
  try {
    const x = JSON.parse(text) as Partial<Replay> & { game?: string };
    if (Array.isArray(x.choices)) { stop(); showSeat(0); Sim.watch(x as Replay); }
    else if (typeof x.game === 'string' && Sim.open(text)) showSeat(0);
    else throw new Error(L('not a saved game or a replay', 'это не сохранённая игра и не запись'));
    U.menu = false; Board.home(); after();
    // A game (not a replay) goes on: the bots play if it is their turn.
    if (!Sim.replay) void settle();
  } catch (e) { alert(`${L('Cannot open the file', 'Не удалось открыть файл')}: ${(e as Error).message}`); }
}
/** The game at this moment, as a file to keep or to send. */
export function saveFile() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([Sim.file()], { type: 'application/json' }));
  a.download = `colonization-${Sim.setup.seed}-${D.year}.json`; a.click(); URL.revokeObjectURL(a.href);
}
export function openNewGame() { const s = Sim.setup; form.n = s.nations.length; form.nation = s.nations[0]; form.bots = [...s.bots, ...PERSONALITY_NAMES].slice(0, 4) as Personality[]; form.ruleset = s.ruleset; form.seed = ''; U.setup = true; U.menu = false; paint(); }
export function chooseFile() { ($('file') as HTMLInputElement).click(); }

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement, q = (s: string) => t.closest<HTMLElement>(s);
  let x: HTMLElement | null;
  if ((x = q('[data-su-n]'))) { form.n = +x.dataset.suN!; paint(); }
  else if (q('[data-su-start]')) start();
  else if (q('[data-su-cancel]')) { U.setup = false; paint(); }
  else if ((x = q('[data-rp]'))) { stop(); seek(+x.dataset.rp!); }
  else if (q('[data-rp-play]')) { if (timer) stop(); else timer = setInterval(() => seek((Sim.replay?.at ?? 0) + 1), 400); paint(); }
  else if (q('[data-setup-open]')) openNewGame();
  else if (q('[data-save-file]')) { saveFile(); U.menu = false; paint(); }
  else if (q('[data-open-file]')) chooseFile();
  else if ((x = q('[data-look]'))) { const c = +x.dataset.look!; U.sheet = false; S.look = c; S.view = 'map'; Board.stage.look(c); paint(); }
  else if (q('[data-rp-close]')) { stop(); Sim.stopWatching(); showSeat(0); Board.home(); after(); void settle(); }
});
document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement & HTMLSelectElement;
  if (t.dataset.suNation !== undefined) { form.nation = t.value; paint(); }
  else if (t.dataset.suBot !== undefined) form.bots[+t.dataset.suBot] = t.value as Personality;
  else if (t.dataset.suRuleset !== undefined) form.ruleset = t.value;
  else if (t.dataset.rpSeat !== undefined) { showSeat(+t.value); after(); }
  else if (t.id === 'file' && t.files?.[0]) { void openFile(t.files[0]); t.value = ''; }
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.suSeed !== undefined) form.seed = t.value;
  else if (t.dataset.rpAt !== undefined) { stop(); seek(+t.value); }
});
