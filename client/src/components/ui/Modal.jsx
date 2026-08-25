/**
 * Modal
 *
 * The previous inline modal could only be dismissed by hitting its close
 * button: no Escape key, no backdrop click, no focus trap, and the page behind
 * it kept scrolling. This replaces all of that with one accessible primitive.
 *
 *  - Escape closes
 *  - Backdrop click closes (mousedown target check, so a drag that ends on the
 *    backdrop does not dismiss)
 *  - Focus moves in on open and returns to the trigger on close
 *  - Tab is trapped inside the dialog
 *  - Background scroll is locked without the layout shifting
 */
import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, description, children, footer, size = 'md' }) {
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const mouseDownTarget = useRef(null);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap focus at both ends so Tab never escapes the dialog.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    restoreFocusRef.current = document.activeElement;

    // Lock scroll, compensating for the scrollbar so the page does not jump.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    // Focus the first meaningful control rather than the close button.
    const frame = requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE);
      const target =
        Array.from(focusable || []).find((el) => !el.hasAttribute('data-modal-close')) ||
        focusable?.[0];
      target?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  const maxWidth = { sm: 380, md: 480, lg: 640 }[size] || 480;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => {
            mouseDownTarget.current = e.target;
          }}
          onMouseUp={(e) => {
            if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
              onClose();
            }
          }}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            aria-describedby={description ? 'modal-description' : undefined}
            className="modal"
            style={{ maxWidth }}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="modal__header">
              <div>
                <h2 className="modal__title">{title}</h2>
                {description && (
                  <p id="modal-description" className="text-xs text-muted mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                data-modal-close
                onClick={onClose}
                className="modal__close"
                aria-label="Close dialog"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="modal__body">{children}</div>

            {footer && <div className="modal__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
