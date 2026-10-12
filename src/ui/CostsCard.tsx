import { costBreakdown, type SimulationResult } from '../engine'
import { Expand } from './components/Expand'
import { InfoTip } from './components/InfoTip'
import { ResultCard } from './components/ResultCard'
import { copy } from './copy'
import { formatEuro } from './format'

const pct = (x: number, total: number) => `${Math.round((x / total) * 100)}%`

/** Most likely day's costs: total, fixed vs variable split, and line items, largest first. */
export function CostsCard({ r, caption }: { r: SimulationResult; caption: string }) {
  const b = costBreakdown(r.medianCostDay)
  if (!(b.total > 0)) return null
  const range = r.summary.dailyCosts
  return (
    <ResultCard
      id="card-costs"
      className="costs"
      title={
        <>
          {copy.costsTitle} <InfoTip text={copy.costsInfo} />
        </>
      }
      sub={copy.costsSub}
      closedLine={copy.costsClosed(formatEuro(b.total), pct(b.fixed, b.total))}
    >
      <span className="eyebrow">{copy.mostLikely}</span>
      <span className="big">{formatEuro(b.total)}</span>

      <div
        className="split"
        role="img"
        aria-label={`${copy.costsFixed} ${formatEuro(b.fixed)}, ${copy.costsVariable} ${formatEuro(b.variable)}`}
      >
        {b.fixed > 0 && <div className="split-fixed" style={{ flexGrow: b.fixed }} />}
        {b.variable > 0 && <div className="split-variable" style={{ flexGrow: b.variable }} />}
      </div>
      <div className="split-legend">
        <span>
          <i className="key key-fixed" />
          {copy.costsFixed} <em>{pct(b.fixed, b.total)}</em>
          <b>{formatEuro(b.fixed)}</b>
          <small>{copy.costsFixedHelp}</small>
        </span>
        <span>
          <i className="key key-variable" />
          {copy.costsVariable} <em>{pct(b.variable, b.total)}</em>
          <b>{formatEuro(b.variable)}</b>
          <small>{copy.costsVariableHelp}</small>
        </span>
      </div>

      <Expand id="costs-items" title={copy.costsMore}>
        <ul className="cost-items">
          {b.items.map((i) => (
            <li key={i.key}>
              <i className={`key key-${i.kind}`} />
              <span className="cost-label">{copy.costItems[i.key]}</span>
              <span className="cost-amount">{formatEuro(i.amount)}</span>
              <span className="cost-share">{pct(i.amount, b.total)}</span>
            </li>
          ))}
        </ul>
      </Expand>
      <p className="footnote">{copy.costsRange(formatEuro(range.p10), formatEuro(range.p90))}</p>
      <p className="card-caption">{caption}</p>
    </ResultCard>
  )
}
