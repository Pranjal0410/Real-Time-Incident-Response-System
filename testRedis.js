const redis = require('./src/config/redis')

async function test() {
    await redis.set('test', 'Hello from Incident Platform!')
    const value = await redis.get('test')
    console.log('Value:', value)
    await redis.del('test')
    console.log('Redis working ✅')
    process.exit(0)
}

test()