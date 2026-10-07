/** Sorted copy of the values (ascending; −Infinity/Infinity sort to the ends). */
export function sorted(values: ArrayLike<number>): Float64Array {
  return Float64Array.from(values).sort()
}

/** Quantile of already-sorted values, linear interpolation (Hyndman–Fan type 7). */
export function quantileSorted(s: Float64Array, p: number): number {
  if (s.length === 0) return NaN
  const h = (s.length - 1) * p
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  const a = s[lo]!
  const b = s[hi]!
  if (lo === hi || a === b) return a
  return a + (h - lo) * (b - a)
}

export interface Range {
  /** Worst-to-best as 10th / 50th / 90th percentile of the simulated values. */
  p10: number
  p50: number
  p90: number
}

export function summarize(values: ArrayLike<number>): Range {
  const s = sorted(values)
  return { p10: quantileSorted(s, 0.1), p50: quantileSorted(s, 0.5), p90: quantileSorted(s, 0.9) }
}

export function shareWhere(values: ArrayLike<number>, predicate: (v: number) => boolean): number {
  let count = 0
  for (let i = 0; i < values.length; i++) if (predicate(values[i]!)) count++
  return values.length ? count / values.length : NaN
}

/** Ranks 1..n with ties given their average rank. */
export function ranks(values: ArrayLike<number>): Float64Array {
  const n = values.length
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a]! - values[b]!)
  const r = new Float64Array(n)
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && values[idx[j + 1]!] === values[idx[i]!]) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) r[idx[k]!] = avg
    i = j + 1
  }
  return r
}

/** Pearson correlation; 0 if either series is constant. */
export function pearson(x: ArrayLike<number>, y: ArrayLike<number>): number {
  const n = x.length
  let mx = 0
  let my = 0
  for (let i = 0; i < n; i++) {
    mx += x[i]!
    my += y[i]!
  }
  mx /= n
  my /= n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx
    const dy = y[i]! - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0
}

/** Spearman rank correlation; 0 if either series is constant. */
export function spearman(x: ArrayLike<number>, y: ArrayLike<number>): number {
  return pearson(ranks(x), ranks(y))
}
