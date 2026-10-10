import { costBreakdown, type SimulationResult } from '../engine'
import { InfoTip } from './components/InfoTip'
import { copy } from './copy'
import { formatEuro } from './format'

const pct = (x: number, total: number) => `${Math.round((x / total) * 100)}%`

/** Most likely day's costs: total, fixed vs variable split, and line items, largest first. */
export function CostsCard({ r }: { r: SimulationResult }) {
  const b = costBreakdown(r.medianCostDay)
  if (!(b.total > 0)) return null
  const range = r.summary.dailyCosts
  return (
    <article className="card costs">
      <header className="card-head">
        <h3>
          {copy.costsTitle} <InfoTip text={copy.costsInfo} />
        </h3>
        <span className="card-sub">{copy.costsSub}</span>
      </header>
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
      <p className="footnote">{copy.costsRange(formatEuro(range.p10), formatEuro(range.p90))}</p>
    </article>
  )
}
