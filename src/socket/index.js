/**
 * Socket.io Initialization
 * Sets up real-time communication layer
 *
 * ARCHITECTURE (Interview-ready explanation):
 * ───────────────────────────────────────────
 * - Each incident has a room: `incident:{id}`
 * - Users join rooms when viewing incidents
 * - Server broadcasts updates to room members only
 * - Presence tracked in MongoDB for persistence
 *
 * Why room-based broadcasting?
 * - Efficiency: Only send updates to interested clients
 * - Scalability: Reduces message volume as user count grows
 * - Relevance: Users only see updates for incidents they're viewing
 *
 * PRESENCE CLEANUP STRATEGY:
 * - Reactive: On socket disconnect, immediately remove presence
 * - Defensive: TTL expiry (5 min) catches any missed cleanups
 * This dual approach prevents presence leaks in production.
 *
 * PRESENCE EVENT TARGETING:
 * - presence:list → Only sent to the joining client (socket.emit)
 * - presence:joined/left → Broadcast to room (socket.to().emit)
 * Why not broadcast full list every time? That would be wasteful.
 *
 * STATE MACHINE VALIDATION:
 * ─────────────────────────
 * Status transitions are validated against an allowed state machine.
 * Example: "resolved" cannot go back to "investigating" without
 * explicit re-opening. This prevents accidental state regression
 * and maintains audit trail integrity.
 *
 * IDEMPOTENCY CONSIDERATIONS:
 * ───────────────────────────
 * Update handlers are designed to be idempotent where possible to
 * avoid duplicate writes on reconnects. For example:
 * - Assigning an already-assigned user returns success (no duplicate)
 * - Status unchanged throws error (prevents duplicate audit records)
 * - Action item toggles use explicit boolean (not toggle operation)
 *
 * ERROR HANDLING STRATEGY:
 * - All event handlers wrapped in try/catch
 * - Errors emitted back to client via 'error' event
 * - Server never crashes from client-induced errors
 *
 * THIS IS NOT A CHAT SYSTEM:
 * ─────────────────────────
 * Chat systems have:
 * - Free-form text messages
 * - No validation beyond length
 * - No state transitions
 * - No audit requirements
 *
 * This system has:
 * - Structured update types (status_change, note, assignment, action_item)
 * - Role-based authorization
 * - Server validation of state transitions
 * - Immutable audit trail for post-incident review
 * - Each update is a discrete, typed record, not conversation
 *
 * FOCUS PRESENCE (Ephemeral):
 * ───────────────────────────
 * Focus presence shows which section/field a user is currently editing.
 * Unlike incident updates, focus state is:
 * - NOT persisted to database (ephemeral, in-memory only)
 * - NOT part of the audit trail
 * - Throttled to reduce network traffic
 * - Automatically cleared on disconnect
 *
 * Why not persist focus state?
 * - It changes rapidly (every focus/blur event)
 * - It has no historical value
 * - It would bloat the database unnecessarily
 * - Memory-only state is sufficient for real-time collaboration
 */
const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth');
const { presenceService, incidentService } = require('../services');
const config = require('../config');

let io;

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & STATE
// ═══════════════════════════════════════════════════════════════

// Roles that can modify incidents
const WRITE_ROLES = ['admin', 'responder'];

// Status transition state machine
// Key = current status, Value = allowed next statuses
const STATUS_TRANSITIONS = {
  investigating: ['identified', 'monitoring', 'resolved'],
  identified: ['investigating', 'monitoring', 'resolved'],
  monitoring: ['investigating', 'identified', 'resolved'],
  resolved: ['investigating'] // Can only re-open, must start fresh investigation
};

// Focus throttle: minimum ms between focus updates per user
const FOCUS_THROTTLE_MS = 100;

// In-memory focus state: Map<odId, { incidentId, section, fieldId, lastUpdate }>
// Not persisted - purely ephemeral for real-time collaboration
const userFocusState = new Map();

// Throttle timestamps: Map<userId, timestamp>
const focusThrottles = new Map();

// Color palette for user focus indicators (deterministic assignment)
const FOCUS_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user has write permissions
 */
const canWrite = (user) => WRITE_ROLES.includes(user.role);

/**
 * Validate status transition against state machine
 */
const isValidTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return false;
  const allowed = STATUS_TRANSITIONS[currentStatus];
  return allowed && allowed.includes(newStatus);
};

/**
 * Get deterministic color for user based on their ID
 * Same user always gets same color across sessions
 */
const getUserColor = (userId) => {
  // Simple hash of odId to get consistent color index
  let hash = 0;
  const idStr = userId.toString();
  for (let i = 0; i < idStr.length; i++) {
    hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return FOCUS_COLORS[Math.abs(hash) % FOCUS_COLORS.length];
};

/**
 * Check if focus update should be throttled
 */
const shouldThrottleFocus = (userId) => {
  const lastUpdate = focusThrottles.get(userId);
  const now = Date.now();

  if (lastUpdate && (now - lastUpdate) < FOCUS_THROTTLE_MS) {
    return true;
  }

  focusThrottles.set(userId, now);
  return false;
};

/**
 * Wrap socket event handler with error boundary
 * Prevents unhandled errors from crashing the server
 */
const withErrorHandler = (handler) => {
  return async (socket, ...args) => {
    try {
      await handler(socket, ...args);
    } catch (error) {
      console.error(`Socket error [${socket.id}]:`, error.message);
      socket.emit('error', {
        message: error.message || 'An error occurred',
        code: error.code || 'INTERNAL_ERROR'
      });
    }
  };
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize Socket.io with HTTP server
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true
    }
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    // Assign consistent color to user
    socket.userColor = getUserColor(socket.user._id);

    // ─────────────────────────────────────────
    // PRESENCE EVENTS
    // ─────────────────────────────────────────
    socket.on('incident:join', (incidentId) =>
      withErrorHandler(handleJoinIncident)(socket, incidentId)
    );

    socket.on('incident:leave', (incidentId) =>
      withErrorHandler(handleLeaveIncident)(socket, incidentId)
    );

    socket.on('presence:heartbeat', () =>
      withErrorHandler(handleHeartbeat)(socket)
    );

    // ─────────────────────────────────────────
    // FOCUS PRESENCE EVENTS (Ephemeral)
    // ─────────────────────────────────────────
    socket.on('focus:update', (data) =>
      withErrorHandler(handleFocusUpdate)(socket, data)
    );

    socket.on('focus:clear', (data) =>
      withErrorHandler(handleFocusClear)(socket, data)
    );

    // ─────────────────────────────────────────
    // INCIDENT UPDATE EVENTS (Structured, not chat)
    // ─────────────────────────────────────────
    socket.on('incident:updateStatus', (data) =>
      withErrorHandler(handleStatusUpdate)(socket, data)
    );

    socket.on('incident:addNote', (data) =>
      withErrorHandler(handleAddNote)(socket, data)
    );

    socket.on('incident:assign', (data) =>
      withErrorHandler(handleAssignment)(socket, data)
    );

    socket.on('incident:addActionItem', (data) =>
      withErrorHandler(handleActionItem)(socket, data)
    );

    socket.on('incident:toggleActionItem', (data) =>
      withErrorHandler(handleToggleActionItem)(socket, data)
    );

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────
    socket.on('disconnect', () =>
      withErrorHandler(handleDisconnect)(socket)
    );
  });

  return io;
};

// ═══════════════════════════════════════════════════════════════
// PRESENCE HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Handle user joining an incident room
 *
 * Flow:
 * 1. Join Socket.io room
 * 2. Create presence record in database
 * 3. Fetch current room members
 * 4. Broadcast join event to OTHERS in room
 * 5. Send full presence list to JOINING USER ONLY
 * 6. Send current focus states to joining user
 */
const handleJoinIncident = async (socket, incidentId) => {
  const odId = socket.user._id.toString();
  const roomName = `incident:${incidentId}`;

  // Join the Socket.io room
  socket.join(roomName);
  console.log(`${socket.user.name} joined ${roomName}`);

  // Record presence in database
  await presenceService.joinIncident(odId, incidentId, socket.id);

  // Get all users currently in this incident
  const presenceList = await presenceService.getIncidentPresence(incidentId);

  // Broadcast to OTHERS in the room (not the joining user)
  socket.to(roomName).emit('presence:joined', {
    userId: socket.user._id,
    name: socket.user.name,
    email: socket.user.email,
    color: socket.userColor
  });

  // Broadcast notification to ALL connected users
  io.emit('notification:new', {
    message: `${socket.user.name} joined the incident`,
    icon: '👋',
    type: 'presence',
    incidentId,
    userId: socket.user._id,
    timestamp: new Date()
  });

  // Send full presence list ONLY to the joining user
  socket.emit('presence:list', {
    incidentId,
    users: presenceList.map(p => ({
      userId: p.userId._id,
      name: p.userId.name,
      email: p.userId.email,
      color: getUserColor(p.userId._id),
      lastActiveAt: p.lastActiveAt
    }))
  });

  // Send current focus states for this incident to joining user
  const focusStates = [];
  for (const [odId, state] of userFocusState.entries()) {
    if (state.incidentId === incidentId) {
      focusStates.push({
        userId: odId,
        section: state.section,
        fieldId: state.fieldId,
        color: state.color,
        name: state.name
      });
    }
  }

  if (focusStates.length > 0) {
    socket.emit('focus:list', { incidentId, focusStates });
  }
};

/**
 * Handle user leaving an incident room
 */
const handleLeaveIncident = async (socket, incidentId) => {
  const odId = socket.user._id.toString();
  const roomName = `incident:${incidentId}`;

  socket.leave(roomName);
  console.log(`${socket.user.name} left ${roomName}`);

  await presenceService.leaveIncident(odId, incidentId);

  // Clear focus state for this user/incident
  const focusState = userFocusState.get(odId);
  if (focusState && focusState.incidentId === incidentId) {
    userFocusState.delete(odId);
  }

  socket.to(roomName).emit('presence:left', {
    userId: socket.user._id,
    name: socket.user.name
  });

  // Broadcast notification to ALL connected users
  io.emit('notification:new', {
    message: `${socket.user.name} left the incident`,
    icon: '👋',
    type: 'presence',
    incidentId,
    userId: socket.user._id,
    timestamp: new Date()
  });

  // Broadcast focus cleared
  socket.to(roomName).emit('focus:cleared', {
    userId: socket.user._id
  });
};

/**
 * Handle presence heartbeat - prevents TTL expiration
 */
const handleHeartbeat = async (socket) => {
  await presenceService.updateActivity(socket.id);
};

/**
 * Handle socket disconnect
 * Cleanup is both reactive (here) and defensive (TTL expiry)
 */
const handleDisconnect = async (socket) => {
  console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
  const odId = socket.user._id.toString();

  // Get incidents user was viewing before cleanup
  const incidentIds = await presenceService.removeBySocketId(socket.id);

  // Clear focus state
  userFocusState.delete(odId);
  focusThrottles.delete(odId);

  // Notify each room
  for (const incidentId of incidentIds) {
    io.to(`incident:${incidentId}`).emit('presence:left', {
      userId: socket.user._id,
      name: socket.user.name
    });

    // Broadcast focus cleared
    io.to(`incident:${incidentId}`).emit('focus:cleared', {
      userId: socket.user._id
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// FOCUS PRESENCE HANDLERS (Ephemeral - Not Persisted)
// ═══════════════════════════════════════════════════════════════

/**
 * Handle focus update (user focused on a section/field)
 *
 * Event contract:
 * Client sends: { incidentId: string, section: string, fieldId?: string }
 * Server relays to room (throttled): { odId, section, fieldId, color, name }
 *
 * Sections: 'status', 'severity', 'description', 'notes', 'assignees', 'action_items'
 * fieldId: Optional specific field within section (e.g., note ID being edited)
 *
 * Performance considerations:
 * - Throttled to max 10 updates/second per user (100ms minimum gap)
 * - Only relayed, not persisted
 * - In-memory state only
 */
const handleFocusUpdate = async (socket, { incidentId, section, fieldId }) => {
  const odId = socket.user._id.toString();

  // Throttle rapid focus updates
  if (shouldThrottleFocus(odId)) {
    return; // Silently drop - this is expected behavior
  }

  // Validate section
  const validSections = ['status', 'severity', 'description', 'notes', 'assignees', 'action_items', 'commander'];
  if (!validSections.includes(section)) {
    throw new Error(`Invalid section. Must be one of: ${validSections.join(', ')}`);
  }

  // Update in-memory state
  userFocusState.set(odId, {
    incidentId,
    section,
    fieldId: fieldId || null,
    color: socket.userColor,
    name: socket.user.name,
    lastUpdate: Date.now()
  });

  // Relay to others in room (not back to sender - they already know their own focus)
  socket.to(`incident:${incidentId}`).emit('focus:updated', {
    userId: socket.user._id,
    section,
    fieldId: fieldId || null,
    color: socket.userColor,
    name: socket.user.name
  });
};

/**
 * Handle focus clear (user blurred/left a section)
 *
 * Event contract:
 * Client sends: { incidentId: string }
 * Server relays to room: { odId }
 */
const handleFocusClear = async (socket, { incidentId }) => {
  const odId = socket.user._id.toString();

  // Clear in-memory state
  userFocusState.delete(odId);

  // Relay to room
  socket.to(`incident:${incidentId}`).emit('focus:cleared', {
    userId: socket.user._id
  });
};

// ═══════════════════════════════════════════════════════════════
// INCIDENT UPDATE HANDLERS
// Server-authoritative: validate → persist → broadcast
// ═══════════════════════════════════════════════════════════════

/**
 * Handle status change request
 *
 * Event contract:
 * Client sends: { incidentId: string, status: string }
 * Server validates: role, status value, state transition
 * Server broadcasts: { incident, update } to room
 *
 * Status values: investigating → identified → monitoring → resolved
 *
 * State machine enforced: not all transitions are allowed.
 * Example: "resolved" can only go back to "investigating" (re-open)
 */
const handleStatusUpdate = async (socket, { incidentId, status }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Validate input
  const validStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // 3. Get current incident to validate state transition
  const currentIncident = await incidentService.getIncidentById(incidentId);

  // 4. Validate state transition (state machine enforcement)
  if (!isValidTransition(currentIncident.status, status)) {
    throw new Error(
      `Invalid status transition: ${currentIncident.status} → ${status}. ` +
      `Allowed: ${STATUS_TRANSITIONS[currentIncident.status].join(', ')}`
    );
  }

  // 5. Persist via service (service handles business logic)
  const incident = await incidentService.updateStatus(
    incidentId,
    status,
    socket.user._id
  );

  // 6. Create the update record for timeline
  const update = {
    type: 'status_change',
    content: {
      previousStatus: currentIncident.status,
      newStatus: status
    },
    userId: {
      _id: socket.user._id,
      name: socket.user.name,
      email: socket.user.email
    },
    createdAt: new Date()
  };

  // 7. Broadcast confirmed update to ALL users in room (including sender)
  io.to(`incident:${incidentId}`).emit('incident:updated', {
    incidentId,
    incident,
    update
  });

  // 8. Broadcast notification to ALL connected users
  io.emit('notification:new', {
    message: `${socket.user.name} changed status to ${status}`,
    icon: '📊',
    type: 'status',
    incidentId,
    userId: socket.user._id,
    timestamp: new Date()
  });

  console.log(`Status updated: ${incidentId} ${currentIncident.status} → ${status} by ${socket.user.name}`);
};

/**
 * Handle add note request
 *
 * Event contract:
 * Client sends: { incidentId: string, text: string }
 * Server validates: role, text not empty
 * Server broadcasts: { update } to room
 *
 * Notes are investigation findings, observations, or decisions.
 * NOT chat messages or casual conversation.
 */
const handleAddNote = async (socket, { incidentId, text }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Note text cannot be empty');
  }

  if (text.length > 2000) {
    throw new Error('Note text cannot exceed 2000 characters');
  }

  // 3. Persist via service
  const update = await incidentService.addNote(
    incidentId,
    text.trim(),
    socket.user._id
  );

  // 4. Broadcast to room
  io.to(`incident:${incidentId}`).emit('incident:noteAdded', {
    incidentId,
    update: {
      _id: update._id,
      type: 'note',
      content: { text: update.content.text },
      userId: {
        _id: socket.user._id,
        name: socket.user.name,
        email: socket.user.email
      },
      createdAt: update.createdAt
    }
  });

  // 5. Broadcast notification to ALL connected users
  io.emit('notification:new', {
    message: `${socket.user.name} added a note`,
    icon: '📝',
    type: 'note',
    incidentId,
    userId: socket.user._id,
    timestamp: new Date()
  });

  console.log(`Note added to ${incidentId} by ${socket.user.name}`);
};

/**
 * Handle user assignment request
 *
 * RBAC: Only admins can assign responders.
 * This is a coordination privilege, not a general write permission.
 *
 * Idempotency: If user is already assigned, the service throws
 * "User already assigned" - this prevents duplicate audit records.
 */
const handleAssignment = async (socket, { incidentId, targetUserId }) => {
  // 1. Authorize - ADMIN ONLY (not just canWrite)
  if (socket.user.role !== 'admin') {
    throw new Error('Only administrators can assign responders');
  }

  // 2. Validate input
  if (!targetUserId) {
    throw new Error('Target user ID required');
  }

  // 3. Persist via service (idempotent - throws if already assigned)
  const incident = await incidentService.assignUser(
    incidentId,
    targetUserId,
    socket.user._id
  );

  // Find the assigned user details from populated incident
  const assignedUser = incident.assignees.find(
    a => a._id.toString() === targetUserId
  );

  // 4. Broadcast to room
  io.to(`incident:${incidentId}`).emit('incident:assigned', {
    incidentId,
    incident,
    update: {
      type: 'assignment',
      content: {
        action: 'assigned',
        targetUser: assignedUser ? {
          _id: assignedUser._id,
          name: assignedUser.name,
          email: assignedUser.email
        } : { _id: targetUserId }
      },
      userId: {
        _id: socket.user._id,
        name: socket.user.name,
        email: socket.user.email
      },
      createdAt: new Date()
    }
  });

  console.log(`User ${targetUserId} assigned to ${incidentId} by ${socket.user.name}`);
};

/**
 * Handle add action item request
 */
const handleActionItem = async (socket, { incidentId, text }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Action item text cannot be empty');
  }

  // 3. Persist via service
  const update = await incidentService.addActionItem(
    incidentId,
    text.trim(),
    socket.user._id
  );

  // 4. Broadcast to room
  io.to(`incident:${incidentId}`).emit('incident:actionItemAdded', {
    incidentId,
    update: {
      _id: update._id,
      type: 'action_item',
      content: {
        text: update.content.text,
        completed: false
      },
      userId: {
        _id: socket.user._id,
        name: socket.user.name,
        email: socket.user.email
      },
      createdAt: update.createdAt
    }
  });

  console.log(`Action item added to ${incidentId} by ${socket.user.name}`);
};

/**
 * Handle toggle action item completion
 *
 * Idempotency: Uses explicit boolean value (not toggle).
 * Calling with completed=true when already true is a no-op.
 * This is intentional for reliability on reconnects.
 */
const handleToggleActionItem = async (socket, { incidentId, updateId, completed }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Persist via service
  const update = await incidentService.toggleActionItem(
    updateId,
    completed,
    socket.user._id
  );

  // 3. Broadcast to room
  io.to(`incident:${incidentId}`).emit('incident:actionItemToggled', {
    incidentId,
    updateId,
    completed: update.content.completed,
    toggledBy: {
      _id: socket.user._id,
      name: socket.user.name
    }
  });

  console.log(`Action item ${updateId} toggled to ${completed} by ${socket.user.name}`);
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const emitToIncident = (incidentId, event, data) => {
  getIO().to(`incident:${incidentId}`).emit(event, data);
};

const emitToAll = (event, data) => {
  getIO().emit(event, data);
};

module.exports = {
  initializeSocket,
  getIO,
  emitToIncident,
  emitToAll
};
