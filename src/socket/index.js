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
 * FOCUS PRESENCE (Redis-backed Ephemeral):
 * ─────────────────────────────────────────
 * Focus presence shows which section/field a user is currently editing.
 *
 * UPGRADED from in-memory Map to Redis for 3 reasons:
 * 1. Server restart pe state persist rehti hai (TTL-based auto-expiry)
 * 2. Multiple server instances ke beech shared state (horizontal scaling)
 * 3. SETEX atomically sets value + TTL in one operation
 *
 * Redis keys used:
 * - focus:{userId}     → stores which section user is editing (TTL: 5 min)
 * - throttle:{userId}  → rate limiting focus updates (TTL: 100ms)
 *
 * MULTI-SERVER BROADCASTING (Redis Pub/Sub):
 * ──────────────────────────────────────────
 * Problem: User A on Server 1, User B on Server 2.
 * Server 1 broadcasts update → only Server 1's clients hear it.
 * User B on Server 2 never receives the update!
 *
 * Solution: After local broadcast, publish to Redis channel.
 * All servers subscribe to channel → relay to their clients.
 * Result: ALL users on ALL servers receive updates. ✅
 */

const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth');
const { presenceService, incidentService } = require('../services');
const config = require('../config');

// ─────────────────────────────────────────────────────────────
// REDIS IMPORT
// Used for:
// 1. Focus state storage (replaces in-memory Map)
// 2. Focus update throttling (replaces in-memory Map)
// 3. Pub/Sub for multi-server broadcasting
// ─────────────────────────────────────────────────────────────
const redis = require('../config/redis');

// ─────────────────────────────────────────────────────────────
// PUB/SUB IMPORT
// initPubSub: subscribes this server to Redis broadcast channel
// publishToAll: publishes update so ALL servers relay to their clients
// ─────────────────────────────────────────────────────────────
const { initPubSub, publishToAll } = require('./pubsub');

let io;

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
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
// 100ms = max 10 updates/second per user
const FOCUS_THROTTLE_MS = 100;

// Focus state TTL in seconds (5 minutes)
// If user crashes without clean disconnect, state auto-clears
const FOCUS_TTL_SECONDS = 300;

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
 * Returns false if transition is not allowed
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
  let hash = 0;
  const idStr = userId.toString();
  for (let i = 0; i < idStr.length; i++) {
    hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
    hash = hash & hash;
  }
  return FOCUS_COLORS[Math.abs(hash) % FOCUS_COLORS.length];
};

/**
 * Check if focus update should be throttled using Redis
 *
 * How it works:
 * - First call: key doesn't exist → set with 100ms TTL → don't throttle
 * - Within 100ms: key exists → throttle (drop the update)
 * - After 100ms: key expired → next call goes through
 *
 * Why Redis over in-memory Map?
 * - Works across multiple server instances
 * - Auto-expires (no manual cleanup needed)
 */
const shouldThrottleFocus = async (userId) => {
  const key = `throttle:focus:${userId}`;
  const exists = await redis.get(key);
  if (exists) return true;
  await redis.set(key, 1, 'PX', FOCUS_THROTTLE_MS);
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

  // Apply JWT authentication middleware
  io.use(authenticateSocket);

  // ─────────────────────────────────────────
  // INIT REDIS PUB/SUB
  // Must be called after io is created
  // This server will now receive broadcasts from OTHER servers
  // and relay them to its own connected clients
  // ─────────────────────────────────────────
  initPubSub(io);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    socket.userColor = getUserColor(socket.user._id);

    // PRESENCE EVENTS
    socket.on('incident:join', (incidentId) =>
      withErrorHandler(handleJoinIncident)(socket, incidentId)
    );
    socket.on('incident:leave', (incidentId) =>
      withErrorHandler(handleLeaveIncident)(socket, incidentId)
    );
    socket.on('presence:heartbeat', () =>
      withErrorHandler(handleHeartbeat)(socket)
    );

    // FOCUS PRESENCE EVENTS (Redis-backed)
    socket.on('focus:update', (data) =>
      withErrorHandler(handleFocusUpdate)(socket, data)
    );
    socket.on('focus:clear', (data) =>
      withErrorHandler(handleFocusClear)(socket, data)
    );

    // INCIDENT UPDATE EVENTS
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

    // DISCONNECT
    socket.on('disconnect', () =>
      withErrorHandler(handleDisconnect)(socket)
    );
  });

  return io;
};

// ═══════════════════════════════════════════════════════════════
// PRESENCE HANDLERS
// ═══════════════════════════════════════════════════════════════

const handleJoinIncident = async (socket, incidentId) => {
  const odId = socket.user._id.toString();
  const roomName = `incident:${incidentId}`;

  socket.join(roomName);
  console.log(`${socket.user.name} joined ${roomName}`);

  await presenceService.joinIncident(odId, incidentId, socket.id);
  const presenceList = await presenceService.getIncidentPresence(incidentId);

  // Broadcast join to OTHERS in room
  socket.to(roomName).emit('presence:joined', {
    userId: socket.user._id,
    name: socket.user.name,
    email: socket.user.email,
    color: socket.userColor
  });

  // Notify ALL connected users
  io.emit('notification:new', {
    message: `${socket.user.name} joined the incident`,
    icon: '👋',
    type: 'presence',
    incidentId,
    userId: socket.user._id,
    timestamp: new Date()
  });

  // Send presence list ONLY to joining user
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

  // Read focus states from Redis for this incident
  // Works across ALL server instances (not just this one)
  const focusKeys = await redis.keys('focus:*');
  const focusStates = [];

  for (const key of focusKeys) {
    const raw = await redis.get(key);
    if (!raw) continue; // may have expired between keys() and get()

    const state = JSON.parse(raw);
    if (state.incidentId === incidentId) {
      const userId = key.replace('focus:', '');
      focusStates.push({
        userId,
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

const handleLeaveIncident = async (socket, incidentId) => {
  const odId = socket.user._id.toString();
  const roomName = `incident:${incidentId}`;

  socket.leave(roomName);
  console.log(`${socket.user.name} left ${roomName}`);

  await presenceService.leaveIncident(odId, incidentId);

  // Clear focus state from Redis
  await redis.del(`focus:${odId}`);

  socket.to(roomName).emit('presence:left', {
    userId: socket.user._id,
    name: socket.user.name
  });

  io.emit('notification:new', {
    message: `${socket.user.name} left the incident`,
    icon: '👋',
    type: 'presence',
    incidentId,
    userId: socket.user._id,
    timestamp: new Date()
  });

  socket.to(roomName).emit('focus:cleared', {
    userId: socket.user._id
  });
};

const handleHeartbeat = async (socket) => {
  await presenceService.updateActivity(socket.id);
};

const handleDisconnect = async (socket) => {
  console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
  const odId = socket.user._id.toString();

  // Clean up Redis keys
  await redis.del(`focus:${odId}`);
  await redis.del(`throttle:focus:${odId}`);

  const incidentIds = await presenceService.removeBySocketId(socket.id);

  for (const incidentId of incidentIds) {
    io.to(`incident:${incidentId}`).emit('presence:left', {
      userId: socket.user._id,
      name: socket.user.name
    });
    io.to(`incident:${incidentId}`).emit('focus:cleared', {
      userId: socket.user._id
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// FOCUS PRESENCE HANDLERS (Redis-backed)
// ═══════════════════════════════════════════════════════════════

const handleFocusUpdate = async (socket, { incidentId, section, fieldId }) => {
  const odId = socket.user._id.toString();

  // Throttle using Redis (works across multiple servers)
  if (await shouldThrottleFocus(odId)) return;

  const validSections = [
    'status', 'severity', 'description',
    'notes', 'assignees', 'action_items', 'commander'
  ];
  if (!validSections.includes(section)) {
    throw new Error(`Invalid section. Must be one of: ${validSections.join(', ')}`);
  }

  // Store in Redis with 5 min TTL (SETEX = atomic set + expire)
  await redis.setex(
    `focus:${odId}`,
    FOCUS_TTL_SECONDS,
    JSON.stringify({
      incidentId,
      section,
      fieldId: fieldId || null,
      color: socket.userColor,
      name: socket.user.name,
      lastUpdate: Date.now()
    })
  );

  // Relay to others in room
  socket.to(`incident:${incidentId}`).emit('focus:updated', {
    userId: socket.user._id,
    section,
    fieldId: fieldId || null,
    color: socket.userColor,
    name: socket.user.name
  });
};

const handleFocusClear = async (socket, { incidentId }) => {
  const odId = socket.user._id.toString();

  await redis.del(`focus:${odId}`);

  socket.to(`incident:${incidentId}`).emit('focus:cleared', {
    userId: socket.user._id
  });
};

// ═══════════════════════════════════════════════════════════════
// INCIDENT UPDATE HANDLERS
// Pattern: Authorize → Validate → Persist → Broadcast locally → Publish to Redis
//
// Why publishToAll after io.to().emit()?
// - io.to().emit() → reaches clients on THIS server only
// - publishToAll() → Redis delivers to ALL other servers
// - Other servers relay to THEIR clients
// - Result: ALL users on ALL servers receive the update ✅
// ═══════════════════════════════════════════════════════════════

const handleStatusUpdate = async (socket, { incidentId, status }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Validate
  const validStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // 3. Get current incident for state machine validation
  const currentIncident = await incidentService.getIncidentById(incidentId);

  // 4. Validate state transition
  if (!isValidTransition(currentIncident.status, status)) {
    throw new Error(
      `Invalid status transition: ${currentIncident.status} → ${status}. ` +
      `Allowed: ${STATUS_TRANSITIONS[currentIncident.status].join(', ')}`
    );
  }

  // 5. Persist
  const incident = await incidentService.updateStatus(
    incidentId, status, socket.user._id
  );

  // 6. Build audit record
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

  const eventData = { incidentId, incident, update };

  // 7. Broadcast to THIS server's clients
  io.to(`incident:${incidentId}`).emit('incident:updated', eventData);

  // 8. Publish to OTHER servers via Redis Pub/Sub
  // Other servers will relay this to THEIR connected clients
  await publishToAll(`incident:${incidentId}`, 'incident:updated', eventData);

  // 9. Notify ALL connected users (all servers)
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

const handleAddNote = async (socket, { incidentId, text }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Validate
  if (!text || text.trim().length === 0) {
    throw new Error('Note text cannot be empty');
  }
  if (text.length > 2000) {
    throw new Error('Note text cannot exceed 2000 characters');
  }

  // 3. Persist
  const update = await incidentService.addNote(
    incidentId, text.trim(), socket.user._id
  );

  const noteData = {
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
  };

  // 4. Broadcast to THIS server's clients
  io.to(`incident:${incidentId}`).emit('incident:noteAdded', noteData);

  // 5. Publish to OTHER servers via Redis Pub/Sub
  await publishToAll(`incident:${incidentId}`, 'incident:noteAdded', noteData);

  // 6. Notify ALL users
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

const handleAssignment = async (socket, { incidentId, targetUserId }) => {
  // 1. Authorize - ADMIN ONLY
  if (socket.user.role !== 'admin') {
    throw new Error('Only administrators can assign responders');
  }

  // 2. Validate
  if (!targetUserId) {
    throw new Error('Target user ID required');
  }

  // 3. Persist
  const incident = await incidentService.assignUser(
    incidentId, targetUserId, socket.user._id
  );

  const assignedUser = incident.assignees.find(
    a => a._id.toString() === targetUserId
  );

  const assignData = {
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
  };

  // 4. Broadcast to THIS server's clients
  io.to(`incident:${incidentId}`).emit('incident:assigned', assignData);

  // 5. Publish to OTHER servers via Redis Pub/Sub
  await publishToAll(`incident:${incidentId}`, 'incident:assigned', assignData);

  console.log(`User ${targetUserId} assigned to ${incidentId} by ${socket.user.name}`);
};

const handleActionItem = async (socket, { incidentId, text }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Validate
  if (!text || text.trim().length === 0) {
    throw new Error('Action item text cannot be empty');
  }

  // 3. Persist
  const update = await incidentService.addActionItem(
    incidentId, text.trim(), socket.user._id
  );

  const actionData = {
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
  };

  // 4. Broadcast to THIS server's clients
  io.to(`incident:${incidentId}`).emit('incident:actionItemAdded', actionData);

  // 5. Publish to OTHER servers via Redis Pub/Sub
  await publishToAll(`incident:${incidentId}`, 'incident:actionItemAdded', actionData);

  console.log(`Action item added to ${incidentId} by ${socket.user.name}`);
};

const handleToggleActionItem = async (socket, { incidentId, updateId, completed }) => {
  // 1. Authorize
  if (!canWrite(socket.user)) {
    throw new Error('Insufficient permissions');
  }

  // 2. Persist
  const update = await incidentService.toggleActionItem(
    updateId, completed, socket.user._id
  );

  const toggleData = {
    incidentId,
    updateId,
    completed: update.content.completed,
    toggledBy: {
      _id: socket.user._id,
      name: socket.user.name
    }
  };

  // 3. Broadcast to THIS server's clients
  io.to(`incident:${incidentId}`).emit('incident:actionItemToggled', toggleData);

  // 4. Publish to OTHER servers via Redis Pub/Sub
  await publishToAll(`incident:${incidentId}`, 'incident:actionItemToggled', toggleData);

  console.log(`Action item ${updateId} toggled to ${completed} by ${socket.user.name}`);
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
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