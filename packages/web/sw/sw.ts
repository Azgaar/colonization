/* The service worker: the game works offline and opens at once, from its own copy of every file.
 * `tools/pwa.ts` writes `PWA` in front of this script (into packages/web/sw.js): the version, and each file with a hash of its content.
 * `core` is kept before the new version takes over (the page, styles, code, art, effects); `later` (the music) is copied from the last version
 * when unchanged, otherwise fetched while the game runs (the page asks: `warm`) or when a piece is first played.
 * A new version waits until the page asks it to take over (`skip`) or every window of the game is closed, so a running game never mixes two versions. */
export {};

declare const PWA: { version: string; core: Record<string, string>; later: Record<string, string> };
const sw = self as unknown as ServiceWorkerGlobalScope;
const PREFIX = 'colonization-', NOW = `${PREFIX}${PWA.version}`, FONTS = `${PREFIX}fonts`, HASH = 'x-hash';
const ALL: Record<string, string> = { ...PWA.core, ...PWA.later };
const scope = new URL(sw.registration.scope), at = (path: string) => new URL(path, scope).href;
/** A file of the game by its path under the scope, `index.html` for the page itself; null for anything else (the rules API, source maps). */
function pathOf(u: URL): string | null {
  if (u.origin !== scope.origin || !u.pathname.startsWith(scope.pathname)) return null;
  const p = decodeURIComponent(u.pathname.slice(scope.pathname.length)) || 'index.html';
  return p in ALL ? p : null;
}

/** The same file with the same hash in an earlier version's cache, so an update downloads only what changed. */
async function earlier(path: string, hash: string): Promise<Response | undefined> {
  for (const name of await caches.keys()) {
    if (!name.startsWith(PREFIX) || name === NOW || name === FONTS) continue;
    const r = await (await caches.open(name)).match(at(path));
    if (r?.headers.get(HASH) === hash) return r;
  }
  return undefined;
}
/** A file into this version's cache, marked with its hash. `net`: fetch it when no earlier version has it. */
async function keep(cache: Cache, path: string, hash: string, net = true): Promise<void> {
  if ((await cache.match(at(path)))?.headers.get(HASH) === hash) return;
  const old = await earlier(path, hash);
  if (old) return cache.put(at(path), old);
  if (!net) return;
  const r = await fetch(at(path), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  const headers = new Headers(r.headers); headers.set(HASH, hash);
  await cache.put(at(path), new Response(await r.blob(), { status: 200, headers }));
}
/** Every file of a list, a few at a time. */
async function keepAll(files: Record<string, string>, net: boolean): Promise<void> {
  const cache = await caches.open(NOW), list = Object.entries(files);
  const worker = async () => { for (let x = list.shift(); x; x = list.shift()) await keep(cache, x[0], x[1], net); };
  await Promise.all(Array.from({ length: 6 }, worker));
}
let warming: Promise<void> | null = null;
const warm = () => (warming ??= keepAll(PWA.later, true).catch(() => { warming = null; }));

sw.addEventListener('install', (e) => e.waitUntil(Promise.all([keepAll(PWA.core, true), keepAll(PWA.later, false)])));
sw.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== NOW && name !== FONTS) await caches.delete(name);
  await sw.clients.claim();
})()));
sw.addEventListener('message', (e) => {
  if (e.data === 'skip') void sw.skipWaiting();
  else if (e.data === 'warm') e.waitUntil(warm());
});

/** Part of a file, for a recording read by the audio element (it asks for ranges; Safari plays nothing without them). */
async function ranged(req: Request, res: Response): Promise<Response> {
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (!m) return res;
  const body = await res.arrayBuffer(), n = body.byteLength;
  const start = m[1] ? +m[1] : Math.max(0, n - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], n - 1) : n - 1;
  if (start >= n || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${n}` } });
  return new Response(body.slice(start, end + 1), { status: 206, headers: { 'content-type': res.headers.get('content-type') ?? 'application/octet-stream', 'content-range': `bytes ${start}-${end}/${n}`, 'content-length': `${end - start + 1}`, 'accept-ranges': 'bytes' } });
}
/** A file of the game: from this version's cache; one not there yet comes from the network (music is then kept for next time). */
async function game(e: FetchEvent, path: string): Promise<Response> {
  const hit = await (await caches.open(NOW)).match(at(path));
  if (hit) return ranged(e.request, hit);
  if (path in PWA.later) e.waitUntil(caches.open(NOW).then((c) => keep(c, path, PWA.later[path])).catch(() => undefined));
  return fetch(e.request);
}
/** The web fonts: kept from the first visit on, refreshed in the background. */
async function font(e: FetchEvent): Promise<Response> {
  const cache = await caches.open(FONTS), hit = await cache.match(e.request);
  const net = fetch(e.request).then((r) => { if (r.ok || r.type === 'opaque') e.waitUntil(cache.put(e.request, r.clone())); return r; });
  if (!hit) return net;
  net.catch(() => undefined);
  return hit;
}
sw.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url), path = pathOf(u);
  if (path) e.respondWith(game(e, path));
  else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') e.respondWith(font(e));
});
