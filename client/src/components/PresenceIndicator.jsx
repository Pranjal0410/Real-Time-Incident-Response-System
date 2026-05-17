/**
 * PresenceIndicator Component
 * Shows who is currently viewing the incident - Dark theme
 */
import { usePresenceStore, useAuthStore } from '../stores';
import { Tooltip } from './Tooltip';

export function PresenceIndicator({ incidentId }) {
  const users = usePresenceStore((state) => state.getIncidentUsers(incidentId));
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?._id;

  // Filter out current user for "others" display
  const otherUsers = users.filter((u) => u.userId !== currentUserId);

  // Total viewers count (including current user)
  const totalViewers = users.length > 0 ? users.length : 1;

  return (
    <div className="presence-indicator flex items-center gap-4">
      {/* Viewer count */}
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-sm text-secondary">
          {totalViewers} {totalViewers === 1 ? 'viewer' : 'viewers'}
        </span>
      </div>

      {/* Current user */}
      <div className="flex items-center gap-2">
        <Tooltip
          content={
            <div className="text-center">
              <div className="font-semibold">{currentUser?.name}</div>
              <div className="text-xs text-gray-400">{currentUser?.role || 'User'}</div>
            </div>
          }
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:ring-2 hover:ring-offset-1"
            style={{
              backgroundColor: 'var(--accent-primary)',
              '--ring-offset-color': 'var(--bg-secondary)'
            }}
          >
            {getInitials(currentUser?.name)}
          </div>
        </Tooltip>
        <span className="text-sm text-primary">You</span>
      </div>

      {/* Other users */}
      {otherUsers.length > 0 && (
        <>
          <div className="h-4 w-px" style={{ backgroundColor: 'var(--border-primary)' }}></div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary">Also viewing:</span>
            <div className="flex -space-x-2">
              {otherUsers.slice(0, 5).map((user) => (
                <Tooltip
                  key={user.userId}
                  content={
                    <div className="text-center">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.role || 'User'}</div>
                    </div>
                  }
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 cursor-pointer hover:ring-2 hover:ring-offset-1"
                    style={{
                      backgroundColor: user.color,
                      borderColor: 'var(--bg-secondary)',
                      '--ring-offset-color': 'var(--bg-secondary)'
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                </Tooltip>
              ))}
              {otherUsers.length > 5 && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--bg-secondary)'
                  }}
                >
                  +{otherUsers.length - 5}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Get initials from name
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default PresenceIndicator;
