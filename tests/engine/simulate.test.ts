import { describe, expect, it } from 'vitest'
import { simulate, spearman, UNCERTAIN_KEYS } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario, toSimulationSpec, type Scenario } from '../../src/state/scenario'

const spec = (seed = 42, tweak: (s: Scenario) => void = () => {}) => {
  const s = defaultScenario(arepaMarkthalle, seed)
  tweak(s)
  return toSimulationSpec(arepaMarkthalle, s)
}

const percentile = (a: Float64Array, p: number) =>
  Float64Array.from(a).sort()[Math.round(p * (a.length - 1))]!

describe('simulate', () => {
  it('is reproducible for the same seed and changes with a different seed', () => {
    const a = simulate(spec(42))
    const b = simulate(spec(42))
    const c = simulate(spec(43))
    expect(Array.from(a.profit)).toEqual(Array.from(b.profit))
    expect(a.summary).toEqual(b.summary)
    expect(a.summary.profit.p50).not.toBe(c.summary.profit.p50)
  })

  it('with zero uncertainty, reproduces the sanity check in every scenario', () => {
    const r = simulate(
      spec(1, (s) => {
        for (const k of UNCERTAIN_KEYS) {
          const b = s.uncertain[k].base
          s.uncertain[k] = { worst: b, base: b, best: b }
        }
      }),
    )
    expect(r.summary.orders.p10).toBe(84)
    expect(r.summary.orders.p90).toBe(84)
    expect(r.summary.grossSales.p50).toBe(1008)
    expect(r.summary.netSales.p50).toBeCloseTo(923.06, 2)
    expect(r.summary.profit.p10).toBeCloseTo(134.14, 2)
    expect(r.summary.profit.p90).toBeCloseTo(134.14, 2)
    expect(r.summary.breakevenOrders.p50).toBeCloseTo(66.37, 2)
    expect(r.summary.lossChance).toBe(0)
  })

  it('sampled inputs hit the entered worst/base/best as 10th/50th/90th percentiles', () => {
    const r = simulate(spec(7))
    for (const def of arepaMarkthalle.uncertain) {
      const { worst, base, best } = def.defaults
      const [lo, hi] = def.higherIsWorse ? [best, worst] : [worst, best]
      const x = r.samples[def.key]
      const tol = 0.03 * (hi - lo)
      expect(Math.abs(percentile(x, 0.1) - lo)).toBeLessThan(tol)
      expect(Math.abs(percentile(x, 0.5) - base)).toBeLessThan(tol)
      expect(Math.abs(percentile(x, 0.9) - hi)).toBeLessThan(tol)
    }
  })

  it('sampled inputs keep the target rank correlations (±0.03)', () => {
    const r = simulate(spec(11))
    for (const { a, b, rho } of arepaMarkthalle.correlations) {
      expect(Math.abs(spearman(r.samples[a], r.samples[b]) - rho)).toBeLessThanOrEqual(0.03)
    }
  })

  it('shows the capacity alert when most-likely demand exceeds capacity', () => {
    const r = simulate(spec(3, (s) => (s.decisions.capacityPerHour = 15)))
    expect(r.summary.capacity.show).toBe(true)
    expect(r.summary.capacity.lostOrders).toBeGreaterThan(0)
    expect(simulate(spec(3)).summary.capacity.show).toBe(false)
  })

  it('sets the "every order loses money" state', () => {
    const r = simulate(
      spec(3, (s) => {
        s.uncertain.avgSpendGross = { worst: 2.5, base: 3, best: 3.5 }
        s.uncertain.costPerOrder = { worst: 4, base: 3.5, best: 3 }
      }),
    )
    expect(r.summary.everyOrderLosesMoney).toBe(true)
    expect(r.summary.breakevenOrders.p50).toBe(Infinity)
  })

  it('ranks drivers by Spearman correlation with profit', () => {
    // Independent mode: each input's own effect, so the signs are unambiguous.
    const r = simulate(spec(5, (s) => (s.correlationMode = 'independent')))
    expect(r.sensitivity).toHaveLength(5)
    for (let i = 1; i < r.sensitivity.length; i++)
      expect(Math.abs(r.sensitivity[i - 1]!.rho)).toBeGreaterThanOrEqual(
        Math.abs(r.sensitivity[i]!.rho),
      )
    expect(r.sensitivity.find((x) => x.key === 'costPerOrder')!.rho).toBeLessThan(0)
    expect(r.sensitivity.find((x) => x.key === 'peakDemand')!.rho).toBeGreaterThan(0)
  })

  it('runs 10,000 draws + sensitivity in under 200 ms', () => {
    simulate(spec(1)) // warm-up (JIT)
    const t0 = performance.now()
    simulate(spec(2))
    expect(performance.now() - t0).toBeLessThan(200)
  })
})

describe('median cost day', () => {
  it('is an actual scenario whose total costs are the median', () => {
    const r = simulate(spec(4))
    expect(r.medianCostDay.dailyCosts).toBeCloseTo(r.summary.dailyCosts.p50, 0)
    expect(r.summary.dailyCosts.p10).toBeLessThan(r.summary.dailyCosts.p90)
  })
})
