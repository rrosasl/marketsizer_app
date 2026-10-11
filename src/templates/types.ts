import type {
  CorrelationPair,
  DayDecisions,
  Estimate,
  Goal,
  StressShock,
  UncertainKey,
} from '../engine'

export type Unit = 'h' | 'orders/h' | '€' | '€/h' | '%' | 'people' | 'orders' | 'dishes'

/** Where an input appears on the page. */
export type Section = 'product' | 'customers' | 'stand' | 'advanced'

/** Suggested range: worst = base × (1 + worst), best = base × (1 + best). */
export interface Spread {
  worst: number
  best: number
}

export interface UncertainInputDef {
  key: UncertainKey
  section: Exclude<Section, 'stand'>
  label: string
  unit: Unit
  /** True for costs: worst is the highest value. */
  higherIsWorse: boolean
  defaults: Estimate
  spread: Spread
  /** Default limits; `upper` may refer to a decision (e.g. busy hours ≤ opening hours). */
  limits: { lower: number; upper: number | { decision: keyof DayDecisions } }
  help: string
  /** How to narrow this estimate down (shown when it is the biggest driver). */
  tip: string
}

export interface DecisionDef {
  key: keyof DayDecisions
  section: Exclude<Section, 'customers'>
  label: string
  unit: Unit
  default: number
  min: number
  max?: number
  step: number
  help?: string
}

export interface Template {
  id: string
  /** Shown on exported cards, e.g. "Arepa stand · Markthalle Berlin". */
  scenarioName: string
  uncertain: UncertainInputDef[]
  decisions: DecisionDef[]
  correlations: CorrelationPair<UncertainKey>[]
  /** Starting question for the goal card. */
  defaultGoal: Goal
  /**
   * Suggested "most orders you can serve per hour" for a number of people on shift:
   * min(perPerson × people^exponent, ceiling), rounded. Extra people share one grill and counter,
   * so each adds a bit less (exponent < 1), up to what the stand itself can handle (ceiling).
   */
  capacitySuggestion: { perPerson: number; exponent: number; ceiling: number }
  /** "What if things go worse than expected?" rows (the first should be no change). */
  stressTests: StressShock[]
}
