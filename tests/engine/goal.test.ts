import { describe, expect, it } from 'vitest'
import { analyzeGoal, simulate, UNCERTAIN_KEYS } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario, toSimulationSpec } from '../../src/state/scenario'

const result = simulate(toSimulationSpec(arepaMarkthalle, defaultScenario(arepaMarkthalle, 9)))

describe('analyzeGoal', () => {
  it('returns the share of scenarios meeting the goal', () => {
    const g = analyzeGoal(result, { metric: 'profit', direction: 'at-least', amount: 200 })
    const expected = Array.from(result.profit).filter((v) => v >= 200).length / result.draws
    expect(g.probability).toBe(expected)
    const below = analyzeGoal(result, { metric: 'profit', direction: 'below', amount: 200 })
    expect(g.probability + below.probability).toBeCloseTo(1, 12)
  })

  it('at-least €0 profit equals the chance of a profitable day', () => {
    const g = analyzeGoal(result, { metric: 'profit', direction: 'at-least', amount: 0 })
    expect(g.probability).toBeCloseTo(1 - result.summary.lossChance, 12)
  })

  it('works on sales too', () => {
    const g = analyzeGoal(result, { metric: 'sales', direction: 'at-least', amount: 1000 })
    const expected = Array.from(result.grossSales).filter((v) => v >= 1000).length / result.draws
    expect(g.probability).toBe(expected)
  })

  it('shows that higher profit goals need more customers', () => {
    const g = analyzeGoal(result, { metric: 'profit', direction: 'at-least', amount: 300 })
    expect(g.drivers).toHaveLength(UNCERTAIN_KEYS.length)
    expect(g.drivers[0]!.key).toBe('peakDemand')
    expect(g.drivers[0]!.whenMet).toBeGreaterThan(g.drivers[0]!.overall)
    expect(g.drivers[0]!.shift).toBeGreaterThan(0)
    for (let i = 1; i < g.drivers.length; i++)
      expect(Math.abs(g.drivers[i - 1]!.shift)).toBeGreaterThanOrEqual(
        Math.abs(g.drivers[i]!.shift),
      )
  })

  it('a loss goal ("below €0") points the other way', () => {
    const g = analyzeGoal(result, { metric: 'profit', direction: 'below', amount: 0 })
    const demand = g.drivers.find((d) => d.key === 'peakDemand')!
    expect(demand.whenMet).toBeLessThan(demand.overall)
  })

  it('gives no drivers when almost nothing (or everything) meets the goal', () => {
    expect(
      analyzeGoal(result, { metric: 'profit', direction: 'at-least', amount: 1e6 }).drivers,
    ).toEqual([])
    expect(
      analyzeGoal(result, { metric: 'profit', direction: 'at-least', amount: -1e6 }).drivers,
    ).toEqual([])
  })
})
