import type { DayDecisions } from '../engine'
import type { Template } from '../templates'
import { formatEuro } from './format'

/**
 * One-line context for every result card, so a screenshot still says which stand, which key
 * choices and when (SPEC §9), e.g. "Arepa stand · Kulturbrauerei … · €9 dish · 1 person · 6 h · Oct 2026".
 */
export function cardCaption(t: Template, d: DayDecisions, date = new Date()): string {
  const people = `${d.staffCount} ${d.staffCount === 1 ? 'person' : 'people'}`
  const when = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return [
    t.scenarioName,
    `${formatEuro(d.dishPrice).replace('.00', '')} dish`,
    people,
    `${d.openHours} h open`,
    when,
  ].join(' · ')
}
