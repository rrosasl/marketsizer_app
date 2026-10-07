import { describe, expect, it } from 'vitest'
import {
  buildCorrelationMatrix,
  cholesky,
  correlatedNormals,
  correlationsForMode,
  createRng,
  rankToPearson,
  spearman,
  UNCERTAIN_KEYS,
} from '../../src/engine'
import { arepaMarkthalle } from '../../src/templates'

describe('copula', () => {
  it('rank → Pearson conversion: r = 2·sin(πρ/6)', () => {
    expect(rankToPearson(0)).toBe(0)
    expect(rankToPearson(1)).toBeCloseTo(1, 12)
    expect(rankToPearson(0.6)).toBeCloseTo(2 * Math.sin(0.1 * Math.PI), 12)
  })

  it('Cholesky reproduces the matrix', () => {
    const m = [
      [1, 0.5, 0.2],
      [0.5, 1, 0.3],
      [0.2, 0.3, 1],
    ]
    const l = cholesky(m)
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        let s = 0
        for (let k = 0; k < 3; k++) s += l[i]![k]! * l[j]![k]!
        expect(s).toBeCloseTo(m[i]![j]!, 12)
      }
  })

  it('fails loudly on a matrix that is not positive definite', () => {
    const bad = [
      [1, 0.9, -0.9],
      [0.9, 1, 0.9],
      [-0.9, 0.9, 1],
    ]
    expect(() => cholesky(bad)).toThrow(/positive definite/)
  })

  for (const mode of ['default', 'strong'] as const) {
    it(`template correlations (${mode}) are positive definite and sampled within ±0.03`, () => {
      const pairs = correlationsForMode(arepaMarkthalle.correlations, mode)
      const keys = UNCERTAIN_KEYS
      const z = correlatedNormals(createRng(123), buildCorrelationMatrix(keys, pairs), 10_000)
      for (const { a, b, rho } of pairs) {
        const got = spearman(z[keys.indexOf(a)]!, z[keys.indexOf(b)]!)
        expect(Math.abs(got - rho)).toBeLessThanOrEqual(0.03)
      }
      // Pairs with no target correlation stay near zero.
      expect(Math.abs(spearman(z[0]!, z[1]!))).toBeLessThanOrEqual(0.03)
    })
  }

  it('strong mode multiplies by 1.5 and caps at 0.9', () => {
    const strong = correlationsForMode(arepaMarkthalle.correlations, 'strong').map((p) => p.rho)
    expect(strong[0]).toBeCloseTo(0.9, 12)
    expect(strong[1]).toBeCloseTo(-0.3, 12)
    expect(strong[3]).toBeCloseTo(0.45, 12)
    expect(correlationsForMode(arepaMarkthalle.correlations, 'independent')).toEqual([])
  })
})
