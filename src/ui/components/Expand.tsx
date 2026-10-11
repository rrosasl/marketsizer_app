import type { ReactNode } from 'react'

/** Closed-by-default "show more" section used inside result cards. */
export function Expand({
  title,
  className,
  children,
}: {
  title: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <details className={`more ${className ?? ''}`}>
      <summary>{title}</summary>
      <div className="more-body">{children}</div>
    </details>
  )
}
