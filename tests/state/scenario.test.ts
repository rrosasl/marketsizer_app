import { describe, expect, it } from 'vitest'
import { arepaMarkthalle } from '../../src/templates'
import {
  applySpread,
  defaultScenario,
  effectiveEstimate,
  resetSide,
  setBase,
  setSide,
  suggestRange,
  toSimulationSpec,
} from '../../src/state/scenario'

describe('scenario', () => {
  it('suggests worst/best from most likely, rounded to friendly numbers', () => {
    const e = applySpread(18, { worst: -0.45, best: 0.55 })
    expect(e.worst).toBeCloseTo(9.9, 9)
    expect(e.best).toBeCloseTo(27.9, 9)
    // Template defaults equal the suggestions for their own "most likely".
    for (const def of arepaMarkthalle.uncertain) {
      const sug = suggestRange(def, def.defaults.base)
      expect(sug.worst).toBeCloseTo(def.defaults.worst, 0)
      expect(sug.best).toBeCloseTo(def.defaults.best, 0)
    }
  })

  it('worst/best follow most likely until the user types them', () => {
    const def = arepaMarkthalle.uncertain.find((d) => d.key === 'peakDemand')!
    const s = defaultScenario(arepaMarkthalle, 1)
    setBase(def, s, 20)
    expect(s.uncertain.peakDemand).toEqual({ worst: 8.9, base: 20, best: 33 })
    setSide(def, s, 'worst', 5)
    setBase(def, s, 30)
    expect(s.uncertain.peakDemand).toEqual({ worst: 5, base: 30, best: 50 })
    resetSide(def, s, 'worst')
    expect(s.uncertain.peakDemand.worst).toBe(13)
  })

  it('clamps suggested (not typed) values to the limits', () => {
    const def = arepaMarkthalle.uncertain.find((d) => d.key === 'peakHours')!
    const s = defaultScenario(arepaMarkthalle, 1)
    setBase(def, s, s.decisions.openHours - 0.5)
    expect(effectiveEstimate(def, s).best).toBe(s.decisions.openHours)
    setSide(def, s, 'best', 9)
    expect(effectiveEstimate(def, s).best).toBe(9)
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

describe('parseNumber', () => {
  it('accepts negatives, typographic minus and comma decimals', async () => {
    const { parseNumber } = await import('../../src/ui/parseNumber')
    expect(parseNumber('-50')).toBe(-50)
    expect(parseNumber('−50')).toBe(-50)
    expect(parseNumber('12,5')).toBe(12.5)
    expect(parseNumber('-')).toBeNaN()
    expect(parseNumber('abc')).toBeNaN()
  })
})

describe('capacity suggestion', () => {
  it('grows with people on shift, with diminishing returns and a ceiling', async () => {
    const { suggestCapacity } = await import('../../src/state/scenario')
    const caps = [0, 1, 2, 3, 4, 5].map((n) => suggestCapacity(arepaMarkthalle, n))
    expect(caps).toEqual([0, 20, 30, 38, 45, 45])
    // Template default matches the suggestion for the default number of people.
    const s = defaultScenario(arepaMarkthalle, 1)
    expect(s.decisions.capacityPerHour).toBe(
      suggestCapacity(arepaMarkthalle, s.decisions.staffCount),
    )
  })

  it('follows people on shift until the user types a capacity', async () => {
    const { setDecision, resetCapacity } = await import('../../src/state/scenario')
    const s = defaultScenario(arepaMarkthalle, 1)
    setDecision(arepaMarkthalle, s, 'staffCount', 3)
    expect(s.decisions.capacityPerHour).toBe(38)
    setDecision(arepaMarkthalle, s, 'capacityPerHour', 25)
    setDecision(arepaMarkthalle, s, 'staffCount', 1)
    expect(s.decisions.capacityPerHour).toBe(25)
    resetCapacity(arepaMarkthalle, s)
    expect(s.decisions.capacityPerHour).toBe(20)
    expect(s.capacityManual).toBe(false)
  })
})
