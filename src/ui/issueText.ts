import type { EstimateIssue } from '../engine'
import type { UncertainInputDef } from '../templates'
import { copy } from './copy'

const fmt = (x: number) => String(Math.round(x * 100) / 100)

/** Plain-English message for an invalid estimate. */
export function issueText(issue: EstimateIssue, def: UncertainInputDef): string {
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
