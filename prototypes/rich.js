/* B2 and B3: a richer painted map, better sprites, and a light simulation so that choices have consequences. */
(() => {
const { D, W, CELL, me, P, noise, rnd, textures, roundel, art, nbs, at } = Core;
const KINDS = ['ocean', 'forest', 'grassland', 'mountains', 'desert', 'tundra'];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** Painted map at `K` times the base size: blended ground, lit relief, beaches, shallows, clouds over the unknown. */
async function drawRich(canvas, { K = 1.5, europe = true, inkless = false, tall = 1, open: sea = false, rest = async () => {} } = {}) {
  const tex = await textures(), C = CELL * K, N = Math.round(W * C), f = new Uint8Array(N * N);
  const open = (c) => D.open[c], key = `${K} ${europe} ${sea}`;
  if (drawRich.kept?.key === key) { const q = drawRich.kept; canvas.width = canvas.height = N; const g = canvas.getContext('2d'); g.putImageData(q.im, 0, 0); if (!inkless) scatter(g, K, q.f, N, tall); return canvas; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const X = x / K, Y = y / K;
    const wx = X + (noise(X / 26, Y / 26) - 0.5) * 40 + (noise(X / 8 + 50, Y / 8) - 0.5) * 13, wy = Y + (noise(X / 26 + 90, Y / 26 + 40) - 0.5) * 40 + (noise(X / 8, Y / 8 + 70) - 0.5) * 13;
    let c = Math.min(W - 1, Math.max(0, Math.floor(wy / CELL))) * W + Math.min(W - 1, Math.max(0, Math.floor(wx / CELL)));
    f[y * N + x] = open(c) ? KINDS.indexOf(D.terrain[c]) : 255;
    if (x === N - 1) await rest();
  }
  const field = async (goal) => {
    const d = new Float32Array(N * N).fill(1e4), r = 1.41;
    for (let i = 0; i < N * N; i++) if (goal(f[i])) d[i] = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; let v = d[i]; if (x) v = Math.min(v, d[i - 1] + 1); if (y) { v = Math.min(v, d[i - N] + 1); if (x) v = Math.min(v, d[i - N - 1] + r); if (x < N - 1) v = Math.min(v, d[i - N + 1] + r); } d[i] = v; if (x === N - 1) await rest(); }
    for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; let v = d[i]; if (x < N - 1) v = Math.min(v, d[i + 1] + 1); if (y < N - 1) { v = Math.min(v, d[i + N] + 1); if (x) v = Math.min(v, d[i + N - 1] + r); if (x < N - 1) v = Math.min(v, d[i + N + 1] + r); } d[i] = v; if (!x) await rest(); }
    return d;
  };
  const land = (v) => v > 0 && v < 6, toLand = await field(land), toSea = await field((v) => v === 0), toFog = await field((v) => v === 255);
  const im = new ImageData(N, N), o = im.data;
  const sw = sea ? calm(tex.ocean) : null;
  const TINT = { 2: [128, 168, 62], 1: [58, 96, 48], 3: [150, 140, 122], 4: [226, 190, 122], 5: [196, 206, 200] };
  const ground = (v, x, y, s) => { const k = tex[KINDS[v]], i = ((((y / K) * s) | 0) % 224) * 224 + ((((x / K) * s) | 0) % 224); return [k[i * 4], k[i * 4 + 1], k[i * 4 + 2]]; };
  const J = [[0, 0], [7, 2], [-7, -2], [2, 8], [-3, -8]].map(([a, b]) => [Math.round(a * K), Math.round(b * K)]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, v = f[i], X = x / K, Y = y / K;
    let c;
    if (land(v)) {
      let n = 0, acc = [0, 0, 0];
      for (const [a, b] of J) { const q = (y + b) * N + x + a, u = q >= 0 && q < N * N ? f[q] : v, w = land(u) ? u : v, t = mix(ground(w, x, y, 1.15), TINT[w], w === 3 || w === 1 ? 0.62 : 0.42); acc[0] += t[0]; acc[1] += t[1]; acc[2] += t[2]; n++; }
      c = [acc[0] / n, acc[1] / n, acc[2] / n];
      const h = (noise(X / 30, Y / 30) - noise((X + 5) / 30, (Y + 5) / 30)) * 1.5 + (noise(X / 11, Y / 11) - noise((X + 2) / 11, (Y + 2) / 11)) * 0.5;
      c = mix(c, h > 0 ? [255, 244, 206] : [24, 44, 40], Math.min(0.4, Math.abs(h)));
      const d = toSea[i] / K, u = 4 + noise(X / 14, Y / 14) * 4;
      if (d < u) c = mix(c, [236, 214, 160], 0.88 - (d / u) * 0.5);
      if (d < 1.1) c = mix(c, [120, 96, 60], 0.45);
    } else if (v === 0) {
      let t = ground(0, x, y, 0.9); const d = toLand[i] / K;
      c = mix(t, [22, 92, 138], 0.55);
      c = mix(c, [10, 52, 92], Math.min(0.5, Math.max(0, d - 40) / 260));
      if (sea) { const q = (((Y * 0.9) | 0) % SW * SW + ((X * 0.9) | 0) % SW) * 3; t = [sw[q], sw[q + 1], sw[q + 2]]; } if (sea) c = mix(mix(t, [22, 92, 138], 0.55), [10, 52, 92], Math.max(Math.min(0.5, Math.max(0, d - 40) / 260), 0.5 * Math.max(0, 1 - Math.min(X, Y, W * CELL - X, W * CELL - Y) / 170)));
      if (d < 60) c = mix(c, [92, 190, 184], 0.8 * (1 - d / 60) ** 1.4);
      const wave = Math.sin(d / 2.6 + noise(X / 16, Y / 16) * 5);
      if (d < 22 && wave > 0.86) c = mix(c, [236, 248, 242], 0.5 * (1 - d / 22));
      if (d < 2.4) c = mix(c, [246, 250, 240], 0.85);
      // Land throws a shadow on the water.
      const sx = x - Math.round(4 * K), sy = y - Math.round(5 * K);
      if (sx >= 0 && sy >= 0 && land(f[sy * N + sx])) c = mix(c, [8, 40, 60], 0.4);
      if (europe && D.zone[Math.floor(Y / CELL) * W + Math.floor(X / CELL)] === 'europe') c = mix(c, [8, 34, 60], 0.35);
    } else c = [38, 96, 120];
    // Clouds: thick inside unknown fragments, thinning over their edge.
    const fd = v === 255 ? 99 : toFog[i] / K, cl = v === 255 ? 1 : Math.max(0, 1 - fd / 22);
    if (cl > 0) {
      const n = noise(X / 46, Y / 34) * 0.55 + noise(X / 17 + 30, Y / 14) * 0.3 + noise(X / 7, Y / 7) * 0.15, k = v === 255 ? 0.93 : Math.max(0, cl * 1.5 - (1 - n));
      c = mix(c, mix([150, 178, 190], [244, 246, 240], Math.min(1, Math.max(0, (n - 0.25) * 1.9))), Math.min(0.95, Math.max(0, k)));
    }
    o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = sea ? Math.min(255, Math.min(X, Y, W * CELL - X, W * CELL - Y) * 5) : 255;
    if (x === N - 1) await rest();
  }
  canvas.width = canvas.height = N;
  const g = canvas.getContext('2d');
  g.putImageData(im, 0, 0);
  if (sea) drawRich.kept = { key, im, f };
  if (!inkless) scatter(g, K, f, N, tall);
  return canvas;
}
/** The same deep water as a repeating tile for everything beyond the map. */
const SW = 176;
/** The water texture with its edges blended into each other, so that repeats do not show. */
function calm(t) {
  const O = 224 - SW, a = new Float32Array(224 * SW * 3), out = new Float32Array(SW * SW * 3);
  for (let y = 0; y < 224; y++) for (let x = 0; x < SW; x++) for (let k = 0; k < 3; k++) { const w = Math.min(1, x / O); a[(y * SW + x) * 3 + k] = t[(y * 224 + x) * 4 + k] * w + (w < 1 ? t[(y * 224 + x + SW) * 4 + k] * (1 - w) : 0); }
  for (let y = 0; y < SW; y++) for (let x = 0; x < SW; x++) for (let k = 0; k < 3; k++) { const w = Math.min(1, y / O); out[(y * SW + x) * 3 + k] = a[(y * SW + x) * 3 + k] * w + (w < 1 ? a[((y + SW) * SW + x) * 3 + k] * (1 - w) : 0); }
  return out;
}
/** Paints `size` map units of it, centred on the map and fading out at the edges. Returns the mean colour. */
async function drawSea(canvas, size, K) {
  const t = calm((await textures()).ocean), c = document.createElement('canvas'), g = c.getContext('2d'), sum = [0, 0, 0];
  c.width = c.height = SW;
  const im = new ImageData(SW, SW);
  for (let i = 0; i < SW * SW; i++) { const v = mix(mix([t[i * 3], t[i * 3 + 1], t[i * 3 + 2]], [22, 92, 138], 0.55), [10, 52, 92], 0.5); im.data.set([...v, 255], i * 4); for (let k = 0; k < 3; k++) sum[k] += v[k]; }
  g.putImageData(im, 0, 0);
  const N = canvas.width = canvas.height = Math.round(size * K), q = canvas.getContext('2d'), p = q.createPattern(c, 'repeat'), o = ((size - W * CELL) / 2) * K, z = K / 0.9;
  p.setTransform(new DOMMatrix([z, 0, 0, z, o, o])); q.fillStyle = p; q.fillRect(0, 0, N, N);
  q.globalCompositeOperation = 'destination-in';
  for (const [x, y] of [[N, 0], [0, N]]) { const l = q.createLinearGradient(0, 0, x, y); for (const [k, v] of [[0, 0], [0.14, 1], [0.86, 1], [1, 0]]) l.addColorStop(k, `rgba(0,0,0,${v})`); q.fillStyle = l; q.fillRect(0, 0, N, N); }
  return `rgb(${sum.map((v) => Math.round(v / SW / SW))})`;
}
/** Trees, peaks, tufts and dunes, drawn back to front so that the ground reads at a glance. */
function scatter(g, K, f, N, tall) {
  const items = [];
  for (let c = 0; c < W * W; c++) {
    if (!D.open[c] || D.terrain[c] === 'ocean') continue;
    const x0 = (c % W) * CELL, y0 = Math.floor(c / W) * CELL, t = D.terrain[c], busy = Core.colonyAt(c) || Core.settlementAt(c) || D.poi[c];
    const n = { forest: 22, mountains: 5, grassland: 7, desert: 5, tundra: 8 }[t];
    for (let k = 0; k < n; k++) {
      const x = x0 + 4 + rnd(c * 3 + 1, k * 7) * 56, y = y0 + 8 + rnd(k * 5, c * 3 + 2) * 54;
      if (busy && Math.hypot(x - x0 - 32, y - y0 - 34) < (t === 'forest' ? 23 : 25)) continue;
      const q = Math.round(y * K) * N + Math.round(x * K);
      if (f[q] !== KINDS.indexOf(t)) continue;
      items.push([y, x, t, rnd(k, c)]);
    }
  }
  items.sort((a, b) => a[0] - b[0]);
  g.save();
  g.scale(K, K);
  for (const [y, x, t, r] of items) {
    g.save(); g.translate(x, y); g.scale(1, tall); g.translate(-x, -y);
    if (t === 'forest') {
      const s = 4.6 + r * 2.6, pine = r > 0.45;
      g.fillStyle = '#0c241c66'; g.beginPath(); g.ellipse(x + 2.5, y + 1.5, s, s * 0.45, 0, 0, 7); g.fill();
      g.fillStyle = pine ? ['#274f33', '#2f5c38', '#1f4630'][(r * 9 | 0) % 3] : ['#4d7a34', '#5d8a3a', '#416d33'][(r * 9 | 0) % 3];
      if (pine) { g.beginPath(); g.moveTo(x - s * 0.75, y + 1); g.lineTo(x, y - s * 2.2); g.lineTo(x + s * 0.75, y + 1); g.fill(); g.fillStyle = '#ffffff1f'; g.beginPath(); g.moveTo(x - s * 0.75, y + 1); g.lineTo(x, y - s * 2.2); g.lineTo(x - s * 0.1, y + 1); g.fill(); }
      else { g.beginPath(); g.arc(x, y - s * 0.7, s, 0, 7); g.fill(); g.fillStyle = '#e8f0a82e'; g.beginPath(); g.arc(x - s * 0.3, y - s * 1.05, s * 0.5, 0, 7); g.fill(); }
    } else if (t === 'mountains') {
      const s = 12 + r * 9;
      g.fillStyle = '#1c28283d'; g.beginPath(); g.ellipse(x + 6, y + 2, s * 1.1, s * 0.3, 0, 0, 7); g.fill();
      g.fillStyle = '#8d8676'; g.beginPath(); g.moveTo(x - s, y + 3); g.lineTo(x - s * 0.2, y - s * 1.25); g.lineTo(x + s * 0.3, y - s * 0.85); g.lineTo(x + s, y + 3); g.fill();
      g.fillStyle = '#5c584f'; g.beginPath(); g.moveTo(x - s * 0.2, y - s * 1.25); g.lineTo(x + s * 0.3, y - s * 0.85); g.lineTo(x + s, y + 3); g.lineTo(x + s * 0.05, y + 3); g.lineTo(x + s * 0.12, y - s * 0.5); g.fill();
      g.fillStyle = '#fbfaf4'; g.beginPath(); g.moveTo(x - s * 0.5, y - s * 0.72); g.lineTo(x - s * 0.2, y - s * 1.25); g.lineTo(x + s * 0.3, y - s * 0.85); g.lineTo(x + s * 0.08, y - s * 0.66); g.lineTo(x - s * 0.12, y - s * 0.84); g.lineTo(x - s * 0.28, y - s * 0.6); g.fill();
    } else if (t === 'grassland') { g.strokeStyle = r > 0.5 ? '#5d862f' : '#8fb04a'; g.lineWidth = 1.3; g.beginPath(); for (const k of [-2.4, 0, 2.4]) { g.moveTo(x + k * 0.5, y); g.lineTo(x + k, y - 4.6); } g.stroke(); }
    else if (t === 'desert') { g.strokeStyle = '#b98c4a88'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y + 5, 9 + r * 5, 3.7, 5.6); g.stroke(); }
    else { g.fillStyle = r > 0.5 ? '#ffffffb0' : '#8a9a8ea0'; g.beginPath(); g.ellipse(x, y, 5 + r * 5, 2.4, 0, 0, 7); g.fill(); }
    g.restore();
  }
  g.restore();
}
/* Sprites in a 64-unit box, feet at the bottom. */
const house = (x, y, w, roof, wall = '#f3e6c8') => `<path d="M${x} ${y}v${-w * 0.62}h${w}v${w * 0.62}Z" fill="${wall}"/><path d="M${x + w * 0.58} ${y}v${-w * 0.62}h${w * 0.42}v${w * 0.62}Z" fill="#00000021"/><path d="M${x - w * 0.12} ${y - w * 0.58}L${x + w * 0.28} ${y - w * 1.12}h${w * 0.5}l${w * 0.34} ${w * 0.54}Z" fill="${roof}"/><path d="M${x + w * 0.28} ${y - w * 1.12}h${w * 0.5}l${w * 0.34} ${w * 0.54}h${-w * 0.42}Z" fill="#00000026"/><path d="M${x + w * 0.2} ${y}v${-w * 0.34}h${w * 0.2}v${w * 0.34}Z" fill="#5b3a22"/>`;
const ring = (y, r) => `<ellipse cx="32" cy="${y}" rx="${r}" ry="${r * 0.34}" fill="#0a1d1b" fill-opacity=".34"/>`;
const Sprite = {
  colony(c) {
    const o = D.players[c.owner], b = o.buildings, big = b.length, roof = '#b4533a';
    return ring(52, 29) + house(10, 48, 13, '#a2492f') + house(38, 47, 14, roof) + (big > 1 ? house(25, 44, 12, '#8f4a35', '#e9d8b4') : '') + (b.includes('chapel') || b.includes('church') ? `<path d="M30 40V24h8v16Z" fill="#f7efdb"/><path d="M28 25l6-12 6 12Z" fill="#7d4433"/><path d="M34 13V6m-2.500 2.500h5" stroke="#f7efdb" stroke-width="1.600"/>` : '') + house(20, 55, 15, roof) + (big > 3 ? house(43, 56, 12, '#9c4b34', '#e9d8b4') : '') +
      (b.includes('stockade') || b.includes('fort') ? `<path d="M3 58V48l2-2.500L7 48v10M9 59V49l2-2.500 2 2.500v10M15 60V50l2-2.500 2 2.500v10M21 60.500V51l2-2.500 2 2.500v9.500M27 61V51l2-2.500 2 2.500v10M33 61V51l2-2.500 2 2.500v10M39 60.500V51l2-2.500 2 2.500v9.500M45 60V50l2-2.500 2 2.500v10M51 59V49l2-2.500 2 2.500v10M57 58V48l2-2.500 2 2.500v10" fill="#a77a4b" stroke="#5b3c1f" stroke-width=".8"/>` : '');
  },
  village(x) {
    const tp = (a, b, s) => `<path d="M${a} ${b - s}L${a - s * 0.52} ${b}h${s * 1.04}Z" fill="#ecd9ae"/><path d="M${a} ${b - s}L${a + s * 0.52} ${b}h${-s * 0.36}Z" fill="#0000001f"/><path d="M${a} ${b - s * 0.5}l${-s * 0.16} ${s * 0.5}h${s * 0.32}Z" fill="#4a2f1a"/><path d="M${a - 3} ${b - s - 4}L${a} ${b - s}l3-4" stroke="#4a2f1a" stroke-width="1.500" fill="none"/><path d="M${a - s * 0.37} ${b - s * 0.28}h${s * 0.74}" stroke="#b0492f" stroke-width="1.800"/>`;
    return ring(53, 25) + (x.pop > 2 ? tp(46, 48, 22) : '') + (x.pop > 1 ? tp(17, 50, 22) : '') + tp(32, 56, 30);
  },
  ship(p) { const c = D.players[p].color; return `<ellipse cx="33" cy="54" rx="26" ry="6" fill="#06283a" fill-opacity=".4"/><path d="M4 54q14 7 30 3" stroke="#eef8f2" stroke-opacity=".6" stroke-width="2" fill="none"/><path d="M10 42q22 8 46-3l-6 15q-16 6-33 1Z" fill="#7b4c2a"/><path d="M10 42q22 8 46-3l-1.500 4q-22 9-43 2Z" fill="#a3703f"/><path d="M24 44V10M41 43V6" stroke="#3d2614" stroke-width="2.200"/><path d="M13 14q14-3 22 1-3 10 0 20-11-3-22 0 4-10 0-21Z" fill="#fbf5e4"/><path d="M31 9q12-3 22 1-3 12 0 24-11-3-21 0 4-12-1-25Z" fill="#fffaf0"/><path d="M41 6l12 2.500-12 3Z" fill="${c}"/>${roundel(34, 13, p, 17)}`; },
  infantry(p) { const c = D.players[p].color; return ring(56, 15) + `<path d="M25 56l2-17h10l2 17h-5l-2-11-2 11Z" fill="#e9e2cf"/><path d="M22 24h20l-2 18H24Z" fill="${c}"/><path d="M22 24h20l-1 5H23Z" fill="#0003"/><path d="M27 24l10 15M37 24L27 39" stroke="#fffaf0" stroke-width="2"/><circle cx="32" cy="18" r="5.500" fill="#e2b48b"/><path d="M22 16q10-12 20 0-10-4-20 0Z" fill="#22262b"/><path d="M45 56V12l1.600-4 1.600 4v44Z" fill="#6b4526"/>`; },
  ruin: () => ring(54, 22) + `<path d="M12 54V28h7v26Zm16 0V24h7v30Zm16 0V32h7v22Z" fill="#cfc6ae"/><path d="M15.500 54V28H19v26Zm16 0V24H35v30Zm16 0V32H51v22Z" fill="#00000026"/><path d="M8 28l4-6h26l-2 6Z" fill="#ded6c0"/><path d="M38 54l4-5 5 5Zm-18 2 3-4 6 4Z" fill="#a89f88"/>`,
  wreck: () => `<path d="M8 46q20 10 48-2l-8 12q-18 5-32 0Z" fill="#6b4a30"/><path d="M20 46l8-28 4 2-7 28Zm16 0 12-20 3 2-10 18Z" fill="#4e3521"/><path d="M28 20q10 2 12 14l-9 2Z" fill="#e4dcc6" fill-opacity=".85"/><path d="M2 52q16 8 30 3t30 1" stroke="#eef8f2" stroke-opacity=".7" stroke-width="2" fill="none"/>`,
};
/* ---- light simulation: enough for a choice to be felt, with undo ---- */
const history = [], notes = [];
const snap = () => JSON.stringify({ p: D.players, c: D.colonies, left: D.left, s: D.settlements, pier: D.pier, price: D.price, demand: D.demand, act: D.actions, ref: D.ref });
const RES = Core.RES, total = (x) => RES.reduce((n, r) => n + x[r], 0);
function bonus(card, icon) { return D.agents[card].mods.filter((m) => m.mod === 'production' && (!m.icons || m.icons.includes(icon))).reduce((n, m) => n + m.add, 0) + (icon === 'goods' && P.fathers.includes('eli_whitney') ? 1 : 0); }
/** What a choice would change, as before and after. */
function preview(c) {
  const t = Core.t, pick = Core.pick, w = (r, n) => ({ icon: r, from: P.wh[r], to: P.wh[r] + n, label: t('warehouse') });
  const A = { title: `${pick(D.agents[c.card])}`, verb: pick(Core.ACT[c.a]), rows: [] };
  if (c.a === 'produce') { const y = D.yields[c.card].find((z) => z.cell === c.cell && z.icon === c.icon), r = Core.ICON_RES[c.icon]; A.rows.push(w(r, y.n)); A.parts = y.parts; }
  if (c.a === 'docks') A.rows.push(w('food', 2 + bonus(c.card, 'fish')));
  if (c.a === 'work') { const b = D.buildings[c.building], n = b.work.amount + bonus(c.card, b.work.icon); A.where = pick(b); if (b.work.consumes) A.rows.push(w(b.work.consumes.res, -b.work.consumes.amount)); A.rows.push(RES.includes(b.work.icon) ? w(b.work.icon, n) : { icon: b.work.icon, from: P[b.work.icon], to: P[b.work.icon] + n, label: t(b.work.icon) }); }
  if (c.a === 'build') { A.where = pick(D.buildings[c.building]); A.rows.push(w('timber', -D.buildings[c.building].timber)); }
  if (c.a === 'moveShip' || c.a === 'moveInfantry') A.where = D.terrain[c.cell] === 'ocean' ? t('sea') : pick(D.names.terrain[D.terrain[c.cell]]);
  if (c.a === 'gift') { const x = D.settlements[c.settlement - 1]; A.where = pick(D.names.tribes[x.tribe]); A.rows.push(w('goods', -1), { icon: 'anger', from: x.hostility, to: `${Math.max(0, x.hostility - 4)}–${Math.max(0, x.hostility - 1)}`, label: t('hostility') }); }
  if (c.a === 'exchange') A.where = pick(D.agents[c.other]);
  return A;
}
function perform(c) {
  history.push(snap());
  const p = preview(c);
  for (const r of p.rows) { if (r.label === Core.t('warehouse')) P.wh[r.icon] = r.to; else if (['bells', 'crosses', 'gold'].includes(r.icon)) P[r.icon] = r.to; }
  if (c.a === 'moveShip') P.ship = c.cell;
  if (c.a === 'moveInfantry') P.inf = c.cell;
  if (c.a === 'build') { P.buildings.push(c.building); D.left[c.building]--; }
  if (c.a === 'gift') { const x = D.settlements[c.settlement - 1]; x.hostility = Math.max(0, x.hostility - 2); }
  P.hand.splice(P.hand.indexOf(c.card), 1);
  P.discard.push(c.card);
  if (c.a === 'exchange') { P.hand.splice(P.hand.indexOf(c.other), 1); P.discard.push(c.other); }
  // Options that no longer hold.
  for (const list of Object.values(D.actions)) for (const a of list) a.options = a.options.filter((o) => (o.a !== 'build' || (!P.buildings.includes(o.building) && D.buildings[o.building].timber <= P.wh.timber && P.buildings.length < 6)) && (o.a !== 'work' || !D.buildings[o.building].work.consumes || P.wh.crops >= 1) && (o.a !== 'gift' || P.wh.goods > 0));
  if (P.inf !== undefined && Core.colonyAt(P.inf) === undefined) for (const list of Object.values(D.actions)) for (const a of list) if (a.action === 'found') a.why = Core.pick(['nothing to found on here', 'здесь нельзя основать колонию']);
  notes.unshift(`${p.title}: ${p.verb.toLowerCase()}${p.where ? `, ${p.where.toLowerCase()}` : ''}`);
}
function undo() {
  if (!history.length) return false;
  const s = JSON.parse(history.pop());
  s.p.forEach((x, i) => Object.assign(D.players[i], x));
  D.colonies.splice(0, 99, ...s.c); D.settlements.splice(0, 99, ...s.s); D.left = s.left; D.actions = s.act; D.ref = s.ref;
  notes.shift();
  return true;
}
/** Everything a card can do, sorted by where it happens. */
function byPlace(card) {
  const out = { cells: {}, home: [], ship: null, inf: null, hand: [], europe: [], villages: {} };
  for (const a of D.actions[card] || []) for (const o of a.options) {
    if (o.a === 'produce') continue;
    else if (o.a === 'moveShip') out.ship = o;
    else if (o.a === 'moveInfantry') out.inf = o;
    else if (o.settlement) (out.villages[D.settlements[o.settlement - 1].cell] ??= []).push(o);
    else if (['work', 'build', 'docks', 'teach', 'supply'].includes(o.a)) out.home.push(o);
    else if (['trade', 'hire', 'propaganda', 'repair'].includes(o.a)) out.europe.push(o);
    else if (o.a === 'exchange') out.hand.push(o);
    else if (o.cell !== undefined) (out.cells[o.cell] ??= []).push(o);
  }
  for (const y of D.yields[card] || []) (out.cells[y.cell] ??= []).push({ c: 'play', card, a: 'produce', cell: y.cell, icon: y.icon, n: y.n });
  return out;
}
window.Rich = { drawSea, drawRich, Sprite, preview, perform, undo, byPlace, history, notes, total, house, ring };
})();
