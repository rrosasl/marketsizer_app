import type { ReactNode } from 'react'

/** Closed-by-default "show more" section used inside result cards. */
export function Expand({
  title,
  className,
  open,
  children,
}: {
  title: ReactNode
  className?: string
  /** Start expanded (the user can still close it). */
  open?: boolean
  children: ReactNode
}) {
  return (
    <details className={`more ${className ?? ''}`} open={open}>
      <summary>{title}</summary>
      <div className="more-body">{children}</div>
    </details>
  )
}
