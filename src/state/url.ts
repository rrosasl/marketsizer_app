import {
  UNCERTAIN_KEYS,
  type CorrelationMode,
  type DayDecisions,
  type Goal,
  type UncertainKey,
} from '../engine'
import type { Template } from '../templates'
import { defaultScenario, type Scenario, type Side } from './scenario'

/**
 * Scenario ⇄ URL hash (`#s=…`). Only what differs from the template defaults is stored (plus the
 * seed), as base64url JSON, so links stay short and old links keep working when defaults change.
 * Decoding is defensive: unknown keys and non-numbers are ignored, never thrown.
 */

const VERSION = 1
const PARAM = 's'

interface Packed {
  v: number
  /** Seed. */
  s: number
  /** Estimates that differ from defaults: key → [worst, base, best]. */
  u?: Partial<Record<UncertainKey, [number, number, number]>>
  /** Typed (manual) worst/best: key → 'w' | 'b' | 'wb'. */
  m?: Partial<Record<UncertainKey, string>>
  /** Limit overrides: key → [lower | null, upper | null]. */
  l?: Partial<Record<UncertainKey, [number | null, number | null]>>
  /** Choices that differ from defaults. */
  d?: Partial<DayDecisions>
  /** Capacity typed by the user. */
  cm?: 1
  c?: CorrelationMode
  g?: Goal
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64: string): string {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/')
  return atob(s + '='.repeat((4 - (s.length % 4)) % 4))
}

export function encodeScenario(t: Template, s: Scenario): string {
  const def = defaultScenario(t, s.seed)
  const p: Packed = { v: VERSION, s: s.seed }
  for (const k of UNCERTAIN_KEYS) {
    const e = s.uncertain[k]
    const d = def.uncertain[k]
    if (e.worst !== d.worst || e.base !== d.base || e.best !== d.best) {
      ;(p.u ??= {})[k] = [e.worst, e.base, e.best]
    }
    const man = s.manual[k]
    const flags = (man?.worst ? 'w' : '') + (man?.best ? 'b' : '')
    if (flags) (p.m ??= {})[k] = flags
    const lim = s.limits[k]
    if (lim && (lim.lower !== undefined || lim.upper !== undefined)) {
      ;(p.l ??= {})[k] = [lim.lower ?? null, lim.upper ?? null]
    }
  }
  for (const k of Object.keys(s.decisions) as (keyof DayDecisions)[]) {
    if (s.decisions[k] !== def.decisions[k]) (p.d ??= {})[k] = s.decisions[k]
  }
  if (s.capacityManual) p.cm = 1
  if (s.correlationMode !== def.correlationMode) p.c = s.correlationMode
  const g = s.goal
  if (
    g.metric !== def.goal.metric ||
    g.direction !== def.goal.direction ||
    g.amount !== def.goal.amount
  ) {
    p.g = g
  }
  return `${PARAM}=${toBase64Url(JSON.stringify(p))}`
}

/** Scenario from a URL hash (with or without '#'); null if there is nothing usable. */
export function decodeScenario(t: Template, hash: string): Scenario | null {
  const raw = new URLSearchParams(hash.replace(/^#/, '')).get(PARAM)
  if (!raw) return null
  let p: Partial<Packed>
  try {
    p = JSON.parse(fromBase64Url(raw)) as Partial<Packed>
  } catch {
    return null
  }
  if (!p || typeof p !== 'object' || p.v !== VERSION || !isNum(p.s)) return null

  const s = defaultScenario(t, p.s >>> 0)
  const known = new Set<string>(UNCERTAIN_KEYS)
  for (const [k, v] of Object.entries(p.u ?? {})) {
    if (known.has(k) && Array.isArray(v) && v.length === 3 && v.every(isNum)) {
      s.uncertain[k as UncertainKey] = { worst: v[0]!, base: v[1]!, best: v[2]! }
    }
  }
  for (const [k, v] of Object.entries(p.m ?? {})) {
    if (!known.has(k) || typeof v !== 'string') continue
    const flags: Partial<Record<Side, boolean>> = {}
    if (v.includes('w')) flags.worst = true
    if (v.includes('b')) flags.best = true
    s.manual[k as UncertainKey] = flags
  }
  for (const [k, v] of Object.entries(p.l ?? {})) {
    if (!known.has(k) || !Array.isArray(v) || v.length !== 2) continue
    const lim: { lower?: number; upper?: number } = {}
    if (isNum(v[0])) lim.lower = v[0]
    if (isNum(v[1])) lim.upper = v[1]
    s.limits[k as UncertainKey] = lim
  }
  for (const [k, v] of Object.entries(p.d ?? {})) {
    if (k in s.decisions && isNum(v)) s.decisions[k as keyof DayDecisions] = v
  }
  if (p.cm === 1) s.capacityManual = true
  if (p.c === 'independent' || p.c === 'default' || p.c === 'strong') s.correlationMode = p.c
  const g = p.g
  if (
    g &&
    (g.metric === 'profit' || g.metric === 'sales') &&
    (g.direction === 'at-least' || g.direction === 'below') &&
    isNum(g.amount)
  ) {
    s.goal = { metric: g.metric, direction: g.direction, amount: g.amount }
  }
  return s
}
