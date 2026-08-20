/**
 * IncidentTrendChart
 *
 * Two fixes beyond the restyle:
 *
 * 1. The old version called `generateMockData()` inside render, so every
 *    parent re-render reshuffled the chart with fresh `Math.random()` values.
 * 2. It plotted invented numbers. This derives the series from the real
 *    incidents in the store by bucketing `createdAt` / `resolvedAt` into days,
 *    so the chart reports something true.
 *
 * The period selector is now wired up rather than decorative.
 */
import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SIGNAL_HEX, CHART_NEUTRAL } from '../../constants/signals';

const PERIODS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

/** Buckets incidents into one point per day across the window. */
function buildSeries(incidents, days) {
  const buckets = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    buckets.set(day.getTime(), { key: day.getTime(), opened: 0, resolved: 0 });
  }

  const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  incidents.forEach((incident) => {
    if (incident.createdAt) {
      const bucket = buckets.get(startOfDay(incident.createdAt));
      if (bucket) bucket.opened += 1;
    }
    // `resolvedAt` is optional on the model; fall back to updatedAt when the
    // incident is closed so the resolved series is not silently empty.
    const closedAt =
      incident.resolvedAt || (incident.status === 'resolved' ? incident.updatedAt : null);
    if (closedAt) {
      const bucket = buckets.get(startOfDay(closedAt));
      if (bucket) bucket.resolved += 1;
    }
  });

  // Long windows get sparser labels so the axis never collides with itself.
  const points = Array.from(buckets.values());
  const labelFor = (time) =>
    new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return points.map((point, index) => ({
    ...point,
    name: labelFor(point.key),
    tick: days <= 7 || index % Math.ceil(days / 7) === 0 ? labelFor(point.key) : '',
  }));
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: CHART_NEUTRAL.surface,
        border: `1px solid ${CHART_NEUTRAL.line}`,
        borderRadius: 9,
        padding: '9px 11px',
        boxShadow: '0 12px 32px -8px rgba(4, 6, 9, 0.75)',
      }}
    >
      <p style={{ color: CHART_NEUTRAL.text, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          style={{
            color: CHART_NEUTRAL.tick,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: entry.color,
              display: 'inline-block',
            }}
          />
          {entry.name}
          <span
            style={{
              marginLeft: 'auto',
              color: CHART_NEUTRAL.text,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function IncidentTrendChart({ incidents = [] }) {
  const [days, setDays] = useState(7);
  const data = useMemo(() => buildSeries(incidents, days), [incidents, days]);

  const totalOpened = data.reduce((sum, point) => sum + point.opened, 0);

  return (
    <section className="chart-container">
      <div className="chart-container__header">
        <div>
          <h3 className="chart-container__title">Incident volume</h3>
          <p className="text-xs text-muted mt-0.5 tabular">
            {totalOpened} opened over {days} days
          </p>
        </div>
        <label className="sr-only" htmlFor="trend-period">
          Time period
        </label>
        <select
          id="trend-period"
          className="select"
          style={{ width: 'auto', padding: '5px 30px 5px 10px', fontSize: 12.5 }}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ height: 232 }}>
        {totalOpened === 0 ? (
          <div className="empty-state" style={{ height: '100%' }}>
            <p className="empty-state__title">No incidents in this window</p>
            <p className="empty-state__description">
              Widen the range, or declare an incident to start the record.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="openedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SIGNAL_HEX.critical} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={SIGNAL_HEX.critical} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="resolvedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SIGNAL_HEX.low} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={SIGNAL_HEX.low} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={CHART_NEUTRAL.grid} vertical={false} />
              <XAxis
                dataKey="tick"
                stroke={CHART_NEUTRAL.grid}
                tick={{ fill: CHART_NEUTRAL.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_NEUTRAL.grid }}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                stroke={CHART_NEUTRAL.grid}
                tick={{ fill: CHART_NEUTRAL.axis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_NEUTRAL.line }} />
              <Area
                type="monotone"
                dataKey="opened"
                name="Opened"
                stroke={SIGNAL_HEX.critical}
                strokeWidth={1.75}
                fill="url(#openedFill)"
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke={SIGNAL_HEX.low}
                strokeWidth={1.75}
                fill="url(#resolvedFill)"
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div
        className="flex items-center gap-4 mt-3 pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        {[
          { label: 'Opened', color: SIGNAL_HEX.critical },
          { label: 'Resolved', color: SIGNAL_HEX.low },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-secondary">
            <span className="signal-dot" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export default IncidentTrendChart;
