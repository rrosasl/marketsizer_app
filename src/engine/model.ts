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
  /** Owner works the same hours as staff (open + setup). Rate may be 0. */
  ownerRatePerHour: number
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
  staff: number
  ownerPay: number
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
  const rent = d.rentFixedPerDay + netSales * d.rentRevenueShare
  const workedHours = d.openHours + d.setupHours
  const staff = d.staffCount * workedHours * d.staffCostPerHour
  const ownerPay = workedHours * d.ownerRatePerHour
  const otherCosts = d.otherCostsPerDay
  const dailyCosts = ingredients + paymentFees + rent + staff + ownerPay + otherCosts
  const profit = netSales - dailyCosts

  const netPerOrder = u.avgSpendGross * netPerGross
  const contributionPerOrder =
    netPerOrder * (1 - d.rentRevenueShare) - u.costPerOrder - u.avgSpendGross * d.cardFeeRate
  const fixedPerDay = d.rentFixedPerDay + staff + ownerPay + otherCosts
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
    staff,
    ownerPay,
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

/** Margin of safety = (expected − break-even) / expected orders. Thresholds: SPEC §6 (v0.3). */
export function marginOfSafety(expectedOrders: number, breakevenOrders: number): number {
  if (!(expectedOrders > 0)) return -Infinity
  return (expectedOrders - breakevenOrders) / expectedOrders
}

export function marginWord(margin: number): MarginWord {
  if (margin < 0) return 'negative'
  if (margin <= 0.15) return 'thin'
  return 'comfortable'
}
