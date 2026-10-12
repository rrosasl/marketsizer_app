import { useId } from 'react'
import { copy } from '../copy'

/**
 * ⓘ button that shows a short explanation on hover, keyboard focus or tap. `effect` adds how
 * changing the value moves the results.
 */
export function InfoTip({
  text,
  effect,
  label = 'More info',
}: {
  text: string
  effect?: string
  label?: string
}) {
  const id = useId()
  return (
    <span className="tip">
      <button type="button" className="tip-btn" aria-label={label} aria-describedby={id}>
        i
      </button>
      <span role="tooltip" id={id} className="tip-bubble">
        {text}
        {effect && (
          <span className="tip-effect">
            <b>{copy.tipEffect}</b> {effect}
          </span>
        )}
      </span>
    </span>
  )
}
