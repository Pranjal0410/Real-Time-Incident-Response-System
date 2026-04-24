const Redis = require('ioredis')

console.log('🔍 REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET')

const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            console.log(`Redis retry attempt: ${times}`)
            if (times > 3) return null
            return Math.min(times * 200, 1000)
        },
        lazyConnect: false
    })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    })

redis.on('connect', () => console.log('✅ Redis connected!'))
redis.on('ready', () => console.log('✅ Redis ready!'))
redis.on('error', (err) => console.error('❌ Redis error:', err.message))
redis.on('close', () => console.log('⚠️ Redis connection closed'))

module.exports = redis