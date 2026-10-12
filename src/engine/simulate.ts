import { buildCorrelationMatrix, correlatedNormals, type CorrelationPair } from './copula'
import { fitDistribution, type Bounds, type DistributionKind } from './distribution'
import {
  marginOfSafety,
  cushionWord,
  simulateDay,
  type DayDecisions,
  type DayResult,
  type DayUncertain,
  type MarginWord,
} from './model'
import { createRng } from './rng'
import { shareWhere, spearman, summarize, type Range } from './stats'
import { toPercentiles, type Estimate } from './validate'

export type UncertainKey = keyof DayUncertain

export const UNCERTAIN_KEYS: readonly UncertainKey[] = [
  'peakHours',
  'peakDemand',
  'offpeakDemand',
  'drinkRate',
  'dishesPerOrder',
  'dishCost',
]

export interface UncertainSpec {
  estimate: Estimate
  higherIsWorse: boolean
  bounds: Bounds
}

export type CorrelationMode = 'independent' | 'default' | 'strong'

export interface SimulationSpec {
  uncertain: Record<UncertainKey, UncertainSpec>
  decisions: DayDecisions
  correlations: readonly CorrelationPair<UncertainKey>[]
  correlationMode: CorrelationMode
  seed: number
  draws: number
}

export interface SensitivityItem {
  key: UncertainKey
  /** Spearman rank correlation with daily profit. */
  rho: number
}

/** A scenario counts as limited by capacity when at least this share of demand is turned away. */
export const CAPACITY_LIMITED_SHARE = 0.05
/** A limit note shows when at least this share of scenarios hit the limit. SPEC §6. */
export const LIMIT_NOTE_SHARE = 0.1
export const STRONG_FACTOR = 1.5
export const STRONG_CAP = 0.9

export interface SimulationResult {
  draws: number
  seed: number
  samples: Record<UncertainKey, Float64Array>
  profit: Float64Array
  /** Total daily costs per scenario (for the investor view). */
  dailyCosts: Float64Array
  grossSales: Float64Array
  orders: Float64Array
  fits: Record<UncertainKey, DistributionKind>
  /** The day with every estimate at its base value (a check, not a headline number). */
  baseCase: DayResult
  /**
   * The simulated day whose total costs are the median (most likely) of all scenarios. Used for
   * the cost breakdown, so its line items add up exactly.
   */
  medianCostDay: DayResult
  summary: {
    grossSales: Range
    netSales: Range
    dailyCosts: Range
    profit: Range
    orders: Range
    breakevenOrders: Range
    /** Share of scenarios in which the typical day loses money. */
    lossChance: number
    /** From the most-likely (median) orders and break-even. */
    marginOfSafety: number
    /** Cushion label, based on the chance of a profitable day (not on the margin). */
    marginWord: MarginWord
    /** Median contribution per order ≤ 0: every order loses money. */
    everyOrderLosesMoney: boolean
    /** Median break-even is above the most orders the stand can serve in a day. */
    breakevenAboveCapacity: boolean
    maxOrdersPerDay: number
    /**
     * Limits the simulation ran into (SPEC §6 limit notes). Serving capacity is the only one that
     * can bind: busy hours are drawn within the opening hours, so they are never cut.
     */
    limits: {
      capacity: {
        show: boolean
        /** Share of scenarios turning away ≥ CAPACITY_LIMITED_SHARE of their customers. */
        share: number
        /** Median orders / sales (incl. VAT) turned away, within those scenarios. */
        lostOrders: number
        lostGrossSales: number
      }
    }
  }
  /** All uncertain inputs, strongest driver first. */
  sensitivity: SensitivityItem[]
}

export function correlationsForMode(
  pairs: readonly CorrelationPair<UncertainKey>[],
  mode: CorrelationMode,
): CorrelationPair<UncertainKey>[] {
  if (mode === 'independent') return []
  if (mode === 'default') return [...pairs]
  return pairs.map((p) => ({
    ...p,
    rho: Math.max(-STRONG_CAP, Math.min(STRONG_CAP, p.rho * STRONG_FACTOR)),
  }))
}

/** Runs the weekend-day simulation (SPEC §3, §5, §6). Deterministic for a given spec + seed. */
export function simulate(spec: SimulationSpec): SimulationResult {
  const n = spec.draws
  const keys = UNCERTAIN_KEYS
  const dists = keys.map((k) => {
    const u = spec.uncertain[k]
    return fitDistribution(toPercentiles(u.estimate, u.higherIsWorse), u.bounds)
  })
  const matrix = buildCorrelationMatrix(
    keys,
    correlationsForMode(spec.correlations, spec.correlationMode),
  )
  const z = correlatedNormals(createRng(spec.seed), matrix, n)

  const samples = {} as Record<UncertainKey, Float64Array>
  const fits = {} as Record<UncertainKey, DistributionKind>
  keys.forEach((k, i) => {
    const dist = dists[i]!
    const zi = z[i]!
    const out = new Float64Array(n)
    for (let s = 0; s < n; s++) out[s] = dist.fromNormal(zi[s]!)
    samples[k] = out
    fits[k] = dist.kind
  })

  const profit = new Float64Array(n)
  const grossSales = new Float64Array(n)
  const netSales = new Float64Array(n)
  const dailyCosts = new Float64Array(n)
  const orders = new Float64Array(n)
  const breakeven = new Float64Array(n)
  const contribution = new Float64Array(n)
  // Lost orders and sales in the scenarios limited by capacity (first `limited` entries used).
  const lostOrders = new Float64Array(n)
  const lostGross = new Float64Array(n)
  let limited = 0
  let maxOrdersPerDay = 0
  for (let s = 0; s < n; s++) {
    const r = simulateDay(
      {
        peakHours: samples.peakHours[s]!,
        peakDemand: samples.peakDemand[s]!,
        offpeakDemand: samples.offpeakDemand[s]!,
        drinkRate: samples.drinkRate[s]!,
        dishesPerOrder: samples.dishesPerOrder[s]!,
        dishCost: samples.dishCost[s]!,
      },
      spec.decisions,
    )
    profit[s] = r.profit
    grossSales[s] = r.grossSales
    netSales[s] = r.netSales
    dailyCosts[s] = r.dailyCosts
    orders[s] = r.orders
    breakeven[s] = r.breakevenOrders
    contribution[s] = r.contributionPerOrder
    if (r.demandOrders > 0 && r.lostOrders >= CAPACITY_LIMITED_SHARE * r.demandOrders) {
      lostOrders[limited] = r.lostOrders
      lostGross[limited] = r.lostGrossSales
      limited++
    }
    maxOrdersPerDay = r.maxOrdersPerDay
  }

  const base = {} as DayUncertain
  for (const k of keys) base[k] = spec.uncertain[k].estimate.base
  const baseCase = simulateDay(base, spec.decisions)

  const costsRange = summarize(dailyCosts)
  let medianIdx = 0
  for (let s = 1; s < n; s++) {
    if (
      Math.abs(dailyCosts[s]! - costsRange.p50) < Math.abs(dailyCosts[medianIdx]! - costsRange.p50)
    )
      medianIdx = s
  }
  const at = {} as DayUncertain
  for (const k of keys) at[k] = samples[k][medianIdx]!
  const medianCostDay = simulateDay(at, spec.decisions)

  const ordersRange = summarize(orders)
  const breakevenRange = summarize(breakeven)
  const margin = marginOfSafety(ordersRange.p50, breakevenRange.p50)

  const lossChance = shareWhere(profit, (v) => v < 0)

  const sensitivity = keys
    .map((key) => ({ key, rho: spearman(samples[key], profit) }))
    .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho))

  return {
    draws: n,
    seed: spec.seed,
    samples,
    profit,
    dailyCosts,
    grossSales,
    orders,
    fits,
    baseCase,
    medianCostDay,
    summary: {
      grossSales: summarize(grossSales),
      netSales: summarize(netSales),
      dailyCosts: costsRange,
      profit: summarize(profit),
      orders: ordersRange,
      breakevenOrders: breakevenRange,
      lossChance,
      marginOfSafety: margin,
      marginWord: cushionWord(1 - lossChance),
      everyOrderLosesMoney: summarize(contribution).p50 <= 0,
      breakevenAboveCapacity: breakevenRange.p50 > maxOrdersPerDay,
      maxOrdersPerDay,
      limits: {
        capacity: {
          show: limited / n >= LIMIT_NOTE_SHARE,
          share: limited / n,
          lostOrders: limited ? summarize(lostOrders.subarray(0, limited)).p50 : 0,
          lostGrossSales: limited ? summarize(lostGross.subarray(0, limited)).p50 : 0,
        },
      },
    },
    sensitivity,
  }
}
