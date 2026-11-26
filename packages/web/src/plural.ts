/** Russian numerals pick one of three word forms: 1 клетка, 2 клетки, 5 клеток (also 21, 22, 25…; 11–14 take the third). */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100, b = a % 10;
  return a >= 11 && a <= 14 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
}
