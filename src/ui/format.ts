const euroFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats a number as euros in the app-wide style, e.g. €1,234.50 or −€80.00. */
export function formatEuro(value: number): string {
  return euroFormatter.format(value).replace('-', '−')
}
