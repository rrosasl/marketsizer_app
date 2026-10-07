/**
 * TEMPORARY engine test page (Phase 1). Lets Ricardo change inputs and check the numbers before
 * the real weekend-day page (Phase 3) replaces it. Plain layout on purpose; copy is not final.
 */
import { useDeferredValue, useMemo, useState } from 'react'
import {
  simulate,
  validateEstimate,
  type CorrelationMode,
  type DayDecisions,
  type Estimate,
  type EstimateIssue,
  type SimulationResult,
  type UncertainKey,
} from '../../engine'
import {
  arepaMarkthalle as template,
  type DecisionDef,
  type UncertainInputDef,
} from '../../templates'
import {
  boundsFor,
  defaultScenario,
  effectiveEstimate,
  toSimulationSpec,
  type Scenario,
} from '../../state/scenario'
import { formatEuro } from '../format'
import { ProfitHistogram } from './ProfitHistogram'
import './preview.css'

const DEFAULT_SEED = 12345

function timedSimulate(scenario: Scenario): { result: SimulationResult; ms: number } {
  const t0 = performance.now()
  const result = simulate(toSimulationSpec(template, scenario))
  return { result, ms: performance.now() - t0 }
}

const fmtOrders = (x: number) => (Number.isFinite(x) ? Math.round(x).toLocaleString('en-GB') : '∞')
const fmtPct = (x: number) => `${Math.round(x * 100)}%`
const fmtNum = (x: number) => (Number.isFinite(x) ? String(Math.round(x * 100) / 100) : '')

function issueText(issue: EstimateIssue, def: UncertainInputDef): string {
  switch (issue.kind) {
    case 'not-a-number':
      return 'Please enter a number in every box.'
    case 'order':
      return def.higherIsWorse
        ? 'Worst should be the most expensive and best the cheapest.'
        : 'Worst should be the lowest number and best the highest.'
    case 'below-min':
      return `Can't be below ${fmtNum(issue.min)}.`
    case 'above-max':
      return typeof def.limits.upper !== 'number'
        ? `Can't be more than your opening hours (${fmtNum(issue.max)}).`
        : `Can't be above ${fmtNum(issue.max)}.`
  }
}

function NumberBox(props: {
  value: number
  onChange: (v: number) => void
  step?: number
  disabled?: boolean
  invalid?: boolean
  label: string
}) {
  return (
    <input
      type="number"
      aria-label={props.label}
      className={props.invalid ? 'invalid' : undefined}
      value={Number.isFinite(props.value) ? props.value : ''}
      step={props.step ?? 'any'}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value === '' ? NaN : Number(e.target.value))}
    />
  )
}

function DecisionRow({
  def,
  value,
  onChange,
}: {
  def: DecisionDef
  value: number
  onChange: (v: number) => void
}) {
  const pct = def.unit === '%'
  return (
    <label className="decision">
      <span>
        {def.label}
        {def.help && <small>{def.help}</small>}
      </span>
      <span className="with-unit">
        <NumberBox
          label={def.label}
          value={pct ? Math.round(value * 1000) / 10 : value}
          step={pct ? 0.1 : def.step}
          onChange={(v) => onChange(pct ? v / 100 : v)}
        />
        <em>{def.unit}</em>
      </span>
    </label>
  )
}

export default function EnginePreview() {
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario(template, DEFAULT_SEED))
  const update = (fn: (s: Scenario) => void) =>
    setScenario((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })

  const issues = useMemo(() => {
    const out: Partial<Record<UncertainKey, EstimateIssue>> = {}
    for (const def of template.uncertain) {
      const issue = validateEstimate(
        effectiveEstimate(def, scenario),
        def.higherIsWorse,
        boundsFor(def, scenario),
      )
      if (issue) out[def.key] = issue
    }
    return out
  }, [scenario])
  const decisionsValid = template.decisions.every((d) => Number.isFinite(scenario.decisions[d.key]))
  const valid = Object.keys(issues).length === 0 && decisionsValid

  const deferred = useDeferredValue(scenario)
  const run = useMemo((): { result?: SimulationResult; ms?: number; error?: string } => {
    if (!valid) return {}
    try {
      return timedSimulate(deferred)
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [deferred, valid])

  const basic = template.decisions.filter((d) => !d.advanced)
  const advanced = template.decisions.filter((d) => d.advanced)
  const labelOf = (k: UncertainKey) => template.uncertain.find((d) => d.key === k)!.label

  return (
    <div className="preview">
      <header className="preview-banner">
        <strong>Engine preview</strong> — a temporary test page to check the numbers. The real
        design comes in Phase 3.
      </header>

      <div className="preview-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Your estimates</h2>
            <button
              type="button"
              onClick={() => setScenario(defaultScenario(template, scenario.seed))}
            >
              Reset to defaults
            </button>
          </div>
          <p className="hint">
            <b>Most likely:</b> what you realistically expect on a typical weekend day.{' '}
            <b>Worst / best:</b> realistic bad / good scenarios — roughly a 1-in-10 chance reality
            is worse / better.
          </p>
          <table className="estimates">
            <thead>
              <tr>
                <th />
                <th>Worst</th>
                <th>Most likely</th>
                <th>Best</th>
                <th title="I only know one number">One number</th>
              </tr>
            </thead>
            <tbody>
              {template.uncertain.map((def) => {
                const single = !!scenario.singleNumber[def.key]
                const shown: Estimate = single
                  ? effectiveEstimate(def, scenario)
                  : scenario.uncertain[def.key]
                const issue = issues[def.key]
                const set = (field: keyof Estimate) => (v: number) =>
                  update((s) => {
                    s.uncertain[def.key][field] = v
                  })
                return (
                  <tr key={def.key}>
                    <th scope="row">
                      {def.label} <em>({def.unit})</em>
                      <small>{def.help}</small>
                      {issue && <span className="error">{issueText(issue, def)}</span>}
                    </th>
                    <td>
                      <NumberBox
                        label={`${def.label} worst`}
                        value={round2(shown.worst)}
                        onChange={set('worst')}
                        disabled={single}
                        invalid={!!issue}
                      />
                    </td>
                    <td>
                      <NumberBox
                        label={`${def.label} most likely`}
                        value={shown.base}
                        onChange={set('base')}
                        invalid={!!issue}
                      />
                    </td>
                    <td>
                      <NumberBox
                        label={`${def.label} best`}
                        value={round2(shown.best)}
                        onChange={set('best')}
                        disabled={single}
                        invalid={!!issue}
                      />
                    </td>
                    <td className="center">
                      <input
                        type="checkbox"
                        aria-label={`${def.label}: I only know one number`}
                        checked={single}
                        onChange={(e) =>
                          update((s) => {
                            s.singleNumber[def.key] = e.target.checked
                          })
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <h2>Your choices</h2>
          {basic.map((def) => (
            <DecisionRow
              key={def.key}
              def={def}
              value={scenario.decisions[def.key]}
              onChange={(v) => update((s) => void (s.decisions[def.key as keyof DayDecisions] = v))}
            />
          ))}

          <details className="advanced">
            <summary>Advanced settings</summary>
            {advanced.map((def) => (
              <DecisionRow
                key={def.key}
                def={def}
                value={scenario.decisions[def.key]}
                onChange={(v) =>
                  update((s) => void (s.decisions[def.key as keyof DayDecisions] = v))
                }
              />
            ))}

            <label className="decision">
              <span>
                Linked estimates
                <small>How strongly estimates move together (e.g. busy and quiet hours).</small>
              </span>
              <select
                value={scenario.correlationMode}
                onChange={(e) =>
                  update((s) => void (s.correlationMode = e.target.value as CorrelationMode))
                }
              >
                <option value="independent">Independent</option>
                <option value="default">Default</option>
                <option value="strong">Strong</option>
              </select>
            </label>

            <h3>Limits</h3>
            <p className="hint">The lowest and highest values an estimate can ever take.</p>
            <table className="limits">
              <tbody>
                {template.uncertain.map((def) => {
                  const b = boundsFor(def, scenario)
                  return (
                    <tr key={def.key}>
                      <th scope="row">{def.label}</th>
                      <td>
                        <NumberBox
                          label={`${def.label} minimum`}
                          value={b.lower}
                          onChange={(v) =>
                            update(
                              (s) => void (s.limits[def.key] = { ...s.limits[def.key], lower: v }),
                            )
                          }
                        />
                      </td>
                      <td>to</td>
                      <td>
                        <NumberBox
                          label={`${def.label} maximum`}
                          value={b.upper}
                          onChange={(v) =>
                            update(
                              (s) => void (s.limits[def.key] = { ...s.limits[def.key], upper: v }),
                            )
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <label className="decision">
              <span>
                Random seed
                <small>Same seed + same inputs = exactly the same results.</small>
              </span>
              <span className="with-unit">
                <NumberBox
                  label="Random seed"
                  value={scenario.seed}
                  step={1}
                  onChange={(v) => update((s) => void (s.seed = Math.max(0, Math.floor(v)) >>> 0))}
                />
                <button
                  type="button"
                  onClick={() =>
                    update((s) => void (s.seed = Math.floor(Math.random() * 4294967296) >>> 0))
                  }
                >
                  New
                </button>
              </span>
            </label>
          </details>
        </section>

        <section className="panel results">
          <h2>Results for one weekend day</h2>
          {!valid && <p className="error">Fix the highlighted inputs to see results.</p>}
          {run.error && <p className="error">Something went wrong: {run.error}</p>}
          {run.result && <Results r={run.result} ms={run.ms!} labelOf={labelOf} />}
        </section>
      </div>
    </div>
  )
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}

function Range3({
  p10,
  p50,
  p90,
  fmt,
}: {
  p10: number
  p50: number
  p90: number
  fmt: (x: number) => string
}) {
  return (
    <div className="range3">
      <div className="likely">
        <small>Most likely</small>
        <span>{fmt(p50)}</span>
      </div>
      <div>
        <small>Worst case</small>
        <span>{fmt(p10)}</span>
      </div>
      <div>
        <small>Best case</small>
        <span>{fmt(p90)}</span>
      </div>
    </div>
  )
}

function Results({
  r,
  ms,
  labelOf,
}: {
  r: SimulationResult
  ms: number
  labelOf: (k: UncertainKey) => string
}) {
  const s = r.summary
  const maxAbs = Math.max(...r.sensitivity.map((x) => Math.abs(x.rho)), 1e-9)
  const top = r.sensitivity[0]
  const fallbacks = (Object.keys(r.fits) as UncertainKey[]).filter(
    (k) => r.fits[k] === 'two-piece-normal',
  )
  return (
    <>
      {s.everyOrderLosesMoney && (
        <p className="alert danger">Every order loses money. Check your price or costs.</p>
      )}

      <article className="result">
        <h3>Sales per weekend day</h3>
        <Range3 {...s.grossSales} fmt={formatEuro} />
        <p className="foot">What customers pay, incl. VAT.</p>
      </article>

      <article className="result">
        <h3>Profit per weekend day (after paying yourself)</h3>
        <Range3 {...s.profit} fmt={formatEuro} />
        <p className="big-line">
          Chance your typical weekend day loses money: <b>{fmtPct(s.lossChance)}</b>
        </p>
        <ProfitHistogram profit={r.profit} range={s.profit} />
      </article>

      <article className="result">
        <h3>Break-even</h3>
        <p className="big-line">
          You need about <b>{fmtOrders(s.breakevenOrders.p50)}</b> orders a day to cover your costs.
          You expect about <b>{fmtOrders(s.orders.p50)}</b>.
        </p>
        <p>
          Margin of safety: <b>{s.marginWord}</b>
          {Number.isFinite(s.marginOfSafety) && ` (${fmtPct(s.marginOfSafety)})`}
        </p>
        {s.breakevenAboveCapacity && (
          <p className="alert warn">
            Break-even is more than you can serve in a day (max ~{fmtOrders(s.maxOrdersPerDay)}{' '}
            orders).
          </p>
        )}
      </article>

      <article className="result">
        <h3>What matters most</h3>
        <ul className="drivers">
          {r.sensitivity.map((x) => (
            <li key={x.key}>
              <span>{labelOf(x.key)}</span>
              <span className="bar" style={{ width: `${(Math.abs(x.rho) / maxAbs) * 100}%` }} />
              <small>{x.rho.toFixed(2)}</small>
            </li>
          ))}
        </ul>
        {top && (
          <p>
            Your biggest uncertainty is <b>{labelOf(top.key).toLowerCase()}</b>. Pin this down
            first.
          </p>
        )}
      </article>

      {s.capacity.show && (
        <p className="alert warn">
          You may turn away ~{fmtOrders(s.capacity.lostOrders)} customers (~
          {formatEuro(s.capacity.lostGrossSales)} in sales) at busy times.
        </p>
      )}

      <details className="check">
        <summary>Check: the day with every estimate exactly at “most likely”</summary>
        <table>
          <tbody>
            <tr>
              <th>Orders</th>
              <td>{fmtOrders(r.baseCase.orders)}</td>
            </tr>
            <tr>
              <th>Sales incl. VAT</th>
              <td>{formatEuro(r.baseCase.grossSales)}</td>
            </tr>
            <tr>
              <th>Sales excl. VAT</th>
              <td>{formatEuro(r.baseCase.netSales)}</td>
            </tr>
            <tr>
              <th>Ingredients + packaging</th>
              <td>{formatEuro(r.baseCase.ingredients)}</td>
            </tr>
            <tr>
              <th>Card fees</th>
              <td>{formatEuro(r.baseCase.paymentFees)}</td>
            </tr>
            <tr>
              <th>Rent</th>
              <td>{formatEuro(r.baseCase.rent)}</td>
            </tr>
            <tr>
              <th>Staff</th>
              <td>{formatEuro(r.baseCase.staff)}</td>
            </tr>
            <tr>
              <th>Your pay</th>
              <td>{formatEuro(r.baseCase.ownerPay)}</td>
            </tr>
            <tr>
              <th>Other costs</th>
              <td>{formatEuro(r.baseCase.otherCosts)}</td>
            </tr>
            <tr>
              <th>Profit</th>
              <td>{formatEuro(r.baseCase.profit)}</td>
            </tr>
            <tr>
              <th>Break-even orders</th>
              <td>{fmtOrders(r.baseCase.breakevenOrders)}</td>
            </tr>
          </tbody>
        </table>
        <p className="hint">
          This is not the same as “most likely” above: that is the middle of 10,000 scenarios.
        </p>
      </details>

      <p className="foot">
        Worst/best = 1-in-10 scenarios. Based on {r.draws.toLocaleString('en-GB')} simulated
        scenarios of your inputs · seed {r.seed} · {Math.round(ms)} ms
        {fallbacks.length > 0 &&
          ` · Simpler shape used for: ${fallbacks.map((k) => labelOf(k).toLowerCase()).join(', ')} (very lopsided estimates)`}
      </p>
    </>
  )
}
