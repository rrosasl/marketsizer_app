import { useMemo, type ReactNode } from 'react'
import { simulate, STRONG_CAP, STRONG_FACTOR, type UncertainKey } from '../engine'
import { arepaMarkthalle as template, type UncertainInputDef } from '../templates'
import { defaultScenario, toSimulationSpec } from '../state/scenario'
import { InputSpread } from './charts/InputSpread'
import { LinkedScatter } from './charts/LinkedScatter'
import { Expand } from './components/Expand'
import { copy } from './copy'
import { formatEuro } from './format'
import './styles.css'

/**
 * "How the model works": the logic behind the simulator for readers who want more. Plain English
 * first; formulas and sources sit in closed "Technical detail" sections. All numbers are computed
 * from the template defaults, so the page never drifts from the engine.
 */
const DEFAULT_SEED = 12345

const defs = Object.fromEntries(template.uncertain.map((d) => [d.key, d])) as Record<
  UncertainKey,
  UncertainInputDef
>
const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('en-GB')
const n0 = (x: number) => Math.round(x).toLocaleString('en-GB')
const pct = (x: number) => `${Math.round(x * 100)}%`

function Tech({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Expand id={`m-${id}`} title={copy.method.tech} className="method-tech">
      {children}
    </Expand>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="card method-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

/** Back to the simulator, keeping the user's numbers when they came from there. */
function backToApp(e: React.MouseEvent) {
  if (document.referrer.startsWith(window.location.origin) && window.history.length > 1) {
    e.preventDefault()
    window.history.back()
  }
}

export default function MethodPage() {
  const scenario = useMemo(() => defaultScenario(template, DEFAULT_SEED), [])
  const r = useMemo(() => simulate(toSimulationSpec(template, scenario)), [scenario])
  const d = scenario.decisions
  const u = scenario.uncertain
  const b = r.baseCase
  const s = r.summary
  const top = r.sensitivity[0]!
  const linked = template.correlations[0]

  const sections = [
    ['short', 'The short version'],
    ['day', 'One market day, step by step'],
    ['range', 'From three guesses to a range'],
    ['scenarios', '10,000 possible days'],
    ['linked', 'Estimates that move together'],
    ['averages', 'A typical day, not a single day'],
    ['results', 'How each result is worked out'],
    ['limits', 'What the model leaves out'],
  ] as const

  return (
    <div className="app method">
      <header className="topbar">
        <a className="brand" href="./" onClick={backToApp}>
          <img src="favicon.svg" alt="" width={28} height={28} />
          <span>{copy.brand}</span>
        </a>
        <div className="topbar-right">
          <a className="ghost-btn" href="./" onClick={backToApp}>
            ← {copy.method.back}
          </a>
        </div>
      </header>

      <section className="intro">
        <h1>{copy.method.title}</h1>
        <p>{copy.method.intro}</p>
      </section>

      <nav className="method-toc" aria-label="Contents">
        {sections.map(([id, title], i) => (
          <a key={id} href={`#${id}`}>
            <span>{i + 1}</span>
            {title}
          </a>
        ))}
      </nav>

      <main className="method-main">
        <Section id="short" title={sections[0][1]}>
          <ol className="method-steps">
            <li>
              <b>You give three guesses</b> for the things you can’t know yet — worst case, most
              likely and best case — and single numbers for the things you decide, like prices and
              rent.
            </li>
            <li>
              <b>We turn each guess into a range</b> of possible values that matches your three
              numbers exactly.
            </li>
            <li>
              <b>We simulate 10,000 possible typical days</b>, each with a different mix of values
              from those ranges, and work out sales, costs and profit for each one.
            </li>
            <li>
              <b>We summarise the 10,000 results</b>: the middle one is “most likely”, the 1-in-10
              low and high ends are “worst” and “best case”, and the share of profitable days is
              your chance of a profit.
            </li>
          </ol>
          <p>
            This way of answering “what could happen?” by trying out many combinations is called a{' '}
            <b>Monte Carlo simulation</b>. It shows not just one number but how sure you can be of
            it.
          </p>
        </Section>

        <Section id="day" title={sections[1][1]}>
          <p>
            Every simulated day uses the same simple model of a stand. Here it is with the default
            numbers, every estimate at its most likely value:
          </p>
          <table className="method-table">
            <tbody>
              <tr>
                <th>Orders in busy hours</th>
                <td className="calc">
                  {n1(b.peakOrders / Math.max(1, u.peakHours.base))} orders/h ×{' '}
                  {n1(u.peakHours.base)} h
                </td>
                <td>{n0(b.peakOrders)}</td>
              </tr>
              <tr>
                <th>Orders in quiet hours</th>
                <td className="calc">
                  {n1(u.offpeakDemand.base)} orders/h × {n1(d.openHours - u.peakHours.base)} h
                </td>
                <td>{n0(b.offpeakOrders)}</td>
              </tr>
              <tr className="sub">
                <th>Orders a day</th>
                <td className="calc">never more than {n0(d.capacityPerHour)} an hour</td>
                <td>{n0(b.orders)}</td>
              </tr>
              <tr>
                <th>Spend per order</th>
                <td className="calc">
                  {n1(u.dishesPerOrder.base)} dishes × {formatEuro(d.dishPrice)} +{' '}
                  {n1(u.drinkRate.base * 10)}/10 drinks × {formatEuro(d.drinkPrice)}
                </td>
                <td>{formatEuro(b.avgSpendGross)}</td>
              </tr>
              <tr className="sub">
                <th>Sales incl. VAT</th>
                <td className="calc">orders × spend per order</td>
                <td>{formatEuro(b.grossSales)}</td>
              </tr>
              <tr>
                <th>Sales after VAT</th>
                <td className="calc">
                  food at {pct(d.vatFood)}, drinks at {pct(d.vatDrinks)} VAT
                </td>
                <td>{formatEuro(b.netSales)}</td>
              </tr>
              <tr>
                <th>Ingredients + packaging</th>
                <td className="calc">per dish and per drink sold</td>
                <td>−{formatEuro(b.dishIngredients + b.drinkIngredients)}</td>
              </tr>
              <tr>
                <th>Card fees</th>
                <td className="calc">
                  {(d.cardFeeRate * 100).toLocaleString('en-GB')}% of sales incl. VAT
                </td>
                <td>−{formatEuro(b.paymentFees)}</td>
              </tr>
              <tr>
                <th>Wages</th>
                <td className="calc">
                  {n0(d.staffCount)} × ({n1(d.openHours)} + {n1(d.setupHours)} h) ×{' '}
                  {formatEuro(d.staffCostPerHour)}
                </td>
                <td>−{formatEuro(b.staff)}</td>
              </tr>
              <tr>
                <th>Rent + other costs</th>
                <td className="calc">fixed per day</td>
                <td>−{formatEuro(b.rent + b.otherCosts)}</td>
              </tr>
              <tr className="total">
                <th>Profit</th>
                <td />
                <td>{formatEuro(b.profit)}</td>
              </tr>
            </tbody>
          </table>
          <p>
            <b>Break-even</b> is the number of orders at which profit is exactly €0. Each order
            earns you {formatEuro(b.contributionPerOrder)} after VAT, ingredients, card fees and any
            rent share; your fixed costs (wages, rent, other) are {formatEuro(b.fixedPerDay)} a day.
            So you need {formatEuro(b.fixedPerDay)} ÷ {formatEuro(b.contributionPerOrder)} ≈{' '}
            {n1(b.breakevenOrders)} orders.
          </p>
          <Tech id="day">
            <ul className="method-formulas">
              <li>
                busy hours = min(estimate, opening hours); quiet hours = opening hours − busy hours
              </li>
              <li>
                orders = min(busy demand, capacity) × busy hours + min(quiet demand, capacity) ×
                quiet hours. Demand above capacity is counted as customers turned away, never as
                sales.
              </li>
              <li>
                sales incl. VAT = orders × (dishes per order × dish price + drinks per order × drink
                price)
              </li>
              <li>sales after VAT = food sales ÷ (1 + food VAT) + drink sales ÷ (1 + drink VAT)</li>
              <li>
                costs = orders × (dishes per order × dish cost + drinks per order × drink cost) +
                card fee × sales incl. VAT + rent share × sales after VAT + fixed rent + people ×
                (opening + setup hours) × cost per hour + other costs
              </li>
              <li>
                break-even orders = fixed costs ÷ (sales after VAT per order × (1 − rent share) −
                card fee × sales incl. VAT per order − ingredients per order). If an order earns
                nothing or less, there is no break-even and the app warns that every order loses
                money.
              </li>
            </ul>
          </Tech>
        </Section>

        <Section id="range" title={sections[2][1]}>
          <p>
            Take <b>{defs.peakDemand.label.toLowerCase()}</b>: the default guesses are{' '}
            {n0(u.peakDemand.worst)} (worst), {n0(u.peakDemand.base)} (most likely) and{' '}
            {n0(u.peakDemand.best)} (best). We read them as: a 1-in-10 chance the real number is
            lower than the worst case, an even chance it is above or below the most likely one, and
            a 1-in-10 chance it is higher than the best case.
          </p>
          <p>
            From those three points we draw a smooth range of possible values that passes exactly
            through all three. Here are the 10,000 values the simulation used:
          </p>
          <InputSpread
            values={r.samples.peakDemand}
            unit="/h"
            label={`Simulated ${defs.peakDemand.label.toLowerCase()}`}
            marks={[
              { v: u.peakDemand.worst, label: copy.worstCase },
              { v: u.peakDemand.base, label: copy.mostLikely },
              { v: u.peakDemand.best, label: copy.bestCase },
            ]}
          />
          <p>
            Lopsided guesses give a lopsided range: here the best case is further from the most
            likely value than the worst case, so there is a longer tail of very busy days.{' '}
            <b>Limits</b> (under Advanced settings) keep values realistic — orders can’t go below
            zero and busy hours can’t be longer than your opening hours.
          </p>
          <Tech id="range">
            <p>
              Each estimate is a <b>3-term metalog</b> distribution (Keelin 2016) fitted to the
              10th, 50th and 90th percentiles. With α = 0.1 and L = ln 9:
            </p>
            <pre>
              {`M(y) = a1 + a2·ln(y/(1−y)) + a3·(y − 0.5)·ln(y/(1−y))
a1 = x50
a2 = (x90 − x10) / (2L)
a3 = (x90 + x10 − 2·x50) / ((1 − 2α)·L)`}
            </pre>
            <ul>
              <li>
                Limits are built in, not applied by cutting off values: with a lower limit the fit
                is made on ln(x − lower); with both limits on ln((x − lower)/(upper − x)), then
                transformed back. This keeps your three numbers exact.
              </li>
              <li>
                The fit is valid when a2 &gt; 0 and |a3|/a2 &lt; 1.667. Very lopsided guesses fall
                outside that, and we use a simpler two-piece normal shape instead (the app shows a
                short note when that happens).
              </li>
              <li>
                For costs, worst case is the <i>highest</i> value, so it is used as the 90th
                percentile.
              </li>
              <li>
                Uniform numbers are kept within [10⁻⁶, 1 − 10⁻⁶] to avoid infinite values in the
                tails.
              </li>
            </ul>
          </Tech>
        </Section>

        <Section id="scenarios" title={sections[3][1]}>
          <p>
            Each of the 10,000 scenarios picks one value from every range and runs the day model
            above. That gives 10,000 possible profits. We then report:
          </p>
          <ul>
            <li>
              <b>Most likely</b> = the middle result (half the scenarios do better, half worse).
              With the defaults: {formatEuro(s.profit.p50)}.
            </li>
            <li>
              <b>Worst / best case</b> = the 1-in-10 low and high ends: {formatEuro(s.profit.p10)}{' '}
              and {formatEuro(s.profit.p90)}.
            </li>
            <li>
              <b>Chance of a profit</b> = the share of scenarios above €0: {pct(1 - s.lossChance)}.
            </li>
          </ul>
          <p>
            Note that the most likely profit ({formatEuro(s.profit.p50)}) is not the profit of the
            day where every estimate sits at its most likely value ({formatEuro(b.profit)}). Bad
            combinations, like few customers <i>and</i> short busy hours, pull harder than good
            ones, especially when your serving limit caps the good days.
          </p>
          <Tech id="scenarios">
            <ul>
              <li>
                Random numbers come from a seeded <b>sfc32</b> generator (seed expanded with
                splitmix32), so the same seed and inputs always give exactly the same results. The
                seed is saved in the link.
              </li>
              <li>
                Normal draws use Box–Muller; the normal distribution function uses Hart’s algorithm
                (West 2005) and its inverse Acklam’s algorithm with one Halley refinement step.
              </li>
              <li>
                Each result (sales, costs, profit, orders, break-even) is summarised on its own, so
                “most likely sales − most likely costs” is close to, but not exactly, “most likely
                profit”.
              </li>
              <li>
                With 10,000 scenarios, the most likely profit moves by only a few euros between
                seeds.
              </li>
            </ul>
          </Tech>
        </Section>

        <Section id="linked" title={sections[4][1]}>
          <p>
            Some estimates are not independent. If your busy hours are busier than expected, your
            quiet hours probably are too — it is the same market, the same weather, the same
            reputation. The simulator links{' '}
            <b>
              {linked ? defs[linked.a].label.toLowerCase() : ''} and{' '}
              {linked ? defs[linked.b].label.toLowerCase() : ''}
            </b>{' '}
            so they tend to move together:
          </p>
          <LinkedScatter
            a={r.samples.peakDemand}
            b={r.samples.offpeakDemand}
            aLabel={defs.peakDemand.label}
            bLabel={defs.offpeakDemand.label}
          />
          <p>
            Without the link, a great busy hour would often be paired with a dead quiet hour and the
            two would cancel out, making your range look narrower — and safer — than it is. Under
            Advanced settings you can switch the link off (“Independent”) or make it stronger to see
            how much it matters.
          </p>
          <Tech id="linked">
            <ul>
              <li>
                Links use a <b>Gaussian copula</b>: correlated normal values Z are drawn with a
                Cholesky factor of the correlation matrix, turned into probabilities U = Φ(Z), and
                then into values through each estimate’s range. Each estimate keeps its own shape.
              </li>
              <li>
                The link is set as a rank correlation ρ = {linked?.rho ?? 0} (Spearman) and
                converted to the copula’s parameter with r = 2·sin(πρ/6). Tests check the simulated
                rank correlation is within ±0.03 of the target.
              </li>
              <li>
                “Strong” multiplies each link by {STRONG_FACTOR} (at most {STRONG_CAP});
                “Independent” removes all links. Links are fixed per template, not set by the user.
              </li>
            </ul>
          </Tech>
        </Section>

        <Section id="averages" title={sections[5][1]}>
          <p>
            Your guesses describe a <b>typical</b> weekend day — the average you would see over many
            weekends — not the ups and downs of a single day. Each scenario is one possible answer
            to “what is a typical day for my stand really like?”.
          </p>
          <p>
            For a new stand, the big question is whether it works at all: are there 10 or 30
            customers an hour on average? That is what the ranges capture. Day-to-day swings (rain,
            a competing event) come on top: a single day can be better or worse than the ranges
            shown.
          </p>
        </Section>

        <Section id="results" title={sections[6][1]}>
          <dl className="method-dl">
            <dt>Break-even and cushion</dt>
            <dd>
              Most likely orders compared with most likely break-even. The cushion label follows the
              chance of a profit: healthy (90% or more), thin (50–90%) or below break-even (under
              50%). The customer line finds how far customer numbers could fall (or must rise)
              before most likely profit hits €0, by scaling both customer estimates in all 10,000
              scenarios.
            </dd>
            <dt>What if things go worse than expected?</dt>
            <dd>
              The same 10,000 scenarios with a change applied, e.g. 20% fewer customers (applied
              before your serving limit) or fixed costs 20% higher. These are “what ifs”, not
              predictions.
            </dd>
            <dt>What matters most</dt>
            <dd>
              For each estimate, how closely profit follows it across the scenarios (Spearman rank
              correlation, shown as Big impact from 0.5, Some from 0.25). With the defaults the
              biggest is {defs[top.key].label.toLowerCase()}. Pinning down the top estimates narrows
              your range the most.
            </dd>
            <dt>Check a goal</dt>
            <dd>
              The share of scenarios that reach your goal. “What it would take” compares the
              scenarios that reach it with your most likely values and lists up to three estimates
              that differ most (only if at least 50 scenarios fall on each side).
            </dd>
            <dt>For investors</dt>
            <dd>
              An investor funding part of a day’s costs gets the same part of its profit or loss:
              share = investment ÷ day’s costs (at most 100%), worked out in every scenario. So the
              return in % equals profit ÷ costs, and an investor can’t lose more than they put in.
            </dd>
            <dt>Serving limit note</dt>
            <dd>
              A scenario counts as limited when at least 5% of its customers can’t be served. The
              note appears when 10% of scenarios or more are limited.
            </dd>
          </dl>
        </Section>

        <Section id="limits" title={sections[7][1]}>
          <ul>
            <li>
              <b>Customers don’t react to price.</b> A higher price raises profit in the model
              without losing anyone — lower your order estimates yourself if you raise prices.
            </li>
            <li>
              <b>One typical day, not a season.</b> No months, ramp-up, weather or one-off setup
              costs (equipment, licences).
            </li>
            <li>
              <b>Before tax on profit.</b> Profit is after VAT and all running costs, but before
              income tax.
            </li>
            <li>
              <b>Waste and unsold food</b> are only counted if you include them in your ingredient
              cost.
            </li>
            <li>
              <b>Everyone pays by card</b> (card fees apply to all sales).
            </li>
            <li>
              <b>The ranges are only as good as your guesses.</b> The simulation shows what follows
              from them; it can’t check them. “What matters most” tells you which to research first.
            </li>
          </ul>
          <Tech id="refs">
            <ul>
              <li>
                Keelin, T. W. (2016). The Metalog Distributions. <i>Decision Analysis</i> 13(4),
                243–277.
              </li>
              <li>
                West, G. (2005). Better approximations to cumulative normal functions.{' '}
                <i>Wilmott Magazine</i>, 70–76.
              </li>
              <li>Acklam, P. J. An algorithm for computing the inverse normal CDF.</li>
              <li>
                Nelsen, R. B. (2006). <i>An Introduction to Copulas</i>, 2nd ed. Springer (Gaussian
                copula; rank correlation r = 2·sin(πρ/6)).
              </li>
            </ul>
          </Tech>
        </Section>

        <p className="footnote method-foot">
          All numbers on this page use the default arepa stand ({template.scenarioName}), seed{' '}
          {DEFAULT_SEED}.{' '}
          <a href="./" onClick={backToApp}>
            {copy.method.back}
          </a>
        </p>
      </main>
    </div>
  )
}
