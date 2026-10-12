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
import type { InvestorChoice, Spread, Template, UncertainInputDef } from '../templates'

export const DEFAULT_DRAWS = 10_000

/** Everything the user can change. Serialised to the URL in Phase 5. */
export interface Scenario {
  uncertain: Record<UncertainKey, Estimate>
  /**
   * Worst/best values the user typed in themselves. All other worst/best values are suggested
   * automatically from "most likely" (template spread) and follow it when it changes.
   */
  manual: Partial<Record<UncertainKey, Partial<Record<Side, boolean>>>>
  /** True once the user typed their own capacity; until then it follows people on shift. */
  capacityManual: boolean
  /** User overrides of the template limits (Advanced settings). */
  limits: Partial<Record<UncertainKey, Partial<Bounds>>>
  decisions: DayDecisions
  correlationMode: CorrelationMode
  seed: number
  /** The "chance of reaching a goal" question. */
  goal: Goal
  /** "For investors" card choices. */
  investor: InvestorChoice
}

export function defaultScenario(t: Template, seed: number): Scenario {
  const uncertain = {} as Record<UncertainKey, Estimate>
  for (const def of t.uncertain) uncertain[def.key] = { ...def.defaults }
  const decisions = {} as DayDecisions
  for (const def of t.decisions) decisions[def.key] = def.default
  return {
    uncertain,
    manual: {},
    capacityManual: false,
    limits: {},
    decisions,
    correlationMode: 'default',
    seed,
    goal: { ...t.defaultGoal },
    investor: { ...t.investor.defaults },
  }
}

export type Side = 'worst' | 'best'

/** Suggested orders per hour for a number of people on shift (see Template.capacitySuggestion). */
export function suggestCapacity(t: Template, people: number): number {
  if (!(people > 0)) return 0
  const { perPerson, exponent, maxPeople } = t.capacitySuggestion
  return Math.round(perPerson * Math.min(people, maxPeople) ** exponent)
}

/**
 * Sets a choice. Changing people on shift also updates the capacity suggestion, unless the user
 * typed their own capacity; typing a capacity stops it from following.
 */
export function setDecision(
  t: Template,
  s: Scenario,
  key: keyof DayDecisions,
  value: number,
): void {
  s.decisions[key] = value
  if (key === 'capacityPerHour') s.capacityManual = true
  if (key === 'staffCount' && !s.capacityManual && Number.isFinite(value)) {
    s.decisions.capacityPerHour = suggestCapacity(t, value)
  }
}

/** Go back to the suggested capacity for the current number of people. */
export function resetCapacity(t: Template, s: Scenario): void {
  s.capacityManual = false
  s.decisions.capacityPerHour = suggestCapacity(t, s.decisions.staffCount)
}

export function applySpread(base: number, spread: Spread): Estimate {
  return { worst: base * (1 + spread.worst), base, best: base * (1 + spread.best) }
}

/** Rounds suggestions to friendly numbers: whole numbers from 10 up, one decimal below. */
export function niceRound(x: number): number {
  return Math.abs(x) >= 10 ? Math.round(x) : Math.round(x * 10) / 10
}

/** Rounding for suggestions by unit: whole percent, €0.05, 0.05 dishes, otherwise friendly numbers. */
function roundFor(def: UncertainInputDef, x: number): number {
  // 0.01 per order = 0.1 per 10 orders = 1 percentage point.
  if (def.unit === '%' || def.unit === 'per10') return Math.round(x * 100) / 100
  if (def.unit === 'dishes' || def.unit === '€') return Math.round(x * 20) / 20
  return niceRound(x)
}

/** Suggested worst/best for a "most likely" value, kept inside the default limits. */
export function suggestRange(def: UncertainInputDef, base: number): Record<Side, number> {
  const e = applySpread(base, def.spread)
  const upper = typeof def.limits.upper === 'number' ? def.limits.upper : Infinity
  const clamp = (x: number) => Math.min(upper, Math.max(def.limits.lower, x))
  return { worst: clamp(roundFor(def, e.worst)), best: clamp(roundFor(def, e.best)) }
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
