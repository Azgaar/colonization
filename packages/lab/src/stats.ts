export const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const sd = (a: number[]) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) : 0; };
export const quantile = (a: number[], q: number) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(q * b.length))] : 0; };
/** Half-width of a 95% interval for a mean. */
export const ci = (a: number[]) => (a.length > 1 ? (1.96 * sd(a)) / Math.sqrt(a.length) : 0);
/** Wilson interval for a share; 95% unless a wider `z` corrects for many comparisons. */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 1];
  const p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}
export const pct = (x: number, d = 0) => `${(100 * x).toFixed(d)}%`;
export const share = (k: number, n: number) => { const [a, b] = wilson(k, n); return `${pct(n ? k / n : 0)} (${pct(a)}–${pct(b)})`; };
export const meanCi = (a: number[], d = 1) => `${mean(a).toFixed(d)} ±${ci(a).toFixed(d)}`;
/** Difference of paired samples with a 95% half-width. */
export function paired(a: number[], b: number[]): { diff: number; half: number } { const x = a.map((v, i) => b[i] - v); return { diff: mean(x), half: ci(x) }; }
/** Standard normal distribution function (Abramowitz–Stegun 7.1.26, error under 1e-7). */
export function normal(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
/** z for a two-sided interval at level 1 − alpha/tests: Bonferroni's correction for scanning many things at once. */
export function zFor(tests = 1, alpha = 0.05): number {
  const q = 1 - alpha / Math.max(1, tests) / 2;
  let lo = 0, hi = 10;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (normal(m) < q) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
