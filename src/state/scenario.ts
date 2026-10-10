import {
  UNCERTAIN_KEYS,
  type Bounds,
  type CorrelationMode,
  type DayDecisions,
  type Estimate,
  type Goal,
  type SimulationSpec,
  type UncertainKey,
} from '../engine'
import type { Spread, Template, UncertainInputDef } from '../templates'

export const DEFAULT_DRAWS = 10_000

/** Everything the user can change. Serialised to the URL in Phase 5. */
export interface Scenario {
  uncertain: Record<UncertainKey, Estimate>
  /**
   * Worst/best values the user typed in themselves. All other worst/best values are suggested
   * automatically from "most likely" (template spread) and follow it when it changes.
   */
  manual: Partial<Record<UncertainKey, Partial<Record<Side, boolean>>>>
  /** User overrides of the template limits (Advanced settings). */
  limits: Partial<Record<UncertainKey, Partial<Bounds>>>
  decisions: DayDecisions
  correlationMode: CorrelationMode
  seed: number
  /** The "chance of reaching a goal" question. */
  goal: Goal
}

export function defaultScenario(t: Template, seed: number): Scenario {
  const uncertain = {} as Record<UncertainKey, Estimate>
  for (const def of t.uncertain) uncertain[def.key] = { ...def.defaults }
  const decisions = {} as DayDecisions
  for (const def of t.decisions) decisions[def.key] = def.default
  return {
    uncertain,
    manual: {},
    limits: {},
    decisions,
    correlationMode: 'default',
    seed,
    goal: { ...t.defaultGoal },
  }
}

export type Side = 'worst' | 'best'

export function applySpread(base: number, spread: Spread): Estimate {
  return { worst: base * (1 + spread.worst), base, best: base * (1 + spread.best) }
}

/** Rounds suggestions to friendly numbers: whole numbers from 10 up, one decimal below. */
export function niceRound(x: number): number {
  return Math.abs(x) >= 10 ? Math.round(x) : Math.round(x * 10) / 10
}

/** Suggested worst/best for a "most likely" value. */
export function suggestRange(def: UncertainInputDef, base: number): Record<Side, number> {
  const e = applySpread(base, def.spread)
  return { worst: niceRound(e.worst), best: niceRound(e.best) }
}

/** Sets "most likely"; worst/best the user has not typed follow the suggestion. */
export function setBase(def: UncertainInputDef, s: Scenario, base: number): void {
  const e = s.uncertain[def.key]
  e.base = base
  if (!Number.isFinite(base)) return
  const suggestion = suggestRange(def, base)
  for (const side of ['worst', 'best'] as const) {
    if (!s.manual[def.key]?.[side]) e[side] = suggestion[side]
  }
}

/** The user typed a worst/best value: keep it fixed from now on. */
export function setSide(def: UncertainInputDef, s: Scenario, side: Side, value: number): void {
  s.uncertain[def.key][side] = value
  s.manual[def.key] = { ...s.manual[def.key], [side]: true }
}

/** Go back to the suggested worst/best value. */
export function resetSide(def: UncertainInputDef, s: Scenario, side: Side): void {
  s.manual[def.key] = { ...s.manual[def.key], [side]: false }
  const base = s.uncertain[def.key].base
  if (Number.isFinite(base)) s.uncertain[def.key][side] = suggestRange(def, base)[side]
}

export function boundsFor(def: UncertainInputDef, s: Scenario): Bounds {
  const upper =
    typeof def.limits.upper === 'number' ? def.limits.upper : s.decisions[def.limits.upper.decision]
  const override = s.limits[def.key] ?? {}
  return { lower: override.lower ?? def.limits.lower, upper: override.upper ?? upper }
}

/**
 * The estimate the engine sees. A suggested (not typed) worst/best can fall outside a limit, e.g.
 * busy hours above opening hours: those are clamped back. Typed values are left for validation.
 */
export function effectiveEstimate(def: UncertainInputDef, s: Scenario): Estimate {
  const e = s.uncertain[def.key]
  const b = boundsFor(def, s)
  const clamp = (side: Side) =>
    s.manual[def.key]?.[side] ? e[side] : Math.min(b.upper, Math.max(b.lower, e[side]))
  return { worst: clamp('worst'), base: e.base, best: clamp('best') }
}

export function toSimulationSpec(t: Template, s: Scenario, draws = DEFAULT_DRAWS): SimulationSpec {
  const uncertain = {} as SimulationSpec['uncertain']
  for (const key of UNCERTAIN_KEYS) {
    const def = t.uncertain.find((d) => d.key === key)
    if (!def) throw new Error(`Template ${t.id} is missing input ${key}`)
    uncertain[key] = {
      estimate: effectiveEstimate(def, s),
      higherIsWorse: def.higherIsWorse,
      bounds: boundsFor(def, s),
    }
  }
  return {
    uncertain,
    decisions: s.decisions,
    correlations: t.correlations,
    correlationMode: s.correlationMode,
    seed: s.seed,
    draws,
  }
}
