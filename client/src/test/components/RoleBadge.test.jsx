import { render, screen} from '@testing-library/react'
import { describe, it, expect, vi} from 'vitest'

vi.mock('../../stores', ()=>({
    useAuthStore: (selector) => selector({
        user: {role: 'admin'}
    })
}) )

import RoleBadge from '../../components/RoleBadge'

describe('RoleBadge Component', () => {

    it('renders Administrator label for admin role', () => {
      // ARRANGE — component render karo
      render(<RoleBadge />)
  
      // ASSERT — "Administrator" text page mein hai?
      // getRoleLabel('admin') = 'Administrator'
      expect(screen.getByText('Administrator')).toBeInTheDocument()
    })
  
    it('renders tooltip text for admin', () => {
      render(<RoleBadge />)
  
      // title attribute mein tooltip text hai?
      const badge = screen.getByTitle(/administrators can manage/i)
      expect(badge).toBeInTheDocument()
    })
  
    it('renders description when showDescription is true', () => {
      render(<RoleBadge showDescription={true} />)
  
      // Description text dikhna chahiye
      expect(screen.getByText('Full access to all features')).toBeInTheDocument()
    })
  
    it('does not render description by default', () => {
      render(<RoleBadge />)
  
      // By default showDescription=false — description nahi dikhni chahiye
      expect(screen.queryByText('Full access to all features')).not.toBeInTheDocument()
    })
  
  })