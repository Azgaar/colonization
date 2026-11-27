/** Serve the interface from this package. Usage: node packages/web/tools/serve.ts [port] (after `pnpm web:build`).
 * For dev mode it also takes rule changes (FR-R-9), from this computer only: GET /api/rules (the rulesets and the printed texts to update),
 * POST /api/rules/apply {override, from?} and /api/rules/drop {ruleset, id}. Each writes rules/, the rulesets and docs/decisions.md as
 * `pnpm rules` does, then rebuilds the game so the page sees the new rules. */
import { createServer, type IncomingMessage } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { allRulesets, apply, drop, RULESET_IDS } from '../../data/src/rulesfs.ts';
import { readMaster, todo } from '../../data/src/master.ts';
import type { Override } from '../../data/src/types.ts';

const root = join(import.meta.dirname, '..'), repo = join(root, '..', '..'), port = Number(process.argv[2] ?? process.env.PORT ?? 8765);
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.map': 'application/json', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const body = (req: IncomingMessage) => new Promise<string>((ok) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => ok(s)); });
const build = () => new Promise<void>((ok, no) => execFile('pnpm', ['-s', 'web:build'], { cwd: repo }, (e) => (e ? no(e) : ok())));
const local = (req: IncomingMessage) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname.startsWith('/api/rules')) {
    const send = (code: number, x: unknown) => res.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(x));
    if (!local(req)) return send(403, { error: 'only from this computer' });
    try {
      if (req.method === 'GET') return send(200, { rulesets: allRulesets(), todo: todo(readMaster()) });
      const x = JSON.parse((await body(req)) || '{}') as { id?: string; ruleset?: string; from?: string; override?: Override }, step = url.pathname.slice('/api/rules/'.length);
      const file = (r?: string) => (r && RULESET_IDS.includes(r) ? r : undefined);
      const done = step === 'apply' && x.override ? apply(x.override, file(x.from)) : step === 'drop' && x.id && file(x.ruleset) ? { message: drop(x.ruleset!, x.id) } : null;
      if (!done) return send(400, { error: 'expected apply {override, from?} or drop {ruleset, id}' });
      await build();
      return send(200, done);
    } catch (e) { return send(400, { error: (e as Error).message }); }
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
    if (!file.startsWith(root)) throw new Error('outside');
    const data = await readFile(file), type = TYPES[extname(file)] ?? 'application/octet-stream';
    // Ranges let the browser read a recording's length and seek in it.
    const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (r) {
      const start = r[1] ? +r[1] : data.length - +r[2], end = r[1] && r[2] ? Math.min(+r[2], data.length - 1) : data.length - 1;
      if (start >= data.length || start > end) return res.writeHead(416, { 'content-range': `bytes */${data.length}` }).end();
      return res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${data.length}`, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' }).end(data.subarray(start, end + 1));
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' }).end(data);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`http://localhost:${port}`));
