import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../../components/ErrorBoundary'

// Mock console.error to avoid noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn()
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders error message when error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    // Error boundary should catch and display error
    expect(screen.getByText(/error|something went wrong/i)).toBeInTheDocument()
  })
})










