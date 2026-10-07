import { normCdf, normInv } from './normal'

/** The three numbers a user gives for an uncertain input, already mapped to percentiles. */
export interface Percentiles {
  p10: number
  p50: number
  p90: number
}

/** Hard limits for an input. Use ±Infinity for an open side. */
export interface Bounds {
  lower: number
  upper: number
}

export type DistributionKind = 'metalog' | 'two-piece-normal' | 'constant'

export interface Distribution {
  kind: DistributionKind
  /** Value at cumulative probability u ∈ (0, 1). */
  quantile(u: number): number
  /** Value for a standard normal draw z (used by the copula; avoids a Φ/Φ⁻¹ round trip). */
  fromNormal(z: number): number
}

const ALPHA = 0.1
const L = Math.log(9) // ln(0.9 / 0.1)
const U_MIN = 1e-6
const U_MAX = 1 - 1e-6
/**
 * Keelin (2016), Table 1: the 3-term metalog is feasible iff a2 > 0 and |a3| / a2 < 1.66711.
 * Verified numerically in tests/engine/distribution.test.ts.
 */
export const METALOG3_MAX_SKEW_RATIO = 1.66711
/** Inputs sitting exactly on a bound are moved this fraction of the bounded range inside it. */
const BOUND_NUDGE = 1e-3
const Z90 = normInv(0.9)

interface Transform {
  to(x: number): number
  from(z: number): number
}

function transformFor({ lower, upper }: Bounds): Transform {
  const hasLower = Number.isFinite(lower)
  const hasUpper = Number.isFinite(upper)
  if (hasLower && hasUpper) {
    return {
      to: (x) => Math.log((x - lower) / (upper - x)),
      from: (z) => {
        // Written to stay finite for large |z|.
        if (z > 0) {
          const e = Math.exp(-z)
          return (lower * e + upper) / (1 + e)
        }
        const e = Math.exp(z)
        return (lower + upper * e) / (1 + e)
      },
    }
  }
  if (hasLower) return { to: (x) => Math.log(x - lower), from: (z) => lower + Math.exp(z) }
  if (hasUpper) return { to: (x) => -Math.log(upper - x), from: (z) => upper - Math.exp(-z) }
  return { to: (x) => x, from: (z) => z }
}

/**
 * Moves values sitting exactly on a bound slightly inside it (the log transforms are infinite on
 * the bound). The nudge is BOUND_NUDGE × scale, but never more than half-way to the nearest value
 * strictly inside, so the order of the three values is preserved. Values inside are untouched.
 */
function nudgeOntoInterior(xs: number[], { lower, upper }: Bounds, scale: number): number[] {
  const eps = BOUND_NUDGE * scale
  let out = xs
  if (Number.isFinite(lower)) {
    const inside = out.filter((x) => x > lower)
    const room = inside.length ? (Math.min(...inside) - lower) / 2 : eps
    const e = Math.min(eps, room)
    out = out.map((x) => (x <= lower ? lower + e : x))
  }
  if (Number.isFinite(upper)) {
    const inside = out.filter((x) => x < upper)
    const room = inside.length ? (upper - Math.max(...inside)) / 2 : eps
    const e = Math.min(eps, room)
    out = out.map((x) => (x >= upper ? upper - e : x))
  }
  return out
}

/** 3-term metalog coefficients in (possibly transformed) space, fitted exactly to p10/p50/p90. */
export function metalogCoefficients(z10: number, z50: number, z90: number) {
  return {
    a1: z50,
    a2: (z90 - z10) / (2 * L),
    a3: (z90 + z10 - 2 * z50) / ((1 - 2 * ALPHA) * L),
  }
}

export function isMetalogFeasible(a2: number, a3: number): boolean {
  return a2 > 0 && Math.abs(a3) / a2 < METALOG3_MAX_SKEW_RATIO
}

export function metalogQuantile(a1: number, a2: number, a3: number, y: number): number {
  const lg = Math.log(y / (1 - y))
  return a1 + a2 * lg + a3 * (y - 0.5) * lg
}

/**
 * Fits a distribution that reproduces p10/p50/p90 and respects the bounds.
 *
 * - All three equal → constant.
 * - Otherwise a 3-term metalog in bound-transformed space (SPEC §5).
 * - If that metalog is infeasible (very lopsided inputs, or ties), a two-piece normal in the same
 *   transformed space: median p50, separate spreads below and above. It also hits all three
 *   percentiles exactly and stays inside the bounds. See DECISIONS.md.
 *
 * Throws if the percentiles are not ordered p10 ≤ p50 ≤ p90 (input validation is the caller's job).
 */
export function fitDistribution(p: Percentiles, bounds: Bounds): Distribution {
  const { p10, p50, p90 } = p
  if (!(p10 <= p50 && p50 <= p90)) {
    throw new Error(`Percentiles must be ordered p10 ≤ p50 ≤ p90, got ${p10}, ${p50}, ${p90}`)
  }
  if (p10 === p90) {
    return { kind: 'constant', quantile: () => p50, fromNormal: () => p50 }
  }

  const range =
    Number.isFinite(bounds.lower) && Number.isFinite(bounds.upper)
      ? bounds.upper - bounds.lower
      : Math.max(Math.abs(p50), p90 - p10, 1)
  const t = transformFor(bounds)
  const [z10, z50, z90] = nudgeOntoInterior([p10, p50, p90], bounds, range).map(t.to) as [
    number,
    number,
    number,
  ]

  const { a1, a2, a3 } = metalogCoefficients(z10, z50, z90)
  if (isMetalogFeasible(a2, a3)) {
    const quantile = (u: number) => {
      const y = Math.min(U_MAX, Math.max(U_MIN, u))
      return t.from(metalogQuantile(a1, a2, a3, y))
    }
    return { kind: 'metalog', quantile, fromNormal: (z) => quantile(normCdf(z)) }
  }

  const sigmaLow = (z50 - z10) / Z90
  const sigmaHigh = (z90 - z50) / Z90
  const fromNormal = (z: number) => t.from(z50 + (z < 0 ? sigmaLow : sigmaHigh) * z)
  return {
    kind: 'two-piece-normal',
    quantile: (u) => fromNormal(normInv(Math.min(U_MAX, Math.max(U_MIN, u)))),
    fromNormal,
  }
}
