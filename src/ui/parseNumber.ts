/** Parses typed text; accepts "−50" (typographic minus) and "12,5" (comma decimal). */
export function parseNumber(text: string): number {
  const t = text.trim().replace(/−/g, '-').replace(',', '.')
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN
}
