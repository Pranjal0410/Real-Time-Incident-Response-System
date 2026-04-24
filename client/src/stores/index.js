/**
 * Store Exports
 *
 * STORE ARCHITECTURE:
 * ─────────────────────────────────────────
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                         ZUSTAND STORES                          │
 * ├─────────────────┬─────────────────┬─────────────────────────────┤
 * │   authStore     │  incidentStore  │  presenceStore/focusStore   │
 * │                 │                 │                             │
 * │ - user          │ - incidents[]   │ - presence{}                │
 * │ - token         │ - activeIncident│ - focus{}                   │
 * │ - canWrite()    │ - updates[]     │ - getUsersInSection()       │
 * └────────┬────────┴────────┬────────┴─────────────┬───────────────┘
 *          │                 │                      │
 *          │                 │                      │
 * ┌────────▼─────────────────▼──────────────────────▼───────────────┐
 * │                      DATA SOURCES                                │
 * ├──────────────────────────┬──────────────────────────────────────┤
 * │       REST API           │           SOCKET.IO                  │
 * │                          │                                      │
 * │ - Initial data fetch     │ - Real-time updates                  │
 * │ - Auth (login/register)  │ - Presence changes                   │
 * │ - User list              │ - Focus changes                      │
 * │                          │ - Incident modifications             │
 * └──────────────────────────┴──────────────────────────────────────┘
 *
 * DESIGN PRINCIPLES:
 *
 * 1. NO DUPLICATED SOURCES OF TRUTH
 *    - Each piece of data lives in exactly one store
 *    - Incident data → incidentStore
 *    - User auth → authStore
 *    - Presence → presenceStore
 *
 * 2. SERVER IS ALWAYS RIGHT
 *    - Stores only update from server responses
 *    - No optimistic updates for shared state
 *    - Client requests change, server confirms
 *
 * 3. SELECTIVE SUBSCRIPTIONS
 *    - Components subscribe to specific store slices
 *    - Presence changes don't re-render incident views
 *    - Focus changes don't re-render presence lists
 *
 * 4. SEPARATION OF CONCERNS
 *    - authStore: Who am I? What can I do?
 *    - incidentStore: What incidents exist? What's selected?
 *    - presenceStore: Who's here?
 *    - focusStore: Where is everyone looking?
 *    - socketStore: Am I connected?
 *
 * WHY ZUSTAND:
 * - Minimal boilerplate (vs Redux)
 * - No provider wrapper needed
 * - Easy to call from both components and socket callbacks
 * - Built-in middleware for persistence (authStore)
 * - Selective subscriptions prevent unnecessary re-renders
 */

export { default as useAuthStore } from './authStore';
export { default as useIncidentStore } from './incidentStore';
export { default as usePresenceStore } from './presenceStore';
export { default as useFocusStore } from './focusStore';
export { default as useSocketStore } from './socketStore';
export { default as useNotificationStore } from './notificationStore';
