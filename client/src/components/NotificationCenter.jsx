import { useNotificationStore } from '../stores';
import { useClickOutside } from '../hooks';
import { useRef } from 'react';

export function NotificationCenter({ isOpen, onClose }) {
  const ref = useRef(null);
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  useClickOutside(ref, onClose);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: '56px',
        right: '24px',
        zIndex: 50,
        width: '384px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-primary)',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h2 className="text-lg font-semibold text-primary">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-secondary mt-1">{unreadCount} unread</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-secondary hover:text-primary transition"
          title="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ maxHeight: '384px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-primary)',
                backgroundColor: !notification.read ? 'rgba(45, 45, 45, 0.5)' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = !notification.read ? 'rgba(45, 45, 45, 0.5)' : 'transparent')}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{notification.icon || '📢'}</span>
                    <p className="text-primary font-medium truncate">
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <span className="ml-auto w-2 h-2 bg-accent-primary rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1">
                    {formatTime(notification.timestamp)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  className="text-secondary hover:text-primary transition flex-shrink-0"
                  title="Dismiss"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      {notifications.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderTop: '1px solid var(--border-primary)',
            padding: '0.5rem 1rem',
            display: 'flex',
            gap: '0.5rem'
          }}
        >
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex-1 text-sm text-accent-primary hover:text-accent-secondary transition font-medium"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={clearAll}
            className="flex-1 text-sm text-secondary hover:text-primary transition font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp) {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export default NotificationCenter;
