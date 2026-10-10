import { UNCERTAIN_KEYS, type SimulationResult, type UncertainKey } from './simulate'
import { ranks, sorted, quantileSorted } from './stats'

export type GoalMetric = 'profit' | 'sales'
export type GoalDirection = 'at-least' | 'below'

export interface Goal {
  metric: GoalMetric
  direction: GoalDirection
  /** € per weekend day. */
  amount: number
}

export interface GoalDriver {
  key: UncertainKey
  /** Typical (median) value of the estimate in scenarios that meet the goal. */
  whenMet: number
  /** Typical (median) value across all scenarios. */
  overall: number
  /**
   * How far the scenarios that meet the goal sit from the middle, on a percentile scale from
   * −0.5 to +0.5: the average percentile rank of the estimate among them, minus 0.5.
   */
  shift: number
}

export interface GoalAnalysis {
  /** Share of scenarios that meet the goal. */
  probability: number
  metCount: number
  /** Estimates that differ most in the scenarios that meet the goal, biggest shift first. */
  drivers: GoalDriver[]
}

/** Fewer scenarios than this on either side → too few to describe what it takes. */
export const MIN_SCENARIOS_FOR_DRIVERS = 50

/**
 * Chance of meeting a goal, and what the scenarios that meet it look like: for each estimate,
 * its typical value there versus overall. Pure; uses the draws already simulated.
 */
export function analyzeGoal(r: SimulationResult, goal: Goal): GoalAnalysis {
  const values = goal.metric === 'profit' ? r.profit : r.grossSales
  const n = values.length
  const met = new Uint8Array(n)
  let metCount = 0
  for (let i = 0; i < n; i++) {
    const ok = goal.direction === 'at-least' ? values[i]! >= goal.amount : values[i]! < goal.amount
    if (ok) {
      met[i] = 1
      metCount++
    }
  }
  const probability = n ? metCount / n : NaN

  const drivers: GoalDriver[] = []
  if (metCount >= MIN_SCENARIOS_FOR_DRIVERS && n - metCount >= MIN_SCENARIOS_FOR_DRIVERS) {
    for (const key of UNCERTAIN_KEYS) {
      const x = r.samples[key]
      const rk = ranks(x)
      const sub = new Float64Array(metCount)
      let rankSum = 0
      for (let i = 0, j = 0; i < n; i++) {
        if (!met[i]) continue
        sub[j++] = x[i]!
        rankSum += rk[i]!
      }
      const shift = (rankSum / metCount - 0.5) / n - 0.5
      drivers.push({
        key,
        whenMet: quantileSorted(sorted(sub), 0.5),
        overall: quantileSorted(sorted(x), 0.5),
        shift,
      })
    }
    drivers.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))
  }
  return { probability, metCount, drivers }
}
