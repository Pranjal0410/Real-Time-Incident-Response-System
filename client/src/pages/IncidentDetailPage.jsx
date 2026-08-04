/**
 * IncidentDetailPage — the incident room.
 *
 * Restructured from one long stack of full-width panels into a working layout:
 * the investigation (notes, action items, timeline) holds the main column,
 * while the facts an operator glances at repeatedly — status, severity,
 * commander, responders, elapsed time — live in a sticky rail that stays put
 * as the timeline grows.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Warning, UserCircle, NotePencil } from '@phosphor-icons/react';
import { useIncidentStore, useAuthStore } from '../stores';
import { useIncidentRoom } from '../hooks';
import {
  AppLayout,
  PresenceIndicator,
  StatusSelector,
  StatusProgression,
  NoteInput,
  ActionItemList,
  RoleBadge,
  AssignResponder,
  IncidentMetaStrip,
  ReadOnlyBanner,
  CopyIncidentSummary,
} from '../components';
import { AuditTimeline } from '../components/AuditTimeline';
import { SeverityBadge } from '../components/ui';
import { Skeleton } from '../components/ui/Skeleton';
import { SEVERITY_HINT } from '../constants/signals';

function DetailSkeleton() {
  return (
    <div aria-label="Loading incident" role="status">
      <Skeleton width={260} height={22} radius={7} />
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="flex flex-col gap-4">
          <Skeleton width="100%" height={180} radius={12} />
          <Skeleton width="100%" height={240} radius={12} />
        </div>
        <Skeleton width="100%" height={320} radius={12} />
      </div>
      <span className="sr-only">Loading incident</span>
    </div>
  );
}

export function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isLoading, error } = useIncidentRoom(id);

  const incident = useIncidentStore((state) => state.activeIncident);
  const updates = useIncidentStore((state) => state.activeIncidentUpdates);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return (
      <AppLayout title="Incident">
        <DetailSkeleton />
      </AppLayout>
    );
  }

  if (error || !incident) {
    return (
      <AppLayout title="Incident">
        <div className="empty-state" style={{ marginTop: 40 }}>
          <Warning size={26} className="empty-state__icon" />
          <p className="empty-state__title">
            {error ? 'Could not open this incident' : 'Incident not found'}
          </p>
          <p className="empty-state__description">
            {error || 'It may have been removed, or the link may be wrong.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="btn btn--secondary btn--sm mt-4"
          >
            <ArrowLeft size={13} />
            Back to incidents
          </button>
        </div>
      </AppLayout>
    );
  }

  const notes = updates.filter((u) => u.type === 'note');

  return (
    <AppLayout title="Incident">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="btn btn--ghost btn--sm btn--icon mt-0.5 flex-shrink-0"
            aria-label="Back to incidents"
            title="Back to incidents"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-[21px] font-semibold tracking-tight text-primary leading-snug">
              {incident.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <SeverityBadge severity={incident.severity} />
              <span className="text-xs text-muted">{SEVERITY_HINT[incident.severity]}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <CopyIncidentSummary incident={incident} updates={updates} />
            <RoleBadge />
          </div>
        </div>

        <ReadOnlyBanner />

        {/* Live session strip — presence plus elapsed metadata in one band */}
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 rounded-[10px] mt-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--line)' }}
        >
          <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--signal-low)' }}>
            <span className="signal-dot signal-dot--pulse" />
            Live session
          </span>
          <span className="w-px h-4" style={{ background: 'var(--line)' }} />
          <PresenceIndicator incidentId={id} />
        </div>

        <IncidentMetaStrip incident={incident} updates={updates} />

        {/* Working layout: investigation left, facts in a sticky rail right */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
          <div className="flex flex-col gap-4 min-w-0">
            {incident.description && (
              <section className="panel">
                <h2 className="panel__title mb-2">Summary</h2>
                <p className="text-[14.5px] text-secondary leading-relaxed" style={{ maxWidth: '68ch' }}>
                  {incident.description}
                </p>
              </section>
            )}

            <section className="panel panel--flush">
              <div className="panel__header">
                <h2 className="panel__title">Investigation notes</h2>
                <span className="text-xs text-muted tabular">{notes.length}</span>
              </div>
              <div className="p-4">
                <NoteInput incidentId={id} />
                <div className="mt-4 flex flex-col gap-3 max-h-80 overflow-y-auto">
                  {notes.length === 0 ? (
                    <div className="empty-state" style={{ padding: '28px 20px' }}>
                      <NotePencil size={22} className="empty-state__icon" />
                      <p className="empty-state__title">No findings recorded yet</p>
                      <p className="empty-state__description">
                        Log observations, log lines and ruled-out hypotheses as you go.
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <article
                        key={note._id}
                        className="pl-3 py-1"
                        style={{ borderLeft: '2px solid var(--line-strong)' }}
                      >
                        <p className="text-[14.5px] text-primary leading-relaxed">
                          {note.content.text}
                        </p>
                        <p className="text-[12px] text-muted mt-1.5">
                          {note.userId?.name || 'Unknown'}
                          {' · '}
                          <time dateTime={note.createdAt} className="tabular">
                            {new Date(note.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="panel">
              <ActionItemList incidentId={id} />
            </section>

            <section className="panel panel--flush">
              <div className="panel__header">
                <h2 className="panel__title">Audit timeline</h2>
                <span className="text-xs text-muted tabular">
                  {updates.length} {updates.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <div className="p-4">
                <AuditTimeline updates={updates} />
              </div>
            </section>
          </div>

          {/* Sticky rail */}
          <div className="flex flex-col gap-4 xl:sticky" style={{ top: 'calc(var(--topbar-h) + 16px)' }}>
            <section className="panel">
              <h2 className="label" style={{ marginBottom: 10 }}>
                Status
              </h2>
              <StatusSelector incidentId={id} currentStatus={incident.status} />
              <div className="mt-4">
                <StatusProgression currentStatus={incident.status} />
              </div>
            </section>

            <section className="panel">
              <h2 className="label" style={{ marginBottom: 10 }}>
                Commander
              </h2>
              {incident.commander ? (
                <div className="flex items-center gap-2.5">
                  <span className="relative flex-shrink-0">
                    <span className="sidebar__user-avatar" style={{ width: 32, height: 32 }}>
                      {incident.commander.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                    <Star
                      size={11}
                      weight="fill"
                      className="absolute -top-1 -right-1"
                      style={{ color: 'var(--signal-high)' }}
                      aria-label="Incident commander"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium text-primary truncate">
                      {incident.commander.name}
                    </p>
                    <p className="text-[12px] text-muted">Incident commander</p>
                  </div>
                </div>
              ) : (
                <p className="text-[14px] text-muted flex items-center gap-2">
                  <UserCircle size={17} />
                  No commander assigned
                </p>
              )}
            </section>

            <section className="panel">
              <div className="flex items-center justify-between mb-3">
                <h2 className="label" style={{ marginBottom: 0 }}>
                  Responders
                </h2>
                <span className="text-xs text-muted tabular">
                  {incident.assignees?.length || 0}
                </span>
              </div>

              {incident.assignees?.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {incident.assignees.map((assignee) => (
                    <li
                      key={assignee._id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--line-strong)' }}
                    >
                      <span
                        className="w-4 h-4 rounded-full grid place-items-center text-[9px] font-semibold flex-shrink-0"
                        style={{ background: 'var(--signal-low)', color: '#04150e' }}
                        aria-hidden="true"
                      >
                        {assignee.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                      <span className="text-xs text-primary">{assignee.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-muted">
                  Nobody assigned yet. Assign responders so ownership is unambiguous.
                </p>
              )}

              <AssignResponder incidentId={id} currentAssignees={incident.assignees || []} />
            </section>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}

export default IncidentDetailPage;
