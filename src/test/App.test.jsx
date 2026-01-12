import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock router
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
  Navigate: () => <div>Navigate</div>,
}))

describe('App', () => {
  beforeEach(() => {
    localStorage.getItem = vi.fn(() => null)
  })

  it('renders without crashing', () => {
    render(<App />)
    expect(screen).toBeDefined()
  })
})










