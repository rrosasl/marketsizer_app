import type { Bounds } from './distribution'

/** A worst / base (most likely) / best estimate as the user enters it. */
export interface Estimate {
  worst: number
  base: number
  best: number
}

export type EstimateIssue =
  | { kind: 'not-a-number'; field: keyof Estimate }
  | { kind: 'order' }
  | { kind: 'below-min'; field: keyof Estimate; min: number }
  | { kind: 'above-max'; field: keyof Estimate; max: number }

const FIELDS = ['worst', 'base', 'best'] as const

/**
 * Checks an estimate before simulation. For "higher is worse" inputs (costs) the expected order is
 * worst ≥ base ≥ best; otherwise worst ≤ base ≤ best. Returns the first issue, or null if valid.
 */
export function validateEstimate(
  e: Estimate,
  higherIsWorse: boolean,
  bounds: Bounds,
): EstimateIssue | null {
  for (const f of FIELDS) if (!Number.isFinite(e[f])) return { kind: 'not-a-number', field: f }
  for (const f of FIELDS) {
    if (e[f] < bounds.lower) return { kind: 'below-min', field: f, min: bounds.lower }
    if (e[f] > bounds.upper) return { kind: 'above-max', field: f, max: bounds.upper }
  }
  const ordered = higherIsWorse
    ? e.worst >= e.base && e.base >= e.best
    : e.worst <= e.base && e.base <= e.best
  return ordered ? null : { kind: 'order' }
}

/** Maps worst/base/best to p10/p50/p90; for costs, worst is the high end (p90). */
export function toPercentiles(e: Estimate, higherIsWorse: boolean) {
  return higherIsWorse
    ? { p10: e.best, p50: e.base, p90: e.worst }
    : { p10: e.worst, p50: e.base, p90: e.best }
}
