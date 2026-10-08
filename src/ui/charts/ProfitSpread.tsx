import { useState } from 'react'
import type { Range } from '../../engine'
import { copy } from '../copy'
import { formatEuro } from '../format'

const W = 640
const H = 180
const BASE = 150
const BINS = 32
const GAP = 6

/** Column histogram of simulated daily profit: profit in green, loss in red, hover for ranges. */
export function ProfitSpread({ profit, range }: { profit: Float64Array; range: Range }) {
  const [hover, setHover] = useState<number | null>(null)
  const s = Float64Array.from(profit).sort()
  const lo = s[Math.floor(0.01 * (s.length - 1))]!
  const hi = s[Math.ceil(0.99 * (s.length - 1))]!
  if (!(hi > lo)) return null
  const width = (hi - lo) / BINS
  const counts = new Array<number>(BINS).fill(0)
  for (const v of s) {
    if (v < lo || v > hi) continue
    counts[Math.min(BINS - 1, Math.floor((v - lo) / width))]!++
  }
  const max = Math.max(...counts)
  const x = (v: number) => ((v - lo) / (hi - lo)) * W
  const colW = W / BINS
  const marks = [
    { v: range.p10, label: copy.worstCase },
    { v: range.p50, label: copy.mostLikely },
    { v: range.p90, label: copy.bestCase },
  ]
  const readout =
    hover === null
      ? copy.spreadHint
      : copy.spreadReadout(
          formatEuro(lo + hover * width),
          formatEuro(lo + (hover + 1) * width),
          `${Math.max(1, Math.round((counts[hover]! / s.length) * 100))}%`,
        )
  return (
    <figure className="spread">
      <p className="spread-readout" aria-live="polite">
        {readout}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={copy.spreadTitle}>
        {counts.map((c, i) => {
          const v0 = lo + i * width
          const h = Math.max(c > 0 ? 2 : 0, (c / max) * (BASE - 24))
          const isLoss = v0 + width / 2 < 0
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={i * colW} y={0} width={colW} height={BASE} fill="transparent" />
              <path
                className={`col ${isLoss ? 'loss' : 'gain'} ${hover === i ? 'is-hover' : ''}`}
                d={roundedTop(i * colW + GAP / 2, BASE - h, colW - GAP, h, 3)}
              />
            </g>
          )
        })}
        <line x1={0} x2={W} y1={BASE} y2={BASE} className="baseline" />
        {lo < 0 && hi > 0 && (
          <g>
            <line x1={x(0)} x2={x(0)} y1={10} y2={BASE} className="zero" />
            <text x={x(0) + 4} y={18} className="zero-label">
              €0
            </text>
          </g>
        )}
        {marks.map((m) => (
          <g key={m.label}>
            <line x1={x(m.v)} x2={x(m.v)} y1={BASE} y2={BASE + 6} className="tick" />
            <text x={x(m.v)} y={BASE + 20} textAnchor="middle" className="tick-label">
              {m.label}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  )
}

/** Column path with rounded top corners and a square base. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}
