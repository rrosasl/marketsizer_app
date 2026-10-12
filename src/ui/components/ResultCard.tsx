import type { ReactNode } from 'react'
import { useOpen } from '../openState'

/**
 * Collapsible result card (open by default, remembered for the session). When closed it still
 * shows its headline in one line, so the card stays understandable on its own.
 */
export function ResultCard({
  id,
  title,
  sub,
  closedLine,
  className,
  children,
}: {
  id: string
  title: ReactNode
  sub?: string
  /** Headline shown only while closed, e.g. "€174.28 most likely · 80% chance of a profit". */
  closedLine: string
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useOpen(id, true)
  return (
    <details
      className={`card result-card ${className ?? ''}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="card-head result-head">
        <span className="result-head-text">
          <h3>{title}</h3>
          {sub && open && <span className="card-sub">{sub}</span>}
          {!open && <span className="result-closed">{closedLine}</span>}
        </span>
        <span className="input-card-chevron" aria-hidden="true" />
      </summary>
      {children}
    </details>
  )
}
