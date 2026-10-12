import type {
  CorrelationPair,
  DayDecisions,
  Estimate,
  Goal,
  StressShock,
  UncertainKey,
} from '../engine'

export type Unit =
  | 'h'
  | 'orders/h'
  | '€'
  | '€/h'
  | '%'
  | 'people'
  | 'orders'
  | 'dishes'
  /** Stored per order (0.4), shown per 10 orders (4). */
  | 'per10'

/** Factor between the stored value and what the user sees: % ×100, "per 10 orders" ×10. */
export const displayScale = (u: Unit) => (u === '%' ? 100 : u === 'per10' ? 10 : 1)

/** Short unit shown next to an input. */
export const unitLabel = (u: Unit) => (u === 'per10' ? 'drinks' : u)

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
   * perPerson × min(people, maxPeople)^exponent, rounded. Extra people share one grill and counter,
   * so each adds a bit less (exponent < 1); beyond maxPeople the suggestion stops growing.
   */
  capacitySuggestion: { perPerson: number; exponent: number; maxPeople: number }
  /** "What if things go worse than expected?" rows (the first should be no change). */
  stressTests: StressShock[]
  /** "For investors" card: default stake and the dropdown choices (shares of the stake). */
  investor: {
    defaults: InvestorChoice
    gainOptions: number[]
    lossOptions: number[]
    /** The 0 option stands for this many euros ("€1 or more"). */
    minEuro: number
  }
}

export interface InvestorChoice {
  /** € the investor puts into one market day. */
  amount: number
  /** "Chance of earning at least gain × amount". */
  gain: number
  /** "Chance of losing at least loss × amount". */
  loss: number
}
