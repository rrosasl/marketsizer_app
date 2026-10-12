import type { DecisionDef } from '../../templates'
import { copy } from '../copy'
import { InfoTip } from './InfoTip'
import { NumberField } from './NumberField'

/** One single-value choice. Percentages are stored as fractions and shown ×100. */
export function DecisionField({
  def,
  value,
  onChange,
  suggestion,
}: {
  def: DecisionDef
  value: number
  onChange: (v: number) => void
  /** For values suggested from another choice: shows "suggested …" or "Use suggestion". */
  suggestion?: { manual: boolean; note: string; onReset: () => void }
}) {
  const pct = def.unit === '%'
  return (
    <div className="decision">
      <span className="decision-label">
        {def.label}
        {def.help && <InfoTip text={def.help} effect={def.effect} />}
        {suggestion &&
          (suggestion.manual ? (
            <button type="button" className="link-btn" onClick={suggestion.onReset}>
              {copy.useSuggestion}
            </button>
          ) : (
            <span className="badge">{suggestion.note}</span>
          ))}
      </span>
      <NumberField
        label={def.label}
        value={pct ? Math.round(value * 10000) / 100 : value}
        step={pct ? 0.1 : def.step}
        onChange={(v) => onChange(pct ? v / 100 : v)}
        invalid={!Number.isFinite(value)}
        suffix={def.unit}
      />
    </div>
  )
}
