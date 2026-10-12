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
    expect(r.summary.orders.p10).toBe(72)
    expect(r.summary.orders.p90).toBe(72)
    expect(r.summary.grossSales.p50).toBeCloseTo(878.4, 9)
    expect(r.summary.netSales.p50).toBeCloseTo(811.43, 2)
    expect(r.summary.profit.p10).toBeCloseTo(199.14, 2)
    expect(r.summary.profit.p90).toBeCloseTo(199.14, 2)
    expect(r.summary.breakevenOrders.p50).toBeCloseTo(44.06, 2)
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

  it('capacity note: share of scenarios turning away ≥ 5% of customers', () => {
    const r = simulate(spec(3, (s) => (s.decisions.capacityPerHour = 15)))
    const c = r.summary.limits.capacity
    // Recount from scratch: a scenario is limited when lost ≥ 5% of demand.
    let limited = 0
    for (let i = 0; i < r.draws; i++) {
      const cap = 15
      const ph = Math.min(r.samples.peakHours[i]!, 6)
      const demand = r.samples.peakDemand[i]! * ph + r.samples.offpeakDemand[i]! * (6 - ph)
      const lost =
        Math.max(0, r.samples.peakDemand[i]! - cap) * ph +
        Math.max(0, r.samples.offpeakDemand[i]! - cap) * (6 - ph)
      if (demand > 0 && lost >= 0.05 * demand) limited++
    }
    expect(c.share).toBeCloseTo(limited / r.draws, 12)
    expect(c.show).toBe(c.share >= 0.1)
    expect(c.show).toBe(true)
    expect(c.lostOrders).toBeGreaterThan(0)
    expect(c.lostGrossSales).toBeGreaterThan(0)
    // Lots of room: hardly any scenario is limited, so no note.
    const roomy = simulate(spec(3, (s) => (s.decisions.capacityPerHour = 200)))
    expect(roomy.summary.limits.capacity.share).toBe(0)
    expect(roomy.summary.limits.capacity.show).toBe(false)
  })

  it('sets the "every order loses money" state', () => {
    const r = simulate(
      spec(3, (s) => {
        s.decisions.dishPrice = 2
        s.decisions.drinkPrice = 1
      }),
    )
    expect(r.summary.everyOrderLosesMoney).toBe(true)
    expect(r.summary.breakevenOrders.p50).toBe(Infinity)
  })

  it('ranks drivers by Spearman correlation with profit', () => {
    // Independent mode: each input's own effect, so the signs are unambiguous.
    const r = simulate(spec(5, (s) => (s.correlationMode = 'independent')))
    expect(r.sensitivity).toHaveLength(6)
    for (let i = 1; i < r.sensitivity.length; i++)
      expect(Math.abs(r.sensitivity[i - 1]!.rho)).toBeGreaterThanOrEqual(
        Math.abs(r.sensitivity[i]!.rho),
      )
    expect(r.sensitivity.find((x) => x.key === 'dishCost')!.rho).toBeLessThan(0)
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

describe('cushion label', () => {
  it('follows the chance of a profitable day, not the margin', () => {
    // €10 dish: ~20% margin of safety but ~1-in-3 chance of a losing day → "thin", not "healthy".
    const r = simulate(spec(42, (s) => (s.decisions.dishPrice = 10)))
    expect(r.summary.marginOfSafety).toBeGreaterThan(0.15)
    expect(r.summary.lossChance).toBeGreaterThan(0.1)
    expect(r.summary.marginWord).toBe('thin')
  })
})
