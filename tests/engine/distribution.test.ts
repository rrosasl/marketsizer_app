import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  METALOG3_MAX_SKEW_RATIO,
  fitDistribution,
  metalogQuantile,
  type Bounds,
  type Distribution,
} from '../../src/engine'

const OPEN: Bounds = { lower: -Infinity, upper: Infinity }

/** Within 1% of the target, or 1% of the bounded range when the target is (near) zero. */
function expectReproduces(d: Distribution, p10: number, p50: number, p90: number, scale: number) {
  for (const [u, x] of [
    [0.1, p10],
    [0.5, p50],
    [0.9, p90],
  ] as const) {
    const tol = 0.01 * Math.max(Math.abs(x), 1e-3 * scale)
    expect(Math.abs(d.quantile(u) - x)).toBeLessThanOrEqual(tol)
  }
}

function isMonotone(d: Distribution): boolean {
  let prev = -Infinity
  for (let u = 0.0005; u < 1; u += 0.0005) {
    const x = d.quantile(u)
    if (x < prev - 1e-9) return false
    prev = x
  }
  return true
}

describe('fitDistribution: metalog', () => {
  it('reproduces SPEC §4 defaults exactly (bounded)', () => {
    const cases: [number, number, number, Bounds][] = [
      [2, 3, 4, { lower: 0, upper: 8 }],
      [10, 18, 28, { lower: 0, upper: 150 }],
      [3, 6, 10, { lower: 0, upper: 100 }],
      [10, 12, 14, { lower: 1, upper: 60 }],
      [2.8, 3.2, 3.8, { lower: 0, upper: 30 }],
    ]
    for (const [a, b, c, bounds] of cases) {
      const d = fitDistribution({ p10: a, p50: b, p90: c }, bounds)
      expect(d.kind).toBe('metalog')
      expectReproduces(d, a, b, c, bounds.upper - bounds.lower)
    }
  })

  it('reproduces p10/p50/p90 within 1% for unbounded inputs (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (p50, below, above) => {
          const d = fitDistribution({ p10: p50 - below, p50, p90: p50 + above }, OPEN)
          expectReproduces(d, p50 - below, p50, p50 + above, Math.abs(p50) + below + above)
        },
      ),
    )
  })

  it('reproduces p10/p50/p90 within 1% for bounded inputs (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 0.999, noNaN: true }),
        fc.double({ min: 0.001, max: 0.999, noNaN: true }),
        fc.double({ min: 0.001, max: 0.999, noNaN: true }),
        fc.double({ min: 1, max: 500, noNaN: true }),
        (f1, f2, f3, upper) => {
          const [a, b, c] = [f1, f2, f3].map((f) => f * upper).sort((x, y) => x - y) as [
            number,
            number,
            number,
          ]
          fc.pre(a < b && b < c)
          const d = fitDistribution({ p10: a, p50: b, p90: c }, { lower: 0, upper })
          expectReproduces(d, a, b, c, upper)
          expect(isMonotone(d)).toBe(true)
        },
      ),
    )
  })

  it('reproduces p10/p50/p90 within 1% for lower-bounded inputs (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (a, gap1, gap2) => {
          const d = fitDistribution(
            { p10: a, p50: a + gap1, p90: a + gap1 + gap2 },
            {
              lower: 0,
              upper: Infinity,
            },
          )
          expectReproduces(d, a, a + gap1, a + gap1 + gap2, a + gap1 + gap2)
          for (let u = 0.001; u < 1; u += 0.01) expect(d.quantile(u)).toBeGreaterThan(0)
        },
      ),
    )
  })

  it('never leaves the bounds', () => {
    const d = fitDistribution({ p10: 1, p50: 5, p90: 7.9 }, { lower: 0, upper: 8 })
    for (let z = -8; z <= 8; z += 0.05) {
      const x = d.fromNormal(z)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(8)
    }
  })

  it('handles values sitting exactly on a bound', () => {
    const d = fitDistribution({ p10: 0, p50: 2, p90: 5 }, { lower: 0, upper: 100 })
    expect(d.quantile(0.1)).toBeGreaterThanOrEqual(0)
    expect(d.quantile(0.1)).toBeLessThan(0.2)
    expect(d.quantile(0.5)).toBeCloseTo(2, 6)
    expect(d.quantile(0.9)).toBeCloseTo(5, 6)
  })
})

describe('fitDistribution: feasibility and fallback', () => {
  it('Keelin threshold 1.66711 separates monotone from non-monotone 3-term metalogs', () => {
    const monotone = (ratio: number) => {
      let prev = -Infinity
      for (let y = 1e-6; y < 1; y += 1e-5) {
        const x = metalogQuantile(0, 1, ratio, y)
        if (x < prev) return false
        prev = x
      }
      return true
    }
    expect(monotone(METALOG3_MAX_SKEW_RATIO - 0.01)).toBe(true)
    expect(monotone(-(METALOG3_MAX_SKEW_RATIO - 0.01))).toBe(true)
    expect(monotone(METALOG3_MAX_SKEW_RATIO + 0.05)).toBe(false)
    expect(monotone(-(METALOG3_MAX_SKEW_RATIO + 0.05))).toBe(false)
  })

  it('falls back to a two-piece normal for very lopsided inputs and still hits the percentiles', () => {
    const d = fitDistribution({ p10: 9.9, p50: 10, p90: 30 }, OPEN)
    expect(d.kind).toBe('two-piece-normal')
    expectReproduces(d, 9.9, 10, 30, 30)
    expect(isMonotone(d)).toBe(true)
  })

  it('handles ties (worst = base) via the fallback', () => {
    const d = fitDistribution({ p10: 5, p50: 5, p90: 8 }, { lower: 0, upper: 100 })
    expect(d.kind).toBe('two-piece-normal')
    expect(d.quantile(0.1)).toBeCloseTo(5, 6)
    expect(d.quantile(0.9)).toBeCloseTo(8, 6)
  })

  it('returns a constant when worst = base = best', () => {
    const d = fitDistribution({ p10: 12, p50: 12, p90: 12 }, { lower: 1, upper: 60 })
    expect(d.kind).toBe('constant')
    expect(d.fromNormal(3)).toBe(12)
  })

  it('throws on unordered percentiles', () => {
    expect(() => fitDistribution({ p10: 5, p50: 4, p90: 6 }, OPEN)).toThrow()
  })
})
