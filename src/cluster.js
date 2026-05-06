/**
 * Cluster Mode — Multi-Process Node.js
 *
 * WHY CLUSTER?
 * ────────────
 * Node.js is single-threaded — only uses 1 CPU core.
 * Your machine has 8 cores → 7 are wasted!
 * Cluster spawns one worker process per CPU core.
 * Each worker runs a full Express + Socket.io server.
 * OS distributes incoming connections across workers.
 *
 * RESULT:
 * 1 process  → ~500 connections
 * 8 processes → ~4000 connections (8x!)
 *
 * WHY REDIS ADAPTER?
 * ──────────────────
 * Problem: Worker 1 has User A's WebSocket
 *          Worker 2 has User B's WebSocket
 *          User A updates incident on Worker 1
 *          Worker 1 broadcasts to ITS clients only
 *          User B on Worker 2 never hears it! ❌
 *
 * Solution: Redis Adapter syncs ALL workers
 *           Worker 1 update → Redis → Worker 2 → User B ✅
 *           Same Redis we already use for Pub/Sub!
 */

const cluster = require('cluster')
const os = require('os')

// Production pe 1 worker — WebSocket stable rehta hai
// Local pe 8 workers — testing ke liye
const isProduction = process.env.NODE_ENV === 'production'
const NUM_WORKERS = isProduction ? 1 : os.cpus().length

if (cluster.isPrimary && NUM_WORKERS > 1) {
    console.log(`🔧 Master process ${process.pid} running`)
    console.log(`💻 Spawning ${NUM_WORKERS} workers...`)

    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork()
    }

    cluster.on('exit', (worker) => {
        console.log(`💀 Worker ${worker.process.pid} died — restarting...`)
        cluster.fork()
    })

} else {
    // Production: direct server
    // Local single worker: direct server
    console.log(`👷 Running as single process (PID: ${process.pid})`)
    require('./index.js')
}