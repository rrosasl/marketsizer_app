import { describe, expect, it } from 'vitest'
import { cushionWord, marginOfSafety, simulateDay, type DayUncertain } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario } from '../../src/state/scenario'

const decisions = defaultScenario(arepaMarkthalle, 1).decisions
const base: DayUncertain = {
  peakHours: 3,
  peakDemand: 18,
  offpeakDemand: 6,
  drinkRate: 0.4,
  dishesPerOrder: 1.2,
  dishCost: 3,
}

describe('simulateDay', () => {
  it('reproduces the SPEC §4 sanity check at base values', () => {
    const r = simulateDay(base, decisions)
    expect(r.orders).toBe(72) // 3 h × 18 + 3 h × 6
    expect(r.avgSpendGross).toBeCloseTo(12.2, 12) // 1.2 × €9 + 0.4 × €3.50
    expect(r.costPerOrder).toBeCloseTo(3.96, 12) // 1.2 × €3.00 + 0.4 × €0.90
    expect(r.grossSales).toBeCloseTo(878.4, 9)
    expect(r.netSales).toBeCloseTo(811.43, 2) // food at 7 % VAT, drinks at 19 %
    expect(r.staff).toBe(144) // 1 person × (6 + 2) h × €18
    expect(r.dailyCosts).toBeCloseTo(612.3, 2)
    expect(r.profit).toBeCloseTo(199.14, 2)
    expect(r.breakevenOrders).toBeCloseTo(44.06, 2)
    expect(marginOfSafety(r.orders, r.breakevenOrders)).toBeCloseTo(0.39, 2)
    expect(r.lostOrders).toBe(0)
  })

  it('splits VAT exactly by food and drinks', () => {
    const r = simulateDay({ ...base, drinkRate: 0 }, decisions)
    expect(r.netSales).toBeCloseTo((72 * 1.2 * 9) / 1.07, 9)
    const d = simulateDay({ ...base, dishesPerOrder: 0, drinkRate: 1 }, decisions)
    expect(d.netSales).toBeCloseTo((72 * 3.5) / 1.19, 9)
  })

  it('costs and prices scale with dishes per order', () => {
    const r = simulateDay({ ...base, dishesPerOrder: 2 }, decisions)
    expect(r.avgSpendGross).toBeCloseTo(2 * 9 + 0.4 * 3.5, 12)
    expect(r.costPerOrder).toBeCloseTo(2 * 3 + 0.4 * 0.9, 12)
  })

  it('caps orders at capacity and counts the rest as lost', () => {
    const r = simulateDay({ ...base, peakDemand: 40 }, decisions)
    expect(r.orders).toBe(20 * 3 + 6 * 3) // 1 person → 20 orders/h
    expect(r.lostOrders).toBe(20 * 3)
    expect(r.demandOrders).toBe(40 * 3 + 6 * 3)
    expect(r.lostGrossSales).toBeCloseTo(60 * 12.2, 9)
  })

  it('caps busy hours at opening hours', () => {
    const r = simulateDay({ ...base, peakHours: 12 }, decisions)
    expect(r.orders).toBe(18 * 6)
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
    expect(b.fixed).toBeCloseTo(120 + 144 + 50, 9)
    expect(b.variable).toBeCloseTo(259.2 + 25.92 + 13.176, 9)
    expect(b.total).toBeCloseTo(r.dailyCosts, 9)
    expect(b.items.map((i) => i.key)).toEqual([
      'dishes',
      'wages',
      'rentFixed',
      'other',
      'drinks',
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
