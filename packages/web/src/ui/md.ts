/* Enough Markdown for the lab's reports: headings, lists, tables, bold and code. The reports are made by the lab and the rules package, not typed by people. */
export const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function md(s: string) {
  const inline = (x: string) => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  const out: string[] = [];
  let table: string[][] | null = null;
  const flush = () => { if (table) { out.push(`<table>${table.filter((r) => !r.every((c) => /^:?-+:?$/.test(c.trim()))).map((r, i) => `<tr>${r.map((c) => (i ? `<td>${inline(c.trim())}</td>` : `<th>${inline(c.trim())}</th>`)).join('')}</tr>`).join('')}</table>`); table = null; } };
  for (const line of s.split('\n')) {
    if (line.startsWith('|')) { (table ??= []).push(line.trim().slice(1, -1).split(/(?<!\\)\|/)); continue; }
    flush();
    if (line.startsWith('### ')) out.push(`<h5>${inline(line.slice(4))}</h5>`);
    else if (line.startsWith('## ')) out.push(`<h5>${inline(line.slice(3))}</h5>`);
    else if (line.startsWith('# ')) out.push(`<h4>${inline(line.slice(2))}</h4>`);
    else if (line.startsWith('- ')) out.push(`<p class="li">${inline(line.slice(2))}</p>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return out.join('');
}
