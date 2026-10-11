import { useMemo } from 'react'
import {
  runStressTests,
  type DayDecisions,
  type Goal,
  type SimulationResult,
  type UncertainKey,
} from '../engine'
import type { Template, UncertainInputDef } from '../templates'
import { BreakevenBar } from './charts/BreakevenBar'
import { DriverBars } from './charts/DriverBars'
import { ProfitSpread } from './charts/ProfitSpread'
import { RangeBar } from './charts/RangeBar'
import { InfoTip } from './components/InfoTip'
import { copy } from './copy'
import { formatEuro } from './format'
import { CostsCard } from './CostsCard'
import { GoalCard } from './GoalCard'
import { StressTable } from './StressSection'
import { cardCaption } from './caption'

const fmtOrders = (x: number) => (Number.isFinite(x) ? Math.round(x).toLocaleString('en-GB') : '—')
const fmtPct = (x: number) => `${Math.round(x * 100)}%`

export function ResultsPanel({
  r,
  defs,
  goal,
  onGoal,
  baseValues,
  decisions,
  template,
}: {
  r: SimulationResult
  defs: Record<UncertainKey, UncertainInputDef>
  goal: Goal
  onGoal: (g: Goal) => void
  baseValues: Record<UncertainKey, number>
  /** The choices `r` was simulated with (for the stress tests). */
  decisions: DayDecisions
  template: Template
}) {
  const s = r.summary
  const profitChance = 1 - s.lossChance
  const top = r.sensitivity[0]
  const stress = useMemo(
    () => runStressTests(r, decisions, template.stressTests),
    [r, decisions, template],
  )
  const caption = cardCaption(template, decisions)
  const tol = stress.tolerance
  const toleranceText =
    tol.kind === 'can-drop'
      ? copy.stress.canDrop(fmtPct(tol.share), fmtOrders(tol.share * s.orders.p50))
      : tol.kind === 'needs-more'
        ? copy.stress.needsMore(fmtPct(tol.share), fmtOrders(tol.share * s.orders.p50))
        : tol.kind === 'capacity'
          ? copy.stress.capacity
          : copy.stress.losesPerOrder
  const fallbacks = (Object.keys(r.fits) as UncertainKey[]).filter(
    (k) => r.fits[k] === 'two-piece-normal',
  )
  const label = (k: UncertainKey) => defs[k].label.toLowerCase()

  return (
    <div className="results">
      {s.everyOrderLosesMoney && <p className="notice notice-danger">{copy.everyOrderLoses}</p>}

      <article className="card card-hero">
        <header className="card-head">
          <h3>{copy.profitTitle}</h3>
          <span className="card-sub">{copy.profitSub}</span>
        </header>
        <div className="hero-row">
          <div>
            <span className="eyebrow">{copy.mostLikely}</span>
            <span className={`hero ${s.profit.p50 < 0 ? 'is-neg' : ''}`}>
              {formatEuro(s.profit.p50)}
            </span>
          </div>
          <div className="chance">
            <svg viewBox="0 0 36 36" className="chance-ring" aria-hidden="true">
              <circle cx="18" cy="18" r="15.9155" className="ring-track" />
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                className="ring-fill"
                strokeDasharray={`${profitChance * 100} ${100 - profitChance * 100}`}
              />
            </svg>
            <div>
              <span className="chance-value">{fmtPct(profitChance)}</span>
              <span className="chance-label">{copy.profitChance}</span>
            </div>
          </div>
        </div>
        <RangeBar range={s.profit} fmt={formatEuro} showZero />
        <details className="spread-toggle">
          <summary>{copy.spreadToggle}</summary>
          <p className="card-sub">{copy.spreadSub}</p>
          <ProfitSpread profit={r.profit} range={s.profit} />
        </details>
        <p className="card-caption">{caption}</p>
      </article>

      <div className="card-pair">
        <article className="card">
          <header className="card-head">
            <h3>{copy.salesTitle}</h3>
            <span className="card-sub">{copy.salesSub}</span>
          </header>
          <span className="eyebrow">{copy.mostLikely}</span>
          <span className="big">{formatEuro(s.grossSales.p50)}</span>
          <p className="sales-net">
            {copy.salesNet(
              formatEuro(s.netSales.p50),
              formatEuro(s.grossSales.p50 - s.netSales.p50),
            )}
          </p>
          <RangeBar range={s.grossSales} fmt={formatEuro} />
          <p className="sales-orders">{copy.salesOrders(fmtOrders(s.orders.p50))}</p>
          <p className="card-caption">{caption}</p>
        </article>

        <CostsCard r={r} caption={caption} />
      </div>

      <article className="card">
        <header className="card-head">
          <h3>{copy.breakevenTitle}</h3>
        </header>
        <p className="lead">
          {copy.breakevenLine(fmtOrders(s.breakevenOrders.p50), fmtOrders(s.orders.p50))}
        </p>
        <BreakevenBar expected={s.orders.p50} breakeven={s.breakevenOrders.p50} />
        <p className={`cushion cushion-${s.marginWord}`}>
          <b>{copy.cushion[s.marginWord]}</b> · {toleranceText}
        </p>
        {s.breakevenAboveCapacity && (
          <p className="notice notice-warn">
            {copy.breakevenAboveCapacity(fmtOrders(s.maxOrdersPerDay))}
          </p>
        )}
        <StressTable rows={stress.rows} />
        <p className="card-caption">{caption}</p>
      </article>

      {s.capacity.show && (
        <aside className="notice notice-grow">
          <b>{copy.capacityTitle}.</b>{' '}
          {copy.capacityText(
            fmtOrders(s.capacity.lostOrders),
            formatEuro(s.capacity.lostGrossSales),
          )}
        </aside>
      )}

      <article className="card">
        <header className="card-head">
          <h3>
            {copy.driversTitle} <InfoTip text={copy.driversInfo} />
          </h3>
          <span className="card-sub">{copy.driversIntro}</span>
        </header>
        <DriverBars items={r.sensitivity} defs={defs} />
        {top && (
          <div className="callout">
            <span className="callout-tag">{copy.startHere}</span>
            <p>
              {copy.biggest(label(top.key))} <span className="tip-text">{defs[top.key].tip}</span>
            </p>
          </div>
        )}
        <p className="card-caption">{caption}</p>
      </article>

      <GoalCard
        r={r}
        goal={goal}
        onGoal={onGoal}
        defs={defs}
        baseValues={baseValues}
        caption={caption}
      />

      <p className="footnote">
        {copy.footnote(r.draws.toLocaleString('en-GB'))}
        {fallbacks.length > 0 && ` ${copy.fallbackNote(fallbacks.map(label).join(', '))}`}
      </p>

      <section className="how">
        <h4>{copy.howTitle}</h4>
        <p>{copy.howText}</p>
      </section>

      <details className="math">
        <summary>{copy.mathTitle}</summary>
        <table>
          <tbody>
            <tr>
              <th>{copy.math.orders}</th>
              <td>{fmtOrders(r.baseCase.orders)}</td>
            </tr>
            <tr>
              <th>{copy.math.gross}</th>
              <td>{formatEuro(r.baseCase.grossSales)}</td>
            </tr>
            <tr>
              <th>{copy.math.net}</th>
              <td>{formatEuro(r.baseCase.netSales)}</td>
            </tr>
            <tr>
              <th>{copy.math.dishes}</th>
              <td>−{formatEuro(r.baseCase.dishIngredients)}</td>
            </tr>
            <tr>
              <th>{copy.math.drinks}</th>
              <td>−{formatEuro(r.baseCase.drinkIngredients)}</td>
            </tr>
            <tr>
              <th>{copy.math.fees}</th>
              <td>−{formatEuro(r.baseCase.paymentFees)}</td>
            </tr>
            <tr>
              <th>{copy.math.rent}</th>
              <td>−{formatEuro(r.baseCase.rent)}</td>
            </tr>
            <tr>
              <th>{copy.math.staff}</th>
              <td>−{formatEuro(r.baseCase.staff)}</td>
            </tr>
            <tr>
              <th>{copy.math.other}</th>
              <td>−{formatEuro(r.baseCase.otherCosts)}</td>
            </tr>
            <tr className="total">
              <th>{copy.math.profit}</th>
              <td>{formatEuro(r.baseCase.profit)}</td>
            </tr>
            <tr>
              <th>{copy.math.breakeven}</th>
              <td>{fmtOrders(r.baseCase.breakevenOrders)}</td>
            </tr>
          </tbody>
        </table>
        <p className="footnote">{copy.mathNote}</p>
      </details>
    </div>
  )
}
