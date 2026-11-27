/**
 * The Google Sheet that Dextrous prints from, kept as a published copy of the master rules (`rules/`, master.ts).
 * Only cell values are written, so the sheet's own formatting (tables, dropdowns, fills, frozen rows, italics) stays as it is.
 *
 * Setup, once: a Google Cloud service account with the Sheets API enabled; share the sheet with its e-mail as an editor; keep its key file
 * outside the repo. Then set GOOGLE_APPLICATION_CREDENTIALS to the key file and COLONIZATION_SHEET_ID to the sheet's id (from its URL).
 *
 * Usage: pnpm rules:sheet check              what differs between the sheet and rules/
 *        pnpm rules:sheet publish [--yes]     show that, then (with --yes) write rules/ into the sheet
 *        pnpm rules:sheet check --xlsx <file> the same check against an exported workbook, offline
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { grid, readMaster, type Master } from './master.ts';
import { columnLetter, type CellValue } from './import.ts';

/** A cell as text, the way both sides are compared: numbers plainly, empty as nothing. */
const cell = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
export interface CellDiff { sheet: string; at: string; was: string; now: string }
/** Every cell of `now` (the rules) that differs from `was` (the sheet), and sheets missing from it. */
export function diffSheets(was: Record<string, CellValue[][]>, m: Master): CellDiff[] {
  const out: CellDiff[] = [];
  for (const s of m.sheets) {
    const a = was[s.sheet], b = grid(s);
    if (!a) { out.push({ sheet: s.sheet, at: '', was: '(no such sheet)', now: `${b.length} rows` }); continue; }
    const rows = Math.max(a.length, b.length), cols = Math.max(s.header.length, ...a.map((r) => r.length));
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const x = cell(a[i]?.[j]), y = cell(b[i]?.[j]);
      if (x !== y) out.push({ sheet: s.sheet, at: `${columnLetter(j)}${i + 1}`, was: x, now: y });
    }
  }
  return out;
}

/* ---- Google Sheets API: a service-account token (RS256 JWT), then plain fetch ---- */
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const b64 = (x: string | Buffer) => Buffer.from(x).toString('base64url');
async function token(): Promise<string> {
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!file) throw new Error('set GOOGLE_APPLICATION_CREDENTIALS to the service account key file (see the top of packages/data/src/sheet.ts)');
  const key = JSON.parse(readFileSync(file, 'utf8')) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const jwt = `${body}.${b64(createSign('RSA-SHA256').update(body).sign(key.private_key))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  if (!r.ok) throw new Error(`Google sign-in failed: ${r.status} ${await r.text()}`);
  return ((await r.json()) as { access_token: string }).access_token;
}
const sheetId = () => { const id = process.env.COLONIZATION_SHEET_ID; if (!id) throw new Error('set COLONIZATION_SHEET_ID to the id in the sheet\'s URL'); return id; };
async function call(path: string, t: string, init: RequestInit = {}) {
  const r = await fetch(`${API}/${sheetId()}${path}`, { ...init, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json', ...init.headers } });
  if (!r.ok) throw new Error(`Google Sheets: ${r.status} ${await r.text()}`);
  return r.json();
}
const range = (sheet: string, a1: string) => `'${sheet.replace(/'/g, "''")}'!${a1}`;
/** Every sheet's values, as computed (formulas give their results). */
export async function readSheet(m: Master, t: string): Promise<Record<string, CellValue[][]>> {
  const q = m.sheets.map((s) => `ranges=${encodeURIComponent(range(s.sheet, 'A1:ZZ'))}`).join('&');
  const x = (await call(`/values:batchGet?${q}&valueRenderOption=UNFORMATTED_VALUE`, t)) as { valueRanges: { values?: CellValue[][] }[] };
  return Object.fromEntries(m.sheets.map((s, i) => [s.sheet, x.valueRanges[i]?.values ?? []]));
}
/** Write every sheet's grid from rules/ and clear what lies below it. Values only. */
export async function writeSheet(m: Master, was: Record<string, CellValue[][]>, t: string) {
  const data = m.sheets.map((s) => ({ range: range(s.sheet, 'A1'), values: grid(s).map((r) => r.map((v) => (v === null || v === undefined ? '' : v))) }));
  await call('/values:batchUpdate', t, { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data }) });
  const below = m.sheets.filter((s) => (was[s.sheet]?.length ?? 0) > grid(s).length).map((s) => range(s.sheet, `A${grid(s).length + 1}:ZZ`));
  if (below.length) await call('/values:batchClear', t, { method: 'POST', body: JSON.stringify({ ranges: below }) });
}

async function main() {
  const [cmd] = process.argv.slice(2), m = readMaster();
  const show = (d: CellDiff[]) => {
    if (!d.length) { console.log('The sheet matches the rules.'); return; }
    const by = new Map<string, CellDiff[]>();
    for (const x of d) by.set(x.sheet, [...(by.get(x.sheet) ?? []), x]);
    for (const [s, l] of by) { console.log(`${s}: ${l.length} cell(s)`); for (const x of l.slice(0, 40)) console.log(`  ${x.at}: "${x.was}" → "${x.now}"`); if (l.length > 40) console.log(`  … and ${l.length - 40} more`); }
  };
  const xlsx = process.argv.indexOf('--xlsx');
  if (cmd === 'check' && xlsx > 0) {
    const { default: readWorkbook } = await import('read-excel-file/node');
    const sheets = (await readWorkbook(process.argv[xlsx + 1]!)) as unknown as { sheet: string; data: CellValue[][] }[];
    return show(diffSheets(Object.fromEntries(sheets.map((s) => [s.sheet, s.data])), m));
  }
  if (cmd !== 'check' && cmd !== 'publish') { console.log('Usage: pnpm rules:sheet check [--xlsx <file>] | publish [--yes]'); process.exitCode = cmd ? 1 : 0; return; }
  const t = await token(), was = await readSheet(m, t), d = diffSheets(was, m);
  show(d);
  if (cmd === 'publish' && d.length) {
    if (!process.argv.includes('--yes')) { console.log('\nNothing written. Run again with --yes to write these values into the sheet.'); return; }
    await writeSheet(m, was, t);
    console.log(`Published: ${d.length} cell(s) written. Dextrous reads the new values on its next sync.`);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e: Error) => { console.error(e.message); process.exitCode = 1; });
