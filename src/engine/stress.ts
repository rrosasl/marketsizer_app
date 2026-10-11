import type { DayDecisions, DayUncertain } from './model'
import { simulateDay } from './model'
import { UNCERTAIN_KEYS, type SimulationResult } from './simulate'
import { quantileSorted } from './stats'

/**
 * A hypothetical change applied to every simulated scenario. Multipliers: demand 0.8 = 20% fewer
 * customers (applied before the capacity cap); ingredients 1.2 = dish ingredients and drinks 20%
 * more expensive; fixed 1.2 = rent, wages and other daily costs 20% higher.
 */
export interface StressShock {
  demand: number
  ingredients: number
  fixed: number
}

export interface StressRow {
  shock: StressShock
  /** Most likely (median) daily profit with the shock applied to all scenarios. */
  profit: number
}

export type DemandTolerance =
  /** Customers can fall by `share` (0–1) before most-likely profit hits €0. */
  | { kind: 'can-drop'; share: number }
  /** Below break-even: customers must rise by `share` to reach €0. */
  | { kind: 'needs-more'; share: number }
  /** More customers alone can't reach break-even (serving limit). */
  | { kind: 'capacity' }
  /** Each order loses money, so more customers only make it worse. */
  | { kind: 'loses-per-order' }

export interface StressResult {
  rows: StressRow[]
  tolerance: DemandTolerance
}

export const NO_SHOCK: StressShock = { demand: 1, ingredients: 1, fixed: 1 }

export function applyShock(
  u: DayUncertain,
  d: DayDecisions,
  s: StressShock,
): [DayUncertain, DayDecisions] {
  return [
    {
      ...u,
      peakDemand: u.peakDemand * s.demand,
      offpeakDemand: u.offpeakDemand * s.demand,
      dishCost: u.dishCost * s.ingredients,
    },
    {
      ...d,
      drinkCost: d.drinkCost * s.ingredients,
      rentFixedPerDay: d.rentFixedPerDay * s.fixed,
      staffCostPerHour: d.staffCostPerHour * s.fixed,
      otherCostsPerDay: d.otherCostsPerDay * s.fixed,
    },
  ]
}

/** Upper end of the search for "how many more customers would you need". */
const MAX_DEMAND_MULTIPLIER = 10
/** Stop when the customer multiplier is known to within 0.0001 (far below a whole percent). */
const ROOT_TOLERANCE = 1e-4
const MAX_ROOT_STEPS = 30

/**
 * Stress tests on the existing scenarios (same draws, no new randomness): most-likely profit per
 * shock, and how far customer numbers can move before most-likely profit crosses €0.
 */
export function runStressTests(
  r: SimulationResult,
  decisions: DayDecisions,
  shocks: readonly StressShock[],
): StressResult {
  const n = r.draws
  const x = r.samples
  const profit = new Float64Array(n)
  // One reusable input object; shocked decisions computed once per shock (hot loop).
  const u = {} as DayUncertain
  for (const k of UNCERTAIN_KEYS) u[k] = 0
  const medianProfit = (s: StressShock): number => {
    const [, d] = applyShock(u, decisions, s)
    for (let i = 0; i < n; i++) {
      u.peakHours = x.peakHours[i]!
      u.peakDemand = x.peakDemand[i]! * s.demand
      u.offpeakDemand = x.offpeakDemand[i]! * s.demand
      u.drinkRate = x.drinkRate[i]!
      u.dishesPerOrder = x.dishesPerOrder[i]!
      u.dishCost = x.dishCost[i]! * s.ingredients
      profit[i] = simulateDay(u, d).profit
    }
    return quantileSorted(profit.slice().sort(), 0.5)
  }
  const atDemand = (k: number) => medianProfit({ ...NO_SHOCK, demand: k })

  const rows = shocks.map((shock) => ({ shock, profit: medianProfit(shock) }))

  let tolerance: DemandTolerance
  const base = atDemand(1)
  if (base >= 0) {
    tolerance = { kind: 'can-drop', share: 1 - findRoot(atDemand, 0, 1) }
  } else if (r.summary.everyOrderLosesMoney) {
    tolerance = { kind: 'loses-per-order' }
  } else if (atDemand(MAX_DEMAND_MULTIPLIER) < 0) {
    tolerance = { kind: 'capacity' }
  } else {
    tolerance = { kind: 'needs-more', share: findRoot(atDemand, 1, MAX_DEMAND_MULTIPLIER) - 1 }
  }
  return { rows, tolerance }
}

/**
 * k in [lo, hi] where f(k) crosses 0, for f non-decreasing with f(lo) < 0 ≤ f(hi). Illinois
 * (bracketed secant) method: profit is close to linear in customer numbers, so this needs a handful
 * of evaluations instead of ~15 for bisection, and the bracket keeps it as safe as bisection.
 */
function findRoot(f: (k: number) => number, lo: number, hi: number): number {
  let flo = f(lo)
  let fhi = f(hi)
  let side = 0
  for (let i = 0; i < MAX_ROOT_STEPS && hi - lo > ROOT_TOLERANCE; i++) {
    const k = fhi === flo ? (lo + hi) / 2 : (lo * fhi - hi * flo) / (fhi - flo)
    const fk = f(k)
    if (fk === 0) return k
    if (fk < 0) {
      lo = k
      flo = fk
      if (side === -1) fhi /= 2
      side = -1
    } else {
      hi = k
      fhi = fk
      if (side === 1) flo /= 2
      side = 1
    }
    if (Math.abs(fk) < 0.01) return k
  }
  return (lo + hi) / 2
}
