import { describe, expect, it } from 'vitest'
import { arepaMarkthalle } from '../src/templates'

describe('template help texts', () => {
  it('every input explains what it is and how changing it moves the results', () => {
    for (const d of [...arepaMarkthalle.uncertain, ...arepaMarkthalle.decisions]) {
      expect(d.help, d.key).toBeTruthy()
      expect(d.effect, d.key).toBeTruthy()
    }
  })
})
