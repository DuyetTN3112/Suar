import { defineConfig, stores } from '@adonisjs/limiter'
import env from '#start/env'

export default defineConfig({
  default: env.get('LIMITER_STORE', 'memory') as 'memory' | 'redis',

  stores: {
    memory: stores.memory({}),
    redis: stores.redis({
      connectionName: 'main',
    }),
  },
})
