import { describe, expect, it } from 'vitest'
import { createRng, fillStandardNormals, normCdf, normInv } from '../../src/engine'

// Reference values from Python's statistics.NormalDist.
describe('normal distribution helpers', () => {
  it('normInv matches reference values', () => {
    expect(normInv(0.9)).toBeCloseTo(1.2815515655446008, 12)
    expect(normInv(0.975)).toBeCloseTo(1.9599639845400536, 12)
    expect(normInv(0.02)).toBeCloseTo(-2.0537489106318225, 12)
    expect(normInv(1e-6)).toBeCloseTo(-4.753424308822899, 9)
    expect(normInv(0.5)).toBe(0)
  })

  it('normCdf matches reference values', () => {
    expect(normCdf(1.2815515655446008)).toBeCloseTo(0.9, 13)
    expect(normCdf(-3)).toBeCloseTo(0.0013498980316301035, 14)
    expect(normCdf(0.5)).toBeCloseTo(0.6914624612740131, 13)
    expect(normCdf(0)).toBeCloseTo(0.5, 14)
    expect(normCdf(-6)).toBeCloseTo(9.865876449133282e-10, 16)
  })

  it('normCdf and normInv are inverse to each other', () => {
    for (let p = 0.001; p < 1; p += 0.0137) expect(normCdf(normInv(p))).toBeCloseTo(p, 12)
  })

  it('standard normal draws have mean 0 and variance 1', () => {
    const z = new Float64Array(100_001)
    fillStandardNormals(createRng(1), z)
    const mean = z.reduce((a, b) => a + b, 0) / z.length
    const variance = z.reduce((a, b) => a + (b - mean) ** 2, 0) / z.length
    expect(Math.abs(mean)).toBeLessThan(0.01)
    expect(Math.abs(variance - 1)).toBeLessThan(0.02)
  })
})
