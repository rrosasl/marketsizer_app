import { describe, expect, it } from 'vitest'
import { applyShock, NO_SHOCK, runStressTests, simulate, simulateDay } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario, toSimulationSpec, type Scenario } from '../../src/state/scenario'

const setup = (tweak: (s: Scenario) => void = () => {}) => {
  const s = defaultScenario(arepaMarkthalle, 12345)
  tweak(s)
  const spec = toSimulationSpec(arepaMarkthalle, s)
  const r = simulate(spec)
  return {
    r,
    d: spec.decisions,
    st: runStressTests(r, spec.decisions, arepaMarkthalle.stressTests),
  }
}

const u0 = {
  peakHours: 3,
  peakDemand: 18,
  offpeakDemand: 6,
  drinkRate: 0.5,
  dishesPerOrder: 1,
  dishCost: 3,
}

describe('stress tests', () => {
  const profitable = setup((s) => (s.decisions.dishPrice = 10))

  it('"as expected" equals the most-likely profit on the Profit card', () => {
    expect(profitable.st.rows[0]!.profit).toBeCloseTo(profitable.r.summary.profit.p50, 9)
  })

  it('fewer customers reduce orders and order-dependent costs, not fixed costs', () => {
    const d = profitable.d
    const base = simulateDay(u0, d)
    const [u, dd] = applyShock(u0, d, { ...NO_SHOCK, demand: 0.8 })
    const low = simulateDay(u, dd)
    expect(low.orders).toBeCloseTo(base.orders * 0.8, 9)
    expect(low.ingredients).toBeLessThan(base.ingredients)
    expect(low.fixedPerDay).toBe(base.fixedPerDay)
  })

  it('applies fewer customers before the capacity cap', () => {
    const d = { ...profitable.d, capacityPerHour: 15 }
    const busy = { ...u0, peakDemand: 30, offpeakDemand: 20 }
    const [u, dd] = applyShock(busy, d, { ...NO_SHOCK, demand: 0.9 })
    // 30 → 27 and 20 → 18 wanted per hour, still above the 15 that can be served.
    expect(simulateDay(u, dd).orders).toBe(simulateDay(busy, d).orders)
  })

  it('more expensive ingredients or fixed costs reduce profit; combined shocks hurt more', () => {
    const p = (i: number) => profitable.st.rows[i]!.profit
    expect(p(1)).toBeLessThan(p(0)) // 10% fewer customers
    expect(p(2)).toBeLessThan(p(1))
    expect(p(3)).toBeLessThan(p(2))
    expect(p(4)).toBeLessThan(p(0)) // ingredients +20%
    expect(p(5)).toBeLessThan(p(0)) // fixed +20%
    expect(p(6)).toBeLessThan(p(2)) // 20% fewer + ingredients +15%
  })

  it('combined shock applies each change once', () => {
    const [u, d] = applyShock(u0, profitable.d, { demand: 0.8, ingredients: 1.15, fixed: 1 })
    expect(u.peakDemand).toBeCloseTo(18 * 0.8, 12)
    expect(u.dishCost).toBeCloseTo(3 * 1.15, 12)
    expect(d.drinkCost).toBeCloseTo(profitable.d.drinkCost * 1.15, 12)
    expect(d.rentFixedPerDay).toBe(profitable.d.rentFixedPerDay)
  })

  it('customer tolerance brings most-likely profit to ~€0 (profitable stand)', () => {
    const t = profitable.st.tolerance
    expect(t.kind).toBe('can-drop')
    if (t.kind !== 'can-drop') return
    expect(t.share).toBeGreaterThan(0.1)
    expect(t.share).toBeLessThan(0.3)
    const check = runStressTests(profitable.r, profitable.d, [{ ...NO_SHOCK, demand: 1 - t.share }])
    expect(Math.abs(check.rows[0]!.profit)).toBeLessThan(1)
  })

  it('reports how many more customers a loss-making stand needs', () => {
    const t = setup().st.tolerance // defaults lose money
    expect(t.kind).toBe('needs-more')
    if (t.kind === 'needs-more') expect(t.share).toBeGreaterThan(0)
  })

  it('says when the serving limit blocks break-even, or every order loses money', () => {
    expect(setup((s) => (s.decisions.capacityPerHour = 5)).st.tolerance.kind).toBe('capacity')
    expect(
      setup((s) => {
        s.decisions.dishPrice = 2
        s.decisions.drinkPrice = 0.5
      }).st.tolerance.kind,
    ).toBe('loses-per-order')
  })

  it('runs in well under 100 ms', () => {
    const t0 = performance.now()
    runStressTests(profitable.r, profitable.d, arepaMarkthalle.stressTests)
    expect(performance.now() - t0).toBeLessThan(100)
  })
})

describe('stress tests: loss-making tolerance', () => {
  it('"needs more" multiplier brings most-likely profit to ~€0', () => {
    const s = defaultScenario(arepaMarkthalle, 12345)
    const spec = toSimulationSpec(arepaMarkthalle, s)
    const r = simulate(spec)
    const t = runStressTests(r, spec.decisions, []).tolerance
    expect(t.kind).toBe('needs-more')
    if (t.kind !== 'needs-more') return
    const check = runStressTests(r, spec.decisions, [{ ...NO_SHOCK, demand: 1 + t.share }])
    expect(Math.abs(check.rows[0]!.profit)).toBeLessThan(1)
  })
})
