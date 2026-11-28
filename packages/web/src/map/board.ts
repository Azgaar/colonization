/* The map: a tilted plane of fixed pictures, with everything that stands on it as separate upright elements. */
import { map, type Move } from '@col/engine';
import { $, ACT, art, at, colonyAt, colonyName, column, D, lang, me, P, pick, RES, settlementAt, SIZE, syncWidth, t, tokenAt, W } from '../data.ts';
import { DEFS, roundel, SHAPES } from '../icons.ts';
import { Bonus } from './bonus.ts';
import { stage, type Pitch, type Stage } from './camera.ts';
import { Sprite } from './sprites.ts';
import { drawClouds } from './clouds.ts';
import { drawRich, drawSea, isKept } from './terrain.ts';
import { paint } from '../paint.ts';
import { keepOptions, Options, VIEW } from '../options.ts';
import { Places, type Spaces, type Way } from '../places.ts';
import { S, X } from '../state.ts';
import { Sim, type Opt } from '../sim.ts';
import type { Snapshot } from '../view.ts';
import { plate } from '../ui/war.ts';
type Colony = Snapshot['colonies'][number];
type Village = Snapshot['settlements'][number];
const terrain = document.querySelector<HTMLCanvasElement>('canvas.terrain')!;
/* ---- the view: tilt, perspective and shift, remembered in the browser ---- */
const view: View = Options.view;
/** A lean for the moment, in place of the person's (the title screen's flatter view): never stored. */
let lean: number | null = null;
const most = () => lean ?? view.most;
/** How the map is seen: the tilt and the most of it when it follows the zoom (`auto`), the perspective, the shift up or down. */
export type View = typeof VIEW;
const lens = () => 3600 * (900 / 3600) ** (view.depth / 100), up = () => 1 / Math.cos(((view.auto ? most() * 0.6 : view.tilt) * Math.PI) / 180);
/** As in strategy games: straight down when zoomed far out, leaning more the closer one gets. The lean grows fast at first and levels off near the ground (ease-out over the logarithm of the zoom). */
const pitch: Pitch = (z, min, max) => { const u = Math.min(1, Math.max(0, Math.log(z / min) / Math.log(max / min))); return most() * (1 - (1 - u) ** 2); };
const haze = () => document.body.style.setProperty('--haze', ((B.stage.angle() / 45) ** 1.3 * 0.34).toFixed(2));
/** Farthest zoom: the whole board just fits between the top line and the hand, seen from above. Never 0 or less, even in a window
 *  shorter than the top line and the hand (or one not laid out yet), or the tilt (`pitch`) and every point on the map become NaN. */
const whole = () => Math.max(0.05, Math.min((innerWidth - 24) / SIZE(), (innerHeight - 220) / SIZE()));
function look() { B.stage.tilt(view.tilt, lens(), (view.shift / 100) * innerHeight, view.auto ? pitch : null); haze(); }
/* ---- what stands on the map ---- */
let fid = 0;
const face = (x: number, y: number, card: string, r = 15) => { const id = `f${fid++}`; return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r - 2}"/></clipPath><circle cx="${x}" cy="${y}" r="${r}" fill="#f7f1e1"/><image href="${art.agent(card)}" x="${x - r}" y="${y - r + 1}" width="${r * 2}" height="${r * 2.9}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${id})"/>`; };
const SVG = (x: number, y: number, s: number, body: string) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 64 64">${body}</svg>`;
const pill = (x: number, y: number, text: string) => { const w = text.length * 8.2 + 18; return `<rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="22" rx="11" fill="#f7f1e1"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="15" font-weight="800" fill="#1c2a2a">${text}</text>`; };
/** A colony in the war: the attack against its defence as far as the player knows them (`?` while cards hide part), and once its cards are turned over, whether it held. */
function warPlate(c: Colony, x: number, y: number) {
  const sieges = D.war?.sieges ?? [], i = sieges.findIndex((z) => z.cell === c.cell); if (i < 0) return null;
  const q = sieges[i]!, k = plate(i), w = 112, more = '<tspan font-size="11" fill="#edb443">?</tspan>';
  const says = (v: Omit<typeof k, 'late' | 'before'>) => `<text x="47" y="16" font-size="15" font-weight="800" fill="#93e09c" text-anchor="end">${v.def}${v.hidD ? more : ''}</text><text x="67" y="16" font-size="15" font-weight="800" fill="#ff8f78">${v.atk}${v.hidA ? more : ''}</text>`
    + (v.fell === undefined ? '' : v.fell ? '<path d="M96 7l8 8m0-8l-8 8" stroke="#ff8f78" stroke-width="3" stroke-linecap="round"/>' : '<path d="M95 11l4 4 7-8" stroke="#8fe09a" stroke-width="3" fill="none" stroke-linecap="round"/>');
  // While its cards are turning, the plate keeps what was known, then shows what they showed.
  const body = k.before ? `<g class="sold" style="--late:${k.late}">${says(k.before)}</g><g class="wmk" style="--late:${k.late}">${says(k)}</g>` : says(k);
  return `<g transform="translate(${x + 32 - w / 2} ${y + 54})" data-war="${i}" style="cursor:pointer">${i === S.war ? `<rect x="-4" y="-4" width="${w + 8}" height="30" rx="15" fill="#fff08a"/>` : ''}<rect width="${w}" height="22" rx="11" fill="#0f3436f2"/>${roundel(-6, -3, q.owner, 28)}<svg x="50" y="4" width="14" height="14" viewBox="0 0 24 24" color="#f7f1e1" opacity=".7">${SHAPES.power}</svg>${body}</g>`;
}
/** A settlement: how many live there and how alarmed they are. */
function count(v: Village, x: number, y: number) {
  const hot = v.hostility >= 4, w = 66, ic = (n: string, cx: number) => `<svg x="${cx}" y="2" width="14" height="14" viewBox="0 0 24 24" color="#f7f1e1">${SHAPES[n]}</svg>`, num = (n: number, cx: number, c = '#f7f1e1') => `<text x="${cx}" y="14" font-size="14.500" font-weight="800" fill="${c}">${n}</text>`;
  return `<g transform="translate(${x - w / 2} ${y - 1})"><rect width="${w}" height="18" rx="9" fill="#0f3436e6"/>${ic('population', 7)}${num(v.pop, 23)}${ic('hostility', 36)}${num(v.hostility, 53, hot ? '#ff8f78' : '#f7f1e1')}</g>`;
}
/** A ship under the pointer: what is in its hold, and the infantry if it is aboard. */
function cargoPlate(i: number, x: number, y: number) {
  const p = D.players[i], hold: Record<string, number> = p.hold, l = RES.filter((r) => hold[r]).map((r): [string, number] => [r, hold[r]]);
  if (p.inf === 'ship') l.push(['infantry', 1]);
  const w = l.length ? l.length * 34 + 10 : 66, item = ([k, n]: [string, number], j: number) => `<svg x="${7 + j * 34}" y="2" width="15" height="15" viewBox="0 0 24 24" color="#f7f1e1">${SHAPES[k]}</svg><text x="${24 + j * 34}" y="15" font-size="14.500" font-weight="800" fill="#f7f1e1">${n}</text>`;
  return `<g transform="translate(${x - w / 2} ${y})"><rect width="${w}" height="19" rx="9.500" fill="#0f3436e6"/>${l.length ? l.map(item).join('') : `<text x="${w / 2}" y="14.500" text-anchor="middle" font-size="13" font-weight="700" fill="#f7f1e1" fill-opacity=".8">${t('board.empty')}</text>`}</g>`;
}
/** How wide a line of the map's plates is, in map units. */
let pen: CanvasRenderingContext2D | null = null;
function wide(s: string, px: number) {
  if (!pen) { pen = document.createElement('canvas').getContext('2d')!; pen.font = `800 ${px}px ${getComputedStyle(document.body).getPropertyValue('--ui') || 'sans-serif'}`; }
  return pen.measureText(s).width;
}
/** A colony under the pointer: its name and how well it holds. */
function colonyPlate(c: Colony, x: number, y: number) {
  const mine = c.owner === me, name = colonyName(c), nw = Math.ceil(wide(name, 13.5)), d = 28 + nw + 8, w = d + 30;
  return `<g transform="translate(${x - w / 2} ${y})"><rect width="${w}" height="20" rx="10" fill="${mine ? D.players[me].color : '#0f3436e6'}" ${mine ? 'stroke="#fff" stroke-width="2"' : ''}/>${roundel(-4, -3, c.owner, 26)}<text x="28" y="15" font-size="13.500" font-weight="800" fill="#f7f1e1">${name}</text><text x="${d}" y="15" font-size="14.500" font-weight="800" fill="#f7f1e1">${c.defence}</text><svg x="${d + 10}" y="4" width="12" height="12" viewBox="0 0 24 24" color="#f7f1e1">${SHAPES.power}</svg></g>`;
}
/** Something that stands on the map: where (map units), how high in the stack, whether it takes the pointer, and its picture. */
interface Thing { id: string; x: number; y: number; z: number; hit: boolean; html: string }
/** Puts a thing on cell `c`: its point there (dx, dy), its picture from the cell's corner, how high in the stack, whether it takes the pointer. */
type Put = (id: string, c: number, dx: number, dy: number, html: (x: number, y: number) => string, z?: number, hit?: boolean) => void;
/* ---- the overview: zoomed far out, everything on the map is a simple sign, to see at a glance what is where ---- */
/** Zoomed out to within this much of the farthest, the map shows its overview. */
const FAR = 1.25;
let far = false;
/** A round sign: a disc with a pictogram (24-unit box) in it. */
const dot = (x: number, y: number, r: number, fill: string, glyph: string, rim = '#fff', w = 2.5, ink = '#fff') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${rim}" stroke-width="${w}"/><svg x="${x - r * 0.64}" y="${y - r * 0.64}" width="${r * 1.28}" height="${r * 1.28}" viewBox="0 0 24 24" color="${ink}">${glyph}</svg>`;
/** A square sign `a` units across, for a colony or a settlement, in the middle of its cell (x, y the cell's corner). */
const square = (x: number, y: number, a: number, fill: string, glyph: string, rim = '#fff', ink = '#fff') => { const o = 32 - a / 2, g = a * 0.68; return `<rect x="${x + o}" y="${y + o}" width="${a}" height="${a}" rx="${a * 0.23}" fill="${fill}" stroke="${rim}" stroke-width="3"/><svg x="${x + 32 - g / 2}" y="${y + 32 - g / 2}" width="${g}" height="${g}" viewBox="0 0 24 24" color="${ink}">${glyph}</svg>`; };
/** A hexagonal sign, for a ruin or a wreck: what is left behind. */
const hex = (x: number, y: number, r: number, glyph: string) => `<path d="M${[0, 1, 2, 3, 4, 5].map((i) => `${(x + r * Math.cos((i * Math.PI) / 3)).toFixed(1)} ${(y + r * Math.sin((i * Math.PI) / 3)).toFixed(1)}`).join('L')}Z" fill="${LEFT}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><svg x="${x - r * 0.6}" y="${y - r * 0.6}" width="${r * 1.2}" height="${r * 1.2}" viewBox="0 0 24 24" color="#fff">${glyph}</svg>`;
/** The colours of the overview: the natives' brown, a settlement alarmed enough to attack, what is left behind (ruins and wrecks). */
const NATIVE = '#7a4f2a', ALARM = '#ff6a52', LEFT = '#3a3f44';
const GLYPH: Record<string, string> = {
  tipi: '<path d="M12 4 3.500 21h17Z" fill="currentColor"/><path d="M12 13.500 9.500 21h5Z" fill="#00000059"/><path d="M8.500 1.500 12 4l3.500-2.500" stroke="currentColor" stroke-width="1.600" fill="none" stroke-linecap="round"/>',
  ruin: '<path d="M3.500 21V10l2-1.200L7.500 10v11Zm6.500 0V4h4v4l-2 1.500L14 11v10Zm6.500 0v-8l2 1.200 2-1.500V21Z" fill="currentColor"/><path d="M2 21.500h20" stroke="currentColor" stroke-width="1.800"/>',
  wreck: '<path d="M8 18 14.500 3.500" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/><path d="M13.500 6.500l6.500 3-2.200 4-1.800-1.600-1.800 2.600Z" fill="currentColor"/><path d="M2 20.500q2.500-2.500 5 0t5 0 5 0 5 0" stroke="currentColor" stroke-width="1.800" fill="none" stroke-linecap="round"/>',
};
/** The pictogram of the good each bonus resource gives, as in the warehouse. */
const BONUS: Record<string, string> = { food: 'food', crops: 'crops', timber: 'timber', silver: 'silver' };
/** What stands on the map, each as one sign in the middle of its cell. Squares are places: a colony in its nation's colour, a smaller settlement in the natives' brown. Discs are units in their nation's colour.
 * All of these have a white rim, but a settlement alarmed enough to attack (hostility 4 or more) has a red one. Ruins and wrecks are dark grey hexagons. A bonus resource is the bare pictogram of its good, thinly outlined, in the bottom right corner of its cell. */
function overview(sp: Spaces, at: Put, near: (c: number) => boolean) {
  // Signs have their own elements, so that they fade in as the pictures fade out (see `draw`).
  const put: Put = (id, ...r) => at(`~${id}`, ...r);
  const halo = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r + 6}" fill="#fff08a" fill-opacity=".25" stroke="#fff08a" stroke-width="4"/>`;
  for (const [c, k] of Object.entries(D.poi)) put(`p${c}`, +c, 32, 32, (x, y) => hex(x + 32, y + 32, 14, GLYPH[k] ?? ''));
  D.bonus.forEach((b, c) => { const n = b ? BONUS[b] : undefined; if (n && !colonyAt(c) && !settlementAt(c)) put(`b${c}`, c, 32, 32, (x, y) => `<g filter="url(#halo)"><svg x="${x + 41}" y="${y + 41}" width="22" height="22" viewBox="0 0 24 24">${SHAPES[n]}</svg></g>`, 1); });
  for (const v of D.settlements) if (v.alive) {
    const s = sp[`cell:${v.cell}`], on = s?.village || s?.attack, acts = on ? [...new Set((s.options ?? []).map((q) => pick(ACT[q.a] || ['', ''])))].join(' / ') : '';
    put(`v${v.cell}`, v.cell, 32, 32, (x, y) => (on ? halo(x + 32, y + 32, 17) : '') + square(x, y, 34, NATIVE, GLYPH.tipi!, v.hostility >= 4 ? ALARM : '#fff', '#f4e2bc') + (v.ally !== null ? roundel(x + 38, y + 10, v.ally, 16) : '') + (on ? pill(x + 32, y + 62, acts) : ''));
    if (!on && near(v.cell)) put(`h${v.cell}`, v.cell, 32, 32, (x, y) => count(v, x + 32, y + 50), 3000);
  }
  for (const c of D.colonies) {
    const s = sp[`cell:${c.cell}`], war = warPlate(c, 0, 0);
    put(`c${c.cell}`, c.cell, 32, 32, (x, y) => (s?.attack ? halo(x + 32, y + 32, 22) : '') + square(x, y, 44, D.players[c.owner]!.color, SHAPES.colony!) + (warPlate(c, x, y + 4) ?? '') + (s?.attack ? pill(x + 32, y + 2, pick(ACT.attack)) : ''), 0, !!D.war);
    if (near(c.cell) && !war) put(`h${c.cell}`, c.cell, 32, 32, (x, y) => colonyPlate(c, x + 32, y + 54), 3000);
  }
  const ships = new Map<number, number>();
  D.players.forEach((p, i) => {
    const mine = i === me;
    if (typeof p.ship === 'number') {
      const s = sp[`cell:${p.ship}`], hit = s?.attack && !mine, k = ships.get(p.ship) ?? 0, d = k * 12; ships.set(p.ship, k + 1);
      put(`s${i}`, p.ship, 32 + d, 32 + d, (x, y) => (hit ? halo(x + 32, y + 32, 16) : '') + dot(x + 32 + d, y + 32 + d, 16, p.color, SHAPES.ship!) + (p.damage ? `<text x="${x + 46 + d}" y="${y + 24 + d}" font-size="15" font-weight="800" fill="#ff6a52" stroke="#1c2a2a" stroke-width="3" paint-order="stroke">−${p.damage}</text>` : '') + (hit ? pill(x + 32, y + 62, pick(ACT.attack)) : ''), 5);
      if (near(p.ship) && !hit) put(`hs${i}`, p.ship, 32, 32, (x, y) => cargoPlate(i, x + 32, y + 50), 3000);
    }
    // Infantry in a colony sits on the corner of its square.
    if (typeof p.inf === 'number') { const c = colonyAt(p.inf), s = sp[`cell:${p.inf}`], hit = s?.attack && !mine && !c, a = c ? 10 : 32, b = c ? 54 : 32; put(`i${i}`, p.inf, 32, 32, (x, y) => (hit ? halo(x + a, y + b, 12) : '') + dot(x + a, y + b, 12, p.color, SHAPES.pawn!) + (hit ? pill(x + 32, y + 60, pick(ACT.attack)) : ''), 6); }
  });
}
/* ---- The Royal Army: when the war begins it lands colony by colony, a ship off the coast and one soldier at a time on the land around ---- */
type Landing = { siege: number; cell: number; ship: boolean };
const ARMY: { key: string; plan: Landing[]; shown: number; timer: number } = { key: '', plan: [], shown: 0, timer: 0 };
/** The cells around `c`, clockwise from the top left, that are on the map. */
const around = (c: number) => { const x = c % W, y = Math.floor(c / W), h = D.terrain.length / W; return [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].filter(([a, b]) => x + a! >= 0 && x + a! < W && y + b! >= 0 && y + b! < h).map(([a, b]) => c + a! + b! * W); };
/** Where each ship and soldier goes, in the order they land: for each besieged colony its ship, then its soldiers round the free land next to it. */
function landings(): Landing[] {
  const plan: Landing[] = [], busy = (c: number) => colonyAt(c) || settlementAt(c);
  D.war!.sieges.forEach((x, siege) => {
    const near = around(x.cell), land = near.filter((c) => D.terrain[c] && D.terrain[c] !== 'ocean'), free = land.filter((c) => !busy(c)), sea = near.find((c) => D.terrain[c] === 'ocean');
    const ring = free.length ? free : land.length ? land : [x.cell];
    if (sea !== undefined && x.cubes) plan.push({ siege, cell: sea, ship: true });
    for (let k = 0; k < x.cubes; k++) plan.push({ siege, cell: ring[k % ring.length]!, ship: false });
  });
  return plan;
}
/** Starts the landing when the war is new and the map is in view; once the game is over (or loaded at war) it is all there at once. */
function muster() {
  const w = D.war; if (!w) { ARMY.key = ''; return; }
  const key = `${Sim.s.seed} ${w.tactic} ${w.pool} ${w.sieges.length}`;
  if (key !== ARMY.key) { ARMY.key = key; ARMY.plan = landings(); ARMY.shown = D.over || Sim.replay ? ARMY.plan.length : 0; clearTimeout(ARMY.timer); ARMY.timer = 0; }
  if (ARMY.shown >= ARMY.plan.length || ARMY.timer || X.reports.length || S.view !== 'map' || document.body.classList.contains('titled')) return;
  const step = () => {
    const next = ARMY.plan[ARMY.shown], prev = ARMY.plan[ARMY.shown - 1];
    // A new colony: the camera goes there first.
    if (next && next.siege !== prev?.siege) B.stage.look(D.war!.sieges[next.siege]!.cell + W);
    ARMY.shown++; draw();
    const after = ARMY.plan[ARMY.shown], cubes = D.war!.sieges[next?.siege ?? 0]?.cubes ?? 1;
    ARMY.timer = after ? window.setTimeout(step, after.siege !== next?.siege ? 650 : Math.max(35, Math.min(140, 1800 / cubes))) : 0;
  };
  ARMY.timer = window.setTimeout(step, 500);
}
/** A click or Esc while the army lands puts the rest down at once. */
const allAshore = () => { if (!ARMY.timer) return; clearTimeout(ARMY.timer); ARMY.timer = 0; ARMY.shown = ARMY.plan.length; draw(); };
addEventListener('pointerdown', allAshore, true); addEventListener('keydown', (e) => { if (e.key === 'Escape') allAshore(); }, true);
/** The soldiers on one cell, back rows first; the one that just landed drops in. */
function squad(n: number, x: number, y: number, fresh: boolean) {
  const rows = Math.ceil(n / 3), gap = Math.min(8, 30 / rows), out: string[] = [];
  for (let j = 0; j < n; j++) { const row = Math.floor(j / 3), col = j % 3, cx = x + 14 + col * 18 + (row % 2 ? 6 : 0), fy = y + 24 + row * gap; out.push(`<g${fresh && j === n - 1 ? ' class="landing"' : ''}>${SVG(cx - 16, fy - 28, 32, REDCOAT)}</g>`); }
  return out.join('');
}
const REDCOAT = Sprite.redcoat(), REFSHIP = Sprite.refShip();
/** Everything that stands on the map now. */
function things(sp: Spaces) {
  const o: Thing[] = [], lift = !!S.card;
  const glow = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="33" ry="13" fill="#fff08a" fill-opacity=".25" stroke="#fff08a" stroke-width="4"/>`, own = (x: number, y: number, r = 25) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.36}" fill="none" stroke="#fff" stroke-width="3.400"/>`;
  const put = (id: string, c: number, dx: number, dy: number, html: (x: number, y: number) => string, z = 0, hit = false) => { if (shown && shown[c] === '0') return; const [x, y] = at(c); o.push({ id, x: x + dx, y: y + dy, z: Math.round(y + dy + z), hit, html: html(x, y) }); };
  // What lies on land that is still being painted waits for it.
  const near = (c: number) => S.hov === c || S.look === c || S.over === `cell:${c}`;
  if (far) overview(sp, put, near); else {
  // A wreck is drawn smaller than a ruin, with the same centre and bottom.
  for (const [c, k] of Object.entries(D.poi)) put(`p${c}`, +c, 32, 50, (x, y) => (k === 'ruin' ? SVG(x + 4, y + 2, 56, Sprite.ruin(+c)) : SVG(x + 10, y + 14, 44, Sprite.wreck(+c))));
  // Plates with numbers only for the cell under the pointer or the clicked one; at rest a colony shows whose it is.
  // A village grows with its people: 5 is a little larger than a cell's picture, 1 about two thirds of it.
  for (const v of D.settlements) if (v.alive) { const k = 0.58 + 0.1 * v.pop, s = sp[`cell:${v.cell}`], on = s?.village || s?.attack, acts = on ? [...new Set((s.options ?? []).map((q) => pick(ACT[q.a] || ['', ''])))].join(' / ') : ''; put(`v${v.cell}`, v.cell, 32, 56, (x, y) => (on ? glow(x + 32, y + 50) : '') + SVG(x + 32 - 32 * k, y + 53 - 57 * k, 64 * k, Sprite.village(v)) + (v.ally !== null ? roundel(x + 32 + 12 * k, y + 53 - 55 * k, v.ally, 22) : '') + (on ? pill(x + 32, y + 64, acts) : '')); if (!on && near(v.cell)) put(`h${v.cell}`, v.cell, 32, 56, (x, y) => count(v, x + 32, y + 57), 3000); }
  for (const c of D.colonies) { const s = sp[`cell:${c.cell}`]; put(`c${c.cell}`, c.cell, 32, 56, (x, y) => (s?.attack ? glow(x + 32, y + 50) : '') + SVG(x - 2, y - 6, 68, Sprite.colony(c)) + (warPlate(c, 0, 0) ? '' : roundel(x + 20, y + 52, c.owner, 24)) + (s?.attack ? pill(x + 32, y - 12, pick(ACT.attack)) : '')); /* In the war its plate stands over the soldiers around it. */ if (warPlate(c, 0, 0)) put(`w${c.cell}`, c.cell, 32, 56, (x, y) => warPlate(c, x, y)!, 2500, true); if (near(c.cell) && !warPlate(c, 0, 0)) put(`h${c.cell}`, c.cell, 32, 56, (x, y) => colonyPlate(c, x + 32, y + 57), 3000); }
  D.players.forEach((p, i) => {
    const mine = i === me;
    if (typeof p.ship === 'number') { const s = sp[`cell:${p.ship}`], hit = s?.attack && !mine; put(`s${i}`, p.ship, 32, 54, (x, y) => (hit ? glow(x + 32, y + 52) : mine ? own(x + 32, y + 54, 30) : '') + SVG(x, y - 3, 64, Sprite.ship(i)) + (p.damage ? `<text x="${x + 10}" y="${y + 14}" font-size="17" font-weight="800" fill="#ff6a52" stroke="#1c2a2a" stroke-width="3" paint-order="stroke">−${p.damage}</text>` : '') + (hit ? pill(x + 32, y + 66, pick(ACT.attack)) : '')); if (near(p.ship) && !hit) put(`hs${i}`, p.ship, 32, 54, (x, y) => cargoPlate(i, x + 32, y + 58), 3000); }
    // Infantry is drawn a little smaller than its 64-unit picture, with its feet where they were.
    if (typeof p.inf === 'number') { const c = colonyAt(p.inf), s = sp[`cell:${p.inf}`], hit = s?.attack && !mine && !c; put(`i${i}`, p.inf, c ? 6 : 32, 58, (x, y) => (hit ? glow(x + 32, y + 54) : mine ? own(x + (c ? 6 : 32), y + (c ? 52 : 57), c ? 14 : 16) : '') + SVG(x + (c ? -18 : 5), y + 9, c ? 48 : 54, Sprite.infantry(i)) + (hit ? pill(x + 32, y + 68, pick(ACT.attack)) : ''), 2); }
  });
  muster();
  const men = new Map<number, number>(), last = ARMY.plan[ARMY.shown - 1];
  for (const l of ARMY.plan.slice(0, ARMY.shown)) { if (l.ship) put(`R${l.siege}`, l.cell, 32, 54, (x, y) => SVG(x, y - 3, 64, REFSHIP), 5); else men.set(l.cell, (men.get(l.cell) ?? 0) + 1); }
  for (const [c, n] of men) put(`r${c}`, c, 32, 60, (x, y) => squad(n, x, y, !!ARMY.timer && last?.cell === c && !last.ship), 1);
  }
  if (lift) for (const [id, s] of Object.entries(sp)) {
    const c = +id.slice(5);
    if (s.gather) { const best = s.gather, dy = tokenAt(c) || colonyAt(c) ? 14 : 34, w = best.length * 33; put(`g${c}`, c, 32, dy, (x, y) => `<rect x="${x + 32 - w / 2}" y="${y + dy - 13}" width="${w}" height="27" rx="13.500" fill="${S.over === id ? '#fff08a' : '#f7f1e1'}"/>${best.map((b, i) => `<svg x="${x + 36 - w / 2 + i * 33}" y="${y + dy - 9}" width="17" height="17" viewBox="0 0 24 24">${SHAPES[Places.ico(b.icon)]}</svg><text x="${x + 55 - w / 2 + i * 33}" y="${y + dy + 6}" font-size="16" font-weight="800" fill="#1c2a2a">${b.n}</text>`).join('')}`, 2000); }
    else if (s.found) put(`g${c}`, c, 32, 14, (x, y) => pill(x + 32, y + 6, t('act.found')), 2000);
  }
  // Agents stay where they were placed until the round ends.
  const home = Places.homes()[0]?.cell; fid = 0;
  if (home !== undefined) Sim.placed.filter((p) => p.space?.startsWith('lot:') || p.space?.startsWith('build:') || p.space === `cell:${home}`).forEach((p, i) => put(`a${p.card}`, home, 60 + i * 27, 18, (x, y) => face(x + 60 + i * 27, y + 4, p.card, 14), 1000));
  for (const p of Sim.placed) if (p.space?.startsWith('cell:') && p.space !== `cell:${home}`) put(`a${p.card}`, +p.space.slice(5), 50, 60, (x, y) => face(x + 50, y + 50, p.card, 14), 1000);
  return o;
}
/** A thin pale outline, so that a bare pictogram reads on water and on land alike. */
const HALO = '<defs><filter id="halo" x="-30%" y="-30%" width="160%" height="160%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.200" result="d"/><feFlood flood-color="#f7f1e1" flood-opacity=".9"/><feComposite in2="d" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
$('defs').innerHTML = DEFS + HALO;
/** An element on the map and the thing it last showed. */
interface Shown { el: HTMLDivElement; q?: Thing; gone?: number }
const layer = document.querySelector<HTMLElement>('.sprites')!, paths = document.querySelector<SVGSVGElement>('svg.paths')!, above = document.querySelector<SVGSVGElement>('svg.paths.top')!, sprites = new Map<string, Shown>();
/** Keeps the elements in step with the game. Only what changed is drawn again. */
function draw(fade = false) {
  resize();
  // A new map: nothing stands on it until its terrain is painted (see `land`).
  if (`${Sim.s.seed} ${W}` !== painted) bare(true);
  const now = new Set<string>();
  for (const q of things(Places.spaces(S.card))) {
    now.add(q.id);
    let e = sprites.get(q.id);
    if (!e) { e = { el: document.createElement('div') }; e.el.className = fade ? 'sp in' : 'sp'; e.el.dataset.thing = q.id.replace('~', ''); layer.append(e.el); sprites.set(q.id, e); }
    else if (e.gone) { clearTimeout(e.gone); e.gone = undefined; e.el.classList.remove('out'); }
    const was = e.q;
    if (was?.html !== q.html || was.x !== q.x || was.y !== q.y) e.el.innerHTML = `<svg viewBox="${q.x - 50} ${q.y - 66} 100 100" width="200" height="200">${q.html}</svg>`;
    if (was?.z !== q.z) e.el.style.zIndex = String(q.z);
    if (was?.hit !== q.hit) e.el.style.pointerEvents = q.hit ? 'auto' : 'none';
    e.q = q;
  }
  // Between the overview and the pictures, what leaves fades out (still following the map) while what comes fades in.
  for (const [id, e] of sprites) if (!now.has(id) && !e.gone) { if (fade) { e.el.classList.add('out'); e.gone = window.setTimeout(() => { e.el.remove(); sprites.delete(id); }, 400); } else { e.el.remove(); sprites.delete(id); } }
  place();
}
/** Puts every element where its point of the map is on the screen now. */
function place() {
  if (!cam) return;
  // Zoomed far out or back in: everything is drawn again, as signs or as pictures.
  const f = cam.get()[2] < whole() * FAR;
  if (f !== far) { far = f; document.querySelector('.map-stage')!.classList.toggle('far', far); draw(true); return; }
  haze();
  for (const { el, q } of sprites.values()) if (q) { const [x, y, s] = cam.point(q.x, q.y); el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(s / 2).toFixed(4)})`; }
  reach(); bubble();
}
/** Decisions answered by clicking a cell of the map. */
export const PICK = new Set(['startCell', 'freeColony', 'colonyWater', 'refuge']);
/* Where the ship (white, on water) and the infantry (warm, on land) can go, and the closed land to explore. */
function reach() {
  const mv = D.pending?.kind === 'move' && !Sim.busy ? B.moving() : null;
  // A decision that is answered by a cell on the map (where the ship starts, a free colony, a refuge): its cells are marked.
  const pick = PICK.has(Sim.kind() ?? '') ? new Set(Sim.legal().map((c) => c.cell).filter((c): c is number => typeof c === 'number')) : null;
  if (!S.card && !mv && !pick) { if (paths.innerHTML) paths.innerHTML = ''; if (above.innerHTML) above.innerHTML = ''; return; }
  const sp = S.card ? Places.spaces(S.card) : {}, pt = (x: number, y: number) => B.stage.point(x, y).slice(0, 2).map((v) => v.toFixed(1)).join(' '), quad = (c: number, q = 0) => { const [x, y] = at(c); return `M${pt(x + q, y + q)}L${pt(x + 64 - q, y + q)}L${pt(x + 64 - q, y + 64 - q)}L${pt(x + q, y + 64 - q)}Z`; };
  const sea = new Set<number>(), foot = new Set<number>(), closed = new Set<number>();
  if (pick) for (const c of pick) sea.add(c);
  else if (mv) { for (const [c, n] of mv.ways) (n.foot ? foot : sea).add(c); for (const f of mv.frags) D.frag.forEach((x, c) => { if (x === f) closed.add(c); }); }
  else for (const [id, s] of Object.entries(sp)) if (id.startsWith('cell:')) { if (s.foot) foot.add(+id.slice(5)); else if (s.sea) sea.add(+id.slice(5)); }
  const area = (set: Set<number>, cls: string) => { if (!set.size) return ''; let d = ''; const line = (a: number, b: number, c: number, e: number) => `M${pt(a, b)}L${pt(c, e)}`; for (const c of set) { const [x, y] = at(c); if (!set.has(c - W)) d += line(x, y, x + 64, y); if (!set.has(c + W)) d += line(x, y + 64, x + 64, y + 64); if (c % W === 0 || !set.has(c - 1)) d += line(x, y, x, y + 64); if (c % W === W - 1 || !set.has(c + 1)) d += line(x + 64, y, x + 64, y + 64); } return `<path class="${cls} area" d="${[...set].map((c) => quad(c)).join('')}"/><path class="${cls} rim" d="${d}"/>`; };
  // The cell under the pointer: the way there, or the closed land it would explore.
  const over = S.over ?? '', h = over.startsWith('cell:') ? +over.slice(5) : null, way = h === null ? undefined : mv?.ways.get(h);
  const o: Partial<Opt>[] | null | undefined = h === null ? null : pick ? (pick.has(h) ? [{}] : null) : mv ? (way ? [{ path: way.path }] : closed.has(h) ? [{}] : null) : sp[over]?.options;
  const go = o?.find((q) => q.path?.length), inf = typeof P.inf === 'number' ? P.inf : P.ship, from = mv ? (mv.move.token === 'ship' ? P.ship : inf) : go?.a === 'moveInfantry' ? inf : P.ship;
  const sites = mv ? [...mv.ways].filter(([c, n]) => n.foot && !map.colonyProblem(Sim.s, c)).map(([c]) => c) : Object.entries(sp).filter(([id, s]) => id.startsWith('cell:') && s.site).map(([id]) => +id.slice(5)), flag = (c: number) => { const [x, y] = at(c), [a, b2] = B.stage.point(x + 50, y + 16); return `<g transform="translate(${a.toFixed(1)} ${b2.toFixed(1)})"><path d="M0 12V-9" stroke="#3a2614" stroke-width="2"/><path d="M1-9h11l-3 4 3 4H1Z" fill="#fff08a" stroke="#3a2614" stroke-width="1.200"/></g>`; };
  // The closed land to explore, and the pointer over it, are marked over the clouds.
  const hit = o?.length && h !== null ? `<path d="${quad(h, 3)}" fill="#fff08a" fill-opacity=".4" stroke="#fff" stroke-width="3.500" stroke-linejoin="round"/>` : '', up = h !== null && !D.open[h];
  above.innerHTML = area(closed, 'closed') + (up ? hit : '');
  paths.innerHTML = area(sea, 'sea') + area(foot, 'foot') + (up ? '' : hit) + sites.map(flag).join('') + (go?.path ? `<polyline points="${[from, ...go.path].map((c: number) => { const [x, y] = at(c); return pt(x + 32, y + 32); }).join(',')}" class="way"/>` : '') + (mv ? cost(way, true) : go ? cost(Places.wayOf(go as Opt), false) : '');
}
/* What the way costs: each step's points on the cell it enters; on a move, also the points spent of those there were at its end (an agent in hand says it in the bubble by the pointer). */
function cost(w: Way | undefined, total: boolean) {
  if (!w?.path.length) return '';
  const spot = (c: number, dy: number) => { const [x, y] = at(c), [a, b] = B.stage.point(x + 32, y + 32 + dy); return `translate(${a.toFixed(1)} ${b.toFixed(1)})`; }, spent = w.costs.reduce((n, k) => n + k, 0);
  return w.path.map((c, i) => `<g class="pace" transform="${spot(c, 0)}"><circle r="10"/><text y="4.500">${w.costs[i]}</text></g>`).join('') + (total ? `<g class="spent" transform="${spot(w.c, -26)}"><rect x="-21" y="-12" width="42" height="24" rx="12"/><text y="5">${spent}/${spent + w.left}</text></g>` : '');
}
/* Bonus resources lie on the ground: painted once into their own layer of the map. */
let grounded = '';
function ground() {
  resize();
  const key = D.open.map((x, c) => (x && D.bonus[c] ? `${c}${colonyAt(c) || settlementAt(c) ? 'x' : ''}` : '')).join(''); if (grounded === key) return; grounded = key;
  const img = new Image(), c = document.querySelector<HTMLCanvasElement>('canvas.ground')!;
  img.onload = () => { c.width = c.height = SIZE() * 2; c.getContext('2d')!.drawImage(img, 0, 0); URL.revokeObjectURL(img.src); };
  img.src = URL.createObjectURL(new Blob([Bonus.picture(D, at, SIZE())], { type: 'image/svg+xml' }));
}
/* The outer ring of cells is Europe: fine hatching that fades into the open sea, with a thin line on the inner side. Painted once. */
let edged = '';
async function edge() {
  resize();
  const key = `${lang()} ${B.grid} ${W}`; if (edged === key) return; edged = key;
  await document.fonts.load('700 24px "Alegreya SC"', t('europe'));
  const c = document.querySelector<HTMLCanvasElement>('canvas.edge')!, k = 2, S = SIZE(); c.width = c.height = S * k;
  const g = c.getContext('2d')!, h = document.createElement('canvas'), q = h.getContext('2d')!; g.scale(k, k); h.width = 8; h.height = 13 * k;
  q.fillStyle = '#f6e2ae'; q.fillRect(0, 5.8 * k, 8, 1.35 * k);
  const p = g.createPattern(h, 'repeat')!; p.setTransform(new DOMMatrix().rotate(38).scale(1 / k));
  const ring = (a: number, r: number, w: number, style: string | CanvasPattern, alpha: number) => { g.globalAlpha = alpha; g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.roundRect(a, a, S - a * 2, S - a * 2, r); g.stroke(); };
  if (B.grid) { g.globalAlpha = 0.2; g.strokeStyle = '#fff'; g.beginPath(); for (let i = 64; i < S; i += 64) { g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); } g.stroke(); }
  for (let i = 0; i < 30; i++) { const a = 62 - i * 2, m = (1 - i / 30) ** 0.9; ring(a, 29 + i, 2.1, p, 0.46 * m); ring(a, 29 + i, 2.1, '#bfe3ea', 0.06 * m); }
  ring(64, 28, 1.7, '#f6dfa4', 0.72);
  g.globalAlpha = 0.72; g.font = '700 24px "Alegreya SC"'; g.letterSpacing = '6px'; g.textAlign = 'center'; g.fillStyle = '#fbeecb'; g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = '#124468';
  const word = (x: number, y: number, a: number) => { g.save(); g.translate(x, y); g.rotate(a); g.strokeText(t('europe'), 0, 0); g.fillText(t('europe'), 0, 0); g.restore(); };
  word(S / 2, S - 21, 0); word(40, S / 2, -Math.PI / 2); word(S - 40, S / 2, Math.PI / 2);
  // With the grid, the names of columns (letters) and rows (numbers) on all four sides, in the outer part of Europe's ring, as cells are named elsewhere:
  // the ring is counted too, as the ship stands on its cells, so its top left corner is A1.
  if (B.grid) {
    // Quiet: small and faint, to be found when looked for, not to draw the eye.
    g.globalAlpha = 0.45; g.font = '700 14px "Alegreya SC"'; g.letterSpacing = '0px'; g.textBaseline = 'middle';
    for (let i = 0; i < W; i++) {
      const a = column(i), n = String(i + 1), m = (i + 0.5) * 64;
      g.fillText(a, m, 11); g.fillText(a, m, S - 11); g.fillText(n, 11, m); g.fillText(n, S - 11, m);
    }
  }
}
/** The box about the clicked cell follows it on the screen. */
function bubble() { const c = S.look; if ($('look').hidden || c === null) return; const [x, y] = B.stage.point(((c % W) + 0.5) * 64, (Math.floor(c / W) + 0.1) * 64); $('look').style.left = `${Math.min(innerWidth - 130, Math.max(130, x))}px`; $('look').style.top = `${Math.max(200, y)}px`; }
/** The open sea around the map, a wide square centred on it. */
const SEA = 4608;
function sea() {
  const c = document.querySelector<HTMLCanvasElement>('canvas.sea')!, o = `${-(SEA - SIZE()) / 2}px`;
  c.style.left = c.style.top = o;
  void drawSea(c, SEA, 2 / 3).then((bg) => { document.querySelector<HTMLElement>('.map-stage')!.style.background = bg; });
}
/** Fit the board to the width of the game now loaded: the plane, the sea around it, and the pictures drawn for its size. Cheap when nothing changed. */
function resize(first = false) {
  if (!syncWidth() && !first) return;
  for (const p of document.querySelectorAll<HTMLElement>('.map-inner,.map-over')) p.style.width = p.style.height = `${SIZE()}px`;
  sea();
  // Drawn again for the new size the next time they are asked for.
  if (!first) { grounded = '!'; edged = ''; }
}
resize(true);
/* The land is painted at full quality in one go: never a rough picture first. It holds the page for about a second on a new map (measured: 0.8–1.2 s, 1.7 s on Retina), which is the fastest way to the finished map. */
const SHARP = devicePixelRatio > 1 ? 2.2 : 1.6, plan = (k: number) => ({ K: k, tall: up(), seen: D.open.map((x) => (x ? 1 : 0)).join('') });
let drawing: Promise<unknown> = Promise.resolve(), drawn = '', shown: string | null = null;
/** The map whose terrain is painted (seed and width). Until a new map's terrain is fully painted, what stands on it is hidden, then fades in. */
let painted = '', hidden = false;
/** The loading screen (in index.html): it shows while a whole picture of the map is painted, since that holds the page for a moment. */
function loading(on: boolean) {
  // Only faded in and out, never removed, so that its swing keeps running on its own (see index.html).
  $('loading').classList.toggle('done', !on);
  if (!on) document.body.classList.remove('loading');
}
/** A new map: what stands on it waits, hidden, until its terrain is painted. */
const bare = (on: boolean) => { hidden = on; document.querySelector('.map-stage')!.classList.toggle('bare', on); if (on) loading(true); };
/** The whole picture being painted now, and when it is done: whoever asks for the same one again waits for it. */
let painting = '', painted$: Promise<void> = Promise.resolve();
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
/** Paint the land as the game now is. The whole map is painted once, explored or not, under the clouds: exploring (or closing again by Undo or a replay)
 * only redraws the clouds, at once. A new map, other trees, or `whole` paints the land again, in one go, behind the loading screen. */
async function land(whole = false) {
  resize();
  const map = `${Sim.s.seed} ${W}`;
  if (map !== painted) { painted = map; whole = true; bare(true); }
  const now = plan(SHARP), pic = `${map} ${now.tall}`;
  if (drawn === pic && !whole) { if (shown !== now.seen && !hidden) { shown = now.seen; clouds(); draw(); if (S.view === 'colony') paint(); } return; }
  drawn = pic;
  const key = pic;
  if (painting === key) return painted$; // already on its way
  painting = key;
  let done = () => {};
  painted$ = new Promise<void>((r) => { done = r; });
  await drawing;
  // A whole new picture holds the page for about a second: the loading screen shows first, unless the picture is at hand.
  if (drawn === pic && !isKept(now.K, pic)) { loading(true); await frame(); }
  if (drawn !== pic) { if (painting === key) painting = ''; done(); return; } // something newer is waiting
  if (S.view === 'colony') paint();
  const { terrain: t, poi } = Sim.s.map;
  drawing = drawRich(terrain, { ...now, seen: pic, truth: { terrain: t, poi } }); await drawing; shown = plan(SHARP).seen; clouds(); draw();
  if (painting === key) painting = '';
  if (drawn === pic) { bare(false); loading(false); }
  done();
  if (S.view === 'colony') paint();
}
/** Clouds over the closed cells, a little sharper than the land: drawn again only when what is open changes, and then only around the cells that changed. */
let clouded = '';
function clouds() {
  const now = shown ?? '', was = clouded; if (was === now) return; clouded = now;
  const changed = was.length === now.length ? [...now].map((v, c) => (v !== was[c] ? c : -1)).filter((c) => c >= 0) : [];
  const xs = changed.map((c) => c % W), ys = changed.map((c) => Math.floor(c / W));
  // Clouds thin out over less than a cell around the unknown.
  const box: [number, number, number, number] | null = changed.length ? [(Math.min(...xs) - 1) * 64, (Math.min(...ys) - 1) * 64, (Math.max(...xs) + 2) * 64, (Math.max(...ys) + 2) * 64] : null;
  drawClouds(document.querySelector<HTMLCanvasElement>('canvas.clouds')!, devicePixelRatio > 1 ? 2.6 : 2, box);
}
/** The token on the move: where it can still go, the closed fragments it could explore, and the legal choices; kept for the move and the length of the log. */
interface Moving { move: Move; n: number; ways: Map<number, Way>; frags: number[]; legal: Opt[] }
let moved: Moving | null = null, cam: Stage | null = null;
const B = {
  ground, view, VIEW, look,
  /** Lean as far as this while the tilt follows the zoom, whatever the person chose; null gives their choice back. */
  lean(x: number | null) { lean = x; if (cam) look(); }, draw, edge, land, bubble, terrain,
  /** The cell grid, with the names of columns and rows. */
  get grid() { return Options.grid; }, set grid(v: boolean) { Options.grid = v; keepOptions(); },
  /** Pan, zoom and tilt of the map, once it is open. */
  get stage(): Stage { if (!cam) throw new Error('the map is not open yet'); return cam; },
  /** Where the token on the move can still go, and what it could uncover. Only asked during a move, which always has its token and points. */
  moving(): Moving { const move = D.move!; if (moved?.move === move && moved.n === Sim.s.log.length) return moved; const l: Opt[] = Sim.legal(); moved = { move, n: Sim.s.log.length, ways: Places.ways(move.token, move.points), frags: l.filter((c) => c.c === 'explore').map((c): number => c.frag), legal: l }; return moved; },
  fit() { resize(); const a = view.auto ? 0 : view.tilt, S = SIZE(); B.stage.frame(0, 0, S, S, [70 - a, 0, 150 - a * 3, 0]); },
  /** The whole inner map between the top line and the hand. */
  home() { resize(); const z = Math.max(0.05, Math.min(innerWidth / 900, (innerHeight - 200) / 715)), m = SIZE() / 2; B.stage.frame(m - innerWidth / 2 / z, m - innerHeight / 2 / z, m + innerWidth / 2 / z, m + innerHeight / 2 / z); const [x, , k] = B.stage.get(); B.stage.set([x, innerHeight / 2 - (m + 8) * k - 4, k]); },
  open(onCell: (c: number) => void) { cam = stage(document.querySelector<HTMLElement>('.map-stage')!, { onMove: place, onCell, min: whole, max: 2.8, zoom: 1, center: 0 }); look(); B.home(); addEventListener('resize', look); },
};
export { B as Board };
