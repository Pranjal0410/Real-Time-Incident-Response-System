/**
 * AuditTimeline
 * Immutable, chronological record of everything that happened on an incident.
 *
 * The emoji markers (🔄 📝 👤) are gone — they render differently on every OS
 * and read as informal in an audit log that ends up in a postmortem. Each event
 * type now has a real icon at a consistent stroke weight, and the purple that
 * used to mark status changes is gone too: it was a fifth accent hue with no
 * meaning in the signal vocabulary.
 */
import { motion } from 'framer-motion';
import {
  ArrowsClockwise,
  NotePencil,
  UserCirclePlus,
  ListChecks,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { badgeClass, STATUS_LABEL } from '../constants/signals';

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.045 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } },
};

const EVENT_ICONS = {
  status_change: ArrowsClockwise,
  note: NotePencil,
  assignment: UserCirclePlus,
  action_item: ListChecks,
};

const TYPE_LABELS = {
  status_change: 'Status changes',
  note: 'Notes',
  assignment: 'Assignments',
  action_item: 'Action items',
};

const TYPE_ORDER = ['status_change', 'note', 'assignment', 'action_item'];

export function AuditTimeline({ updates, grouped = false }) {
  if (!updates || updates.length === 0) {
    return (
      <div className="empty-state">
        <ClockCounterClockwise size={26} className="empty-state__icon" />
        <p className="empty-state__title">No timeline events yet</p>
        <p className="empty-state__description">
          Status changes, notes and assignments are appended here as they happen. Nothing in this
          log can be edited or removed.
        </p>
      </div>
    );
  }

  const sorted = [...updates].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (grouped) {
    const byType = sorted.reduce((acc, update) => {
      (acc[update.type] = acc[update.type] || []).push(update);
      return acc;
    }, {});

    return (
      <div className="audit-timeline">
        {TYPE_ORDER.filter((type) => byType[type]?.length).map((type) => (
          <section key={type} className="mb-5">
            <h4 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted mb-2.5">
              {TYPE_LABELS[type]}
              <span className="tabular">({byType[type].length})</span>
            </h4>
            <motion.div
              className="flex flex-col gap-2"
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              {byType[type].map((update, index) => (
                <motion.div key={update._id || index} variants={itemVariants}>
                  <CompactEntry update={update} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="audit-timeline timeline"
      variants={listVariants}
      initial="hidden"
      animate="show"
    >
      {sorted.map((update, index) => (
        <motion.div key={update._id || index} variants={itemVariants} className="timeline__entry">
          <TimelineEntry update={update} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function TimelineEntry({ update }) {
  const Icon = EVENT_ICONS[update.type] || ClockCounterClockwise;
  const created = new Date(update.createdAt);
  const userName = update.userId?.name || 'Unknown';

  return (
    <>
      <time className="timeline__time" dateTime={update.createdAt} title={created.toLocaleString()}>
        {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        <span className="block text-[11.5px] opacity-70">
          {created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </time>

      <span className="timeline__marker" aria-hidden="true">
        <Icon size={13} />
      </span>

      <div className="min-w-0 pt-0.5">
        <span className="text-[14.5px] font-medium text-primary">{userName}</span>
        <div className="text-[14px] text-secondary mt-0.5 leading-relaxed">
          {formatMessage(update)}
        </div>
      </div>
    </>
  );
}

function CompactEntry({ update }) {
  const created = new Date(update.createdAt);
  return (
    <div className="flex items-start gap-3 text-[14px]">
      <time
        className="text-muted tabular flex-shrink-0 font-mono text-[12.5px] pt-0.5"
        dateTime={update.createdAt}
      >
        {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </time>
      <div className="min-w-0">
        <span className="font-medium text-primary">{update.userId?.name || 'Unknown'}</span>{' '}
        <span className="text-secondary">{formatMessage(update)}</span>
      </div>
    </div>
  );
}

function formatMessage(update) {
  switch (update.type) {
    case 'status_change':
      return (
        <>
          Changed status{' '}
          {update.content.previousStatus && (
            <>
              from <TimelineStatus status={update.content.previousStatus} />{' '}
            </>
          )}
          to <TimelineStatus status={update.content.newStatus} />
        </>
      );

    case 'note':
      return (
        <>
          Added a note: <span className="text-muted">“{update.content.text}”</span>
        </>
      );

    case 'assignment': {
      const action = update.content.action === 'assigned' ? 'Assigned' : 'Unassigned';
      const target = update.content.targetUser?.name || 'a responder';
      return (
        <>
          {action} <span className="font-medium text-primary">{target}</span>
          {update.content.action === 'assigned' ? ' to this incident' : ' from this incident'}
        </>
      );
    }

    case 'action_item': {
      const done = update.content.completed === true;
      return (
        <>
          {done ? 'Completed' : 'Added'} an action item:{' '}
          <span className="text-muted">“{update.content.text}”</span>
        </>
      );
    }

    default:
      return 'Recorded an update';
  }
}

function TimelineStatus({ status }) {
  return (
    <span className={`badge ${badgeClass(status)}`} style={{ fontSize: 11, padding: '0 6px' }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default AuditTimeline;
