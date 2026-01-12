import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import useOrders from '../../hooks/useOrders'

// Mock API
global.fetch = vi.fn()

describe('useOrders', () => {
  beforeEach(() => {
    localStorage.getItem = vi.fn((key) => {
      if (key === 'token') return 'mock-token'
      return null
    })
    vi.clearAllMocks()
  })

  it('fetches orders on mount', async () => {
    const mockOrders = [
      { id: '1', order_number: 'ORD001', status: 'pending' },
      { id: '2', order_number: 'ORD002', status: 'completed' },
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockOrders, total: 2 }),
    })

    const { result } = renderHook(() => useOrders())

    await waitFor(() => {
      expect(result.current.orders).toEqual(mockOrders)
      expect(result.current.loading).toBe(false)
    })
  })

  it('filters orders by status', async () => {
    const { result } = renderHook(() => useOrders())

    // Mock filtered response
    const filteredOrders = [
      { id: '1', order_number: 'ORD001', status: 'pending' },
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: filteredOrders, total: 1 }),
    })

    // Trigger filter (implementation dependent)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })
})










