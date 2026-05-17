import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// ─────────────────────────────────────────
// MOCK — store ko fake karo
// vi.fn() banata hai ek fake function
// Har test mein alag role set kar sakte hain
// ─────────────────────────────────────────
const mockUseAuthStore = vi.fn()

vi.mock('../../stores', () => ({
  useAuthStore: (selector) => mockUseAuthStore(selector)
}))

import RoleGate, { WriteGate, AdminGate } from '../../components/RoleGate'

// ─────────────────────────────────────────
// Helper function — role set karna easy karo
// ─────────────────────────────────────────
const setRole = (role) => {
  // Jab bhi useAuthStore(selector) call ho
  // selector ko fake user deke result return karo
  mockUseAuthStore.mockImplementation((selector) =>
    selector({ user: { role } })
  )
}

// ─────────────────────────────────────────
// RoleGate Tests
// ─────────────────────────────────────────
describe('RoleGate Component', () => {

  // Test 1: Admin allowed role mein hai — children dikhne chahiye
  it('renders children when user role is allowed', () => {
    setRole('admin')

    render(
      <RoleGate allowedRoles={['admin', 'responder']}>
        <button>Edit Incident</button>
      </RoleGate>
    )

    // "Edit Incident" button dikhna chahiye
    expect(screen.getByText('Edit Incident')).toBeInTheDocument()
  })

  // Test 2: Viewer allowed nahi — children nahi dikhne chahiye
  it('does not render children when role is not allowed', () => {
    setRole('viewer')

    render(
      <RoleGate allowedRoles={['admin', 'responder']}>
        <button>Edit Incident</button>
      </RoleGate>
    )

    // Viewer ko Edit button nahi dikhna chahiye
    expect(screen.queryByText('Edit Incident')).not.toBeInTheDocument()
  })

  // Test 3: Viewer + showMessage=true — message dikhna chahiye
  it('shows permission message for viewer when showMessage is true', () => {
    setRole('viewer')

    render(
      <RoleGate allowedRoles={['admin', 'responder']} showMessage={true}>
        <button>Edit Incident</button>
      </RoleGate>
    )

    // Viewer ko yeh message dikhna chahiye
    expect(
      screen.getByText('View only - you cannot modify incidents')
    ).toBeInTheDocument()
  })

  // Test 4: No role — fallback return hona chahiye
  it('renders fallback when user has no role', () => {
    // No role — null user
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ user: null })
    )

    render(
      <RoleGate allowedRoles={['admin']} fallback={<span>Please login</span>}>
        <button>Secret Button</button>
      </RoleGate>
    )

    expect(screen.getByText('Please login')).toBeInTheDocument()
    expect(screen.queryByText('Secret Button')).not.toBeInTheDocument()
  })

})

// ─────────────────────────────────────────
// WriteGate Tests
// ─────────────────────────────────────────
describe('WriteGate Component', () => {

  // Test 5: Responder — WriteGate mein children dikhne chahiye
  it('renders children for responder', () => {
    setRole('responder')

    render(
      <WriteGate>
        <button>Add Note</button>
      </WriteGate>
    )

    expect(screen.getByText('Add Note')).toBeInTheDocument()
  })

  // Test 6: Viewer — WriteGate mein children nahi dikhne chahiye
  it('blocks viewer from WriteGate', () => {
    setRole('viewer')

    render(
      <WriteGate>
        <button>Add Note</button>
      </WriteGate>
    )

    expect(screen.queryByText('Add Note')).not.toBeInTheDocument()
  })

})

// ─────────────────────────────────────────
// AdminGate Tests
// ─────────────────────────────────────────
describe('AdminGate Component', () => {

  // Test 7: Admin — AdminGate mein children dikhne chahiye
  it('renders children for admin', () => {
    setRole('admin')

    render(
      <AdminGate>
        <button>Delete Incident</button>
      </AdminGate>
    )

    expect(screen.getByText('Delete Incident')).toBeInTheDocument()
  })

  // Test 8: Responder — AdminGate mein children nahi dikhne chahiye
  it('blocks responder from AdminGate', () => {
    setRole('responder')

    render(
      <AdminGate>
        <button>Delete Incident</button>
      </AdminGate>
    )

    expect(screen.queryByText('Delete Incident')).not.toBeInTheDocument()
  })

})