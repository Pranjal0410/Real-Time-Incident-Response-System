/**
 * Severity and status badges.
 *
 * Both used to be built inline with hand-rolled `${color}20` alpha strings in
 * four different files. They now read from the shared signal vocabulary, so a
 * status can never render in one hue on the list page and another on the
 * detail page.
 */
import {
  badgeClass,
  SEVERITY_LABEL,
  STATUS_LABEL,
  SEVERITY_HINT,
  STATUS_HINT,
} from '../../constants/signals';

export function SeverityBadge({ severity, size = 'md' }) {
  if (!severity) return null;
  return (
    <span
      className={`badge ${badgeClass(severity)}`}
      style={size === 'sm' ? { fontSize: '11px', padding: '1px 7px' } : undefined}
      title={SEVERITY_HINT[severity]}
    >
      <span className="signal-dot" />
      {SEVERITY_LABEL[severity] || severity}
    </span>
  );
}

export function StatusBadge({ status, size = 'md', pulse = false }) {
  if (!status) return null;
  return (
    <span
      className={`badge ${badgeClass(status)}`}
      style={size === 'sm' ? { fontSize: '11px', padding: '1px 7px' } : undefined}
      title={STATUS_HINT[status]}
    >
      {/* Anything unresolved is still live, so its dot breathes. */}
      <span className={`signal-dot ${pulse && status !== 'resolved' ? 'signal-dot--pulse' : ''}`} />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default SeverityBadge;
