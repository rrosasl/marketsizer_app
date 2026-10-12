import type { ReactNode } from 'react'
import { useOpen } from '../openState'

/**
 * "Show more" section (closed by default). Its open/closed state is remembered for the session
 * under `id`.
 */
export function Expand({
  id,
  title,
  className,
  defaultOpen = false,
  children,
}: {
  id: string
  title: ReactNode
  className?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useOpen(id, defaultOpen)
  return (
    <details
      className={`more ${className ?? ''}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>{title}</summary>
      <div className="more-body">{children}</div>
    </details>
  )
}
