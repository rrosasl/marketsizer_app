import { simulateDay, type DayDecisions, type DayUncertain } from './model'
import { UNCERTAIN_KEYS, type SimulationResult } from './simulate'
import { summarize, type Range } from './stats'

/** Detail behind the Sales card ("More about your sales"). Medians unless a range. */
export interface SalesDetail {
  orders: Range
  /** Average spend per order incl. VAT. */
  spendPerOrder: Range
  foodSales: number
  drinkSales: number
  /** Share of orders served in busy hours. */
  busyShare: number
  /** Customers who wanted to order but could not be served, and what they would have paid. */
  lostOrders: number
  lostSales: number
}

/** Recomputes each scenario's day (no new randomness) to break sales down. */
export function salesDetail(r: SimulationResult, d: DayDecisions): SalesDetail {
  const n = r.draws
  const spend = new Float64Array(n)
  const food = new Float64Array(n)
  const drink = new Float64Array(n)
  const busy = new Float64Array(n)
  const lost = new Float64Array(n)
  const lostSales = new Float64Array(n)
  const u = {} as DayUncertain
  for (let i = 0; i < n; i++) {
    for (const k of UNCERTAIN_KEYS) u[k] = r.samples[k][i]!
    const day = simulateDay(u, d)
    spend[i] = day.avgSpendGross
    food[i] = day.foodSalesGross
    drink[i] = day.drinkSalesGross
    busy[i] = day.orders > 0 ? day.peakOrders / day.orders : 0
    lost[i] = day.lostOrders
    lostSales[i] = day.lostGrossSales
  }
  return {
    orders: r.summary.orders,
    spendPerOrder: summarize(spend),
    foodSales: summarize(food).p50,
    drinkSales: summarize(drink).p50,
    busyShare: summarize(busy).p50,
    lostOrders: summarize(lost).p50,
    lostSales: summarize(lostSales).p50,
  }
}
