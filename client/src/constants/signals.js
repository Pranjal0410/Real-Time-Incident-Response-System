/**
 * Signal vocabulary — the single source of truth for every colour in the UI.
 *
 * The console shell is monochrome on purpose. These four hues are the only
 * chroma allowed on screen, and each one carries exactly one meaning:
 *
 *   red     critical · investigating · error · disconnected
 *   amber   high     · identified    · degraded · connecting
 *   blue    medium   · monitoring    · informational
 *   emerald low      · resolved      · healthy · connected
 *
 * Previously these maps were copy-pasted into IncidentListPage, IncidentDetailPage,
 * StatusSelector, AuditTimeline and SeverityDistribution, and had already drifted
 * apart (three different accent families were live at once). Import from here.
 */

/** Maps a severity or status to the CSS custom property holding its hue. */
export const SIGNAL_VAR = {
  critical: 'var(--signal-critical)',
  high: 'var(--signal-high)',
  medium: 'var(--signal-medium)',
  low: 'var(--signal-low)',
  investigating: 'var(--signal-critical)',
  identified: 'var(--signal-high)',
  monitoring: 'var(--signal-medium)',
  resolved: 'var(--signal-low)',
};

/**
 * Literal hex values, for the handful of consumers that cannot resolve a CSS
 * variable — Recharts renders to SVG attributes and needs a real colour.
 * Keep in sync with the `--signal-*` tokens in index.css.
 */
export const SIGNAL_HEX = {
  critical: '#ff5f56',
  high: '#f2a93b',
  medium: '#4d9fff',
  low: '#2ecc8f',
  investigating: '#ff5f56',
  identified: '#f2a93b',
  monitoring: '#4d9fff',
  resolved: '#2ecc8f',
};

/** Neutral chart/table furniture, matched to the surface tokens. */
export const CHART_NEUTRAL = {
  grid: '#1e2227',
  axis: '#656c76',
  tick: '#9aa1aa',
  surface: '#14171b',
  line: '#2b3138',
  text: '#e8eaed',
};

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_LABEL = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * Status flows in one direction during an incident. The order matters — it
 * drives the progression indicator and the "next step" affordance.
 */
export const STATUS_ORDER = ['investigating', 'identified', 'monitoring', 'resolved'];

export const STATUS_LABEL = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

/** Short operator-facing description of what each status means. */
export const STATUS_HINT = {
  investigating: 'Cause unknown. Triage in progress.',
  identified: 'Root cause found. Fix underway.',
  monitoring: 'Fix deployed. Watching for regression.',
  resolved: 'Incident closed. Impact ended.',
};

export const SEVERITY_HINT = {
  critical: 'Full outage or data loss. Page immediately.',
  high: 'Major feature degraded for many users.',
  medium: 'Partial degradation with a workaround.',
  low: 'Minor issue. No user-visible impact.',
};

/** `badge--*` modifier for a given severity or status. */
export function badgeClass(value) {
  switch (value) {
    case 'critical':
    case 'investigating':
      return 'badge--critical';
    case 'high':
    case 'identified':
      return 'badge--high';
    case 'medium':
    case 'monitoring':
      return 'badge--medium';
    case 'low':
    case 'resolved':
      return 'badge--low';
    default:
      return 'badge--neutral';
  }
}
