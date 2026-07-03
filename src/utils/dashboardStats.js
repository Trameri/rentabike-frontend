import { calculateSeparateTotals } from './contractCalculations.js'

const CLOSED_STATUS_VALUES = ['closed', 'completed', 'returned']

function getContractYear(contract) {
  const candidateDates = [
    contract.endAt,
    contract.returnedAt,
    contract.closedAt,
    contract.startAt,
    contract.createdAt
  ].filter(Boolean)

  const date = candidateDates
    .map((value) => new Date(value))
    .find((candidate) => !Number.isNaN(candidate.getTime()))

  return date ? date.getFullYear() : null
}

function isClosedContract(contract) {
  const status = String(contract?.status || '').toLowerCase()
  if (CLOSED_STATUS_VALUES.includes(status)) return true

  if (contract?.paymentCompleted || contract?.paid) {
    return true
  }

  return false
}

export function calculateAnnualDashboardStats(contracts = [], year = new Date().getFullYear()) {
  const stats = {
    total: 0,
    bikesTotal: 0,
    insuranceTotal: 0,
    extrasTotal: 0,
    closedContracts: 0
  }

  const normalizedContracts = Array.isArray(contracts) ? contracts : []

  normalizedContracts.forEach((contract) => {
    const contractYear = getContractYear(contract)
    if (contractYear !== year) return

    const { bikesTotal, insuranceTotal, extrasTotal, total } = calculateSeparateTotals(contract)
    stats.bikesTotal += bikesTotal
    stats.insuranceTotal += insuranceTotal
    stats.extrasTotal += extrasTotal
    stats.total += total

    if (isClosedContract(contract)) {
      stats.closedContracts += 1
    }
  })

  return {
    ...stats,
    total: Math.round(stats.total * 100) / 100,
    bikesTotal: Math.round(stats.bikesTotal * 100) / 100,
    insuranceTotal: Math.round(stats.insuranceTotal * 100) / 100,
    extrasTotal: Math.round(stats.extrasTotal * 100) / 100
  }
}
