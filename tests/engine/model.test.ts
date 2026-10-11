import { describe, expect, it } from 'vitest'
import { cushionWord, marginOfSafety, simulateDay, type DayUncertain } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario } from '../../src/state/scenario'

const decisions = defaultScenario(arepaMarkthalle, 1).decisions
const base: DayUncertain = {
  peakHours: 3,
  peakDemand: 18,
  offpeakDemand: 6,
  drinkRate: 0.5,
  dishesPerOrder: 1,
  dishCost: 3,
}

describe('simulateDay', () => {
  it('reproduces the SPEC §4 sanity check at base values', () => {
    const r = simulateDay(base, decisions)
    expect(r.orders).toBe(84)
    expect(r.avgSpendGross).toBe(9) // 1 × €7 + 0.5 × €4
    expect(r.costPerOrder).toBeCloseTo(3.4, 12) // 1 × €3 + 0.5 × €0.80
    expect(r.grossSales).toBe(756)
    expect(r.netSales).toBeCloseTo(690.71, 2) // food at 7 % VAT, drinks at 19 %
    expect(r.staff).toBe(360) // 2 people × (8 + 2) h × €18
    expect(r.dailyCosts).toBeCloseTo(801.94, 2)
    expect(r.profit).toBeCloseTo(-111.23, 2)
    expect(r.breakevenOrders).toBeCloseTo(107.73, 2)
    expect(marginOfSafety(r.orders, r.breakevenOrders)).toBeCloseTo(-0.28, 2)
    expect(r.lostOrders).toBe(0)
  })

  it('splits VAT exactly by food and drinks', () => {
    const r = simulateDay({ ...base, drinkRate: 0 }, decisions)
    expect(r.netSales).toBeCloseTo((84 * 7) / 1.07, 9)
    const d = simulateDay({ ...base, dishesPerOrder: 0, drinkRate: 1 }, decisions)
    expect(d.netSales).toBeCloseTo((84 * 4) / 1.19, 9)
  })

  it('costs and prices scale with dishes per order', () => {
    const r = simulateDay({ ...base, dishesPerOrder: 2 }, decisions)
    expect(r.avgSpendGross).toBe(16)
    expect(r.costPerOrder).toBeCloseTo(6.4, 12)
  })

  it('caps orders at capacity and counts the rest as lost', () => {
    const r = simulateDay({ ...base, peakDemand: 40 }, decisions)
    expect(r.orders).toBe(30 * 3 + 6 * 5)
    expect(r.lostOrders).toBe(10 * 3)
    expect(r.demandOrders).toBe(40 * 3 + 6 * 5)
    expect(r.lostGrossSales).toBe(30 * 9)
  })

  it('caps busy hours at opening hours', () => {
    const r = simulateDay({ ...base, peakHours: 12 }, decisions)
    expect(r.orders).toBe(18 * 8)
  })

  it('flags every order losing money when contribution ≤ 0', () => {
    const r = simulateDay(base, { ...decisions, dishPrice: 3, drinkPrice: 0.5 })
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
    expect(b.variable).toBeCloseTo(252 + 33.6 + 11.34, 9)
    expect(b.total).toBeCloseTo(r.dailyCosts, 9)
    expect(b.items.map((i) => i.key)).toEqual([
      'wages',
      'dishes',
      'rentFixed',
      'drinks',
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
