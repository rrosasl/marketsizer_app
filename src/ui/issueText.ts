import type { EstimateIssue } from '../engine'
import type { UncertainInputDef } from '../templates'
import { copy } from './copy'

/** Plain-English message for an invalid estimate. */
export function issueText(issue: EstimateIssue, def: UncertainInputDef): string {
  const fmt = (x: number) =>
    def.unit === '%'
      ? `${Math.round(x * 100)}%`
      : def.unit === 'per100'
        ? String(Math.round(x * 100))
        : String(Math.round(x * 100) / 100)
  switch (issue.kind) {
    case 'not-a-number':
      return copy.errors.notANumber
    case 'order':
      return def.higherIsWorse ? copy.errors.orderCost : copy.errors.orderNormal
    case 'below-min':
      return copy.errors.belowMin(fmt(issue.min))
    case 'above-max':
      return typeof def.limits.upper === 'number'
        ? copy.errors.aboveMax(fmt(issue.max))
        : copy.errors.aboveOpenHours(fmt(issue.max))
  }
}
