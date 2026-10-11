import type { SimulationResult } from './simulate'
import { quantileSorted, sorted } from './stats'

/**
 * Investor view (SPEC §6 card 7): an investor co-funds one market day and shares its result in
 * proportion to their part of the day's total costs. With amount A and a day costing C:
 *   share = min(A, C) / C,  investor result = share × day profit.
 * So the return % is profit ÷ costs (the same for any amount up to C); money above C isn't needed
 * and is simply returned. The worst case is losing the whole stake (a day with no sales).
 */
export interface InvestorOutlook {
  amount: number
  /** Median day costs, and the investor's share of them (capped at 100%). */
  typicalCosts: number
  typicalShare: number
  /** True when the amount is at least a typical day's costs. */
  capped: boolean
  /** Most likely (median) result in € for the investor. */
  likelyReturn: number
  /** Chance of earning at least `gain` × amount. */
  chanceGain: number
  /** Chance of any loss. */
  chanceLoss: number
  /** Chance of losing at least `loss` × amount. */
  chanceBigLoss: number
}

/**
 * Threshold (share of the stake) for a dropdown option. Option 0 means "the smallest amount that
 * counts" (e.g. €1), so "earning €1 or more" / "losing €1 or more" rather than a confusing €0.
 */
export function investorThreshold(option: number, amount: number, minEuro: number): number {
  return option > 0 ? option : amount > 0 ? minEuro / amount : 0
}

export function investorOutlook(
  r: SimulationResult,
  amount: number,
  gain: number,
  loss: number,
): InvestorOutlook {
  const n = r.draws
  const result = new Float64Array(n)
  let up = 0
  let down = 0
  let bigDown = 0
  for (let i = 0; i < n; i++) {
    const c = r.dailyCosts[i]!
    const v = c > 0 ? (Math.min(amount, c) / c) * r.profit[i]! : 0
    result[i] = v
    if (v >= gain * amount) up++
    if (v < 0) down++
    // Loss threshold 0 = any loss at all (strictly below €0).
    if (loss > 0 ? v <= -loss * amount : v < 0) bigDown++
  }
  const typicalCosts = quantileSorted(sorted(r.dailyCosts), 0.5)
  return {
    amount,
    typicalCosts,
    typicalShare: typicalCosts > 0 ? Math.min(1, amount / typicalCosts) : 0,
    capped: amount >= typicalCosts,
    likelyReturn: quantileSorted(sorted(result), 0.5),
    chanceGain: up / n,
    chanceLoss: down / n,
    chanceBigLoss: bigDown / n,
  }
}
