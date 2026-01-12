import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import useDashboard from '../../hooks/useDashboard'

// Mock API
global.fetch = vi.fn()

describe('useDashboard', () => {
  beforeEach(() => {
    localStorage.getItem = vi.fn((key) => {
      if (key === 'token') return 'mock-token'
      return null
    })
    vi.clearAllMocks()
  })

  it('fetches dashboard data on mount', async () => {
    const mockDashboardData = {
      total_batches: 100,
      active_alerts: 5,
      waste_reduction: 15.5,
    }

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.data).toEqual(mockDashboardData)
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles fetch error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
      expect(result.current.loading).toBe(false)
    })
  })
})










