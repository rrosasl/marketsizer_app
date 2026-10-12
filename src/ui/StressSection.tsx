import type { StressRow, StressShock } from '../engine'
import { Expand } from './components/Expand'
import { copy } from './copy'
import { formatEuro } from './format'

const pct = (x: number) => `${Math.round(x * 100)}%`

/** Plain-English label built from the shock itself, so template rows need no extra copy. */
function shockLabel(s: StressShock): string {
  const parts: string[] = []
  if (s.demand < 1) parts.push(copy.stress.fewerCustomers(pct(1 - s.demand)))
  if (s.demand > 1) parts.push(copy.stress.moreCustomers(pct(s.demand - 1)))
  if (s.ingredients > 1) parts.push(copy.stress.ingredients(pct(s.ingredients - 1)))
  if (s.fixed > 1) parts.push(copy.stress.fixed(pct(s.fixed - 1)))
  if (!parts.length) return copy.stress.asExpected
  const text = parts.join(' + ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Expandable "What if things go worse than expected?" table (closed by default). */
export function StressTable({ rows }: { rows: StressRow[] }) {
  const lo = Math.min(0, ...rows.map((x) => x.profit))
  const hi = Math.max(0, ...rows.map((x) => x.profit))
  const span = hi - lo || 1
  const pos = (v: number) => ((v - lo) / span) * 100

  return (
    <Expand id="stress" title={copy.stress.title} className="stress">
      <table>
        <thead>
          <tr>
            <th>{copy.stress.colWhatIf}</th>
            <th className="num-col">{copy.stress.colProfit}</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const v = row.profit
            return (
              <tr key={i} className={i === 0 ? 'is-base' : undefined}>
                <td>{shockLabel(row.shock)}</td>
                <td className={`num-col ${v < 0 ? 'neg' : 'pos'}`}>{formatEuro(v)}</td>
                <td className="stress-bar" aria-hidden="true">
                  <span className="stress-zero" style={{ left: `${pos(0)}%` }} />
                  <span
                    className={`stress-fill ${v < 0 ? 'neg' : 'pos'}`}
                    style={{
                      left: `${Math.min(pos(0), pos(v))}%`,
                      width: `${Math.abs(pos(v) - pos(0))}%`,
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="footnote">{copy.stress.note}</p>
    </Expand>
  )
}
