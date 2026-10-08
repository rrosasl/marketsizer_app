import { useId } from 'react'

/** ⓘ button that shows a short explanation on hover, keyboard focus or tap. */
export function InfoTip({ text, label = 'More info' }: { text: string; label?: string }) {
  const id = useId()
  return (
    <span className="tip">
      <button type="button" className="tip-btn" aria-label={label} aria-describedby={id}>
        i
      </button>
      <span role="tooltip" id={id} className="tip-bubble">
        {text}
      </span>
    </span>
  )
}
