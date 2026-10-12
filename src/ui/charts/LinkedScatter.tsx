const W = 640
const H = 300
const PAD = { l: 44, r: 12, t: 12, b: 40 }
/** Dots drawn (every k-th scenario), enough to show the pattern without clutter. */
const DOTS = 700

/** Scatter of two simulated estimates, to show that they move together. Method page only. */
export function LinkedScatter({
  a,
  b,
  aLabel,
  bLabel,
}: {
  a: Float64Array
  b: Float64Array
  aLabel: string
  bLabel: string
}) {
  const q = (v: Float64Array, p: number) => {
    const s = Float64Array.from(v).sort()
    return s[Math.round(p * (s.length - 1))]!
  }
  const ax = [q(a, 0.01), q(a, 0.99)] as const
  const bx = [q(b, 0.01), q(b, 0.99)] as const
  if (!(ax[1] > ax[0] && bx[1] > bx[0])) return null
  const x = (v: number) => PAD.l + ((v - ax[0]) / (ax[1] - ax[0])) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - ((v - bx[0]) / (bx[1] - bx[0])) * (H - PAD.t - PAD.b)
  const step = Math.max(1, Math.floor(a.length / DOTS))
  const dots: { cx: number; cy: number }[] = []
  for (let i = 0; i < a.length; i += step) {
    const av = a[i]!
    const bv = b[i]!
    if (av < ax[0] || av > ax[1] || bv < bx[0] || bv > bx[1]) continue
    dots.push({ cx: x(av), cy: y(bv) })
  }
  return (
    <figure className="method-figure">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${aLabel} against ${bLabel}`}>
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="baseline" />
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} className="baseline" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={2.4} className="method-dot" />
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 10} textAnchor="middle" className="tick-label">
          {aLabel} →
        </text>
        <text
          x={14}
          y={(PAD.t + H - PAD.b) / 2}
          textAnchor="middle"
          className="tick-label"
          transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}
        >
          {bLabel} →
        </text>
      </svg>
    </figure>
  )
}
