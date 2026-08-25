/**
 * IncidentListPage — the incident queue.
 *
 * Now a distinct destination from the overview rather than the same route
 * behind a second nav label. It is the dense working view: filter by severity
 * and status, sort by any column, and open a row from the keyboard.
 *
 * Filters live in the URL, so a filtered queue is a shareable link — worth a
 * lot when someone pastes "everything critical and unresolved" into a channel.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Warning, CaretUp, CaretDown, X, MagnifyingGlass } from '@phosphor-icons/react';
import { useIncidentStore } from '../stores';
import { incidentApi } from '../services/api';
import { WriteGate, AppLayout, CreateIncidentModal } from '../components';
import { SeverityBadge, StatusBadge, TableSkeleton } from '../components/ui';
import {
  SEVERITY_ORDER,
  STATUS_ORDER,
  SEVERITY_LABEL,
  STATUS_LABEL,
  SIGNAL_VAR,
} from '../constants/signals';

const COLUMNS = [
  { key: 'title', label: 'Incident', sortable: true },
  { key: 'severity', label: 'Severity', sortable: true, width: 118 },
  { key: 'status', label: 'Status', sortable: true, width: 132 },
  { key: 'commander', label: 'Commander', sortable: true, width: 160 },
  { key: 'createdAt', label: 'Opened', sortable: true, width: 150 },
];

export function IncidentListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const incidents = useIncidentStore((state) => state.incidents);
  const setIncidents = useIncidentStore((state) => state.setIncidents);
  const setIncidentsError = useIncidentStore((state) => state.setIncidentsError);
  const isLoading = useIncidentStore((state) => state.incidentsLoading);
  const error = useIncidentStore((state) => state.incidentsError);
  const setLoading = useIncidentStore((state) => state.setIncidentsLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', direction: 'desc' });
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1');

  const severityFilter = searchParams.get('severity');
  const statusFilter = searchParams.get('status');

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

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowCreate(true);
  }, [searchParams]);

  /** Toggles a filter value in the URL; clicking the active one clears it. */
  const toggleFilter = (param, value) => {
    const next = new URLSearchParams(searchParams);
    if (next.get(param) === value) {
      next.delete(param);
    } else {
      next.set(param, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('severity');
    next.delete('status');
    setSearchParams(next, { replace: true });
    setSearchQuery('');
  };

  const closeCreate = () => {
    setShowCreate(false);
    if (searchParams.get('new')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  };

  const counts = useMemo(() => {
    const bySeverity = {};
    const byStatus = {};
    incidents.forEach((incident) => {
      bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
      byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
    });
    return { bySeverity, byStatus };
  }, [incidents]);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = incidents.filter((incident) => {
      if (severityFilter && incident.severity !== severityFilter) return false;
      if (statusFilter && incident.status !== statusFilter) return false;
      if (!query) return true;
      return (
        incident.title?.toLowerCase().includes(query) ||
        incident.description?.toLowerCase().includes(query) ||
        incident.status?.toLowerCase().includes(query) ||
        incident.severity?.toLowerCase().includes(query) ||
        incident.commander?.name?.toLowerCase().includes(query)
      );
    });

    const direction = sort.direction === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case 'severity':
          // Rank order, not alphabetical — "critical" must outrank "high".
          return (SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)) * direction;
        case 'status':
          return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) * direction;
        case 'commander':
          return (a.commander?.name || '~').localeCompare(b.commander?.name || '~') * direction;
        case 'title':
          return (a.title || '').localeCompare(b.title || '') * direction;
        case 'createdAt':
        default:
          return (new Date(a.createdAt) - new Date(b.createdAt)) * direction;
      }
    });
  }, [incidents, searchQuery, severityFilter, statusFilter, sort]);

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'createdAt' ? 'desc' : 'asc' }
    );
  };

  const hasFilters = Boolean(severityFilter || statusFilter || searchQuery.trim());

  const openIncident = (id) => navigate(`/incidents/${id}`);

  return (
    <AppLayout
      title="Incidents"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
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
      {/* Filter rail */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-muted mr-1">
          Severity
        </span>
        {SEVERITY_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            className="chip"
            aria-pressed={severityFilter === level}
            onClick={() => toggleFilter('severity', level)}
            style={severityFilter === level ? { color: SIGNAL_VAR[level] } : undefined}
          >
            <span className="signal-dot" style={{ backgroundColor: SIGNAL_VAR[level] }} />
            {SEVERITY_LABEL[level]}
            <span className="chip__count">{counts.bySeverity[level] || 0}</span>
          </button>
        ))}

        <span className="w-px h-5 mx-1.5 hidden sm:block" style={{ background: 'var(--line)' }} />

        <span className="text-[12px] font-semibold uppercase tracking-wider text-muted mr-1">
          Status
        </span>
        {STATUS_ORDER.map((state) => (
          <button
            key={state}
            type="button"
            className="chip"
            aria-pressed={statusFilter === state}
            onClick={() => toggleFilter('status', state)}
            style={statusFilter === state ? { color: SIGNAL_VAR[state] } : undefined}
          >
            <span className="signal-dot" style={{ backgroundColor: SIGNAL_VAR[state] }} />
            {STATUS_LABEL[state]}
            <span className="chip__count">{counts.byStatus[state] || 0}</span>
          </button>
        ))}

        {hasFilters && (
          <button type="button" onClick={clearFilters} className="btn btn--ghost btn--sm ml-auto">
            <X size={12} weight="bold" />
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <Warning size={16} weight="fill" className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load incidents</p>
            <p className="opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted mb-2.5 tabular" role="status" aria-live="polite">
        {isLoading
          ? 'Loading incidents'
          : `${visible.length} of ${incidents.length} ${incidents.length === 1 ? 'incident' : 'incidents'}`}
      </p>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <div className="empty-state">
          {hasFilters ? (
            <>
              <MagnifyingGlass size={26} className="empty-state__icon" />
              <p className="empty-state__title">No incidents match these filters</p>
              <p className="empty-state__description">
                Try a different severity or status, or clear the filters to see everything.
              </p>
              <button type="button" onClick={clearFilters} className="btn btn--secondary btn--sm mt-4">
                Clear filters
              </button>
            </>
          ) : (
            <>
              <Warning size={26} className="empty-state__icon" />
              <p className="empty-state__title">No incidents on record</p>
              <p className="empty-state__description">
                When something breaks, declare it here so the whole team works from one timeline.
              </p>
              <WriteGate>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="btn btn--primary btn--sm mt-4"
                >
                  <Plus size={14} weight="bold" />
                  Declare the first incident
                </button>
              </WriteGate>
            </>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <caption className="sr-only">
              Incidents, sorted by {sort.key} {sort.direction === 'asc' ? 'ascending' : 'descending'}
            </caption>
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  const active = sort.key === column.key;
                  return (
                    <th
                      key={column.key}
                      style={{ width: column.width }}
                      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-primary"
                        style={{ color: active ? 'var(--text-hi)' : 'inherit', font: 'inherit' }}
                      >
                        {column.label}
                        {active &&
                          (sort.direction === 'asc' ? (
                            <CaretUp size={10} weight="fill" />
                          ) : (
                            <CaretDown size={10} weight="fill" />
                          ))}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {visible.map((incident) => (
                  <motion.tr
                    key={incident._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                    // A clickable row must also be reachable and activatable
                    // from the keyboard, which the previous version was not.
                    role="link"
                    tabIndex={0}
                    aria-label={`Open incident: ${incident.title}`}
                    onClick={() => openIncident(incident._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openIncident(incident._id);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-0.5 h-7 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SIGNAL_VAR[incident.severity] }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-primary truncate">{incident.title}</div>
                          {incident.description && (
                            <div className="text-xs text-muted truncate mt-0.5">
                              {incident.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <SeverityBadge severity={incident.severity} size="sm" />
                    </td>
                    <td>
                      <StatusBadge status={incident.status} size="sm" pulse />
                    </td>
                    <td className="text-secondary">
                      {incident.commander?.name || <span className="text-muted">Unassigned</span>}
                    </td>
                    <td className="text-secondary text-xs tabular">
                      <time dateTime={incident.createdAt} title={new Date(incident.createdAt).toLocaleString()}>
                        {new Date(incident.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {', '}
                        {new Date(incident.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <CreateIncidentModal isOpen={showCreate} onClose={closeCreate} />
    </AppLayout>
  );
}

export default IncidentListPage;
