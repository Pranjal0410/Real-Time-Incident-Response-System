const Redis = require('ioredis')

// Production (Render Key Value) uses REDIS_URL
// Local development uses host + port (Docker)
const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    })

redis.on('connect', () => {
    console.log('✅ Redis connected!')
})

redis.on('error', (err) => {
    console.error('❌ Redis error:', err)
})

module.exports = redis