import type { CorrelationPair, DayDecisions, Estimate, UncertainKey } from '../engine'

export type Unit = 'h' | 'orders/h' | '€' | '€/h' | '%' | 'people' | 'orders'

/** Single-number mode: worst = base × (1 + worst), best = base × (1 + best). */
export interface Spread {
  worst: number
  best: number
}

export interface UncertainInputDef {
  key: UncertainKey
  label: string
  unit: Unit
  /** True for costs: worst is the highest value. */
  higherIsWorse: boolean
  defaults: Estimate
  spread: Spread
  /** Default limits; `upper` may refer to a decision (e.g. busy hours ≤ opening hours). */
  limits: { lower: number; upper: number | { decision: keyof DayDecisions } }
  help: string
}

export interface DecisionDef {
  key: keyof DayDecisions
  label: string
  unit: Unit
  default: number
  min: number
  max?: number
  step: number
  help?: string
  /** Shown only under Advanced settings. */
  advanced?: boolean
}

export interface Template {
  id: string
  /** Shown on exported cards, e.g. "Arepa stand · Markthalle Berlin". */
  scenarioName: string
  uncertain: UncertainInputDef[]
  decisions: DecisionDef[]
  correlations: CorrelationPair<UncertainKey>[]
}
