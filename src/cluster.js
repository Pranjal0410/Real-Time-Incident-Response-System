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

const NUM_CPUS = os.cpus().length  // 8 on your machine!

if (cluster.isPrimary) {
    console.log(`🔧 Master process ${process.pid} running`)
    console.log(`💻 CPU cores available: ${NUM_CPUS}`)
    console.log(`🚀 Spawning ${NUM_CPUS} worker processes...`)
    console.log('─'.repeat(50))

    // Spawn one worker per CPU core
    for (let i = 0; i < NUM_CPUS; i++) {
        const worker = cluster.fork()
        console.log(`✅ Worker ${i + 1} spawned (PID: ${worker.process.pid})`)
    }

    // Auto-restart crashed workers
    cluster.on('exit', (worker, code, signal) => {
        console.log(`💀 Worker ${worker.process.pid} died (code: ${code})`)
        console.log(`🔄 Restarting worker...`)
        const newWorker = cluster.fork()
        console.log(`✅ New worker spawned (PID: ${newWorker.process.pid})`)
    })

    // Log when worker comes online
    cluster.on('online', (worker) => {
        console.log(`🟢 Worker ${worker.process.pid} is online`)
    })

} else {
    // Worker process — runs the actual server
    console.log(`👷 Worker ${process.pid} starting...`)
    require('./index.js')
}