/* The opening film of a new game, drawn and animated in code at 16:9: the Old World harbour, the royal charter, the chart of the crossing,
 * the storm, landfall, the first colony, and the nation's card. The ships, villages and colonies are the game's own drawings, in the player's colours.
 * Each shot is a stack of layers: still ones are drawn once, moving ones every frame. Enter, Esc, Space or the Skip button end it; a click moves on. */
import { $, D, L, pick } from '../data.ts';
import { Sprite } from '../map/sprites.ts';
import { Places } from '../places.ts';

const W = 1920, H = 1080;
type Layer = string | ((t: number, k: number) => string);
/** A shot: its length, its words, its layers back to front, and the camera (a transform of the whole picture) at time `t`. */
interface Shot { s: number; line: [string, string]; layers: Layer[]; camera?: (t: number, k: number) => string; flip?: boolean }

/* ---------- tools ---------- */
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (k: number) => Math.max(0, Math.min(1, k));
const ease = (k: number) => { k = clamp(k); return k * k * (3 - 2 * k); };
const f1 = (n: number) => n.toFixed(1);
const grad = (id: string, stops: [number, string, number?][], v = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${v ? 0 : 1}" y2="${v ? 1 : 0}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('')}</linearGradient>`;
const radial = (id: string, stops: [number, string, number?][], r = 0.5) => `<radialGradient id="${id}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('')}</radialGradient>`;
/** The surface of the sea at height y: three swells added up, filled down to the bottom, with foam along the crests if asked. */
function sea(y: number, amp: number, len: number, t: number, speed: number, fill: string, foam = '', x0 = -60, x1 = W + 60) {
  let d = ''; const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += 14) pts.push([x, y + Math.sin(x / len + t * speed) * amp + Math.sin(x / (len * 0.37) - t * speed * 1.4) * amp * 0.35 + Math.sin(x / (len * 2.3) + t * speed * 0.4) * amp * 0.5]);
  d = `M${x0} ${H + 20}` + pts.map(([x, yy]) => `L${x} ${f1(yy)}`).join('') + `L${x1} ${H + 20}Z`;
  // Foam is only for the storm: a soft unbroken edge along the crests.
  const crest = foam ? `<path d="${pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x} ${f1(yy)}`).join('')}" stroke="${foam}" stroke-width="${Math.max(2, amp * 0.22)}" fill="none" stroke-linejoin="round" opacity=".35"/>` : '';
  return `<path d="${d}" fill="${fill}"/>${crest}`;
}
/** Sunlight on the water: a column of short bright strokes under the sun that shimmer. */
const glitter = (cx: number, y0: number, y1: number, t: number, color: string, n = 60) => Array.from({ length: n }, (_, i) => {
  const k = (i * 0.618) % 1, y = lerp(y0, y1, k), spread = lerp(20, 260, k), x = cx + Math.sin(i * 12.9898) * spread, o = Math.max(0, Math.sin(t * 3 + i * 2.3));
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(8 + k * 40)}" height="${f1(1.5 + k * 2.5)}" rx="1.500" fill="${color}" opacity="${(o * (1 - k * 0.4)).toFixed(2)}"/>`;
}).join('');
/** God rays: soft wedges of light from a point, turning very slowly. */
const rays = (cx: number, cy: number, t: number, color: string, o = 0.16) => `<g opacity="${o}">${Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI - Math.PI + Math.sin(t * 0.2 + i) * 0.05, b = a + 0.06 + (i % 3) * 0.03, r = 1700; return `<path d="M${cx} ${cy}L${f1(cx + Math.cos(a) * r)} ${f1(cy + Math.sin(a) * r)}L${f1(cx + Math.cos(b) * r)} ${f1(cy + Math.sin(b) * r)}Z" fill="${color}"/>`; }).join('')}</g>`;
/** A cloud with a light top and a shaded belly. */
const cloud = (x: number, y: number, s: number, light: string, shade: string, o = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${o}"><g fill="${shade}"><ellipse cx="0" cy="14" rx="120" ry="26"/><ellipse cx="-70" cy="18" rx="70" ry="20"/><ellipse cx="80" cy="16" rx="80" ry="22"/></g><g fill="${light}"><ellipse cx="-50" cy="0" rx="70" ry="30"/><ellipse cx="30" cy="-12" rx="80" ry="40"/><ellipse cx="95" cy="4" rx="60" ry="26"/><ellipse cx="-10" cy="8" rx="110" ry="24"/></g></g>`;
const drift = (t: number, n: number, y: number, speed: number, light: string, shade: string, o = 1, s0 = 1) => Array.from({ length: n }, (_, i) => cloud(((((i * 610 + 140) - t * speed * (1 + i * 0.3)) % (W + 600)) + W + 600) % (W + 600) - 300, y + (i % 3) * 60, s0 * (0.8 + (i % 4) * 0.25), light, shade, o)).join('');
const gull = (x: number, y: number, t: number, s = 1, c = '#1c2a2a') => { const f = Math.sin(t * 9 + x) * 6 * s; return `<path d="M${f1(x - 14 * s)} ${f1(y + f)}Q${f1(x - 6 * s)} ${f1(y - 7 * s)} ${f1(x)} ${f1(y)}Q${f1(x + 6 * s)} ${f1(y - 7 * s)} ${f1(x + 14 * s)} ${f1(y + f)}" stroke="${c}" stroke-width="${f1(2.2 * s)}" fill="none" stroke-linecap="round"/>`; };
const flock = (t: number, x0: number, y0: number, n: number, vx: number, s = 1, c = '#1c2a2a') => Array.from({ length: n }, (_, i) => gull(x0 + t * vx + (i % 4) * 46 * s + i * 13, y0 + Math.floor(i / 4) * 26 * s + Math.sin(t + i) * 6, t + i * 0.4, s * (0.8 + (i % 3) * 0.15), c)).join('');
/** Smoke rising from (x, y), puffs swelling and fading. */
const smoke = (x: number, y: number, t: number, c = '#e8e4dc', n = 7, h = 220) => Array.from({ length: n }, (_, j) => { const a = (t * 0.35 + j / n) % 1; return `<circle cx="${f1(x + Math.sin(a * 5 + j) * 10 + a * 40)}" cy="${f1(y - a * h)}" r="${f1(6 + a * 30)}" fill="${c}" opacity="${(0.45 * (1 - a)).toFixed(2)}"/>`; }).join('');
/** One of the game's sprites (64-unit box, feet at the bottom) with its foot at (x, y), `s` times its size, tilted by `r` degrees. */
const sprite = (body: string, x: number, y: number, s: number, r = 0, west = false) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${r.toFixed(2)}) scale(${west ? -s : s} ${s}) translate(-32 -56)">${body}</g>`;
/** A ship of player `p` riding the swell, with a wake behind it when it moves. */
const ship = (x: number, y: number, s: number, t: number, roll = 2.5, p = 0, wake = 0, west = false) => {
  const by = y + Math.sin(t * 1.7) * 4 * (s / 5), w = wake ? `<path d="M${f1(x - 20 * s)} ${f1(by - 2)}q${f1(-60 * s * wake)} ${f1(10 * s)} ${f1(-150 * s * wake)} ${f1(4 * s)}M${f1(x - 20 * s)} ${f1(by + 4)}q${f1(-50 * s * wake)} ${f1(18 * s)} ${f1(-130 * s * wake)} ${f1(22 * s)}" stroke="#ffffff" stroke-width="${f1(1.6 * s)}" fill="none" opacity=".55" stroke-linecap="round"/>` : '';
  return w + sprite(Sprite.ship(p), x, by, s, Math.sin(t * 1.2) * roll, west);
};
/** A slow push in towards a point, as a transform of the whole picture. */
const push = (z0: number, z1: number, cx = W / 2, cy = H / 2, dx = 0) => (_: number, k: number) => { const z = lerp(z0, z1, ease(k)); return `translate(${f1(cx + dx * k)} ${f1(cy)}) scale(${z.toFixed(4)}) translate(${-cx} ${-cy})`; };

/* ---------- the Old World harbour ---------- */
function harbour(): Shot {
  seed = 7; let city = '', windows = ''; const mills: [number, number, number][] = [], chimneys: [number, number][] = [];
  for (let x = -30; x < W * 0.66;) {
    const w = 40 + rnd() * 56, hh = 80 + rnd() * 120, base = 640, c = ['#3a4a5e', '#43546b', '#36475c', '#4b5b70'][Math.floor(rnd() * 4)];
    const steps = rnd() < 0.35;
    city += steps ? `<path d="M${f1(x)} ${base}V${f1(base - hh)}h${f1(w * 0.15)}v-12h${f1(w * 0.15)}v-12h${f1(w * 0.4)}v12h${f1(w * 0.15)}v12h${f1(w * 0.15)}V${base}Z" fill="${c}"/>`
      : `<path d="M${f1(x)} ${base}V${f1(base - hh)}l${f1(w / 2)} ${f1(-w * 0.6)}l${f1(w / 2)} ${f1(w * 0.6)}V${base}Z" fill="${c}"/>`;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) if (rnd() < 0.5) windows += `<rect x="${f1(x + 7 + k * (w / 3.2))}" y="${f1(base - hh + 16 + r * 34)}" width="7" height="11" rx="1" fill="#ffd98a" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`;
    if (rnd() < 0.3) chimneys.push([x + w * 0.7, base - hh - 10]);
    if (rnd() < 0.08) mills.push([x + w / 2, base - hh - 14, 0.9 + rnd() * 0.4]);
    x += w + rnd() * 4;
  }
  const cathedral = '<path d="M520 640V420l40-60 40 60v220Z" fill="#33435a"/><path d="M548 360V250l12-60 12 60v110Z" fill="#33435a"/><circle cx="560" cy="470" r="18" fill="#ffd98a" opacity=".5"/>';
  const hills = '<path d="M-40 560Q260 470 560 540T1220 520T1960 560V660H-40Z" fill="#7e6f8a" opacity=".55"/>';
  const quay = `<path d="M-40 640H1290l40 26H-40Z" fill="#2a3442"/><path d="M-40 662H1330v18H-40Z" fill="#1e2632"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${60 + i * 130}" y="${616 - (i % 3) * 8}" width="${26 + (i % 2) * 10}" height="${24 + (i % 3) * 8}" fill="#6b4a2c" stroke="#3d2814" stroke-width="2"/>`).join('')}`;
  const mill = (x: number, y: number, s: number, t: number) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(2)})"><path d="M-14 50l5-60h18l5 60Z" fill="#2f3b4d"/><g transform="rotate(${f1((t * 50) % 360)} 0 -10)" fill="#2f3b4d">${[0, 90, 180, 270].map((a) => `<path d="M-3 -10v-62h6v62Z M3 -66h12v44H3Z" transform="rotate(${a} 0 -10)"/>`).join('')}</g></g>`;
  const crane = (t: number) => { const drop = 40 + (Math.sin(t * 0.9) + 1) * 60; return `<path d="M1180 640V420M1180 430L1290 400M1180 470L1290 400" stroke="#2a3442" stroke-width="8" fill="none"/><path d="M1270 404v${f1(drop)}" stroke="#2a3442" stroke-width="2.500"/><rect x="1252" y="${f1(404 + drop)}" width="36" height="26" fill="#7a5532" stroke="#3d2814" stroke-width="2"/>`; };
  const sun = (k: number) => lerp(700, 470, ease(k));
  return {
    flip: true, s: 7.5, line: ['1620. In the ports of the Old World, ships are loaded for a new one.', '1620 год. В портах Старого Света грузят корабли для Нового.'],
    camera: push(1.04, 1.12, W * 0.4, H * 0.55, 40),
    layers: [
      `<defs>${grad('h-sky', [[0, '#1f2c52'], [0.38, '#7a5a86'], [0.62, '#e48a6a'], [0.8, '#f7c487'], [1, '#f9d79a']])}${radial('h-sun', [[0, '#fff6dc'], [0.25, '#ffd98a', 0.9], [1, '#ff9e57', 0]])}${grad('h-sea', [[0, '#6a7fa0'], [0.4, '#3d5f82'], [1, '#1f3b58']])}</defs><rect width="${W}" height="${H}" fill="url(#h-sky)"/>`,
      (t, k) => `${rays(1380, sun(k), t, '#ffe4a8', 0.13)}<circle cx="1380" cy="${f1(sun(k))}" r="300" fill="url(#h-sun)"/><circle cx="1380" cy="${f1(sun(k))}" r="58" fill="#fff3d4"/>${drift(t, 5, 130, 10, '#f9d2b6', '#c98a8a', 0.7, 0.9)}`,
      hills, cathedral + city + windows,
      (t) => `${mills.map(([x, y, s]) => mill(x, y, s, t)).join('')}${chimneys.map(([x, y]) => smoke(x, y, t, '#d9cfd6', 5, 140)).join('')}${crane(t)}`,
      quay,
      (t, k) => `${sea(700, 4, 70, t, 1.1, 'url(#h-sea)')}${glitter(1380, 700, 1010, t, '#ffe7b0')}
${ship(240, 760, 3.4, t + 1, 1.2, 1)}${ship(560, 770, 3.6, t + 2.3, 1.2, Math.min(2, D.players.length - 1))}${ship(860, 775, 3.2, t + 3.1, 1.2, Math.min(3, D.players.length - 1))}
${ship(lerp(1050, 1640, ease((k - 0.15) * 1.3)), 870, 6.2, t, 2, 0, ease((k - 0.15) * 1.3))}${sea(860, 7, 90, t, 1.5, '#2a4a6a')}${flock(t, 1100, 300, 6, 30, 1.2)}`,
    ],
  };
}

/* ---------- the royal charter ---------- */
function charter(): Shot {
  seed = 41; const lines = Array.from({ length: 9 }, (_, i) => { let d = ''; const y = 380 + i * 52, x0 = 640 + (i === 0 ? 120 : 0), x1 = i === 8 ? 1040 : 1290; for (let x = x0; x < x1; x += 22) { const w = 10 + rnd() * 14; d += `M${x} ${f1(y + rnd() * 3)}q${f1(w / 2)} ${f1(-6 - rnd() * 6)} ${f1(w)} 0`; } return { d, len: x1 - x0, x0, y }; });
  const color = D.players[0].color, emblem = `<image href="art/emblem/${D.players[0].nation}.svg" x="-34" y="-34" width="68" height="68"/>`;
  return {
    s: 7.5, line: ['The Crown grants you a charter: land across the ocean, and a share for the King.', 'Корона жалует вам грамоту: земли за океаном — и долю для короля.'],
    camera: push(1, 1.08, W / 2, H * 0.48),
    layers: [
      `<defs>${radial('c-desk', [[0, '#5a3a24'], [1, '#1e120b']])}${grad('c-paper', [[0, '#f5e9cc'], [0.5, '#efdcb3'], [1, '#e2c995']])}${radial('c-burn', [[0.55, '#7a4a1e', 0], [0.85, '#7a4a1e', 0.1], [1, '#6a3a14', 0.3]], 0.72)}${radial('c-glow', [[0, '#ffc870', 0.5], [0.4, '#ff9a40', 0.14], [1, '#ff9a40', 0]])}</defs><rect width="${W}" height="${H}" fill="url(#c-desk)"/>
<g opacity=".25">${Array.from({ length: 14 }, (_, i) => `<path d="M0 ${i * 80 + 20}Q960 ${i * 80 - 10} 1920 ${i * 80 + 30}" stroke="#2a1a0e" stroke-width="3" fill="none"/>`).join('')}</g>
<g transform="translate(300 760) rotate(-18)"><rect x="0" y="0" width="260" height="22" rx="4" fill="#d9c49a"/><path d="M250 2l60 9-60 9Z" fill="#3a2a1a"/></g><ellipse cx="1600" cy="820" rx="70" ry="22" fill="#000" opacity=".35"/><path d="M1560 740q40-30 80 0v70q-40 20-80 0Z" fill="#2c3a4a"/><ellipse cx="1600" cy="742" rx="40" ry="12" fill="#121a22"/>`,
      (t) => { const fl = 1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 31) * 0.03; return `<circle cx="300" cy="400" r="${f1(620 * fl)}" fill="url(#c-glow)"/><ellipse cx="300" cy="640" rx="70" ry="18" fill="#000" opacity=".4"/><path d="M240 640h120l-14-18h-92Z" fill="#8a6a3a"/><rect x="282" y="470" width="36" height="152" rx="4" fill="#efe4c8"/><path d="M282 478q8 10 6 30" stroke="#d8ccae" stroke-width="5" fill="none"/><path d="M300 470v-12" stroke="#2a1a0e" stroke-width="3"/><path d="M300 ${f1(400 - 8 * fl)}c${f1(-14 * fl)} 26-14 46 0 56c14-10 14-30 0-56Z" fill="#ffd27a"/><path d="M300 ${f1(426 - 4 * fl)}c-6 12-6 22 0 28c6-6 6-16 0-28Z" fill="#fff6d8"/>`; },
      (t, k) => {
        const open = ease(k * 2.2), h = lerp(40, 640, open), y = 540 - h / 2;
        const write = clamp((k - 0.27) / 0.4), seal = ease((k - 0.7) / 0.08);
        const ink = lines.map((l, i) => { const show = clamp(write * 9 - i); return show > 0 && open > 0.95 ? `<path d="${l.d}" stroke="#3a2614" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-dasharray="2000" stroke-dashoffset="${f1(2000 - show * l.len * 1.4)}" opacity=".85"/>` : ''; }).join('');
        // The quill follows the line being written, its tip at the end of the ink.
        const li = Math.min(8, Math.floor(write * 9)), l = lines[li], qx = l.x0 + clamp(write * 9 - li) * l.len, qy = l.y + Math.sin(t * 22) * 3;
        const quill = open > 0.95 && write > 0 && write < 1 ? `<g transform="translate(${f1(qx)} ${f1(qy)}) rotate(18)"><path d="M0 0l6-26 4 0Z" fill="#2a1a0e"/><path d="M6 -24C-10 -90 10 -170 58 -230C46 -160 40 -90 12 -24Z" fill="#f3ede0" stroke="#b8ab92" stroke-width="2"/><path d="M8 -26L50 -214" stroke="#b8ab92" stroke-width="2"/></g>` : '';
        return `<rect x="560" y="${f1(y + 8)}" width="800" height="${f1(h)}" fill="#000" opacity=".4" transform="translate(14 14)"/><rect x="560" y="${f1(y)}" width="800" height="${f1(h)}" fill="url(#c-paper)"/><rect x="560" y="${f1(y)}" width="800" height="${f1(h)}" fill="url(#c-burn)"/>
<rect x="540" y="${f1(y - 26)}" width="840" height="40" rx="20" fill="#e6d2a6" stroke="#b89a62" stroke-width="2"/><rect x="540" y="${f1(y + h - 14)}" width="840" height="40" rx="20" fill="#e6d2a6" stroke="#b89a62" stroke-width="2"/>
${open > 0.95 ? `<text x="960" y="345" text-anchor="middle" font-family="Cormorant SC, serif" font-size="46" font-weight="700" fill="#4a2e14" opacity="${f1(clamp(k * 4 - 1.2))}">${pick(['Royal Charter', 'Королевская грамота'])}</text>${ink}` : ''}
${quill}${seal > 0 ? `<g transform="translate(1210 790) scale(${f1(lerp(2.2, 1, seal))}) rotate(${f1(lerp(-25, -8, seal))})" opacity="${f1(clamp(seal * 2))}"><path d="M-58 0c0-40 30-64 58-60 40-6 66 26 60 60 4 40-30 64-60 58-36 6-62-24-58-58Z" fill="${color}"/><circle r="46" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>${emblem}<path d="M-20 54l-14 50 22-16 12 22 6-52Z" fill="${color}" opacity=".9"/></g>` : ''}`;
      },
    ],
  };
}

/* ---------- the chart of the crossing ---------- */
function chart(): Shot {
  seed = 99;
  const coastline = (x0: number, dir: number) => { let d = `M${x0} 120`; for (let y = 120; y <= 960; y += 30) d += `L${f1(x0 + dir * (Math.sin(y / 90) * 40 + Math.sin(y / 33) * 14 + rnd() * 12))} ${y}`; return d; };
  const west = coastline(470, 1), east = coastline(1470, -1);
  const route = Array.from({ length: 40 }, (_, i) => { const k = i / 39; return [lerp(1420, 520, k), 560 + Math.sin(k * Math.PI) * -120 + Math.sin(k * 9) * 10] as [number, number]; });
  const rose = (x: number, y: number, r: number) => `<g transform="translate(${x} ${y})" opacity=".85"><circle r="${r}" fill="none" stroke="#7a5a32" stroke-width="2"/><circle r="${r * 0.8}" fill="none" stroke="#7a5a32" stroke-width="1"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 0L${f1(Math.cos((a * Math.PI) / 180) * (a % 90 ? r * 0.6 : r * 1.05))} ${f1(Math.sin((a * Math.PI) / 180) * (a % 90 ? r * 0.6 : r * 1.05))}" stroke="#7a5a32" stroke-width="${a % 90 ? 2 : 3}"/>`).join('')}<path d="M0 ${-r * 1.05}l12 ${r * 0.4}-12 ${-r * 0.1}-12 ${r * 0.1}Z" fill="#a8442e"/></g>`;
  const lines = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<path d="M960 540L${f1(960 + Math.cos(a) * 1400)} ${f1(540 + Math.sin(a) * 1400)}" stroke="#7a5a32" stroke-width="1" opacity=".35"/>`; }).join('');
  return {
    s: 6.5, line: ['Weeks at sea, westward across the Atlantic.', 'Недели в море — на запад, через Атлантику.'],
    camera: push(1.02, 1.1, W * 0.55, H * 0.5),
    layers: [
      `<defs>${grad('m-paper', [[0, '#ecdcb4'], [1, '#dcc38f']])}${radial('m-age', [[0.55, '#000', 0], [1, '#5a3a14', 0.5]])}</defs><rect width="${W}" height="${H}" fill="url(#m-paper)"/>${lines}
<path d="${west}L-40 960L-40 120Z" fill="#cdb98a" stroke="#7a5a32" stroke-width="3"/><path d="${east}L1960 960L1960 120Z" fill="#cdb98a" stroke="#7a5a32" stroke-width="3"/>
${Array.from({ length: 40 }, (_, i) => `<path d="M${f1(80 + rnd() * 330)} ${f1(160 + rnd() * 760)}l8 -16 8 16Z" fill="#8a7a4e" opacity=".6"/>`).join('')}${Array.from({ length: 30 }, () => `<circle cx="${f1(1520 + rnd() * 360)}" cy="${f1(160 + rnd() * 760)}" r="5" fill="#7a5a32" opacity=".5"/>`).join('')}
${rose(960, 820, 90)}<text x="1700" y="200" text-anchor="middle" font-family="Cormorant SC, serif" font-size="40" font-weight="700" fill="#5a3a14">${pick(['Europe', 'Европа'])}</text><text x="230" y="200" text-anchor="middle" font-family="Cormorant SC, serif" font-size="40" font-weight="700" fill="#5a3a14">${pick(['New World', 'Новый Свет'])}</text>
<text x="960" y="240" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="34" fill="#6a4a24">${pick(['Mare Atlanticum', 'Атлантический океан'])}</text>
<g fill="none" stroke="#5a7a8a" stroke-width="2" opacity=".5">${Array.from({ length: 10 }, (_, i) => `<path d="M${700 + (i % 5) * 120} ${380 + Math.floor(i / 5) * 280}q15 -10 30 0t30 0"/>`).join('')}</g><rect width="${W}" height="${H}" fill="url(#m-age)"/>`,
      (t, k) => {
        const n = Math.max(1, Math.floor(ease(k * 1.15) * (route.length - 1))), [x, y] = route[n];
        return `<path d="${route.slice(0, n + 1).map(([a, b], i) => `${i ? 'L' : 'M'}${f1(a)} ${f1(b)}`).join('')}" stroke="#a8442e" stroke-width="4" stroke-dasharray="12 10" fill="none"/><circle cx="1420" cy="560" r="9" fill="#a8442e"/>${sprite(Sprite.ship(0), x, y + 18, 1.6, Math.sin(t * 2) * 4, true)}`;
      },
    ],
  };
}

/* ---------- the storm ---------- */
function storm(): Shot {
  const flashes = [1.6, 1.75, 3.9, 5.2];
  const lit = (t: number) => flashes.some((f) => t > f && t < f + 0.09);
  return {
    s: 6.5, line: ['Storms test every crossing: ships are lost, and colonists with them.', 'Бури испытывают каждый переход: гибнут корабли, а с ними и колонисты.'],
    camera: (t, k) => { const sh = lit(t) ? 6 : 0; return `translate(${f1(Math.sin(t * 40) * sh)} ${f1(Math.cos(t * 37) * sh)}) ${push(1.06, 1.12, W / 2, H * 0.6)(t, k)}`; },
    layers: [
      `<defs>${grad('s-sky', [[0, '#070d16'], [0.55, '#1b2a3c'], [1, '#2c3e52']])}${grad('s-sea', [[0, '#1d3448'], [1, '#0b1824']])}</defs><rect width="${W}" height="${H}" fill="url(#s-sky)"/>`,
      (t) => `${drift(t, 6, 110, 40, '#1b2533', '#0a1018', 0.95, 2)}${lit(t) ? '<path d="M1380 0l-50 190 36-12-60 210 32-10-54 200" stroke="#eaf4ff" stroke-width="5" fill="none"/><path d="M1380 0l-50 190 36-12-60 210 32-10-54 200" stroke="#9cc6ff" stroke-width="18" fill="none" opacity=".35"/>' : ''}`,
      (t) => `${sea(600, 22, 80, t, 2.6, '#22394e', '#9fb8cc')}${ship(860, 760, 7.2, t * 1.7, 12, 0, 0, true)}${sea(740, 34, 120, t, 3, 'url(#s-sea)', '#c8d8e6')}${sea(880, 28, 100, t + 1, 3.4, '#0b1824', '#d6e4ef')}
<g fill="#dbe8f2" opacity=".55">${Array.from({ length: 30 }, (_, i) => { const a = ((t * 1.5 + i / 30) % 1); return `<circle cx="${f1(400 + i * 40 + Math.sin(i) * 60)}" cy="${f1(760 - a * 160)}" r="${f1(2 + (1 - a) * 3)}" opacity="${f1(1 - a)}"/>`; }).join('')}</g>
<g stroke="#b9cbe0" stroke-width="2" opacity=".4">${Array.from({ length: 90 }, (_, i) => { const x = ((i * 97 + t * 1100) % (W + 300)) - 150, y = ((i * 173 + t * 1700) % (H + 200)) - 150; return `<path d="M${f1(x)} ${f1(y)}l-18 52"/>`; }).join('')}</g>
<rect width="${W}" height="${H}" fill="#eaf4ff" opacity="${lit(t) ? 0.5 : 0}"/>`,
    ],
  };
}

/* ---------- landfall ---------- */
function landfall(): Shot {
  seed = 23; let ridge = 'M-40 700', trees = '', farTrees = '';
  for (let x = -40; x <= W + 40; x += 24) {
    const y = 640 - Math.sin(x / 260) * 40 - Math.sin(x / 90) * 14 - (x > 1100 ? (x - 1100) * 0.05 : 0);
    ridge += `L${x} ${f1(y)}`;
    for (let k = 0; k < 2; k++) if (rnd() < 0.9) { const tx = x + rnd() * 24, ty = y + 8 + rnd() * 40, s = 0.8 + rnd() * 0.8; trees += `<path d="M${f1(tx)} ${f1(ty - 56 * s)}l${f1(17 * s)} ${f1(36 * s)}h${f1(-10 * s)}l${f1(15 * s)} ${f1(20 * s)}h${f1(-44 * s)}l${f1(15 * s)} ${f1(-20 * s)}h${f1(-10 * s)}Z" fill="${rnd() < 0.5 ? '#2b5634' : '#376a3c'}"/>`; }
    if (rnd() < 0.7) { const s = 0.5 + rnd() * 0.4; farTrees += `<path d="M${f1(x)} ${f1(y - 40 - 40 * s)}l${f1(12 * s)} ${f1(40 * s)}h${f1(-24 * s)}Z" fill="#4f7a5a" opacity=".8"/>`; }
  }
  const village = Sprite.village({ tribe: 'iroquois', pop: 5, alive: true, ally: null, n: 1, cell: 0 } as unknown as Parameters<typeof Sprite.village>[0]);
  const tipis = Sprite.village({ tribe: 'sioux', pop: 4, alive: true, ally: null, n: 2, cell: 0 } as unknown as Parameters<typeof Sprite.village>[0]);
  /** A birch-bark canoe with two paddlers, pulling together: the blades dip on one side, then swing forward. */
  const canoe = (x: number, y: number, t: number) => {
    const a = Math.sin(t * 2.6), paddler = (px: number, ph: number) => {
      const sw = Math.sin(t * 2.6 + ph), lean = sw * 4, hx = px + lean, bx = hx - 26 - sw * 16, by = 26 - Math.max(0, sw) * 10;
      return `<path d="M${f1(px - 9)} -2l${f1(3 + lean * 0.4)} -22h${f1(12)}l${f1(3 - lean * 0.4)} 22Z" fill="#7a4a2c"/><circle cx="${f1(px + lean * 0.8)}" cy="-31" r="7.500" fill="#8a5634"/><path d="M${f1(px + lean * 0.8 - 7)} -34q7 -9 14 0v-3q-7 -6 -14 0Z" fill="#1e140c"/><path d="M${f1(px + lean * 0.8 + 3)} -37l4 -9 2 1.500-4 8.500Z" fill="#c9a24a"/>
<path d="M${f1(hx + 6)} -26L${f1(bx)} ${f1(by)}" stroke="#4a2e18" stroke-width="3.500" stroke-linecap="round"/><ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="4.500" ry="10" transform="rotate(${f1(Math.atan2(by + 26, bx - hx - 6) * 57.3 - 90)} ${f1(bx)} ${f1(by)})" fill="#4a2e18"/><path d="M${f1(hx + 2)} -18l${f1(-8 - sw * 4)} 6" stroke="#8a5634" stroke-width="5" stroke-linecap="round"/>`;
    };
    return `<g transform="translate(${f1(x)} ${f1(y + a * 1.5)}) scale(1.15)"><ellipse cx="0" cy="12" rx="74" ry="5" fill="#1f5878" opacity=".45"/>
${paddler(-22, 0)}${paddler(24, 0.5)}
<path d="M-74 -14q8 14 24 18h100q16 -4 24 -18q-6 22 -26 26h-96q-20 -4 -26 -26Z" fill="#e9dcc0" stroke="#5a3a1e" stroke-width="2.500"/><path d="M-66 -2q14 8 30 8h72q16 0 30 -8" stroke="#5a3a1e" stroke-width="2" fill="none"/><path d="M-30 4v8M0 4v8M30 4v8" stroke="#8a6a44" stroke-width="2"/></g>`;
  };
  return {
    flip: true, s: 7.5, line: ['Land ahead: forests, rivers, and the peoples who have always lived here.', 'Впереди земля: леса, реки и народы, что жили здесь всегда.'],
    camera: push(1.0, 1.1, W * 0.38, H * 0.62, 30),
    layers: [
      `<defs>${grad('l-sky', [[0, '#5e9fd0'], [0.5, '#bfe0ef'], [1, '#f1f0e0']])}${grad('l-sea', [[0, '#5aa6c6'], [1, '#2a6f96']])}${grad('l-haze', [[0, '#e9f3f3', 0], [1, '#e9f3f3', 0.85]])}</defs><rect width="${W}" height="${H}" fill="url(#l-sky)"/>`,
      (t) => `${rays(1500, -60, t, '#fffbe6', 0.18)}${drift(t, 4, 120, 6, '#ffffff', '#c6d6e2', 0.95, 1.2)}`,
      `<path d="M-40 640L240 470 420 560 640 400 900 540 1120 430 1380 560 1600 450 1960 560V720H-40Z" fill="#8fa9b6"/><path d="M640 400l-60 60 30-8 30 22 20-40 34 16Z M1120 430l-44 46 26-8 22 20 18-36 26 12Z" fill="#f4f7f8"/><rect y="440" width="${W}" height="300" fill="url(#l-haze)"/>${farTrees}`,
      `<path d="${ridge}L${W + 40} 1080L-40 1080Z" fill="#5d8f4a"/>${trees}<path d="M-40 742Q500 724 1000 740T1960 732V1080H-40Z" fill="#e8d6a6"/>`,
      (t) => `${sprite(village, 1360, 740, 4)}${sprite(tipis, 1640, 744, 3.6)}${smoke(1330, 640, t)}${smoke(1440, 640, t + 0.5)}${smoke(1640, 650, t + 1.2)}`,
      (t, k) => `${sea(760, 5, 70, t, 1.1, 'url(#l-sea)')}${glitter(1500, 770, 1000, t, '#ffffff', 40)}${canoe(lerp(1180, 980, k), 830, t)}${ship(lerp(-160, 620, ease(Math.min(1, k * 1.25))), 930, 6.4, t, 2, 0, 1)}${sea(890, 8, 100, t, 1.5, '#2a7099')}${flock(t, 520, 330, 5, 26, 1.1)}`,
    ],
  };
}

/* ---------- the first colony ---------- */
function colony(): Shot {
  const col = Sprite.colony({ owner: 0, cell: 0 } as unknown as Parameters<typeof Sprite.colony>[0]);
  const color = D.players[0].color, emblem = `<image href="art/emblem/${D.players[0].nation}.svg" x="-30" y="-30" width="60" height="60"/>`;
  const posts = Array.from({ length: 22 }, (_, i) => 760 + i * 22);
  return {
    s: 8, line: ['Found your colonies. One day the King’s taxes will be too much: will you stand for independence, or for the Crown?', 'Основывайте колонии. Однажды налоги короля станут невыносимы: встанете ли вы за независимость — или за Корону?'],
    camera: push(1.02, 1.12, W * 0.62, H * 0.6, -30),
    layers: [
      `<defs>${grad('k-sky', [[0, '#26214a'], [0.35, '#7a4466'], [0.62, '#e07a5a'], [0.82, '#f6b46a'], [1, '#f9d08e']])}${radial('k-sun', [[0, '#fff0c8'], [1, '#ff9e57', 0]])}${grad('k-sea', [[0, '#8a5a6e'], [1, '#3a2840']])}</defs><rect width="${W}" height="${H}" fill="url(#k-sky)"/>`,
      (t, k) => { const y = lerp(640, 720, k); return `${rays(480, y, t, '#ffd59a', 0.12)}<circle cx="480" cy="${f1(y)}" r="320" fill="url(#k-sun)" opacity=".85"/><circle cx="480" cy="${f1(y)}" r="70" fill="#ffe7b6"/>${drift(t, 4, 160, 5, '#f4a98a', '#a05a6a', 0.6, 1.1)}${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 197) % W}" cy="${(i * 67) % 380}" r="1.6" fill="#fff" opacity="${f1(clamp((k - 0.5) * 2) * (0.4 + (i % 3) * 0.2))}"/>`).join('')}`; },
      (t) => `${sea(720, 4, 70, t, 0.9, 'url(#k-sea)')}${glitter(480, 730, 900, t, '#ffd59a', 40)}`,
      `<path d="M700 760Q960 640 1300 660T1960 640V1080H700Z" fill="#33412a"/><path d="M620 840Q960 760 1300 770T1960 750V1080H620Z" fill="#4a5a32"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${980 + i * 70} 960l60 -120" stroke="#6e7a3a" stroke-width="10" opacity=".7"/>`).join('')}`,
      (t, k) => {
        const built = ease(k * 1.6), flag = ease((k - 0.45) * 2.2), up = lerp(0.6, 1, built);
        return `${posts.map((x, i) => { const p = clamp(built * posts.length - i); return p > 0 ? `<path d="M${x} 860v${f1(-58 * p)}l9 -12 9 12v${f1(58 * p)}Z" fill="#6b4526" stroke="#3d2814" stroke-width="2"/>` : ''; }).join('')}
<g transform="translate(1300 520)"><rect x="-4" width="8" height="320" fill="#2b1c12"/><circle r="7" fill="#c9a24a"/><g transform="translate(0 ${f1(lerp(250, 6, flag))})" opacity="${f1(clamp(flag * 4))}"><path d="M4 0h170q${f1(Math.sin(t * 3) * 14)} 50 0 100H4Z" fill="${color}"/><g transform="translate(88 50)">${emblem}</g></g></g>
<g transform="translate(1190 840) scale(${f1(6 * up)}) translate(-32 -56)" opacity="${f1(clamp(built * 2))}">${col}</g>

${ship(400, 830, 4.6, t, 1.2)}${Array.from({ length: 14 }, (_, i) => { const a = t * 0.6 + i; return `<circle cx="${f1(900 + (i * 83) % 800 + Math.sin(a) * 20)}" cy="${f1(900 + Math.cos(a * 1.3) * 30 - (i % 4) * 30)}" r="2.500" fill="#fff6b0" opacity="${f1(clamp((k - 0.55) * 3) * Math.max(0, Math.sin(a * 3)))}"/>`; }).join('')}`;
      },
    ],
  };
}

/* ---------- playing ---------- */
let raf = 0, finish: (() => void) | null = null, at = 0, started = 0, list: Shot[] = [], card = false, live: { g: SVGGElement; f: (t: number, k: number) => string }[] = [];
const CARD_S = 5;
function frame(now: number) {
  raf = requestAnimationFrame(frame);
  const el = $('intro'), t = (now - started) / 1000;
  if (card) { if (t > CARD_S) end(); return; }
  const s = list[at];
  if (t > s.s) { go(at + 1); return; }
  const k = t / s.s;
  for (const l of live) l.g.innerHTML = l.f(t, k);
  if (s.camera) el.querySelector<SVGGElement>('g.cam')!.setAttribute('transform', s.camera(t, k));
  const out = t > s.s - 0.6 ? (t - (s.s - 0.6)) / 0.6 : 0;
  el.querySelector<HTMLElement>('.fade')!.style.opacity = (t < 0.7 ? 1 - t / 0.7 : out).toFixed(2);
  // The words leave with their picture.
  el.querySelector<HTMLElement>('.sub')!.style.opacity = (1 - out).toFixed(2);
}
/** Move to shot `i`: lay out its layers, still ones once and for all; its words appear word by word. */
function go(i: number) {
  const el = $('intro');
  at = i; started = performance.now();
  el.querySelectorAll('.dots i').forEach((d, j) => d.classList.toggle('on', j <= i));
  if (i >= list.length) { card = true; el.classList.add('carded'); el.querySelector<HTMLElement>('.sub')!.style.opacity = '0'; return; }
  const s = list[i], svg = el.querySelector<SVGSVGElement>('svg.film')!;
  // A flipped shot is drawn mirrored, so that its ship sails west, from Europe towards the New World.
  svg.innerHTML = `<g class="cam"><g${s.flip ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>${s.layers.map((l) => `<g>${typeof l === 'string' ? l : ''}</g>`).join('')}</g></g>`;
  const groups = [...svg.querySelectorAll<SVGGElement>('g.cam > g > g')];
  live = s.layers.flatMap((l, j) => (typeof l === 'string' ? [] : [{ g: groups[j], f: l }]));
  el.querySelector('.sub')!.innerHTML = `<p>${pick(s.line).split(' ').map((w, j) => `<span style="--d:${(0.4 + j * 0.06).toFixed(2)}s">${w}</span>`).join(' ')}</p>`;
}
/** Fade out, then hand over to the game. */
function end() {
  if (!finish) return;
  const el = $('intro'), done = finish;
  finish = null; cancelAnimationFrame(raf); live = [];
  el.classList.add('out');
  setTimeout(() => { el.hidden = true; el.classList.remove('out', 'carded'); el.innerHTML = ''; done(); }, 900);
}
/** Play the opening film for the player's nation; `done` runs when it ends or is skipped. */
export function playIntro(nation: string, done: () => void) {
  const el = $('intro');
  list = [harbour(), charter(), chart(), storm(), landfall(), colony()]; finish = done; card = false;
  el.innerHTML = `<div class="screen"><svg class="film" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"></svg><div class="fade"></div><div class="sub"></div>
<section class="finale"><div class="crest">${Places.em(0, 132)}</div><h1>${pick(D.names.nations[nation])}</h1><p class="when">1620</p><p class="sub2">${L('Your charter begins', 'Ваша грамота вступает в силу')}</p></section></div>
<div class="dots">${Array.from({ length: list.length + 1 }, () => '<i></i>').join('')}</div><button class="skip" data-intro-skip>${L('Skip', 'Пропустить')}</button>`;
  el.hidden = false;
  go(0); raf = requestAnimationFrame(frame);
}
export const introPlaying = () => finish !== null;

// While the film plays, these keys end it and do nothing else.
document.addEventListener('keydown', (e) => {
  if (!finish || !['Enter', 'Escape', ' ', 'Spacebar'].includes(e.key)) return;
  e.preventDefault(); e.stopImmediatePropagation(); end();
}, true);
document.addEventListener('click', (e) => {
  if (!finish) return;
  const t = e.target as HTMLElement;
  if (t.closest('[data-intro-skip]')) end();
  else if (t.closest('#intro')) { if (card) end(); else go(at + 1); }
}, true);
