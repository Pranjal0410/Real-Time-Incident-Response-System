# Real-Time Incident Response Platform

A production-grade real-time incident coordination platform built for engineering teams. Features server-authoritative state, Redis-backed ephemeral state, multi-server broadcasting, cluster mode, and comprehensive load testing.

## Live Demo

- **Frontend:** https://incident-frontend-sigma.vercel.app
- **Backend API:** https://incident-response-system.onrender.com

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | demo123 |
| Viewer | viewer@demo.com | demo123 |

## What This Is

- **NOT** a chat app or CRUD dashboard
- **IS** an event-driven, real-time collaboration system with server-authoritative state, Redis caching, and horizontal scaling support

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Zustand |
| Backend | Node.js + Express |
| Real-Time | Socket.io (rooms, presence, focus tracking) |
| Database | MongoDB Atlas |
| Cache | Redis (Render Key Value / Valkey 8) |
| Auth | JWT with refresh token rotation |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| Load Testing | k6 |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend) + Render (backend) |

## Performance

Lighthouse scores on production (verified on `incident-frontend-sigma.vercel.app`):

| Metric | Before | After |
|--------|--------|-------|
| Performance | 68 | **99-100** |
| SEO | 82 | **100** |
| Best Practices | 100 | **100** |
| Accessibility | 92 | **92** |
| JS Bundle Size | 3710 KB | **1994 KB** (-46%) |
| Unused JS | 55.4% | **42%** |

### How Performance Was Improved
- Profiled JS bundle using Chrome DevTools Coverage tool
- Identified 55.4% unused JavaScript (2057KB of 3710KB) on first paint
- Implemented route-based code splitting with `React.lazy` and `Suspense`
- Memoized expensive components with `React.memo` (PresenceIndicator, NotificationCenter, IncidentTrendChart)
- Added meta description and robots.txt for SEO

## Key Features

### Real-Time Collaboration
- **Live updates** via Socket.io rooms (one room per incident)
- **Presence awareness** with MongoDB TTL + client heartbeats
- **Focus tracking** shows which section each user is editing (Redis-backed, SETEX with 300s TTL)
- **Throttled updates** at 100ms using Redis PX expiry

### Security
- **JWT authentication** with refresh token rotation (each token single-use, prevents replay attacks)
- **Role-based access control** (Admin, Responder, Viewer) enforced server-side
- **State machine validation** for status transitions (prevents invalid state regression)
- **Server-authoritative state** (clients cannot bypass UI to perform unauthorized actions)

### Redis Integration
- **Focus state storage** using SETEX (atomic set + expire, 300s TTL)
- **Rate limiting** using SET PX (100ms throttle window)
- **Pub/Sub** for multi-server broadcasting (cross-instance real-time sync)
- **Socket.io Redis Adapter** for cross-worker communication in cluster mode

### Scaling
- **Cluster mode** spawns one worker per CPU core (8 workers on 8-core machine)
- **Auto crash recovery** (master process detects worker death, forks replacement)
- **Redis Pub/Sub** enables horizontal scaling across multiple server instances
- **Redis Adapter** syncs Socket.io state across cluster workers

### Load Testing (k6)
| Concurrent Users | p95 Response | Failed Requests |
|------------------|-------------|-----------------|
| 50 | **343ms** | **0%** |
| 400 | **3.1s** | **0%** |
| 500 | **4.5s** | **0%** |

Zero failed requests at any load level. Server never crashed.

## Architecture

```
User (Browser)
    |
Vercel CDN (Frontend - React + Zustand)
    |
Render (Backend)
    |
Master Process
    |--- Worker 1 ---|
    |--- Worker 2 ---|--- Redis Adapter (Socket.io sync)
    |--- Worker N ---|
    |
    |--- Redis (Render Key Value)
    |    |--- Focus state (SETEX, TTL: 300s)
    |    |--- Throttling (SET PX, TTL: 100ms)
    |    |--- Pub/Sub channel: "incident:broadcasts"
    |
    |--- MongoDB Atlas
         |--- Incidents, Users, Presence, Updates
```

### Data Flow
```
Client A updates incident status
    -> REST API -> Server validates (state machine + RBAC)
    -> MongoDB write
    -> Socket.io broadcast to room (this worker's clients)
    -> Redis Pub/Sub publish (other workers/servers)
    -> Other workers receive -> broadcast to their clients
    -> All users see update instantly
```

### Why Server-Authoritative
Two users editing the same incident simultaneously: both send updates, server validates each against current database state. If conflict detected (optimistic locking via version check), server rejects stale update. Client fetches fresh state. No silent data loss.

## Project Structure

```
├── src/                    # Backend
│   ├── config/
│   │   ├── index.js       # Centralized config (env vars)
│   │   ├── db.js          # MongoDB connection
│   │   └── redis.js       # Redis connection (REDIS_URL for prod, localhost for dev)
│   ├── middleware/
│   │   ├── auth.js        # JWT verification + Socket auth
│   │   └── errorHandler.js
│   ├── models/            # Mongoose schemas
│   ├── routes/            # REST API endpoints
│   ├── services/          # Business logic
│   ├── socket/
│   │   ├── index.js       # Socket.io handlers (presence, focus, updates)
│   │   └── pubsub.js      # Redis Pub/Sub for multi-server sync
│   └── cluster.js         # Cluster mode (1 worker prod, N workers local)
├── client/                 # Frontend
│   └── src/
│       ├── components/    # UI components
│       ├── hooks/         # Custom hooks (useSocket, useFocus)
│       ├── pages/         # Route pages (lazy loaded)
│       ├── services/      # API & Socket clients
│       ├── stores/        # Zustand state management
│       └── test/          # Vitest test suites
├── loadtest.js            # k6 load test configuration
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for local Redis)
- MongoDB (local or Atlas)

### Backend
```bash
# Start Redis via Docker
docker run -d --name redis-incident -p 6379:6379 redis:alpine

# Install and run
cp .env.example .env
npm install
npm run dev          # Single server
npm run cluster      # Cluster mode (8 workers)
```

### Frontend
```bash
cd client
npm install
npm run dev          # http://localhost:3000
```

### Multi-Server Testing
```bash
# Terminal 1
npm run server1      # Port 3001

# Terminal 2
npm run server2      # Port 3002

# Terminal 3 (Redis monitor)
docker exec -it redis-incident redis-cli MONITOR
```

### Load Testing
```bash
brew install k6
k6 run loadtest.js
```

## Testing

```bash
cd client
npx vitest run src/test/
```

12 tests covering:
- **RoleBadge** (4 tests) — role label rendering, tooltips, descriptions
- **RoleGate** (4 tests) — RBAC permission checks, fallback rendering
- **WriteGate** (2 tests) — write permission verification
- **AdminGate** (2 tests) — admin-only access control

## API Overview

### REST Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Create account | Public |
| POST | /api/auth/login | Get JWT token pair | Public |
| POST | /api/auth/refresh | Rotate refresh token | Token |
| GET | /api/incidents | List incidents | JWT |
| POST | /api/incidents | Create incident | JWT + Write |
| GET | /api/incidents/:id | Get incident + history | JWT |

### Socket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| incident:join | Client -> Server | Join incident room |
| incident:leave | Client -> Server | Leave incident room |
| incident:updateStatus | Client -> Server | Change status (state machine validated) |
| incident:addNote | Client -> Server | Add investigation note |
| incident:assign | Client -> Server | Assign responder (admin only) |
| incident:updated | Server -> Room | Status changed broadcast |
| presence:joined | Server -> Room | User joined notification |
| presence:left | Server -> Room | User left notification |
| focus:update | Client -> Server | User editing a section (Redis throttled) |
| focus:updated | Server -> Room | Focus state broadcast |

## Roles and Permissions

| Action | Admin | Responder | Viewer |
|--------|-------|-----------|--------|
| View incidents | Yes | Yes | Yes |
| Update status | Yes | Yes | No |
| Add notes | Yes | Yes | No |
| Add action items | Yes | Yes | No |
| Assign responders | Yes | No | No |
| Close incidents | Yes | No | No |

## Redis Commands Used

| Command | Purpose |
|---------|---------|
| SETEX key 300 value | Focus state with 5 min auto-expiry |
| SET key value PX 100 | Throttle with 100ms auto-expiry |
| GET key | Read focus/throttle state |
| DEL key | Clean up on disconnect |
| KEYS focus:* | List all active focus states |
| PUBLISH channel msg | Multi-server broadcasting |
| SUBSCRIBE channel | Receive broadcasts from other servers |

## Deployment

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Vercel | https://incident-frontend-sigma.vercel.app |
| Backend | Render | https://incident-response-system.onrender.com |
| Database | MongoDB Atlas | (managed) |
| Redis | Render Key Value (Valkey 8) | (internal URL) |

### Environment Variables

**Backend (Render):**
```
NODE_ENV=production
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=https://incident-frontend-sigma.vercel.app
REDIS_URL=redis://red-xxxxx:6379
```

**Frontend (Vercel):**
```
VITE_API_URL=https://incident-response-system.onrender.com
VITE_SOCKET_URL=https://incident-response-system.onrender.com
```

## What I Learned Building This

1. **In-memory state doesn't scale** — migrated from JS Maps to Redis for focus state and throttling
2. **Cluster mode needs Redis Adapter** — without it, workers can't share Socket.io state
3. **WebSocket + load balancer = sticky sessions required** — random routing breaks connections
4. **Redis Pub/Sub is fire-and-forget** — messages lost if subscriber offline; MongoDB remains source of truth
5. **Measure before optimizing** — Coverage tool showed 55% unused JS; React.lazy fixed it
6. **Production build matters** — Lighthouse 68 (dev) vs 100 (prod) due to minification and tree shaking
