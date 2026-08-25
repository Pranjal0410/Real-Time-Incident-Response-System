/**
 * CommandPalette
 *
 * ⌘K / Ctrl-K anywhere in the app. During an incident an operator is typing,
 * not hunting for a sidebar link, so every destination and every quick action
 * is reachable from the keyboard without leaving the current page.
 *
 * Fully mouse-operable too — each row is a real button.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  SquaresFour,
  Warning,
  SignOut,
  ArrowRight,
  Plus,
} from '@phosphor-icons/react';
import { useIncidentStore, useAuthStore } from '../stores';
import { SIGNAL_VAR } from '../constants/signals';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const navigate = useNavigate();
  const incidents = useIncidentStore((state) => state.incidents);
  const canWrite = useAuthStore((state) => state.canWrite());
  const logout = useAuthStore((state) => state.logout);

  // Global hotkey. Bound once, on the window, so it works from any page.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const run = (action) => {
    close();
    action();
  };

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];

    const navItems = [
      {
        id: 'nav-overview',
        group: 'Go to',
        label: 'Overview',
        hint: 'Live incident posture',
        icon: <SquaresFour size={16} />,
        run: () => navigate('/'),
      },
      {
        id: 'nav-incidents',
        group: 'Go to',
        label: 'All incidents',
        hint: 'Filterable incident queue',
        icon: <Warning size={16} />,
        run: () => navigate('/incidents'),
      },
    ];

    const actionItems = [];
    if (canWrite) {
      actionItems.push({
        id: 'action-create',
        group: 'Actions',
        label: 'Declare new incident',
        hint: 'Opens the declaration form',
        icon: <Plus size={16} />,
        run: () => navigate('/incidents?new=1'),
      });
    }
    actionItems.push({
      id: 'action-logout',
      group: 'Actions',
      label: 'Sign out',
      icon: <SignOut size={16} />,
      run: () => {
        logout();
        navigate('/login');
      },
    });

    const matches = (text) => !q || (text || '').toLowerCase().includes(q);

    result.push(...navItems.filter((i) => matches(i.label)));

    // Incidents rank above static entries once the operator starts typing.
    const incidentItems = incidents
      .filter(
        (incident) =>
          matches(incident.title) ||
          matches(incident.severity) ||
          matches(incident.status) ||
          matches(incident.commander?.name)
      )
      .slice(0, 6)
      .map((incident) => ({
        id: incident._id,
        group: 'Incidents',
        label: incident.title,
        hint: `${incident.severity} · ${incident.status}`,
        signal: SIGNAL_VAR[incident.severity],
        run: () => navigate(`/incidents/${incident._id}`),
      }));

    result.push(...incidentItems);
    result.push(...actionItems.filter((i) => matches(i.label)));

    return result;
  }, [query, incidents, canWrite, navigate, logout]);

  // Keep the highlighted row in range as the result set shrinks.
  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(items.length - 1, 0)));
  }, [items.length]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(items.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) run(item.run);
    }
  };

  // Scroll the highlighted row into view when navigating by keyboard.
  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  let lastGroup = null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            className="cmdk"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2 px-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <MagnifyingGlass size={16} className="text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search incidents or jump to a page…"
                className="cmdk__input"
                style={{ borderBottom: 'none', padding: '0 0 0 4px', flex: 1 }}
                aria-label="Search"
                aria-activedescendant={items[activeIndex]?.id}
              />
              <kbd className="kbd flex-shrink-0">esc</kbd>
            </div>

            <div className="cmdk__list" ref={listRef} role="listbox">
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted">
                  Nothing matches “{query}”.
                </p>
              )}

              {items.map((item, index) => {
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <div key={item.id}>
                    {showGroup && <div className="cmdk__group">{item.group}</div>}
                    <button
                      id={item.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      data-active={index === activeIndex}
                      className="cmdk__item"
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => run(item.run)}
                    >
                      {item.signal ? (
                        <span
                          className="signal-dot flex-shrink-0"
                          style={{ backgroundColor: item.signal }}
                        />
                      ) : (
                        <span className="flex-shrink-0 text-muted">{item.icon}</span>
                      )}
                      <span className="truncate">{item.label}</span>
                      {item.hint && (
                        <span className="ml-auto text-xs text-muted capitalize flex-shrink-0">
                          {item.hint}
                        </span>
                      )}
                      {index === activeIndex && (
                        <ArrowRight size={13} className="text-muted flex-shrink-0" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              className="flex items-center gap-4 px-4 py-2 text-xs text-muted"
              style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-base)' }}
            >
              <span className="flex items-center gap-1.5">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="kbd">↵</kbd>
                open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default CommandPalette;
