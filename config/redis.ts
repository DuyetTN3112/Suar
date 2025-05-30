import { defineConfig } from '@adonisjs/redis'
import env from '#start/env'
import type { InferConnections } from '@adonisjs/redis/types'

/**
 * Redis Configuration
 *
 * Connections:
 *   - main: General purpose (sessions, locks, queues)
 *   - cache: Dedicated for cache (separate DB, can FLUSHDB without affecting sessions)
 *
 * Using separate DB numbers allows:
 *   - cache:flush without losing sessions
 *   - Different eviction policies per DB (via redis.conf maxmemory-policy)
 *   - Independent monitoring
 */
const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    /**
     * Main connection: sessions, locks, general purpose
     * DB 0 (default)
     */
    main: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', '6379'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: 'suar:',
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 10) return null // Stop retrying after 10 attempts
        return Math.min(times * 100, 3000)
      },
      enableReadyCheck: true,
      lazyConnect: false,
    },

    /**
     * Cache connection: app cache only
     * DB 1 — can be flushed independently
     */
    cache: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', '6379'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 1,
      keyPrefix: 'suar:cache:',
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 10) return null
        return Math.min(times * 100, 3000)
      },
      enableReadyCheck: true,
      lazyConnect: true, // Connect on first use
    },
  },
})

export default redisConfig

declare module '@adonisjs/redis/types' {
  export interface RedisConnections extends InferConnections<typeof redisConfig> {}
}
