export function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function formatCurrency(value, fallback = '0.00') {
  return `€${toSafeNumber(value, 0).toFixed(2)}`
}

export function formatMetric(value, fallback = '0') {
  return toSafeNumber(value, 0).toFixed(0)
}
