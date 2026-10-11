import { describe, expect, it } from 'vitest'
import { investorOutlook, investorThreshold, simulate } from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'
import { defaultScenario, toSimulationSpec } from '../../src/state/scenario'

const r = simulate(toSimulationSpec(arepaMarkthalle, defaultScenario(arepaMarkthalle, 12345)))

describe('investorOutlook', () => {
  it('shares the day result in proportion to the share of costs', () => {
    const o = investorOutlook(r, 100, 0.1, 0.2)
    const ratio = Array.from(r.profit, (p, i) => (100 * p) / r.dailyCosts[i]!)
    const meet = ratio.filter((v) => v >= 10).length / r.draws
    expect(o.chanceGain).toBeCloseTo(meet, 12)
    expect(o.typicalShare).toBeCloseTo(100 / o.typicalCosts, 12)
    expect(o.capped).toBe(false)
  })

  it('chance of losing any money equals the chance of a losing day', () => {
    expect(investorOutlook(r, 100, 0.1, 0.2).chanceLoss).toBeCloseTo(r.summary.lossChance, 12)
  })

  it('percent outcomes do not depend on the amount (below a day’s costs)', () => {
    const a = investorOutlook(r, 50, 0.2, 0.2)
    const b = investorOutlook(r, 300, 0.2, 0.2)
    expect(b.chanceGain).toBe(a.chanceGain)
    expect(b.chanceBigLoss).toBe(a.chanceBigLoss)
    expect(b.likelyReturn).toBeCloseTo(a.likelyReturn * 6, 6)
  })

  it('bigger thresholds are less likely', () => {
    const p = [0.05, 0.1, 0.2, 0.5].map((g) => investorOutlook(r, 100, g, 0.2).chanceGain)
    for (let i = 1; i < p.length; i++) expect(p[i]!).toBeLessThanOrEqual(p[i - 1]!)
    const l = [0.1, 0.2, 0.5].map((x) => investorOutlook(r, 100, 0.1, x).chanceBigLoss)
    for (let i = 1; i < l.length; i++) expect(l[i]!).toBeLessThanOrEqual(l[i - 1]!)
    expect(investorOutlook(r, 100, 0.1, 0.2).chanceBigLoss).toBeLessThanOrEqual(
      investorOutlook(r, 100, 0.1, 0.2).chanceLoss,
    )
  })

  it('caps the stake at a day’s costs: extra money is not needed', () => {
    const big = investorOutlook(r, 100_000, 0.1, 0.2)
    expect(big.capped).toBe(true)
    expect(big.typicalShare).toBe(1)
    // The investor gets the whole day's result: median ≈ median day profit.
    expect(big.likelyReturn).toBeCloseTo(r.summary.profit.p50, 0)
  })

  it('never loses more than the stake', () => {
    const o = investorOutlook(r, 100, 0.1, 1.0001)
    expect(o.chanceBigLoss).toBe(0)
  })
})

describe('investorThreshold: the first option means €1', () => {
  it('maps option 0 to €1 of the stake and leaves other options alone', () => {
    expect(investorThreshold(0, 100, 1)).toBeCloseTo(0.01, 12)
    expect(investorThreshold(0, 250, 1) * 250).toBeCloseTo(1, 12)
    expect(investorThreshold(0.2, 100, 1)).toBe(0.2)
  })

  it('counts results of at least €1 up or down', () => {
    const o = investorOutlook(r, 100, investorThreshold(0, 100, 1), investorThreshold(0, 100, 1))
    const res = Array.from(
      r.profit,
      (p, i) => (Math.min(100, r.dailyCosts[i]!) / r.dailyCosts[i]!) * p,
    )
    expect(o.chanceGain).toBeCloseTo(res.filter((v) => v >= 1).length / r.draws, 12)
    expect(o.chanceBigLoss).toBeCloseTo(res.filter((v) => v <= -1).length / r.draws, 12)
    expect(o.chanceBigLoss).toBeLessThanOrEqual(o.chanceLoss)
  })
})

describe('investorOutlook: €0 thresholds', () => {
  it('losing "€0 or more" means any loss; earning "€0 or more" means not losing', () => {
    const o = investorOutlook(r, 100, 0, 0)
    expect(o.chanceBigLoss).toBeCloseTo(r.summary.lossChance, 12)
    expect(o.chanceGain + o.chanceLoss).toBeCloseTo(1, 12)
  })
})
