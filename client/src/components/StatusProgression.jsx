/**
 * StatusProgression
 * Where the incident sits in the investigating → identified → monitoring →
 * resolved flow.
 *
 * The old version rendered four saturated pills joined by chevrons, which put
 * every signal hue on screen at once and made the *current* state no louder
 * than the rest. This is a segmented rail: completed and current segments are
 * filled, upcoming ones are hairlines, and only the current step is labelled in
 * colour — so a glance answers "how far along is this?" rather than "what are
 * the four possible states?".
 */
import { STATUS_ORDER, STATUS_LABEL, STATUS_HINT, SIGNAL_VAR } from '../constants/signals';

export function StatusProgression({ currentStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const currentColor = SIGNAL_VAR[currentStatus] || 'var(--text-mid)';

  return (
    <div className="status-progression">
      <div
        className="flex items-center gap-1"
        role="img"
        aria-label={`Step ${currentIndex + 1} of ${STATUS_ORDER.length}: ${
          STATUS_LABEL[currentStatus] || currentStatus
        }`}
      >
        {STATUS_ORDER.map((status, index) => {
          const reached = index <= currentIndex;
          return (
            <span
              key={status}
              title={`${STATUS_LABEL[status]} — ${STATUS_HINT[status]}`}
              className="flex-1 rounded-full transition-all duration-300"
              style={{
                height: index === currentIndex ? 4 : 3,
                background: reached ? currentColor : 'var(--line-strong)',
                opacity: reached && index < currentIndex ? 0.4 : 1,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-baseline justify-between mt-2">
        <span className="text-[13px] font-medium" style={{ color: currentColor }}>
          {STATUS_LABEL[currentStatus] || currentStatus}
        </span>
        <span className="text-[12px] text-muted tabular">
          Step {currentIndex + 1} of {STATUS_ORDER.length}
        </span>
      </div>

      <p className="text-[12.5px] text-muted mt-1 leading-snug">{STATUS_HINT[currentStatus]}</p>
    </div>
  );
}

export default StatusProgression;
