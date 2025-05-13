import { defineConfig } from '@adonisjs/redis'
import env from '#start/env'
import type { InferConnections } from '@adonisjs/redis/types'

const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    main: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', '6379'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        return Math.min(times * 50, 2000)
      },
    },
  },
})

export default redisConfig

declare module '@adonisjs/redis/types' {
  export interface RedisConnections extends InferConnections<typeof redisConfig> {}
}
