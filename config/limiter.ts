import { defineConfig, stores } from '@adonisjs/limiter'
import env from '#start/env'

export default defineConfig({
  default: env.get('LIMITER_STORE', 'memory'),

  stores: {
    memory: stores.memory(),
    redis: stores.redis({
      connectionName: 'main',
    }),
  },

  limiters: {
    auth: {
      requests: 10,
      duration: '5 mins',
    },
    api: {
      requests: 60,
      duration: '1 min',
    },
  },
})
