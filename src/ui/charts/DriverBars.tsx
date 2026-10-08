import type { SensitivityItem, UncertainKey } from '../../engine'
import type { UncertainInputDef } from '../../templates'
import { copy } from '../copy'

const strengthOf = (rho: number): keyof typeof copy.strength =>
  Math.abs(rho) >= 0.5 ? 'strong' : Math.abs(rho) >= 0.25 ? 'medium' : 'small'

/**
 * Impact bars, longest first. Length = how closely profit follows the estimate (|Spearman ρ|).
 * The direction label comes from the model (costs lower profit), not from the sign of ρ, which
 * can flip for linked estimates (see DECISIONS.md).
 */
export function DriverBars({
  items,
  defs,
}: {
  items: SensitivityItem[]
  defs: Record<UncertainKey, UncertainInputDef>
}) {
  const max = Math.max(...items.map((x) => Math.abs(x.rho)), 1e-9)
  return (
    <ol className="drivers">
      {items.slice(0, 5).map((x, i) => {
        const def = defs[x.key]
        const strength = strengthOf(x.rho)
        return (
          <li key={x.key} className={i === 0 ? 'is-top' : undefined}>
            <div className="driver-head">
              <span className="driver-label">{def.label}</span>
              <span className="driver-strength">{copy.strength[strength]}</span>
            </div>
            <div className="driver-track">
              <div
                className="driver-fill"
                style={{ width: `${Math.max(2, (Math.abs(x.rho) / max) * 100)}%` }}
              />
            </div>
            <span className="driver-dir">
              {def.higherIsWorse ? copy.higherLess : copy.higherMore}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
