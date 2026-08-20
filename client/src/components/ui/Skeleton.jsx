/**
 * Skeletons
 *
 * Replaces the spinning-circle loaders. Each skeleton mirrors the shape of the
 * content it stands in for, so the layout does not reflow when data lands.
 */

export function Skeleton({ width, height = 14, radius = 6, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** Matches the four-cell instrument row on the overview. */
export function InstrumentSkeleton() {
  return (
    <div className="instrument" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="instrument__cell">
          <div className="stat-card" style={{ padding: 0 }}>
            <div className="stat-card__header">
              <Skeleton width={16} height={16} radius={4} />
            </div>
            <Skeleton width={54} height={30} radius={7} />
            <div className="mt-2">
              <Skeleton width={88} height={11} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Matches the incident table, including the header row. */
export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="table-container" aria-hidden="true">
      <div
        className="flex items-center gap-4 px-4 py-2.5 bg-tertiary"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <Skeleton width="28%" height={10} />
        <Skeleton width={70} height={10} />
        <Skeleton width={80} height={10} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{
            borderBottom: i === rows - 1 ? 'none' : '1px solid var(--line)',
            // Stagger the shimmer so it reads as a list rather than one block.
            animationDelay: `${i * 70}ms`,
          }}
        >
          <Skeleton width={`${34 + ((i * 13) % 26)}%`} height={13} />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton width={64} height={18} radius={999} />
            <Skeleton width={78} height={18} radius={999} />
            <Skeleton width={96} height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Matches a chart panel: title, then the plot area. */
export function ChartSkeleton({ height = 250 }) {
  return (
    <div className="chart-container" aria-hidden="true">
      <div className="chart-container__header">
        <Skeleton width={130} height={13} />
        <Skeleton width={104} height={28} radius={8} />
      </div>
      <Skeleton width="100%" height={height} radius={8} />
    </div>
  );
}

/** Full-page shell used while a lazy route chunk loads. */
export function PageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-primary p-8" role="status" aria-label="Loading">
      <Skeleton width={180} height={22} radius={7} />
      <div className="mt-6">
        <InstrumentSkeleton />
      </div>
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartSkeleton height={220} />
        </div>
        <ChartSkeleton height={220} />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default Skeleton;
