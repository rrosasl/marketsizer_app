import { useMemo } from 'react'
import {
  analyzeGoal,
  type Goal,
  type GoalDirection,
  type GoalMetric,
  type SimulationResult,
  type UncertainKey,
} from '../engine'
import type { UncertainInputDef } from '../templates'
import { InfoTip } from './components/InfoTip'
import { NumberField } from './components/NumberField'
import { copy } from './copy'
import { formatEuro } from './format'

/** Show at most this many estimates under "What it would take". */
const MAX_DRIVERS = 3
/** Ignore estimates whose typical value barely moves (percentile shift below this). */
const MIN_SHIFT = 0.05

function fmtPct(p: number): string {
  if (p > 0 && p < 0.01) return '<1%'
  if (p < 1 && p > 0.99) return '>99%'
  return `${Math.round(p * 100)}%`
}

function fmtValue(def: UncertainInputDef, x: number): string {
  if (def.unit === '€') return formatEuro(x)
  const v = Math.abs(x) >= 10 ? Math.round(x) : Math.round(x * 10) / 10
  return `${v} ${def.unit}`
}

export function GoalCard({
  r,
  goal,
  onGoal,
  defs,
  baseValues,
}: {
  r: SimulationResult
  goal: Goal
  onGoal: (g: Goal) => void
  defs: Record<UncertainKey, UncertainInputDef>
  baseValues: Record<UncertainKey, number>
}) {
  const valid = Number.isFinite(goal.amount)
  const analysis = useMemo(() => (valid ? analyzeGoal(r, goal) : null), [r, goal, valid])
  const metricWord = copy.goalMetric[goal.metric]
  const likely = goal.metric === 'profit' ? r.summary.profit.p50 : r.summary.grossSales.p50
  const shown = analysis?.drivers
    .filter((d) => Math.abs(d.shift) >= MIN_SHIFT)
    .slice(0, MAX_DRIVERS)
  const p = analysis?.probability ?? 0
  const rare = analysis && analysis.drivers.length === 0 && p < 0.5
  const common = analysis && analysis.drivers.length === 0 && p >= 0.5

  return (
    <article className="card goal">
      <header className="card-head">
        <h3>
          {copy.goalTitle} <InfoTip text={copy.goalInfo} />
        </h3>
      </header>

      <div className="goal-ask">
        <span>{copy.goalAsk}</span>
        <select
          aria-label="Profit or sales"
          value={goal.metric}
          onChange={(e) => onGoal({ ...goal, metric: e.target.value as GoalMetric })}
        >
          {(Object.keys(copy.goalMetric) as GoalMetric[]).map((m) => (
            <option key={m} value={m}>
              {copy.goalMetric[m]}
            </option>
          ))}
        </select>
        <span>{copy.goalOnADay}</span>
        <select
          aria-label="At least or less than"
          value={goal.direction}
          onChange={(e) => onGoal({ ...goal, direction: e.target.value as GoalDirection })}
        >
          {(Object.keys(copy.goalDirection) as GoalDirection[]).map((d) => (
            <option key={d} value={d}>
              {copy.goalDirection[d]}
            </option>
          ))}
        </select>
        <NumberField
          label="Goal amount in euros"
          value={goal.amount}
          step={10}
          className="goal-amount"
          invalid={!valid}
          prefix="€"
          onChange={(v) => onGoal({ ...goal, amount: v })}
        />
        <span>?</span>
      </div>

      {analysis && (
        <>
          <div className="goal-answer">
            <span className="goal-pct">{fmtPct(p)}</span>
            <div className="goal-answer-text">
              <span>
                {copy.goalResult(
                  metricWord,
                  copy.goalDirection[goal.direction],
                  formatEuro(goal.amount),
                )}
              </span>
              <div className="goal-meter" aria-hidden="true">
                <div style={{ width: `${Math.max(p > 0 ? 1 : 0, p * 100)}%` }} />
              </div>
              <span className="card-sub">{copy.goalLikely(metricWord, formatEuro(likely))}</span>
            </div>
          </div>

          <div className="goal-takes">
            <h4>{copy.goalTakesTitle[goal.direction]}</h4>
            {rare && <p className="card-sub">{copy.goalTooRare}</p>}
            {common && <p className="card-sub">{copy.goalTooCommon}</p>}
            {shown && shown.length === 0 && !rare && !common && (
              <p className="card-sub">{copy.goalNothingStandsOut}</p>
            )}
            {shown && shown.length > 0 && (
              <>
                <p className="card-sub">{copy.goalTakesIntro[goal.direction]}</p>
                <ul className="takes">
                  {shown.map((d) => {
                    const def = defs[d.key]
                    const up = d.whenMet > baseValues[d.key]
                    return (
                      <li key={d.key}>
                        <span className={`takes-arrow ${up ? 'up' : 'down'}`} aria-hidden="true">
                          {up ? '↑' : '↓'}
                        </span>
                        <span className="takes-label">{def.label}</span>
                        <span className="takes-when">
                          <small>{copy.goalTakesWhen}</small>
                          {fmtValue(def, d.whenMet)}
                        </span>
                        <span className="takes-you">
                          <small>{copy.goalTakesYou}</small>
                          {fmtValue(def, baseValues[d.key])}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </article>
  )
}
