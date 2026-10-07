import { describe, expect, it } from 'vitest'
import { createRng } from '../../src/engine'

describe('createRng', () => {
  it('is reproducible for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 1000; i++) expect(a()).toBe(b())
  })

  it('differs between seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    const same = Array.from({ length: 100 }, () => a() === b()).filter(Boolean).length
    expect(same).toBe(0)
  })

  it('returns values in [0, 1) with a uniform mean', () => {
    const r = createRng(7)
    let sum = 0
    for (let i = 0; i < 100_000; i++) {
      const u = r()
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThan(1)
      sum += u
    }
    expect(sum / 100_000).toBeCloseTo(0.5, 2)
  })
})
