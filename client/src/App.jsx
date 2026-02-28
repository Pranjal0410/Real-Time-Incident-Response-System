/**
 * App Component
 * Root component with routing and socket initialization
 *
 * ARCHITECTURE:
 * - useSocket hook manages socket lifecycle tied to auth
 * - Protected routes redirect unauthenticated users
 * - Socket connects only after successful auth
 */
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores';
import { useSocket } from './hooks';
import { authApi } from './services/api';
import { LoginPage, IncidentListPage, IncidentDetailPage } from './pages';

/**
 * Protected Route wrapper
 * Redirects to login if not authenticated
 */
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * App Shell
 * Handles socket connection based on auth state
 * Verifies token on startup to clear stale sessions
 */
function AppShell({ children }) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [verified, setVerified] = useState(!isAuthenticated);

  // Verify persisted token on startup
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setVerified(true);
      return;
    }

    authApi.me()
      .then(() => setVerified(true))
      .catch(() => {
        logout();
        setVerified(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize socket when authenticated
  useSocket();

  if (!verified) return null;

  return <>{children}</>;
}

/**
 * Main App
 */
export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
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

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/incidents" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
