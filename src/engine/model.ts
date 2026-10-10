/** The uncertain inputs (worst / base / best) for one day type. SPEC §3–4. */
export interface DayUncertain {
  /** Busy hours per day (h). */
  peakHours: number
  /** Customers wanting to order per busy hour (demand, before the capacity cap). */
  peakDemand: number
  /** Customers wanting to order per quiet hour. */
  offpeakDemand: number
  /** Average spend per order, incl. VAT (€). */
  avgSpendGross: number
  /** Ingredients + packaging per order (€). */
  costPerOrder: number
}

/** The decisions (single values) for one day type. SPEC §4. */
export interface DayDecisions {
  openHours: number
  capacityPerHour: number
  staffCount: number
  setupHours: number
  staffCostPerHour: number
  rentFixedPerDay: number
  rentRevenueShare: number
  cardFeeRate: number
  vatFood: number
  vatDrinks: number
  drinksShare: number
  otherCostsPerDay: number
}

export interface DayResult {
  demandOrders: number
  orders: number
  lostOrders: number
  /** Gross sales of the orders lost to the capacity cap (what those customers would have paid). */
  lostGrossSales: number
  grossSales: number
  netSales: number
  ingredients: number
  paymentFees: number
  rent: number
  /** Fixed part of the rent (per day). */
  rentFixed: number
  /** Rent charged as a share of sales. */
  rentVariable: number
  staff: number
  otherCosts: number
  dailyCosts: number
  profit: number
  netPerOrder: number
  contributionPerOrder: number
  fixedPerDay: number
  /** Orders per day needed to cover costs. Infinity when every order loses money. */
  breakevenOrders: number
  /** Most orders the stand can serve in a day (capacity × opening hours). */
  maxOrdersPerDay: number
}

const pos = (x: number) => (x > 0 ? x : 0)

/** One day of trading, SPEC §3 (v0.3). Pure and scalar: called once per simulated scenario. */
export function simulateDay(u: DayUncertain, d: DayDecisions): DayResult {
  const peakHours = Math.min(Math.max(u.peakHours, 0), d.openHours)
  const offpeakHours = d.openHours - peakHours
  const cap = d.capacityPerHour

  const peakOrders = Math.min(u.peakDemand, cap) * peakHours
  const offpeakOrders = Math.min(u.offpeakDemand, cap) * offpeakHours
  const orders = peakOrders + offpeakOrders
  const lostOrders = pos(u.peakDemand - cap) * peakHours + pos(u.offpeakDemand - cap) * offpeakHours
  const demandOrders = orders + lostOrders

  const netPerGross = (1 - d.drinksShare) / (1 + d.vatFood) + d.drinksShare / (1 + d.vatDrinks)
  const grossSales = orders * u.avgSpendGross
  const netSales = grossSales * netPerGross

  const ingredients = orders * u.costPerOrder
  const paymentFees = grossSales * d.cardFeeRate
  const rentVariable = netSales * d.rentRevenueShare
  const rent = d.rentFixedPerDay + rentVariable
  const workedHours = d.openHours + d.setupHours
  const staff = d.staffCount * workedHours * d.staffCostPerHour
  const otherCosts = d.otherCostsPerDay
  const dailyCosts = ingredients + paymentFees + rent + staff + otherCosts
  const profit = netSales - dailyCosts

  const netPerOrder = u.avgSpendGross * netPerGross
  const contributionPerOrder =
    netPerOrder * (1 - d.rentRevenueShare) - u.costPerOrder - u.avgSpendGross * d.cardFeeRate
  const fixedPerDay = d.rentFixedPerDay + staff + otherCosts
  const breakevenOrders = contributionPerOrder > 0 ? fixedPerDay / contributionPerOrder : Infinity

  return {
    demandOrders,
    orders,
    lostOrders,
    lostGrossSales: lostOrders * u.avgSpendGross,
    grossSales,
    netSales,
    ingredients,
    paymentFees,
    rent,
    rentFixed: d.rentFixedPerDay,
    rentVariable,
    staff,
    otherCosts,
    dailyCosts,
    profit,
    netPerOrder,
    contributionPerOrder,
    fixedPerDay,
    breakevenOrders,
    maxOrdersPerDay: cap * d.openHours,
  }
}

export type MarginWord = 'negative' | 'thin' | 'comfortable'

/** Margin of safety = (expected − break-even) / expected orders. */
export function marginOfSafety(expectedOrders: number, breakevenOrders: number): number {
  if (!(expectedOrders > 0)) return -Infinity
  return (expectedOrders - breakevenOrders) / expectedOrders
}

/** Thresholds for the cushion label, as a chance that a typical day makes a profit. SPEC §6. */
export const CUSHION_HEALTHY = 0.9
export const CUSHION_THIN = 0.5

/**
 * Cushion label from the chance that a typical day makes a profit, so it can never contradict the
 * profit card: ≥ 90% healthy, 50–90% thin, below 50% (most likely day loses money) negative.
 */
export function cushionWord(profitChance: number): MarginWord {
  if (profitChance >= CUSHION_HEALTHY) return 'comfortable'
  if (profitChance >= CUSHION_THIN) return 'thin'
  return 'negative'
}

export type CostKind = 'fixed' | 'variable'
export type CostItemKey = 'wages' | 'rentFixed' | 'other' | 'ingredients' | 'cardFees' | 'rentShare'

export interface CostItem {
  key: CostItemKey
  kind: CostKind
  amount: number
}

/**
 * A day's costs split into fixed (the same however busy the day is) and variable (grow with each
 * order or with sales). Items with zero cost are left out; largest first. Sums to `dailyCosts`.
 */
export function costBreakdown(day: DayResult): {
  items: CostItem[]
  fixed: number
  variable: number
  total: number
} {
  const all: CostItem[] = [
    { key: 'wages', kind: 'fixed', amount: day.staff },
    { key: 'rentFixed', kind: 'fixed', amount: day.rentFixed },
    { key: 'other', kind: 'fixed', amount: day.otherCosts },
    { key: 'ingredients', kind: 'variable', amount: day.ingredients },
    { key: 'cardFees', kind: 'variable', amount: day.paymentFees },
    { key: 'rentShare', kind: 'variable', amount: day.rentVariable },
  ]
  const items = all.filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount)
  const fixed = items.filter((i) => i.kind === 'fixed').reduce((s, i) => s + i.amount, 0)
  const variable = items.filter((i) => i.kind === 'variable').reduce((s, i) => s + i.amount, 0)
  return { items, fixed, variable, total: fixed + variable }
}
