import { memo } from 'react';
/**
// memo wraps this component to prevent unnecessary re-renders when parent state changes
 * AuditTimeline Component
 * Renders immutable, chronological audit trail - Dark theme
 */

const UPDATE_ICONS = {
  status_change: '🔄',
  note: '📝',
  assignment: '👤',
  action_item: '✓'
};

const UPDATE_COLORS = {
  status_change: '#8B5CF6', // purple
  note: '#3B82F6',          // blue
  assignment: '#10B981',    // green
  action_item: '#F59E0B'    // amber
};

export function AuditTimeline({ updates, grouped = false }) {
  if (!updates || updates.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">No timeline events yet</p>
        <p className="empty-state__description">All status changes, notes, and assignments will appear here.</p>
      </div>
    );
  }

  // Sort by createdAt ascending (oldest first)
  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  // Group by type if requested
  if (grouped) {
    const groupedByType = sortedUpdates.reduce((acc, update) => {
      const type = update.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(update);
      return acc;
    }, {});

    const typeLabels = {
      status_change: 'Status Changes',
      note: 'Notes',
      assignment: 'Assignments',
      action_item: 'Action Items'
    };

    const typeOrder = ['status_change', 'note', 'assignment', 'action_item'];

    return (
      <div className="audit-timeline">
        {typeOrder.map(type => {
          const typeUpdates = groupedByType[type];
          if (!typeUpdates || typeUpdates.length === 0) return null;

          return (
            <div key={type} className="mb-6">
              <h4 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: UPDATE_COLORS[type] }}
                />
                {typeLabels[type]} ({typeUpdates.length})
              </h4>
              <div className="space-y-4">
                {typeUpdates.map((update, index) => (
                  <TimelineEntry key={update._id || index} update={update} compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="audit-timeline">
      <div className="space-y-4">
        {sortedUpdates.map((update, index) => (
          <TimelineEntry key={update._id || index} update={update} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual timeline entry
 */
function TimelineEntry({ update, compact = false }) {
  const icon = UPDATE_ICONS[update.type] || '•';
  const color = UPDATE_COLORS[update.type] || '#6B7280';
  const time = new Date(update.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  const date = new Date(update.createdAt).toLocaleDateString();
  const userName = update.userId?.name || 'Unknown';

  const message = formatUpdateMessage(update);

  // Compact mode for grouped view
  if (compact) {
    return (
      <div className="flex items-start gap-3 text-sm">
        <div className="text-muted w-16 flex-shrink-0">{time}</div>
        <div className="flex-1">
          <span className="font-medium text-primary">{userName}</span>
          <span className="text-muted mx-1">—</span>
          <span className="text-secondary">{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Timestamp */}
      <div className="flex-shrink-0 w-20 text-right">
        <div className="text-sm font-medium text-primary">{time}</div>
        <div className="text-xs text-muted">{date}</div>
      </div>

      {/* Icon & Line */}
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: 'var(--border-primary)' }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="font-medium text-primary">{userName}</div>
        <div className="text-secondary mt-1">{message}</div>
      </div>
    </div>
  );
}

/**
 * Format update into human-readable message
 */
function formatUpdateMessage(update) {
  switch (update.type) {
    case 'status_change':
      return (
        <span>
          Changed status{' '}
          {update.content.previousStatus && (
            <>
              from <StatusBadge status={update.content.previousStatus} />{' '}
            </>
          )}
          to <StatusBadge status={update.content.newStatus} />
        </span>
      );

    case 'note':
      return (
        <span>
          Added note: <em className="text-muted">"{update.content.text}"</em>
        </span>
      );

    case 'assignment':
      const action = update.content.action === 'assigned' ? 'Assigned' : 'Unassigned';
      const target = update.content.targetUser?.name || 'a user';
      return (
        <span>
          {action} <strong className="text-accent">{target}</strong> to this incident
        </span>
      );

    case 'action_item':
      if (update.content.completed !== undefined) {
        const status = update.content.completed ? 'completed' : 'added';
        return (
          <span>
            {status === 'completed' ? 'Completed' : 'Added'} action item:{' '}
            <em className="text-muted">"{update.content.text}"</em>
          </span>
        );
      }
      return (
        <span>
          Added action item: <em className="text-muted">"{update.content.text}"</em>
        </span>
      );

    default:
      return <span>Unknown update type</span>;
  }
}

/**
 * Status badge for timeline
 */
function StatusBadge({ status }) {
  const colors = {
    investigating: '#EF4444',
    identified: '#F59E0B',
    monitoring: '#3B82F6',
    resolved: '#10B981'
  };

  return (
    <span
      className="inline-flex px-2 py-0.5 text-xs font-medium rounded text-white"
      style={{ backgroundColor: colors[status] || '#6B7280' }}
    >
      {status}
    </span>
  );
}

export default memo(AuditTimeline);

