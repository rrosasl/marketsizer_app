import type { Range } from '../../engine'
import { formatEuro } from '../format'

const W = 560
const H = 150
const PAD = 22
const BINS = 40

/** Simple histogram of simulated daily profit, losses in red, with worst / most likely / best marks. */
export function ProfitHistogram({ profit, range }: { profit: Float64Array; range: Range }) {
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
  const x = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - 2 * PAD)
  const marks = [
    { v: range.p10, label: 'Worst' },
    { v: range.p50, label: 'Most likely' },
    { v: range.p90, label: 'Best' },
  ]
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 20}`}
      className="histogram"
      role="img"
      aria-label="Spread of daily profit across scenarios"
    >
      {counts.map((c, i) => {
        const v0 = lo + i * width
        const h = (c / max) * (H - PAD)
        return (
          <rect
            key={i}
            x={x(v0) + 0.5}
            y={H - h}
            width={Math.max(0, x(v0 + width) - x(v0) - 1)}
            height={h}
            className={v0 + width / 2 < 0 ? 'loss' : 'gain'}
          />
        )
      })}
      {lo < 0 && hi > 0 && <line x1={x(0)} x2={x(0)} y1={8} y2={H} className="zero" />}
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={x(m.v)} x2={x(m.v)} y1={12} y2={H} className="mark" />
          <text x={x(m.v)} y={10} textAnchor="middle">
            {m.label}
          </text>
        </g>
      ))}
      <text x={PAD} y={H + 16}>
        {formatEuro(lo)}
      </text>
      <text x={W - PAD} y={H + 16} textAnchor="end">
        {formatEuro(hi)}
      </text>
    </svg>
  )
}
