import { fillStandardNormals } from './normal'
import type { Rng } from './rng'

/** Pearson correlation for a Gaussian copula that yields the given Spearman (rank) correlation. */
export function rankToPearson(rho: number): number {
  return 2 * Math.sin((Math.PI * rho) / 6)
}

/** Lower-triangular Cholesky factor of a symmetric matrix. Throws if it is not positive definite. */
export function cholesky(m: readonly (readonly number[])[]): number[][] {
  const n = m.length
  const l: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = m[i]![j]!
      for (let k = 0; k < j; k++) sum -= l[i]![k]! * l[j]![k]!
      if (i === j) {
        if (!(sum > 1e-12)) throw new Error('Correlation matrix is not positive definite')
        l[i]![i] = Math.sqrt(sum)
      } else {
        l[i]![j] = sum / l[j]![j]!
      }
    }
  }
  return l
}

export interface CorrelationPair<K extends string = string> {
  a: K
  b: K
  /** Target rank (Spearman) correlation. */
  rho: number
}

/** Builds the Gaussian-copula Pearson matrix for `keys` from rank-correlation pairs. */
export function buildCorrelationMatrix<K extends string>(
  keys: readonly K[],
  pairs: readonly CorrelationPair<K>[],
): number[][] {
  const m: number[][] = keys.map((_, i) => keys.map((__, j) => (i === j ? 1 : 0)))
  for (const { a, b, rho } of pairs) {
    const i = keys.indexOf(a)
    const j = keys.indexOf(b)
    if (i < 0 || j < 0 || i === j) continue
    const r = rankToPearson(rho)
    m[i]![j] = r
    m[j]![i] = r
  }
  return m
}

/**
 * Draws n correlated standard-normal vectors. Returns one Float64Array per dimension.
 * Z = L · ε with ε ~ N(0, I) and L the Cholesky factor of the correlation matrix.
 */
export function correlatedNormals(rng: Rng, matrix: number[][], n: number): Float64Array[] {
  const dim = matrix.length
  const l = cholesky(matrix)
  const eps = Array.from({ length: dim }, () => new Float64Array(n))
  for (const e of eps) fillStandardNormals(rng, e)
  const out = Array.from({ length: dim }, () => new Float64Array(n))
  for (let i = 0; i < dim; i++) {
    const row = l[i]!
    const target = out[i]!
    for (let k = 0; k <= i; k++) {
      const c = row[k]!
      if (c === 0) continue
      const src = eps[k]!
      for (let s = 0; s < n; s++) target[s] = target[s]! + c * src[s]!
    }
  }
  return out
}
