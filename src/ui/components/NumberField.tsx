import { useState } from 'react'

const display = (v: number) => (Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : '')

/**
 * Number input that lets people type freely ("3.", "", "-") while showing the latest value from
 * state when not focused (e.g. after an automatic suggestion).
 */
export function NumberField(props: {
  value: number
  onChange: (v: number) => void
  label: string
  step?: number
  invalid?: boolean
  className?: string
  suffix?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <span className={`num ${props.className ?? ''} ${props.invalid ? 'invalid' : ''}`}>
      <input
        type="number"
        inputMode="decimal"
        aria-label={props.label}
        aria-invalid={props.invalid || undefined}
        step={props.step ?? 'any'}
        value={draft ?? display(props.value)}
        onFocus={() => setDraft(display(props.value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value)
          props.onChange(e.target.value === '' ? NaN : Number(e.target.value))
        }}
      />
      {props.suffix && <span className="num-suffix">{props.suffix}</span>}
    </span>
  )
}
