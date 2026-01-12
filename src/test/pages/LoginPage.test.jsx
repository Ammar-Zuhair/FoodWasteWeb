import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '../../pages/LoginPage'

// Mock API
global.fetch = vi.fn()

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    expect(screen.getByLabelText(/username|email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login|sign in/i })).toBeInTheDocument()
  })

  it('shows validation error for empty fields', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const submitButton = screen.getByRole('button', { name: /login|sign in/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      // Check for validation errors (implementation dependent)
      expect(screen.getByText(/required|please enter/i)).toBeInTheDocument()
    })
  })

  it('handles successful login', async () => {
    const mockToken = 'mock-jwt-token'
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: mockToken, token_type: 'bearer' }),
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const usernameInput = screen.getByLabelText(/username|email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login|sign in/i })
    
    fireEvent.change(usernameInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'admin123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('token', mockToken)
    })
  })

  it('handles login error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )
    
    const usernameInput = screen.getByLabelText(/username|email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login|sign in/i })
    
    fireEvent.change(usernameInput, { target: { value: 'wrong' } })
    fireEvent.change(passwordInput, { target: { value: 'wrong' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid|error/i)).toBeInTheDocument()
    })
  })
})










