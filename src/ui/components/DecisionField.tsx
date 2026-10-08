import type { DecisionDef } from '../../templates'
import { InfoTip } from './InfoTip'
import { NumberField } from './NumberField'

/** One single-value choice. Percentages are stored as fractions and shown ×100. */
export function DecisionField({
  def,
  value,
  onChange,
}: {
  def: DecisionDef
  value: number
  onChange: (v: number) => void
}) {
  const pct = def.unit === '%'
  return (
    <div className="decision">
      <span className="decision-label">
        {def.label}
        {def.help && <InfoTip text={def.help} />}
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
