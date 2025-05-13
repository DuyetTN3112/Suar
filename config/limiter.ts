import { defineConfig, stores } from '@adonisjs/limiter'
import type { InferLimiters } from '@adonisjs/limiter/types'
import env from '#start/env'

const limiterConfig = defineConfig({
  default: env.get('LIMITER_STORE', 'memory') as 'memory' | 'redis',

  stores: {
    memory: stores.memory({}),
    redis: stores.redis({
      connectionName: 'main',
    }),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
