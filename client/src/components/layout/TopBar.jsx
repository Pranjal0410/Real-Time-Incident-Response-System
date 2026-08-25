/**
 * TopBar
 * Page title, search, live connection state, notifications.
 * The search field advertises the ⌘K palette so the shortcut is discoverable
 * rather than hidden.
 */
import { useEffect, useRef, useState } from 'react';
import { List, Bell, MagnifyingGlass } from '@phosphor-icons/react';
import { ConnectionStatus } from '../ConnectionStatus';
import { NotificationCenter } from '../NotificationCenter';
import { useNotificationStore } from '../../stores';

export function TopBar({ title, actions, searchQuery, onSearchChange, onMenuClick }) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const unreadCount = useNotificationStore((state) => state.getUnreadCount());
  const searchRef = useRef(null);

  // "/" focuses search, the way every incident tool the team already uses does.
  useEffect(() => {
    if (!onSearchChange) return undefined;
    const onKeyDown = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSearchChange]);

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          onClick={onMenuClick}
          className="btn btn--ghost btn--icon btn--sm lg:hidden"
          aria-label="Open navigation"
        >
          <List size={18} />
        </button>

        {title && (
          <h1 className="text-[16px] font-semibold text-primary truncate">{title}</h1>
        )}

        {onSearchChange ? (
          <div className="topbar__search">
            <MagnifyingGlass className="topbar__search-icon" size={15} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search incidents"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="topbar__search-input"
              aria-label="Search incidents"
            />
            {!searchQuery && (
              <span
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none"
                aria-hidden="true"
              >
                <kbd className="kbd">/</kbd>
              </span>
            )}
          </div>
        ) : (
          <div className="ml-auto" />
        )}

        <div className="topbar__actions">
          {actions}

          <ConnectionStatus />

          <div className="hidden md:block w-px h-5" style={{ background: 'var(--line)' }} />

          <button
            type="button"
            onClick={() => setNotificationOpen((open) => !open)}
            className="topbar__notification"
            aria-label={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
            }
            aria-expanded={notificationOpen}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="topbar__notification-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <NotificationCenter
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </>
  );
}

export default TopBar;
