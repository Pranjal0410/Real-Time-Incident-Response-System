/**
 * App
 * Routing, socket lifecycle, and the global command palette.
 *
 * ROUTES
 * - /              Overview — live posture, trends, what needs attention
 * - /incidents     Incident queue — filterable, sortable, shareable via URL
 * - /incidents/:id Incident room
 * - *              404 (previously every unknown path silently redirected,
 *                  which hid broken links instead of surfacing them)
 *
 * PERFORMANCE
 * Pages are code-split with React.lazy, so recharts and the timeline only
 * download on the routes that use them.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores';
import { useSocket } from './hooks';
import { authApi } from './services/api';
import { CommandPalette } from './components/CommandPalette';
import { PageSkeleton } from './components/ui/Skeleton';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const IncidentListPage = lazy(() => import('./pages/IncidentListPage'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * Verifies the stored token once on startup so a stale session does not render
 * a half-broken authenticated shell.
 */
function AppShell({ children }) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [verified, setVerified] = useState(!isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setVerified(true);
      return;
    }
    authApi
      .me()
      .then(() => setVerified(true))
      .catch(() => {
        logout();
        setVerified(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useSocket();

  if (!verified) return <PageSkeleton />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
      >
        <Routes location={location}>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <IncidentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents/:id"
            element={
              <ProtectedRoute>
                <IncidentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/** The palette needs router context, so it mounts inside BrowserRouter. */
function PaletteGate() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <CommandPalette /> : null;
}

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Toaster
          position="bottom-right"
          theme="dark"
          closeButton
          toastOptions={{
            style: {
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-strong)',
              color: 'var(--text-hi)',
              fontSize: '13px',
            },
          }}
        />
        <PaletteGate />
        <Suspense fallback={<PageSkeleton />}>
          <AnimatedRoutes />
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
