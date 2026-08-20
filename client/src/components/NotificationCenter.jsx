/**
 * NotificationCenter
 *
 * Rebuilt on the design system: the previous version carried ~60 lines of
 * inline styles (including a hardcoded `rgba(45,45,45,0.5)` unread tint left
 * over from an older palette) and hand-managed hover through onMouseEnter /
 * onMouseLeave handlers that mutated `style` directly.
 *
 * Also adds Escape-to-close, which the popover previously lacked.
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BellSlash, Check } from '@phosphor-icons/react';
import { useNotificationStore } from '../stores';
import { useClickOutside } from '../hooks';
import { SIGNAL_VAR } from '../constants/signals';

/** Maps a notification to a signal hue; anything unrecognised stays neutral. */
function toneFor(notification) {
  const key = notification.severity || notification.tone;
  return SIGNAL_VAR[key] || 'var(--text-lo)';
}

function formatTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function NotificationCenter({ isOpen, onClose }) {
  const ref = useRef(null);
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  useClickOutside(ref, onClose);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-label="Notifications"
          className="fixed rounded-xl overflow-hidden"
          style={{
            top: 'calc(var(--topbar-h) + 6px)',
            right: 20,
            zIndex: 45,
            width: 372,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--line-strong)',
            boxShadow: '0 24px 64px -12px rgba(4, 6, 9, 0.85)',
          }}
          initial={{ opacity: 0, y: -6, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.99 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        >
          <header
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div>
              <h2 className="text-[14px] font-semibold text-primary">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[12px] text-muted mt-0.5 tabular">{unreadCount} unread</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="modal__close"
              aria-label="Close notifications"
            >
              <X size={15} weight="bold" />
            </button>
          </header>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <BellSlash size={22} className="mx-auto mb-2.5" style={{ color: 'var(--text-lo)' }} />
                <p className="text-[14px] text-secondary">You are all caught up</p>
                <p className="text-[13px] text-muted mt-1">
                  Incident activity will appear here as it happens.
                </p>
              </div>
            ) : (
              <ul>
                <AnimatePresence initial={false}>
                  {notifications.map((notification, index) => (
                    <motion.li
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                      style={{ borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}
                    >
                      <div
                        className="group relative flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-tertiary"
                        style={{
                          background: notification.read ? 'transparent' : 'var(--bg-raised)',
                        }}
                      >
                        <span
                          className="signal-dot mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: toneFor(notification) }}
                          aria-hidden="true"
                        />

                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="min-w-0 flex-1 text-left"
                          aria-label={
                            notification.read
                              ? notification.message
                              : `Mark as read: ${notification.message}`
                          }
                        >
                          <p className="text-[14px] text-primary leading-snug">
                            {notification.message}
                          </p>
                          <p className="text-[12px] text-muted mt-1 tabular">
                            {formatTime(notification.timestamp)}
                          </p>
                        </button>

                        {!notification.read && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: 'var(--accent)' }}
                            aria-label="Unread"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => removeNotification(notification.id)}
                          className="modal__close flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                          style={{ width: 22, height: 22 }}
                          aria-label="Dismiss notification"
                          title="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <footer
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-base)' }}
            >
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} className="btn btn--ghost btn--sm flex-1">
                  <Check size={13} weight="bold" />
                  Mark all read
                </button>
              )}
              <button type="button" onClick={clearAll} className="btn btn--ghost btn--sm flex-1">
                Clear all
              </button>
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NotificationCenter;
