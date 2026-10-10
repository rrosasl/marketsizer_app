import { useState } from 'react'
import { parseNumber } from '../parseNumber'

const display = (v: number) => (Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : '')

/**
 * Number input that lets people type freely ("3.", "", "-") while showing the latest value from
 * state when not focused (e.g. after an automatic suggestion). With `allowNegative`, a ± button
 * flips the sign — phone number pads usually have no minus key.
 */
export function NumberField(props: {
  value: number
  onChange: (v: number) => void
  label: string
  step?: number
  invalid?: boolean
  className?: string
  suffix?: string
  prefix?: string
  allowNegative?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const flipSign = () => {
    if (!Number.isFinite(props.value) || props.value === 0) return
    props.onChange(-props.value)
    if (draft !== null) setDraft(display(-props.value))
  }
  return (
    <span
      className={`num ${props.className ?? ''} ${props.invalid ? 'invalid' : ''} ${props.allowNegative ? 'has-sign' : ''}`}
    >
      {props.prefix && <span className="num-prefix">{props.prefix}</span>}
      <input
        type={props.allowNegative ? 'text' : 'number'}
        inputMode="decimal"
        aria-label={props.label}
        aria-invalid={props.invalid || undefined}
        step={props.allowNegative ? undefined : (props.step ?? 'any')}
        value={draft ?? display(props.value)}
        onFocus={() => setDraft(display(props.value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value)
          props.onChange(
            props.allowNegative
              ? parseNumber(e.target.value)
              : e.target.value === ''
                ? NaN
                : Number(e.target.value),
          )
        }}
      />
      {props.suffix && <span className="num-suffix">{props.suffix}</span>}
      {props.allowNegative && (
        <button
          type="button"
          className="sign-btn"
          aria-label={`${props.label}: switch between plus and minus`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={flipSign}
        >
          ±
        </button>
      )}
    </span>
  )
}
