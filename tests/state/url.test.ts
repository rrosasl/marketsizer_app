import { describe, expect, it } from 'vitest'
import { simulate } from '../../src/engine'
import { arepaMarkthalle as t } from '../../src/templates'
import {
  defaultScenario,
  setBase,
  setDecision,
  setSide,
  toSimulationSpec,
} from '../../src/state/scenario'
import { decodeScenario, encodeScenario } from '../../src/state/url'

const def = (key: string) => t.uncertain.find((d) => d.key === key)!

describe('URL state', () => {
  it('round-trips the default scenario with a short link', () => {
    const s = defaultScenario(t, 12345)
    const hash = encodeScenario(t, s)
    expect(hash.length).toBeLessThan(40)
    expect(decodeScenario(t, '#' + hash)).toEqual(s)
  })

  it('round-trips every kind of change', () => {
    const s = defaultScenario(t, 987654321)
    setBase(def('peakDemand'), s, 25)
    setSide(def('dishCost'), s, 'worst', 3.4)
    setDecision(t, s, 'dishPrice', 11)
    setDecision(t, s, 'capacityPerHour', 26)
    s.limits.offpeakDemand = { upper: 40 }
    s.correlationMode = 'strong'
    s.goal = { metric: 'profit', direction: 'below', amount: -50 }
    expect(decodeScenario(t, encodeScenario(t, s))).toEqual(s)
  })

  it('a shared link reproduces exactly the same results', () => {
    const s = defaultScenario(t, 42)
    setDecision(t, s, 'rentFixedPerDay', 180)
    const copyOfLink = decodeScenario(t, encodeScenario(t, s))!
    const a = simulate(toSimulationSpec(t, s))
    const b = simulate(toSimulationSpec(t, copyOfLink))
    expect(Array.from(b.profit)).toEqual(Array.from(a.profit))
  })

  it('ignores garbage instead of crashing', () => {
    expect(decodeScenario(t, '')).toBeNull()
    expect(decodeScenario(t, '#s=not-base64!!')).toBeNull()
    expect(decodeScenario(t, '#s=' + btoa('{"v":99,"s":1}'))).toBeNull()
    const junk = btoa(
      JSON.stringify({
        v: 1,
        s: 7,
        u: { nope: [1, 2, 3], peakDemand: ['x', 1, 2] },
        d: { dishPrice: 'free' },
      }),
    )
    const s = decodeScenario(t, '#s=' + junk)!
    expect(s).toEqual(defaultScenario(t, 7))
  })
})
