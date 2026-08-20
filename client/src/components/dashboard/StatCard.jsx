/**
 * StatCard
 * One cell of the instrument row. Deliberately not a card: no border, no
 * shadow, no filled icon chip. Elevation would imply four separate objects
 * when this is one gauge cluster — the enclosing `.instrument` grid supplies
 * the hairline dividers and the signal rule along the top edge.
 */
import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

function AnimatedNumber({ value }) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (reduceMotion) {
      count.set(value);
      return undefined;
    }
    // Count up on a decelerating curve so the number settles rather than stops.
    const controls = animate(count, value, { duration: 0.7, ease: [0.32, 0.72, 0, 1] });
    return controls.stop;
  }, [value, reduceMotion, count]);

  return <motion.span>{rounded}</motion.span>;
}

export function StatCard({ icon, label, value, trend, hint, variant = 'accent' }) {
  const renderTrend = () => {
    if (trend === undefined || trend === null || trend === 0) return null;

    const rising = trend > 0;
    return (
      <span
        className={`stat-card__trend ${rising ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}
        // For incident counts, "up" is bad news — say so rather than relying on colour.
        title={`${rising ? 'Up' : 'Down'} ${Math.abs(trend)}% versus the previous 7 days`}
      >
        {rising ? '▲' : '▼'} {Math.abs(trend)}%
      </span>
    );
  };

  return (
    <div className="stat-card">
      <div className="stat-card__header">
        <span className={`stat-card__icon stat-card__icon--${variant}`}>{icon}</span>
        {renderTrend()}
      </div>
      <div className="stat-card__value">
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </div>
      <div className="stat-card__label">{label}</div>
      {hint && <div className="mt-1 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

export default StatCard;
