import { describe, expect, it } from 'vitest'
import { quantileSorted, ranks, sorted, spearman, summarize } from '../../src/engine'

describe('stats', () => {
  it('quantiles interpolate linearly', () => {
    const s = sorted([5, 1, 4, 2, 3])
    expect(quantileSorted(s, 0.5)).toBe(3)
    expect(quantileSorted(s, 0.1)).toBeCloseTo(1.4, 12)
    expect(summarize([1, 2, 3, 4, 5]).p90).toBeCloseTo(4.6, 12)
  })

  it('ranks give ties their average rank', () => {
    expect(Array.from(ranks([10, 20, 20, 5]))).toEqual([2, 3.5, 3.5, 1])
  })

  it('spearman: monotone = 1, reversed = −1, constant = 0', () => {
    expect(spearman([1, 2, 3, 4], [1, 8, 27, 64])).toBeCloseTo(1, 12)
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 12)
    expect(spearman([1, 1, 1], [1, 2, 3])).toBe(0)
  })
})
