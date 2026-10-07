import { describe, expect, it } from 'vitest'
import { arepaMarkthalle } from '../../src/templates'
import { applySpread, defaultScenario, toSimulationSpec } from '../../src/state/scenario'

describe('scenario', () => {
  it('single-number mode applies the template spread', () => {
    const e1 = applySpread(18, { worst: -0.45, best: 0.55 })
    expect(e1.worst).toBeCloseTo(9.9, 9)
    expect(e1.best).toBeCloseTo(27.9, 9)
    const s = defaultScenario(arepaMarkthalle, 1)
    s.singleNumber.costPerOrder = true
    const e2 = toSimulationSpec(arepaMarkthalle, s).uncertain.costPerOrder.estimate
    expect(e2.worst).toBeCloseTo(3.84, 9)
    expect(e2.best).toBeCloseTo(2.816, 9)
  })

  it('busy-hours upper limit follows opening hours; overrides win', () => {
    const s = defaultScenario(arepaMarkthalle, 1)
    s.decisions.openHours = 6
    expect(toSimulationSpec(arepaMarkthalle, s).uncertain.peakHours.bounds).toEqual({
      lower: 0,
      upper: 6,
    })
    s.limits.peakDemand = { upper: 60 }
    expect(toSimulationSpec(arepaMarkthalle, s).uncertain.peakDemand.bounds).toEqual({
      lower: 0,
      upper: 60,
    })
  })
})
