/**
 * Sidebar
 *
 * Previously both "Dashboard" and "Incidents" pointed at `/incidents`, so the
 * two links were indistinguishable and lit up as active together. They now
 * address two genuinely different routes, and each carries a live count so the
 * nav doubles as an at-a-glance status read.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { SquaresFour, Warning, SignOut, PulseIcon } from '@phosphor-icons/react';
import { useAuthStore, useIncidentStore } from '../../stores';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const incidents = useIncidentStore((state) => state.incidents);
  const navigate = useNavigate();

  const activeCount = incidents.filter((i) => i.status !== 'resolved').length;
  const criticalCount = incidents.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved'
  ).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navClass = ({ isActive }) =>
    `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`;

  return (
    <div className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-text">
          <span className="sidebar__logo-icon">
            <PulseIcon size={15} weight="bold" />
          </span>
          <span>IncidentHub</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        <NavLink to="/" end className={navClass}>
          <SquaresFour className="sidebar__nav-icon" size={17} />
          Overview
          {criticalCount > 0 && (
            <span
              className="sidebar__nav-count"
              style={{
                color: 'var(--signal-critical)',
                background: 'var(--wash-critical)',
              }}
              title={`${criticalCount} unresolved critical`}
            >
              {criticalCount}
            </span>
          )}
        </NavLink>

        <NavLink to="/incidents" end className={navClass}>
          <Warning className="sidebar__nav-icon" size={17} />
          Incidents
          {activeCount > 0 && (
            <span className="sidebar__nav-count" title={`${activeCount} unresolved`}>
              {activeCount}
            </span>
          )}
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__user-avatar" aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.name || 'Signed in'}</div>
            <div className="sidebar__user-role">{user?.role}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn--ghost btn--sm btn--icon"
            title="Sign out"
            aria-label="Sign out"
          >
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
