import { describe, expect, it } from 'vitest'
import { salesDetail, simulate } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario, toSimulationSpec } from '../../src/state/scenario'

describe('salesDetail', () => {
  it('breaks sales into food, drinks, busy hours and lost customers', () => {
    const s = defaultScenario(arepaMarkthalle, 12345)
    const spec = toSimulationSpec(arepaMarkthalle, s)
    const r = simulate(spec)
    const d = salesDetail(r, spec.decisions)
    expect(d.orders).toEqual(r.summary.orders)
    expect(d.spendPerOrder.p10).toBeLessThan(d.spendPerOrder.p90)
    expect(d.foodSales).toBeGreaterThan(d.drinkSales)
    expect(d.busyShare).toBeGreaterThan(0.5) // 3 busy hours at 18/h vs 3 quiet at 6/h
    expect(d.busyShare).toBeLessThan(1)
    expect(d.lostOrders).toBeGreaterThanOrEqual(0)
  })

  it('counts customers turned away when demand beats capacity', () => {
    const s = defaultScenario(arepaMarkthalle, 12345)
    s.decisions.capacityPerHour = 10
    const spec = toSimulationSpec(arepaMarkthalle, s)
    const d = salesDetail(simulate(spec), spec.decisions)
    expect(d.lostOrders).toBeGreaterThan(0)
    expect(d.lostSales).toBeGreaterThan(0)
  })
})
