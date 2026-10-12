import type { ReactNode } from 'react'
import { useOpen } from '../openState'

/**
 * Collapsible input card. When closed it shows a one-line summary of its values, so a user can
 * fold away what they are done with and keep the results in view.
 */
export function InputCard({
  id,
  title,
  summary,
  children,
}: {
  id: string
  title: ReactNode
  /** One line, e.g. "€9 dish · €3.50 drink". Shown only while closed. */
  summary: string
  children: ReactNode
}) {
  const [open, setOpen] = useOpen(id, true)
  return (
    <details
      className="card input-card"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="input-card-title">
          <h2>{title}</h2>
          {!open && <span className="input-card-summary">{summary}</span>}
        </span>
        <span className="input-card-chevron" aria-hidden="true" />
      </summary>
      <div className="input-card-body">{children}</div>
    </details>
  )
}
