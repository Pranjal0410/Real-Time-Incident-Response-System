/**
 * OverviewPage
 *
 * The "how are we doing right now" view. Split out from the old combined
 * dashboard so that /  and /incidents are two genuinely different pages and the
 * sidebar's two nav entries stop competing for the same route.
 *
 * Layout deliberately avoids the generic four-cards-then-two-equal-charts
 * arrangement: metrics live in one instrument bar, and the chart row is
 * asymmetric (2fr volume / 1fr mix) so the eye has a clear entry point.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Warning,
  PulseIcon,
  FireSimple,
  CheckCircle,
  Plus,
  ArrowRight,
  ArrowUpRight,
} from '@phosphor-icons/react';
import { useIncidentStore } from '../stores';
import { incidentApi } from '../services/api';
import {
  WriteGate,
  AppLayout,
  StatCard,
  IncidentTrendChart,
  SeverityDistribution,
  CreateIncidentModal,
} from '../components';
import { SeverityBadge, StatusBadge, InstrumentSkeleton, ChartSkeleton } from '../components/ui';
import { SEVERITY_ORDER, SIGNAL_VAR } from '../constants/signals';

/** Compact relative time — operators read elapsed, not absolute, during an incident. */
function elapsed(since) {
  const ms = Date.now() - new Date(since).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function OverviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const incidents = useIncidentStore((state) => state.incidents);
  const setIncidents = useIncidentStore((state) => state.setIncidents);
  const setIncidentsError = useIncidentStore((state) => state.setIncidentsError);
  const isLoading = useIncidentStore((state) => state.incidentsLoading);
  const error = useIncidentStore((state) => state.incidentsError);
  const setLoading = useIncidentStore((state) => state.setIncidentsLoading);

  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1');

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      try {
        const { incidents: list } = await incidentApi.list();
        setIncidents(list);
      } catch (err) {
        setIncidentsError(err.message);
      }
    };
    fetchIncidents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The command palette can request the declare form via ?new=1.
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowCreate(true);
  }, [searchParams]);

  const closeCreate = () => {
    setShowCreate(false);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const stats = useMemo(() => {
    const active = incidents.filter((i) => i.status !== 'resolved');
    const resolved = incidents.filter((i) => i.status === 'resolved');

    // Mean time to resolve, over incidents we can actually date on both ends.
    const durations = resolved
      .map((i) => {
        const end = i.resolvedAt || i.updatedAt;
        if (!end || !i.createdAt) return null;
        return new Date(end).getTime() - new Date(i.createdAt).getTime();
      })
      .filter((d) => d !== null && d >= 0);

    const mttrMs = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

    return {
      total: incidents.length,
      active: active.length,
      critical: active.filter((i) => i.severity === 'critical').length,
      resolved: resolved.length,
      mttr: mttrMs,
    };
  }, [incidents]);

  /** Unresolved incidents, worst-first, then oldest-first within a severity. */
  const needsAttention = useMemo(() => {
    return incidents
      .filter((i) => i.status !== 'resolved')
      .sort((a, b) => {
        const rank = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
        if (rank !== 0) return rank;
        return new Date(a.createdAt) - new Date(b.createdAt);
      })
      .slice(0, 5);
  }, [incidents]);

  const formatMttr = (ms) => {
    if (ms === null) return '—';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  return (
    <AppLayout
      title="Overview"
      actions={
        <WriteGate>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn btn--primary btn--sm"
          >
            <Plus size={14} weight="bold" />
            <span className="hidden sm:inline">Declare</span>
          </button>
        </WriteGate>
      }
    >
      {error && (
        <div className="alert alert--error mb-5" role="alert">
          <Warning size={16} weight="fill" className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load incidents</p>
            <p className="opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Instrument row — one bar, hairline dividers, signal as a top rule */}
      {isLoading ? (
        <InstrumentSkeleton />
      ) : (
        <motion.div
          className="instrument"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="instrument__cell" style={{ '--cell-signal': SIGNAL_VAR.critical }}>
            <StatCard
              icon={<FireSimple size={16} weight="fill" />}
              label="Critical, unresolved"
              value={stats.critical}
              variant="critical"
              hint={stats.critical > 0 ? 'Page the on-call commander' : 'Nothing burning'}
            />
          </div>
          <div className="instrument__cell" style={{ '--cell-signal': SIGNAL_VAR.high }}>
            <StatCard
              icon={<PulseIcon size={16} weight="bold" />}
              label="Active incidents"
              value={stats.active}
              variant="high"
              hint={`${stats.total} declared all-time`}
            />
          </div>
          <div className="instrument__cell" style={{ '--cell-signal': SIGNAL_VAR.low }}>
            <StatCard
              icon={<CheckCircle size={16} weight="fill" />}
              label="Resolved"
              value={stats.resolved}
              variant="low"
              hint={
                stats.total > 0
                  ? `${Math.round((stats.resolved / stats.total) * 100)}% of all incidents`
                  : 'No incidents yet'
              }
            />
          </div>
          <div className="instrument__cell" style={{ '--cell-signal': SIGNAL_VAR.medium }}>
            <StatCard
              icon={<Warning size={16} />}
              label="Mean time to resolve"
              value={formatMttr(stats.mttr)}
              variant="medium"
              hint={
                stats.resolved > 0
                  ? `Across ${stats.resolved} closed ${stats.resolved === 1 ? 'incident' : 'incidents'}`
                  : 'Needs a resolved incident'
              }
            />
          </div>
        </motion.div>
      )}

      {/* Asymmetric chart row: volume gets twice the width of the mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={232} /> : <IncidentTrendChart incidents={incidents} />}
        </div>
        {isLoading ? <ChartSkeleton height={232} /> : <SeverityDistribution incidents={incidents} />}
      </div>

      {/* Needs attention — a priority queue, not another full table */}
      <section className="panel panel--flush mt-4">
        <div className="panel__header">
          <div>
            <h2 className="panel__title">Needs attention</h2>
            <p className="text-xs text-muted mt-0.5">Unresolved, worst first</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="btn btn--ghost btn--sm"
          >
            All incidents
            <ArrowRight size={13} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: 9 }} />
            ))}
          </div>
        ) : needsAttention.length === 0 ? (
          <div className="p-4">
            <div className="empty-state">
              <CheckCircle
                size={26}
                weight="fill"
                className="empty-state__icon"
                style={{ color: 'var(--signal-low)' }}
              />
              <p className="empty-state__title">All clear</p>
              <p className="empty-state__description">
                No unresolved incidents. Everything declared so far has been closed out.
              </p>
            </div>
          </div>
        ) : (
          <ul>
            {needsAttention.map((incident, index) => (
              <motion.li
                key={incident._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.04, ease: [0.32, 0.72, 0, 1] }}
                style={{ borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${incident._id}`)}
                  className="group w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-tertiary"
                >
                  {/* Severity reads as a spine on the left edge of the row */}
                  <span
                    className="w-0.5 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: SIGNAL_VAR[incident.severity] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium text-primary truncate">
                      {incident.title}
                    </span>
                    <span className="block text-xs text-muted mt-0.5">
                      {incident.commander?.name ? `${incident.commander.name} commanding` : 'No commander assigned'}
                      {' · '}
                      <span className="tabular">open {elapsed(incident.createdAt)}</span>
                    </span>
                  </span>
                  <span className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <SeverityBadge severity={incident.severity} size="sm" />
                    <StatusBadge status={incident.status} size="sm" pulse />
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <CreateIncidentModal isOpen={showCreate} onClose={closeCreate} />
    </AppLayout>
  );
}

export default OverviewPage;
