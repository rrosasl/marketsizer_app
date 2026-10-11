import { useDeferredValue, useMemo, useState } from 'react'
import {
  simulate,
  validateEstimate,
  type CorrelationMode,
  type DayDecisions,
  type EstimateIssue,
  type SimulationResult,
  type UncertainKey,
} from '../engine'
import {
  arepaMarkthalle as template,
  displayScale,
  type DecisionDef,
  type Section,
  type UncertainInputDef,
} from '../templates'
import {
  boundsFor,
  defaultScenario,
  effectiveEstimate,
  resetCapacity,
  resetSide,
  setBase,
  setDecision,
  setSide,
  toSimulationSpec,
  type Scenario,
} from '../state/scenario'
import { DecisionField } from './components/DecisionField'
import { EstimateRow } from './components/EstimateRow'
import { InfoTip } from './components/InfoTip'
import { NumberField } from './components/NumberField'
import { copy } from './copy'
import { formatEuro } from './format'
import { ResultsPanel } from './ResultsPanel'
import './styles.css'

/** Fixed default seed until the seed lives in the URL (Phase 5). */
const DEFAULT_SEED = 12345

const defs = Object.fromEntries(template.uncertain.map((d) => [d.key, d])) as Record<
  UncertainKey,
  UncertainInputDef
>

function run(scenario: Scenario): { result?: SimulationResult; error?: string } {
  try {
    return { result: simulate(toSimulationSpec(template, scenario)) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export default function WeekendPage() {
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
  const valid =
    Object.keys(issues).length === 0 &&
    template.decisions.every((d) => Number.isFinite(scenario.decisions[d.key]))

  const deferred = useDeferredValue(scenario)
  const outcome = useMemo(() => (valid ? run(deferred) : {}), [deferred, valid])
  const stale = deferred !== scenario

  const onDecision = (key: keyof DayDecisions) => (v: number) =>
    update((s) => setDecision(template, s, key, v))
  const baseValues = Object.fromEntries(
    template.uncertain.map((d) => [d.key, deferred.uncertain[d.key].base]),
  ) as Record<UncertainKey, number>
  const decisionsIn = (section: Section) => template.decisions.filter((d) => d.section === section)
  const estimatesIn = (section: Section) => template.uncertain.filter((d) => d.section === section)
  const decisionField = (def: DecisionDef) => (
    <DecisionField
      key={def.key}
      def={def}
      value={scenario.decisions[def.key]}
      onChange={onDecision(def.key)}
      suggestion={
        def.key === 'capacityPerHour'
          ? {
              manual: scenario.capacityManual,
              note: copy.capacitySuggested(scenario.decisions.staffCount),
              onReset: () => update((s) => resetCapacity(template, s)),
            }
          : undefined
      }
    />
  )
  const estimateRow = (def: UncertainInputDef) => (
    <EstimateRow
      key={def.key}
      def={def}
      value={scenario.uncertain[def.key]}
      manual={scenario.manual[def.key] ?? {}}
      issue={issues[def.key]}
      onBase={(v) => update((s) => setBase(def, s, v))}
      onSide={(side, v) => update((s) => setSide(def, s, side, v))}
      onReset={(side) => update((s) => resetSide(def, s, side))}
    />
  )
  const byKey = <T extends { key: string }>(list: T[], key: string) =>
    list.find((d) => d.key === key)!
  const u = scenario.uncertain
  const d = scenario.decisions
  const orderSpend = u.dishesPerOrder.base * d.dishPrice + u.drinkRate.base * d.drinkPrice
  const orderCost = u.dishesPerOrder.base * u.dishCost.base + u.drinkRate.base * d.drinkCost

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="favicon.svg" alt="" width={28} height={28} />
          <span>{copy.brand}</span>
        </div>
        <span className="scenario-pill">{template.scenarioName}</span>
      </header>

      <section className="intro">
        <h1>{copy.pageTitle}</h1>
        <p>{copy.pageIntro}</p>
      </section>

      <main className="layout">
        <section className="column inputs" aria-label="Inputs">
          <article className="card">
            <header className="card-head with-action">
              <div>
                <h2>{copy.productTitle}</h2>
                <p className="card-sub">{copy.productIntro}</p>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setScenario(defaultScenario(template, scenario.seed))}
              >
                {copy.reset}
              </button>
            </header>
            <div className="product-group">
              <h3>{copy.dishGroup}</h3>
              <div className="decisions">
                {decisionField(byKey(template.decisions, 'dishPrice'))}
              </div>
              {estimateRow(byKey(template.uncertain, 'dishCost'))}
            </div>
            <div className="product-group">
              <h3>{copy.drinkGroup}</h3>
              <div className="decisions">
                {decisionField(byKey(template.decisions, 'drinkPrice'))}
                {decisionField(byKey(template.decisions, 'drinkCost'))}
              </div>
            </div>
            {Number.isFinite(orderSpend) && Number.isFinite(orderCost) && (
              <p className="order-value">
                {copy.orderValue(formatEuro(orderSpend), formatEuro(orderCost))}
              </p>
            )}
            <p className="card-sub">{copy.priceHint}</p>
          </article>

          <article className="card">
            <header className="card-head">
              <h2>
                {copy.customersTitle} <InfoTip text={copy.estimatesInfo} />
              </h2>
              <p className="card-sub">{copy.estimatesIntro}</p>
            </header>
            <div className="estimates">{estimatesIn('customers').map(estimateRow)}</div>
          </article>

          <article className="card">
            <header className="card-head">
              <h2>{copy.choicesTitle}</h2>
              <p className="card-sub">{copy.choicesIntro}</p>
            </header>
            <div className="decisions">{decisionsIn('stand').map(decisionField)}</div>

            <details className="advanced">
              <summary>{copy.advancedTitle}</summary>
              {estimatesIn('advanced').length > 0 && (
                <div className="estimates advanced-estimates">
                  {estimatesIn('advanced').map(estimateRow)}
                </div>
              )}
              <div className="decisions">
                {decisionsIn('advanced').map(decisionField)}
                <div className="decision">
                  <span className="decision-label">
                    {copy.linkedLabel}
                    <InfoTip text={copy.linkedHelp} />
                  </span>
                  <select
                    value={scenario.correlationMode}
                    onChange={(e) =>
                      update((s) => void (s.correlationMode = e.target.value as CorrelationMode))
                    }
                  >
                    {(Object.keys(copy.linkedOptions) as CorrelationMode[]).map((m) => (
                      <option key={m} value={m}>
                        {copy.linkedOptions[m]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h3>{copy.limitsTitle}</h3>
              <p className="card-sub">{copy.limitsIntro}</p>
              <div className="limits">
                {template.uncertain.map((def) => {
                  const b = boundsFor(def, scenario)
                  const k = displayScale(def.unit)
                  return (
                    <div className="limit" key={def.key}>
                      <span>
                        {def.label}
                        {def.unit === '%' && <em className="muted"> (%)</em>}
                      </span>
                      <NumberField
                        label={`${def.label} minimum`}
                        value={b.lower * k}
                        onChange={(v) =>
                          update(
                            (s) =>
                              void (s.limits[def.key] = { ...s.limits[def.key], lower: v / k }),
                          )
                        }
                      />
                      <span className="muted">{copy.limitTo}</span>
                      <NumberField
                        label={`${def.label} maximum`}
                        value={b.upper * k}
                        onChange={(v) =>
                          update(
                            (s) =>
                              void (s.limits[def.key] = { ...s.limits[def.key], upper: v / k }),
                          )
                        }
                      />
                    </div>
                  )
                })}
              </div>

              <div className="decision seed">
                <span className="decision-label">
                  {copy.seedLabel}
                  <InfoTip text={copy.seedHelp} />
                </span>
                <span className="seed-row">
                  <NumberField
                    label={copy.seedLabel}
                    value={scenario.seed}
                    step={1}
                    onChange={(v) =>
                      update((s) => void (s.seed = Math.max(0, Math.floor(v || 0)) >>> 0))
                    }
                  />
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() =>
                      update((s) => void (s.seed = Math.floor(Math.random() * 4294967296) >>> 0))
                    }
                  >
                    {copy.seedNew}
                  </button>
                </span>
              </div>
            </details>
          </article>
        </section>

        <section
          className={`column outputs ${stale ? 'is-stale' : ''}`}
          aria-label={copy.resultsTitle}
        >
          <h2 className="column-title">{copy.resultsTitle}</h2>
          {!valid && <p className="notice notice-warn">{copy.resultsInvalid}</p>}
          {outcome.error && (
            <p className="notice notice-danger">
              {copy.resultsError} {outcome.error}
            </p>
          )}
          {valid && outcome.result && (
            <ResultsPanel
              r={outcome.result}
              defs={defs}
              goal={scenario.goal}
              onGoal={(g) => update((s) => void (s.goal = g))}
              baseValues={baseValues}
              decisions={deferred.decisions}
              template={template}
            />
          )}
        </section>
      </main>
    </div>
  )
}
