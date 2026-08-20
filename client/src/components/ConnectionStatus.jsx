/**
 * ConnectionStatus
 * Socket state, expressed in the shared signal vocabulary:
 * emerald = connected, amber = connecting, red = dropped.
 *
 * The label collapses on narrow viewports; the dot and its title attribute
 * always remain, so the state is never lost.
 */
import { useSocketStore } from '../stores';

const STATES = {
  connected: {
    color: 'var(--signal-low)',
    label: 'Live',
    title: 'Connected. Real-time updates are streaming.',
    pulse: true,
  },
  connecting: {
    color: 'var(--signal-high)',
    label: 'Connecting',
    title: 'Establishing the real-time connection to the server.',
    pulse: true,
  },
  offline: {
    color: 'var(--signal-critical)',
    label: 'Offline',
    title: 'No real-time connection. Incident data may be stale.',
    pulse: false,
  },
};

export function ConnectionStatus() {
  const isConnected = useSocketStore((state) => state.isConnected);
  const isConnecting = useSocketStore((state) => state.isConnecting);
  const error = useSocketStore((state) => state.connectionError);

  const key = isConnected ? 'connected' : isConnecting ? 'connecting' : 'offline';
  const state = STATES[key];

  return (
    <div
      className="flex items-center gap-1.5 text-xs font-medium cursor-default select-none"
      style={{ color: state.color }}
      title={key === 'offline' && error ? `${state.title} (${error})` : state.title}
      role="status"
      aria-live="polite"
    >
      <span className={`signal-dot ${state.pulse ? 'signal-dot--pulse' : ''}`} />
      <span className="hidden md:inline">{state.label}</span>
    </div>
  );
}

export default ConnectionStatus;
