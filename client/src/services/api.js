/**
 * API Service
 * HTTP client for REST API communication
 *
 * All API calls go through this service to:
 * - Automatically attach auth token
 * - Handle errors consistently
 * - Provide type-safe responses
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Make authenticated API request
 */
const request = async (endpoint, options = {}) => {
  // Get token from localStorage (matches authStore persistence)
  const authData = localStorage.getItem('auth-storage');
  const token = authData ? JSON.parse(authData)?.state?.token : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    // Auto-logout on invalid/expired token (skip for login/register endpoints)
    if (response.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

// ─────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────

export const authApi = {
  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  me: () => request('/auth/me')
};

// ─────────────────────────────────────────
// INCIDENT ENDPOINTS
// ─────────────────────────────────────────

export const incidentApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/incidents?${params}`);
  },

  get: (id) => request(`/incidents/${id}`),

  create: (data) =>
    request('/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateStatus: (id, status) =>
    request(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  assign: (id, userId) =>
    request(`/incidents/${id}/assignees`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),

  addNote: (id, text) =>
    request(`/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text })
    })
};

// ─────────────────────────────────────────
// USER ENDPOINTS
// ─────────────────────────────────────────

export const userApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/users?${params}`);
  },

  get: (id) => request(`/users/${id}`),

  updateRole: (id, role) =>
    request(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    })
};

export default { authApi, incidentApi, userApi };
