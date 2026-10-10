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
import { arepaMarkthalle as template, type UncertainInputDef } from '../templates'
import {
  boundsFor,
  defaultScenario,
  effectiveEstimate,
  resetSide,
  setBase,
  setSide,
  toSimulationSpec,
  type Scenario,
} from '../state/scenario'
import { DecisionField } from './components/DecisionField'
import { EstimateRow } from './components/EstimateRow'
import { InfoTip } from './components/InfoTip'
import { NumberField } from './components/NumberField'
import { copy } from './copy'
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

  const setDecision = (key: keyof DayDecisions) => (v: number) =>
    update((s) => void (s.decisions[key] = v))
  const baseValues = Object.fromEntries(
    template.uncertain.map((d) => [d.key, deferred.uncertain[d.key].base]),
  ) as Record<UncertainKey, number>
  const basic = template.decisions.filter((d) => !d.advanced)
  const advanced = template.decisions.filter((d) => d.advanced)

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
                <h2>
                  {copy.estimatesTitle} <InfoTip text={copy.estimatesInfo} />
                </h2>
                <p className="card-sub">{copy.estimatesIntro}</p>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setScenario(defaultScenario(template, scenario.seed))}
              >
                {copy.reset}
              </button>
            </header>
            <div className="estimates">
              {template.uncertain.map((def) => (
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
              ))}
            </div>
          </article>

          <article className="card">
            <header className="card-head">
              <h2>{copy.choicesTitle}</h2>
              <p className="card-sub">{copy.choicesIntro}</p>
            </header>
            <div className="decisions">
              {basic.map((def) => (
                <DecisionField
                  key={def.key}
                  def={def}
                  value={scenario.decisions[def.key]}
                  onChange={setDecision(def.key)}
                />
              ))}
            </div>

            <details className="advanced">
              <summary>{copy.advancedTitle}</summary>
              <div className="decisions">
                {advanced.map((def) => (
                  <DecisionField
                    key={def.key}
                    def={def}
                    value={scenario.decisions[def.key]}
                    onChange={setDecision(def.key)}
                  />
                ))}
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
                  return (
                    <div className="limit" key={def.key}>
                      <span>{def.label}</span>
                      <NumberField
                        label={`${def.label} minimum`}
                        value={b.lower}
                        onChange={(v) =>
                          update(
                            (s) => void (s.limits[def.key] = { ...s.limits[def.key], lower: v }),
                          )
                        }
                      />
                      <span className="muted">{copy.limitTo}</span>
                      <NumberField
                        label={`${def.label} maximum`}
                        value={b.upper}
                        onChange={(v) =>
                          update(
                            (s) => void (s.limits[def.key] = { ...s.limits[def.key], upper: v }),
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
            />
          )}
        </section>
      </main>
    </div>
  )
}
