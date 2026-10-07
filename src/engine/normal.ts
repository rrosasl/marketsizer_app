import type { Rng } from './rng'

/**
 * Standard normal CDF Φ(z). Hart (1968) algorithm 5666 as given by West (2005), "Better
 * approximations to cumulative normal functions": double precision (|err| < 1e-14).
 */
export function normCdf(z: number): number {
  const x = Math.abs(z)
  let c: number
  if (x > 37) {
    c = 0
  } else {
    const e = Math.exp((-x * x) / 2)
    if (x < 7.07106781186547) {
      let n = 3.52624965998911e-2 * x + 0.700383064443688
      n = n * x + 6.37396220353165
      n = n * x + 33.912866078383
      n = n * x + 112.079291497871
      n = n * x + 221.213596169931
      n = n * x + 220.206867912376
      let d = 8.83883476483184e-2 * x + 1.75566716318264
      d = d * x + 16.064177579207
      d = d * x + 86.7807322029461
      d = d * x + 296.564248779674
      d = d * x + 637.333633378831
      d = d * x + 793.826512519948
      d = d * x + 440.413735824752
      c = (e * n) / d
    } else {
      let b = x + 0.65
      b = x + 4 / b
      b = x + 3 / b
      b = x + 2 / b
      b = x + 1 / b
      c = e / b / 2.506628274631
    }
  }
  return z > 0 ? 1 - c : c
}

const A = [
  -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
  -3.066479806614716e1, 2.506628277459239,
] as const
const B = [
  -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
  -1.328068155288572e1,
] as const
const C = [
  -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.54967175044667,
  4.374664141464968, 2.938163982698783,
] as const
const D = [
  7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
] as const
const P_LOW = 0.02425

/** Inverse standard normal CDF Φ⁻¹(p): Acklam's algorithm plus one Halley refinement step. */
export function normInv(p: number): number {
  const x = acklam(p)
  if (!Number.isFinite(x)) return x
  const e = normCdf(x) - p
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2)
  return x - u / (1 + (x * u) / 2)
}

/** Acklam's rational approximation, |rel err| < 1.2e-9. */
function acklam(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (p < P_LOW) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
    )
  }
  if (p > 1 - P_LOW) return -acklam(1 - p)
  const q = p - 0.5
  const r = q * q
  return (
    ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  )
}

/** Fills `out` with independent standard normal draws (Box–Muller, both outputs used). */
export function fillStandardNormals(rng: Rng, out: Float64Array): void {
  for (let i = 0; i < out.length; i += 2) {
    const r = Math.sqrt(-2 * Math.log(1 - rng()))
    const theta = 2 * Math.PI * rng()
    out[i] = r * Math.cos(theta)
    if (i + 1 < out.length) out[i + 1] = r * Math.sin(theta)
  }
}
