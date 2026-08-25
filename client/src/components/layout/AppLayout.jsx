/**
 * AppLayout
 * Sidebar + top bar shell. Owns the mobile navigation state, since both the
 * sidebar (which slides) and the top bar (which holds the trigger) need it.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout({ children, title, actions, searchQuery, onSearchChange }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Navigating on mobile should dismiss the slide-over.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (e) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <aside className="app-layout__sidebar" data-open={navOpen}>
        <Sidebar />
      </aside>

      {/* Scrim for the mobile slide-over */}
      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(4, 6, 9, 0.6)' }}
        />
      )}

      <div className="app-layout__main">
        <TopBar
          title={title}
          actions={actions}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onMenuClick={() => setNavOpen((open) => !open)}
        />
        <main id="main-content" className="app-layout__content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Fixed, pointer-events-none grain: adds texture to the large dark
          surfaces without ever repainting a scrolling container. */}
      <div className="grain" aria-hidden="true" />
    </div>
  );
}

export default AppLayout;
