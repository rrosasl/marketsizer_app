import { copy } from '../copy'

const fmt = (x: number) => Math.round(x).toLocaleString('en-GB')

/** Expected orders as a bar, with the break-even line and the room (or gap) between them. */
export function BreakevenBar({ expected, breakeven }: { expected: number; breakeven: number }) {
  const finiteBe = Number.isFinite(breakeven)
  const max = Math.max(expected, finiteBe ? breakeven : expected) * 1.15 || 1
  const pct = (x: number) => Math.min(100, (x / max) * 100)
  const ahead = finiteBe && expected >= breakeven
  return (
    <div
      className="bebar"
      role="img"
      aria-label={`${copy.breakevenMarker} ${finiteBe ? fmt(breakeven) : '—'}, ${copy.breakevenExpected} ${fmt(expected)}`}
    >
      <div className="be-track">
        <div
          className="be-fill"
          style={{ width: `${pct(Math.min(expected, finiteBe ? breakeven : expected))}%` }}
        />
        {finiteBe && (
          <div
            className={`be-gap ${ahead ? 'is-ahead' : 'is-behind'}`}
            style={{
              left: `${pct(Math.min(expected, breakeven))}%`,
              width: `${pct(Math.max(expected, breakeven)) - pct(Math.min(expected, breakeven))}%`,
            }}
          />
        )}
        {finiteBe && (
          <div className="be-line" style={{ left: `${pct(breakeven)}%` }}>
            <span>
              {copy.breakevenMarker} <b>{fmt(breakeven)}</b>
            </span>
          </div>
        )}
      </div>
      <div className="be-axis">
        <span>0</span>
        <span className="be-expected" style={{ left: `${pct(expected)}%` }}>
          {copy.breakevenExpected} <b>{fmt(expected)}</b>
        </span>
      </div>
    </div>
  )
}
