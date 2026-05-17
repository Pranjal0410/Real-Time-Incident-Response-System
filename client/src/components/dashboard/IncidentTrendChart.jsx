/**
 * IncidentTrendChart Component
 * Line/area chart showing incidents over time using Recharts
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Generate mock data for demo purposes
const generateMockData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    name: day,
    incidents: Math.floor(Math.random() * 10) + 2,
    resolved: Math.floor(Math.random() * 8) + 1,
  }));
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#242424',
        border: '1px solid #333',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}>
        <p style={{ color: '#fff', fontWeight: 500, marginBottom: '0.25rem' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: '0.875rem' }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function IncidentTrendChart({ data }) {
  const chartData = data || generateMockData();

  return (
    <div className="chart-container">
      <div className="chart-container__header">
        <h3 className="chart-container__title">Incident Trends</h3>
        <select className="select" style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem' }}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>
      <div style={{ height: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="incidentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#d4a853" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="name"
              stroke="#6b6b6b"
              tick={{ fill: '#a0a0a0', fontSize: 12 }}
              axisLine={{ stroke: '#333' }}
            />
            <YAxis
              stroke="#6b6b6b"
              tick={{ fill: '#a0a0a0', fontSize: 12 }}
              axisLine={{ stroke: '#333' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="incidents"
              name="New Incidents"
              stroke="#d4a853"
              strokeWidth={2}
              fill="url(#incidentsGradient)"
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#resolvedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default IncidentTrendChart;
