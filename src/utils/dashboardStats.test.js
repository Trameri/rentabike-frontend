import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAnnualDashboardStats } from './dashboardStats.js'

test('counts completed-like contracts in the current year and uses stored totals', () => {
  const contracts = [
    {
      status: 'completed',
      endAt: '2026-06-10T00:00:00.000Z',
      totals: { bikesTotal: 20, insuranceTotal: 5, extrasTotal: 3, grandTotal: 28 }
    },
    {
      status: 'closed',
      endAt: '2025-01-10T00:00:00.000Z',
      totals: { bikesTotal: 10, insuranceTotal: 0, extrasTotal: 0, grandTotal: 10 }
    },
    {
      status: 'in-use',
      startAt: '2026-01-01T00:00:00.000Z',
      items: []
    },
    {
      status: 'returned',
      returnedAt: '2026-02-10T00:00:00.000Z',
      totals: { bikesTotal: 35, insuranceTotal: 0, extrasTotal: 5, grandTotal: 40 }
    }
  ]

  const stats = calculateAnnualDashboardStats(contracts, 2026)

  assert.equal(stats.closedContracts, 2)
  assert.equal(stats.total, 68)
  assert.equal(stats.bikesTotal, 55)
  assert.equal(stats.insuranceTotal, 5)
  assert.equal(stats.extrasTotal, 8)
})

test('falls back to the start date when no end date exists for a completed contract', () => {
  const stats = calculateAnnualDashboardStats([
    {
      status: 'completed',
      startAt: '2026-05-01T00:00:00.000Z',
      totals: { bikesTotal: 12, insuranceTotal: 0, extrasTotal: 0, grandTotal: 12 }
    }
  ], 2026)

  assert.equal(stats.closedContracts, 1)
  assert.equal(stats.total, 12)
})
