const W = 640
const H = 170
const BASE = 140
const BINS = 30
const GAP = 4

/**
 * Column histogram of one simulated estimate, with worst / most likely / best ticks. Used on the
 * method page to show how three guesses become 10,000 values.
 */
export function InputSpread({
  values,
  marks,
  unit,
  label,
}: {
  values: Float64Array
  marks: { v: number; label: string }[]
  unit: string
  label: string
}) {
  const s = Float64Array.from(values).sort()
  const lo = s[Math.floor(0.005 * (s.length - 1))]!
  const hi = s[Math.ceil(0.995 * (s.length - 1))]!
  if (!(hi > lo)) return null
  const width = (hi - lo) / BINS
  const counts = new Array<number>(BINS).fill(0)
  for (const v of s) {
    if (v < lo || v > hi) continue
    counts[Math.min(BINS - 1, Math.floor((v - lo) / width))]!++
  }
  const max = Math.max(...counts)
  const colW = W / BINS
  const x = (v: number) => ((v - lo) / (hi - lo)) * W
  return (
    <figure className="method-figure">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {counts.map((c, i) => {
          const h = Math.max(c > 0 ? 2 : 0, (c / max) * (BASE - 16))
          return (
            <rect
              key={i}
              className="method-col"
              x={i * colW + GAP / 2}
              y={BASE - h}
              width={colW - GAP}
              height={h}
              rx={2}
            />
          )
        })}
        <line x1={0} x2={W} y1={BASE} y2={BASE} className="baseline" />
        {marks.map((m) => (
          <g key={m.label}>
            <line x1={x(m.v)} x2={x(m.v)} y1={8} y2={BASE + 6} className="method-mark" />
            <text x={x(m.v)} y={BASE + 22} textAnchor="middle" className="tick-label">
              {m.label} · {Math.round(m.v * 10) / 10} {unit}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  )
}
