import type { Range } from '../../engine'
import { copy } from '../copy'

/**
 * Worst-to-best band with the most-likely point. With `showZero`, a zero line marks where profit
 * turns into loss; the part of the band below zero is tinted.
 */
export function RangeBar({
  range,
  fmt,
  showZero = false,
}: {
  range: Range
  fmt: (x: number) => string
  showZero?: boolean
}) {
  const lo0 = showZero ? Math.min(range.p10, 0) : range.p10
  const hi0 = showZero ? Math.max(range.p90, 0) : range.p90
  const span = hi0 - lo0 || 1
  const lo = lo0 - span * 0.04
  const hi = hi0 + span * 0.04
  const pct = (x: number) => ((x - lo) / (hi - lo)) * 100
  const zero = pct(0)
  const left = pct(range.p10)
  const right = pct(range.p90)
  const crossesZero = showZero && range.p10 < 0
  return (
    <div
      className="rangebar"
      role="img"
      aria-label={`${copy.worstCase} ${fmt(range.p10)}, ${copy.mostLikely} ${fmt(range.p50)}, ${copy.bestCase} ${fmt(range.p90)}`}
    >
      <div className="rb-track">
        <div className="rb-band" style={{ left: `${left}%`, width: `${right - left}%` }} />
        {crossesZero && (
          <div
            className="rb-band rb-band-neg"
            style={{ left: `${left}%`, width: `${Math.min(zero, right) - left}%` }}
          />
        )}
        {showZero && zero > 0 && zero < 100 && (
          <div className="rb-zero" style={{ left: `${zero}%` }}>
            <span>€0</span>
          </div>
        )}
        <div className="rb-dot" style={{ left: `${pct(range.p50)}%` }} />
      </div>
      <div className="rb-labels">
        <span>
          <small>{copy.worstCase}</small>
          {fmt(range.p10)}
        </span>
        <span className="rb-right">
          <small>{copy.bestCase}</small>
          {fmt(range.p90)}
        </span>
      </div>
    </div>
  )
}
