import { describe, expect, it } from 'vitest'
import { formatEuro } from '../src/ui/format'

describe('formatEuro', () => {
  it('uses the €1,234.50 format', () => {
    expect(formatEuro(1234.5)).toBe('€1,234.50')
  })

  it('shows negatives with a minus sign', () => {
    expect(formatEuro(-80)).toBe('−€80.00')
  })
})
