/**
 * Redis Pub/Sub for Multi-Server Broadcasting
 *
 * PROBLEM:
 * User A on Server 1, User B on Server 2.
 * User A updates incident → only Server 1's clients notified.
 * User B never hears about it!
 *
 * SOLUTION:
 * Redis acts as shared message bus.
 * Server 1 publishes → Redis → Server 2 receives → broadcasts to User B ✅
 *
 * WHY SEPARATE CONNECTION FOR SUBSCRIBER?
 * Redis rule: subscribed connection can ONLY subscribe/unsubscribe.
 * Can't run GET, SET etc on same connection.
 * So we duplicate the connection — one for pub/set, one for sub.
 */

const redis = require('../config/redis')

// Dedicated subscriber connection
// Cannot share with main redis connection (Redis protocol rule)
const subscriber = redis.duplicate()

let io

const CHANNEL = 'incident:broadcasts'
const SERVER_PORT = process.env.PORT || '3001'

/**
 * Initialize Pub/Sub listener
 * Must be called after Socket.io is ready
 */
const initPubSub = async (socketIO) => {
    io = socketIO

    await subscriber.subscribe(CHANNEL)
    console.log(`✅ Pub/Sub ready on Server ${SERVER_PORT} — channel: "${CHANNEL}"`)

    subscriber.on('message', (channel, message) => {
        if (channel !== CHANNEL) return

        const { roomName, event, data, originPort } = JSON.parse(message)

        // Skip if THIS server published it
        // Our local clients already got it via io.to().emit()
        if (originPort === SERVER_PORT) {
            console.log(`⏭️  Skipping own message (Server ${SERVER_PORT})`)
            return
        }

        console.log(`📨 Relaying: ${event} → ${roomName} (from Server ${originPort})`)

        // Forward to THIS server's connected clients
        io.to(roomName).emit(event, data)
    })
}

/**
 * Publish event to ALL servers via Redis
 * Every subscribed server will receive and relay to their clients
 */
const publishToAll = async (roomName, event, data) => {
    await redis.publish(CHANNEL, JSON.stringify({
        roomName,
        event,
        data,
        originPort: SERVER_PORT  // so other servers know who sent it
    }))
    console.log(`📤 Published: ${event} → ${roomName} (Server ${SERVER_PORT})`)
}

module.exports = { initPubSub, publishToAll }