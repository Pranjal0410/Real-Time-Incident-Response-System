/**
 * ReadOnlyBanner Component
 * Shows a subtle banner for viewers indicating read-only mode - Dark theme
 */
import { Lock } from '@phosphor-icons/react';
import { useAuthStore } from '../stores';

export function ReadOnlyBanner() {
  const user = useAuthStore((state) => state.user);

  // Only show for viewers
  if (user?.role !== 'viewer') {
    return null;
  }

  return (
    <div className="alert alert--warning mt-4" role="status">
      <Lock size={15} weight="fill" className="flex-shrink-0 mt-0.5" />
      <span>Read-only mode. You can follow this incident but not modify it.</span>
    </div>
  );
}

export default ReadOnlyBanner;
