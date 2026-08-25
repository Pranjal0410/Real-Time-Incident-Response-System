/**
 * StatusSelector
 * Role-aware control for moving an incident through its status flow.
 *
 * Fixes carried in beyond the restyle:
 *  - The "someone else is editing this" pulse was animating
 *    `rgba(212,168,83,…)` — a gold accent from a theme this app no longer uses.
 *    It now uses the focused user's own presence colour, which is what the
 *    indicator above the control already shows.
 *  - The dropdown could only be closed by picking an option: no Escape, no
 *    click-outside, no arrow-key navigation.
 *  - Its status list was a fourth hardcoded copy of the status/colour map.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, Check } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useAuthStore } from '../stores';
import { useFocus, useClickOutside } from '../hooks';
import { updateStatus } from '../services/socket';
import {
  STATUS_ORDER,
  STATUS_LABEL,
  STATUS_HINT,
  SIGNAL_VAR,
  badgeClass,
} from '../constants/signals';

export function StatusSelector({ incidentId, currentStatus }) {
  const canWrite = useAuthStore((state) => state.canWrite());
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [confirmation, setConfirmation] = useState(null);
  const containerRef = useRef(null);

  const { onFocus, onBlur, focusedUsers, hasFocus } = useFocus(incidentId, 'status');

  const close = () => {
    setIsOpen(false);
    onBlur();
  };

  useClickOutside(containerRef, () => isOpen && close());

  useEffect(() => {
    if (!confirmation) return undefined;
    const timer = setTimeout(() => setConfirmation(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  useEffect(() => {
    if (isOpen) setHighlighted(Math.max(STATUS_ORDER.indexOf(currentStatus), 0));
  }, [isOpen, currentStatus]);

  const handleStatusChange = (newStatus) => {
    if (newStatus !== currentStatus) {
      updateStatus(incidentId, newStatus);
      setConfirmation(`Status set to ${STATUS_LABEL[newStatus]}`);
    }
    close();
  };

  const onKeyDown = (event) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
        onFocus();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % STATUS_ORDER.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((i) => (i - 1 + STATUS_ORDER.length) % STATUS_ORDER.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleStatusChange(STATUS_ORDER[highlighted]);
    }
  };

  // Viewers get the state, not the control.
  if (!canWrite) {
    return (
      <div className="status-badge-readonly flex items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentStatus}
            className={`badge ${badgeClass(currentStatus)}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className={`signal-dot ${currentStatus !== 'resolved' ? 'signal-dot--pulse' : ''}`} />
            {STATUS_LABEL[currentStatus] || currentStatus}
          </motion.span>
        </AnimatePresence>
        <span className="text-[12px] text-muted">read only</span>
      </div>
    );
  }

  const focusColor = focusedUsers[0]?.color;

  return (
    <div className="status-selector relative" ref={containerRef}>
      {focusedUsers.length > 0 && (
        <div className="focus-indicators absolute -top-6 left-0 flex gap-1 z-10">
          {focusedUsers.map((user) => (
            <span
              key={user.userId}
              className="text-[11.5px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: user.color, color: '#08090b' }}
            >
              {user.name} is here
            </span>
          ))}
        </div>
      )}

      <motion.button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) onFocus();
          else onBlur();
        }}
        onKeyDown={onKeyDown}
        className="btn btn--secondary w-full justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Status: ${STATUS_LABEL[currentStatus]}. Change status.`}
        // Only pulse while another user actually holds focus on this field.
        animate={
          hasFocus && focusColor
            ? { boxShadow: [`0 0 0 0 ${focusColor}00`, `0 0 0 3px ${focusColor}55`, `0 0 0 0 ${focusColor}00`] }
            : { boxShadow: '0 0 0 0 rgba(0,0,0,0)' }
        }
        transition={{ duration: 1.6, repeat: hasFocus ? Infinity : 0, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={currentStatus}
            className="flex items-center gap-2 min-w-0"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <span
              className={`signal-dot ${currentStatus !== 'resolved' ? 'signal-dot--pulse' : ''}`}
              style={{ backgroundColor: SIGNAL_VAR[currentStatus] }}
            />
            <span className="truncate">{STATUS_LABEL[currentStatus] || currentStatus}</span>
          </motion.span>
        </AnimatePresence>
        <CaretDown size={12} weight="bold" className="text-muted flex-shrink-0" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            aria-label="Incident status"
            className="absolute left-0 right-0 mt-1.5 rounded-[10px] overflow-hidden z-20 p-1"
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-strong)',
              boxShadow: '0 16px 40px -10px rgba(4, 6, 9, 0.8)',
            }}
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
          >
            {STATUS_ORDER.map((status, index) => {
              const isCurrent = status === currentStatus;
              return (
                <li key={status} role="option" aria-selected={isCurrent}>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    onMouseMove={() => setHighlighted(index)}
                    disabled={isCurrent}
                    title={STATUS_HINT[status]}
                    className={clsx(
                      'w-full px-2.5 py-2 rounded-md flex items-center gap-2.5 text-left text-[14px] transition-colors',
                      isCurrent ? 'cursor-default opacity-60' : 'cursor-pointer'
                    )}
                    style={{
                      background:
                        highlighted === index && !isCurrent ? 'var(--bg-overlay)' : 'transparent',
                      color: 'var(--text-hi)',
                    }}
                  >
                    <span
                      className="signal-dot"
                      style={{ backgroundColor: SIGNAL_VAR[status] }}
                    />
                    <span className="min-w-0">
                      <span className="block">{STATUS_LABEL[status]}</span>
                      <span className="block text-[12px] text-muted truncate">
                        {STATUS_HINT[status]}
                      </span>
                    </span>
                    {isCurrent && <Check size={13} weight="bold" className="ml-auto text-muted" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmation && (
          <motion.p
            className="flex items-center gap-1.5 mt-2 text-[13px]"
            style={{ color: 'var(--signal-low)' }}
            role="status"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Check size={13} weight="bold" />
            {confirmation}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StatusSelector;
