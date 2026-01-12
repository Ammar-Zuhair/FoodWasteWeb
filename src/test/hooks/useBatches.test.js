import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import useBatches from '../../hooks/useBatches'

// Mock API
global.fetch = vi.fn()

describe('useBatches', () => {
  beforeEach(() => {
    localStorage.getItem = vi.fn((key) => {
      if (key === 'token') return 'mock-token'
      return null
    })
    vi.clearAllMocks()
  })

  it('fetches batches on mount', async () => {
    const mockBatches = [
      { id: '1', batch_code: 'BATCH001', status: 'active' },
      { id: '2', batch_code: 'BATCH002', status: 'completed' },
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockBatches, total: 2 }),
    })

    const { result } = renderHook(() => useBatches())

    await waitFor(() => {
      expect(result.current.batches).toEqual(mockBatches)
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles fetch error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useBatches())

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
      expect(result.current.loading).toBe(false)
    })
  })
})










