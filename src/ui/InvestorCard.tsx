import { useMemo } from 'react'
import { investorOutlook, investorThreshold, type SimulationResult } from '../engine'
import type { InvestorChoice, Template } from '../templates'
import { Expand } from './components/Expand'
import { InfoTip } from './components/InfoTip'
import { NumberField } from './components/NumberField'
import { copy } from './copy'
import { formatEuro } from './format'

const pct = (x: number) => `${Math.round(x * 100)}%`
const chance = (p: number) => (p > 0 && p < 0.01 ? '<1%' : p < 1 && p > 0.99 ? '>99%' : pct(p))
/** Whole euros for amounts in sentences and dropdowns (e.g. €596, €20). */
const euro = (x: number) => formatEuro(Math.round(x)).replace('.00', '')
const signed = (x: number) => (x >= 0 ? '+' : '') + formatEuro(x)

/**
 * "For investors": an investor co-funds one market day and shares its result in proportion to
 * their part of the day's costs. Gains and losses are shown in separate green and red panels;
 * amounts lead in €, with the % of the stake in brackets.
 */
export function InvestorCard({
  r,
  template,
  choice,
  onChoice,
  caption,
}: {
  r: SimulationResult
  template: Template
  choice: InvestorChoice
  onChoice: (c: InvestorChoice) => void
  caption: string
}) {
  const valid = Number.isFinite(choice.amount) && choice.amount > 0
  const { minEuro } = template.investor
  const threshold = (opt: number) => investorThreshold(opt, choice.amount, minEuro)
  const o = useMemo(() => {
    if (!valid) return null
    const t = (opt: number) => investorThreshold(opt, choice.amount, minEuro)
    return investorOutlook(r, choice.amount, t(choice.gain), t(choice.loss))
  }, [r, choice, valid, minEuro])
  const option = (opt: number) => {
    const share = threshold(opt)
    return copy.investor.option(euro(share * choice.amount), chance(share))
  }

  return (
    <article className="card investor">
      <header className="card-head">
        <h3>
          {copy.investor.title} <InfoTip text={copy.investor.info} />
        </h3>
      </header>

      <div className="goal-ask">
        <span>{copy.investor.askBefore}</span>
        <NumberField
          label="Investment in euros"
          value={choice.amount}
          step={10}
          className="goal-amount"
          invalid={!valid}
          prefix="€"
          onChange={(v) => onChoice({ ...choice, amount: v })}
        />
        <span>{copy.investor.askAfter}</span>
      </div>

      {o && (
        <>
          <p className="card-sub inv-share">
            {o.capped
              ? copy.investor.capped(euro(o.typicalCosts))
              : copy.investor.share(pct(o.typicalShare), euro(o.typicalCosts))}
          </p>

          <div className="inv-likely">
            <span className="eyebrow">{copy.investor.likely}</span>
            <span className={`big ${o.likelyReturn < 0 ? 'neg' : 'pos'}`}>
              {signed(o.likelyReturn)} <small>({pct(o.likelyReturn / choice.amount)})</small>
            </span>
          </div>

          <Expand id="investor-chances" title={copy.investor.more}>
            <div className="inv-panels">
              <section className="inv-panel inv-up" aria-label={copy.investor.upTitle}>
                <h4>{copy.investor.upTitle}</h4>
                <label className="inv-row">
                  <span>
                    {copy.investor.upAsk}{' '}
                    <select
                      value={choice.gain}
                      aria-label="Earning threshold"
                      onChange={(e) => onChoice({ ...choice, gain: Number(e.target.value) })}
                    >
                      {template.investor.gainOptions.map((g) => (
                        <option key={g} value={g}>
                          {option(g)}
                        </option>
                      ))}
                    </select>{' '}
                    {copy.investor.orMore}
                  </span>
                  <b>{chance(o.chanceGain)}</b>
                </label>
                <div className="inv-meter" aria-hidden="true">
                  <div style={{ width: `${o.chanceGain * 100}%` }} />
                </div>
              </section>

              <section className="inv-panel inv-down" aria-label={copy.investor.downTitle}>
                <h4>{copy.investor.downTitle}</h4>
                <label className="inv-row">
                  <span>
                    {copy.investor.downAsk}{' '}
                    <select
                      value={choice.loss}
                      aria-label="Loss threshold"
                      onChange={(e) => onChoice({ ...choice, loss: Number(e.target.value) })}
                    >
                      {template.investor.lossOptions.map((l) => (
                        <option key={l} value={l}>
                          {option(l)}
                        </option>
                      ))}
                    </select>{' '}
                    {copy.investor.orMore}
                  </span>
                  <b>{chance(o.chanceBigLoss)}</b>
                </label>
                <div className="inv-meter" aria-hidden="true">
                  <div style={{ width: `${o.chanceBigLoss * 100}%` }} />
                </div>
              </section>
            </div>
          </Expand>
          <p className="footnote">{copy.investor.note}</p>
        </>
      )}
      <p className="card-caption">{caption}</p>
    </article>
  )
}
