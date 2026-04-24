/**
 * Socket Service
 * Manages Socket.io connection and event handling
 *
 * ARCHITECTURE:
 * ─────────────────────────────────────────
 * This service creates and manages a singleton socket instance.
 * Components don't interact with the socket directly - they use
 * stores for data and this service for emitting events.
 *
 * DATA FLOW:
 * 1. Server event → Socket callback → Store update
 * 2. User action → Component → socketService.emit() → Server
 *
 * WHY SINGLETON:
 * - Only one WebSocket connection per client
 * - Consistent event handling across components
 * - Easy to manage connection lifecycle
 *
 * RECONNECTION HANDLING:
 * On socket reconnect, initial state is rehydrated via REST API calls
 * and presence/focus lists are re-sent by the server when the client
 * re-joins incident rooms. This ensures state consistency after
 * network interruptions.
 */
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import {
  useIncidentStore,
  usePresenceStore,
  useFocusStore,
  useSocketStore,
  useAuthStore
} from '../stores';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

/**
 * Initialize socket connection with auth token
 */
export const initSocket = (token) => {
  if (socket?.connected) {
    console.log('Socket already connected');
    return socket;
  }

  const socketStore = useSocketStore.getState();
  socketStore.setConnecting();

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // ─────────────────────────────────────────
  // CONNECTION EVENTS
  // ─────────────────────────────────────────

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socketStore.setConnected();
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    socketStore.setDisconnected();
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    socketStore.setConnectionError(error.message);

    // Auto-logout on auth failure
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    // Could show toast notification here
  });

  // ─────────────────────────────────────────
  // PRESENCE EVENTS → presenceStore
  // ─────────────────────────────────────────

  socket.on('presence:list', ({ incidentId, users }) => {
    usePresenceStore.getState().setPresence(incidentId, users);
  });

  socket.on('presence:joined', (user) => {
    // Need to know which incident - get from current route or store
    const activeIncident = useIncidentStore.getState().activeIncident;
    if (activeIncident) {
      usePresenceStore.getState().addUser(activeIncident._id, user);
      // Don't show toast for current user
      const currentUser = useAuthStore.getState().user;
      if (user.userId !== currentUser?._id) {
        toast.info(`${user.name} joined the incident`, {
          duration: 3000,
          icon: '👋'
        });
      }
    }
  });

  socket.on('presence:left', ({ userId, userName }) => {
    const activeIncident = useIncidentStore.getState().activeIncident;
    if (activeIncident) {
      usePresenceStore.getState().removeUser(activeIncident._id, userId);
      toast.info(`${userName} left the incident`, {
        duration: 3000,
        icon: '👋'
      });
    }
  });

  // ─────────────────────────────────────────
  // FOCUS EVENTS → focusStore
  // ─────────────────────────────────────────

  socket.on('focus:list', ({ incidentId, focusStates }) => {
    useFocusStore.getState().setFocusStates(incidentId, focusStates);
  });

  socket.on('focus:updated', ({ userId, section, fieldId, color, name }) => {
    const activeIncident = useIncidentStore.getState().activeIncident;
    if (activeIncident) {
      useFocusStore.getState().updateUserFocus(activeIncident._id, userId, {
        section,
        fieldId,
        color,
        name
      });
    }
  });

  socket.on('focus:cleared', ({ userId }) => {
    const activeIncident = useIncidentStore.getState().activeIncident;
    if (activeIncident) {
      useFocusStore.getState().clearUserFocus(activeIncident._id, userId);
    }
  });

  // ─────────────────────────────────────────
  // INCIDENT EVENTS → incidentStore
  // ─────────────────────────────────────────

  socket.on('incident:updated', ({ incidentId, incident, update }) => {
    const store = useIncidentStore.getState();
    store.updateIncident(incidentId, incident);
    if (update) {
      store.addUpdate({ ...update, incidentId });
      if (update.type === 'status_change') {
        toast.info(`Status changed to ${incident.status}`, {
          duration: 3000,
          icon: '📊'
        });
      }
    }
  });

  socket.on('incident:noteAdded', ({ incidentId, update }) => {
    useIncidentStore.getState().addUpdate({ ...update, incidentId });
    if (update && update.userId?.name) {
      toast.info(`${update.userId.name} added a note`, {
        duration: 3000,
        icon: '📝'
      });
    }
  });

  socket.on('incident:assigned', ({ incidentId, incident, update }) => {
    const store = useIncidentStore.getState();
    store.updateIncident(incidentId, incident);
    if (update) {
      store.addUpdate({ ...update, incidentId });
    }
  });

  socket.on('incident:actionItemAdded', ({ incidentId, update }) => {
    useIncidentStore.getState().addUpdate({ ...update, incidentId });
  });

  socket.on('incident:actionItemToggled', ({ updateId, completed }) => {
    useIncidentStore.getState().toggleActionItem(updateId, completed);
  });

  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    useSocketStore.getState().setDisconnected();
  }
};

/**
 * Get socket instance (for direct access if needed)
 */
export const getSocket = () => socket;

// ─────────────────────────────────────────
// EMIT HELPERS
// ─────────────────────────────────────────

/**
 * Join an incident room
 */
export const joinIncident = (incidentId) => {
  if (socket?.connected) {
    socket.emit('incident:join', incidentId);
  }
};

/**
 * Leave an incident room
 */
export const leaveIncident = (incidentId) => {
  if (socket?.connected) {
    socket.emit('incident:leave', incidentId);
  }
};

/**
 * Update incident status
 */
export const updateStatus = (incidentId, status) => {
  if (socket?.connected) {
    socket.emit('incident:updateStatus', { incidentId, status });
  }
};

/**
 * Add note to incident
 */
export const addNote = (incidentId, text) => {
  if (socket?.connected) {
    socket.emit('incident:addNote', { incidentId, text });
  }
};

/**
 * Assign user to incident
 */
export const assignUser = (incidentId, targetUserId) => {
  if (socket?.connected) {
    socket.emit('incident:assign', { incidentId, targetUserId });
  }
};

/**
 * Add action item
 */
export const addActionItem = (incidentId, text) => {
  if (socket?.connected) {
    socket.emit('incident:addActionItem', { incidentId, text });
  }
};

/**
 * Toggle action item completion
 */
export const toggleActionItem = (incidentId, updateId, completed) => {
  if (socket?.connected) {
    socket.emit('incident:toggleActionItem', { incidentId, updateId, completed });
  }
};

/**
 * Update focus state
 */
export const updateFocus = (incidentId, section, fieldId = null) => {
  if (socket?.connected) {
    socket.emit('focus:update', { incidentId, section, fieldId });
    useFocusStore.getState().setMyFocus(incidentId, section, fieldId);
  }
};

/**
 * Clear focus state
 */
export const clearFocus = (incidentId) => {
  if (socket?.connected) {
    socket.emit('focus:clear', { incidentId });
    useFocusStore.getState().clearMyFocus();
  }
};

/**
 * Send heartbeat
 */
export const sendHeartbeat = () => {
  if (socket?.connected) {
    socket.emit('presence:heartbeat');
  }
};

export default {
  initSocket,
  disconnectSocket,
  getSocket,
  joinIncident,
  leaveIncident,
  updateStatus,
  addNote,
  assignUser,
  addActionItem,
  toggleActionItem,
  updateFocus,
  clearFocus,
  sendHeartbeat
};
