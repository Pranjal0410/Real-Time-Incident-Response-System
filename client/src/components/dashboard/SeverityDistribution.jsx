/**
 * SeverityDistribution
 *
 * Donut plus a readable breakdown. The legend rows are real buttons: clicking
 * one drills through to the incident queue pre-filtered to that severity, so
 * the chart is a navigation surface rather than a static picture.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CaretRight } from '@phosphor-icons/react';
import {
  SIGNAL_HEX,
  CHART_NEUTRAL,
  SEVERITY_ORDER,
  SEVERITY_LABEL,
} from '../../constants/signals';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0];
  return (
    <div
      style={{
        background: CHART_NEUTRAL.surface,
        border: `1px solid ${CHART_NEUTRAL.line}`,
        borderRadius: 9,
        padding: '7px 10px',
        fontSize: 12,
        color: CHART_NEUTRAL.text,
      }}
    >
      <span style={{ color: slice.payload.fill, fontWeight: 600 }}>
        {SEVERITY_LABEL[slice.name] || slice.name}
      </span>
      <span style={{ marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>
        {slice.value} ({slice.payload.share}%)
      </span>
    </div>
  );
}

export function SeverityDistribution({ incidents = [] }) {
  const navigate = useNavigate();

  const { data, total } = useMemo(() => {
    const counts = incidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {});

    const sum = incidents.length;

    // Iterate the canonical order so the ring reads critical → low clockwise,
    // rather than in whatever order the API happened to return.
    const rows = SEVERITY_ORDER.filter((severity) => counts[severity]).map((severity) => ({
      name: severity,
      value: counts[severity],
      fill: SIGNAL_HEX[severity],
      share: sum ? Math.round((counts[severity] / sum) * 100) : 0,
    }));

    return { data: rows, total: sum };
  }, [incidents]);

  return (
    <section className="chart-container">
      <div className="chart-container__header">
        <div>
          <h3 className="chart-container__title">Severity mix</h3>
          <p className="text-xs text-muted mt-0.5 tabular">
            {total} {total === 1 ? 'incident' : 'incidents'} on record
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="empty-state" style={{ height: 232 }}>
          <p className="empty-state__title">Nothing to break down yet</p>
          <p className="empty-state__description">
            Severity mix appears once the first incident is declared.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-5" style={{ height: 232 }}>
          <div style={{ width: 150, height: '100%', flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex-1 min-w-0 flex flex-col gap-0.5">
            {data.map((row) => (
              <li key={row.name}>
                <button
                  type="button"
                  onClick={() => navigate(`/incidents?severity=${row.name}`)}
                  className="group w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors hover:bg-tertiary"
                  title={`View ${SEVERITY_LABEL[row.name].toLowerCase()} incidents`}
                >
                  <span className="signal-dot" style={{ backgroundColor: row.fill }} />
                  <span className="text-[14px] text-secondary">{SEVERITY_LABEL[row.name]}</span>
                  <span className="ml-auto text-[14px] font-medium text-primary tabular">
                    {row.value}
                  </span>
                  <span className="text-xs text-muted tabular w-9 text-right">{row.share}%</span>
                  <CaretRight
                    size={12}
                    className="text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default SeverityDistribution;
