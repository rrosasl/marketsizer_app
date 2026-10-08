import type { Estimate, EstimateIssue } from '../../engine'
import { issueText } from '../issueText'
import type { UncertainInputDef } from '../../templates'
import type { Side } from '../../state/scenario'
import { copy } from '../copy'
import { InfoTip } from './InfoTip'
import { NumberField } from './NumberField'

/** One uncertain input: "most likely" is the primary field, worst/best sit secondary. */
export function EstimateRow(props: {
  def: UncertainInputDef
  value: Estimate
  manual: Partial<Record<Side, boolean>>
  issue: EstimateIssue | undefined
  onBase: (v: number) => void
  onSide: (side: Side, v: number) => void
  onReset: (side: Side) => void
}) {
  const { def, value, manual, issue } = props
  const side = (s: Side) => (
    <div className={`side ${manual[s] ? 'is-manual' : 'is-auto'}`}>
      <span className="field-label">
        {s === 'worst' ? copy.worst : copy.best}
        {manual[s] ? (
          <button type="button" className="link-btn" onClick={() => props.onReset(s)}>
            {copy.useSuggestion}
          </button>
        ) : (
          <span className="badge">{copy.suggested}</span>
        )}
      </span>
      <NumberField
        label={`${def.label}: ${s === 'worst' ? copy.worstCase : copy.bestCase}`}
        value={value[s]}
        onChange={(v) => props.onSide(s, v)}
        invalid={!!issue}
        className="num-side"
      />
    </div>
  )
  return (
    <div className={`estimate ${issue ? 'has-issue' : ''}`}>
      <div className="estimate-head">
        <span className="estimate-label">{def.label}</span>
        <InfoTip text={def.higherIsWorse ? `${def.help} ${copy.costHint}` : def.help} />
        <span className="unit-pill">{def.unit}</span>
      </div>
      <div className="estimate-fields">
        {side('worst')}
        <div className="likely">
          <span className="field-label likely-label">{copy.likely}</span>
          <NumberField
            label={`${def.label}: ${copy.likely}`}
            value={value.base}
            onChange={props.onBase}
            invalid={!!issue}
            className="num-likely"
          />
        </div>
        {side('best')}
      </div>
      {issue && (
        <p className="field-error" role="alert">
          {issueText(issue, def)}
        </p>
      )}
    </div>
  )
}
