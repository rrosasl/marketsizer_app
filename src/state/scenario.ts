import {
  UNCERTAIN_KEYS,
  type Bounds,
  type CorrelationMode,
  type DayDecisions,
  type Estimate,
  type SimulationSpec,
  type UncertainKey,
} from '../engine'
import type { Spread, Template, UncertainInputDef } from '../templates'

export const DEFAULT_DRAWS = 10_000

/** Everything the user can change. Serialised to the URL in Phase 5. */
export interface Scenario {
  uncertain: Record<UncertainKey, Estimate>
  /** Inputs in "I only know one number" mode (worst/best derived from the template spread). */
  singleNumber: Partial<Record<UncertainKey, boolean>>
  /** User overrides of the template limits (Advanced settings). */
  limits: Partial<Record<UncertainKey, Partial<Bounds>>>
  decisions: DayDecisions
  correlationMode: CorrelationMode
  seed: number
}

export function defaultScenario(t: Template, seed: number): Scenario {
  const uncertain = {} as Record<UncertainKey, Estimate>
  for (const def of t.uncertain) uncertain[def.key] = { ...def.defaults }
  const decisions = {} as DayDecisions
  for (const def of t.decisions) decisions[def.key] = def.default
  return { uncertain, singleNumber: {}, limits: {}, decisions, correlationMode: 'default', seed }
}

export function applySpread(base: number, spread: Spread): Estimate {
  return { worst: base * (1 + spread.worst), base, best: base * (1 + spread.best) }
}

export function boundsFor(def: UncertainInputDef, s: Scenario): Bounds {
  const upper =
    typeof def.limits.upper === 'number' ? def.limits.upper : s.decisions[def.limits.upper.decision]
  const override = s.limits[def.key] ?? {}
  return { lower: override.lower ?? def.limits.lower, upper: override.upper ?? upper }
}

/** The estimate the engine sees: in single-number mode, worst/best come from the template spread. */
export function effectiveEstimate(def: UncertainInputDef, s: Scenario): Estimate {
  const e = s.uncertain[def.key]
  const raw = s.singleNumber[def.key] ? applySpread(e.base, def.spread) : e
  // A spread can push past a limit (e.g. busy hours above opening hours): clamp it back.
  const b = boundsFor(def, s)
  const clamp = (x: number) => Math.min(b.upper, Math.max(b.lower, x))
  return { worst: clamp(raw.worst), base: raw.base, best: clamp(raw.best) }
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
