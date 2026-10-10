import { describe, expect, it } from 'vitest'
import { cushionWord, marginOfSafety, simulateDay, type DayUncertain } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario } from '../../src/state/scenario'

const decisions = defaultScenario(arepaMarkthalle, 1).decisions
const base: DayUncertain = {
  peakHours: 3,
  peakDemand: 18,
  offpeakDemand: 6,
  avgSpendGross: 12,
  costPerOrder: 3.2,
}

describe('simulateDay', () => {
  it('reproduces the SPEC §4 sanity check at base values', () => {
    const r = simulateDay(base, decisions)
    expect(r.orders).toBe(84)
    expect(r.grossSales).toBe(1008)
    expect(r.netSales).toBeCloseTo(923.06, 2)
    expect(r.staff).toBe(360) // 2 people × (8 + 2) h × €18
    expect(r.profit).toBeCloseTo(134.14, 2)
    expect(r.breakevenOrders).toBeCloseTo(66.37, 2)
    expect(marginOfSafety(r.orders, r.breakevenOrders)).toBeCloseTo(0.21, 2)
    expect(r.lostOrders).toBe(0)
  })

  it('caps orders at capacity and counts the rest as lost', () => {
    const r = simulateDay({ ...base, peakDemand: 40 }, decisions)
    expect(r.orders).toBe(30 * 3 + 6 * 5)
    expect(r.lostOrders).toBe(10 * 3)
    expect(r.demandOrders).toBe(40 * 3 + 6 * 5)
    expect(r.lostGrossSales).toBe(30 * 12)
  })

  it('caps busy hours at opening hours', () => {
    const r = simulateDay({ ...base, peakHours: 12 }, decisions)
    expect(r.orders).toBe(18 * 8)
  })

  it('flags every order losing money when contribution ≤ 0', () => {
    const r = simulateDay({ ...base, avgSpendGross: 3, costPerOrder: 3.2 }, decisions)
    expect(r.contributionPerOrder).toBeLessThanOrEqual(0)
    expect(r.breakevenOrders).toBe(Infinity)
  })

  it('applies rent as a share of net sales', () => {
    const r = simulateDay(base, { ...decisions, rentRevenueShare: 0.1 })
    expect(r.rent).toBeCloseTo(120 + 0.1 * r.netSales, 9)
  })

  it('labels the cushion from the chance of a profitable day', () => {
    // Based on the chance of a profitable day.
    expect(cushionWord(0.95)).toBe('comfortable')
    expect(cushionWord(0.9)).toBe('comfortable')
    expect(cushionWord(0.68)).toBe('thin')
    expect(cushionWord(0.5)).toBe('thin')
    expect(cushionWord(0.4)).toBe('negative')
  })
})

describe('costBreakdown', () => {
  it('splits base-case costs into fixed and variable, largest first', async () => {
    const { costBreakdown } = await import('../../src/engine')
    const r = simulateDay(base, decisions)
    const b = costBreakdown(r)
    expect(b.fixed).toBeCloseTo(120 + 360 + 25, 9)
    expect(b.variable).toBeCloseTo(268.8 + 15.12, 9)
    expect(b.total).toBeCloseTo(r.dailyCosts, 9)
    expect(b.items.map((i) => i.key)).toEqual([
      'wages',
      'ingredients',
      'rentFixed',
      'other',
      'cardFees',
    ])
  })

  it('counts a rent share of sales as variable', async () => {
    const { costBreakdown } = await import('../../src/engine')
    const r = simulateDay(base, { ...decisions, rentRevenueShare: 0.1 })
    const b = costBreakdown(r)
    expect(b.items.find((i) => i.key === 'rentShare')).toMatchObject({ kind: 'variable' })
    expect(b.total).toBeCloseTo(r.dailyCosts, 9)
  })
})
